import type { SectionId } from './sections';

type ScreenPoint = { x: number; y: number; z: number };

declare global {
  interface Window {
    /** Set once the room is decided: hooks for tests/interactions.mjs, or { webgl: false } for the fallback. */
    __room?: {
      webgl: boolean;
      screen?: (id: SectionId) => ScreenPoint;
      cam?: () => number[];
      current?: () => SectionId | null;
      caseCard?: (i: number) => ScreenPoint;
      busy?: () => boolean;
    };
  }
}
