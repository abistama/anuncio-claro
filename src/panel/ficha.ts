// Shared ficha renderer, used by BOTH the side panel (panel.ts, in an extension
// document) and the in-page overlay (content.ts, in a shadow root on the page).
// It builds the ficha markup, wires its buttons, and carries the component CSS so
// the two surfaces stay visually identical. Platform-specific bits (how a PDF tab
// is opened) are injected via `FichaDeps`.

import type { Check, ListingCheck } from '../types';
import { toPlainText } from '../export/text';
import { buildEvidenceHtml } from '../export/evidence';
import { t, type Locale } from '../i18n/messages';

export const VERDICT_ICON: Record<ListingCheck['verdict']['status'], string> = { pass: '✓', warn: '!', fail: '✕' };
const ENERGY_GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const DATE_LOCALE: Record<Locale, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES' };

export function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/**
 * Replace `target`'s children with already-escaped markup. Parsing via DOMParser
 * yields an inert document (no script execution, no event handlers firing), and
 * avoids innerHTML so AMO's linter doesn't flag the assignment.
 */
export function setHtml(target: Element | ShadowRoot, html: string): void {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  target.replaceChildren(...Array.from(doc.body.childNodes));
}

function valueText(locale: Locale, c: Check): string {
  if (c.value === undefined) return '';
  if (typeof c.value === 'boolean') return t(locale, c.value ? 'value.yes' : 'value.no');
  if (typeof c.value === 'object') return `${c.value.amount} ${t(locale, `unit.${c.value.period}`)}`;
  return String(c.value);
}

/** EU-style A to G energy label; the certified grade is highlighted. */
function energyScale(locale: Locale, letter?: string): string {
  const active = (letter ?? '').toUpperCase();
  const cells = ENERGY_GRADES.map(
    (g) => `<span class="egrade g${g}${g === active ? ' on' : ''}">${g}</span>`,
  ).join('');
  const label = t(locale, 'energy.label', { letter: active || '—' });
  return `<div class="escale" role="img" aria-label="${escape(label)}">${cells}</div>`;
}

function checkRow(locale: Locale, c: Check): string {
  const v = valueText(locale, c);
  const attention = c.status === 'missing' || c.status === 'uncertain';

  const meanKey = `means.${c.field}`;
  const means = attention && t(locale, meanKey) !== meanKey
    ? `<p class="means">${escape(t(locale, meanKey))}</p>`
    : '';

  const evidence = c.evidence
    ? `<p class="evidence"><span class="src">${escape(t(locale, 'evidence.from', { src: t(locale, `source.${c.evidence.location}`) }))}</span> “${escape(c.evidence.text)}”</p>`
    : c.status === 'missing'
      ? `<p class="evidence none">${escape(t(locale, 'evidence.none'))}</p>`
      : '';

  const scale = c.field === 'energy_certificate' && c.status === 'present'
    ? energyScale(locale, typeof c.value === 'string' ? c.value : undefined)
    : '';

  const method = c.method === 'model'
    ? `<p class="tag">${escape(t(locale, 'method.model', { pct: Math.round((c.confidence ?? 0) * 100) }))}</p>`
    : '';

  // Rows needing attention start open; confirmed/not-applicable rows start folded.
  return `
    <details class="check ${c.status}"${attention ? ' open' : ''}>
      <summary>
        <span class="dot"></span>
        <span class="label">${escape(t(locale, `field.${c.field}`))}</span>
        ${v ? `<span class="val">${escape(v)}</span>` : ''}
        <span class="st">${escape(t(locale, `status.${c.status}`))}</span>
        <span class="chev" aria-hidden="true"></span>
      </summary>
      <div class="detail">${scale}${evidence}${means}${method}</div>
    </details>`;
}

/** The ficha markup (verdict, basics, checks, actions, disclaimer). Contains the
 *  `#copy-text` / `#copy-json` / `#export-pdf` / `#report-error` controls and a
 *  `#toast` slot that `wireFicha` binds. Host-specific chrome (language picker,
 *  overlay header) is added by each caller. */
