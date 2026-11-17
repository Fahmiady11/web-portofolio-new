import type { SectionId } from './sections';

type ScreenPoint = { x: number; y: number; z: number };

declare global {
  interface Window {
    /** Sound graph state for tests/interactions.mjs. */
    __sound?: () => Promise<{ context: string; master: number; loops: number[]; format: string }>;
    /** Set once the room is decided: hooks for tests/interactions.mjs, or { webgl: false } for the fallback. */
    __room?: {
      webgl: boolean;
      screen?: (id: SectionId | 'music' | 'cat') => ScreenPoint;
      cam?: () => number[];
      current?: () => SectionId | null;
      caseCard?: (i: number) => ScreenPoint;
      busy?: () => boolean;
      glowing?: () => (SectionId | 'music' | 'cat')[];
      models?: () => string[];
      quality?: () => 'high' | 'medium' | 'low';
      bloom?: () => boolean;
      cat?: () => { exists: boolean; tail: number; eyes: number };
      look?: (pos: [number, number, number], target: [number, number, number]) => void;
    };
  }
}
