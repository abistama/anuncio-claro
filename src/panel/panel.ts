// Side-panel UI. Reads the current tab's result from the service worker and
// renders the normalized ficha; everything is already computed locally. All
// human-readable text is resolved through the i18n catalog for the viewer's locale.

import type { GetResultResponse, Message } from '../messaging';
import type { Check, ListingCheck } from '../types';
import { toPlainText } from '../export/text';
import { buildEvidenceHtml } from '../export/evidence';
import {
  activeLocale,
  detectLocale,
  loadLocalePref,
  saveLocalePref,
  t,
  type Locale,
  type LocalePref,
} from '../i18n/messages';

const app = document.getElementById('app') as HTMLElement;
let locale: Locale = detectLocale();
const DATE_LOCALE: Record<Locale, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES' };

const VERDICT_ICON: Record<ListingCheck['verdict']['status'], string> = { pass: '✓', warn: '!', fail: '✕' };
const ENERGY_GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function valueText(c: Check): string {
  if (c.value === undefined) return '';
  if (typeof c.value === 'boolean') return t(locale, c.value ? 'value.yes' : 'value.no');
  if (typeof c.value === 'object') return `${c.value.amount} ${t(locale, `unit.${c.value.period}`)}`;
  return String(c.value);
}

/** EU-style A to G energy label; the certified grade is highlighted. */
function energyScale(letter?: string): string {
  const active = (letter ?? '').toUpperCase();
  const cells = ENERGY_GRADES.map(
    (g) => `<span class="egrade g${g}${g === active ? ' on' : ''}">${g}</span>`,
  ).join('');
  const label = t(locale, 'energy.label', { letter: active || '—' });
  return `<div class="escale" role="img" aria-label="${escape(label)}">${cells}</div>`;
}

function checkRow(c: Check): string {
  const v = valueText(c);
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
    ? energyScale(typeof c.value === 'string' ? c.value : undefined)
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

function render(result: ListingCheck): void {
  const v = result.verdict;
  const loc = result.listing.location;
  const zone = loc.stressedZone === true ? t(locale, 'zone.yes') : loc.stressedZone === false ? t(locale, 'zone.no') : t(locale, 'zone.unknown');
  const na = t(locale, 'na');
  const price = result.listing.price ? `${result.listing.price.amount} ${t(locale, 'unit.month')}` : na;
  const area = result.listing.areaM2 ? `${result.listing.areaM2} m²` : na;

  app.innerHTML = `
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
    ${result.checks.map(checkRow).join('')}

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

  const toast = document.getElementById('toast') as HTMLElement;
  const copy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.textContent = t(locale, 'toast.copied', { what: label });
    } catch {
      toast.textContent = t(locale, 'toast.copyError');
    }
  };
  document.getElementById('copy-text')?.addEventListener('click', () => void copy(toPlainText(result, { locale }), t(locale, 'copy.ficha')));
  document.getElementById('copy-json')?.addEventListener('click', () => void copy(JSON.stringify(result, null, 2), t(locale, 'copy.fichaJson')));
  document.getElementById('export-pdf')?.addEventListener('click', () => {
    // Open the evidence page in a new tab; it auto-invokes print() so the user
    // can "Save as PDF". Dependency-free and produces a real, shareable PDF.
    const html = buildEvidenceHtml(result, locale);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    void chrome.tabs.create({ url }).then(() => {
      toast.textContent = t(locale, 'toast.pdfOpened');
    });
  });
  document.getElementById('report-error')?.addEventListener('click', () => openReport(result));
}

/** Open the user's mail client with a pre-filled error report for this listing. */
function openReport(result: ListingCheck): void {
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

function renderMessage(key: string): void {
  app.innerHTML = `<p class="empty">${escape(t(locale, key))}</p>`;
}

async function load(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return renderMessage('empty.noListing');
  const res = (await chrome.runtime.sendMessage({ type: 'GET_RESULT', tabId: tab.id } satisfies Message)) as GetResultResponse | undefined;
  const state = res?.state;
  if (state?.kind === 'result') {
    render(state.result);
    return;
  }
  renderMessage('empty.noListing');
  // Nothing cached: ask the page's content script to (re)analyze. If it's a
  // supported listing it will post a result and RESULT_UPDATED re-renders us.
  // On an unsupported tab there's no content script, so this throws and we ignore it.
  chrome.tabs.sendMessage(tab.id, { type: 'REANALYZE' } satisfies Message).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'RESULT_UPDATED') void load();
});
chrome.tabs.onActivated.addListener(() => void load());

// Language selector (persisted override of the auto-detected locale).
const langSelect = document.getElementById('lang-select') as HTMLSelectElement | null;
const langLabel = document.getElementById('lang-label');

function applyLangLabel(): void {
  if (langLabel) langLabel.textContent = t(locale, 'settings.language');
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