export function fichaBodyHtml(result: ListingCheck, locale: Locale): string {
  const v = result.verdict;
  const loc = result.listing.location;
  const zone = loc.stressedZone === true ? t(locale, 'zone.yes') : loc.stressedZone === false ? t(locale, 'zone.no') : t(locale, 'zone.unknown');
  const na = t(locale, 'na');
  const price = result.listing.price ? `${result.listing.price.amount} ${t(locale, 'unit.month')}` : na;
  const area = result.listing.areaM2 ? `${result.listing.areaM2} m²` : na;

  return `
    <div class="verdict ${v.status}">
      <span class="icon">${VERDICT_ICON[v.status]}</span>
      <div>
        <div>${escape(t(locale, `verdict.${v.status}.head`))}</div>
        <div class="meta">${escape(result.source.portal)} · ${new Date(result.checkedAt).toLocaleDateString(DATE_LOCALE[locale])}</div>
      </div>
    </div>

    <div class="basics">
      <div class="cell"><div class="k">${escape(t(locale, 'basics.price'))}</div><div class="v">${price}</div></div>
      <div class="cell"><div class="k">${escape(t(locale, 'basics.area'))}</div><div class="v">${area}</div></div>
      <div class="cell"><div class="k">${escape(t(locale, 'basics.municipality'))}</div><div class="v">${escape(loc.municipality || na)}</div></div>
      <div class="cell"><div class="k">${escape(t(locale, 'basics.stressed'))}</div><div class="v">${zone}</div></div>
    </div>

    ${result.listing.vacationalClaimed ? `<div class="noticeline">ℹ ${escape(t(locale, 'scope.vacationalNotice'))}</div>` : ''}
    ${v.priceAboveStatedLimit === true ? `<div class="warnline">⚠ ${escape(t(locale, 'warn.priceAbove'))}</div>` : ''}

    <h2>${escape(t(locale, 'checks.heading'))}</h2>
    ${result.checks.map((c) => checkRow(locale, c)).join('')}

    <div class="actions">
      <button id="copy-text">${escape(t(locale, 'actions.copyText'))}</button>
      <button id="export-pdf">${escape(t(locale, 'actions.exportPdf'))}</button>
      <button id="report-error" class="btn-ghost">${escape(t(locale, 'actions.reportError'))}</button>
    </div>
    <div class="toast" id="toast"></div>
    <details class="advanced">
      <summary>${escape(t(locale, 'advanced.title'))}</summary>
      <div class="actions">
        <button id="copy-json">${escape(t(locale, 'actions.copyJson'))}</button>
      </div>
    </details>
    <p class="disclaimer">${escape(t(locale, 'disclaimer'))}</p>`;
}

export interface FichaDeps {
  /** Open the evidence HTML so the user can save it as a PDF. The panel opens an
   *  extension tab; the overlay opens a page-origin blob in a new window. */
  openEvidence: (html: string) => void;
}

/** Bind the ficha's buttons within `scope` (an extension document or a shadow root). */
export function wireFicha(scope: ParentNode, result: ListingCheck, locale: Locale, deps: FichaDeps): void {
  const toast = scope.querySelector('#toast') as HTMLElement | null;
  const copy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      if (toast) toast.textContent = t(locale, 'toast.copied', { what: label });
    } catch {
      if (toast) toast.textContent = t(locale, 'toast.copyError');
    }
  };
  scope.querySelector('#copy-text')?.addEventListener('click', () => void copy(toPlainText(result, { locale }), t(locale, 'copy.ficha')));
  scope.querySelector('#copy-json')?.addEventListener('click', () => void copy(JSON.stringify(result, null, 2), t(locale, 'copy.fichaJson')));
  scope.querySelector('#export-pdf')?.addEventListener('click', () => {
    deps.openEvidence(buildEvidenceHtml(result, locale));
    if (toast) toast.textContent = t(locale, 'toast.pdfOpened');
  });
  scope.querySelector('#report-error')?.addEventListener('click', () => openReport(result, locale));
}

