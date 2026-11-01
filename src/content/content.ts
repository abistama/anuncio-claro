// Content script: runs only on listing pages of supported portals. It extracts,
// runs the pure engine locally (nothing leaves the browser), paints an in-page
// pill in a Shadow DOM, and reports the result to the service worker.

import { adapterForUrl } from '../adapters/registry';
import { evaluate } from '../rules/engine';
import type { Message } from '../messaging';
import type { ExtractedListing, ListingCheck } from '../types';
import { activeLocale, detectLocale, loadLocalePref, PREF_STORAGE_KEY, t, type Locale } from '../i18n/messages';

console.info('[Anuncio Claro] content script loaded on', location.href);

let locale: Locale = detectLocale();
const PILL_HOST_ID = 'anuncio-claro-pill-host';

/** SHA-256 of the analyzed text, so an exported evidence PDF can be verified. */
async function sha256(listing: ExtractedListing): Promise<string | undefined> {
  try {
    const text = Object.values(listing.sources).join('\n');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

const VERDICT_STYLE: Record<ListingCheck['verdict']['status'], { bg: string; icon: string }> = {
  pass: { bg: '#1a7f37', icon: '✓' },
  warn: { bg: '#9a6700', icon: '!' },
  fail: { bg: '#b42318', icon: '✕' },
};

function renderPill(result: ListingCheck): void {
  const style = VERDICT_STYLE[result.verdict.status];
  const missing = result.verdict.missingRequired?.length ?? 0;
  const label = missing > 0
    ? (missing === 1 ? t(locale, 'pill.missing.one') : t(locale, 'pill.missing.many', { n: missing }))
    : t(locale, result.verdict.status === 'pass' ? 'pill.pass' : 'pill.warn');

  let host = document.getElementById(PILL_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = PILL_HOST_ID;
    host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;';
    document.body.appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .pill { font: 600 13px/1.3 system-ui, sans-serif; color:#fff; background:${style.bg};
        border-radius:999px; padding:8px 14px; display:flex; gap:8px; align-items:center;
        box-shadow:0 2px 8px rgba(0,0,0,.25); cursor:pointer; }
      .icon { font-weight:800; }
    </style>
    <div class="pill" title="Abrir ficha de Anuncio Claro">
      <span class="icon">${style.icon}</span><span>Anuncio Claro · ${label}</span>
    </div>`;
  shadow.querySelector('.pill')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_PANEL' } satisfies Message);
  });
}

/** Extract + evaluate once. Returns true when the result is complete enough to
 *  stop retrying (SPAs like Fotocasa hydrate the location/features late). */
async function run(): Promise<boolean> {
  const url = location.href;
  const adapter = adapterForUrl(url);
  if (!adapter) {
    console.info('[Anuncio Claro] no adapter for', url);
    return true;
  }

  let listing: ExtractedListing | null;
  try {
    listing = adapter.extract(document, url);
  } catch (err) {
    console.warn('[Anuncio Claro] extraction threw', err);
    chrome.runtime.sendMessage({ type: 'NO_LISTING' } satisfies Message);
    return true;
  }

  if (!listing) {
    // Vacacional ads are now analyzed (with a caveat), so null here means the page
    // isn't a usable listing (e.g. no id / not loaded yet).
    console.info('[Anuncio Claro] no usable listing extracted');
    chrome.runtime.sendMessage({ type: 'NO_LISTING' } satisfies Message);
    return false; // allow retries in case the page is still loading
  }

  const result = evaluate(listing);
  const hash = await sha256(listing);
  if (hash) result.source.contentSha256 = hash;
  console.info(
    '[Anuncio Claro] analyzed',
    result.verdict.status,
    {
      municipality: listing.location.municipality,
      stressedZone: listing.location.stressedZone,
      areaM2: listing.areaM2,
      price: listing.price?.amount,
      energyRating: listing.energyRating,
    },
    result.checks.map((c) => `${c.ruleId}:${c.status}`).join(' '),
  );

  // Send the verdict FIRST: a pill-render failure (strict CSP / Trusted Types on
  // the host page) must never stop the result from reaching the panel.
  chrome.runtime.sendMessage({ type: 'CHECK_RESULT', result } satisfies Message);
  try {
    renderPill(result);
  } catch (err) {
    console.warn('[Anuncio Claro] pill render failed (result still sent)', err);
  }

  // Complete when the fields that hydrate late are present (municipality drives
  // the stressed-zone / R2 logic, so it's the one we most want to wait for).
  return Boolean(listing.location.municipality) && Boolean(listing.price || listing.areaM2);
}

// Re-extract with backoff until complete, so late SPA hydration is picked up.
// Each attempt sends its best-effort result, so the panel fills in progressively.
const RETRY_DELAYS = [400, 900, 1800, 3200, 5500];
let retryIdx = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRun(reset: boolean): void {
  if (reset) {
    retryIdx = 0;
    if (retryTimer) clearTimeout(retryTimer);
  }
  void run().then((complete) => {
    if (!complete && retryIdx < RETRY_DELAYS.length) {
      retryTimer = setTimeout(() => scheduleRun(false), RETRY_DELAYS[retryIdx++]);
    }
  });
}

// The panel can ask us to re-analyze (e.g. the worker lost its cached result
// after an MV3 restart, or the panel opened before the first run finished).
chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'REANALYZE') scheduleRun(true);
});

// Re-render the pill in the new language if the user changes it in the panel.
chrome.storage?.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[PREF_STORAGE_KEY]) {
    locale = activeLocale(changes[PREF_STORAGE_KEY]!.newValue ?? 'auto');
    void run();
  }
});

// Load the stored language preference, then do the first run.
void loadLocalePref().then((pref) => {
  locale = activeLocale(pref);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => scheduleRun(true), 300));
  } else {
    setTimeout(() => scheduleRun(true), 300);
  }
});

// ...and re-run on SPA navigations (URL changes without a full reload).
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => scheduleRun(true), 500);
  }
}).observe(document, { subtree: true, childList: true });
