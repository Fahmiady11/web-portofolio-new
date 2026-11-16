import { useMemo } from 'react';
import { CircleGeometry, DoubleSide } from 'three';
import { TOP } from '../layout';
import { M, std } from '../materials';
import { Box, Cyl, Plane } from '../parts';
import { canvasTexture, TYPE } from '../textures';
import { Interactive } from '../interactive';
import { Swappable } from '../Swappable';

const KEYS = 'QWERTYUIOPASDFGHJKLZXCVBNM.,-';
const STATEMENT = ['STATEMENT OF THE SUBJECT', '', 'NAME: M. FAHMI ADY SUSILO', 'OCCUPATION: SOFTWARE DEV.', 'EMPLOYER: SENTRA VIDYA', 'BASE: LAMONGAN, ID', '', 'Builds systems used by', '400+ universities.', '', 'Click to read more_'];

/** Typewriter with the subject's statement in it: opens the profile. */
export function Typewriter() {
  const m = useMemo(() => ({
    body: std('#151515', { roughness: 0.35, metalness: 0.3 }),
    keys: std('#fff', {
      roughness: 0.6,
      map: canvasTexture(512, 256, (g, W, H) => {
        g.fillStyle = '#101010'; g.fillRect(0, 0, W, H);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 11 - (r === 3 ? 4 : 0); c++) {
          const x = 24 + c * 43 + r * 14, y = 24 + r * 54;
          g.fillStyle = '#d8d0bf'; g.beginPath(); g.arc(x + 16, y + 16, 17, 0, 7); g.fill();
          g.fillStyle = '#111'; g.font = '18px ' + TYPE; g.textAlign = 'center'; g.fillText(KEYS[(r * 11 + c) % KEYS.length], x + 16, y + 22);
        }
      }),
    }),
    sheet: std('#fff', {
      roughness: 0.9, side: DoubleSide,
      map: canvasTexture(400, 520, (g, W, H) => {
        g.fillStyle = '#f2ead6'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#1b1b1b'; g.font = '22px ' + TYPE;
        STATEMENT.forEach((l, i) => g.fillText(l, 26, 48 + i * 40));
      }),
    }),
  }), []);
  return (
    <Interactive id="about">
      <Swappable model="typewriter">
        <Box size={[0.62, 0.14, 0.42]} radius={0.04} material={m.body} position={[0.05, TOP + 0.07, -1.72]} />
        <Cyl top={0.05} height={0.72} segments={16} material={m.body} position={[0.05, TOP + 0.2, -1.88]} rotation={[0, 0, Math.PI / 2]} />
      </Swappable>
      {/* painted labels stay live over a modelled body too */}
      <Plane size={[0.56, 0.24]} material={m.keys} position={[0.05, TOP + 0.16, -1.6]} rotation={[-Math.PI / 2 + 0.35, 0, 0]} />
      <Plane size={[0.34, 0.44]} material={m.sheet} position={[0.05, TOP + 0.42, -1.95]} rotation={[-0.25, 0, 0]} />
    </Interactive>
  );
}

/** Rotary telephone: opens the contact file. */
export function Telephone() {
  const m = useMemo(() => ({
    dial: std('#fff', {
      map: canvasTexture(256, 256, (g, W) => {
        g.fillStyle = '#e9e1cf'; g.beginPath(); g.arc(W / 2, W / 2, 120, 0, 7); g.fill();
        g.fillStyle = '#111'; g.font = '22px ' + TYPE; g.textAlign = 'center';
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2.4 + i * 0.52; g.fillText(String((i + 1) % 10), W / 2 + Math.cos(a) * 88, W / 2 + Math.sin(a) * 88 + 8); }
        g.fillStyle = '#b3261e'; g.beginPath(); g.arc(W / 2, W / 2, 34, 0, 7); g.fill();
      }),
    }),
    dialGeo: new CircleGeometry(0.085, 32),
  }), []);
  return (
    <Interactive id="phone">
      <Swappable model="telephone">
        <Box size={[0.3, 0.1, 0.26]} radius={0.05} material={M.bakelite} position={[1.15, TOP + 0.05, -1.95]} />
        <mesh material={M.bakelite} position={[1.15, TOP + 0.15, -2.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.035, 0.26, 6, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={M.bakelite} position={[1.15 + s * 0.15, TOP + 0.15, -2.0]} castShadow receiveShadow>
            <sphereGeometry args={[0.055, 14, 10]} />
          </mesh>
        ))}
      </Swappable>
      <mesh geometry={m.dialGeo} material={m.dial} position={[1.15, TOP + 0.13, -1.86]} rotation={[-Math.PI / 2 + 0.5, 0, 0]} receiveShadow />
    </Interactive>
  );
}
