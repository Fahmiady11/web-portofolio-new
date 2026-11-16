import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Vector3 } from 'three';
import { SECTIONS, type SectionId } from '../sections';
import { useRoom } from '../store';
import { EVIDENCE } from './layout';

/** The marker buttons, shared between the DOM side (rendering) and the canvas side (positioning). */
export type MarkerRefs = Map<SectionId, HTMLButtonElement>;

/** Numbered evidence markers: real buttons in the page, hidden (CSS) until the tracker places them. */
export function Hotspots({ markers }: { markers: MarkerRefs }) {
  const open = useRoom((s) => s.open);
  const current = useRoom((s) => s.current);
  const setPreview = useRoom((s) => s.setPreview);
  const host = document.getElementById('hotspots');
  if (!host) return null;
  return createPortal(
    SECTIONS.map((s) => (
      <button
        key={s.id}
        ref={(el) => { if (el) markers.set(s.id, el); else markers.delete(s.id); }}
        type="button"
        className={'hs' + (s.id === 'cases' ? ' star' : '') + (current === s.id ? ' on' : '')}
        data-sec={s.id}
        aria-label={`Open ${s.title}`}
        onClick={() => open(s.id)}
        onFocus={() => setPreview(s.id)}
        onBlur={() => setPreview(null)}
      >
        <b>{s.no}</b>{s.label}
      </button>
    )),
    host,
  );
}

const v = new Vector3();

/** Inside the canvas: pins each marker to its object every frame. */
export function HotspotTracker({ markers }: { markers: MarkerRefs }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const widths = useRef(new Map<SectionId, number>()).current;

  useFrame(() => {
    const { width: w, height: h } = size;
    const anyOpen = !!useRoom.getState().current;
    for (const [id, b] of markers) {
      v.copy(EVIDENCE[id].anchor).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      // keep the whole marker on screen and clear of the header; the open file covers the scene
      let bw = widths.get(id);
      if (!bw) { bw = b.offsetWidth || 130; if (b.offsetWidth) widths.set(id, bw); }
      const fits = v.z < 1 && x - bw / 2 > 4 && x + bw / 2 < w - 4 && y > 110 && y < h - 10;
      b.style.display = fits && !anyOpen ? 'inline-flex' : '';
    }
  });
  return null;
}
