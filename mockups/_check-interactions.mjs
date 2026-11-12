// Drives a 3D room mockup in headless Chrome and checks the main interactions:
// clicking each object (camera moves + panel opens), Escape, marker buttons,
// the full-dossier quick view, the phone dock, and the no-WebGL fallback.
//
// Usage: node mockups/_check-interactions.mjs mockups/a-detective-room.html [outDir]
// Needs Google Chrome; no npm packages (uses Node 22's built-in WebSocket).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const page = resolve(process.argv[2] ?? 'mockups/a-detective-room.html');
const out = resolve(process.argv[3] ?? join(tmpdir(), 'room-check'));
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

async function launch(extra = []) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'chr-'))}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--window-size=1280,800', ...extra, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); } }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  return { proc, send, evaluate, errors, close: () => { ws.close(); proc.kill(); } };
}
async function click(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function key(c, k) {
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : 0 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : 0 });
}
async function shot(c, name) {
  const { result } = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, name + '.png'), Buffer.from(result.data, 'base64'));
}
async function load(c, w, h, mobile = false) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await c.send('Page.navigate', { url: 'file://' + page });
  for (let i = 0; i < 60; i++) { if (await c.evaluate('!!window.__room')) break; await sleep(250); }
  await sleep(1200);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const settle = async (c) => { for (let i = 0; i < 30; i++) { if (!(await c.evaluate('window.__room.busy()'))) break; await sleep(100); } await sleep(300); };

// ---------- desktop ----------
{
  const c = await launch();
  await load(c, 1280, 800);
  check('WebGL scene running', await c.evaluate('window.__room && window.__room.webgl === true'));
  await shot(c, 'desktop-home');
  const home = await c.evaluate('window.__room.cam()');
  const ids = await c.evaluate('[...document.querySelectorAll("#hotspots .hs")].map(b => b.dataset.sec)');
  check('evidence markers rendered', ids.length >= 8, ids.join(', '));

  // hover → pointer cursor
  const pc = await c.evaluate('window.__room.screen("board")');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pc.x, y: pc.y });
  await sleep(200);
  check('hovering an object shows a pointer', (await c.evaluate('document.querySelector("#stage canvas").style.cursor')) === 'pointer');

  for (const id of ids) {
    const p = await c.evaluate(`window.__room.screen(${JSON.stringify(id)})`);
    const onCanvas = await c.evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.tagName`);
    await click(c, p.x, p.y);
    await settle(c);
    const cur = await c.evaluate('window.__room.current()');
    const open = await c.evaluate('document.getElementById("panel").classList.contains("open")');
    const moved = dist(home, await c.evaluate('window.__room.cam()'));
    check(`click 3D object "${id}" → camera moves + panel opens`, cur === id && open && moved > 0.5, `hit=${onCanvas} current=${cur} panel=${open} camera moved ${moved.toFixed(2)}`);
    if (id === 'cases' || id === 'board') await shot(c, `desktop-${id}`);
    await key(c, 'Escape');
    await settle(c);
  }
  const back = dist(home, await c.evaluate('window.__room.cam()'));
  check('Escape closes the panel and the camera returns home', !(await c.evaluate('document.getElementById("panel").classList.contains("open")')) && back < 0.3, `distance from home ${back.toFixed(2)}`);

  const hb = await c.evaluate('(() => { const r = document.querySelector(\'#hotspots .hs[data-sec="wall"]\').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()');
  await click(c, hb.x, hb.y); await settle(c);
  check('evidence-marker button opens its section', (await c.evaluate('window.__room.current()')) === 'wall');
  await click(c, 1240, 40); // close (×) sits top-right of the panel
  await settle(c);
  check('close button (×) closes the panel', !(await c.evaluate('document.getElementById("panel").classList.contains("open")')));

  const qb = await c.evaluate('(() => { const r = document.getElementById("quickBtn").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()');
  await click(c, qb.x, qb.y); await sleep(400);
  const q = await c.evaluate('({ open: document.getElementById("quick").classList.contains("open"), projects: document.querySelectorAll("#quickBody .case").length, jobs: document.querySelectorAll("#quickBody .tl .ev").length })');
  check('quick view (full dossier) opens with all content', q.open && q.projects >= 5 && q.jobs === 4, JSON.stringify(q));
  await shot(c, 'desktop-quick');
  await key(c, 'Escape'); await sleep(300);
  check('Escape closes the quick view', !(await c.evaluate('document.getElementById("quick").classList.contains("open")')));
  check('no JS errors (desktop)', c.errors.length === 0, c.errors.join(' | '));
  c.close();
}

// ---------- phone ----------
{
  const c = await launch();
  await load(c, 390, 844, true);
  await shot(c, 'phone-home');
  const db = await c.evaluate('(() => { const r = document.querySelector(\'#dock [data-sec="phone"]\').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.width > 0 }; })()');
  check('phone dock is visible', db.visible);
  await click(c, db.x, db.y); await settle(c);
  const r = await c.evaluate('(() => { const p = document.getElementById("panel").getBoundingClientRect(); return { current: window.__room.current(), top: Math.round(p.top), h: innerHeight }; })()');
  check('dock opens a bottom sheet', r.current === 'phone' && r.top > r.h * 0.2, JSON.stringify(r));
  await shot(c, 'phone-contact');
  check('no JS errors (phone)', c.errors.length === 0, c.errors.join(' | '));
  c.close();
}

// ---------- no WebGL ----------
{
  const c = await launch(['--disable-3d-apis', '--disable-webgl', '--disable-gpu']);
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'file://' + page });
  await sleep(3000);
  const f = await c.evaluate('({ webgl: window.__room?.webgl, quick: document.getElementById("quick").classList.contains("open"), fallback: getComputedStyle(document.getElementById("fallback")).display })');
  check('without WebGL the full dossier opens automatically', f.webgl === false && f.quick && f.fallback !== 'none', JSON.stringify(f));
  await shot(c, 'nowebgl');
  c.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed · screenshots in ${out}`);
process.exit(failed ? 1 : 0);
