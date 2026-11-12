import type { Object3D } from 'three';
import type { SectionId } from '../sections';

/** The main object of each section (registered by <Interactive>), for the test hooks. */
export const tracked = new Map<SectionId, Object3D>();
