import type { EvidenceLocation, ExtractedListing, Money } from '../src/types';

const EMPTY_SOURCES: Record<EvidenceLocation, string> = {
  title: '',
  description: '',
  features: '',
  structured_data: '',
};

type Over = Partial<Omit<ExtractedListing, 'sources'>> & {
  sources?: Partial<Record<EvidenceLocation, string>>;
};

/** Build an ExtractedListing for tests; override only what a case cares about. */
export function makeListing(over: Over = {}): ExtractedListing {
  return {
    portal: 'idealista',
    url: 'https://www.idealista.com/inmueble/123456/',
    listingId: '123456',
    rentalType: 'primary_residence',
    advertiserType: 'professional',
    location: { municipality: 'Barcelona', ineCode: '08019', stressedZone: true },
    ...over,
    sources: { ...EMPTY_SOURCES, ...(over.sources ?? {}) },
  };
}

export const money = (amount: number, period: Money['period'] = 'month'): Money => ({
  amount,
  currency: 'EUR',
  period,
});
