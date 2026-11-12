// Drives a 3D room mockup in headless Chrome and checks the main interactions:
// clicking each object (camera moves + panel opens), Escape, marker buttons,
// the full-dossier quick view, the phone dock, and the no-WebGL fallback.
//
// Usage: node mockups/_check-interactions.mjs mockups/a-detective-room.html [outDir]
//
// Needs Google Chrome (override with CHROME=/path) and Node 22; no npm packages.
// Talks to Chrome over --remote-debugging-pipe (fds 3/4), so it needs no port and
// no localhost networking. Every step has a timeout, the whole run has one
// (ROOM_CHECK_TIMEOUT seconds, default 240), progress is printed as it goes, and
// Chrome's whole process group is killed on any exit, error or signal.
// Exit code: 0 all passed, 1 some checks failed, 2 aborted (timeout / crash).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, writeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const page = resolve(process.argv[2] ?? 'mockups/a-detective-room.html');
const out = resolve(process.argv[3] ?? join(tmpdir(), 'room-check'));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OVERALL_S = Number(process.env.ROOM_CHECK_TIMEOUT ?? 240);
const CMD_MS = 20_000; // any single DevTools command
const LAUNCH_MS = 20_000; // Chrome answering its first command
const PAGE_READY_MS = 30_000; // page exposing window.__room

const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
// synchronous writes: output is never lost when we exit early, even into a pipe
const say = (line) => writeSync(1, line + '\n');
let currentStep = 'starting';
const step = (s) => { currentStep = s; say(`  … [${secs()}s] ${s}`); };
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (promise, ms, what) => {
  let timer;
  return Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms); })]).finally(() => clearTimeout(timer));
};

/* ---------- Chrome lifecycle: every browser we start is tracked and killed ---------- */
const browsers = new Set();
function killAll() {
  for (const b of browsers) b.kill();
  browsers.clear();
}
function finish(code) {
  killAll();
  const failed = results.filter((r) => !r.ok).length;
  const summary = `${results.length - failed}/${results.length} checks passed in ${secs().trim()}s · screenshots in ${out}`;
  say(code === 2 ? `\nABORTED — ${summary}` : `\n${summary}`);
  process.exit(code ?? (failed ? 1 : 0));
}
process.on('exit', killAll);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { say(`\nABORT  received ${sig} during: ${currentStep}`); finish(2); });
process.on('uncaughtException', (e) => { say(`\nABORT  ${e.message} (during: ${currentStep})`); finish(2); });
process.on('unhandledRejection', (e) => { say(`\nABORT  ${e?.message ?? e} (during: ${currentStep})`); finish(2); });
setTimeout(() => { say(`\nABORT  overall timeout of ${OVERALL_S}s hit during: ${currentStep}`); finish(2); }, OVERALL_S * 1000);

