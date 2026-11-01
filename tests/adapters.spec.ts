import { describe, expect, it } from 'vitest';
import { adapterForUrl } from '../src/adapters/registry';
import { fotocasaCityFromUrl, fotocasaEnergyLetter, habitacliaCityFromUrl, isAreaText, isRentPriceText, milanunciosCityFromUrl, milanunciosMunicipalityFromText, pisosEnergyLetter, pisosMunicipalityFromText } from '../src/adapters/portals';

// Representative detail URLs per portal. These encode our assumptions about each
// portal's URL shape; validate against live listings and update as needed.
const DETAIL: Record<string, { url: string; id: string }> = {
  idealista: { url: 'https://www.idealista.com/inmueble/112898936/', id: '112898936' },
  idealista_ca: { url: 'https://www.idealista.com/ca/inmueble/112898936/', id: '112898936' },
  idealista_en: { url: 'https://www.idealista.com/en/inmueble/112898936/', id: '112898936' },
  fotocasa: { url: 'https://www.fotocasa.es/es/alquiler/vivienda/barcelona-capital/eixample-esquerra-179012345/d', id: '179012345' },
  habitaclia: {
    url: 'https://www.habitaclia.com/alquiler/atico/passatge-sert/eixample/barcelona-capital/b3e465fe-041a-4fef-a348-f491534ca0ae/d',
    id: 'b3e465fe-041a-4fef-a348-f491534ca0ae',
  },
  habitaclia_ca: { url: 'https://catala.habitaclia.com/lloguer/atic/passatge-sert/eixample/barcelona-capital/b3e465fe-041a-4fef-a348-f491534ca0ae/d', id: 'b3e465fe-041a-4fef-a348-f491534ca0ae' },
  habitaclia_en: { url: 'https://english.habitaclia.com/rental/penthouse/passatge-sert/eixample/barcelona-capital/b3e465fe-041a-4fef-a348-f491534ca0ae/d', id: 'b3e465fe-041a-4fef-a348-f491534ca0ae' },
  habitaclia_legacy: { url: 'https://www.habitaclia.com/alquiler-piso-centre-sabadell-i1234567890.htm', id: '1234567890' },
  fotocasa_en: { url: 'https://www.fotocasa.es/en/rental/home/barcelona-capital/eixample-esquerra-179012345/d', id: '179012345' },
  fotocasa_ca: { url: 'https://www.fotocasa.es/ca/lloguer/habitatge/barcelona-capital/eixample-esquerra-179012345/d', id: '179012345' },
  pisos_com: { url: 'https://www.pisos.com/alquilar/piso-chamberi_vallehermoso-65913705023_100500/', id: '65913705023' },
  yaencontre: { url: 'https://www.yaencontre.com/alquiler/pisos/barcelona/12345678', id: '12345678' },
  milanuncios: { url: 'https://www.milanuncios.com/alquiler-de-pisos-en-barcelona-barcelona/barcelona-capital-621476337.htm', id: '621476337' },
};

describe('adapter URL routing', () => {
  for (const [portal, { url, id }] of Object.entries(DETAIL)) {
    it(`routes a ${portal} detail URL and extracts its id`, () => {
      const a = adapterForUrl(url);
      expect(a?.portal).toBe(portal.replace(/_(?:legacy|ca|en)$/, ''));
      expect(a?.listingId(url)).toBe(id);
    });
  }

  it('does not match non-listing pages', () => {
    expect(adapterForUrl('https://www.fotocasa.es/es/')).toBeUndefined();
    expect(adapterForUrl('https://www.idealista.com/alquiler-viviendas/barcelona/')).toBeUndefined();
    expect(adapterForUrl('https://www.idealista.com/ca/alquiler-viviendas/barcelona/')).toBeUndefined();
    expect(adapterForUrl('https://example.com/inmueble/123456/')).toBeUndefined();
    expect(adapterForUrl('https://www.habitaclia.com/alquiler/viviendas/barcelona-provincia/barcelona-capital/s')).toBeUndefined();
  });

  it('only matches rental listings', () => {
    const uuid = 'b3e465fe-041a-4fef-a348-f491534ca0ae';
    expect(adapterForUrl(`https://www.habitaclia.com/comprar/atico/x/eixample/barcelona-capital/${uuid}/d`)).toBeUndefined();
    // Language/path pairs are per subdomain: www is /alquiler, catala is /lloguer.
    expect(adapterForUrl(`https://www.habitaclia.com/lloguer/atic/x/eixample/barcelona-capital/${uuid}/d`)).toBeUndefined();
    expect(adapterForUrl(`https://catala.habitaclia.com/alquiler/atic/x/eixample/barcelona-capital/${uuid}/d`)).toBeUndefined();
    expect(adapterForUrl('https://www.fotocasa.es/es/comprar/vivienda/barcelona-capital/x-179012345/d')).toBeUndefined();
    expect(adapterForUrl('https://www.fotocasa.es/en/buy/home/barcelona-capital/x-179012345/d')).toBeUndefined();
    expect(adapterForUrl('https://www.milanuncios.com/venta-de-pisos-en-barcelona-barcelona/x-621476337.htm')).toBeUndefined();
    expect(adapterForUrl('https://www.pisos.com/comprar/piso-chamberi_vallehermoso-65913705023_100500/')).toBeUndefined();
    expect(adapterForUrl('https://www.yaencontre.com/venta/pisos/barcelona/12345678')).toBeUndefined();
  });
});

