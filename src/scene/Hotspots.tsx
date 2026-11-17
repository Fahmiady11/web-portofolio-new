import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Vector3 } from 'three';
import { SECTIONS, type SectionId } from '../sections';
import { useRoom } from '../store';
import { useSound } from '../audio/sound';
import { safe } from './fit';
import { EVIDENCE, MUSIC_ANCHOR } from './layout';

/** The marker buttons, shared between the DOM side (rendering) and the canvas side (positioning). */
export type MarkerRefs = Map<SectionId | 'music', HTMLButtonElement>;

/** Numbered evidence markers: real buttons in the page, hidden (CSS) until the tracker places them. */
export function Hotspots({ markers }: { markers: MarkerRefs }) {
  const open = useRoom((s) => s.open);
  const current = useRoom((s) => s.current);
  const setPreview = useRoom((s) => s.setPreview);
  const soundOn = useSound((s) => s.on);
  const toggleSound = useSound((s) => s.toggle);
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
        <b>{s.no}</b><span className="lbl-full">{s.label}</span><span className="lbl-short">{s.short}</span>
      </button>
    )).concat(
      // the gramophone: a small, unnumbered switch rather than a file, so keyboard users can reach it too
      <button
        key="music"
        ref={(el) => { if (el) markers.set('music', el); else markers.delete('music'); }}
        type="button"
        className="hs-music"
        data-sound
        aria-pressed={soundOn}
        aria-label="Gramophone: background music"
        title={soundOn ? 'Stop the music' : 'Play some music'}
        onClick={toggleSound}
      >
        ♪
      </button>,
    ),
    host,
  );
}

const v = new Vector3();
/** A marker's height plus a little air, px. */
const MARKER_H = 27;

/** Inside the canvas: pins each marker to its object every frame. */
export function HotspotTracker({ markers }: { markers: MarkerRefs }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const widths = useRef(new Map<SectionId | 'music', number>()).current;

  useFrame(() => {
    const { width: w, height: h } = size;
    const anyOpen = !!useRoom.getState().current;
    const placed: { x: number; y: number; w: number }[] = [];
    for (const [id, b] of markers) {
      v.copy(id === 'music' ? MUSIC_ANCHOR : EVIDENCE[id].anchor).project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      let y = (-v.y * 0.5 + 0.5) * h;
      let bw = widths.get(id);
      if (!bw) { bw = b.offsetWidth || 130; if (b.offsetWidth) widths.set(id, bw); }
      // on small screens markers can crowd: try the pin's own height first, then step above, then below,
      // and take the first spot that clears every marker already placed (earlier = more important)
      const clear = (yy: number) => !placed.some((p) => Math.abs(p.x - x) < (p.w + bw) / 2 + 2 && Math.abs(p.y - yy) < MARKER_H);
      const inStrip = (yy: number) => yy - 24 > safe.top && yy < safe.bottom;
      const options = [0, -1, -2, -3, 1, 2, 3].map((k) => y + k * MARKER_H);
      y = options.find((yy) => clear(yy) && inStrip(yy)) ?? y;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      // inside the strip between the header and the phone dock (fit.ts keeps `safe` up to date)
      const fits = v.z < 1 && x - bw / 2 > 4 && x + bw / 2 < w - 4 && y - 24 > safe.top && y < safe.bottom;
      b.style.display = fits && !anyOpen ? 'inline-flex' : '';
      if (fits) placed.push({ x, y, w: bw });
    }
  });
  return null;
}
