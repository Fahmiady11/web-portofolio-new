// Renders the drawn case images (Lega's terminal screen, the Jira → WhatsApp diagram) into content/assets/projects/.
// Run when the HTML changes: node scripts/case-images/render.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { killAll, launch, shot, sleep } from '../../tests/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'case-images-'));
try {
  const c = await launch();
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const [page, out] of [['lega-terminal.html', 'lega.jpg'], ['jira-whatsapp.html', 'jira-whatsapp.jpg']]) {
    await c.send('Page.navigate', { url: pathToFileURL(join(here, page)).href });
    await sleep(1500);
    const png = join(tmp, out + '.png');
    await shot(c, png);
    const info = await sharp(png).resize(1280, 800).jpeg({ quality: 86, mozjpeg: true }).toFile(join(root, 'content/assets/projects', out));
    console.log(`${out}: ${(info.size / 1024).toFixed(0)} KB`);
  }
} finally {
  killAll();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(0);
