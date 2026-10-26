// Evidence document for PDF export. We build a self-contained, print-friendly
// HTML page and let the browser's "Save as PDF" produce the file. It carries the
// ficha, the URL, the analysis timestamp and the SHA-256 of the analyzed text
// (PRD "PDF de evidencia"). A page screenshot is a planned addition.

import qrcode from 'qrcode-generator';
import type { Check, ListingCheck } from '../types';
import { t, type Locale } from '../i18n/messages';

const DATE_LOCALE: Record<Locale, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES' };

/** Offline QR (scalable SVG) encoding the listing URL, for the evidence PDF. */
function qrSvg(text: string): string {
  const qr = qrcode(0, 'M'); // type 0 = auto-size, error correction M
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function valueText(locale: Locale, c: Check): string {
  if (c.value === undefined) return '';
  if (typeof c.value === 'boolean') return t(locale, c.value ? 'value.yes' : 'value.no');
  if (typeof c.value === 'object') return `${c.value.amount} ${t(locale, `unit.${c.value.period}`)}`;
  return String(c.value);
}

function row(locale: Locale, c: Check): string {
  const v = valueText(locale, c);
  const ev = c.evidence ? `<div class="ev">“${escape(c.evidence.text)}”</div>` : '';
  return `<tr class="s-${c.status}">
    <td class="field">${escape(t(locale, `field.${c.field}`))}</td>
    <td class="status">${escape(t(locale, `status.${c.status}`))}</td>
    <td class="val">${escape(v)}${ev}</td>
  </tr>`;
}

/** Build the full, self-contained HTML for the evidence PDF. */
export function buildEvidenceHtml(result: ListingCheck, locale: Locale): string {
  const v = result.verdict;
  const loc = result.listing.location;
  const zone = loc.stressedZone === true ? t(locale, 'zone.yes') : loc.stressedZone === false ? t(locale, 'zone.no') : t(locale, 'zone.unknown');
  const when = new Date(result.checkedAt).toLocaleString(DATE_LOCALE[locale]);
  const qr = qrSvg(result.source.url);
  const price = result.listing.price ? `${result.listing.price.amount} ${t(locale, 'unit.month')}` : t(locale, 'na');
  const rows = result.checks.map((c) => row(locale, c)).join('');

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>Anuncio Claro — ${escape(result.source.portal)} ${escape(result.source.listingId)}</title>
<style>
  :root { color-scheme: light; }
  body { font: 13px/1.5 system-ui, sans-serif; color: #1b1b1f; margin: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #5b5b66; margin: 0 0 16px; }
  .verdict { display: inline-block; padding: 6px 12px; border-radius: 8px; color: #fff; font-weight: 700; }
  .pass { background: #1a7f37; } .warn { background: #9a6700; } .fail { background: #b42318; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f6; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  .s-missing .status { color: #b42318; font-weight: 700; }
  .s-uncertain .status { color: #9a6700; font-weight: 700; }
  .s-present .status { color: #1a7f37; font-weight: 700; }
  .ev { color: #5b5b66; font-style: italic; margin-top: 4px; }
  .metawrap { margin-top: 16px; display: flex; gap: 20px; align-items: flex-start; justify-content: space-between; }
  .meta { font-size: 11px; color: #5b5b66; word-break: break-all; flex: 1; }
  .meta div { margin: 2px 0; }
  .qr { margin: 0; flex: none; text-align: center; width: 120px; }
  .qr svg { width: 120px; height: 120px; }
  .qr figcaption { font-size: 10px; color: #777; margin-top: 4px; }
  .disclaimer { margin-top: 20px; font-size: 10px; color: #777; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Anuncio Claro</h1>
  <p class="sub">${escape(result.source.portal)} · ${escape(when)}</p>
  <p><span class="verdict ${v.status}">${escape(t(locale, `verdict.label.${v.status}`))}</span></p>

  <table>
    <tbody>
      <tr><th>${escape(t(locale, 'basics.municipality'))}</th><td>${escape(loc.municipality || t(locale, 'na'))}</td></tr>
      <tr><th>${escape(t(locale, 'basics.stressed'))}</th><td>${zone}</td></tr>
      <tr><th>${escape(t(locale, 'basics.price'))}</th><td>${escape(price)}</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>${escape(t(locale, 'checks.heading'))}</th><th></th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="metawrap">
    <div class="meta">
      <div><strong>${escape(t(locale, 'meta.url'))}:</strong> ${escape(result.source.url)}</div>
      <div><strong>${escape(t(locale, 'meta.id'))}:</strong> ${escape(result.source.listingId)}</div>
      <div><strong>${escape(t(locale, 'meta.checkedAt'))}:</strong> ${escape(when)}</div>
      <div><strong>${escape(t(locale, 'meta.ruleset'))}:</strong> ${escape(result.rulesetVersion)}</div>
      ${result.source.contentSha256 ? `<div><strong>${escape(t(locale, 'meta.sha256'))}:</strong> ${escape(result.source.contentSha256)}</div>` : ''}
    </div>
    <figure class="qr">${qr}<figcaption>${escape(t(locale, 'meta.qr'))}</figcaption></figure>
  </div>

  <p class="disclaimer">${escape(t(locale, 'disclaimer'))}</p>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;
}
