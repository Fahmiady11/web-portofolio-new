// Drives the built site in headless Chrome and checks the main interactions: clicking each object
// (camera moves + panel opens), Escape, marker buttons, a case photo opening that exact case, the
// full dossier (projects first), the phone dock, deep links, the prerendered HTML and the no-WebGL fallback;
// and since milestone 2: the intro camera move and lights-on, bloom, keyboard navigation, the phone hint,
// and the 3D waiting for an idle page on slow connections.
// Ported from mockups/_check-interactions.mjs; same checks, run against `vite preview` of dist/.
//
// Usage: npm run build && npm test            (screenshots go to test-results/, or pass a folder)
//        BASE_URL=https://… npm test           (check an already running/deployed site instead)
//        ROOM_CHECK_ONLY=desktop,phone npm test (only some blocks: desktop, deep links, quality,
//                                              reduced motion, phone, slow connection, no-webgl)
//
// Needs Google Chrome (override with CHROME=/path) and Node 22. Every step has a timeout, the whole run
// has one (ROOM_CHECK_TIMEOUT seconds, default 480), and Chrome and the preview server are always killed.
// Exit code: 0 all passed, 1 some checks failed, 2 aborted (timeout / crash).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { click, key, killAll, launch, load, preview, say, shot as capture, sleep } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, 'test-results'));
const OVERALL_S = Number(process.env.ROOM_CHECK_TIMEOUT ?? 480);
const content = JSON.parse(readFileSync(join(root, 'content/content.json'), 'utf8'));
const expectedCases = content.projects.length + content.pendingProjects.items.length;
const expectedLinks = content.projects.reduce((n, p) => n + !!p.website + !!p.github, 0);

const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
let currentStep = 'starting';
const step = (s) => { currentStep = s; say(`  … [${secs()}s] ${s}`); };
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const shot = (c, name) => capture(c, join(out, name + '.png'));

function finish(code) {
  killAll();
  const failed = results.filter((r) => !r.ok).length;
  const summary = `${results.length - failed}/${results.length} checks passed in ${secs().trim()}s · screenshots in ${out}`;
  say(code === 2 ? `\nABORTED — ${summary}` : `\n${summary}`);
  process.exit(code ?? (failed ? 1 : 0));
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { say(`\nABORT  received ${sig} during: ${currentStep}`); finish(2); });
process.on('uncaughtException', (e) => { say(`\nABORT  ${e.message} (during: ${currentStep})`); finish(2); });
process.on('unhandledRejection', (e) => { say(`\nABORT  ${e?.message ?? e} (during: ${currentStep})`); finish(2); });
setTimeout(() => { say(`\nABORT  overall timeout of ${OVERALL_S}s hit during: ${currentStep}`); finish(2); }, OVERALL_S * 1000);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// camera tween and panel slide both finished (bounded: ~4s), so clicks land where the eye sees
const STILL = `(() => { if (window.__room.busy?.()) return false;
  const p = document.getElementById('panel'); const m = new DOMMatrix(getComputedStyle(p).transform);
  return p.classList.contains('open') ? m.m41 === 0 && m.m42 === 0 : getComputedStyle(p).visibility === 'hidden'; })()`;
