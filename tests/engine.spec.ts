import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules/engine';
import type { Check, RuleId } from '../src/types';
import { makeListing, money } from './fixtures';

const byId = (checks: Check[], id: RuleId): Check => checks.find((c) => c.ruleId === id) as Check;

describe('engine · R1 índice de referencia', () => {
  it('present with value when stated', () => {
    const r = evaluate(makeListing({ sources: { description: 'Índice de referencia: 1.080 €' } }));
    const c = byId(r.checks, 'R1');
    expect(c.status).toBe('present');
    expect(c.value).toMatchObject({ amount: 1080, period: 'month' });
    expect(c.evidence?.location).toBe('description');
  });
  it('missing when absent', () => {
    expect(byId(evaluate(makeListing()).checks, 'R1').status).toBe('missing');
  });
  it('present via Fotocasa "Índice alquiler" label with a value', () => {
    const c = byId(evaluate(makeListing({ sources: { features: 'Índice alquiler: 1.500 €/mes' } })).checks, 'R1');
    expect(c.status).toBe('present');
    expect(c.value).toMatchObject({ amount: 1500 });
  });
  it('missing when the index label says "No informado por el anunciante/no aplica"', () => {
    const c = byId(evaluate(makeListing({ sources: { features: 'Índice alquiler: No informado por el anunciante/no aplica' } })).checks, 'R1');
    expect(c.status).toBe('missing');
  });
});

describe('engine · R2 renta máxima', () => {
  it('required and missing in a stressed zone', () => {
    const c = byId(evaluate(makeListing()).checks, 'R2');
    expect(c.required).toBe(true);
    expect(c.status).toBe('missing');
  });
  it('not applicable outside a known stressed zone', () => {
    const r = evaluate(makeListing({ location: { municipality: 'Teruel', stressedZone: null } }));
    const c = byId(r.checks, 'R2');
    expect(c.required).toBe(false);
    expect(c.status).toBe('not_applicable');
  });
  it('present with value when stated in a stressed zone', () => {
    const r = evaluate(makeListing({ sources: { description: 'Renta máxima aplicable: 1.100 €/mes' } }));
    expect(byId(r.checks, 'R2').status).toBe('present');
  });
});

describe('engine · R5 gran tenedor', () => {
  it('present=false on explicit negation', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'El arrendador no es gran tenedor.' } })).checks, 'R5');
    expect(c.status).toBe('present');
    expect(c.value).toBe(false);
  });
  it('present=false on "no es un gran tenedor" (with the article)', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'El propietario no es un gran tenedor.' } })).checks, 'R5');
    expect(c.status).toBe('present');
    expect(c.value).toBe(false);
  });
  it('present=true on affirmation', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'El propietario es gran tenedor.' } })).checks, 'R5');
    expect(c.status).toBe('present');
    expect(c.value).toBe(true);
  });
  it('uncertain on weak "particular" signal', () => {
    expect(byId(evaluate(makeListing({ sources: { description: 'propietario particular' } })).checks, 'R5').status).toBe('uncertain');
  });
  it('missing when silent', () => {
    expect(byId(evaluate(makeListing()).checks, 'R5').status).toBe('missing');
  });
});

describe('engine · C1 certificado energético', () => {
  it('present with letter', () => {
    const c = byId(evaluate(makeListing({ sources: { features: 'Certificado energético: E' } })).checks, 'C1');
    expect(c.status).toBe('present');
    expect(c.value).toBe('E');
  });
  it('uncertain when en trámite', () => {
    const c = byId(evaluate(makeListing({ sources: { features: 'Eficiencia energética: en trámite' } })).checks, 'C1');
    expect(c.status).toBe('uncertain');
  });
  it('is never required (ámbar, not rojo)', () => {
    expect(byId(evaluate(makeListing()).checks, 'C1').required).toBe(false);
  });
  it('uses the portal-decoded rating (e.g. Idealista icon class) over text', () => {
    const c = byId(evaluate(makeListing({ energyRating: 'F' })).checks, 'C1');
    expect(c.status).toBe('present');
    expect(c.value).toBe('F');
    expect(c.evidence?.location).toBe('features');
  });
  it('decoded rating wins even when the text says en trámite', () => {
    const c = byId(evaluate(makeListing({ energyRating: 'A', sources: { features: 'eficiencia energética en trámite' } })).checks, 'C1');
    expect(c.status).toBe('present');
    expect(c.value).toBe('A');
  });
});