async function launch(label, extra = []) {
  step(`${label}: launching headless Chrome`);
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set CHROME=/path/to/chrome)`);
  const profile = mkdtempSync(join(tmpdir(), 'room-check-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--window-size=1280,800', ...extra, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], detached: true }); // own process group → kill helpers too
  const stderr = [];
  proc.stdio[2].on('data', (d) => { stderr.push(...String(d).split('\n').filter(Boolean)); stderr.splice(0, Math.max(0, stderr.length - 20)); });
  let alive = true;
  const b = {
    kill() {
      if (alive) { try { process.kill(-proc.pid, 'SIGKILL'); } catch { try { proc.kill('SIGKILL'); } catch { /* gone */ } } alive = false; }
      rmSync(profile, { recursive: true, force: true });
    },
  };
  browsers.add(b);

  // CDP over the pipe: NUL-separated JSON messages
  const pending = new Map(); const errors = []; let nextId = 0; let buf = '';
  const failAll = (why) => { for (const [, p] of pending) p.reject(new Error(why)); pending.clear(); };
  proc.on('exit', (code, sig) => { alive = false; failAll(`Chrome exited (${sig ?? code}) — last stderr: ${stderr.slice(-5).join(' | ') || 'none'}`); });
  proc.on('error', (e) => failAll(`Chrome failed to start: ${e.message}`));
  proc.stdio[4].setEncoding('utf8');
  proc.stdio[4].on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(`${p.method}: ${m.error.message}`)) : p.resolve(m.result); }
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });
  proc.stdio[3].on('error', () => { /* Chrome gone; pending commands are rejected via 'exit' */ });
  let sessionId;
  const send = (method, params = {}, ms = CMD_MS) => {
    const id = ++nextId;
    const p = new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej, method }));
    proc.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId && !method.startsWith('Target.') ? { sessionId } : {}) }) + '\0');
    return withTimeout(p, ms, `DevTools ${method}`).finally(() => pending.delete(id));
  };
  try {
    await withTimeout(send('Browser.getVersion'), LAUNCH_MS, 'Chrome start-up');
  } catch (e) {
    throw new Error(`${e.message}. Chrome stderr: ${stderr.slice(-5).join(' | ') || 'none'}`);
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  await send('Runtime.enable'); await send('Page.enable');
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`page error evaluating ${expr.slice(0, 60)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result?.value;
  };
  return { send, evaluate, errors, close: () => { b.kill(); browsers.delete(b); } };
}

async function click(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function key(c, k) {
  const code = k === 'Escape' ? 27 : 0;
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code });
}
async function shot(c, name) {
  const { data } = await c.send('Page.captureScreenshot', { format: 'png' }, 30_000);
  writeFileSync(join(out, name + '.png'), Buffer.from(data, 'base64'));
}
async function load(c, label, w, h, mobile = false) {
  step(`${label}: loading ${page.split('/').pop()} at ${w}×${h}`);
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await c.send('Page.navigate', { url: 'file://' + page });
  const until = Date.now() + PAGE_READY_MS;
  while (!(await c.evaluate('!!window.__room'))) {
    if (Date.now() > until) throw new Error(`page did not expose window.__room within ${PAGE_READY_MS / 1000}s (wrong path, CDN blocked, or a script error: ${c.errors.slice(-2).join(' | ') || 'no console errors'})`);
    await sleep(250);
  }
  await sleep(1200);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
async function settle(c) { // camera tween finished (bounded: 3s)
  for (let i = 0; i < 30 && (await c.evaluate('window.__room.busy()')); i++) await sleep(100);
  await sleep(300);
}
const rectOf = (c, sel) => c.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.width > 0 }; })()`);

// Runs one block in its own Chrome; a timeout or crash fails that block and the run continues.
async function block(label, extra, body) {
  let c;
  try {
    c = await launch(label, extra);
    await body(c);
  } catch (e) {
    check(`${label}: block finished without errors`, false, `${e.message} (during: ${currentStep})`);
  } finally {
    c?.close();
  }
}

/* ---------- run ---------- */
say(`Checking ${page}`);
if (!existsSync(page)) { say(`ABORT  page not found: ${page} (run from the portofolio/ folder or pass an absolute path)`); finish(2); }
mkdirSync(out, { recursive: true });

await block('desktop', [], async (c) => {
  await load(c, 'desktop', 1280, 800);
  check('WebGL scene running', await c.evaluate('window.__room.webgl === true'));
  await shot(c, 'desktop-home');
  const home = await c.evaluate('window.__room.cam()');
  const ids = await c.evaluate('[...document.querySelectorAll("#hotspots .hs")].map(b => b.dataset.sec)');
  check('evidence markers rendered', ids.length >= 8, ids.join(', '));

  step('desktop: hover test');
  const pc = await c.evaluate('window.__room.screen("board")');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pc.x, y: pc.y });
  await sleep(200);
  check('hovering an object shows a pointer', (await c.evaluate('document.querySelector("#stage canvas").style.cursor')) === 'pointer');

  for (const id of ids) {
    step(`desktop: click 3D object "${id}"`);
    const p = await c.evaluate(`window.__room.screen(${JSON.stringify(id)})`);
    const hit = await c.evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.tagName`);
    await click(c, p.x, p.y);
    await settle(c);
    const cur = await c.evaluate('window.__room.current()');
    const open = await c.evaluate('document.getElementById("panel").classList.contains("open")');
    const moved = dist(home, await c.evaluate('window.__room.cam()'));
    check(`click 3D object "${id}" → camera moves + panel opens`, cur === id && open && moved > 0.5, `hit=${hit} current=${cur} panel=${open} camera moved ${moved.toFixed(2)}`);
    if (id === 'cases' || id === 'board') await shot(c, `desktop-${id}`);
    await key(c, 'Escape');
    await settle(c);
  }
  const back = dist(home, await c.evaluate('window.__room.cam()'));
  check('Escape closes the panel and the camera returns home', !(await c.evaluate('document.getElementById("panel").classList.contains("open")')) && back < 0.3, `distance from home ${back.toFixed(2)}`);

  step('desktop: marker button + close button');
  const hb = await rectOf(c, '#hotspots .hs[data-sec="wall"]');
  await click(c, hb.x, hb.y); await settle(c);
  check('evidence-marker button opens its section', (await c.evaluate('window.__room.current()')) === 'wall');
  const xb = await rectOf(c, '#pClose');
  await click(c, xb.x, xb.y); await settle(c);
  check('close button (×) closes the panel', !(await c.evaluate('document.getElementById("panel").classList.contains("open")')));

  step('desktop: full dossier (quick view)');
  const qb = await rectOf(c, '#quickBtn');
  await click(c, qb.x, qb.y); await sleep(400);
  const q = await c.evaluate('({ open: document.getElementById("quick").classList.contains("open"), projects: document.querySelectorAll("#quickBody .case").length, jobs: document.querySelectorAll("#quickBody .tl .ev").length })');
  check('quick view (full dossier) opens with all content', q.open && q.projects >= 5 && q.jobs === 4, JSON.stringify(q));
  await shot(c, 'desktop-quick');
  await key(c, 'Escape'); await sleep(300);
  check('Escape closes the quick view', !(await c.evaluate('document.getElementById("quick").classList.contains("open")')));
  check('no JS errors (desktop)', c.errors.length === 0, c.errors.join(' | '));
});

