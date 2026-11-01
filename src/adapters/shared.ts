// Pure, DOM-free helpers shared by portal adapters. Kept separate from the DOM
// code so classification logic is unit-testable without a browser environment.

import type { AdvertiserType, RentalType } from '../types';
import { KEYWORDS } from '../rules/ruleset';

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function containsAny(text: string, needles: readonly string[]): boolean {
  const hay = norm(text);
  return needles.some((n) => hay.includes(norm(n)));
}

export interface ScopeResult {
  rentalType: RentalType;
  /**
   * True when the ad presents itself as vacacional/turístico. We no longer hard-
   * exclude these: some are "fake vacacional" (really vivienda habitual labeled
   * as holiday to dodge art. 20), so we analyze and flag the possible evasion.
   */
  vacationalClaimed: boolean;
}

/**
 * Classify the ad's scope from its full text. Primary residence, temporary and
 * room rentals are all in scope (treated alike). A vacacional label is recorded
 * as a flag, not an exclusion.
 */
export function classifyScope(fullText: string): ScopeResult {
  const vacationalClaimed = containsAny(fullText, KEYWORDS.vacational);
  let rentalType: RentalType = 'primary_residence';
  if (containsAny(fullText, KEYWORDS.room)) rentalType = 'room';
  else if (containsAny(fullText, KEYWORDS.temporary)) rentalType = 'temporary';
  return { rentalType, vacationalClaimed };
}

export function detectAdvertiserType(text: string): AdvertiserType {
  const hay = norm(text);
  if (/\b(inmobiliaria|agencia|profesional|api\b|real estate)\b/.test(hay)) return 'professional';
  if (/\bparticular\b/.test(hay)) return 'private';
  return 'unknown';
}

/** Pull a 5-digit Spanish postal code out of free text, if present. */
export function findPostalCode(text: string): string | undefined {
  const m = /\b(\d{5})\b/.exec(text);
  return m ? m[1] : undefined;
}
