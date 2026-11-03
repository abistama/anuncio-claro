// Service worker: keeps the latest state per tab, drives the toolbar badge, and
// opens the side panel. No network, no storage of page text beyond the result.
//
// State lives in storage.session (not an in-memory Map): an MV3 worker is
// terminated after ~30s idle, which would otherwise drop the cache and leave the
// panel showing "no listing" even though the page was analyzed.

import type { GetResultResponse, Message, TabState } from '../messaging';
import type { ListingCheck } from '../types';
import { ext, openPanel } from '../platform';

const keyFor = (tabId: number): string => `state_${tabId}`;

const BADGE: Record<ListingCheck['verdict']['status'], { text: string; color: string }> = {
  pass: { text: '✓', color: '#1a7f37' },
  warn: { text: '!', color: '#9a6700' },
  fail: { text: '✕', color: '#b42318' },
};

function setBadge(tabId: number, state: TabState | null): void {
  if (state?.kind === 'result') {
    const b = BADGE[state.result.verdict.status];
    void ext.action.setBadgeBackgroundColor({ tabId, color: b.color });
    void ext.action.setBadgeText({ tabId, text: b.text });
    return;
  }
  void ext.action.setBadgeText({ tabId, text: '' });
}

async function storeState(tabId: number, state: TabState): Promise<void> {
  await ext.storage.session.set({ [keyFor(tabId)]: state });
  setBadge(tabId, state);
  void ext.runtime.sendMessage({ type: 'RESULT_UPDATED', tabId } satisfies Message).catch(() => {});
}

async function clearState(tabId: number): Promise<void> {
  await ext.storage.session.remove(keyFor(tabId));
  setBadge(tabId, null);
}

async function getState(tabId: number): Promise<TabState | null> {
  const key = keyFor(tabId);
  const data = await ext.storage.session.get(key);
  return (data[key] as TabState | undefined) ?? null;
}

ext.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (msg.type) {
    case 'CHECK_RESULT':
      if (tabId !== undefined) void storeState(tabId, { kind: 'result', result: msg.result });
      break;

    case 'NO_LISTING':
      if (tabId !== undefined) void clearState(tabId);
      break;

    case 'GET_RESULT':
      void getState(msg.tabId).then((state) => sendResponse({ state } satisfies GetResultResponse));
      return true; // keep the channel open for the async response
  }
  return undefined;
});

ext.action.onClicked.addListener((tab) => {
  openPanel(tab.id);
});

ext.tabs.onRemoved.addListener((tabId) => void ext.storage.session.remove(keyFor(tabId)));