describe('engine · real-world phrasings', () => {
  // Ad that claims "vacacional" to dodge contención de rentas but still states the
  // reference price (art. 59 Ley 18/2007) as "sistema estatal de referencia de
  // precios ... es de 1392,86 €/mes" and "límite máximo aplicable". Both R1 and R2
  // must be detected despite the non-canonical wording.
  const text =
    'La estancia ofertada tiene una finalidad exclusivamente recreativa, vacacional o de ocio ' +
    'que deberá acreditarse previamente y, por tanto, no queda sujeta al régimen de contención de rentas. ' +
    'No obstante, dado que la vivienda se encuentra situada en una zona de mercado residencial tensionado ' +
    'y el artículo 59 de la Ley 18/2007 exige incluir esta información en la publicidad de viviendas situadas ' +
    'en dichas zonas, se hace constar, a efectos meramente informativos, que el límite máximo aplicable ' +
    'conforme al sistema estatal de referencia de precios de alquiler amueblado es de 1392,86 €/mes.';

  it('detects R1 with its stated value', () => {
    const c = byId(evaluate(makeListing({ sources: { description: text } })).checks, 'R1');
    expect(c.status).toBe('present');
    expect(c.value).toMatchObject({ amount: 1392.86, period: 'month' });
  });
  it('detects R2 (límite máximo aplicable) in a stressed zone', () => {
    const c = byId(evaluate(makeListing({ sources: { description: text } })).checks, 'R2');
    expect(c.status).toBe('present');
    expect(c.value).toMatchObject({ amount: 1392.86, period: 'month' });
  });
});

describe('engine · R4 renta del último contrato', () => {
  it('present with value when stated', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'Precio de la última renta: 1750€/mes.' } })).checks, 'R4');
    expect(c.status).toBe('present');
    expect(c.value).toMatchObject({ amount: 1750, period: 'month' });
  });
  it('not_applicable (not a fail) when absent and not aggravated', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'Índice de referencia 1.000 €.' } })).checks, 'R4');
    expect(c.status).toBe('not_applicable');
    expect(c.required).toBe(false);
  });
  it('required and missing when stressed zone + gran tenedor and no prior rent stated', () => {
    const c = byId(evaluate(makeListing({ sources: { description: 'El propietario es gran tenedor.' } })).checks, 'R4');
    expect(c.required).toBe(true);
    expect(c.status).toBe('missing');
  });
});

describe('engine · verdict', () => {
  it('fail when a required field is missing', () => {
    expect(evaluate(makeListing()).verdict.status).toBe('fail');
    expect(evaluate(makeListing()).verdict.missingRequired).toContain('R1');
  });
  it('warn when only optional/uncertain issues remain', () => {
    const r = evaluate(
      makeListing({
        location: { municipality: 'Teruel', stressedZone: null }, // R2 n/a
        sources: {
          description: 'Índice de referencia: 1.000 €. El arrendador no es gran tenedor.',
          // C1 missing -> warn
        },
      }),
    );
    expect(r.verdict.status).toBe('warn');
  });
  it('pass when everything required is present', () => {
    const r = evaluate(
      makeListing({
        location: { municipality: 'Teruel', stressedZone: null },
        sources: {
          description: 'Índice de referencia: 1.000 €. El arrendador no es gran tenedor. Certificado energético D.',
        },
      }),
    );
    expect(r.verdict.status).toBe('pass');
  });
  it('flags price above the stated limit', () => {
    const r = evaluate(
      makeListing({
        price: money(1400),
        sources: { description: 'Índice de referencia 1.000 €. Renta máxima aplicable: 1.100 €/mes. No es gran tenedor. Certificado energético C.' },
      }),
    );
    expect(r.verdict.priceAboveStatedLimit).toBe(true);
    expect(r.verdict.status).toBe('fail');
  });
});

describe('engine · output shape', () => {
  it('carries ruleset/schema versions and legal basis', () => {
    const r = evaluate(makeListing());
    expect(r.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(r.rulesetVersion).toBe('2026.10.6');
    expect(byId(r.checks, 'R1').legalBasis).toContain('art. 20');
  });
  it('passes the vacacional-claimed flag through (analyzed, not excluded)', () => {
    expect(evaluate(makeListing({ vacationalClaimed: true })).listing.vacationalClaimed).toBe(true);
    expect(evaluate(makeListing()).listing.vacationalClaimed).toBeUndefined();
  });
});
