// Zip a built extension for store upload.
//
//   node scripts/package.mjs                  -> anuncio-claro-<version>-chrome.zip  (from dist/)
//   node scripts/package.mjs --target=firefox -> anuncio-claro-<version>-firefox.zip (from dist-firefox/)
//
// Zips the *contents* of the dist dir so manifest.json sits at the archive root
// (AMO rejects a zip of the containing folder), and uses `zip -X` with dotfiles
// excluded so no __MACOSX/ or ._* metadata ends up in the package.
import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetArg = process.argv.find((a) => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'chrome';
if (target !== 'chrome' && target !== 'firefox') {
  throw new Error(`unknown --target=${target} (expected chrome|firefox)`);
}
const dist = resolve(root, target === 'firefox' ? 'dist-firefox' : 'dist');

const { version } = JSON.parse(await readFile(resolve(dist, 'manifest.json'), 'utf8'));
const out = resolve(root, `anuncio-claro-${version}-${target}.zip`);

await rm(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '.*', '*/.*', '*.map'], {
  cwd: dist,
  stdio: 'inherit',
});
console.log(`packaged ${out.replace(root + '/', '')}`);
