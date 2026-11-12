import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { WIN } from '../layout';
import { std } from '../materials';
import { Box, Plane } from '../parts';
import { reduceMotion } from '../quality';
import { canvasTexture, TYPE } from '../textures';

const W = 340, H = 320;

function drawCity() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1424'); gr.addColorStop(1, '#1b2338'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { g.fillStyle = '#05070d'; const w = 20 + Math.random() * 36, h = 60 + Math.random() * 180; g.fillRect(Math.random() * W, H - h, w, h); }
  for (let i = 0; i < 70; i++) {
    const col = ['#f5b342', '#ff6b6b', '#8fd3ff', '#ffe08a'][i % 4]; const r = 3 + Math.random() * 9; const x = Math.random() * W, y = 120 + Math.random() * 200;
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.55; g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.globalAlpha = 1; g.font = '600 26px ' + TYPE; g.fillStyle = '#ff3b3b'; g.shadowColor = '#ff3b3b'; g.shadowBlur = 14; g.fillText('HOTEL', 30, 170); g.shadowBlur = 0;
  return c;
}

/** The glass: the city behind running rain drops, repainted every other frame by draw(). */
function createRain() {
    const city = drawCity();
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace;
    const drops = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 5, l: 6 + Math.random() * 14 }));
    const beads = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.4 }));
    const draw = () => {
      const g = canvas.getContext('2d')!;
      g.drawImage(city, 0, 0);
      g.fillStyle = 'rgba(160,190,230,.08)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(200,220,255,.35)'; g.lineWidth = 1.2;
      for (const d of drops) { g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - 1, d.y + d.l); g.stroke(); d.y += d.v; if (d.y > H + 10) { d.y = -20; d.x = Math.random() * W; } }
      for (const b of beads) { g.fillStyle = 'rgba(220,235,255,.35)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(b.x - b.r / 3, b.y - b.r / 2, 1, 1); }
      tex.needsUpdate = true;
    };
    draw();
    return { tex, draw, glass: new MeshBasicMaterial({ map: tex, toneMapped: false }) };
}

const materials = () => ({
    frame: std('#1d140c'),
    slat: std('#cbbf9f', { roughness: 0.5 }),
    rail: std('#a89a78'),
    letters: new MeshBasicMaterial({
      transparent: true, toneMapped: false, depthWrite: false,
      map: canvasTexture(512, 128, (g, w) => {
        g.font = '42px ' + TYPE; g.fillStyle = 'rgba(214,170,80,.9)'; g.textAlign = 'center'; g.fillText('F. A. SUSILO', w / 2, 54);
        g.font = '24px ' + TYPE; g.fillText('SOFTWARE  DEVELOPER', w / 2, 96);
      }),
    }),
  });

/** The city at night through rain-streaked glass, half behind venetian blinds, with the name in gold leaf. */
export function Window() {
  const rain = useMemo(() => createRain(), []);
  const m = useMemo(() => materials(), []);
  const frame = useRef(0);
  useFrame(() => {
    if (reduceMotion) return;
    if (++frame.current % 2 === 0) rain.draw();
  });

  const { x, y, z, w, h } = WIN;
  const facing: [number, number, number] = [0, Math.PI / 2, 0];
  return (
    <group>
      <Plane size={[w, h]} material={rain.glass} position={[x + 0.12, y, z]} rotation={facing} />
      <Box size={[0.1, 0.1, w + 0.2]} material={m.frame} position={[x + 0.14, y + h / 2 + 0.05, z]} />
      <Box size={[0.18, 0.08, w + 0.3]} material={m.frame} position={[x + 0.18, y - h / 2 - 0.04, z]} />
      <Box size={[0.1, h + 0.2, 0.1]} material={m.frame} position={[x + 0.14, y, z - w / 2 - 0.05]} />
      <Box size={[0.1, h + 0.2, 0.1]} material={m.frame} position={[x + 0.14, y, z + w / 2 + 0.05]} />
      <Box size={[0.06, h, 0.05]} material={m.frame} position={[x + 0.14, y, z]} />
      {/* tilted slats, lifted a little so the rain still shows at the bottom */}
      {Array.from({ length: 15 }, (_, i) => (
        <Box key={i} size={[0.07, 0.012, w]} material={m.slat} castShadow={false} position={[x + 0.26, y + h / 2 - 0.06 - i * 0.075, z]} rotation={[0, 0, 0.75]} />
      ))}
      <Box size={[0.08, 0.06, w + 0.1]} material={m.rail} position={[x + 0.26, y + h / 2 - 0.01, z]} />
      {/* gold lettering on the glass, readable from inside */}
      <Plane size={[1.2, 0.3]} material={m.letters} position={[x + 0.2, y - 0.48, z]} rotation={facing} />
    </group>
  );
}