async function settle(c) {
  for (let i = 0; i < 40 && !(await c.evaluate(STILL)); i++) await sleep(100);
  await sleep(250);
}
const rectOf = (c, sel) => c.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.width > 0 }; })()`);
const panelOpen = (c) => c.evaluate('document.getElementById("panel").classList.contains("open")');

// ROOM_CHECK_ONLY="desktop,phone" runs just those blocks (the static HTML checks always run)
const ONLY = process.env.ROOM_CHECK_ONLY ? new Set(process.env.ROOM_CHECK_ONLY.split(',').map((s) => s.trim())) : null;

// Runs one block in its own Chrome; a timeout or crash fails that block and the run continues.
async function block(label, extra, body) {
  if (ONLY && !ONLY.has(label)) return;
  let c;
  try {
    step(`${label}: launching headless Chrome`);
    c = await launch(extra);
    await body(c);
  } catch (e) {
    check(`${label}: block finished without errors`, false, `${e.message} (during: ${currentStep})`);
  } finally {
    c?.close();
  }
}

/* ---------- run ---------- */
mkdirSync(out, { recursive: true });
let base = process.env.BASE_URL?.replace(/\/$/, '');
if (!base) {
  if (!existsSync(join(root, 'dist/index.html'))) { say('ABORT  dist/ is missing: run `npm run build` first'); finish(2); }
  step('starting vite preview');
  base = await preview(root);
}
const url = (q = '') => `${base}/${q}`;
say(`Checking ${url()}`);

step('static HTML (what crawlers and no-JS visitors get)');
const html = await (await fetch(url())).text();
const staticOk = {
  title: /<title>[^<]*Muhammad Fahmi Ady Susilo[^<]*Software Developer[^<]*<\/title>/.test(html),
  description: /<meta name="description" content="[^"]{50,}"/.test(html),
  og: /<meta property="og:image" content="https?:\/\/[^"]+\/og\.jpg"/.test(html) && /twitter:card/.test(html),
  name: html.includes('<h1 id="name">Muhammad Fahmi Ady Susilo</h1>'),
  projects: [...content.projects.map((p) => p.title), ...content.pendingProjects.items.map((p) => p.workingTitle)].every((t) => html.includes(`>${t}</h4>`)),
  links: content.projects.flatMap((p) => [p.website, p.github]).filter(Boolean).every((l) => html.includes(`href="${l}"`)),
  fontPreload: /<link rel="preload" href="\/assets\/special-elite-[^"]+\.woff2" as="font"/.test(html),
};
check('prerendered HTML has title, meta, Open Graph, name, every project and every link, font preload', Object.values(staticOk).every(Boolean), JSON.stringify(staticOk));
for (const asset of ['og.jpg', 'favicon.svg', 'poster-wide.webp', 'poster-tall.webp', 'grain.webp', 'sitemap.xml', 'robots.txt']) {
  const r = await fetch(url(asset));
  check(`/${asset} is served`, r.ok, String(r.status));
}

await block('desktop', [], async (c) => {
  step('desktop: loading at 1280×800');
  await load(c, url(), 1280, 800);
  const start = await c.evaluate('({ cam: window.__room.cam(), busy: window.__room.busy() })');
  await shot(c, 'desktop-intro');
  await settle(c);
  await sleep(600);
  check('WebGL scene running', await c.evaluate('window.__room.webgl === true'));
  const home = await c.evaluate('window.__room.cam()');
  check('intro: the camera flies in from the door and settles on the case wall', start.busy && dist(start.cam, home) > 1, `moved ${dist(start.cam, home).toFixed(2)}`);
  const look = await c.evaluate(`({ poster: document.querySelector('.poster').classList.contains('gone'), quality: window.__room.quality(), bloom: window.__room.bloom() })`);
  // the quality may step down on a slow (software-rendered) run; bloom must follow it
  check('poster gives way to the live room; bloom on unless quality stepped down to low', look.poster && look.bloom === (look.quality !== 'low'), JSON.stringify(look));
  await shot(c, 'desktop-home');
  const ids = await c.evaluate('[...document.querySelectorAll("#hotspots .hs")].map(b => b.dataset.sec)');
  const shown = await c.evaluate('[...document.querySelectorAll("#hotspots .hs")].filter(b => getComputedStyle(b).display !== "none").length');
  const star = await c.evaluate(`(() => { const b = document.querySelector('#hotspots .hs.star'); const st = getComputedStyle(b); return { opacity: st.opacity, width: Math.round(b.getBoundingClientRect().width) }; })()`);
  check('the Case files marker is fully visible (no stray keyframes hiding it)', star.opacity === '1' && star.width < 300, JSON.stringify(star));
  check('evidence markers rendered and all on screen', ids.length >= 8 && shown === ids.length, `${shown}/${ids.length} visible: ${ids.join(', ')}`);

  step('desktop: hover test');
  const pc = await c.evaluate('window.__room.screen("board")');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pc.x, y: pc.y });
  await sleep(300);
  check('hovering an object shows a pointer', (await c.evaluate('document.querySelector("#stage canvas").style.cursor')) === 'pointer');

  for (const id of ids) {
    step(`desktop: click 3D object "${id}"`);
    const p = await c.evaluate(`window.__room.screen(${JSON.stringify(id)})`);
    const hit = await c.evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.tagName`);
    await click(c, p.x, p.y);
    await settle(c);
    const cur = await c.evaluate('window.__room.current()');
    const open = await panelOpen(c);
    const moved = dist(home, await c.evaluate('window.__room.cam()'));
    check(`click 3D object "${id}" → camera moves + panel opens`, cur === id && open && moved > 0.5, `hit=${hit} current=${cur} panel=${open} camera moved ${moved.toFixed(2)}`);
    if (id === 'cases' || id === 'board') await shot(c, `desktop-${id}`);
    await key(c, 'Escape');
    await settle(c);
  }
  const back = dist(home, await c.evaluate('window.__room.cam()'));
  check('Escape closes the panel and the camera returns home', !(await panelOpen(c)) && back < 0.3, `distance from home ${back.toFixed(2)}`);

  step('desktop: projects — header button, panel contents');
  const cb = await rectOf(c, '#casesBtn');
  check('"View cases" button is in the header', !!cb?.visible);
  await click(c, cb.x, cb.y); await settle(c);
  await sleep(500); // let the screenshots finish loading
  const pc2 = await c.evaluate(`(() => {
    const b = document.getElementById('pBody');
    const shots = [...b.querySelectorAll('.case img.shot')];
    return {
      current: window.__room.current(),
      wide: document.getElementById('panel').getBoundingClientRect().width,
      cases: b.querySelectorAll('.case').length,
      shotsLoaded: shots.filter((i) => i.complete && i.naturalWidth > 0).length,
      live: b.querySelectorAll('.case a[href^="http"]').length,
      pending: [...b.querySelectorAll('.case.pending')].map((e) => e.querySelector('.stamp').textContent + '|' + e.querySelector('p').textContent),
      focused: document.activeElement?.id,
    };
  })()`);
  check('"View cases" opens the projects panel', pc2.current === 'cases' && pc2.wide >= 600, `current=${pc2.current} width=${pc2.wide}`);
  check('every case has a loaded screenshot', pc2.cases === expectedCases && pc2.shotsLoaded === expectedCases, `${pc2.shotsLoaded}/${expectedCases} screenshots`);
  check('Live / GitHub buttons for every public link', pc2.live === expectedLinks, `${pc2.live}/${expectedLinks} links`);
  check('pending files show only the FILE PENDING placeholder', pc2.pending.length === content.pendingProjects.items.length && pc2.pending.every((t) => t === 'FILE PENDING|Case notes not filed yet.'), JSON.stringify(pc2.pending));
  check('opening a file moves keyboard focus into the panel', pc2.focused === 'pTitle', `focused=${pc2.focused}`);
  await key(c, 'Escape'); await settle(c);
  check('closing the file gives focus back to the button that opened it', (await c.evaluate('document.activeElement?.id')) === 'casesBtn');

  step('desktop: click one case photo on the wall');
  const card = await c.evaluate('window.__room.caseCard(1)');
  await click(c, card.x, card.y); await settle(c);
  const f1 = await c.evaluate('({ current: window.__room.current(), focused: document.getElementById("case-1")?.classList.contains("focus") })');
  const camAt = await c.evaluate('window.__room.cam()');
  check('clicking a case photo opens that exact case', f1.current === 'cases' && f1.focused, `current=${f1.current} case-1 focused=${f1.focused} camera moved ${dist(home, camAt).toFixed(2)}`);
  await shot(c, 'desktop-case-photo');
  await key(c, 'Escape'); await settle(c);

  step('desktop: marker button + close button');
  const hb = await rectOf(c, '#hotspots .hs[data-sec="wall"]');
  await click(c, hb.x, hb.y); await settle(c);
  check('evidence-marker button opens its section', (await c.evaluate('window.__room.current()')) === 'wall');
  const xb = await rectOf(c, '#pClose');
  await click(c, xb.x, xb.y); await settle(c);
  check('close button (×) closes the panel', !(await panelOpen(c)));

  step('desktop: keyboard navigation');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 6, y: 794 }); // nothing hovered
  await c.evaluate('document.activeElement?.blur()');
  await key(c, 'ArrowRight');
  await sleep(200);
  const k1 = await c.evaluate('({ focus: document.activeElement?.dataset?.sec, glowing: window.__room.glowing() })');
  check('→ in the room focuses the first marker and lights its object', k1.focus === 'cases' && k1.glowing.join() === 'cases', JSON.stringify(k1));
  await key(c, 'ArrowRight');
  await sleep(200);
  const k2 = await c.evaluate('({ focus: document.activeElement?.dataset?.sec, glowing: window.__room.glowing() })');
  check('→ again moves to the next marker, and the glow follows', k2.focus === 'board' && k2.glowing.join() === 'board', JSON.stringify(k2));
  await shot(c, 'desktop-keyboard');
  await key(c, 'Enter'); await settle(c);
  check('Enter on a marker opens its file', (await c.evaluate('window.__room.current()')) === 'board');
  await key(c, 'ArrowRight'); await settle(c);
  const k3 = await c.evaluate('window.__room.current()');
  await key(c, 'ArrowLeft'); await settle(c);
  const k4 = await c.evaluate('window.__room.current()');
  check('with a file open, → / ← walk to the next / previous file', k3 === 'evidence' && k4 === 'board', `→ ${k3}, ← ${k4}`);
  const nb = await rectOf(c, '#pNext');
  await click(c, nb.x, nb.y); await settle(c);
  check('the panel\'s › button opens the next file', (await c.evaluate('window.__room.current()')) === 'evidence');
  await key(c, 'Escape'); await settle(c);
  const k5 = await c.evaluate('({ open: document.getElementById("panel").classList.contains("open"), focus: document.activeElement?.dataset?.sec })');
  check('Escape closes it and focus returns to the marker it was opened from', !k5.open && k5.focus === 'board', JSON.stringify(k5));
  await c.evaluate('document.activeElement?.blur()');

  step('desktop: full dossier (quick view)');
  const qb = await rectOf(c, '#quickBtn');
  await click(c, qb.x, qb.y); await sleep(400);
  const q = await c.evaluate('({ open: document.getElementById("quick").classList.contains("open"), projects: document.querySelectorAll("#quickBody .case").length, jobs: document.querySelectorAll("#quickBody .tl .ev").length })');
  check('quick view (full dossier) opens with all content', q.open && q.projects === expectedCases && q.jobs === content.experience.length, JSON.stringify(q));
  const firstSec = await c.evaluate('document.querySelector("#quickBody .sec")?.textContent');
  check('projects come first in the full dossier', /case files/i.test(firstSec ?? ''), `first section: ${firstSec}`);
  const a11y = await c.evaluate(`(() => {
    const q = document.getElementById('quick');
    const levels = [...q.querySelectorAll('h2, h3, h4, h5')].map((h) => +h.tagName[1]);
    return { h2: levels.filter((l) => l === 2).length, skips: levels.filter((l, i) => i && l - levels[i - 1] > 1).length,
      links: q.querySelectorAll('a[href]').length, imgsWithoutAlt: q.querySelectorAll('img:not([alt])').length, focused: document.activeElement?.id };
  })()`);
  check('full dossier is accessible HTML (one h2, no skipped heading levels, links, alt text, focus moved in)', a11y.h2 === 1 && a11y.skips === 0 && a11y.links >= expectedLinks + 4 && a11y.imgsWithoutAlt === 0 && a11y.focused === 'quickClose', JSON.stringify(a11y));
  await shot(c, 'desktop-quick');
  await key(c, 'Escape'); await sleep(300);
  check('Escape closes the quick view', !(await c.evaluate('document.getElementById("quick").classList.contains("open")')));
  check('no JS errors (desktop)', c.errors.length === 0, c.errors.join(' | '));
});

