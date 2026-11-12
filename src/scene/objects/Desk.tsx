import { useMemo } from 'react';
import { DESK } from '../layout';
import { M, std } from '../materials';
import { Box, Plane } from '../parts';
import { brassPlate, canvasTexture } from '../textures';

const materials = () => ({
    wood: std('#fff', {
      roughness: 0.45,
      map: canvasTexture(512, 256, (g, W, H) => {
        g.fillStyle = '#4a2c17'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 70; i++) {
          g.strokeStyle = `rgba(${20 + Math.random() * 30},${10 + Math.random() * 15},5,${0.25 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2;
          g.beginPath(); const y = Math.random() * H; g.moveTo(0, y); g.bezierCurveTo(W / 3, y + Math.random() * 10 - 5, (2 * W) / 3, y + Math.random() * 10 - 5, W, y); g.stroke();
        }
      }),
    }),
    blotter: std('#1f3b2b', { roughness: 0.9 }),
    plate: std('#fff', { metalness: 0.6, roughness: 0.35, map: canvasTexture(512, 96, brassPlate('M. FAHMI ADY SUSILO', 34, 'SOFTWARE DEVELOPER')) }),
  });

/** The detective's desk: two pedestals, a leather blotter and a brass name plate. */
export function Desk() {
  const m = useMemo(() => materials(), []);
  const { x, y, z } = DESK;
  return (
    <group>
      <Box size={[2.7, 0.08, 1.25]} radius={0.02} material={m.wood} position={[x, y, z]} />
      <Box size={[2.5, 0.02, 1.0]} material={m.blotter} position={[x, y + 0.05, z - 0.02]} />
      {[-0.95, 1.15].map((px) => (
        <group key={px}>
          <Box size={[0.66, 0.76, 1.15]} material={m.wood} position={[x + px - 0.1, 0.38, z]} />
          {[0, 1, 2].map((k) => <Box key={k} size={[0.12, 0.025, 0.03]} material={M.brass} position={[x + px - 0.1, 0.62 - k * 0.22, z + 0.59]} />)}
        </group>
      ))}
      <Box size={[1.4, 0.6, 0.04]} material={m.wood} position={[x + 0.1, 0.45, z + 0.5]} />
      <Plane size={[0.85, 0.16]} material={m.plate} position={[x + 0.1, 0.5, z + 0.525]} />
    </group>
  );
}