await block('phone', [], async (c) => {
  await load(c, 'phone', 390, 844, true);
  await shot(c, 'phone-home');
  step('phone: dock → contact');
  const db = await rectOf(c, '#dock [data-sec="phone"]');
  check('phone dock is visible', !!db?.visible);
  await click(c, db.x, db.y); await settle(c);
  const r = await c.evaluate('(() => { const p = document.getElementById("panel").getBoundingClientRect(); return { current: window.__room.current(), top: Math.round(p.top), h: innerHeight }; })()');
  check('dock opens a bottom sheet', r.current === 'phone' && r.top > r.h * 0.2, JSON.stringify(r));
  await shot(c, 'phone-contact');
  check('no JS errors (phone)', c.errors.length === 0, c.errors.join(' | '));
});

await block('no-webgl', ['--disable-3d-apis', '--disable-webgl', '--disable-gpu'], async (c) => {
  step('no-webgl: loading page with WebGL disabled');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'file://' + page });
  const until = Date.now() + PAGE_READY_MS;
  let f;
  do {
    await sleep(500);
    f = await c.evaluate('({ webgl: window.__room?.webgl, quick: document.getElementById("quick")?.classList.contains("open"), fallback: getComputedStyle(document.getElementById("fallback")).display })');
  } while (f.webgl === undefined && Date.now() < until);
  check('without WebGL the full dossier opens automatically', f.webgl === false && f.quick && f.fallback !== 'none', JSON.stringify(f));
  await shot(c, 'nowebgl');
});

finish();
