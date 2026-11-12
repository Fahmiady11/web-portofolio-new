import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';

/** The typewriter face, used for every label painted into the room. */
export const TYPE = '"Special Elite", "Courier New", monospace';
export const MONO = '"IBM Plex Mono", ui-monospace, monospace';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** Paints a texture once with the 2D canvas API. */
export function canvasTexture(w: number, h: number, draw: Draw, opts: { repeat?: [number, number]; data?: boolean } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = opts.data ? NoColorSpace : SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  return t;
}

/** Resolves with the image, or null if it fails, so one missing photo never blocks the room. */
export const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((ok) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

/** Gold engraved plate with two centred lines. */
export const brassPlate = (line1: string, size1: number, line2?: string, size2 = 22): Draw => (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#e8c46a');
  gr.addColorStop(1, '#9c7428');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2b1a08';
  g.textAlign = 'center';
  g.font = `${size1}px ${TYPE}`;
  g.fillText(line1, W / 2, line2 ? 44 : 62);
  if (line2) {
    g.font = `${size2}px ${TYPE}`;
    g.fillText(line2, W / 2, 80);
  }
};
