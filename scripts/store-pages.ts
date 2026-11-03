// HTML for the store assets (logo, screenshots, promo tiles). Bundled and run by
// scripts/store-assets.mjs, which screenshots each page with headless Chrome.
// The panel in the screenshots is the real ficha renderer fed by the real rules
// engine, so the images show what the extension actually displays.

import MARK from '../public/icons/icon.svg';
import PANEL_CSS from '../src/panel/panel.css';
import { FICHA_CSS, fichaBodyHtml } from '../src/panel/ficha';
import { buildEvidenceHtml } from '../src/export/evidence';
import { evaluate } from '../src/rules/engine';
import type { ExtractedListing, ListingCheck } from '../src/types';

export interface StorePage {
  name: string;
  width: number;
  height: number;
  /** Keep the alpha channel (logos); store images must be flat 24-bit PNG. */
  transparent?: boolean;
  html: string;
}

const HERRAMIENTAS_MARK =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="14" fill="#111827"/><rect x="20" y="30" width="60" height="15" rx="2" fill="#FFFFFF"/><rect x="20" y="55" width="60" height="15" rx="2" fill="#A78BFA"/></svg>';
const FONT = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

const CHECKED_AT = '2026-11-03T10:30:00.000Z';

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function listing(over: Partial<ExtractedListing> & { description: string }): Promise<ListingCheck> {
  const { description, ...rest } = over;
  const result = evaluate({
    portal: 'idealista',
    url: 'https://www.idealista.com/inmueble/104882913/',
    listingId: '104882913',
    rentalType: 'primary_residence',
    advertiserType: 'professional',
    price: { amount: 1450, currency: 'EUR', period: 'month' },
    areaM2: 68,
    location: { municipality: 'Barcelona', ineCode: '08019', stressedZone: true },
    sources: { title: '', description, features: '', structured_data: '' },
    ...rest,
  });
  const contentSha256 = await sha256(description);
  return { ...result, checkedAt: CHECKED_AT, source: { ...result.source, contentSha256 } };
}

const failing = await listing({
  description:
    'Piso exterior de 3 habitaciones en pleno corazón de Gràcia. Cocina equipada, balcón a la calle y mucha luz natural. A dos minutos del metro Fontana.',
});
const passing = await listing({
  url: 'https://www.idealista.com/inmueble/105219077/',
  listingId: '105219077',
  price: { amount: 1180, currency: 'EUR', period: 'month' },
  areaM2: 55,
  description:
    'Piso reformado de 2 habitaciones en Sant Antoni. Índice de referencia del precio: 1.190 €/mes. Renta máxima aplicable: 1.190 €/mes. Renta del contrato anterior: 1.120 €/mes. El arrendador no es gran tenedor. Certificado energético D.',
});

/** The side panel exactly as the extension renders it (ficha + footer). */
function panel(result: ListingCheck): string {
  return `
  <div class="panel">
    <main id="app">${fichaBodyHtml(result, 'es')}</main>
    <footer id="footer">
      <label class="lang"><span>Idioma</span><select><option>Automático</option></select></label>
      <a class="credit"><span>Creado por</span><svg class="credit-logo" viewBox="0 0 100 100">${HERRAMIENTAS_MARK.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><strong>herramient.as</strong></a>
    </footer>
  </div>`;
}

function page(body: string, css: string, extraHead = ''): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${extraHead}
<style>${PANEL_CSS}</style><style>${FICHA_CSS}</style>
<style>
  :root { color-scheme: light; }
  html, body { margin: 0; overflow: hidden; }
  body { font-family: ${FONT}; }
  ${css}
