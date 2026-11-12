// Where everything sits in the room (metres, y up; the back wall is at z = -3.7, the left wall at x = -3.7).
// Objects, camera views and evidence markers all read from here, so an object can be swapped for a
// modelled .glb without touching the camera or the markers.
import { Vector3 } from 'three';
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

export interface View { pos: Vector3; target: Vector3 }

/** Default camera: the case wall fills the frame. Portrait screens get a closer, taller framing. */
export const HOME: View = { pos: new Vector3(3.0, 3.7, 5.9), target: new Vector3(-0.2, 1.95, -2.0) };
export const HOME_PORTRAIT: View = { pos: new Vector3(0.6, 3.1, 5.6), target: new Vector3(-0.25, 1.6, -2.4) };

/** canvas px on the case wall → world position just in front of it */
export const caseWallPoint = (px: number, py: number) =>
  new Vector3(CW.x - CW.w / 2 + px / CW_PX, CW.y + CW.h / 2 - py / CW_PX, CW.z + 0.04);

const cwCanvas = { w: CW.w * CW_PX, h: CW.h * CW_PX };
const gapX = (cwCanvas.w - CASE_CARD.cols * CASE_CARD.w) / (CASE_CARD.cols + 1);
const gapY = (cwCanvas.h - 2 * CASE_CARD.h) / 3;
/** Where case i is pinned on the case wall canvas, in px. */
export const caseRect = (i: number) => ({
  x: gapX + (i % CASE_CARD.cols) * (CASE_CARD.w + gapX),
  y: gapY + Math.floor(i / CASE_CARD.cols) * (CASE_CARD.h + gapY),
  w: CASE_CARD.w,
  h: CASE_CARD.h,
});

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
    anchor: new Vector3(BOARD_AT.x + 0.05, BOARD_AT.y + 0.72, BOARD_AT.z),
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
    anchor: new Vector3(DIPLOMA.x, DIPLOMA.y + 0.42, DIPLOMA.z),
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
