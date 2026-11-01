// Config-driven adapters for the Phase-1 portals other than Idealista.
//
// IMPORTANT: URL patterns and selectors are best-effort, drawn from the portals'
// typical URL shapes and markup. They must be validated against live listings
// (PRD: daily tests against reference ads). JSON-LD / meta fallbacks in the
// generic adapter mean the legal checks can still fire on the description even
// when a portal-specific selector is stale.

import { makeAdapter } from './generic';

/** True for a bare surface like "150 m²" / "81 m2", false for "26,33 €/m²". */
export function isAreaText(text: string): boolean {
  return /^\d[\d.,]*\s*m[²2]?$/i.test(text.trim());
}

/** First element matching a bare-area text among `selector`, e.g. "150 m²". */
function areaFromItems(doc: Document, selector: string): string | undefined {
  for (const el of Array.from(doc.querySelectorAll(selector))) {
    const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (isAreaText(txt)) return txt;
  }
  return undefined;
}

/**
 * Fotocasa encodes the energy grade in a class:
 * `re-DetailEnergyCertificate-value--e` -> E. Pure so it can be unit-tested.
 */
export function fotocasaEnergyLetter(className: string): string | undefined {
  const m = /DetailEnergyCertificate-value--([a-g])\b/i.exec(className);
  return m ? m[1]!.toUpperCase() : undefined;
}

function fotocasaEnergy(doc: Document): string | undefined {
  // Scope to the consumption ("energía") block so we read that grade, not emissions.
  const scope: ParentNode =
    doc.getElementById('feature-value-energía') ??
    doc.querySelector('[id^="feature-value-energ"]') ??
    doc;
  const el = scope.querySelector('[class*="DetailEnergyCertificate-value--"]');
  return el ? fotocasaEnergyLetter(el.getAttribute('class') ?? '') : undefined;
}

/**
 * Fotocasa's rent price sits in a <dd> next to a "Precio de alquiler" <dt>, and
 * the page also shows a mortgage ad with other euro figures (e.g. 727.000 €), so
 * we target that labeled row rather than scanning for any price class.
 */
