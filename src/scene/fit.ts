// Phone framing: on small screens the default view is fitted so every piece of evidence (and its marker)
// sits in the visible strip between the header and the dock, whatever the aspect. Desktop keeps its view.
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import type { View } from './layout';

/** The part of the screen not covered by the header or the phone dock, in CSS px. Kept fresh on resize. */
export const safe = { top: 110, bottom: 790 };

/** Small screens (portrait phones, landscape phones, narrow windows) get the fitted view and short labels. */
export const isCompact = (w: number, h: number) => w < 760 || h < 500;

export function measureSafe(h: number) {
  const bottomOf = (sel: string) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0;
  const visibleTop = (sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || getComputedStyle(el).display === 'none') return Infinity;
    return el.getBoundingClientRect().top;
  };
  safe.top = Math.max(bottomOf('.top .brand'), bottomOf('.top .actions'), 0) + 6;
  safe.bottom = Math.min(h - 4, visibleTop('#dock'), visibleTop('.credits.on-page')) - 6;
}

const MARKER_HALF = 58; // half a compact marker's width, px
const MARKER_TALL = 30; // a marker stands this far above its pin, px
const v = new Vector3();

/**
 * A home view looking the same way as `from`, pulled back (and re-aimed) just enough that every box and
 * every marker pin fits inside the safe strip at this aspect.
 */
export function fitView(from: View, fov: number, w: number, h: number, boxes: Box3[], pins: Vector3[]): View {
  const cam = new PerspectiveCamera(fov, w / h, 0.1, 100);
  const dir = from.pos.clone().sub(from.target).normalize();
  const all = new Box3();
  boxes.forEach((b) => all.union(b));
  const target = all.getCenter(new Vector3());
  const corners = boxes.flatMap((b) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new Vector3(
    i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)));

  const place = (d: number) => {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  };
  const toPx = (p: Vector3) => { v.copy(p).project(cam); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z }; };
  /** Screen bounds of everything, with each pin widened to its marker's size. */
  const bounds = () => {
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (const p of corners) { const s = toPx(p); l = Math.min(l, s.x); r = Math.max(r, s.x); t = Math.min(t, s.y); b = Math.max(b, s.y); }
    for (const p of pins) { const s = toPx(p); l = Math.min(l, s.x - MARKER_HALF); r = Math.max(r, s.x + MARKER_HALF); t = Math.min(t, s.y - MARKER_TALL); b = Math.max(b, s.y); }
    return { l, r, t, b };
  };
  const fits = () => { const k = bounds(); return k.l >= 4 && k.r <= w - 4 && k.t >= safe.top && k.b <= safe.bottom; };

  let d = from.pos.distanceTo(from.target);
  for (let pass = 0; pass < 4; pass++) {
    // the shortest distance that fits (fitting only gets easier further away)
    let lo = 2, hi = 40;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; place(mid); if (fits()) hi = mid; else lo = mid; }
    d = hi;
    place(d);
    // then centre the content in the safe strip, and fit again
    const k = bounds();
    const worldPerPx = (2 * d * Math.tan((fov * Math.PI) / 360)) / h;
    const up = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const right = new Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    target.addScaledVector(up, ((k.t + k.b) / 2 - (safe.top + safe.bottom) / 2) * -worldPerPx);
    target.addScaledVector(right, ((k.l + k.r) / 2 - w / 2) * worldPerPx);
  }
  place(d);
  return { pos: cam.position.clone(), target };
}
