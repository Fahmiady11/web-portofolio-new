// Compresses the raw Blender exports for the web and puts them where the site picks them up:
//   scripts/blender/out/<piece>.glb → src/assets/models/<piece>.glb
// meshopt-compressed geometry, WebP textures (at most --max px), welded and de-duplicated.
// The site's loader (src/scene/Model.tsx) decodes meshopt; baked materials keep their extras.
//
// Usage: node scripts/blender/optimize.mjs [--max 1024] [--in dir] [--out dir] [piece …]
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const max = Number(opt('--max', 1024));
const inDir = resolve(opt('--in', join(root, 'scripts/blender/out')));
const outDir = resolve(opt('--out', join(root, 'src/assets/models')));
const only = new Set(args);

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
mkdirSync(outDir, { recursive: true });

const files = readdirSync(inDir).filter((f) => f.endsWith('.glb') && (!only.size || only.has(f.slice(0, -4))));
if (!files.length) throw new Error(`no .glb files in ${inDir}${only.size ? ` matching ${[...only].join(', ')}` : ''}`);
for (const f of files) {
  const doc = await io.read(join(inDir, f));
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [max, max], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const out = join(outDir, f);
  await io.write(out, doc);
  const kb = (p) => (statSync(p).size / 1024).toFixed(0);
  console.log(`${f}: ${kb(join(inDir, f))} KB → ${kb(out)} KB  ${out}`);
}
