// The smaller things on and around the desk.
import { useMemo } from 'react';
import { CircleGeometry, MeshStandardMaterial, TorusGeometry } from 'three';
import { cases } from '../../content/site';
import { TOP } from '../layout';
import { M, std } from '../materials';
import { Box, Cyl } from '../parts';
import { canvasTexture, TYPE } from '../textures';
import { Interactive } from '../interactive';

const folderLabel = (title: string, no: string, pending: boolean) => canvasTexture(512, 380, (g, W, H) => {
  g.fillStyle = pending ? '#c9bb98' : '#d6b878'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
  g.fillStyle = '#f5efdf'; g.fillRect(28, 26, 300, 62); g.strokeStyle = '#8a6c33'; g.strokeRect(28, 26, 300, 62);
  g.fillStyle = '#222'; g.font = '30px ' + TYPE; g.fillText('CASE ' + no, 42, 68);
  g.font = '34px ' + TYPE; g.fillStyle = '#1e1a14'; const t = title.length > 22 ? title.slice(0, 21) + '…' : title; g.fillText(t.toUpperCase(), 30, 160);
  g.save(); g.translate(W - 150, H - 90); g.rotate(-0.18); g.strokeStyle = pending ? '#666' : '#b3261e'; g.fillStyle = g.strokeStyle; g.lineWidth = 5;
  g.strokeRect(-110, -36, 220, 64); g.font = '34px ' + TYPE; g.textAlign = 'center'; g.fillText(pending ? 'PENDING' : 'CLOSED', 0, 10); g.restore();
});

/** A stack of case folders, case #001 on top: a second way into the projects. */
export function DeskFolders() {
  const stack = useMemo(() => cases.slice().reverse().map((c, k, arr) => {
    const top = k === arr.length - 1;
    const pending = c.kind === 'pending';
    return {
      key: c.slug,
      material: top ? std('#fff', { roughness: 0.85, map: folderLabel(c.title, c.no, pending) }) : std(pending ? '#c9bb98' : '#d6b878', { roughness: 0.85 }),
      position: [0.62 + Math.sin(k) * 0.02, TOP + 0.008 + k * 0.014, -1.25 + Math.cos(k * 2) * 0.015] as [number, number, number],
      rotation: [0, 0.35 + Math.sin(k * 1.7) * 0.12, 0] as [number, number, number],
    };
  }), []);
  return (
    <Interactive id="cases" track={false}>
      {stack.map(({ key, ...f }) => <Box key={key} size={[0.46, 0.012, 0.34]} {...f} />)}
    </Interactive>
  );
}

/** Black TOP SECRET folder: the CV. */
export function DossierFolder() {
  const cover = useMemo(() => std('#fff', {
    roughness: 0.6,
    map: canvasTexture(380, 512, (g, W) => {
      g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, W, 512);
      g.fillStyle = '#b3261e'; g.fillRect(0, 70, W, 70);
      g.fillStyle = '#fff'; g.font = '40px ' + TYPE; g.textAlign = 'center'; g.fillText('TOP SECRET', W / 2, 120);
      g.fillStyle = '#e8dcc0'; g.font = '46px ' + TYPE; g.fillText('DOSSIER', W / 2, 260);
      g.font = '24px ' + TYPE; g.fillText('SUBJECT: F. A. SUSILO', W / 2, 310); g.fillText('(CV ENCLOSED)', W / 2, 350);
    }),
  }), []);
  return (
    <Interactive id="dossier">
      <Box size={[0.3, 0.03, 0.4]} material={cover} position={[-0.45, TOP + 0.015, -1.3]} rotation={[0, -0.25, 0]} />
    </Interactive>
  );
}

/** A coffee mug and a magnifying glass. */
export function DeskClutter() {
  const m = useMemo(() => ({
    mug: std('#d9d2c2', { roughness: 0.4 }),
    ring: new TorusGeometry(0.07, 0.008, 8, 28),
    lens: new CircleGeometry(0.068, 28),
    glass: new MeshStandardMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.25, roughness: 0.05 }),
  }), []);
  return (
    <>
      <Cyl top={0.05} bottom={0.045} height={0.11} material={m.mug} position={[-0.62, TOP + 0.055, -1.85]} />
      <group position={[0.15, TOP + 0.015, -1.15]} rotation={[0, 0.4, 0]}>
        <mesh geometry={m.ring} material={M.brass} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={m.lens} material={m.glass} rotation={[-Math.PI / 2, 0, 0]} />
        <Cyl top={0.012} bottom={0.014} height={0.14} segments={8} material={M.darkWood} position={[0.13, 0, 0.04]} rotation={[Math.PI / 2, 0, 1.2]} />
      </group>
    </>
  );
}

/** Leather chair behind the desk, with a low back so it never hides the case wall. */
export function Chair() {
  const leather = useMemo(() => std('#3a1712', { roughness: 0.55 }), []);
  return (
    <group>
      <Box size={[0.62, 0.1, 0.56]} radius={0.04} material={leather} position={[0.1, 0.55, -2.65]} />
      <Box size={[0.66, 0.55, 0.12]} radius={0.05} material={leather} position={[0.1, 0.86, -2.95]} />
      <Cyl top={0.035} height={0.5} segments={10} material={M.black} position={[0.1, 0.27, -2.65]} />
    </group>
  );
}