function fotocasaPrice(doc: Document): string | undefined {
  for (const dt of Array.from(doc.querySelectorAll('dt'))) {
    if (/precio de alquiler/i.test(dt.textContent ?? '')) {
      const dd = dt.nextElementSibling;
      const txt = (dd?.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (/\d/.test(txt)) return txt; // e.g. "2.300 € /mes"
    }
  }
  return undefined;
}

/**
 * Text of the "Información del precio" section. Fotocasa shows the rent reference
 * index here as a labeled field ("Índice alquiler: ..."), which the rules engine
 * reads; when the advertiser didn't provide it the label reads "No informado...",
 * which the engine treats as missing.
 */
function fotocasaPriceSection(doc: Document): string | undefined {
  // Only the price/index <dl>, NOT the whole section (which also holds a mortgage
  // ad with other euro figures that would pollute the index value).
  const h2 = Array.from(doc.querySelectorAll('h2')).find((h) => /informaci[oó]n del precio/i.test(h.textContent ?? ''));
  const dl = h2?.parentElement?.querySelector('dl') ?? doc.querySelector('dl');
  const text = (dl?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || undefined;
}

/**
 * City slug from a Fotocasa listing URL: /<lang>/<rental>/<type>/<city>/<slug>/<id>/d,
 * e.g. /es/alquiler/vivienda/<city>/..., /en/rental/..., /ca/lloguer/...
 */
export function fotocasaCityFromUrl(url: string): string | undefined {
  const m = /\/(?:alquiler|rental|lloguer)\/[^/?#]+\/([^/?#]+)\/[^?#]*\d/i.exec(url);
  if (!m) return undefined;
  return m[1]!.replace(/-/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * Municipality: prefer Fotocasa's labeled "Municipio:" field, but that block is
 * below the fold and lazy-rendered, so fall back to the city in the URL, which is
 * always present. The stressed-zone lookup normalizes case/accents either way.
 */
function fotocasaMunicipality(doc: Document, url: string): string | undefined {
  for (const label of Array.from(doc.querySelectorAll('span, dt, strong'))) {
    if (/^\s*municipio\s*:?\s*$/i.test(label.textContent ?? '')) {
      const val = (label.nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (val) return val;
    }
  }
  return fotocasaCityFromUrl(url);
}

/** Surface from the feature item marked by the "dimensions_block" icon: "170 m²". */
function fotocasaArea(doc: Document): string | undefined {
  const icon = doc.querySelector('svg[data-title="dimensions_block"]');
  const txt = (icon?.closest('li')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return /m²|m2/i.test(txt) ? txt : undefined;
}

export const fotocasaAdapter = makeAdapter({
  portal: 'fotocasa',
  // Rentals only: /es/alquiler/, /en/rental/ or /ca/lloguer/, then
  // <type>/<city>/<slug>/<id>/d  (detail ids are 6+ digits)
  listingRe: /^https?:\/\/(?:www\.)?fotocasa\.es\/(?:es\/alquiler|en\/rental|ca\/lloguer)\/[^?#]*?(\d{6,})(?:\/d)?\/?(?:[?#]|$)/i,
  title: ['.re-DetailHeader-propertyTitle', 'h1[class*="Title"]', 'h1'],
  description: ['.fc-DetailDescription', '.re-DetailDescription', '[class*="Description"] p', '[class*="escription"]'],
  features: ['.re-DetailFeaturesList li', '[class*="Features"] li', '[class*="Feature"] li'],
  price: ['.re-DetailHeader-price', '[class*="Price"]', '[class*="price"]'],
  advertiser: ['.re-ContactDetail-info', '[class*="advertiser"]', '[class*="Advertiser"]'],
  energyRating: fotocasaEnergy,
  priceText: fotocasaPrice,
  municipality: fotocasaMunicipality,
  areaText: fotocasaArea,
  extraText: fotocasaPriceSection,
});

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Municipality slug from a Habitaclia listing URL, title-cased. Current format is
 * .../alquiler/<type>/<street>/<district>/<municipality>/<uuid>/d, so it's the
 * segment right before the UUID. Pure so it can be unit-tested.
 */
export function habitacliaCityFromUrl(url: string): string | undefined {
  const m = new RegExp(`/([^/?#]+)/${UUID}/d\\b`, 'i').exec(url);
  if (!m) return undefined;
  return m[1]!.replace(/-/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** True for a rent price like "7.500 €/mes" (or "€/month" on the English site). */
export function isRentPriceText(text: string): boolean {
  return /^\d[\d.,]*\s*€\s*\/\s*(?:mes|month)$/i.test(text.trim());
}

// Habitaclia's current frontend uses utility classes only, so we anchor on ids,
// data-testids, aria-labels and <dt>/<dd> pairs instead.

function habitacliaPrice(doc: Document): string | undefined {
  const scope = doc.querySelector('[data-testid="listing-detail-content"]') ?? doc;
  for (const el of Array.from(scope.querySelectorAll('span'))) {
    const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    // The English site writes thousands with a comma ("7,500 €/month").
    if (isRentPriceText(txt)) return txt.replace(/(\d),(?=\d{3}\b)/g, '$1.');
  }
  return undefined;
}

/** Surface from the quick-facts row: <div aria-label="300 m²">. */
function habitacliaArea(doc: Document): string | undefined {
  for (const el of Array.from(doc.querySelectorAll('[aria-label]'))) {
    const label = el.getAttribute('aria-label') ?? '';
    if (isAreaText(label)) return label.trim();
  }
  return areaFromItems(doc, 'span');
}

function energySection(doc: Document): Element | null {
  return doc.querySelector('[data-testid="listing-energy-certificate-section"]');
}

function leafTexts(root: Element): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => !el.children.length && el.tagName !== 'svg' && !el.closest('svg, button'))
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Energy grade: a lone A-G letter inside the energy-certificate section. */
function habitacliaEnergy(doc: Document): string | undefined {
  const section = energySection(doc);
  const letter = section && leafTexts(section).find((t) => /^[A-G]$/i.test(t));
  return letter ? letter.toUpperCase() : undefined;
}

/**
 * Labeled features as "Label: value" lines (the <dt>/<dd> pairs would otherwise
 * run together), plus the energy-certificate block so "En trámite" is read in an
 * energy context.
 */
function habitacliaFeatureText(doc: Document): string | undefined {
  const lines: string[] = [];
  for (const dt of Array.from(doc.querySelectorAll('section[aria-labelledby="listing-features-heading"] dt'))) {
    const label = (dt.textContent ?? '').replace(/\s+/g, ' ').trim();
    const value = (dt.nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (label) lines.push(value ? `${label}: ${value}` : label);
  }
  // Leaf texts joined with spaces: textContent would glue "energético" + "En trámite".
  const section = energySection(doc);
  const energy = section ? leafTexts(section).join(' ') : '';
  if (energy) lines.push(energy);
  return lines.join('\n') || undefined;
}

function habitacliaAdvertiser(doc: Document): string | undefined {
  const p = Array.from(doc.querySelectorAll('aside p')).find((el) => /anunciant|advertiser/i.test(el.textContent ?? ''));
  const aside = p?.closest('aside');
  const name = aside?.getAttribute('aria-label') ?? '';
  return [p?.textContent?.trim(), name].filter(Boolean).join(' ') || undefined;
}

export const habitacliaAdapter = makeAdapter({
  portal: 'habitaclia',
  // Rentals only, per site language: www…/alquiler, catala…/lloguer, english…/rental.
  // Current: <rental>/<type>/<street>/<district>/<municipality>/<uuid>/d
  // Legacy:  <rental>-<slug>-i<id>.htm
  listingRe: new RegExp(
    '^https?:\\/\\/(?:www\\.habitaclia\\.com\\/alquiler|catala\\.habitaclia\\.com\\/lloguer|english\\.habitaclia\\.com\\/rental)' +
      `(?:\\/[^?#]*?\\/(${UUID})\\/d\\b|-[^?#]*?-i(\\d+)\\.htm)`,
    'i',
  ),
  title: ['#listing-page-title', 'h1.detail-title', 'h1'],
  description: ['[data-testid="listing-description-content"]', '#js-detail-description', '.detail-description'],
  features: ['.feature-container li', '.detail-feature li'],
  price: ['.detail-price'],
  advertiser: ['.detail-contact-name'],
  priceText: habitacliaPrice,
  areaText: habitacliaArea,
  energyRating: habitacliaEnergy,
  extraText: habitacliaFeatureText,
  municipality: (_doc, url) => habitacliaCityFromUrl(url),
  advertiserText: habitacliaAdvertiser,
});

/**
 * Energy grade from pisos.com: prefer the energy-label data-url
 * (consumptionQualification=E), else the consumption tag class
 * (energy-certificate__tag--e). Pure so it can be unit-tested.
 */
export function pisosEnergyLetter(labelUrl: string | null | undefined, tagClass?: string | null): string | undefined {
  const m = /consumptionQualification=([A-G])/i.exec(labelUrl ?? '');
  if (m) return m[1]!.toUpperCase();
  const c = /energy-certificate__tag--([a-g])\b/i.exec(tagClass ?? '');
  return c ? c[1]!.toUpperCase() : undefined;
}

function pisosEnergy(doc: Document): string | undefined {
  const labelUrl = doc.querySelector('.js-energyLabel[data-url], [data-url*="Qualification"]')?.getAttribute('data-url');
  const tagClass = doc.querySelector('[class*="energy-certificate__tag--"]')?.getAttribute('class');
  return pisosEnergyLetter(labelUrl, tagClass);
}

/**
 * Municipality from the pisos.com location line, e.g.
 * "Vallehermoso (Distrito Chamberí. Madrid Capital)" -> "Madrid Capital"
 * (the segment after the last period inside the parentheses). Pure/testable.
 */
export function pisosMunicipalityFromText(text: string): string | undefined {
  const paren = /\(([^)]*)\)/.exec(text);
  if (!paren) return undefined;
  const parts = paren[1]!.split(/\.\s*/).map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  return last || undefined;
}

function pisosMunicipality(doc: Document): string | undefined {
  for (const p of Array.from(doc.querySelectorAll('.details__block p, .details__block h1 + p'))) {
    const muni = pisosMunicipalityFromText((p.textContent ?? '').replace(/\s+/g, ' ').trim());
    if (muni) return muni;
  }
  return undefined;
}

/** Rent price from pisos.com's data-ad-price attribute (robust, always present). */
function pisosPrice(doc: Document): string | undefined {
  const v = doc.querySelector('[data-ad-price]')?.getAttribute('data-ad-price');
  return v && /^\d+$/.test(v) ? `${v} €/mes` : undefined;
}

/** Surface from the pisos.com summary: the "81 m²" item, not "29 €/m²". */
function pisosArea(doc: Document): string | undefined {
  return areaFromItems(doc, '.features-summary__item, li');
}

export const pisosComAdapter = makeAdapter({
  portal: 'pisos_com',
  // Rentals only: /alquilar/<slug>-<id>_<sub>/
  listingRe: /^https?:\/\/(?:www\.)?pisos\.com\/alquilar\/[^?#]*?(\d{6,})/i,
  title: ['h1.details__block-title', 'h1'],
  description: ['.description__content', '#description', '[class*="description"]'],
  features: ['.features-summary__item', '.charblock__list li', '.features__list li', '[class*="feature"] li'],
  price: ['.price__value', '[class*="price"]'],
  advertiser: ['.contact__name', '[class*="advertiser"]'],
  energyRating: pisosEnergy,
  areaText: pisosArea,
  priceText: pisosPrice,
  municipality: pisosMunicipality,
});

/** Energy grade from yaencontre's <i data-rating="a"> (first = consumption). */
function yaencontreEnergy(doc: Document): string | undefined {
  const r = doc.querySelector('.energy-letter[data-rating], [data-rating]')?.getAttribute('data-rating');
  return r && /^[a-g]$/i.test(r) ? r.toUpperCase() : undefined;
}

/** Surface from yaencontre's media-info spans: the "150 m²" item, not "26,33 €/m²". */
function yaencontreArea(doc: Document): string | undefined {
  return areaFromItems(doc, '.media-info span, [class*="media-info"] span, li');
}

/** Rent price from yaencontre's "Precio:" row, not "Precio por m²:". */
function yaencontrePrice(doc: Document): string | undefined {
  for (const dt of Array.from(doc.querySelectorAll('dt'))) {
    if (/^\s*precio\s*:?\s*$/i.test((dt.textContent ?? '').replace(/\s+/g, ' '))) {
      const txt = (dt.nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (/\d/.test(txt)) return txt; // "2.250 €/mes"
    }
  }
  return undefined;
}

export const yaencontreAdapter = makeAdapter({
  portal: 'yaencontre',
  // Rentals only: /alquiler/.../<id>
  listingRe: /^https?:\/\/(?:www\.)?yaencontre\.com\/alquiler\/[^?#]*?(\d{6,})\/?(?:[?#]|$)/i,
  title: ['h1'],
  description: ['.description', '[class*="description"]', '[class*="Description"]'],
  features: ['.features li', '.characteristics li', '[class*="feature"] li'],
  price: ['[class*="price"]', '[class*="Price"]'],
  advertiser: ['[class*="advertiser"]', '[class*="agency"]'],
  energyRating: yaencontreEnergy,
  priceText: yaencontrePrice,
  areaText: yaencontreArea,
});

/** Energy grade from Milanuncios' SVG icon, titled e.g. "E energy". */
function milanunciosEnergy(doc: Document): string | undefined {
  for (const title of Array.from(doc.querySelectorAll('svg title'))) {
    const m = /^\s*([A-G])\s+energy/i.exec(title.textContent ?? '');
    if (m) return m[1]!.toUpperCase();
  }
  return undefined;
}

/** Surface from Milanuncios' attribute list: the "167 m²" value, not "14,97 €/m²". */
function milanunciosArea(doc: Document): string | undefined {
  return areaFromItems(doc, '.ma-AdAttributes-itemText, li, p');
}

/**
 * Municipality from the Milanuncios category path: ".../...-en-<prov>-<muni>/...".
 * The last token of that segment is the municipality (e.g. barcelona-barcelona ->
 * Barcelona). The stressed-zone lookup normalizes case/accents.
 */
export function milanunciosCityFromUrl(url: string): string | undefined {
  const m = /\/[^/]*?-en-([a-z0-9-]+?)\//i.exec(url);
  if (!m) return undefined;
  const city = m[1]!.split('-').pop();
  return city ? city.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : undefined;
}

/** Municipality from Milanuncios' "Municipio (Provincia)" location text. */
export function milanunciosMunicipalityFromText(text: string): string | undefined {
  const before = text.split('(')[0]?.trim();
  return before || undefined;
}

function milanunciosMunicipality(doc: Document, url: string): string | undefined {
  const loc = (doc.querySelector('.ma-AdLocation-text, [class*="AdLocation"]')?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return milanunciosMunicipalityFromText(loc) ?? milanunciosCityFromUrl(url);
}

export const milanunciosAdapter = makeAdapter({
  portal: 'milanuncios',
  // Rentals only: /alquiler<...>/<slug>-<id>.htm  (mostly free text; description is the key source)
  listingRe: /^https?:\/\/(?:www\.)?milanuncios\.com\/alquiler[^?#]*?-(\d+)\.htm/i,
  title: ['.ma-AdDetail-title', 'h1'],
  description: ['.ma-AdDetail-description', '.ad-description', '[class*="description"]', '[class*="Description"]'],
  features: ['.ma-AdAttributes-item', '.ma-AdTechnicalInfo li', '.tech-info li', '[class*="feature"] li'],
  price: ['.ma-AdPrice-value', '[class*="price"]', '[class*="Price"]'],
  advertiser: ['.ma-SellerInfo-name', '[class*="seller"]', '[class*="advertiser"]'],
  energyRating: milanunciosEnergy,
  areaText: milanunciosArea,
  municipality: milanunciosMunicipality,
});
