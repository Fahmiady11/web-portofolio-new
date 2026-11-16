import { create } from 'zustand';
import type { SectionId } from './sections';

export type WebGLState = 'unknown' | 'loading' | 'ready' | 'none';

interface RoomState {
  /** The open case file, or null when the panel is closed. */
  current: SectionId | null;
  /** The last opened section; the panel keeps showing it while it slides out. */
  shown: SectionId | null;
  /** Case to scroll to and zoom onto inside the cases panel, or -1. */
  focusCase: number;
  /** Bumped on every open, so re-opening the same file still re-focuses it. */
  openCount: number;
  /** Jump straight there (deep links) instead of animating. */
  instant: boolean;
  dossierOpen: boolean;
  webgl: WebGLState;
  /** The visit started from a ?open= link: no intro camera move. */
  deepLink: boolean;
  /** Evidence whose marker has keyboard focus: its object glows as if hovered. */
  preview: SectionId | null;
  open: (id: SectionId, focusCase?: number, instant?: boolean) => void;
  close: () => void;
  openDossier: () => void;
  closeDossier: () => void;
  setWebGL: (s: WebGLState) => void;
  setPreview: (id: SectionId | null) => void;
}

export const useRoom = create<RoomState>()((set) => ({
  current: null,
  shown: null,
  focusCase: -1,
  openCount: 0,
  instant: false,
  dossierOpen: false,
  webgl: 'unknown',
  deepLink: false,
  preview: null,
  open: (id, focusCase = -1, instant = false) =>
    set((s) => ({ current: id, shown: id, focusCase, instant, openCount: s.openCount + 1 })),
  close: () => set({ current: null, focusCase: -1, instant: false }),
  openDossier: () => set({ dossierOpen: true }),
  closeDossier: () => set({ dossierOpen: false }),
  setWebGL: (webgl) => set({ webgl }),
  setPreview: (preview) => set({ preview }),
}));
