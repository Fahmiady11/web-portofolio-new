// Where everything sits in the room (metres, y up; the back wall is at z = -3.7, the left wall at x = -3.7).
// Objects, camera views and evidence markers all read from here, so an object can be swapped for a
// modelled .glb without touching the camera or the markers.
import { Vector3 } from 'three';
import { cases } from '../content/site';
import type { SectionId } from '../sections';

export const ROOM = { size: 7.4, height: 4 };
export const WIN = { x: -3.6, y: 2.05, z: -0.15, w: 1.7, h: 1.6 };
export const DESK = { x: 0.1, y: 0.8, z: -1.6 };
/** Height of the desk's writing surface. */
export const TOP = DESK.y + 0.06;

/** The CASE FILES wall. Its canvas texture uses CW_PX pixels per metre. */
export const CW = { x: -0.3, y: 2.38, z: -3.56, w: 4.4, h: 2.1 };
export const CW_PX = 500;
export const CASE_CARD = { w: 470, h: 440, cols: 4 };

/** The evidence board is drawn flat (BOARD, BOARD_PX px per metre) and then hung on the left wall at BOARD_AT. */
export const BOARD = { w: 2.6, h: 1.55 };
export const BOARD_PX = 600;
export const BOARD_AT = { x: -3.56, y: 2.3, z: -2.3, scale: 0.8 };

export const DIPLOMA = { x: -3.1, y: 2.45, z: -3.57 };
export const CABINET = { x: 3.1, z: -3.05 };
export const EVIDENCE_BOX = { x: CABINET.x, y: 1.32, z: CABINET.z };
export const COAT_RACK = { x: -3.05, z: 2.75 };

type XYZ = [number, number, number];

/** A light in the room. The scene and the Blender bake (scripts/blender) both read these. */
export interface LightSpec {
  kind: 'spot' | 'point' | 'directional' | 'hemisphere';
  color: string;
  /** three.js units (physically based, as in the scene); the bake script converts. */
  intensity: number;
  position?: XYZ;
  target?: XYZ;
  distance?: number;
  angle?: number;
  penumbra?: number;
  decay?: number;
  /** hemisphere only */
  groundColor?: string;
  /** Casts a shadow in the live scene. */
  shadow?: boolean;
  /** Moves at runtime (flicker, lightning): left out of the bake. */
  dynamic?: boolean;
}

export const LIGHTS = {
  hemisphere: { kind: 'hemisphere', color: '#5a6a90', groundColor: '#2a180c', intensity: 0.75 },
  /** keeps the walls readable */
  wash: { kind: 'point', color: '#ffb070', intensity: 4, distance: 8, decay: 1.5, position: [0.6, 3.3, -1.6] },
  /** moonlight through the blinds: projects the slat pattern into the room */
  moon: { kind: 'spot', color: '#9db4ff', intensity: 160, distance: 16, angle: 0.32, penumbra: 0.25, decay: 1.2, position: [-7.2, 4.4, 0.4], target: [0, 0.7, -1.2], shadow: true },
  front: { kind: 'directional', color: '#7d7090', intensity: 0.8, position: [5, 6, 6] },
  lightning: { kind: 'point', color: '#bcd2ff', intensity: 60, distance: 12, decay: 1.2, position: [-4.5, 2.6, -0.2], dynamic: true },
  lamp: { kind: 'spot', color: '#ffb45c', intensity: 26, distance: 4.5, angle: 1.05, penumbra: 0.65, decay: 1.4, position: [-0.95, TOP + 0.36, -1.9], target: [-0.3, TOP, -1.55], shadow: true },
  lampFill: { kind: 'point', color: '#ff9a3d', intensity: 2.2, distance: 5, decay: 1.6, position: [-0.6, TOP + 0.5, -1.3] },
  neon: { kind: 'point', color: '#ff3030', intensity: 5, distance: 4.5, decay: 1.6, position: [CW.x, CW.y + CW.h / 2 + 0.3, CW.z + 0.5] },
  pictureLeft: { kind: 'spot', color: '#ffe3b8', intensity: 11, distance: 6, angle: 0.75, penumbra: 0.6, decay: 1.2, position: [CW.x - 1.2, 3.95, CW.z + 1.3], target: [CW.x - 1.08, CW.y - 0.2, CW.z] },
  pictureRight: { kind: 'spot', color: '#ffe3b8', intensity: 11, distance: 6, angle: 0.75, penumbra: 0.6, decay: 1.2, position: [CW.x + 1.2, 3.95, CW.z + 1.3], target: [CW.x + 1.08, CW.y - 0.2, CW.z] },
} satisfies Record<string, LightSpec>;

/** spotLight / pointLight props for a light spec (target and shadow are handled by the caller). */
export const lightProps = (l: LightSpec) => ({
  color: l.color, intensity: l.intensity, distance: l.distance, angle: l.angle, penumbra: l.penumbra, decay: l.decay, position: l.position,
});

export interface View { pos: Vector3; target: Vector3 }