await block('deep links', [], async (c) => {
  step('deep links: ?open=case-2');
  await load(c, url('?open=case-2'), 1280, 800);
  await sleep(800);
  const d = await c.evaluate('({ current: window.__room.current(), focused: document.getElementById("case-2")?.classList.contains("focus"), open: document.getElementById("panel").classList.contains("open") })');
  check('?open=case-2 lands on that case', d.current === 'cases' && d.focused && d.open, JSON.stringify(d));
  step('deep links: ?open=phone');
  await load(c, url('?open=phone'), 1280, 800);
  const dl = await c.evaluate('({ current: window.__room.current(), busy: window.__room.busy() })');
  check('?open=<section> opens that file, with no intro move', dl.current === 'phone' && !dl.busy, JSON.stringify(dl));
  step('deep links: ?open=quick');
  await load(c, url('?open=quick'), 1280, 800);
  await sleep(500);
  check('?open=quick opens the full dossier', await c.evaluate('document.getElementById("quick").classList.contains("open")'));
  check('no JS errors (deep links)', c.errors.length === 0, c.errors.join(' | '));
});

await block('quality', [], async (c) => {
  // only the low end is pinned here: software WebGL can't keep up with pinned high plus bloom, and the
  // desktop block already checks that bloom follows whatever quality the room is running at
  step('quality: pinned low');
  await load(c, url('?quality=low'), 800, 500);
  const lo = await c.evaluate('({ q: window.__room.quality(), bloom: window.__room.bloom() })');
  check('?quality=low drops bloom', lo.q === 'low' && !lo.bloom, JSON.stringify(lo));
  check('no JS errors (quality)', c.errors.length === 0, c.errors.join(' | '));
});

