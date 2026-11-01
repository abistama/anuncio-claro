// Labeled corpus for the precision harness (tests/corpus.spec.ts).
//
// Each case is a realistic ad snippet with the per-rule status a human labeler
// would assign *from the law's point of view* (what the ad actually discloses),
// plus the context the engine needs (municipality, price). The harness runs the
// engine over every case and reports per-field precision against these labels —
// this is the local stand-in for the PRD's "≥90% sobre 100 anuncios etiquetados"
// gate. Add real anonymized snippets here as they're collected.

import type { CheckStatus, Money, RuleId } from '../../src/types';

export interface CorpusCase {
  id: string;
  note?: string;
  listing: {
    title?: string;
    description: string;
    features?: string;
    municipality?: string;
    ineCode?: string;
    /** Force the stressed-zone verdict; otherwise derived from the INE table. */
    stressedZone?: boolean | null;
    price?: number; // €/mes
    areaM2?: number;
  };
  /** Expected status per rule (only the rules this case is labeled for). */
  expect: Partial<Record<RuleId, CheckStatus>>;
  /** Optional expected extracted values, checked when the status is `present`. */
  expectValue?: Partial<Record<RuleId, Money | boolean | string>>;
  expectPriceAbove?: boolean | null;
}

const m = (amount: number, period: Money['period'] = 'month'): Money => ({ amount, currency: 'EUR', period });

