// Cross-browser WebExtension shim.
//
// Firefox exposes a promise-based `browser.*` namespace; its `chrome.*` alias is
// callback-based, so awaiting `chrome.storage.local.get()` on Gecko resolves to
// `undefined`. Chrome (MV3) only exposes `chrome.*`, which is promise-based. We
// therefore prefer `browser` when present and fall back to `chrome`, so every
// call site can keep using promises. The subset we use (runtime, tabs, storage,
// action) is API-compatible across both engines.

type Ext = typeof chrome;
const g = globalThis as unknown as { browser?: Ext; chrome?: Ext };

export const ext: Ext = g.browser ?? (g.chrome as Ext);

// Chrome ships the side panel under `sidePanel`; Firefox has no equivalent and
// uses the native sidebar (`sidebar_action` manifest key + `sidebarAction` API).
// Feature-detect rather than sniff the user agent.
const anyExt = ext as unknown as {
  sidePanel?: { open(opts: { tabId?: number }): Promise<void> };
  sidebarAction?: { open(): Promise<void> | void };
};

/**
 * Open the extension's panel for the given tab.
 *
 * Chrome: opens the side panel for `tabId`.
 *
 * Firefox: opens the global sidebar. `sidebarAction.open()` must be called while
 * handling a user gesture; it works from our toolbar `action.onClicked` handler,
 * but a message relayed from the in-page pill is not a gesture in the background
 * context, so Gecko may reject it. We swallow that rejection — the toolbar button
 * (and Firefox's own sidebar switcher) remain a reliable way to open it.
 */
export function openPanel(tabId?: number): void {
  if (anyExt.sidePanel?.open) {
    void anyExt.sidePanel.open(tabId !== undefined ? { tabId } : {}).catch(() => {});
    return;
  }
  if (anyExt.sidebarAction?.open) {
    try {
      void Promise.resolve(anyExt.sidebarAction.open()).catch(() => {});
    } catch {
      /* no active user gesture */
    }
  }
}
