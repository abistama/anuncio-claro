// DOM helpers shared by portal adapters. All selector lists are tried in order
// and the first non-empty match wins, so a changed class name degrades to the
// next candidate (and ultimately to JSON-LD / meta tags) instead of breaking.

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** First matching element's text, trying each selector in order. */
export function qsText(doc: Document, selectors: readonly string[]): string {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const text = clean(el?.textContent);
    if (text) return text;
  }
  return '';
}

/** All matching elements' text for the first selector that matches anything. */
export function qsAllText(doc: Document, selectors: readonly string[]): string {
  for (const sel of selectors) {
    const parts = Array.from(doc.querySelectorAll(sel)).map((el) => clean(el.textContent)).filter(Boolean);
    if (parts.length) return parts.join('\n');
  }
  return '';
}

export function metaContent(doc: Document, name: string): string | undefined {
  const el =
    doc.querySelector(`meta[name="${name}"]`) ??
    doc.querySelector(`meta[property="${name}"]`) ??
    doc.querySelector(`meta[itemprop="${name}"]`);
  return clean(el?.getAttribute('content')) || undefined;
}

export interface JsonLd {
  text: string;
  name?: string;
  description?: string;
  price?: string;
  municipality?: string;
  postalCode?: string;
  area?: string;
}

/** Collect all JSON-LD objects (including arrays and @graph) into a flat list. */
function flatten(node: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    for (const n of node) flatten(n, acc);
  } else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    acc.push(obj);
    if (Array.isArray(obj['@graph'])) flatten(obj['@graph'], acc);
  }
  return acc;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

/**
 * Read price, address, area, name and description from any JSON-LD on the page.
 * Portals vary wildly in selectors but most embed schema.org data, so this is the
 * most durable source for the structured fields.
 */
export function readJsonLd(doc: Document): JsonLd {
  const out: JsonLd = { text: '' };
  const texts: string[] = [];

  for (const el of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    const raw = el.textContent ?? '';
    if (!raw.trim()) continue;
    texts.push(raw);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const node of flatten(data)) {
      const offers = (node['offers'] ?? node['Offer']) as Record<string, unknown> | undefined;
      const priceSpec = offers?.['priceSpecification'] as Record<string, unknown> | undefined;
      out.price ??= str(node['price']) ?? str(offers?.['price']) ?? str(priceSpec?.['price']);

      const addr = node['address'] as Record<string, unknown> | undefined;
      if (addr && typeof addr === 'object') {
        out.municipality ??= str(addr['addressLocality']);
        out.postalCode ??= str(addr['postalCode']);
      }

      const floor = node['floorSize'] as Record<string, unknown> | undefined;
      out.area ??= str(floor?.['value']);
      out.name ??= str(node['name']);
      out.description ??= str(node['description']);
    }
  }

  out.text = texts.join('\n');
  return out;
}
