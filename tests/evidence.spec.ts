import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules/engine';
import { buildEvidenceHtml } from '../src/export/evidence';
import { makeListing } from './fixtures';

describe('buildEvidenceHtml', () => {
  const result = evaluate(makeListing({ sources: { description: 'Índice de referencia: 1.080 €' } }));
  result.source.contentSha256 = 'a'.repeat(64);

  it('is a self-contained HTML document', () => {
    const html = buildEvidenceHtml(result, 'es');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('window.print()');
  });
  it('embeds an offline QR (inline SVG) to the listing URL', () => {
    const html = buildEvidenceHtml(result, 'es');
    expect(html).toContain('<svg');
    expect(html).toContain('class="qr"');
  });
  it('carries URL, id and the content hash', () => {
    const html = buildEvidenceHtml(result, 'es');
    expect(html).toContain(result.source.url);
    expect(html).toContain(result.source.listingId);
    expect(html).toContain('a'.repeat(64));
  });
  it('localizes the verdict, field and meta labels', () => {
    const en = buildEvidenceHtml(result, 'en');
    expect(en).toMatch(/COMPLIANT|REVIEW|NON-COMPLIANT/);
    expect(en).toContain('Reference price index');
    expect(en).toContain('Checked at');
    expect(en).toContain('Ruleset version');
    // Spanish labels in the es document
    expect(buildEvidenceHtml(result, 'es')).toContain('Fecha de análisis');
  });
});
