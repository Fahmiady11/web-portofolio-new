import type { Object3D } from 'three';
import type { SectionId } from '../sections';

/** Pieces currently shown from a modelled .glb instead of procedurally (for the test hooks). */
export const loadedModels = new Set<string>();

/** The main object of each section (registered by <Interactive>), for the test hooks. */
export const tracked = new Map<SectionId, Object3D>();

/** Sections whose object is lit up right now (hover or keyboard focus). */
export function glowing() {
  return [...tracked].filter(([, o]) => {
    let lit = false;
    o.traverse((m) => { if (m.userData.base) lit = true; });
    return lit;
  }).map(([id]) => id);
}
