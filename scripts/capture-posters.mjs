// Captures stills of the built room for the loading poster and the Open Graph image:
//   public/poster-wide.webp (16:10), public/poster-tall.webp (phones), public/og.jpg (1200×630).
// Run after `npm run build` whenever the room's look changes, then rebuild so dist/ picks them up.
// Uses the same headless-Chrome driver as tests/interactions.mjs.
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { killAll, launch, load, preview, say, shot, sleep } from '../tests/cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'posters-'));
// the poster sits under the real header, so only the scene is captured for it
const SCENE_ONLY = '.top, #hotspots, .hint, .dock { display: none !important; }';
const OG = '#hotspots, .hint, .dock { display: none !important; }';

const shots = [
  { name: 'poster-wide', w: 1600, h: 1000, dpr: 1, css: SCENE_ONLY, write: (s) => s.webp({ quality: 70 }) },
  { name: 'poster-tall', w: 390, h: 844, dpr: 2, mobile: true, css: SCENE_ONLY, write: (s) => s.webp({ quality: 68 }) },
  { name: 'og', w: 1200, h: 630, dpr: 1, css: OG, write: (s) => s.jpeg({ quality: 82, mozjpeg: true }), ext: 'jpg' },
];

try {
  const base = await preview(root);
  for (const s of shots) {
    const c = await launch();
    await c.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: s.dpr, mobile: !!s.mobile });
    await load(c, base + '/', s.w, s.h, { mobile: !!s.mobile });
    await c.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: s.dpr, mobile: !!s.mobile });
    await c.evaluate(`document.head.insertAdjacentHTML('beforeend', '<style>${s.css}</style>')`);
    await sleep(2500); // photos on the case wall, settled lighting
    const png = join(tmp, s.name + '.png');
    await shot(c, png);
    c.close();
    const file = join(root, 'public', `${s.name}.${s.ext ?? 'webp'}`);
    const info = await s.write(sharp(png)).toFile(file);
    say(`${file}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
} finally {
  killAll();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(0);