await block('reduced motion', [], async (c) => {
  step('reduced motion: loading with prefers-reduced-motion: reduce');
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load(c, url(), 1280, 800);
  check('reduced motion: no intro move', !(await c.evaluate('window.__room.busy()')));
  await sleep(800);
  const home = await c.evaluate('window.__room.cam()');
  const cb = await rectOf(c, '#casesBtn');
  await click(c, cb.x, cb.y);
  await sleep(150);
  const r = await c.evaluate('({ busy: window.__room.busy(), current: window.__room.current(), cam: window.__room.cam() })');
  check('reduced motion: the camera cuts straight to the file, no fly-through', r.current === 'cases' && !r.busy && dist(home, r.cam) > 0.5, JSON.stringify(r));
  check('no JS errors (reduced motion)', c.errors.length === 0, c.errors.join(' | '));
});

await block('phone', [], async (c) => {
  step('phone: loading at 390×844');
  await load(c, url(), 390, 844, { mobile: true });
  await sleep(300);
  const hint = await rectOf(c, '.phint'); // it leaves by itself after 7 s, so look straight away
  check('phone hint shows above the dock once the room is live', !!hint?.visible);
  await settle(c);
  await sleep(600);
  await shot(c, 'phone-home');
  step('phone: dock → cases (first slot)');
  const first = await c.evaluate('(() => { const b = document.querySelector("#dock button"); return { sec: b.dataset.sec, star: b.classList.contains("star") }; })()');
  check('phone dock: cases is the first, highlighted slot', first.sec === 'cases' && first.star, JSON.stringify(first));
  const cs = await rectOf(c, '#dock [data-sec="cases"]');
  await click(c, cs.x, cs.y); await settle(c);
  check('phone dock opens the projects panel', (await c.evaluate('window.__room.current()')) === 'cases');
  check('the phone hint goes away after the first tap', !(await c.evaluate('!!document.querySelector(".phint")')));
  await shot(c, 'phone-cases');
  await key(c, 'Escape'); await settle(c);
  step('phone: dock → contact');
  const db = await rectOf(c, '#dock [data-sec="phone"]');
  check('phone dock is visible', !!db?.visible);
  await click(c, db.x, db.y); await settle(c);
  const r = await c.evaluate('(() => { const p = document.getElementById("panel").getBoundingClientRect(); return { current: window.__room.current(), top: Math.round(p.top), h: innerHeight }; })()');
  check('dock opens a bottom sheet', r.current === 'phone' && r.top > r.h * 0.2, JSON.stringify(r));
  await shot(c, 'phone-contact');
  await key(c, 'Escape'); await settle(c);
  const qb = await rectOf(c, '#quickBtn');
  await click(c, qb.x, qb.y); await sleep(400);
  await shot(c, 'phone-quick');
  check('no JS errors (phone)', c.errors.length === 0, c.errors.join(' | '));
});

