// Amount normalization. Spanish number format uses "." as thousands separator
// and "," as decimal: "1.200" -> 1200, "1.200,50" -> 1200.5, "15,5" -> 15.5.
// Everything here is pure and exhaustively unit-tested; the rules engine treats
// these results as auditable ground truth.

import type { Money, Period } from '../types';

/**
 * Parse a numeric token written in Spanish/European convention.
 * Returns null when the token is not a finite number.
 */
export function parseEsNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '');
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma) {
    // Comma is the decimal separator; dots are thousands separators.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    // Ambiguous: "1.200" (thousands) vs "15.5" (rare decimal, English paste).
    // Treat as thousands only when it matches grouped-by-three, e.g. 1.200 or 1.200.000.
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    // otherwise leave the dot as a decimal point.
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const PER_M2 = /(?:€|eur(?:os)?)?\s*\/\s*m(?:2|²)|por\s*m(?:2|²)|€\s*m(?:2|²)/i;

// A euro amount token. Handles, in order of preference:
//   - grouped thousands, optional comma decimals: "1.200", "1.200,50", "1.234.567"
//   - a plain number with an optional 1-2 digit decimal, comma OR dot:
//     "1200", "15,5", "953.48" (dot decimal, common in auto-generated ads).
// Spaces are allowed around the decimal separator, since ads routinely write
// "1.586, 38 euros". parseEsNumber strips the spaces before converting.
const AMOUNT = String.raw`\d{1,3}(?:\.\d{3})+(?:\s*,\s*\d{1,2})?|\d+(?:\s*[.,]\s*\d{1,2})?`;

// Amount before the currency ("1.200 €", "15 €/m²") or after it ("€ 1.200").
const MONEY_RE = new RegExp(
  String.raw`(?:(${AMOUNT})\s*(?:€|eur(?:os)?)|(?:€|eur(?:os)?)\s*(${AMOUNT}))[\s/]*((?:\/\s*m(?:2|²))|(?:m(?:2|²)))?`,
  'i',
);

export interface FoundMoney extends Money {
  /** The verbatim matched substring, for evidence. */
  raw: string;
  /** Offset of the match within the searched text. */
  index: number;
}

/**
 * Find the first euro amount in `text`, inferring the period from a "/m²" marker
 * on the match itself or anywhere in the surrounding text.
 */
export function findMoney(text: string): FoundMoney | null {
  const m = MONEY_RE.exec(text);
  if (!m) return null;

  const token = m[1] ?? m[2];
  if (!token) return null;
  const amount = parseEsNumber(token);
  if (amount === null) return null;

  const matchedPerM2 = Boolean(m[3]);
  const contextPerM2 = PER_M2.test(text);
  const period: Period = matchedPerM2 || contextPerM2 ? 'month_per_m2' : 'month';

  return {
    amount,
    currency: 'EUR',
    period,
    raw: m[0].trim(),
    index: m.index,
  };
}
