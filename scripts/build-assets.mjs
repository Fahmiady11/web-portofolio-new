// Builds the site's images and files from content/ (the single source of truth) into public/:
//   every image referenced by content/content.json → public/img/<path>-<width>.{avif,webp}
//   the CV PDF → public/files/<contact.cv.publicName> (the only file kept there)
// Widths per folder come from src/content/image-sizes.json; src/content/site.ts builds the same URLs.
// Outputs newer than their source are skipped, so this is cheap to run before every dev/build.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const content = JSON.parse(readFileSync(join(root, 'content/content.json'), 'utf8'));
const sizes = JSON.parse(readFileSync(join(root, 'src/content/image-sizes.json'), 'utf8'));

const images = [
  content.profile.photo.thumb,
  ...content.projects.map((p) => p.thumb),
  ...content.pendingProjects.items.map((p) => p.thumb),
  ...content.certificates.map((c) => c.thumb),
].filter(Boolean); // a certificate without a scan has no thumb

const mtime = (p) => { try { return statSync(p).mtimeMs; } catch { return 0; } };
const fresh = (out, src) => mtime(out) > mtime(src);

let made = 0;
const expected = new Set();
for (const rel of images) {
  const src = join(root, 'content', rel);
  const widths = sizes[rel.slice(0, rel.lastIndexOf('/'))];
  if (!widths) throw new Error(`No image sizes for ${rel} in src/content/image-sizes.json`);
  const base = join(root, 'public/img', rel.replace(/^assets\//, '').replace(/\.[a-z]+$/i, ''));
  mkdirSync(dirname(base), { recursive: true });
  for (const w of widths) {
    for (const [fmt, opts] of [['webp', { quality: 78 }], ['avif', { quality: 55 }]]) {
      const out = `${base}-${w}.${fmt}`;
      expected.add(out);
      if (fresh(out, src)) continue;
      await sharp(src).resize({ width: w, withoutEnlargement: true })[fmt](opts).toFile(out);
      made++;
    }
  }
}

// images of content that was removed (dropped projects, replaced photos) must not ship either
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
let pruned = 0;
for (const f of walk(join(root, 'public/img'))) if (!expected.has(f)) { rmSync(f); pruned++; }

const { copy: cv, publicName } = content.contact.cv;
const filesDir = join(root, 'public/files');
const cvOut = join(filesDir, publicName);
mkdirSync(filesDir, { recursive: true });
// anything else in public/files is an older CV that must not ship
for (const f of readdirSync(filesDir)) if (f !== publicName) rmSync(join(filesDir, f));
if (!fresh(cvOut, join(root, 'content', cv))) { copyFileSync(join(root, 'content', cv), cvOut); made++; }

console.log(`assets: ${made} file(s) written, ${pruned} stale removed, ${images.length} images + CV checked`);
