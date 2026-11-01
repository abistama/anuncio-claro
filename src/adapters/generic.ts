// Generic, config-driven adapter used by every portal except Idealista (which
// keeps a bespoke adapter for its energy-icon decoding). Each portal supplies a
// URL pattern and candidate selector lists; extraction leans on JSON-LD and meta
// tags so a wrong selector degrades gracefully rather than yielding nothing.
//
// NOTE: the selector lists and URL patterns below are best-effort and must be
// validated against live pages (and the PRD's daily reference-ad tests). The
// pipeline (adapter -> buildExtractedListing -> engine) is the durable part.

import type { ExtractedListing, Portal } from '../types';
import type { PortalAdapter } from './types';
import { buildExtractedListing, type RawFields } from './build';
import { metaContent, qsAllText, qsText, readJsonLd } from './dom';

export interface AdapterConfig {
  portal: Portal;
  /** Matches a single-listing URL; capture group `idGroup` (default 1) is the id. */
  listingRe: RegExp;
  idGroup?: number;
  title: readonly string[];
  description: readonly string[];
  features: readonly string[];
  price?: readonly string[];
  area?: readonly string[];
  advertiser?: readonly string[];
  /** Portal-specific energy-grade decoder (e.g. an icon class). */
  energyRating?: (doc: Document) => string | undefined;
  /** Portal-specific price extractor, used before `price` selectors / JSON-LD. */
  priceText?: (doc: Document) => string | undefined;
  /** Portal-specific municipality extractor (gets the URL too), used before JSON-LD. */
  municipality?: (doc: Document, url: string) => string | undefined;
  /** Portal-specific area extractor, used before `area` selectors / JSON-LD. */
  areaText?: (doc: Document) => string | undefined;
  /** Extra structured text to append to features (e.g. a labeled price table). */
  extraText?: (doc: Document) => string | undefined;
}

export function makeAdapter(config: AdapterConfig): PortalAdapter {
  const idGroup = config.idGroup ?? 1;

  return {
    portal: config.portal,

    matches(url) {
      return config.listingRe.test(url);
    },

    listingId(url) {
      return config.listingRe.exec(url)?.[idGroup] ?? null;
    },

    extract(doc, url) {
      const id = this.listingId(url);
      if (!id) return null;

      const ld = readJsonLd(doc);
      const title = qsText(doc, config.title) || ld.name || metaContent(doc, 'og:title') || doc.title;
      const description =
        qsAllText(doc, config.description) || ld.description || metaContent(doc, 'description') || '';
      const features = [qsAllText(doc, config.features), config.extraText?.(doc) ?? '']
        .filter(Boolean)
        .join('\n');
      const priceText =
        config.priceText?.(doc) ||
        (config.price ? qsText(doc, config.price) : '') ||
        (ld.price ? `${ld.price} €/mes` : '');
      const areaText =
        config.areaText?.(doc) ||
        (config.area ? qsText(doc, config.area) : '') ||
        (ld.area ? `${ld.area} m²` : '');
      const advertiserText = config.advertiser ? qsText(doc, config.advertiser) : '';

      const raw: RawFields = {
        portal: config.portal,
        url,
        listingId: id,
        title,
        description: description || title,
        features,
        structuredData: ld.text,
        priceText,
        areaText,
        municipality: config.municipality?.(doc, url) || ld.municipality,
        postalCode: ld.postalCode,
        advertiserText,
        energyRating: config.energyRating?.(doc),
      };

      return buildExtractedListing(raw) as ExtractedListing | null;
    },
  };
}
