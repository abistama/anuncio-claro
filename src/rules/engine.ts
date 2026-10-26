// Pure rules engine. No DOM, no I/O: an ExtractedListing in, a ListingCheck out.
// This is the auditable core — rules win on clear amounts/patterns; anything they
// mark `uncertain` is where the optional local model (not in this slice) would run.

import type {
  Check,
  Evidence,
  EvidenceLocation,
  ExtractedListing,
  ListingCheck,
  Money,
  RuleId,
  Verdict,
} from '../types';
import { findMoney } from './normalize';
import { FIELD_OF, KEYWORDS, LEGAL_BASIS, RULESET_VERSION, SCHEMA_VERSION } from './ruleset';

const EVIDENCE_MAX = 280;
// Evidence is searched structured-first, matching F2's extraction priority.
const SOURCE_ORDER: EvidenceLocation[] = ['structured_data', 'features', 'description', 'title'];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface Hit {
  location: EvidenceLocation;
  /** Index of the match within the (original) source text. */
  index: number;
  sourceText: string;
}

/** Find the first keyword hit across sources, in extraction-priority order. */
function scan(listing: ExtractedListing, keywords: readonly string[]): Hit | null {
  for (const location of SOURCE_ORDER) {
    const raw = listing.sources[location] ?? '';
    if (!raw) continue;
    const hay = stripAccents(raw).toLowerCase();
    let best = -1;
    for (const kw of keywords) {
      const needle = stripAccents(kw).toLowerCase();
      const at = hay.indexOf(needle);
      if (at !== -1 && (best === -1 || at < best)) best = at;
    }
    if (best !== -1) return { location, index: best, sourceText: raw };
  }
  return null;
}

/** A trimmed snippet of source text centred on `index`, for evidence. */
function snippet(sourceText: string, index: number): string {
  const start = Math.max(0, index - 40);
  const slice = sourceText.slice(start, start + EVIDENCE_MAX).trim();
  return slice.length > EVIDENCE_MAX ? slice.slice(0, EVIDENCE_MAX) : slice;
}

function evidenceAt(hit: Hit): Evidence {
  return { text: snippet(hit.sourceText, hit.index), location: hit.location };
}

/** Look for a euro amount in the window just after a keyword hit. */
function moneyNear(hit: Hit): Money | undefined {
  const window = hit.sourceText.slice(hit.index, hit.index + 140);
  const found = findMoney(window);
  if (!found) return undefined;
  return { amount: found.amount, currency: found.currency, period: found.period };
}

/**
 * True when a value-field label is followed by an explicit "not provided" phrase
 * (e.g. "Índice alquiler: No informado por el anunciante/no aplica"), so a label
 * match with no amount counts as missing rather than present.
 */
function notProvidedNear(hit: Hit): boolean {
  const window = stripAccents(hit.sourceText.slice(hit.index, hit.index + 140)).toLowerCase();
  return KEYWORDS.notProvided.some((k) => window.includes(stripAccents(k)));
}

// --- Individual rules -------------------------------------------------------

function checkR1(listing: ExtractedListing): Check {
  const base = { ruleId: 'R1' as RuleId, field: FIELD_OF.R1, required: true, legalBasis: LEGAL_BASIS.R1 };
  const hit = scan(listing, KEYWORDS.rentReferenceIndex);
  if (!hit) return { ...base, status: 'missing', method: 'rule', confidence: 0.95 };
  const value = moneyNear(hit);
  if (!value && notProvidedNear(hit)) {
    return { ...base, status: 'missing', evidence: evidenceAt(hit), method: 'rule', confidence: 0.9 };
  }
  return { ...base, status: 'present', value, evidence: evidenceAt(hit), method: 'rule', confidence: value ? 0.97 : 0.8 };
}

function checkR2(listing: ExtractedListing): Check {
  // Required only where we can confirm a stressed zone; unknown -> not applicable.
  const applicable = listing.location.stressedZone === true;
  const base = { ruleId: 'R2' as RuleId, field: FIELD_OF.R2, required: applicable, legalBasis: LEGAL_BASIS.R2 };
  if (!applicable) return { ...base, status: 'not_applicable' };
  const hit = scan(listing, KEYWORDS.maxRent);
  if (!hit) return { ...base, status: 'missing', method: 'rule', confidence: 0.9 };
  const value = moneyNear(hit);
  if (!value && notProvidedNear(hit)) {
    return { ...base, status: 'missing', evidence: evidenceAt(hit), method: 'rule', confidence: 0.85 };
  }
  return { ...base, status: 'present', value, evidence: evidenceAt(hit), method: 'rule', confidence: value ? 0.95 : 0.75 };
}

function checkR5(listing: ExtractedListing): Check {
  const base = { ruleId: 'R5' as RuleId, field: FIELD_OF.R5, required: true, legalBasis: LEGAL_BASIS.R5 };
  // Order matters: "no es gran tenedor" also contains "gran tenedor".
  const neg = scan(listing, KEYWORDS.largeLandlordNegative);
  if (neg) return { ...base, status: 'present', value: false, evidence: evidenceAt(neg), method: 'rule', confidence: 0.9 };
  const aff = scan(listing, KEYWORDS.largeLandlordAffirmative);
  if (aff) return { ...base, status: 'present', value: true, evidence: evidenceAt(aff), method: 'rule', confidence: 0.85 };
  const weak = scan(listing, KEYWORDS.largeLandlordWeak);
  if (weak) return { ...base, status: 'uncertain', evidence: evidenceAt(weak), method: 'rule', confidence: 0.5 };
  return { ...base, status: 'missing', method: 'rule', confidence: 0.85 };
}

