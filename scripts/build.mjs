// Build the unpacked extension into dist/ with esbuild.
// Three bundles (content IIFE, service worker ESM, panel ESM) + static assets.
import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

const entries = [
  { in: 'src/content/content.ts', out: 'content', format: 'iife' },
  { in: 'src/background/service-worker.ts', out: 'service-worker', format: 'esm' },
  { in: 'src/panel/panel.ts', out: 'panel', format: 'esm' },
];

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  target: 'chrome120',
  logLevel: 'info',
  sourcemap: true,
  legalComments: 'none',
};

async function copyStatic() {
  await cp(resolve(root, 'public/manifest.json'), resolve(dist, 'manifest.json'));
  await cp(resolve(root, 'src/panel/panel.html'), resolve(dist, 'panel.html'));
  await cp(resolve(root, 'src/panel/panel.css'), resolve(dist, 'panel.css'));
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
    console.log('watching… (static assets copied once; re-run for manifest/html/css changes)');
  } else {
    await Promise.all(contexts.map((c) => c.rebuild()));
    await Promise.all(contexts.map((c) => c.dispose()));
    await copyStatic();
    console.log('built dist/');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
