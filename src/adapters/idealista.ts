// Idealista adapter. Thin DOM layer: it collects raw strings and hands them to
// the shared pure assembler. Selectors are intentionally forgiving and fall back
// to the full description text when the technical sheet is missing (F2).

import type { ExtractedListing } from '../types';
import type { PortalAdapter } from './types';
import { buildExtractedListing, type RawFields } from './build';

const LISTING_RE = /^https?:\/\/(www\.)?idealista\.com\/(inmueble|alquiler-habitacion)\/(\d+)\/?/;

function text(doc: Document, selector: string): string {
  return (doc.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function allText(doc: Document, selector: string): string {
  return Array.from(doc.querySelectorAll(selector))
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** Collect and stringify JSON-LD blocks (price, address live here when present). */
function structuredData(doc: Document): { text: string; municipality?: string; postalCode?: string } {
  const blocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .map((el) => el.textContent ?? '')
    .filter(Boolean);
  let municipality: string | undefined;
  let postalCode: string | undefined;
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as Record<string, unknown>;
      const address = (data['address'] ?? {}) as Record<string, unknown>;
      municipality ??= (address['addressLocality'] as string) || undefined;
      postalCode ??= (address['postalCode'] as string) || undefined;
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return { text: blocks.join('\n'), municipality, postalCode };
}

/**
 * Idealista renders the energy grade as an icon class, not text:
 * `icon-energy-c-f` (consumo, grade F), `icon-energy-e-a` (emisiones, grade A).
 * We prefer the consumption grade, which is the primary energy-performance letter.
 */
function energyRating(doc: Document): string | undefined {
  let fallback: string | undefined;
  for (const el of Array.from(doc.querySelectorAll('[class*="icon-energy"]'))) {
    const cls = el.getAttribute('class') ?? '';
    const consumo = /icon-energy-c-([a-g])\b/i.exec(cls);
    if (consumo) return consumo[1]!.toUpperCase();
    const any = /icon-energy-[a-z]-([a-g])\b/i.exec(cls);
    if (any && !fallback) fallback = any[1]!.toUpperCase();
  }
  return fallback;
}

export const idealistaAdapter: PortalAdapter = {
  portal: 'idealista',

  matches(url) {
    return LISTING_RE.test(url);
  },

  listingId(url) {
    return LISTING_RE.exec(url)?.[3] ?? null;
  },

  extract(doc, url) {
    const id = this.listingId(url);
    if (!id) return null;

    const sd = structuredData(doc);
    const title = text(doc, '.main-info__title-main, h1.main-info__title-main, h1');
    const description = allText(doc, '.comment, .adCommentsLanguage, [class*="comment"] p');
    const features = [
      allText(doc, '.details-property-feature-one li, .details-property li'),
      allText(doc, '.info-features span'),
    ]
      .filter(Boolean)
      .join('\n');
    const priceText = text(doc, '.info-data-price, .price-features__container .txt-bold');
    const areaText =
      allText(doc, '.info-features span')
        .split('\n')
        .find((s) => /m²|m2/i.test(s)) ?? '';
    const breadcrumbMunicipality = text(doc, '#headerMap .main-info__title-minor, .main-info__title-minor');
    const advertiserText = text(doc, '.advertiser-name-container, .professional-name, .about-advertiser-name');

    const raw: RawFields = {
      portal: 'idealista',
      url,
      listingId: id,
      title,
      description: description || title,
      features,
      structuredData: sd.text,
      priceText,
      areaText,
      municipality: sd.municipality ?? (breadcrumbMunicipality || undefined),
      postalCode: sd.postalCode,
      advertiserText,
      energyRating: energyRating(doc),
    };

    return buildExtractedListing(raw) as ExtractedListing | null;
  },
};
