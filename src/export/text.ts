// Plain-text export, for pasting into WhatsApp or a spreadsheet cell. Emojis are
// opt-in and off by default (PRD). Pure function — unit-tested. Localized via the
// i18n catalog; defaults to Spanish.

import type { Check, ListingCheck } from '../types';
import { DEFAULT_LOCALE, t, type Locale } from '../i18n/messages';

const DATE_LOCALE: Record<Locale, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES' };

function valueText(locale: Locale, c: Check): string {
  if (c.value === undefined) return '';
  if (typeof c.value === 'boolean') return t(locale, c.value ? 'value.yes' : 'value.no');
  if (typeof c.value === 'object') return `${c.value.amount} ${t(locale, `unit.${c.value.period}`)}`;
  return String(c.value);
}

export function toPlainText(result: ListingCheck, opts: { emoji?: boolean; locale?: Locale } = {}): string {
  const { emoji = false, locale = DEFAULT_LOCALE } = opts;
  const mark = (c: Check): string => {
    if (!emoji) return `[${t(locale, `status.${c.status}`)}]`;
    return { present: '✅', missing: '❌', uncertain: '❓', not_applicable: '➖' }[c.status];
  };

  const lines: string[] = [];
  lines.push(`Anuncio Claro · ${t(locale, `verdict.label.${result.verdict.status}`)}`);
  lines.push(`${result.source.portal} · ${new Date(result.checkedAt).toLocaleString(DATE_LOCALE[locale])}`);
  lines.push(result.source.url);
  const loc = result.listing.location;
  const zone = loc.stressedZone === true ? t(locale, 'zone.yes') : loc.stressedZone === false ? t(locale, 'zone.no') : t(locale, 'zone.unknown');
  lines.push(`${t(locale, 'basics.municipality')}: ${loc.municipality || t(locale, 'na')} · ${t(locale, 'basics.stressed')}: ${zone}`);
  if (result.listing.price) lines.push(`${t(locale, 'basics.price')}: ${result.listing.price.amount} ${t(locale, 'unit.month')}`);
  lines.push('');
  for (const c of result.checks) {
    const v = valueText(locale, c);
    lines.push(`${mark(c)} ${t(locale, `field.${c.field}`)}${v ? `: ${v}` : ''}`);
  }
  if (result.verdict.priceAboveStatedLimit === true) {
    lines.push('');
    lines.push(`⚠ ${t(locale, 'warn.priceAbove')}`);
  }
  return lines.join('\n');
}