describe('fotocasaEnergyLetter', () => {
  it('decodes the grade from the energy-certificate class', () => {
    expect(fotocasaEnergyLetter('re-DetailEnergyCertificate-item re-DetailEnergyCertificate-value--e')).toBe('E');
    expect(fotocasaEnergyLetter('re-DetailEnergyCertificate-value--a')).toBe('A');
  });
  it('returns undefined when there is no grade class', () => {
    expect(fotocasaEnergyLetter('re-DetailEnergyCertificate-itemUnits')).toBeUndefined();
  });
});

describe('pisosEnergyLetter', () => {
  it('reads the consumption grade from the energy-label data-url', () => {
    const url = 'https://.../energy-label?consumptionQualification=E&consumptionRate=16&emissionQualification=E&emissionRate=40';
    expect(pisosEnergyLetter(url)).toBe('E');
  });
  it('falls back to the tag class', () => {
    expect(pisosEnergyLetter(null, 'energy-certificate__tag energy-certificate__tag--e')).toBe('E');
  });
  it('returns undefined with neither', () => {
    expect(pisosEnergyLetter(null, 'energy-certificate__tag')).toBeUndefined();
  });
});

describe('pisosMunicipalityFromText', () => {
  it('takes the municipality after the last period inside the parentheses', () => {
    expect(pisosMunicipalityFromText('Vallehermoso (Distrito Chamberí. Madrid Capital)')).toBe('Madrid Capital');
    expect(pisosMunicipalityFromText('Centre (Sabadell)')).toBe('Sabadell');
  });
  it('returns undefined without parentheses', () => {
    expect(pisosMunicipalityFromText('Más información sobre la zona')).toBeUndefined();
  });
});

describe('milanunciosCityFromUrl', () => {
  it('reads the municipality (last token) from the category path', () => {
    expect(milanunciosCityFromUrl(DETAIL.milanuncios!.url)).toBe('Barcelona');
    expect(milanunciosCityFromUrl('https://www.milanuncios.com/alquiler-de-pisos-en-barcelona-sabadell/x-1.htm')).toBe('Sabadell');
  });
});

describe('milanunciosMunicipalityFromText', () => {
  it('takes the municipality before the province parenthesis', () => {
    expect(milanunciosMunicipalityFromText('Barcelona (Barcelona)')).toBe('Barcelona');
    expect(milanunciosMunicipalityFromText('Sabadell (Barcelona)')).toBe('Sabadell');
  });
});

describe('isAreaText', () => {
  it('accepts a bare surface and rejects a price-per-m²', () => {
    expect(isAreaText('150 m²')).toBe(true);
    expect(isAreaText('81 m2')).toBe(true);
    expect(isAreaText('26,33 €/m²')).toBe(false);
    expect(isAreaText('3 habs.')).toBe(false);
  });
});

describe('fotocasaCityFromUrl', () => {
  it('reads and title-cases the city slug from the URL', () => {
    expect(fotocasaCityFromUrl('https://www.fotocasa.es/es/alquiler/vivienda/sabadell/aire-acondicionado-191071878/d')).toBe('Sabadell');
    expect(fotocasaCityFromUrl('https://www.fotocasa.es/es/alquiler/vivienda/barcelona-capital/x-1/d')).toBe('Barcelona Capital');
    expect(fotocasaCityFromUrl(DETAIL.fotocasa_en!.url)).toBe('Barcelona Capital');
    expect(fotocasaCityFromUrl(DETAIL.fotocasa_ca!.url)).toBe('Barcelona Capital');
    expect(fotocasaCityFromUrl('https://www.fotocasa.es/es/')).toBeUndefined();
  });
});

describe('habitacliaCityFromUrl', () => {
  it('reads the municipality segment right before the listing UUID', () => {
    expect(habitacliaCityFromUrl(DETAIL.habitaclia!.url)).toBe('Barcelona Capital');
    expect(
      habitacliaCityFromUrl('https://www.habitaclia.com/alquiler/piso/centre/sabadell/0a1b2c3d-0000-4000-8000-123456789abc/d?x=1'),
    ).toBe('Sabadell');
  });
  it('returns undefined for legacy or non-listing URLs', () => {
    expect(habitacliaCityFromUrl(DETAIL.habitaclia_legacy!.url)).toBeUndefined();
    expect(habitacliaCityFromUrl('https://www.habitaclia.com/')).toBeUndefined();
  });
});

describe('isRentPriceText', () => {
  it('accepts a monthly rent and rejects other euro figures', () => {
    expect(isRentPriceText('7.500 €/mes')).toBe(true);
    expect(isRentPriceText('950 € / mes')).toBe(true);
    expect(isRentPriceText('7,500 €/month')).toBe(true);
    expect(isRentPriceText('727.000 €')).toBe(false);
    expect(isRentPriceText('25 €/m²')).toBe(false);
  });
});
