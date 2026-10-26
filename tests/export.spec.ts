import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules/engine';
import { toPlainText } from '../src/export/text';
import { makeListing } from './fixtures';

describe('toPlainText', () => {
  const result = evaluate(makeListing({ sources: { description: 'Índice de referencia: 1.080 €' } }));

  it('has no emoji by default', () => {
    const txt = toPlainText(result);
    expect(txt).toContain('[Ausente]');
    expect(txt).not.toMatch(/[✅❌]/);
  });
  it('uses emoji when asked', () => {
    expect(toPlainText(result, { emoji: true })).toMatch(/[✅❌]/);
  });
  it('includes portal, url and a verdict headline', () => {
    const txt = toPlainText(result);
    expect(txt).toContain('idealista');
    expect(txt).toContain(result.source.url);
    expect(txt).toMatch(/CUMPLE|REVISAR|NO CUMPLE/);
  });
});
