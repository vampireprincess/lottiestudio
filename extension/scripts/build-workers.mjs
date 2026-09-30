import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
for (const [entry, output] of [
  ['src/background/worker.js', 'background.js'],
  ['src/content/page.js', 'content.js'],
]) {
  await build({
    entryPoints: [resolve(root, entry)],
    outfile: resolve(root, 'dist', output),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome120',
    minify: true,
    legalComments: 'none',
  });
}
await copyFile(resolve(root, 'manifest.json'), resolve(root, 'dist/manifest.json'));
await mkdir(resolve(root, 'dist/icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await copyFile(resolve(root, `public/icons/icon${size}.png`), resolve(root, `dist/icons/icon${size}.png`));
}
console.log('Chrome extension ready in extension/dist');
