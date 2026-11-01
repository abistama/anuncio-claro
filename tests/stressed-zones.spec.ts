import { describe, expect, it } from 'vitest';
import { isStressedZone, lookupIneByName } from '../src/rules/stressed-zones';

describe('isStressedZone', () => {
  it('confirms a declared INE code', () => {
    expect(isStressedZone({ ineCode: '08019' })).toBe(true);
  });
  it('matches by municipality name, accents aside', () => {
    expect(isStressedZone({ municipality: 'Barcelona' })).toBe(true);
    expect(isStressedZone({ municipality: 'A Coruña' })).toBe(true);
  });
  it('resolves "barrio, ciudad" and "ciudad (provincia)" strings', () => {
    expect(isStressedZone({ municipality: "La Nova Esquerra de l'Eixample, Barcelona" })).toBe(true);
    expect(isStressedZone({ municipality: 'Barcelona (Barcelona)' })).toBe(true);
    expect(lookupIneByName("La Nova Esquerra de l'Eixample, Barcelona")).toBe('08019');
  });
  it('does not match a city name buried inside a longer word', () => {
    expect(isStressedZone({ municipality: 'Barceloneta del Río' })).toBeNull();
  });
  it('returns null (unknown) for a municipality not in the table', () => {
    expect(isStressedZone({ municipality: 'Teruel' })).toBeNull();
    expect(isStressedZone({ ineCode: '44216' })).toBeNull();
  });
});

describe('lookupIneByName', () => {
  it('resolves a known municipality to its INE code', () => {
    expect(lookupIneByName('Bilbao')).toBe('48020');
  });
});