/** Open the user's mail client with a pre-filled error report for this listing. */
function openReport(result: ListingCheck, locale: Locale): void {
  const loc = result.listing.location;
  const zone = loc.stressedZone === true ? t(locale, 'zone.yes') : loc.stressedZone === false ? t(locale, 'zone.no') : t(locale, 'zone.unknown');
  const subject = `Anuncio Claro — ${result.source.portal} ${result.source.listingId}`;
  const body = [
    t(locale, 'report.bodyIntro'),
    '',
    '',
    '-----',
    `URL: ${result.source.url}`,
    `Portal: ${result.source.portal}`,
    `ID: ${result.source.listingId}`,
    `${t(locale, 'basics.municipality')}: ${loc.municipality || t(locale, 'na')} (${t(locale, 'basics.stressed')}: ${zone})`,
    `${t(locale, 'meta.ruleset')}: ${result.rulesetVersion}`,
    `${t(locale, 'meta.checkedAt')}: ${result.checkedAt}`,
  ].join('\n');
  const href = `mailto:anuncioclaro@herramient.as?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.click();
}

// Component styles shared by the panel and the overlay. Token definitions target
// `:host` so they apply inside a shadow root; in the panel document the tokens come
// from panel.css (:root) and these `:host` blocks simply don't match. Keep the
// component rules here as the single source of truth for both surfaces.
export const FICHA_CSS = `
:host {
  --pass: #1a7f37; --warn: #9a6700; --fail: #b42318;
  --bg: #ffffff; --fg: #1b1b1f; --muted: #5b5b66; --line: #e3e3e8; --chip: #f3f3f6;
}
@media (prefers-color-scheme: dark) {
  :host { --bg: #1b1b1f; --fg: #ececf0; --muted: #a0a0ac; --line: #34343c; --chip: #26262c; }
}
* { box-sizing: border-box; }

.verdict { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; color: #fff; font-weight: 700; }
.verdict .icon { font-size: 20px; }
.verdict.pass { background: var(--pass); }
.verdict.warn { background: var(--warn); }
.verdict.fail { background: var(--fail); }
.verdict .meta { font-weight: 500; font-size: 12px; opacity: 0.9; }

.basics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }
.basics .cell { background: var(--chip); border-radius: 8px; padding: 8px 10px; }
.basics .k { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.basics .v { font-weight: 600; }

h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 16px 0 8px; }

.check { border-top: 1px solid var(--line); }
.check summary { display: flex; align-items: center; gap: 10px; padding: 10px 0; cursor: pointer; list-style: none; }
.check summary::-webkit-details-marker { display: none; }
.check .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.check.present .dot { background: var(--pass); }
.check.missing .dot { background: var(--fail); }
.check.uncertain .dot { background: var(--warn); }
.check.not_applicable .dot { background: var(--line); }
.check .label { font-weight: 600; flex: 1; }
.check .val { font-weight: 600; font-variant-numeric: tabular-nums; }
.check .st { font-size: 12px; color: var(--muted); }
.check.missing .st { color: var(--fail); }
.check.uncertain .st { color: var(--warn); }
.check .chev { width: 8px; height: 8px; flex: none; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(-45deg); transition: transform 0.15s ease; }
.check[open] .chev { transform: rotate(45deg); }

.check .detail { padding: 0 0 12px 20px; }
.check .evidence { font-size: 12.5px; color: var(--fg); border-left: 2px solid var(--line); padding-left: 10px; margin: 2px 0 8px; }
.check .evidence .src { color: var(--muted); font-weight: 600; }
.check .evidence.none { color: var(--muted); font-style: italic; border-left-color: var(--fail); }
.check .means { font-size: 12.5px; color: var(--muted); margin: 0 0 6px; }
.check .tag { font-size: 11px; color: var(--muted); margin: 0; }

.escale { display: flex; gap: 3px; margin: 2px 0 10px; }
.egrade { flex: 1; text-align: center; font-weight: 700; font-size: 12px; color: #fff; padding: 4px 0; border-radius: 3px; opacity: 0.38; }
.egrade.on { opacity: 1; outline: 2px solid var(--fg); outline-offset: 1px; transform: scale(1.12); }
.egrade.gA { background: #1a7f37; }
.egrade.gB { background: #4c9a2a; }
.egrade.gC { background: #8cb423; }
.egrade.gD { background: #d9ad00; color: #1b1b1f; }
.egrade.gE { background: #f08a00; }
.egrade.gF { background: #e2560f; }
.egrade.gG { background: #b42318; }

.warnline { margin: 12px 0; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--fail) 12%, transparent); color: var(--fail); font-weight: 600; }
.noticeline { margin: 12px 0; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--warn) 14%, transparent); color: var(--warn); font-size: 12.5px; line-height: 1.4; }

.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
button { font: inherit; font-weight: 600; border: 1px solid var(--line); background: var(--chip); color: var(--fg); border-radius: 8px; padding: 8px 12px; cursor: pointer; }
button:hover { border-color: var(--muted); }
.btn-ghost { background: transparent; color: var(--muted); }

.advanced { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 8px; }
.advanced > summary { cursor: pointer; list-style: none; font-size: 12px; color: var(--muted); font-weight: 600; padding: 4px 0; }
.advanced > summary::-webkit-details-marker { display: none; }
.advanced > summary::before { content: '▸ '; }
.advanced[open] > summary::before { content: '▾ '; }
.advanced .actions { margin-top: 8px; }

.toast { font-size: 12px; color: var(--muted); margin-top: 8px; min-height: 16px; }
.disclaimer { margin-top: 16px; font-size: 11px; color: var(--muted); }
`;
