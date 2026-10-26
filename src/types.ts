// Domain types for Anuncio Claro.
// The `ListingCheck` family mirrors schema/listing-check/1.0.json field-for-field
// (English field names, no personal data), so a check can be serialized directly.

export type Portal =
  | 'idealista'
  | 'fotocasa'
  | 'habitaclia'
  | 'pisos_com'
  | 'yaencontre'
  | 'milanuncios';

export type RentalType = 'primary_residence' | 'temporary' | 'room';
export type AdvertiserType = 'private' | 'professional' | 'unknown';

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'C1';

export type Field =
  | 'rent_reference_index'
  | 'max_rent'
  | 'rent_limit_basis'
  | 'previous_rent'
  | 'large_landlord'
  | 'unit_registration_code'
  | 'energy_certificate';

export type CheckStatus = 'present' | 'missing' | 'uncertain' | 'not_applicable';

/** Where in the listing a piece of evidence was found. */
export type EvidenceLocation = 'title' | 'description' | 'features' | 'structured_data';

export type Period = 'month' | 'month_per_m2';

export interface Money {
  amount: number;
  currency: 'EUR';
  period: Period;
}

export interface Location {
  municipality: string;
  ineCode?: string;
  postalCode?: string;
  /** null = unknown; the stressed-zone table has no verdict for this municipality. */
  stressedZone?: boolean | null;
}

export interface Evidence {
  /** Verbatim snippet, trimmed to the schema's 280-char cap. */
  text: string;
  location: EvidenceLocation;
}

export interface Check {
  ruleId: RuleId;
  field: Field;
  required: boolean;
  status: CheckStatus;
  value?: Money | boolean | string;
  evidence?: Evidence;
  method?: 'rule' | 'model';
  confidence?: number;
  legalBasis?: string;
}

export interface Verdict {
  status: 'pass' | 'warn' | 'fail';
  missingRequired?: RuleId[];
  uncertain?: RuleId[];
  priceAboveStatedLimit?: boolean | null;
}

export interface ListingCheck {
  schemaVersion: string;
  rulesetVersion: string;
  checkedAt: string;
  source: {
    portal: Portal;
    url: string;
    listingId: string;
    contentSha256?: string;
  };
  listing: {
    rentalType: RentalType;
    advertiserType?: AdvertiserType;
    /** The ad presents itself as vacacional/temporada; analyzed with a caveat. */
    vacationalClaimed?: boolean;
    price?: Money;
    areaM2?: number;
    location: Location;
  };
  checks: Check[];
  verdict: Verdict;
}

/**
 * What a portal adapter produces: the normalized listing plus the raw text
 * split by source, so the rules engine can attribute evidence to a location.
 * This object is the ONLY input to the (DOM-free) rules engine.
 */
export interface ExtractedListing {
  portal: Portal;
  url: string;
  listingId: string;
  rentalType: RentalType;
  advertiserType: AdvertiserType;
  /** The ad presents itself as vacacional/temporada (possible scope evasion). */
  vacationalClaimed?: boolean;
  price?: Money;
  areaM2?: number;
  location: Location;
  /**
   * Energy rating (A-G) decoded from portal-specific markup, e.g. Idealista's
   * `icon-energy-c-f` class. Set by the adapter when the grade is not in text;
   * the engine prefers it over text scanning for C1.
   */
  energyRating?: string;
  sources: Record<EvidenceLocation, string>;
}
