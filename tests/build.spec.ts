import { describe, expect, it } from 'vitest';
import { buildExtractedListing, type RawFields } from '../src/adapters/build';
import { classifyScope, detectAdvertiserType } from '../src/adapters/shared';

const base: RawFields = {
  portal: 'idealista',
  url: 'https://www.idealista.com/inmueble/1/',
  listingId: '1',
  title: 'Alquiler de piso en Barcelona',
  description: 'Bonito piso.',
  features: '65 m²\nCertificado energético: E',
  structuredData: '{}',
  priceText: '1.250 €/mes',
  areaText: '65 m²',
  municipality: 'Barcelona',
};

describe('classifyScope', () => {
  it('flags vacacional ads but does not exclude them', () => {
    const s = classifyScope('alquiler vacacional en la playa');
    expect(s.vacationalClaimed).toBe(true);
  });
  it('tags rooms and temporary rentals', () => {
    expect(classifyScope('se alquila habitación en piso compartido').rentalType).toBe('room');
    expect(classifyScope('alquiler temporal de 6 meses').rentalType).toBe('temporary');
  });
  it('defaults to primary residence, not vacacional', () => {
    const s = classifyScope('alquiler de piso');
    expect(s.rentalType).toBe('primary_residence');
    expect(s.vacationalClaimed).toBe(false);
  });
});

describe('detectAdvertiserType', () => {
  it('recognises professionals and particulars', () => {
    expect(detectAdvertiserType('Inmobiliaria XYZ')).toBe('professional');
    expect(detectAdvertiserType('Anuncio de particular')).toBe('private');
    expect(detectAdvertiserType('sin pistas')).toBe('unknown');
  });
});

describe('buildExtractedListing', () => {
  it('assembles a listing and resolves the stressed zone from the municipality', () => {
    const l = buildExtractedListing(base);
    expect(l).not.toBeNull();
    expect(l?.price).toMatchObject({ amount: 1250, period: 'month' });
    expect(l?.areaM2).toBe(65);
    expect(l?.location.ineCode).toBe('08019');
    expect(l?.location.stressedZone).toBe(true);
  });
  it('analyzes a vacacional ad and flags it instead of excluding it', () => {
    const l = buildExtractedListing({ ...base, title: 'Alquiler vacacional junto al mar' });
    expect(l).not.toBeNull();
    expect(l?.vacationalClaimed).toBe(true);
  });
  it('marks an unknown municipality as stressedZone null', () => {
    const l = buildExtractedListing({ ...base, municipality: 'Teruel' });
    expect(l?.location.stressedZone).toBeNull();
  });
  it('normalizes a decoded energy rating to an uppercase A-G letter', () => {
    expect(buildExtractedListing({ ...base, energyRating: 'f' })?.energyRating).toBe('F');
    expect(buildExtractedListing({ ...base, energyRating: 'Z' })?.energyRating).toBeUndefined();
  });
});
