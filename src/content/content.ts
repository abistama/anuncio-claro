// Content script: runs only on listing pages of supported portals. It extracts,
// runs the pure engine locally (nothing leaves the browser), paints an in-page
// pill in a Shadow DOM, and reports the result to the service worker.

import { adapterForUrl } from '../adapters/registry';
import { evaluate } from '../rules/engine';
import type { Message } from '../messaging';
import { ext } from '../platform';
import type { ExtractedListing, ListingCheck } from '../types';
import { FICHA_CSS, VERDICT_ICON, escape, fichaBodyHtml, setHtml, wireFicha } from '../panel/ficha';
import {
  activeLocale,
  detectLocale,
  loadLocalePref,
  PREF_STORAGE_KEY,
  saveLocalePref,
  t,
  type Locale,
  type LocalePref,
} from '../i18n/messages';

console.info('[Anuncio Claro] content script loaded on', location.href);

let locale: Locale = detectLocale();
let localePref: LocalePref = 'auto';
const HOST_ID = 'anuncio-claro-host';

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

// In-page UI: a floating pill plus an overlay card that shows the full ficha,
// both inside one Shadow DOM so the host page's CSS can't touch them. The overlay
// uses the SAME renderer as the side panel (fichaBodyHtml / wireFicha). The pill
// opens it locally, which works on every browser (unlike the sidebar, which
// Firefox only lets us open from the toolbar button).

const LANGS: ReadonlyArray<readonly [string, string]> = [
  ['auto', 'Automático'], ['es', 'Español'], ['en', 'English'],
  ['ca', 'Català'], ['eu', 'Euskara'], ['gl', 'Galego'],
];

// Chrome styles for the shadow host: pill position and overlay frame. The ficha's
// visual rules come from FICHA_CSS (which also defines the color tokens on :host).
const HOST_CSS = `
.pill { position: fixed; top: 16px; right: 16px; font: 600 13px/1.3 system-ui, -apple-system, sans-serif;
  color: #fff; border-radius: 999px; padding: 8px 14px; display: flex; gap: 8px; align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.25); cursor: pointer; }
.pill .picon { font-weight: 800; }
.pill.pass { background: var(--pass); }
.pill.warn { background: var(--warn); }
.pill.fail { background: var(--fail); }
.pill[hidden] { display: none; }

.overlay { position: fixed; top: 16px; right: 16px; width: min(380px, 92vw); max-height: 86vh; overflow: auto;
  background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, -apple-system, sans-serif;
  border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 34px rgba(0,0,0,.28); }
.overlay[hidden] { display: none; }
.ac-head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px;
  padding: 10px 10px 10px 14px; background: var(--bg); border-bottom: 1px solid var(--line); }
.ac-head .ac-title { font-weight: 700; flex: 1; }
.ac-close { font: inherit; font-size: 18px; line-height: 1; border: 0; background: transparent;
  color: var(--muted); cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.ac-close:hover { background: var(--chip); color: var(--fg); }
.ac-body { padding: 14px; }
.ac-foot { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--line);
  font-size: 12px; color: var(--muted); }
.ac-foot select { font: inherit; font-size: 12px; color: var(--fg); background: var(--chip);
  border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; margin-left: auto; }
`;

let shadow: ShadowRoot | null = null;
let overlayOpen = false;
let latestResult: ListingCheck | null = null;

/** Build the host + shadow DOM once; subsequent renders reuse it. */
function ensureShadow(): ShadowRoot {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483647;';
    document.body.appendChild(host);
  }
  if (!shadow) {
    shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    // DOMParser hoists a leading <style> into <head>, so build it separately.
    const style = document.createElement('style');
    style.textContent = HOST_CSS + FICHA_CSS;
    setHtml(shadow, `
      <div class="pill" role="button" tabindex="0" title="Anuncio Claro"></div>
      <div class="overlay" hidden>
        <div class="ac-head"><span class="ac-title">Anuncio Claro</span><button class="ac-close" aria-label="Cerrar">✕</button></div>
        <div class="ac-body"></div>
        <div class="ac-foot"><span class="ac-langlabel"></span><select class="ac-lang">${LANGS.map(([v, n]) => `<option value="${escape(v)}">${escape(n)}</option>`).join('')}</select></div>
      </div>`);
    shadow.prepend(style);
    shadow.querySelector('.pill')?.addEventListener('click', () => toggleOverlay(true));
    shadow.querySelector('.ac-close')?.addEventListener('click', () => toggleOverlay(false));
    const sel = shadow.querySelector('.ac-lang') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => {
      localePref = sel.value as LocalePref;
      locale = activeLocale(localePref);
      void saveLocalePref(localePref); // syncs the panel + persists across loads
      paintPill();
      renderOverlayBody();
    });
  }
  return shadow;
}

