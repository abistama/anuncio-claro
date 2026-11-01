// Versioned ruleset data. The engine (engine.ts) is pure logic; the *content*
// of the rules — keywords, legal citations, version — lives here so it can be
// shipped/updated as a versioned config without changing engine code.
//
// IMPORTANT: a jurista must validate the exact wording of each rule against the
// consolidated BOE text before launch (PRD, "Requisitos normativos").

import type { Field, RuleId } from '../types';

export const SCHEMA_VERSION = '1.1.0';
export const RULESET_VERSION = '2026.10.6';

export const LEGAL_BASIS: Partial<Record<RuleId, string>> = {
  R1: 'RDL 29/2026, art. 20',
  R2: 'RDL 29/2026, art. 20',
  R4: 'RDL 29/2026, art. 20',
  R5: 'RDL 29/2026, art. 20',
  C1: 'RD 390/2021',
};

export const FIELD_OF: Record<RuleId, Field> = {
  R1: 'rent_reference_index',
  R2: 'max_rent',
  R3: 'rent_limit_basis',
  R4: 'previous_rent',
  R5: 'large_landlord',
  R6: 'unit_registration_code',
  C1: 'energy_certificate',
};

/**
 * Keyword sets. Accents are matched loosely by the engine (it compares against
 * an accent-stripped copy of the text), so entries here can be written either way.
 * Expressions cover castellano plus common catalan/euskera/gallego variants.
 */
export const KEYWORDS = {
  // R1 — índice de referencia del precio del alquiler
  rentReferenceIndex: [
    'indice de referencia',
    'índice de referencia',
    'precio de referencia',
    'referencia de precios', // "sistema estatal de referencia de precios de alquiler"
    'sistema estatal de referencia',
    'sistema estatal de indices',
    'sistema estatal de índices',
    'sistema de indices de referencia',
    'indice del estado espanol', // "Índice del Estado Español: 953.48 €/mes"
    'índice del estado español',
    'indice del estado',
    'índice del estado',
    'indice alquiler', // Fotocasa labels the field "Índice alquiler"
    'índice alquiler',
    'indice de alquiler',
    'índice de alquiler',
    'irav',
    'index de referencia', // catalá
    'index de referencia de preus', // catalá
    'prezo de referencia', // galego
  ],
  // R2 — renta máxima aplicable (zona tensionada)
  maxRent: [
    'renta maxima',
    'renta máxima',
    'limite de renta',
    'límite de renta',
    'limite maximo aplicable', // "el límite máximo aplicable ... es de X €/mes"
    'límite máximo aplicable',
    'limite maximo',
    'límite máximo',
    'precio maximo',
    'precio máximo',
    'renda maxima', // catalá / galego
    'renda màxima',
  ],
  // R5 — gran tenedor (affirmative / negative / weak signals)
  largeLandlordAffirmative: ['es gran tenedor', 'es un gran tenedor', 'gran tenedor', 'gran tenidor', 'grande tenedor'],
  largeLandlordNegative: [
    'no es gran tenedor',
    'no es un gran tenedor', // "El propietario no es un gran tenedor"
    'no es una gran tenedora',
    'no gran tenedor',
    'no soy gran tenedor',
    'no es gran tenidor',
    'no es un gran tenidor',
    'arrendador no es gran tenedor',
  ],
  largeLandlordWeak: [
    'propietario particular',
    'particular',
    'persona fisica',
    'persona física',
    'propietari particular',
  ],
  // R4 — renta del último contrato vigente en los 5 años anteriores
  previousRent: [
    'precio de la ultima renta', // "Precio de la última renta: 1750 €/mes"
    'precio de la última renta',
    'importe de la ultima renta',
    'ultima renta',
    'última renta',
    'renta anterior',
    'renta contrato anterior', // "Renta contrato anterior: 1.409,00 euros"
    'renta del contrato anterior',
    'contrato anterior',
    'renta del ultimo contrato',
    'renta del último contrato',
    'ultimo contrato de arrendamiento',
    'situacion ultimos 5 anos', // "Situación últimos 5 años: alquilado"
    'situación últimos 5 años',
    'ultimos 5 anos',
  ],
  // C1 — certificado de eficiencia energética
  energy: [
    'certificado energetico',
    'certificado energético',
    'eficiencia energetica',
    'eficiencia energética',
    'certificat energetic',
    'certificado enerxetico',
    'kwh/m',
    'consumo energetico',
    'consumo energético',
  ],
  energyPending: ['en tramite', 'en trámite', 'en tramitacion', 'en tramitación', 'exento', 'exenta'],
  // "Field is present as a label but the advertiser left it blank." Near a R1/R2/R4
  // keyword with no amount, these mean the datum was NOT provided (-> missing),
  // e.g. Fotocasa's "Índice alquiler: No informado por el anunciante/no aplica".
  notProvided: [
    'no informado',
    'no informada',
    'no aplica',
    'no disponible',
    'sin informar',
    'sin datos',
    'no facilitado',
    'no consta',
    'no especificado',
    'no proporcionado',
    'no indicado',
  ],
  // rental-type / vacacional detection (F1)
  vacational: ['alquiler vacacional', 'uso turistico', 'uso turístico', 'turistico', 'temporada vacacional'],
  room: ['alquiler de habitacion', 'habitacion en', 'habitación en', 'se alquila habitacion'],
  temporary: ['alquiler temporal', 'alquiler de temporada', 'por temporada', 'estancia temporal'],
} as const;
