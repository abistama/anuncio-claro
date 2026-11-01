// Pure assembly step: raw strings scraped by an adapter -> ExtractedListing.
// Separated from DOM code so every adapter shares one normalization path and it
// can be unit-tested with plain strings.

import type { ExtractedListing, Location, Money, Portal } from '../types';
import { findMoney, parseEsNumber } from '../rules/normalize';
import { isStressedZone, lookupIneByName } from '../rules/stressed-zones';
import { classifyScope, detectAdvertiserType, findPostalCode } from './shared';

export interface RawFields {
  portal: Portal;
  url: string;
  listingId: string;
  title: string;
  description: string;
  /** Feature-sheet lines joined with newlines. */
  features: string;
  /** JSON-LD / structured metadata, serialized to text. */
  structuredData: string;
  priceText?: string;
  areaText?: string;
  municipality?: string;
  postalCode?: string;
  ineCode?: string;
  /** Any text that hints at private vs professional advertiser. */
  advertiserText?: string;
  /** Energy grade (A-G) decoded from portal-specific markup, if any. */
  energyRating?: string;
}

function parsePrice(priceText?: string): Money | undefined {
  if (!priceText) return undefined;
  const m = findMoney(priceText);
  return m ? { amount: m.amount, currency: m.currency, period: m.period } : undefined;
}

function parseArea(areaText?: string): number | undefined {
  if (!areaText) return undefined;
  const m = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/.exec(areaText);
  if (!m) return undefined;
  const n = parseEsNumber(m[1] as string);
  return n && n > 0 ? n : undefined;
}

/**
 * Assemble raw scraped strings into an ExtractedListing, or null when the ad is
 * out of scope (vacacional/venta).
 */
export function buildExtractedListing(raw: RawFields): ExtractedListing | null {
  const fullText = `${raw.title}\n${raw.features}\n${raw.description}`;
  const scope = classifyScope(fullText);

  const postalCode = raw.postalCode ?? findPostalCode(`${raw.features}\n${raw.structuredData}`);
  const ineCode = raw.ineCode ?? (raw.municipality ? lookupIneByName(raw.municipality) : undefined);

  const location: Location = {
    municipality: raw.municipality ?? '',
    ...(ineCode ? { ineCode } : {}),
    ...(postalCode ? { postalCode } : {}),
    stressedZone: isStressedZone({ ineCode, municipality: raw.municipality }),
  };

  return {
    portal: raw.portal,
    url: raw.url,
    listingId: raw.listingId,
    rentalType: scope.rentalType,
    ...(scope.vacationalClaimed ? { vacationalClaimed: true } : {}),
    advertiserType: detectAdvertiserType(`${raw.advertiserText ?? ''}\n${raw.description}`),
    price: parsePrice(raw.priceText),
    areaM2: parseArea(raw.areaText),
    ...(raw.energyRating && /^[A-G]$/i.test(raw.energyRating) ? { energyRating: raw.energyRating.toUpperCase() } : {}),
    location,
    sources: {
      title: raw.title,
      description: raw.description,
      features: raw.features,
      structured_data: raw.structuredData,
    },
  };
}
