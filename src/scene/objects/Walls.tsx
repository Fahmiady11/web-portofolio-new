import { useMemo } from 'react';
import { canvasTexture } from '../textures';
import { std } from '../materials';
import { Box, type V3 } from '../parts';
import { ROOM } from '../layout';

const materials = () => ({
    paper: std('#fff', {
      roughness: 0.9,
      map: canvasTexture(512, 512, (g, W, H) => {
        g.fillStyle = '#26302b'; g.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 32) { g.fillStyle = x % 64 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.08)'; g.fillRect(x, 0, 16, H); }
        for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      }, { repeat: [4, 2] }),
    }),
    wainscot: std('#3b2616', { roughness: 0.6 }),
    rail: std('#2a1a0e'),
  });

/** Striped green wallpaper over dark wood wainscoting, on the back and left walls. */
export function Walls() {
  const m = useMemo(() => materials(), []);
  const half = ROOM.size / 2;
  return (
    <>
      <Wall along="x" position={[0, 0, -half]} m={m} />
      <Wall along="z" position={[-half, 0, 0]} m={m} />
    </>
  );
}

function Wall({ along, position, m }: { along: 'x' | 'z'; position: V3; m: ReturnType<typeof materials> }) {
  const w = ROOM.size;
  // size and offset along the wall's own axes: [along, up, out of the wall]
  const sized = (a: number, h: number, t: number): V3 => (along === 'x' ? [a, h, t] : [t, h, a]);
  const out = (d: number): V3 => (along === 'x' ? [0, 0, d] : [d, 0, 0]);
  const at = (y: number, d: number): V3 => { const o = out(d); return [o[0], y, o[2]]; };
  return (
    <group position={position}>
      <Box size={sized(w, ROOM.height, 0.2)} material={m.paper} position={at(2, 0)} castShadow={false} />
      <Box size={sized(w, 1.05, 0.06)} material={m.wainscot} position={at(0.52, 0.12)} castShadow={false} />
      <Box size={sized(w, 0.06, 0.1)} material={m.rail} position={at(1.06, 0.14)} castShadow={false} />
    </group>
  );
}