</style></head><body>${body}</body></html>`;
}

/** A neutral rental-listing page (no real portal branding) next to the panel. */
function listingScreenshot(result: ListingCheck, title: string, price: string, facts: string, text: string): string {
  return page(
    `
  <div class="browser">
    <div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">${result.source.url.replace('https://', '')}</span></div>
    <div class="body">
      <div class="site">
        <div class="photos"><div class="ph a"></div><div class="ph b"></div><div class="ph c"></div></div>
        <h1>${title}</h1>
        <div class="price">${price}</div>
        <div class="facts">${facts}</div>
        <h3>Descripción</h3>
        <p>${text}</p>
        <div class="ghost"><i></i><i></i><i class="s"></i></div>
      </div>
      <div class="side">${panel(result)}</div>
    </div>
  </div>`,
    `
  body { width: 1280px; height: 800px; background: #e5e7eb; }
  .browser { position: absolute; inset: 0; background: #fff; display: flex; flex-direction: column; }
  .bar { height: 44px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 16px; padding: 0 16px; }
  .dots i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; margin-right: 6px; }
  .url { flex: 1; max-width: 560px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 5px 12px; font-size: 13px; color: #4b5563; }
  .body { flex: 1; display: flex; min-height: 0; }
  .site { flex: 1; padding: 28px 36px; color: #1f2937; overflow: hidden; }
  .photos { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 300px; margin-bottom: 22px; }
  .ph { border-radius: 10px; }
  .ph.a { grid-row: span 2; background: linear-gradient(180deg, #e9dccb 0 58%, #b08a63 58% 100%); position: relative; }
  .ph.a::after { content: ''; position: absolute; left: 14%; top: 14%; width: 30%; height: 36%; background: linear-gradient(#cfe6f5, #eef7fc); border: 6px solid #f8f4ee; border-radius: 4px; }
  .ph.b { background: linear-gradient(180deg, #dfe5e2 0 62%, #9aa59f 62%); }
  .ph.c { background: linear-gradient(180deg, #efe7dc 0 55%, #c7b299 55%); }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -.01em; }
  .price { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
  .facts { color: #4b5563; font-size: 15px; margin-bottom: 18px; }
  h3 { font-size: 15px; margin: 0 0 6px; }
  .site p { margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #374151; max-width: 680px; }
  .ghost i { display: block; height: 10px; border-radius: 5px; background: #f0f1f3; margin: 9px 0; width: 92%; }
  .ghost i.s { width: 60%; }
  .side { width: 400px; border-left: 1px solid #e5e7eb; overflow: hidden; position: relative; }
  .panel { height: 100%; display: flex; flex-direction: column; }
  .panel #app { flex: 1; overflow: hidden; }
  .panel #footer { position: static; }
  .panel .disclaimer, .panel .advanced, .panel .toast { display: none; }`,
  );
}

const evidence = buildEvidenceHtml(failing, 'es').replace(/<script>.*?<\/script>/s, '');

/** "by herramient.as" lockup used on the tiles. */
const byLine = (size: number, color: string) =>
  `<div class="by" style="font-size:${size}px;color:${color}"><span>by</span><span class="hm">${HERRAMIENTAS_MARK}</span><strong>herramient.as</strong></div>`;

const TILE_CSS = `
  body { background: #111827; color: #f9fafb; position: relative; }
  body::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 85% 20%, rgba(167,139,250,.28), transparent 55%), radial-gradient(circle at 0% 100%, rgba(167,139,250,.12), transparent 50%); }
  .wrap { position: relative; height: 100%; }
  .brand { display: flex; align-items: center; }
  .brand svg { display: block; border-radius: 22%; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
  .name { font-weight: 800; letter-spacing: -.02em; }
  .tag { color: #d1d5db; line-height: 1.35; }
  .tag b { color: #c4b5fd; font-weight: 700; }
  .by { display: flex; align-items: center; gap: .4em; }
  .by .hm svg { width: 1.2em; height: 1.2em; display: block; box-shadow: 0 0 0 1px rgba(255,255,255,.18); border-radius: 3px; }
  .by strong { color: #fff; }`;

export const pages: StorePage[] = [
  {
    name: 'logo-128',
    width: 128,
    height: 128,
    transparent: true,
    html: page(
      `<div class="logo">${MARK}<div class="n">Anuncio Claro</div><div class="b">by <strong>herramient.as</strong></div></div>`,
      `body { width: 128px; height: 128px; background: transparent; }
       .logo { width: 128px; height: 128px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
       .logo svg { width: 70px; height: 70px; display: block; margin-bottom: 7px; }
       .n { font-weight: 800; font-size: 15.5px; letter-spacing: -.02em; color: #111827; line-height: 1.1; }
       .b { font-size: 10.5px; color: #6b7280; line-height: 1.3; }
       .b strong { color: #111827; }`,
    ),
  },
  {
    name: 'screenshot-1-revisar',
    width: 1280,
    height: 800,
    html: listingScreenshot(
      failing,
      'Piso en calle de Verdi, Vila de Gràcia, Barcelona',
      '1.450 €/mes',
      '68 m² · 3 habitaciones · 1 baño · Planta 2ª exterior',
      'Piso exterior de 3 habitaciones en pleno corazón de Gràcia. Cocina equipada, balcón a la calle y mucha luz natural. A dos minutos del metro Fontana.',
    ),
  },
  {
    name: 'screenshot-2-completo',
    width: 1280,
    height: 800,
    html: listingScreenshot(
      passing,
      'Piso en calle del Comte Borrell, Sant Antoni, Barcelona',
      '1.180 €/mes',
      '55 m² · 2 habitaciones · 1 baño · Reformado',
      'Piso reformado de 2 habitaciones en Sant Antoni. Índice de referencia del precio: 1.190 €/mes. Renta máxima aplicable: 1.190 €/mes. Renta del contrato anterior: 1.120 €/mes. El arrendador no es gran tenedor. Certificado energético D.',
    ),
  },
  {
    name: 'screenshot-3-pdf',
    width: 1280,
    height: 800,
    html: page(
      `<div class="caption"><div class="brand">${MARK}</div><div><div class="h">Guarda la ficha como PDF</div><div class="s">Con la URL, la fecha, la huella SHA-256 del texto analizado y un QR al anuncio.</div></div></div>
       <div class="sheet"><iframe srcdoc="${evidence.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe></div>`,
      `body { width: 1280px; height: 800px; background: #f3f4f6; font-family: ${FONT}; }
       .caption { position: absolute; left: 64px; top: 0; bottom: 0; width: 330px; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
       .caption .brand svg { width: 64px; height: 64px; display: block; }
       .caption .h { font-size: 34px; font-weight: 800; letter-spacing: -.02em; color: #111827; line-height: 1.15; margin-bottom: 12px; }
       .caption .s { font-size: 17px; color: #4b5563; line-height: 1.5; }
       .sheet { position: absolute; left: 450px; top: 48px; width: 760px; height: 800px; background: #fff; border-radius: 10px 10px 0 0; box-shadow: 0 20px 50px rgba(17,24,39,.14), 0 0 0 1px rgba(17,24,39,.06); overflow: hidden; }
       .sheet iframe { border: 0; width: 900px; height: 1000px; transform: scale(.845); transform-origin: 0 0; }`,
    ),
  },
  {
    name: 'promo-small-440x280',
    width: 440,
    height: 280,
    html: page(
      `<div class="wrap">
         <div class="brand">${MARK}<div class="name">Anuncio Claro</div></div>
         <div class="tag">¿Al anuncio de alquiler le faltan <b>los datos obligatorios</b>? Compruébalo en un clic.</div>
         ${byLine(14, '#9ca3af')}
       </div>`,
      `body { width: 440px; height: 280px; } ${TILE_CSS}
       .wrap { padding: 34px 36px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
       .brand { gap: 14px; } .brand svg { width: 56px; height: 56px; }
       .name { font-size: 30px; }
       .tag { font-size: 19px; }`,
    ),
  },
  {
    name: 'promo-marquee-1400x560',
    width: 1400,
    height: 560,
    html: page(
      `<div class="wrap">
         <div class="copy">
           <div class="brand">${MARK}<div class="name">Anuncio Claro</div></div>
           <div class="tag">Comprueba si un anuncio de alquiler incluye <b>los datos obligatorios por ley</b>: índice de referencia, renta máxima, gran tenedor y certificado energético.</div>
           ${byLine(18, '#9ca3af')}
         </div>
         <div class="shot">${panel(failing)}</div>
       </div>`,
      `body { width: 1400px; height: 560px; } ${TILE_CSS}
       .copy { position: absolute; left: 88px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
       .brand { gap: 20px; } .brand svg { width: 84px; height: 84px; }
       .name { font-size: 56px; }
       .tag { font-size: 25px; }
       .shot { position: absolute; right: 96px; top: 64px; width: 400px; height: 620px; background: #fff; color: #1b1b1f; border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.1); transform: rotate(-3deg); }
       .shot .panel #footer, .shot .disclaimer, .shot .advanced, .shot .toast, .shot .actions { display: none; }`,
    ),
  },
];
