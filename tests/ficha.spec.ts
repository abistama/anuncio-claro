import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules/engine';
import { fichaBodyHtml, FICHA_CSS } from '../src/panel/ficha';
import { makeListing } from './fixtures';

// The ficha renderer is shared by the side panel and the in-page overlay, so a
// regression here breaks both surfaces at once.
describe('fichaBodyHtml', () => {
  const result = evaluate(makeListing({ sources: { description: 'Índice de referencia: 1.080 €' } }));

  it('renders the verdict, basics and the action controls', () => {
    const html = fichaBodyHtml(result, 'es');
    expect(html).toContain(`class="verdict ${result.verdict.status}"`);
    expect(html).toContain('idealista');
    expect(html).toContain('id="copy-text"');
    expect(html).toContain('id="export-pdf"');
    expect(html).toContain('id="report-error"');
    expect(html).toContain('id="toast"');
  });

  it('emits one check row per evaluated check', () => {
    const html = fichaBodyHtml(result, 'es');
    const rows = html.match(/class="check /g) ?? [];
    expect(rows.length).toBe(result.checks.length);
  });

  it('translates with the locale', () => {
    expect(fichaBodyHtml(result, 'es')).not.toBe(fichaBodyHtml(result, 'en'));
  });

  it('ships component styles with tokens scoped to :host for shadow roots', () => {
    expect(FICHA_CSS).toContain(':host');
    expect(FICHA_CSS).toContain('--pass');
    expect(FICHA_CSS).toContain('.verdict');
  });
});
