// Minimal headless-Chrome driver over --remote-debugging-pipe (fds 3/4): no npm packages, no debugging port.
// Also starts `vite preview` for the built site. Every child process is killed on exit, error or signal.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// any single DevTools command; software WebGL with bloom can hold the page's main thread for a while
const CMD_MS = 45_000;
const LAUNCH_MS = 20_000; // Chrome answering its first command

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// synchronous writes: output is never lost when we exit early, even into a pipe
export const say = (line) => writeSync(1, line + '\n');
export const withTimeout = (promise, ms, what) => {
  let timer;
  return Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms); })]).finally(() => clearTimeout(timer));
};

/* ---------- child processes: every one we start is tracked and killed ---------- */
const children = new Set();
export function killAll() {
  for (const c of children) c.kill();
  children.clear();
}
process.on('exit', killAll);

function track(proc, cleanup = () => {}) {
  let alive = true;
  const c = {
    kill() {
      if (alive) { try { process.kill(-proc.pid, 'SIGKILL'); } catch { try { proc.kill('SIGKILL'); } catch { /* gone */ } } alive = false; }
      cleanup();
    },
  };
  proc.on('exit', () => { alive = false; });
  children.add(c);
  return c;
}

/** Serves dist/ with `vite preview` and resolves with its base URL once it answers. */
export async function preview(root, port = Number(process.env.PREVIEW_PORT ?? 4317)) {
  const proc = spawn(join(root, 'node_modules/.bin/vite'), ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  const log = [];
  for (const s of [proc.stdout, proc.stderr]) s.on('data', (d) => { log.push(String(d)); log.splice(0, Math.max(0, log.length - 20)); });
  track(proc);
  const base = `http://127.0.0.1:${port}`;
  const until = Date.now() + 20_000;
  for (;;) {
    if (proc.exitCode !== null) throw new Error(`vite preview exited: ${log.join('').trim()}`);
    try { if ((await fetch(base + '/', { signal: AbortSignal.timeout(2000) })).ok) return base; } catch { /* not up yet */ }
    if (Date.now() > until) throw new Error(`vite preview did not answer on ${base} within 20s: ${log.join('').trim()}`);
    await sleep(200);
  }
}

/** Starts headless Chrome and returns a DevTools session on a fresh tab. */
export async function launch(extra = []) {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set CHROME=/path/to/chrome)`);
  const profile = mkdtempSync(join(tmpdir(), 'room-check-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800',
    // never throttle the page under test, even if something else takes the foreground
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', ...extra, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], detached: true }); // own process group → kill helpers too
  const stderr = [];
  proc.stdio[2].on('data', (d) => { stderr.push(...String(d).split('\n').filter(Boolean)); stderr.splice(0, Math.max(0, stderr.length - 20)); });
  const handle = track(proc, () => rmSync(profile, { recursive: true, force: true }));

  // CDP over the pipe: NUL-separated JSON messages
  const pending = new Map(); const errors = []; let nextId = 0; let buf = '';
  const failAll = (why) => { for (const [, p] of pending) p.reject(new Error(why)); pending.clear(); };
  proc.on('exit', (code, sig) => failAll(`Chrome exited (${sig ?? code}) — last stderr: ${stderr.slice(-5).join(' | ') || 'none'}`));
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
      // failed requests (missing images, fonts…) show up here
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url ?? ''}`.trim());
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
    throw new Error(`${e.message}. Chrome stderr: ${stderr.slice(-5).join(' | ') || 'none'}`, { cause: e });
  }
  // Drive the tab Chrome opened itself. A second tab (Target.createTarget) races with that first window:
  // on a cold start Chrome can bring its own about:blank to the front a few seconds later, which hides
  // our tab, and hidden tabs get no requestAnimationFrame, so the room never finishes warming up.
  const { targetInfos } = await send('Target.getTargets');
  const first = targetInfos.find((t) => t.type === 'page');
  const targetId = first ? first.targetId : (await send('Target.createTarget', { url: 'about:blank' })).targetId;
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  await send('Page.bringToFront');
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`page error evaluating ${expr.slice(0, 60)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result?.value;
  };
  return { send, evaluate, errors, close: () => { handle.kill(); children.delete(handle); } };
}

export async function click(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

export async function key(c, k) {
  const codes = { Escape: 27, Tab: 9, Enter: 13, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  // Enter needs its text to activate a focused button
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: codes[k] ?? 0, ...(k === 'Enter' ? { text: '\r' } : {}) });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: codes[k] ?? 0 });
}

export async function shot(c, file, format = 'png', quality) {
  const { data } = await c.send('Page.captureScreenshot', { format, ...(quality ? { quality } : {}) }, 30_000);
  writeFileSync(file, Buffer.from(data, 'base64'));
}

/** Opens url at w×h, waits until the page has decided on the room (window.__room is set), and returns how long it took. */
export async function load(c, url, w, h, { mobile = false, readyMs = 30_000 } = {}) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  const t0 = Date.now();
  await c.send('Page.navigate', { url });
  const until = t0 + readyMs;
  while (!(await c.evaluate('!!window.__room'))) {
    if (Date.now() > until) {
      const vis = await c.evaluate('document.visibilityState');
      throw new Error(`page did not expose window.__room within ${readyMs / 1000}s (tab ${vis}; ${c.errors.slice(-2).join(' | ') || 'no console errors'})`);
    }
    await sleep(250);
  }
  return (Date.now() - t0) / 1000;
}
