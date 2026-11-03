// Generate the extension icons and the Chrome Web Store assets.
//
//   node scripts/store-assets.mjs
//
// public/icons/icon.svg is the source mark. From it we rasterize the manifest
// icons (rsvg-convert), then render scripts/store-pages.ts with headless Chrome
// into store/ (git-ignored). The README's screenshots are copied to docs/, which
// is tracked. Store images are flattened to 24-bit PNG (no alpha), as the Web
// Store requires. Needs Google Chrome, rsvg-convert and ImageMagick (`magick`).
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const store = resolve(root, 'store');
const icons = resolve(root, 'public/icons');

// Manifest icons. Chrome wants the 128px one at 96px with transparent padding.
for (const size of [16, 32, 48]) {
  execFileSync('rsvg-convert', ['-w', size, '-h', size, join(icons, 'icon.svg'), '-o', join(icons, `icon-${size}.png`)].map(String));
}
execFileSync('rsvg-convert', ['-w', '96', '-h', '96', join(icons, 'icon.svg'), '-o', join(icons, 'icon-128.png')]);
execFileSync('magick', [join(icons, 'icon-128.png'), '-background', 'none', '-gravity', 'center', '-extent', '128x128', join(icons, 'icon-128.png')]);

const work = await mkdtemp(join(tmpdir(), 'anuncio-claro-store-'));
try {
  const bundle = join(work, 'store-pages.mjs');
  await esbuild.build({
    entryPoints: [resolve(root, 'scripts/store-pages.ts')],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'warning',
    loader: { '.svg': 'text', '.css': 'text' },
  });
  const { pages } = await import(pathToFileURL(bundle).href);

  await mkdir(store, { recursive: true });
  for (const p of pages) {
    const html = join(work, `${p.name}.html`);
    const shot = join(work, `${p.name}.png`);
    await writeFile(html, p.html);
    execFileSync(CHROME, [
      '--headless=new',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${join(work, 'chrome')}`,
      `--window-size=${p.width},${p.height}`,
      ...(p.transparent ? ['--default-background-color=00000000'] : []),
      `--screenshot=${shot}`,
      pathToFileURL(html).href,
    ], { stdio: 'ignore' });
    const out = join(store, `${p.name}.png`);
    const flatten = p.transparent ? [] : ['-background', 'white', '-alpha', 'remove', '-alpha', 'off'];
    execFileSync('magick', [shot, '-crop', `${p.width}x${p.height}+0+0`, '+repage', ...flatten, p.transparent ? `PNG32:${out}` : `PNG24:${out}`]);
    console.log(`store/${p.name}.png`);
  }
  for (const name of ['screenshot-1-revisar.png', 'screenshot-2-completo.png', 'screenshot-3-pdf.png']) {
    await copyFile(join(store, name), resolve(root, 'docs', name));
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
