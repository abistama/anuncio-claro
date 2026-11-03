// Side-panel UI. Reads the current tab's result from the service worker and
// renders the normalized ficha via the shared renderer (src/panel/ficha.ts),
// which is also used by the in-page overlay. All human-readable text is resolved
// through the i18n catalog for the viewer's locale.

import type { GetResultResponse, Message } from '../messaging';
import { ext } from '../platform';
import type { ListingCheck } from '../types';
import { FICHA_CSS, escape, fichaBodyHtml, setHtml, wireFicha } from './ficha';
import {
  activeLocale,
  detectLocale,
  loadLocalePref,
  saveLocalePref,
  t,
  type Locale,
  type LocalePref,
} from '../i18n/messages';

// The ficha's component styles live in FICHA_CSS so the panel and the overlay
// share one source; inject them into this document once.
const fichaStyle = document.createElement('style');
fichaStyle.textContent = FICHA_CSS;
document.head.appendChild(fichaStyle);

const app = document.getElementById('app') as HTMLElement;
let locale: Locale = detectLocale();

function render(result: ListingCheck): void {
  setHtml(app, fichaBodyHtml(result, locale));
  wireFicha(document, result, locale, {
    // Open the evidence page in a new extension tab; it auto-invokes print() so
    // the user can "Save as PDF". Dependency-free and produces a real PDF.
    openEvidence: (html) => {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      void ext.tabs.create({ url });
    },
  });
}

function renderMessage(key: string): void {
  setHtml(app, `<p class="empty">${escape(t(locale, key))}</p>`);
}

async function load(): Promise<void> {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return renderMessage('empty.noListing');
  const res = (await ext.runtime.sendMessage({ type: 'GET_RESULT', tabId: tab.id } satisfies Message)) as GetResultResponse | undefined;
  const state = res?.state;
  if (state?.kind === 'result') {
    render(state.result);
    return;
  }
  renderMessage('empty.noListing');
  // Nothing cached: ask the page's content script to (re)analyze. If it's a
  // supported listing it will post a result and RESULT_UPDATED re-renders us.
  // On an unsupported tab there's no content script, so this throws and we ignore it.
  ext.tabs.sendMessage(tab.id, { type: 'REANALYZE' } satisfies Message).catch(() => {});
}

ext.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'RESULT_UPDATED') void load();
});
ext.tabs.onActivated.addListener(() => void load());

// Language selector (persisted override of the auto-detected locale).
const langSelect = document.getElementById('lang-select') as HTMLSelectElement | null;
const langLabel = document.getElementById('lang-label');
const creditLabel = document.getElementById('credit-label');

function applyLangLabel(): void {
  if (langLabel) langLabel.textContent = t(locale, 'settings.language');
  if (creditLabel) creditLabel.textContent = t(locale, 'footer.madeBy');
}

langSelect?.addEventListener('change', () => {
  const pref = langSelect.value as LocalePref;
  locale = activeLocale(pref);
  applyLangLabel();
  void saveLocalePref(pref);
  void load(); // re-render in the new language
});

async function init(): Promise<void> {
  const pref = await loadLocalePref();
  locale = activeLocale(pref);
  if (langSelect) langSelect.value = pref;
  applyLangLabel();
  void load();
}

void init();
