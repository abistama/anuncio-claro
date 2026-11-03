// Styled QR codes for the evidence PDF, drawn like the ones herramient.as/qr
// produces: rounded modules that merge into continuous strokes, rounded eyes,
// a soft card behind them and, optionally, the herramient.as mark in the centre. A TypeScript port of the defaults of Qr::Renderer in the
// herramientas repo (app/services/qr/renderer.rb), so both look the same.
//
// Coordinates are in modules (one module = one QR cell) and the viewBox scales
// them, so the margin keeps its proportion at any QR size.

import qrcode from 'qrcode-generator';

const COLOR = '#111827';
const BACKGROUND = '#ffffff';

/** Quiet zone, in modules. Two is plenty for any current phone reader. */
const MARGIN = 2;
/** Logo side as a fraction of the QR side ("medium" on herramient.as). */
const LOGO_RATIO = 0.22;

/** The herramient.as mark (public/favicon.svg), drawn in a 100x100 box. */
const BRAND_LOGO =
  '<rect width="100" height="100" rx="14" fill="#111827"/>' +
  '<rect x="20" y="30" width="60" height="15" rx="2" fill="#FFFFFF"/>' +
  '<rect x="20" y="55" width="60" height="15" rx="2" fill="#A78BFA"/>';

export interface QrOptions {
  /** Put the herramient.as mark in the centre (switches to level H). */
  logo?: boolean;
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function roundedRect(x: number, y: number, side: number, r: number): string {
  const straight = num(side - 2 * r);
  const rr = num(r);
  return (
    `M${num(x + r)} ${y}h${straight}a${rr} ${rr} 0 0 1 ${rr} ${rr}v${straight}` +
    `a${rr} ${rr} 0 0 1 -${rr} ${rr}h-${straight}a${rr} ${rr} 0 0 1 -${rr} -${rr}` +
    `v-${straight}a${rr} ${rr} 0 0 1 ${rr} -${rr}z`
  );
}

/** Scalable SVG of `text` as a styled QR code. */
export function styledQrSvg(text: string, opts: QrOptions = {}): string {
  const qr = qrcode(0, opts.logo ? 'H' : 'M'); // H recovers the ~8% the logo covers
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();

  // The logo hole is computed in whole cells with half a module of air, so the
  // plate never cuts a module in half.
  const logoSide = count * LOGO_RATIO;
  const logoFirst = Math.floor((count - logoSide) / 2 - 0.5);
  const logoLast = Math.ceil((count + logoSide) / 2 + 0.5) - 1;

  const far = count - 7;
  const isEye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= far) || (r >= far && c < 7);
  const isLogo = (r: number, c: number) =>
    !!opts.logo && r >= logoFirst && r <= logoLast && c >= logoFirst && c <= logoLast;
  const filled = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < count && c < count && !isEye(r, c) && !isLogo(r, c) && qr.isDark(r, c);

  // Each corner is rounded only when both cells touching it are empty, so
  // neighbouring modules merge into strokes and a lone one becomes a circle.
  let modules = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!filled(r, c)) continue;
      const x = c + MARGIN;
      const y = r + MARGIN;
      const up = filled(r - 1, c);
      const down = filled(r + 1, c);
      const left = filled(r, c - 1);
      const right = filled(r, c + 1);
      const tl = !up && !left ? 0.5 : 0;
      const tr = !up && !right ? 0.5 : 0;
      const br = !down && !right ? 0.5 : 0;
      const bl = !down && !left ? 0.5 : 0;
      modules += `M${num(x + tl)} ${y}h${num(1 - tl - tr)}`;
      if (tr) modules += 'a.5 .5 0 0 1 .5 .5';
      modules += `v${num(1 - tr - br)}`;
      if (br) modules += 'a.5 .5 0 0 1 -.5 .5';
      modules += `h-${num(1 - br - bl)}`;
      if (bl) modules += 'a.5 .5 0 0 1 -.5 -.5';
      modules += `v-${num(1 - bl - tl)}`;
      if (tl) modules += 'a.5 .5 0 0 1 .5 -.5';
      modules += 'z';
    }
  }

  const eyes = (
    [
      [0, 0],
      [far, 0],
      [0, far],
    ] as const
  )
    .map(([c, r]) => {
      const x = c + MARGIN;
      const y = r + MARGIN;
      return roundedRect(x, y, 7, 2) + roundedRect(x + 1, y + 1, 5, 1) + roundedRect(x + 2, y + 2, 3, 1);
    })
    .join('');

  const width = count + 2 * MARGIN;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}">`,
    `<rect width="${width}" height="${width}" rx="${num(width * 0.04)}" fill="${BACKGROUND}"/>`,
    `<path fill="${COLOR}" d="${modules}"/>`,
    `<path fill="${COLOR}" fill-rule="evenodd" d="${eyes}"/>`,
  ];
  if (opts.logo) {
    const plate = logoLast - logoFirst + 1;
    const offset = MARGIN + (count - logoSide) / 2;
    parts.push(
      `<rect x="${logoFirst + MARGIN}" y="${logoFirst + MARGIN}" width="${plate}" height="${plate}" rx="${num(plate * 0.18)}" fill="${BACKGROUND}"/>`,
      `<g transform="translate(${num(offset)} ${num(offset)}) scale(${num(logoSide / 100)})">${BRAND_LOGO}</g>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}
