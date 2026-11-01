// Build the unpacked extension with esbuild.
// Three bundles (content IIFE, service worker ESM, panel ESM) + static assets.
//
// Targets:
//   --target=chrome   (default) -> dist/         MV3 + sidePanel + service_worker
//   --target=firefox            -> dist-firefox/ MV3 + sidebar_action + background scripts
// The Chrome manifest in public/manifest.json is canonical (release-please bumps
// its version); the Firefox manifest is derived from it at build time.
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const targetArg = process.argv.find((a) => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'chrome';
if (target !== 'chrome' && target !== 'firefox') {
  throw new Error(`unknown --target=${target} (expected chrome|firefox)`);
}
const dist = resolve(root, target === 'firefox' ? 'dist-firefox' : 'dist');

const entries = [
  { in: 'src/content/content.ts', out: 'content', format: 'iife' },
  { in: 'src/background/service-worker.ts', out: 'service-worker', format: 'esm' },
  { in: 'src/panel/panel.ts', out: 'panel', format: 'esm' },
];

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  target: target === 'firefox' ? 'firefox121' : 'chrome120',
  logLevel: 'info',
  sourcemap: true,
  legalComments: 'none',
};

/** Derive the Firefox manifest from the canonical Chrome one. */
function toFirefoxManifest(base) {
  const m = structuredClone(base);
  // Firefox has no sidePanel permission/key; it uses the native sidebar.
  m.permissions = (m.permissions ?? []).filter((p) => p !== 'sidePanel');
  delete m.side_panel;
  m.sidebar_action = { default_panel: 'panel.html', default_title: m.name };
  // Gecko MV3 loads the background as a (module) event page, not a service worker.
  m.background = { scripts: ['service-worker.js'], type: 'module' };
  m.browser_specific_settings = {
    gecko: { id: 'anuncio-claro@herramient.as', strict_min_version: '121.0' },
  };
  return m;
}

async function copyStatic() {
  const base = JSON.parse(await readFile(resolve(root, 'public/manifest.json'), 'utf8'));
  const manifest = target === 'firefox' ? toFirefoxManifest(base) : base;
  await writeFile(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await cp(resolve(root, 'src/panel/panel.html'), resolve(dist, 'panel.html'));
  await cp(resolve(root, 'src/panel/panel.css'), resolve(dist, 'panel.css'));
  await cp(resolve(root, 'public/icons'), resolve(dist, 'icons'), { recursive: true });
  await cp(resolve(root, 'schema'), resolve(dist, 'schema'), { recursive: true });
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const contexts = await Promise.all(
    entries.map((e) =>
      esbuild.context({
        ...common,
        entryPoints: [resolve(root, e.in)],
        outfile: resolve(dist, `${e.out}.js`),
        format: /** @type {'iife'|'esm'} */ (e.format),
      }),
    ),
  );

  if (watch) {
    await copyStatic();
    await Promise.all(contexts.map((c) => c.watch()));
    console.log(`watching ${target}… (static assets copied once; re-run for manifest/html/css changes)`);
  } else {
    await Promise.all(contexts.map((c) => c.rebuild()));
    await Promise.all(contexts.map((c) => c.dispose()));
    await copyStatic();
    console.log(`built ${dist.replace(root + '/', '')}/ (${target})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