export const CASES: CorpusCase[] = [
  {
    id: 'bare-fail',
    note: 'No disclosures at all — the common non-compliant ad.',
    listing: {
      title: 'Alquiler piso luminoso en el centro',
      description: 'Bonito piso reformado, exterior, con mucha luz. Zona bien comunicada. Disponible ya.',
      municipality: 'Barcelona',
    },
    expect: { R1: 'missing', R2: 'missing', R5: 'missing', C1: 'missing' },
  },
  {
    id: 'full-pass',
    note: 'Everything disclosed, stressed zone.',
    listing: {
      description:
        'Índice de referencia: 1.080 €/mes. Renta máxima aplicable: 1.080 €/mes. El arrendador no es gran tenedor. Certificado energético: letra D.',
      municipality: 'Barcelona',
      price: 1050,
    },
    expect: { R1: 'present', R2: 'present', R5: 'present', C1: 'present' },
    expectValue: { R1: m(1080), R5: false, C1: 'D' },
    expectPriceAbove: false,
  },
  {
    id: 'vacacional-dodge',
    note: "Claims vacacional to dodge contención but states the limit per art. 59 Ley 18/2007.",
    listing: {
      description:
        'La estancia ofertada tiene una finalidad exclusivamente recreativa, vacacional o de ocio que deberá ' +
        'acreditarse previamente y, por tanto, no queda sujeta al régimen de contención de rentas. No obstante, ' +
        'dado que la vivienda se encuentra situada en una zona de mercado residencial tensionado y el artículo 59 ' +
        'de la Ley 18/2007 exige incluir esta información en la publicidad de viviendas situadas en dichas zonas, ' +
        'se hace constar, a efectos meramente informativos, que el límite máximo aplicable conforme al sistema ' +
        'estatal de referencia de precios de alquiler amueblado es de 1392,86 €/mes.',
      municipality: 'Barcelona',
    },
    expect: { R1: 'present', R2: 'present', R5: 'missing', C1: 'missing' },
    expectValue: { R1: m(1392.86), R2: m(1392.86) },
  },
  {
    id: 'index-precio-referencia',
    note: 'Index phrased as "precio de referencia".',
    listing: {
      description: 'El precio de referencia para esta vivienda es de 1.150 € mensuales según el sistema estatal.',
      municipality: 'Girona',
    },
    expect: { R1: 'present' },
    expectValue: { R1: m(1150) },
  },
  {
    id: 'index-per-m2',
    note: 'Index given in €/m².',
    listing: {
      description: 'Índice de referencia del alquiler: 12,50 €/m². Vivienda exterior.',
      municipality: 'Bilbao',
    },
    expect: { R1: 'present' },
    expectValue: { R1: m(12.5, 'month_per_m2') },
  },
  {
    id: 'gran-tenedor-negativo',
    listing: {
      description: 'La propiedad declara que el arrendador no es gran tenedor a efectos de la normativa vigente.',
      municipality: 'Barcelona',
    },
    expect: { R5: 'present' },
    expectValue: { R5: false },
  },
  {
    id: 'gran-tenedor-afirmativo',
    listing: {
      description: 'El propietario es gran tenedor y aplica las condiciones correspondientes.',
      municipality: 'Barcelona',
    },
    expect: { R5: 'present' },
    expectValue: { R5: true },
  },
  {
    id: 'gran-tenedor-catalan',
    note: 'Negative declaration in catalan.',
    listing: {
      description: "S'informa que l'arrendador no és gran tenidor segons la normativa.",
      municipality: 'Barcelona',
    },
    expect: { R5: 'present' },
    expectValue: { R5: false },
  },
  {
    id: 'particular-weak',
    note: '"Particular" alone is a weak signal, not a legal declaration.',
    listing: {
      description: 'Propietario particular, trato directo sin comisiones.',
      municipality: 'Barcelona',
    },
    expect: { R5: 'uncertain' },
  },
  {
    id: 'energy-en-tramite',
    listing: {
      description: 'Certificado de eficiencia energética: en trámite.',
      municipality: 'Barcelona',
    },
    expect: { C1: 'uncertain' },
  },
  {
    id: 'energy-exento',
    listing: {
      description: 'Eficiencia energética: inmueble exento de certificación.',
      municipality: 'Barcelona',
    },
    expect: { C1: 'uncertain' },
  },
  {
    id: 'energy-letter',
    listing: {
      description: 'Consumo energético certificado, letra D. 95 kWh/m² año.',
      municipality: 'Barcelona',
    },
    expect: { C1: 'present' },
    expectValue: { C1: 'D' },
  },
  {
    id: 'not-stressed-teruel',
    note: 'Outside the stressed-zone table: R2 does not apply.',
    listing: {
      description: 'Piso en alquiler, buen estado. Sin más información.',
      municipality: 'Teruel',
    },
    expect: { R1: 'missing', R2: 'not_applicable', R5: 'missing', C1: 'missing' },
  },
  {
    id: 'max-rent-limite-renta',
    note: 'Max rent phrased as "límite de renta".',
    listing: {
      description: 'Índice de referencia 1.000 €. El límite de renta aplicable es de 1.000 €/mes. No es gran tenedor.',
      municipality: 'Barcelona',
    },
    expect: { R1: 'present', R2: 'present', R5: 'present' },
    expectValue: { R2: m(1000) },
  },
  {
    id: 'price-above-limit',
    note: 'Stated price exceeds the stated limit → fail + flag.',
    listing: {
      description:
        'Índice de referencia 1.100 €. Renta máxima aplicable: 1.100 €/mes. El arrendador no es gran tenedor. Certificado energético C.',
      municipality: 'Barcelona',
      price: 1400,
    },
    expect: { R1: 'present', R2: 'present', R5: 'present', C1: 'present' },
    expectPriceAbove: true,
  },
  {
    id: 'room-rental',
    note: 'Room rental is in scope; nothing disclosed.',
    listing: {
      title: 'Se alquila habitación en piso compartido',
      description: 'Habitación amplia en piso compartido, gastos incluidos.',
      municipality: 'Barcelona',
    },
    expect: { R1: 'missing', R5: 'missing' },
  },
  {
    id: 'index-in-features',
    note: 'Disclosure lives in the technical sheet, not the free text.',
    listing: {
      description: 'Piso reformado con vistas.',
      features: 'Superficie: 70 m²\nÍndice de referencia: 1.240 €/mes\nArrendador: no es gran tenedor',
      municipality: 'Barcelona',
    },
    expect: { R1: 'present', R5: 'present' },
    expectValue: { R1: m(1240), R5: false },
  },
  {
    id: 'municipality-with-neighborhood',
    note: 'Portal reports "barrio, ciudad"; the stressed zone must still resolve to Barcelona.',
    listing: {
      description:
        'Índice de referencia: 1.300 €/mes. Renta máxima aplicable 1.300 €/mes. El arrendador no es gran tenedor.',
      municipality: "La Nova Esquerra de l'Eixample, Barcelona",
    },
    expect: { R1: 'present', R2: 'present', R5: 'present' },
    expectValue: { R2: m(1300) },
  },
  {
    id: 'temporada-compliance-block',
    note: 'Real ShBarcelona temporada ad: índice as "Índice del Estado Español", última renta, energy G, "no es un gran tenedor" (with article), dot-decimal glued to €. R2 is genuinely absent (no max-rent figure stated).',
    listing: {
      title: 'ALQUILER DE TEMPORADA (USO EXCLUSIVO VACACIONES/OCIO)',
      description:
        'En cumplimiento de la normativa vigente, le facilitamos la siguiente información aplicable a los ' +
        'contratos de vivienda habitual. Índice del Estado Español:953.48€/mes. Situación últimos 5 años:alquilado. ' +
        'Precio de la última renta: 1750€/mes. Certificado energético G. El propietario no es un gran tenedor. ' +
        'Actualización de renta según IRAV. Cédula de habitabilidad: CHB1572709001.',
      municipality: "La Nova Esquerra de l'Eixample, Barcelona",
    },
    expect: { R1: 'present', R2: 'missing', R4: 'present', R5: 'present', C1: 'present' },
    expectValue: { R1: m(953.48), R4: m(1750), R5: false, C1: 'G' },
  },
  {
    id: 'sabadell-estudiantes-spaced-amounts',
    note: 'Real Sabadell temporal-estudiantes ad: amounts written "1.586, 38 euros" (space after the comma), R4 phrased "Renta contrato anterior", energy given only as a registration code (no letter).',
    listing: {
      description:
        'Piso en alquiler TEMPORAL solo para ESTUDIANTES, en zona céntrica de Sabadell. ' +
        'Propietario no gran tenedor. Vivienda en mercado en zona tensionada. ' +
        'Indice de referencia: 1.586, 38 euros. Renta contrato anterior: 1.409, 00 euros. ' +
        'CE: QCSXQK347. Número registro AICAT: 3533. Número API: 3428.',
      municipality: 'Sabadell',
    },
    expect: { R1: 'present', R2: 'missing', R4: 'present', R5: 'present', C1: 'missing' },
    expectValue: { R1: m(1586.38), R4: m(1409), R5: false },
  },
  {
    id: 'irav-mention',
    note: 'Index referred to by the IRAV acronym.',
    listing: {
      description: 'Actualización conforme al IRAV. Índice de referencia: 980 € al mes.',
      municipality: 'Vitoria-Gasteiz',
    },
    expect: { R1: 'present' },
    expectValue: { R1: m(980) },
  },
];
