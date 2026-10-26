// Precision harness. Runs the engine over the labeled corpus (tests/corpus/cases.ts)
// and enforces a per-field precision floor — the local stand-in for the PRD's
// "≥90% sobre 100 anuncios etiquetados" launch gate. Each case is also asserted
// individually so a regression names the exact case and rule that broke.

import { afterAll, describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules/engine';
import { isStressedZone } from '../src/rules/stressed-zones';
import type { Check, CheckStatus, EvidenceLocation, ExtractedListing, Money, RuleId } from '../src/types';
import { CASES, type CorpusCase } from './corpus/cases';

const FIELD_FLOOR = 0.9; // PRD: precisión de extracción por campo ≥ 90%
const FALSE_PASS_CEILING = 0.02; // PRD: falsos "cumple" ≤ 2%

function caseToListing(c: CorpusCase): ExtractedListing {
  const { listing } = c;
  const stressedZone =
    listing.stressedZone !== undefined
      ? listing.stressedZone
      : isStressedZone({ ineCode: listing.ineCode, municipality: listing.municipality });

  const sources: Record<EvidenceLocation, string> = {
    title: listing.title ?? '',
    description: listing.description,
    features: listing.features ?? '',
    structured_data: '',
  };

  return {
    portal: 'idealista',
    url: `https://www.idealista.com/inmueble/corpus-${c.id}/`,
    listingId: `corpus-${c.id}`,
    rentalType: 'primary_residence',
    advertiserType: 'unknown',
    ...(listing.price !== undefined ? { price: { amount: listing.price, currency: 'EUR', period: 'month' } as Money } : {}),
    ...(listing.areaM2 !== undefined ? { areaM2: listing.areaM2 } : {}),
    location: {
      municipality: listing.municipality ?? '',
      ...(listing.ineCode ? { ineCode: listing.ineCode } : {}),
      stressedZone,
    },
    sources,
  };
}

function valueMatches(expected: Money | boolean | string, actual: Check['value']): boolean {
  if (typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return false;
    return actual.amount === expected.amount && actual.period === expected.period;
  }
  return actual === expected;
}

interface Row {
  caseId: string;
  rule: RuleId;
  expected: CheckStatus;
  actual: CheckStatus;
  statusOk: boolean;
  valueOk: boolean | null; // null = no value asserted
}

// Evaluate the whole corpus once.
const rows: Row[] = [];
for (const c of CASES) {
  const result = evaluate(caseToListing(c));
  const byId = new Map(result.checks.map((ch) => [ch.ruleId, ch]));
  for (const [rule, expected] of Object.entries(c.expect) as [RuleId, CheckStatus][]) {
    const check = byId.get(rule);
    const actual = check?.status ?? ('missing' as CheckStatus);
    const expVal = c.expectValue?.[rule];
    rows.push({
      caseId: c.id,
      rule,
      expected,
      actual,
      statusOk: actual === expected,
      valueOk: expVal === undefined ? null : check ? valueMatches(expVal, check.value) : false,
    });
  }
}

// --- Per-case assertions (named failures) ----------------------------------

describe('corpus · per case', () => {
  it.each(CASES)('$id', (c) => {
    const result = evaluate(caseToListing(c));
    const byId = new Map(result.checks.map((ch) => [ch.ruleId, ch]));

    for (const [rule, expected] of Object.entries(c.expect) as [RuleId, CheckStatus][]) {
      expect(byId.get(rule)?.status, `${c.id} · ${rule} status`).toBe(expected);
    }
    for (const [rule, value] of Object.entries(c.expectValue ?? {}) as [RuleId, Money | boolean | string][]) {
      expect(valueMatches(value, byId.get(rule)?.value), `${c.id} · ${rule} value`).toBe(true);
    }
    if (c.expectPriceAbove !== undefined) {
      expect(result.verdict.priceAboveStatedLimit, `${c.id} · priceAboveStatedLimit`).toBe(c.expectPriceAbove);
    }
  });
});

// --- Aggregate precision gates ---------------------------------------------

function precisionByField(): Record<RuleId, { n: number; ok: number; precision: number }> {
  const acc = {} as Record<RuleId, { n: number; ok: number; precision: number }>;
  for (const r of rows) {
    const f = (acc[r.rule] ??= { n: 0, ok: 0, precision: 1 });
    f.n += 1;
    if (r.statusOk) f.ok += 1;
  }
  for (const f of Object.values(acc)) f.precision = f.ok / f.n;
  return acc;
}

describe('corpus · precision gates', () => {
  const byField = precisionByField();

  it('meets the per-field precision floor', () => {
    for (const [rule, f] of Object.entries(byField)) {
      expect(f.precision, `${rule} precision (${f.ok}/${f.n})`).toBeGreaterThanOrEqual(FIELD_FLOOR);
    }
  });

  it('keeps false "cumple" (missing labeled as present) under the ceiling', () => {
    const falsePass = rows.filter((r) => r.expected === 'missing' && r.actual === 'present').length;
    expect(falsePass / rows.length).toBeLessThanOrEqual(FALSE_PASS_CEILING);
  });

  it('extracts the right value wherever a value is asserted', () => {
    const valueRows = rows.filter((r) => r.valueOk !== null);
    const bad = valueRows.filter((r) => r.valueOk === false).map((r) => `${r.caseId}·${r.rule}`);
    expect(bad, `value mismatches: ${bad.join(', ')}`).toHaveLength(0);
  });
});

afterAll(() => {
  const byField = precisionByField();
  const overall = rows.filter((r) => r.statusOk).length / rows.length;
  // eslint-disable-next-line no-console
  console.log(
    `\ncorpus precision — ${CASES.length} cases, ${rows.length} labeled checks, overall ${(overall * 100).toFixed(1)}%`,
  );
  // eslint-disable-next-line no-console
  console.table(
    Object.fromEntries(
      Object.entries(byField).map(([rule, f]) => [rule, { labeled: f.n, correct: f.ok, precision: `${(f.precision * 100).toFixed(0)}%` }]),
    ),
  );
});
