import { describe, expect, it } from 'vitest';
import { resolveLocale, t, SUPPORTED_LOCALES } from '../src/i18n/messages';
import { evaluate } from '../src/rules/engine';
import { toPlainText } from '../src/export/text';
import { makeListing } from './fixtures';

describe('resolveLocale', () => {
  it('maps browser preferences to a supported locale', () => {
    expect(resolveLocale(['es-ES', 'es'])).toBe('es');
    expect(resolveLocale(['en-US'])).toBe('en');
    expect(resolveLocale(['ca-ES', 'es'])).toBe('ca');
    expect(resolveLocale(['eu-ES'])).toBe('eu');
    expect(resolveLocale(['gl-ES'])).toBe('gl');
  });
  it('skips unsupported languages and falls through to the next', () => {
    expect(resolveLocale(['de', 'es'])).toBe('es');
    expect(resolveLocale(['fr', 'en'])).toBe('en');
  });
  it('defaults to Spanish when nothing matches or prefs are empty', () => {
    expect(resolveLocale([])).toBe('es');
    expect(resolveLocale(undefined)).toBe('es');
    expect(resolveLocale(['de', 'fr'])).toBe('es');
  });
});

describe('t', () => {
  it('interpolates params', () => {
    expect(t('es', 'pill.missing.many', { n: 2 })).toBe('Faltan 2 datos obligatorios');
    expect(t('en', 'pill.missing.many', { n: 3 })).toBe('3 required fields missing');
  });
  it('falls back to Spanish, then to the key itself', () => {
    expect(t('en', 'does.not.exist')).toBe('does.not.exist');
  });
  it('has every status/field key in all locales', () => {
    const keys = [
      'status.present', 'status.missing', 'status.uncertain', 'status.not_applicable',
      'field.rent_reference_index', 'field.max_rent', 'field.previous_rent', 'field.large_landlord', 'field.energy_certificate',
      'verdict.pass.head', 'verdict.warn.head', 'verdict.fail.head',
    ];
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of keys) expect(t(locale, key), `${locale} · ${key}`).not.toBe(key);
    }
  });
});

describe('toPlainText · localized', () => {
  const result = evaluate(makeListing({ sources: { description: 'Índice de referencia: 1.080 €' } }));
  it('renders English labels when asked', () => {
    const txt = toPlainText(result, { locale: 'en' });
    expect(txt).toContain('[Missing]');
    expect(txt).toContain('Reference price index');
    expect(txt).toMatch(/COMPLIANT|REVIEW|NON-COMPLIANT/);
  });
  it('renders Catalan labels when asked', () => {
    expect(toPlainText(result, { locale: 'ca' })).toContain('[Absent]');
  });
});
