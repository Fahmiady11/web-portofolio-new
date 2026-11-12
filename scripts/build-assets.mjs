// Builds the site's images and files from content/ (the single source of truth) into public/:
//   every image referenced by content/content.json → public/img/<path>-<width>.{avif,webp}
//   the CV PDF → public/files/
// Widths per folder come from src/content/image-sizes.json; src/content/site.ts builds the same URLs.
// Outputs newer than their source are skipped, so this is cheap to run before every dev/build.
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
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
];

const mtime = (p) => { try { return statSync(p).mtimeMs; } catch { return 0; } };
const fresh = (out, src) => mtime(out) > mtime(src);

let made = 0;
for (const rel of images) {
  const src = join(root, 'content', rel);
  const widths = sizes[rel.slice(0, rel.lastIndexOf('/'))];
  if (!widths) throw new Error(`No image sizes for ${rel} in src/content/image-sizes.json`);
  const base = join(root, 'public/img', rel.replace(/^assets\//, '').replace(/\.[a-z]+$/i, ''));
  mkdirSync(dirname(base), { recursive: true });
  for (const w of widths) {
    for (const [fmt, opts] of [['webp', { quality: 78 }], ['avif', { quality: 55 }]]) {
      const out = `${base}-${w}.${fmt}`;
      if (fresh(out, src)) continue;
      await sharp(src).resize({ width: w, withoutEnlargement: true })[fmt](opts).toFile(out);
      made++;
    }
  }
}

const cv = content.contact.cv.copy;
const cvOut = join(root, 'public/files', cv.replace(/^assets\//, ''));
mkdirSync(dirname(cvOut), { recursive: true });
if (!fresh(cvOut, join(root, 'content', cv))) { copyFileSync(join(root, 'content', cv), cvOut); made++; }

console.log(`assets: ${made} file(s) written, ${images.length} images + CV checked`);