/** Update the pill's status color and label (cheap; runs on every analysis). */
function paintPill(): void {
  if (!shadow || !latestResult) return;
  const v = latestResult.verdict;
  const missing = v.missingRequired?.length ?? 0;
  const label = missing > 0
    ? (missing === 1 ? t(locale, 'pill.missing.one') : t(locale, 'pill.missing.many', { n: missing }))
    : t(locale, v.status === 'pass' ? 'pill.pass' : 'pill.warn');
  const pill = shadow.querySelector('.pill') as HTMLElement | null;
  if (!pill) return;
  pill.className = `pill ${v.status}`;
  pill.hidden = overlayOpen;
  setHtml(pill, `<span class="picon">${VERDICT_ICON[v.status]}</span><span>Anuncio Claro · ${escape(label)}</span>`);
}

/** Render the overlay's ficha body + footer in the current locale. */
function renderOverlayBody(): void {
  if (!shadow || !latestResult) return;
  const body = shadow.querySelector('.ac-body') as HTMLElement | null;
  if (!body) return;
  setHtml(body, fichaBodyHtml(latestResult, locale));
  wireFicha(body, latestResult, locale, {
    // No tabs API in a content script: open the evidence page as a page-origin
    // blob in a new window. The click is a user gesture, so popup blockers allow it.
    openEvidence: (html) => {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(url, '_blank', 'noopener');
    },
  });
  const sel = shadow.querySelector('.ac-lang') as HTMLSelectElement | null;
  if (sel) sel.value = localePref;
  const ll = shadow.querySelector('.ac-langlabel');
  if (ll) ll.textContent = t(locale, 'settings.language');
}

function toggleOverlay(open: boolean): void {
  if (!shadow) return;
  overlayOpen = open;
  if (open) renderOverlayBody();
  const overlay = shadow.querySelector('.overlay') as HTMLElement | null;
  const pill = shadow.querySelector('.pill') as HTMLElement | null;
  if (overlay) overlay.hidden = !open;
  if (pill) pill.hidden = open;
}

/** Paint the latest result into the pill (and the overlay if it's open). */
function paint(result: ListingCheck): void {
  latestResult = result;
  ensureShadow();
  paintPill();
  if (overlayOpen) renderOverlayBody();
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
    ext.runtime.sendMessage({ type: 'NO_LISTING' } satisfies Message);
    return true;
  }

  if (!listing) {
    // Vacacional ads are now analyzed (with a caveat), so null here means the page
    // isn't a usable listing (e.g. no id / not loaded yet).
    console.info('[Anuncio Claro] no usable listing extracted');
    ext.runtime.sendMessage({ type: 'NO_LISTING' } satisfies Message);
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

  // Send the verdict FIRST: an in-page render failure (strict CSP / Trusted Types
  // on the host page) must never stop the result from reaching the panel.
  ext.runtime.sendMessage({ type: 'CHECK_RESULT', result } satisfies Message);
  try {
    paint(result);
  } catch (err) {
    console.warn('[Anuncio Claro] in-page render failed (result still sent)', err);
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
ext.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'REANALYZE') scheduleRun(true);
});

// Re-render in the new language if the user changes it in the panel.
ext.storage?.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[PREF_STORAGE_KEY]) {
    localePref = (changes[PREF_STORAGE_KEY]!.newValue as LocalePref | undefined) ?? 'auto';
    locale = activeLocale(localePref);
    paintPill();
    if (overlayOpen) renderOverlayBody();
  }
});

// Load the stored language preference, then do the first run.
void loadLocalePref().then((pref) => {
  localePref = pref;
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
