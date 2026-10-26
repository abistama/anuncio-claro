import type { ExtractedListing, Portal } from '../types';

/**
 * A portal adapter knows how to recognise its listing URLs and turn a loaded
 * listing page (Document) into an ExtractedListing. Extraction prioritises
 * structured data (JSON-LD, feature sheet) and falls back to the free-text
 * description when a selector fails (F2).
 */
export interface PortalAdapter {
  readonly portal: Portal;
  /** True if `url` is a single-listing page this adapter handles. */
  matches(url: string): boolean;
  /** Stable listing id from the URL, or null if it can't be derived. */
  listingId(url: string): string | null;
  /** Extract the listing, or null if the page isn't a usable rental listing. */
  extract(doc: Document, url: string): ExtractedListing | null;
}
