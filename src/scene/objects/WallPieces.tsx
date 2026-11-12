// Framed things on the back wall either side of the case wall.
import { useEffect, useMemo } from 'react';
import { SRGBColorSpace, TextureLoader } from 'three';
import { site } from '../../content/site';
import { DIPLOMA } from '../layout';
import { M, std } from '../materials';
import { Box, Cyl, Plane } from '../parts';
import { brassPlate, canvasTexture, TYPE } from '../textures';
import { Interactive } from '../interactive';

/** Six framed certificates on green felt, under a brass plaque with the total: opens all certificates. */
export function Commendations() {
  const m = useMemo(() => {
    const loader = new TextureLoader();
    return {
      frames: site.certificates.slice(0, 6).map((c) => {
        const t = loader.load(c.image.src);
        t.colorSpace = SRGBColorSpace;
        return std('#fff', { map: t, roughness: 0.4 });
      }),
      felt: std('#1d2620', { roughness: 0.95 }),
      plaque: std('#fff', { metalness: 0.6, roughness: 0.35, map: canvasTexture(512, 96, brassPlate(`COMMENDATIONS · ${site.certificates.length}`, 40)) }),
    };
  }, []);
  useEffect(() => () => m.frames.forEach((f) => f.map?.dispose()), [m]);
  return (
    <Interactive id="wall">
      {m.frames.map((photo, i) => {
        const x = 2.4 + (i % 2) * 0.62, y = 2.95 - Math.floor(i / 2) * 0.48, z = -3.58;
        return (
          <group key={i}>
            <Box size={[0.52, 0.4, 0.035]} material={M.frameWood} position={[x, y, z]} castShadow={false} />
            <Plane size={[0.44, 0.32]} material={photo} position={[x, y, z + 0.02]} />
          </group>
        );
      })}
      {/* the felt backing makes the whole area clickable */}
      <Plane size={[1.42, 1.62]} material={m.felt} position={[2.71, 2.5, -3.597]} />
      <Plane size={[0.9, 0.17]} material={m.plaque} position={[2.71, 3.38, -3.57]} />
    </Interactive>
  );
}

/** Framed university diploma with a medal hanging below: opens education and awards. */
export function Diploma() {
  const m = useMemo(() => ({
    paper: std('#fff', {
      roughness: 0.8,
      map: canvasTexture(512, 380, (g, W, H) => {
        g.fillStyle = '#f1e7cf'; g.fillRect(0, 0, W, H); g.strokeStyle = '#8a6c33'; g.lineWidth = 6; g.strokeRect(16, 16, W - 32, H - 32);
        g.fillStyle = '#2b1a08'; g.textAlign = 'center'; g.font = '30px ' + TYPE; g.fillText('UNIVERSITAS TRUNOJOYO MADURA', W / 2, 80);
        g.font = '24px ' + TYPE; g.fillText('S1 TEKNIK INFORMATIKA', W / 2, 140); g.font = 'italic 34px Georgia, serif'; g.fillText('M. Fahmi Ady Susilo', W / 2, 210);
        g.fillStyle = '#b3261e'; g.beginPath(); g.arc(W - 90, H - 80, 36, 0, 7); g.fill();
      }),
    }),
    ribbon: std('#1d4ed8'),
    gold: std('#d4a640', { metalness: 0.9, roughness: 0.25 }),
  }), []);
  const { x, y, z } = DIPLOMA;
  return (
    <Interactive id="record">
      <Box size={[0.8, 0.62, 0.05]} material={M.frameWood} position={[x, y, z]} castShadow={false} />
      <Plane size={[0.72, 0.53]} material={m.paper} position={[x, y, z + 0.03]} />
      <Box size={[0.04, 0.22, 0.02]} material={m.ribbon} position={[x, y - 0.48, z + 0.03]} />
      <Cyl top={0.06} height={0.015} material={m.gold} position={[x, y - 0.62, z + 0.04]} rotation={[Math.PI / 2, 0, 0]} />
    </Interactive>
  );
}
