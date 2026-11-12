import { useMemo } from 'react';
import { canvasTexture } from '../textures';
import { std } from '../materials';
import { Box, type V3 } from '../parts';
import { ROOM } from '../layout';

const materials = () => [
    std('#fff', {
      roughness: 0.55,
      map: canvasTexture(1024, 1024, (g, W, H) => {
        for (let i = 0; i < 8; i++) {
          const y = (i * H) / 8;
          g.fillStyle = ['#3a2416', '#42291a', '#36210f', '#3f2618'][i % 4];
          g.fillRect(0, y, W, H / 8);
          for (let k = 0; k < 40; k++) {
            g.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`;
            g.beginPath();
            const yy = y + (Math.random() * H) / 8;
            g.moveTo(0, yy);
            g.bezierCurveTo(W / 3, yy + 4, (2 * W) / 3, yy - 4, W, yy);
            g.stroke();
          }
          g.fillStyle = 'rgba(0,0,0,.6)';
          g.fillRect(0, y, W, 3);
          g.fillRect((i * 397) % W, y, 3, H / 8);
        }
      }, { repeat: [3, 3] }),
    }),
    std('#fff', {
      roughness: 1,
      map: canvasTexture(512, 384, (g, W, H) => {
        g.fillStyle = '#4a0f12'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#a2742c'; g.lineWidth = 10; g.strokeRect(22, 22, W - 44, H - 44);
        g.strokeStyle = '#2a0709'; g.lineWidth = 18; g.strokeRect(48, 48, W - 96, H - 96);
        g.fillStyle = '#7d1b1e'; g.beginPath(); g.ellipse(W / 2, H / 2, 120, 80, 0, 0, 7); g.fill();
        g.strokeStyle = '#a2742c'; g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, H / 2, 90, 56, 0, 0, 7); g.stroke();
      }),
    }),
  ];

/** Plank floor and the red rug under the desk. */
export function Floor() {
  const [floor, rug] = useMemo(() => materials(), []);
  const size: V3 = [ROOM.size, 0.2, ROOM.size];
  return (
    <>
      <Box size={size} material={floor} position={[0, -0.1, 0]} />
      <Box size={[3.6, 0.02, 2.7]} material={rug} position={[0.2, 0.01, -0.6]} />
    </>
  );
}