await block('slow connection', [], async (c) => {
  step('slow connection: Save-Data on, 3g');
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '3g' } })" });
  await load(c, url(), 1280, 800, { readyMs: 60_000 }); // the room starts only after load + idle
  const t = await c.evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const scene = performance.getEntriesByType('resource').find((r) => /Scene-/.test(r.name));
    return { loadEnd: Math.round(nav.loadEventEnd), sceneStart: Math.round(scene?.startTime ?? -1) };
  })()`);
  check('on slow connections the 3D waits until the page has loaded', t.sceneStart > t.loadEnd && t.loadEnd > 0, JSON.stringify(t));
  check('no JS errors (slow connection)', c.errors.length === 0, c.errors.join(' | '));
});

await block('no-webgl', ['--disable-3d-apis', '--disable-webgl', '--disable-gpu'], async (c) => {
  step('no-webgl: loading page with WebGL disabled');
  await load(c, url(), 1280, 800);
  await sleep(500);
  const f = await c.evaluate(`({ webgl: window.__room?.webgl, quick: document.getElementById("quick")?.classList.contains("open"),
    fallback: getComputedStyle(document.getElementById("fallback")).display, canvas: !!document.querySelector('#stage canvas'),
    threeLoaded: performance.getEntriesByType('resource').some((r) => /three-|Scene-/.test(r.name)) })`);
  check('without WebGL the full dossier opens automatically', f.webgl === false && f.quick && f.fallback !== 'none' && !f.canvas, JSON.stringify(f));
  check('without WebGL the 3D code is never downloaded', !f.threeLoaded);
  await shot(c, 'nowebgl');
  check('no JS errors (no-webgl)', c.errors.length === 0, c.errors.join(' | '));
});

finish();
