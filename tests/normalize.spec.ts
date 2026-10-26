import { describe, expect, it } from 'vitest';
import { findMoney, parseEsNumber } from '../src/rules/normalize';

describe('parseEsNumber', () => {
  it('reads thousands separated by dots', () => {
    expect(parseEsNumber('1.200')).toBe(1200);
    expect(parseEsNumber('1.200.000')).toBe(1200000);
  });
  it('reads comma as decimal', () => {
    expect(parseEsNumber('1.200,50')).toBe(1200.5);
    expect(parseEsNumber('15,5')).toBe(15.5);
  });
  it('reads plain integers', () => {
    expect(parseEsNumber('1200')).toBe(1200);
    expect(parseEsNumber('15')).toBe(15);
  });
  it('returns null for non-numbers', () => {
    expect(parseEsNumber('abc')).toBeNull();
    expect(parseEsNumber('')).toBeNull();
  });
});

describe('findMoney', () => {
  it('finds "1.200 €" as monthly', () => {
    expect(findMoney('Precio: 1.200 €/mes')).toMatchObject({ amount: 1200, period: 'month' });
  });
  it('finds "1200 euros" written out', () => {
    expect(findMoney('renta 1200 euros al mes')).toMatchObject({ amount: 1200, period: 'month' });
  });
  it('detects €/m² period', () => {
    expect(findMoney('índice 15 €/m²')).toMatchObject({ amount: 15, period: 'month_per_m2' });
  });
  it('handles currency before amount', () => {
    expect(findMoney('€ 1.080')).toMatchObject({ amount: 1080, period: 'month' });
  });
  it('reads a dot decimal glued to the symbol: "953.48€/mes"', () => {
    expect(findMoney('Índice del Estado Español:953.48€/mes')).toMatchObject({ amount: 953.48, period: 'month' });
  });
  it('does not split a dot decimal into the fractional part', () => {
    // Regression: "953.48€" must not be read as 48 €.
    expect(findMoney('953.48€')?.amount).toBe(953.48);
  });
  it('tolerates a space after the decimal comma: "1.586, 38 euros"', () => {
    expect(findMoney('Indice de referencia: 1.586, 38 euros')).toMatchObject({ amount: 1586.38, period: 'month' });
  });
  it('reads "1.409, 00 euros" as 1409, not 0', () => {
    expect(findMoney('Renta contrato anterior: 1.409, 00 euros')?.amount).toBe(1409);
  });
  it('returns null when there is no amount', () => {
    expect(findMoney('sin precio indicado')).toBeNull();
  });
});
