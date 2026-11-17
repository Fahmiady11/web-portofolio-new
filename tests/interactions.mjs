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
import { click, key, killAll, launch, load as loadPage, preview, say, shot as capture, sleep } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, 'test-results'));
const OVERALL_S = Number(process.env.ROOM_CHECK_TIMEOUT ?? 480);
const content = JSON.parse(readFileSync(join(root, 'content/content.json'), 'utf8'));
const expectedCases = content.projects.length + content.pendingProjects.items.length;
const expectedLinks = content.projects.reduce((n, p) => n + !!p.website + !!p.github + !!p.link, 0);
// marker order, by what a recruiter wants first (src/sections.ts); dock, arrow keys and ‹ › follow it
const ORDER = ['board', 'cases', 'evidence', 'about', 'dossier', 'record', 'wall', 'phone'];
const DOSSIER_ORDER = ['Summary', 'Experience', 'Case files (projects)', 'Skills', 'CV', 'Education', 'Certificates', 'Contact'];
// every evidence marker shown, none overlapping, all inside the strip between the header and the dock
const MARKER_LAYOUT = `(() => {
  const bottomOf = (sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0;
  const topOf = (sel) => { const e = document.querySelector(sel); return e && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect().top : innerHeight; };
  const top = Math.max(bottomOf('.top .brand'), bottomOf('.top .actions')), bottom = Math.min(topOf('#dock'), topOf('.credits.on-page'));
  const r = [...document.querySelectorAll('#hotspots .hs')].map((b) => [b.dataset.sec, getComputedStyle(b).display !== 'none', b.getBoundingClientRect()]);
  const hidden = r.filter(([, shown]) => !shown).map(([id]) => id);
  const outside = r.filter(([, shown, q]) => shown && (q.left < 0 || q.right > innerWidth || q.top < top || q.bottom > bottom)).map(([id]) => id);
  const overlaps = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const [a, sa, A] = r[i], [b, sb, B] = r[j];
    if (sa && sb && A.left < B.right && B.left < A.right && A.top < B.bottom && B.top < A.bottom) overlaps.push(a + '×' + b);
  }
  return { count: r.length, hidden, outside, overlaps, strip: [Math.round(top), Math.round(bottom)] };
})()`;
const GMAIL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(content.contact.email)}`;

const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
let currentStep = 'starting';
const step = (s) => { currentStep = s; say(`  … [${secs()}s] ${s}`); };
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const shot = (c, name) => capture(c, join(out, name + '.png'));
// every page load reports how long the room took to be ready, and the run ends with the list
const timings = [];
async function load(c, ...args) {
  const s = await loadPage(c, ...args);
  timings.push([currentStep, s]);
  say(`  ⏱ [${secs()}s] room ready in ${s.toFixed(1)}s (${currentStep})`);
  return s;
}

function finish(code) {
  killAll();
  if (timings.length) say('\nTime to window.__room:\n' + timings.map(([step, t]) => `  ${t.toFixed(1).padStart(5)}s  ${step}`).join('\n'));
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
  links: content.projects.flatMap((p) => [p.website, p.github, p.link]).filter(Boolean).every((l) => html.includes(`href="${l}"`)),
  // CV 2026 content: the published CV, no phone number, no "currently at"
  cv: html.includes(`href="/files/${content.contact.cv.publicName}"`) && !html.includes('cv-2022'),
  noPhone: !/857[- ]?4589|tel:/.test(html),
  noCurrent: !/currently at/i.test(html),
  // without JavaScript every email action is still a plain mailto: link
  credit: html.includes('Night on the Docks') && html.includes('href="https://creativecommons.org/licenses/by/4.0/"') && html.includes('href="https://incompetech.com"'),
  mailto: (html.match(new RegExp(`href="mailto:${content.contact.email}"`, 'g')) ?? []).length >= 3,
  fontPreload: /<link rel="preload" href="\/assets\/special-elite-[^"]+\.woff2" as="font"/.test(html),
};
check('prerendered HTML has title, meta, Open Graph, name, every project and every link, font preload', Object.values(staticOk).every(Boolean), JSON.stringify(staticOk));
// dist/ is uploaded as-is (Netlify drag-and-drop): every site path the page or its scripts use must be in it
{
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(join(root, 'dist/assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => readFileSync(join(root, 'dist/assets', f), 'utf8'));
  const refs = new Set();
  for (const text of [html, ...files]) for (const m of text.matchAll(/["'`(](\/(?:assets|img|icons|files|audio)\/[^"'`)\s?#]+|\/(?:poster-[a-z]+\.webp|og\.jpg|grain\.webp|favicon[^"'`)\s]*|apple-touch-icon\.png))/g)) refs.add(m[1]);
  // srcset lists: "/img/x-480.webp 480w, /img/x-800.webp 800w"
  for (const m of html.matchAll(/(\/img\/[^\s",]+)\s\d+w/g)) refs.add(m[1]);
  const missing = [...refs].filter((r) => !r.includes('${') && !existsSync(join(root, 'dist', r)));
  const needed = ['index.html', '_headers', 'robots.txt', 'sitemap.xml', 'og.jpg', 'favicon.svg', `files/${content.contact.cv.publicName}`,
    ...Object.values(content.audio).filter((a) => a?.ogg).flatMap((a) => [a.ogg, a.mp3]).map((f) => 'audio/' + f.split('/').pop())].filter((f) => !existsSync(join(root, 'dist', f)));
  check('dist/ is self-contained: every referenced file is in it, plus _headers, sitemap, robots, CV', !missing.length && !needed.length, `${refs.size} paths checked; missing: ${[...missing, ...needed].join(', ') || 'none'}`);
}
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
  const markerOrder = await c.evaluate('[...document.querySelectorAll("#hotspots .hs")].map(b => b.querySelector("b").textContent + ":" + b.dataset.sec)');
  check('markers are numbered by recruiter importance (1 Timeline … 8 Telephone)', markerOrder.join() === ORDER.map((id, i) => `${i + 1}:${id}`).join(), markerOrder.join(' '));
  const overlaps = await c.evaluate(`(() => {
    const r = [...document.querySelectorAll('#hotspots .hs')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => [b.dataset.sec, b.getBoundingClientRect()]);
    const hit = [];
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const [a, A] = r[i], [b, B] = r[j];
      if (A.left < B.right && B.left < A.right && A.top < B.bottom && B.top < A.bottom) hit.push(a + '×' + b);
    }
    return hit;
  })()`);
  check('no two evidence markers overlap in the default view', overlaps.length === 0, overlaps.join(', ') || 'none');
  check('evidence markers rendered and all on screen', ids.length >= 8 && shown === ids.length, `${shown}/${ids.length} visible: ${ids.join(', ')}`);

  const cat0 = await c.evaluate('window.__room.cat()');
  await sleep(1200);
  const cat1 = await c.evaluate('window.__room.cat()');
  check('the cat is in the room, its tail swishing, eyes (mostly) shut', cat0.exists && Math.abs(cat1.tail - cat0.tail) > 0.005, JSON.stringify({ cat0, cat1 }));

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
      titles: [...b.querySelectorAll('.case > h3')].map((h) => h.textContent),
      pending: [...b.querySelectorAll('.case.pending')].map((e) => e.querySelector('.stamp').textContent + '|' + e.querySelector('p').textContent),
      focused: document.activeElement?.id,
    };
  })()`);
  check('"View cases" opens the projects panel', pc2.current === 'cases' && pc2.wide >= 600, `current=${pc2.current} width=${pc2.wide}`);
  check('cases are in content order, newest first (Clipper Studio, Lega, …)', JSON.stringify(pc2.titles) === JSON.stringify(content.projects.map((p) => p.title)), pc2.titles.join(' | '));
  check('every case has a loaded screenshot', pc2.cases === expectedCases && pc2.shotsLoaded === expectedCases, `${pc2.shotsLoaded}/${expectedCases} screenshots`);
  check('Live / GitHub / project-link buttons for every public link', pc2.live === expectedLinks, `${pc2.live}/${expectedLinks} links`);
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
  check('→ in the room focuses marker 1 (Timeline) and lights its object', k1.focus === ORDER[0] && k1.glowing.join() === ORDER[0], JSON.stringify(k1));
  await key(c, 'ArrowRight');
  await sleep(200);
  const k2 = await c.evaluate('({ focus: document.activeElement?.dataset?.sec, glowing: window.__room.glowing() })');
  check('→ again moves to marker 2 (Case files), and the glow follows', k2.focus === ORDER[1] && k2.glowing.join() === ORDER[1], JSON.stringify(k2));
  await shot(c, 'desktop-keyboard');
  await key(c, 'Enter'); await settle(c);
  check('Enter on a marker opens its file', (await c.evaluate('window.__room.current()')) === ORDER[1]);
  await key(c, 'ArrowRight'); await settle(c);
  const k3 = await c.evaluate('window.__room.current()');
  await key(c, 'ArrowLeft'); await settle(c);
  const k4 = await c.evaluate('window.__room.current()');
  check('with a file open, → / ← walk to the next / previous file in marker order', k3 === ORDER[2] && k4 === ORDER[1], `→ ${k3}, ← ${k4}`);
  const nb = await rectOf(c, '#pNext');
  await click(c, nb.x, nb.y); await settle(c);
  check('the panel\'s › button opens the next file', (await c.evaluate('window.__room.current()')) === ORDER[2]);
  await key(c, 'Escape'); await settle(c);
  const k5 = await c.evaluate('({ open: document.getElementById("panel").classList.contains("open"), focus: document.activeElement?.dataset?.sec })');
  check('Escape closes it and focus returns to the marker it was opened from', !k5.open && k5.focus === ORDER[1], JSON.stringify(k5));
  await c.evaluate('document.activeElement?.blur()');

  step('desktop: email menu');
  await c.send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: base });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const mb = await rectOf(c, '#mailBtn');
  await click(c, mb.x, mb.y); await sleep(200);
  const m1 = await c.evaluate(`(() => { const m = document.querySelector('#mailBtn + .mailmenu'); return m && {
    expanded: document.getElementById('mailBtn').getAttribute('aria-expanded'), focus: document.activeElement?.dataset?.mail,
    gmail: m.querySelector('[data-mail="gmail"]').href, gmailTarget: m.querySelector('[data-mail="gmail"]').target, gmailRel: m.querySelector('[data-mail="gmail"]').rel,
    app: m.querySelector('[data-mail="app"]').getAttribute('href') }; })()`);
  check('Email opens a menu (focus on its first item) instead of a bare mailto:', m1?.expanded === 'true' && m1.focus === 'copy', JSON.stringify(m1));
  check('"Open in Gmail" is a compose link in a new tab', m1?.gmail === GMAIL && m1.gmailTarget === '_blank' && m1.gmailRel === 'noopener' && m1.app === `mailto:${content.contact.email}`, JSON.stringify(m1));
  const cp = await rectOf(c, '#mailBtn + .mailmenu [data-mail="copy"]');
  await click(c, cp.x, cp.y); await sleep(300);
  const copied = await c.evaluate(`navigator.clipboard.readText().then((t) => ({ clip: t, label: document.querySelector('[data-mail="copy"]').textContent }))`);
  check('"Copy email" puts the address on the clipboard and says so', copied.clip === content.contact.email && /copied/i.test(copied.label), JSON.stringify(copied));
  await key(c, 'Escape'); await sleep(200);
  const m2 = await c.evaluate(`({ menu: !!document.querySelector('.mailmenu'), focus: document.activeElement?.id })`);
  check('Escape closes the email menu and focus returns to the button', !m2.menu && m2.focus === 'mailBtn', JSON.stringify(m2));
  await click(c, mb.x, mb.y); await sleep(200);
  await click(c, 640, 600); await settle(c);
  check('a click outside closes the email menu', !(await c.evaluate('!!document.querySelector(".mailmenu")')));
  await key(c, 'Escape'); await settle(c);
  await c.evaluate('document.activeElement?.blur()');

  step('desktop: background music');
  const audioFetched = () => c.evaluate(`performance.getEntriesByType('resource').filter((r) => /\\/audio\\//.test(r.name)).map((r) => r.name.split('/').pop())`);
  const s0 = await c.evaluate(`({ pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'), credit: document.querySelector('.credits.on-page')?.textContent ?? '' })`);
  check('music is off by default, and nothing is downloaded for it', s0.pressed === 'false' && (await audioFetched()).length === 0 && (await c.evaluate('window.__sound()')).context === 'none', JSON.stringify(s0.pressed));
  check('the music credit (CC BY 4.0) is on the page', /Night on the Docks/.test(s0.credit) && /Kevin MacLeod/.test(s0.credit) && /CC BY 4\.0/.test(s0.credit), s0.credit.slice(0, 80));
  const sb = await rectOf(c, '#soundBtn');
  await click(c, sb.x, sb.y);
  for (let i = 0; i < 40 && (await c.evaluate('window.__sound()')).master < 0.95; i++) await sleep(150);
  const s1 = await c.evaluate(`window.__sound().then((g) => ({ ...g, pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'), marker: document.querySelector('.hs-music')?.getAttribute('aria-pressed'), saved: localStorage.getItem('room-sound') }))`);
  const files1 = await audioFetched();
  check('the music button turns it on: loops loaded and running, music above the rain, choice remembered',
    s1.pressed === 'true' && s1.marker === 'true' && s1.context === 'running' && s1.master >= 0.95 && s1.loops[0] > s1.loops[1] && s1.saved === '1' && files1.length === 2,
    JSON.stringify({ ...s1, files1 }));
  const gp = await c.evaluate('window.__room.screen("music")');
  await click(c, gp.x, gp.y); await sleep(1600);
  const s2 = await c.evaluate(`window.__sound().then((g) => ({ ...g, pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'), saved: localStorage.getItem('room-sound') }))`);
  check('clicking the gramophone turns it off again (fade out, then the audio context sleeps)', s2.pressed === 'false' && s2.context === 'suspended' && s2.master < 0.05 && s2.saved === '0', JSON.stringify(s2));

  step('desktop: full dossier (quick view)');
  const qb = await rectOf(c, '#quickBtn');
  await click(c, qb.x, qb.y); await sleep(400);
  const q = await c.evaluate('({ open: document.getElementById("quick").classList.contains("open"), projects: document.querySelectorAll("#quickBody .case").length, jobs: document.querySelectorAll("#quickBody .tl .ev").length })');
  check('quick view (full dossier) opens with all content', q.open && q.projects === expectedCases && q.jobs === content.experience.length, JSON.stringify(q));
  const dossierSecs = await c.evaluate('[...document.querySelectorAll("#quickBody h3.sec")].map((h) => h.textContent)');
  check('full dossier follows the marker order: summary, experience, projects, skills, CV, education, certificates, contact', dossierSecs.join() === DOSSIER_ORDER.join(), dossierSecs.join(' | '));
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
  const rc0 = await c.evaluate('window.__room.cat()');
  await c.evaluate("document.querySelector('#stage canvas')?.dispatchEvent(new Event('pointermove'))");
  await sleep(1200);
  const rc1 = await c.evaluate('window.__room.cat()');
  check('reduced motion: the cat sits still, eyes closed', rc0.exists && Math.abs(rc1.tail - rc0.tail) < 1e-6 && rc1.eyes <= 0.07, JSON.stringify({ rc0, rc1 }));
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
  step('phone: dock order, then → cases');
  const first = await c.evaluate('(() => { const b = [...document.querySelectorAll("#dock button")]; return { order: b.map((x) => x.dataset.sec), star: b[0].classList.contains("star"), stars: b.filter((x) => x.classList.contains("star")).length }; })()');
  check('phone dock follows the marker order, Experience in the highlighted first slot', first.order.join() === ORDER.join() && first.star && first.stars === 1, JSON.stringify(first));
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
  const cm = await rectOf(c, '#contactMail');
  await click(c, cm.x, cm.y); await sleep(300);
  const pm = await c.evaluate(`(() => { const m = document.querySelector('#contactMail + .mailmenu'); if (!m) return null; const r = m.getBoundingClientRect();
    return { inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, plain: [...document.querySelectorAll('#pBody dd')].some((d) => d.textContent === ${JSON.stringify(content.contact.email)}) }; })()`);
  check('phone contact sheet: the email menu opens on screen, and the address is also plain text', !!pm?.inView && pm.plain, JSON.stringify(pm));
  await shot(c, 'phone-contact');
  await key(c, 'Escape'); await sleep(200);
  await key(c, 'Escape'); await settle(c);
  const qb = await rectOf(c, '#quickBtn');
  await click(c, qb.x, qb.y); await sleep(400);
  await shot(c, 'phone-quick');
  check('no JS errors (phone)', c.errors.length === 0, c.errors.join(' | '));
});

await block('slow connection', [], async (c) => {
  step('slow connection: Save-Data on, 3g');
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '3g' } })" });
  await load(c, url(), 1280, 800);
  const t = await c.evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const scene = performance.getEntriesByType('resource').find((r) => /Scene-/.test(r.name));
    return { loadEnd: Math.round(nav.loadEventEnd), sceneStart: Math.round(scene?.startTime ?? -1) };
  })()`);
  check('on slow connections the 3D waits until the page has loaded', t.sceneStart > t.loadEnd && t.loadEnd > 0, JSON.stringify(t));
  check('no JS errors (slow connection)', c.errors.length === 0, c.errors.join(' | '));
});

await block('phone fit', [], async (c) => {
  for (const [w, h] of [[390, 844], [360, 740], [844, 390]]) {
    step(`phone fit: whole room at ${w}×${h}`);
    await load(c, url(), w, h, { mobile: true });
    await settle(c);
    await sleep(400);
    const m = await c.evaluate(MARKER_LAYOUT);
    check(`${w}×${h}: all 8 markers on screen between header and dock, none overlapping`, m.count === 8 && !m.hidden.length && !m.outside.length && !m.overlaps.length, JSON.stringify(m));
    const header = await c.evaluate(`[...document.querySelectorAll('.top .actions > *, #soundBtn')].map((e) => e.getBoundingClientRect()).every((r) => r.left >= 0 && r.right <= innerWidth)`);
    check(`${w}×${h}: every header button fits on screen`, header);
    const cat = await c.evaluate('window.__room.screen("cat")');
    check(`${w}×${h}: the cat is in view`, cat.x > 0 && cat.x < w && cat.y > m.strip[0] && cat.y < m.strip[1] && cat.z < 1, JSON.stringify(cat));
    await shot(c, `phone-fit-${w}x${h}`);
  }
  check('no JS errors (phone fit)', c.errors.length === 0, c.errors.join(' | '));
});

await block('music memory', [], async (c) => {
  step('music memory: a visitor who left the music on');
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('room-sound', '1'); sessionStorage.setItem('seeded', '1'); } } catch {}" });
  await load(c, url(), 1280, 800);
  const fetched = () => c.evaluate(`performance.getEntriesByType('resource').filter((r) => /\\/audio\\//.test(r.name)).length`);
  const m0 = await c.evaluate(`window.__sound().then((g) => ({ ...g, pressed: document.getElementById('soundBtn').getAttribute('aria-pressed') }))`);
  check('remembered "on" shows on the button but stays silent until a gesture (no autoplay, no download)', m0.pressed === 'true' && m0.context === 'none' && (await fetched()) === 0, JSON.stringify(m0));
  await click(c, 640, 40); // a click on the header, not on the music switch
  for (let i = 0; i < 40 && (await c.evaluate('window.__sound()')).master < 0.95; i++) await sleep(150);
  const m1 = await c.evaluate('window.__sound()');
  check('the first click anywhere starts it', m1.context === 'running' && m1.master >= 0.95 && (await fetched()) === 2, JSON.stringify(m1));
  check('no JS errors (music memory)', c.errors.length === 0, c.errors.join(' | '));
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
