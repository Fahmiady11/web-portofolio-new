import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Dossier } from './components/Dossier';
import { Dock, Header } from './components/Header';
import { Panel } from './components/Panel';
import { Poster } from './components/Poster';
import { sectionById } from './sections';
import { useRoom } from './store';

// three.js, R3F and the room live in their own chunk, fetched after the page is on screen
const Scene = lazy(() => import('./scene/Scene'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
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
  const s = useRoom.getState();
  if (q === 'quick') s.openDossier();
  else if (/^case-\d+$/.test(q)) s.open('cases', Number(q.slice(5)), true);
  else if (sectionById(q)) s.open(q as Parameters<typeof s.open>[0], -1, true);
  // deep links land without the slide-in; later opens and closes animate as usual
  requestAnimationFrame(() => requestAnimationFrame(() => useRoom.setState({ instant: false })));
}

export function App() {
  const webgl = useRoom((s) => s.webgl);
  const fileOpen = useRoom((s) => s.current !== null);
  // decided after hydration: the server never renders the room
  const loadScene = webgl === 'loading' || webgl === 'ready';

  useEffect(() => {
    if (hasWebGL()) useRoom.getState().setWebGL('loading');
    else noRoom();
    openDeepLink();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useRoom.getState();
      if (s.dossierOpen && s.webgl !== 'none') s.closeDossier();
      else s.close();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
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
      {webgl !== 'none' && !fileOpen && <p className="hint">{webgl === 'ready' ? 'Drag to look around · click the evidence' : 'Turning the lights on…'}</p>}
      <Dock />
      <Panel />
      <Dossier />
    </>
  );
}
