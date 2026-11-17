// Background sound: off by default, never autoplays. The engine (and the audio files) load on the first
// "on". The choice is remembered; on a later visit the switch shows "on" but sound waits for a gesture.
import { create } from 'zustand';

const KEY = 'room-sound';

interface SoundState {
  /** What the visitor chose (remembered). */
  on: boolean;
  /** Audio is actually running. */
  playing: boolean;
  loading: boolean;
  toggle: () => void;
}

let engine: Promise<typeof import('./engine')> | null = null;
const getEngine = () => (engine ??= import('./engine'));

function remember(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode: just don't remember */ }
}

async function start() {
  if (useSound.getState().playing) return;
  useSound.setState({ loading: true });
  const e = await getEngine();
  await e.play(() => useSound.getState().on);
  useSound.setState({ loading: false, playing: useSound.getState().on });
}

async function stop() {
  useSound.setState({ playing: false });
  if (engine) await (await engine).pause();
}

export const useSound = create<SoundState>()((set, get) => ({
  on: false,
  playing: false,
  loading: false,
  toggle: () => {
    const on = !get().on;
    set({ on });
    remember(on);
    if (on) void start();
    else void stop();
  },
}));

/** After hydration: restore the choice, wait for a gesture before sounding, and go quiet in hidden tabs. */
export function initSound() {
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch { /* no storage */ }
  if (saved) {
    useSound.setState({ on: true });
    // browsers only allow sound after a gesture; the toggle's own click runs first and may turn it off
    const onGesture = () => {
      removeEventListener('click', onGesture, true);
      removeEventListener('keydown', onGesture, true);
      setTimeout(() => { if (useSound.getState().on) void start(); }, 0);
    };
    addEventListener('click', onGesture, true);
    addEventListener('keydown', onGesture, true);
  }
  document.addEventListener('visibilitychange', () => {
    const s = useSound.getState();
    if (!engine || !s.on) return;
    if (document.hidden) void engine.then((e) => e.pause(0.3)).then(() => useSound.setState({ playing: false }));
    else void start();
  });
  window.__sound = async () => (engine ? (await engine).debug() : { context: 'none', master: 0, loops: [], format: 'none' });
}
