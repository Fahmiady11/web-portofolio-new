import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { initSound } from './audio/sound';
import { Credits } from './components/Credits';
import { Dossier } from './components/Dossier';
import { Dock, Header } from './components/Header';
import { Panel } from './components/Panel';
import { Poster } from './components/Poster';
import { sectionById, stepSection } from './sections';
import { useRoom } from './store';

// three.js, R3F and the room live in their own chunk, fetched after the page is on screen
const Scene = lazy(() => import('./scene/Scene'));

/** A cheap probe: smallest possible context, released at once (three.js makes its own). */
function hasWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl', { antialias: false, depth: false, powerPreference: 'low-power' });
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Save-Data, or a 2G/3G connection: the 1 MB room waits until the page has loaded and gone idle. */
function slowConnection() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /(^|-)(2g|3g)$/.test(c.effectiveType ?? ''));
}

function whenIdle(run: () => void) {
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 5000 }) : setTimeout(run, 1500));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

/** Without WebGL (or if the room fails to start) visitors get the full dossier instead. */
function noRoom() {
  const s = useRoom.getState();
  s.setWebGL('none');
  s.close();
  s.openDossier();
  window.__room = { webgl: false };
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.warn('3D room unavailable, showing the dossier instead:', error);
    noRoom();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

/** ?open=quick | ?open=<section> | ?open=case-<n> */
function openDeepLink() {
  const q = new URLSearchParams(location.search).get('open');
  if (!q) return;
  useRoom.setState({ deepLink: true });
  const s = useRoom.getState();
  if (q === 'quick') s.openDossier();
  else if (/^case-\d+$/.test(q)) s.open('cases', Number(q.slice(5)), true);
  else if (sectionById(q)) s.open(q as Parameters<typeof s.open>[0], -1, true);
  // deep links land without the slide-in; later opens and closes animate as usual
  requestAnimationFrame(() => requestAnimationFrame(() => useRoom.setState({ instant: false })));
}

/** On phones, a one-time nudge above the dock once the room is live; gone after 7 s or the first tap. */
function usePhoneHint(live: boolean) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!live) return;
    const hide = () => setDismissed(true);
    const timer = setTimeout(hide, 7000);
    addEventListener('pointerdown', hide, { once: true });
    const unsub = useRoom.subscribe((s) => { if (s.current || s.dossierOpen) hide(); });
    return () => { clearTimeout(timer); removeEventListener('pointerdown', hide); unsub(); };
  }, [live]);
  return live && !dismissed;
}

export function App() {
  const webgl = useRoom((s) => s.webgl);
  const fileOpen = useRoom((s) => s.current !== null);
  const phoneHint = usePhoneHint(webgl === 'ready');
  // decided after hydration: the server never renders the room
  const loadScene = webgl === 'loading' || webgl === 'ready';

  useEffect(() => {
    openDeepLink();
    initSound();
    // probe after the hydrated page has painted, so the probe never delays first paint
    const probe = setTimeout(() => {
      if (!hasWebGL()) noRoom();
      else if (slowConnection()) whenIdle(() => useRoom.getState().setWebGL('loading'));
      else useRoom.getState().setWebGL('loading');
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      const s = useRoom.getState();
      if (e.key === 'Escape') {
        if (s.dossierOpen && s.webgl !== 'none') s.closeDossier();
        else s.close();
        return;
      }
      if (!e.key.startsWith('Arrow') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || s.dossierOpen) return;
      const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      // with a file open, ← → walk to the previous / next piece of evidence (↑ ↓ keep scrolling the file)
      if (s.current) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        s.open(stepSection(s.current, back ? -1 : 1).id);
        return;
      }
      // in the room, arrows move between the evidence markers on screen
      const active = document.activeElement;
      if (active && active !== document.body && !active.matches('#hotspots .hs')) return;
      const markers = [...document.querySelectorAll<HTMLButtonElement>('#hotspots .hs')].filter((b) => b.offsetParent);
      if (!markers.length) return;
      e.preventDefault();
      const i = markers.indexOf(active as HTMLButtonElement);
      const next = i < 0 ? (back ? markers.length - 1 : 0) : (i + (back ? -1 : 1) + markers.length) % markers.length;
      markers[next].focus();
    };
    addEventListener('keydown', onKey);
    return () => { clearTimeout(probe); removeEventListener('keydown', onKey); };
  }, []);

  return (
    <>
      <div id="stage" aria-hidden="true">
        <Poster hidden={webgl === 'ready'} />
        {loadScene && (
          <SceneBoundary>
            <Suspense fallback={null}><Scene /></Suspense>
          </SceneBoundary>
        )}
      </div>
      <div className="grain" aria-hidden="true" />
      <Header />
      <div id="hotspots" />
      {webgl !== 'none' && !fileOpen && <p className="hint">{webgl === 'ready' ? 'Drag to look around · click the evidence · ← → to browse' : 'Turning the lights on…'}</p>}
      {phoneHint && <p className="phint" role="status">Tap the evidence, or pick a file below</p>}
      <Dock />
      <Credits className="on-page" />
      {/* separate boundaries let React hydrate the big, mostly hidden file contents in small slices */}
      <Suspense fallback={null}><Panel /></Suspense>
      <Suspense fallback={null}><Dossier /></Suspense>
    </>
  );
}
