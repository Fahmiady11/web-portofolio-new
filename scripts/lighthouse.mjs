// Lighthouse (mobile profile, simulated slow 4G + 4× CPU) against `vite preview` of dist/.
// Usage: npm run build && node scripts/lighthouse.mjs [out.json] [--no-webgl]
//   --no-webgl measures the page without the room (what crawlers and devices without WebGL get).
// Fetches lighthouse@12 through npx on first use. WebGL runs on SwiftShader, as in tests/interactions.mjs.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHROME, killAll, preview } from '../tests/cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const noWebGL = args.includes('--no-webgl');
const out = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, `test-results/lighthouse${noWebGL ? '-nowebgl' : ''}.json`));
const flags = noWebGL ? '--headless=new --disable-webgl --disable-3d-apis' : '--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader';

try {
  const base = await preview(root, 4318);
  const lh = spawn('npx', ['-y', 'lighthouse@12', base + '/', '--output=json', `--output-path=${out}`,
    `--chrome-flags=${flags}`], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, CHROME_PATH: CHROME } });
  const timer = setTimeout(() => lh.kill('SIGKILL'), 300_000);
  const code = await new Promise((ok) => lh.on('exit', ok));
  clearTimeout(timer);
  if (code !== 0) throw new Error(`lighthouse exited with ${code}`);
  const r = JSON.parse(readFileSync(out, 'utf8'));
  console.log(Object.values(r.categories).map((c) => `${c.title} ${Math.round(c.score * 100)}`).join(' · '));
  for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'])
    console.log(`${r.audits[k].title}: ${r.audits[k].displayValue}`);
  console.log(`report: ${out}`);
} finally {
  killAll();
}