/** Default camera: the case wall fills the frame. Portrait screens get a closer, taller framing. */
export const HOME: View = { pos: new Vector3(3.0, 3.7, 5.9), target: new Vector3(-0.2, 1.95, -2.0) };
export const HOME_PORTRAIT: View = { pos: new Vector3(0.6, 3.1, 5.6), target: new Vector3(-0.25, 1.6, -2.4) };

/** Where the intro camera move starts: further back and higher, looking at the same spot as home. */
export const introStart = (home: View): View => ({
  pos: home.target.clone().add(home.pos.clone().sub(home.target).multiplyScalar(1.45)).add(new Vector3(0, 0.9, 0)),
  target: home.target.clone().add(new Vector3(0, 0.35, 0)),
});

/** canvas px on the case wall → world position just in front of it */
export const caseWallPoint = (px: number, py: number) =>
  new Vector3(CW.x - CW.w / 2 + px / CW_PX, CW.y + CW.h / 2 - py / CW_PX, CW.z + 0.04);

const cwCanvas = { w: CW.w * CW_PX, h: CW.h * CW_PX };
const ROWS = 2;
const gapY = (cwCanvas.h - ROWS * CASE_CARD.h) / (ROWS + 1);
/** How many photos sit on each row: the top row fills first, the rest are centred below it. */
const perRow = (row: number) => Math.max(0, Math.min(CASE_CARD.cols, cases.length - row * CASE_CARD.cols));
/** Where case i is pinned on the case wall canvas, in px. */
const gapX = (cwCanvas.w - CASE_CARD.cols * CASE_CARD.w) / (CASE_CARD.cols + 1);
export const caseRect = (i: number) => {
  const row = Math.floor(i / CASE_CARD.cols), col = i % CASE_CARD.cols, n = perRow(row) || CASE_CARD.cols;
  const left = (cwCanvas.w - (n * CASE_CARD.w + (n - 1) * gapX)) / 2;
  return { x: left + col * (CASE_CARD.w + gapX), y: gapY + row * (CASE_CARD.h + gapY), w: CASE_CARD.w, h: CASE_CARD.h };
};

/** The camera close-up on one case photo. */
export function caseView(i: number, phone: boolean): View {
  const r = caseRect(i);
  const target = caseWallPoint(r.x + r.w / 2, r.y + r.h / 2);
  return { pos: target.clone().add(new Vector3(0.25, 0.1, phone ? 2.6 : 1.7)), target };
}

export interface Evidence {
  /** Where the numbered marker is pinned. */
  anchor: Vector3;
  /** Camera view when the file is open. */
  view: View;
}

export const EVIDENCE: Record<SectionId, Evidence> = {
  cases: {
    anchor: caseWallPoint(CW_PX * 0.55, -4),
    view: { pos: new Vector3(CW.x + 0.5, CW.y + 0.15, CW.z + 4.9), target: new Vector3(CW.x, CW.y, CW.z) },
  },
  board: {
    // pinned towards the board's near end, so its label clears the diploma's marker to its right
    anchor: new Vector3(BOARD_AT.x + 0.05, BOARD_AT.y + 0.72, BOARD_AT.z + 0.8),
    view: { pos: new Vector3(0.4, 2.3, -2.1), target: new Vector3(BOARD_AT.x, BOARD_AT.y, BOARD_AT.z) },
  },
  evidence: {
    anchor: new Vector3(EVIDENCE_BOX.x - 0.05, EVIDENCE_BOX.y + 0.5, EVIDENCE_BOX.z + 0.1),
    view: { pos: new Vector3(1.7, 2.2, -0.9), target: new Vector3(EVIDENCE_BOX.x, EVIDENCE_BOX.y + 0.15, EVIDENCE_BOX.z) },
  },
  about: {
    anchor: new Vector3(0.0, TOP + 0.6, -1.95),
    view: { pos: new Vector3(0.35, 1.75, -0.25), target: new Vector3(0.05, TOP + 0.25, -1.8) },
  },
  wall: {
    anchor: new Vector3(2.71, 3.55, -3.55),
    view: { pos: new Vector3(2.2, 2.45, -0.9), target: new Vector3(2.71, 2.5, -3.58) },
  },
  record: {
    anchor: new Vector3(DIPLOMA.x + 0.15, DIPLOMA.y + 0.42, DIPLOMA.z),
    view: { pos: new Vector3(-2.4, 2.3, -0.9), target: new Vector3(DIPLOMA.x, DIPLOMA.y - 0.1, DIPLOMA.z) },
  },
  phone: {
    anchor: new Vector3(1.25, TOP + 0.5, -2.0),
    view: { pos: new Vector3(1.7, 1.7, -0.75), target: new Vector3(1.15, TOP + 0.08, -1.95) },
  },
  dossier: {
    anchor: new Vector3(-0.5, TOP + 0.2, -1.25),
    view: { pos: new Vector3(-0.2, 1.75, -0.4), target: new Vector3(-0.45, TOP, -1.35) },
  },
};
