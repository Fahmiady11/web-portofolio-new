import { useMemo } from 'react';
import { site } from '../../content/site';
import { CABINET, EVIDENCE_BOX } from '../layout';
import { M, std } from '../materials';
import { Box } from '../parts';
import { canvasTexture, TYPE } from '../textures';
import { Interactive } from '../interactive';
import { Swappable } from '../Swappable';

/** Steel filing cabinet in the back-right corner. */
export function Cabinet() {
  const m = useMemo(() => ({
    steel: std('#4c5550', { roughness: 0.45, metalness: 0.4 }),
    drawer: std('#56605a', { roughness: 0.4, metalness: 0.4 }),
  }), []);
  const { x, z } = CABINET;
  return (
    <Swappable model="cabinet">
      <group>
        <Box size={[0.62, 1.32, 0.66]} radius={0.02} material={m.steel} position={[x, 0.66, z]} />
        {[0, 1, 2].map((k) => (
          <group key={k}>
            <Box size={[0.56, 0.38, 0.02]} material={m.drawer} position={[x, 1.1 - k * 0.42, z + 0.34]} />
            <Box size={[0.16, 0.03, 0.04]} material={M.brass} position={[x, 1.12 - k * 0.42, z + 0.36]} />
          </group>
        ))}
      </group>
    </Swappable>
  );
}

/** Cardboard evidence box on the cabinet, one labelled bag per skill group: opens the skills. */
export function EvidenceBox() {
  const m = useMemo(() => {
    const cardboard = std('#a07a4a', { roughness: 0.95 });
    const front = std('#fff', {
      roughness: 0.95,
      map: canvasTexture(512, 200, (g, W) => {
        g.fillStyle = '#a07a4a'; g.fillRect(0, 0, W, 200); g.fillStyle = '#1b1b1b'; g.font = '64px ' + TYPE; g.textAlign = 'center'; g.fillText('EVIDENCE', W / 2, 100);
        g.font = '30px ' + TYPE; g.fillText('SKILLS · DO NOT REMOVE', W / 2, 160);
      }),
    });
    return {
      cardboard,
      // a box's material groups are +x, -x, +y, -y, +z, -z: the label faces the room
      front: [cardboard, cardboard, cardboard, cardboard, front, cardboard],
      bags: site.skills.map(({ group }, i) => std('#fff', {
        transparent: true, opacity: 0.92, roughness: 0.2,
        map: canvasTexture(256, 330, (g, W) => {
          g.fillStyle = 'rgba(235,240,245,.92)'; g.fillRect(0, 0, W, 330); g.fillStyle = '#b3261e'; g.fillRect(0, 0, W, 64);
          g.fillStyle = '#fff'; g.font = '30px ' + TYPE; g.textAlign = 'center'; g.fillText('EVIDENCE', W / 2, 44);
          g.fillStyle = '#1b1b1b'; g.font = '26px ' + TYPE; g.fillText('EXHIBIT ' + String.fromCharCode(65 + i), W / 2, 110);
          g.font = '24px ' + TYPE; g.fillText(group.toUpperCase(), W / 2, 150);
          g.strokeStyle = '#999'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(24, 200 + k * 30); g.lineTo(W - 24, 200 + k * 30); g.stroke(); }
        }),
      })),
    };
  }, []);
  const { x, y, z } = EVIDENCE_BOX;
  return (
    <Interactive id="evidence">
      <Box size={[0.56, 0.02, 0.5]} material={m.cardboard} position={[x, y + 0.01, z]} />
      <Box size={[0.56, 0.22, 0.02]} material={m.cardboard} position={[x, y + 0.12, z - 0.24]} />
      <Box size={[0.56, 0.22, 0.02]} material={m.front} position={[x, y + 0.12, z + 0.24]} />
      {[-1, 1].map((s) => <Box key={s} size={[0.02, 0.22, 0.5]} material={m.cardboard} position={[x + s * 0.27, y + 0.12, z]} />)}
      {m.bags.map((bag, i) => (
        <Box key={i} size={[0.2, 0.26, 0.01]} material={bag} rotation={[-0.25 - i * 0.05, 0, 0]}
          position={[x - 0.17 + (i % 3) * 0.17, y + 0.2 + Math.floor(i / 3) * 0.02, z - 0.12 + Math.floor(i / 3) * 0.16]} />
      ))}
    </Interactive>
  );
}