function checkR4(listing: ExtractedListing, r5: Check): Check {
  // "Cuando proceda": we can't always know a prior contract existed, so absence is
  // only a failure (required) when PRD's aggravating case holds: stressed zone AND
  // a declared gran tenedor. Otherwise absence is not_applicable, not a false fail.
  const aggravated = listing.location.stressedZone === true && r5.status === 'present' && r5.value === true;
  const base = { ruleId: 'R4' as RuleId, field: FIELD_OF.R4, required: aggravated, legalBasis: LEGAL_BASIS.R4 };
  const hit = scan(listing, KEYWORDS.previousRent);
  if (hit) {
    const value = moneyNear(hit);
    // A label with no amount and an explicit "not provided" falls through to missing/na.
    if (value || !notProvidedNear(hit)) {
      return { ...base, status: 'present', value, evidence: evidenceAt(hit), method: 'rule', confidence: value ? 0.9 : 0.6 };
    }
  }
  return { ...base, status: aggravated ? 'missing' : 'not_applicable', method: 'rule', confidence: 0.6 };
}

function energyLetter(sourceText: string, index: number): string | undefined {
  const window = sourceText.slice(Math.max(0, index - 60), index + 60);
  const m = /\b([A-G])\b/.exec(window);
  return m ? m[1] : undefined;
}

function checkC1(listing: ExtractedListing): Check {
  const base = { ruleId: 'C1' as RuleId, field: FIELD_OF.C1, required: false, legalBasis: LEGAL_BASIS.C1 };
  // A grade decoded from portal markup (e.g. Idealista's icon-energy-c-<letter>)
  // is the most reliable signal, so it wins over text scanning.
  if (listing.energyRating && /^[A-G]$/.test(listing.energyRating)) {
    return {
      ...base,
      status: 'present',
      value: listing.energyRating,
      evidence: { text: `Calificación energética ${listing.energyRating}`, location: 'features' },
      method: 'rule',
      confidence: 0.95,
    };
  }
  const pending = scan(listing, KEYWORDS.energyPending);
  const energy = scan(listing, KEYWORDS.energy);
  // "en trámite"/"exento" only counts if it co-occurs with an energy context.
  if (energy && pending) {
    return { ...base, status: 'uncertain', value: 'en trámite', evidence: evidenceAt(pending), method: 'rule', confidence: 0.6 };
  }
  if (energy) {
    const letter = energyLetter(energy.sourceText, energy.index);
    return { ...base, status: 'present', value: letter, evidence: evidenceAt(energy), method: 'rule', confidence: letter ? 0.9 : 0.7 };
  }
  return { ...base, status: 'missing', method: 'rule', confidence: 0.8 };
}

// --- Verdict ----------------------------------------------------------------

function toMonthly(value: Money, areaM2?: number): number | null {
  if (value.period === 'month') return value.amount;
  if (value.period === 'month_per_m2' && areaM2) return value.amount * areaM2;
  return null;
}

function priceAboveLimit(listing: ExtractedListing, r2: Check): boolean | null {
  if (r2.status !== 'present' || !r2.value || typeof r2.value !== 'object') return null;
  if (!listing.price) return null;
  const price = toMonthly(listing.price, listing.areaM2);
  const limit = toMonthly(r2.value as Money, listing.areaM2);
  if (price === null || limit === null) return null;
  return price > limit;
}

function buildVerdict(checks: Check[], priceAbove: boolean | null): Verdict {
  const missingRequired = checks.filter((c) => c.required && c.status === 'missing').map((c) => c.ruleId);
  const uncertain = checks.filter((c) => c.status === 'uncertain').map((c) => c.ruleId);
  const optionalMissing = checks.some((c) => !c.required && c.status === 'missing');

  let status: Verdict['status'];
  if (missingRequired.length > 0 || priceAbove === true) status = 'fail';
  else if (uncertain.length > 0 || optionalMissing) status = 'warn';
  else status = 'pass';

  return {
    status,
    ...(missingRequired.length ? { missingRequired } : {}),
    ...(uncertain.length ? { uncertain } : {}),
    priceAboveStatedLimit: priceAbove,
  };
}

/** Evaluate one extracted listing against the ruleset. Pure and deterministic. */
export function evaluate(listing: ExtractedListing, now: Date = new Date()): ListingCheck {
  const r1 = checkR1(listing);
  const r2 = checkR2(listing);
  const r5 = checkR5(listing);
  const r4 = checkR4(listing, r5);
  const c1 = checkC1(listing);
  const checks: Check[] = [r1, r2, r4, r5, c1];
  const priceAbove = priceAboveLimit(listing, r2);

  return {
    schemaVersion: SCHEMA_VERSION,
    rulesetVersion: RULESET_VERSION,
    checkedAt: now.toISOString(),
    source: { portal: listing.portal, url: listing.url, listingId: listing.listingId },
    listing: {
      rentalType: listing.rentalType,
      advertiserType: listing.advertiserType,
      ...(listing.vacationalClaimed ? { vacationalClaimed: true } : {}),
      price: listing.price,
      areaM2: listing.areaM2,
      location: listing.location,
    },
    checks,
    verdict: buildVerdict(checks, priceAbove),
  };
}
