import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CanvasTexture, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, type Mesh, type SpotLight } from 'three';
import { cases } from '../../content/site';
import { CW, CW_PX, caseRect, caseWallPoint } from '../layout';
import { M, std } from '../materials';
import { Box, Plane } from '../parts';
import { canvasTexture, loadImage, MONO, TYPE } from '../textures';
import { Interactive } from '../interactive';

const TILT = [-0.022, 0.016, -0.01, 0.024, 0.014, -0.02, 0.01, -0.016];
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Every case as a pinned photo print: screenshot, case number, title, tags and a CLOSED / FILE PENDING stamp. */
function drawWall(canvas: HTMLCanvasElement, photos: (HTMLImageElement | null)[]) {
  const g = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  g.fillStyle = '#2a2420'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},50,${Math.random() * 0.18})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  cases.forEach((c, i) => {
    const pending = c.kind === 'pending';
    const r = caseRect(i);
    g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(TILT[i % TILT.length]);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22; g.shadowOffsetY = 10;
    g.fillStyle = pending ? '#c9c3b5' : '#e6dfcf'; g.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    g.shadowColor = 'transparent';
    // screenshot, cropped from the top like a photo print
    const im = photos[i]; const ix = -r.w / 2 + 18, iy = -r.h / 2 + 18, iw = r.w - 36, ih = 270;
    g.fillStyle = '#111'; g.fillRect(ix, iy, iw, ih);
    if (im) {
      const sh = Math.min(im.naturalHeight, (im.naturalWidth * ih) / iw);
      g.filter = pending ? 'grayscale(1) brightness(.8) contrast(.9)' : 'none';
      g.drawImage(im, 0, 0, im.naturalWidth, sh, ix, iy, iw, ih);
      g.filter = 'none';
    }
    g.textAlign = 'left';
    g.fillStyle = '#b3261e'; g.font = '26px ' + TYPE; g.fillText('CASE ' + c.no, ix, iy + ih + 42);
    g.fillStyle = '#1b1b1b'; g.font = '34px ' + TYPE; g.fillText(clip(c.title, 23), ix, iy + ih + 84);
    g.fillStyle = '#5a5244'; g.font = '600 21px ' + MONO;
    g.fillText(clip(c.kind === 'pending' ? 'case notes not filed yet' : c.tags.join(' · '), 34), ix, iy + ih + 120);
    // stamp across the photo corner
    g.save(); g.translate(ix + iw - 110, iy + 56); g.rotate(-0.22);
    g.strokeStyle = g.fillStyle = pending ? '#5f5f5f' : '#c4161c'; g.lineWidth = 6; g.globalAlpha = 0.92;
    const label = pending ? 'FILE PENDING' : 'CLOSED'; g.font = '34px ' + TYPE; const tw = g.measureText(label).width + 30;
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-tw / 2, -30, tw, 52); g.strokeRect(-tw / 2, -30, tw, 52);
    g.fillStyle = g.strokeStyle; g.textAlign = 'center'; g.fillText(label, 0, 9); g.restore();
    // tape
    g.fillStyle = 'rgba(232,220,180,.75)'; g.save(); g.translate(0, -r.h / 2 + 2); g.rotate(-0.04); g.fillRect(-60, -16, 120, 30); g.restore();
    g.restore();
  });
}

/** The lit CASE FILES wall: the first thing the eye lands on. Clicking a photo opens that exact case. */
export function CaseWall() {
  const face = useRef<Mesh>(null);
  const wall = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CW.w * CW_PX; canvas.height = CW.h * CW_PX;
    drawWall(canvas, []);
    const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
    return {
      canvas, tex,
      face: std('#fff', { map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.07, roughness: 0.85 }),
      backing: std('#1a120a', { roughness: 0.5 }),
      pin: new SphereGeometry(0.03, 12, 8),
      neon: new MeshBasicMaterial({
        transparent: true, toneMapped: false, depthWrite: false,
        map: canvasTexture(1024, 220, (g, W, H) => {
          g.font = '128px ' + TYPE; g.textAlign = 'center'; g.textBaseline = 'middle';
          for (const [blur, a] of [[40, 0.9], [20, 1], [8, 1]]) { g.shadowColor = `rgba(255,40,40,${a})`; g.shadowBlur = blur; g.fillStyle = '#ff5a52'; g.fillText('CASE FILES', W / 2, H / 2 + 6); }
          g.shadowBlur = 0; g.fillStyle = '#ffe1dc'; g.fillText('CASE FILES', W / 2, H / 2 + 6);
        }),
      }),
    };
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all(cases.map((c) => loadImage(c.image.small))).then((photos) => {
      if (!live) return;
      drawWall(wall.canvas, photos);
      wall.tex.needsUpdate = true;
    });
    return () => { live = false; };
  }, [wall]);

  useLayoutEffect(() => { if (face.current) face.current.userData.noHighlight = true; }, []);

  const pickCase = (e: ThreeEvent<MouseEvent>) => {
    if (e.object !== face.current || !e.uv) return -1;
    const px = e.uv.x * wall.canvas.width, py = (1 - e.uv.y) * wall.canvas.height;
    return cases.findIndex((_, i) => { const r = caseRect(i); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  };

  return (
    <>
      <Interactive id="cases" pickCase={pickCase}>
        <Box size={[CW.w + 0.16, CW.h + 0.16, 0.06]} material={wall.backing} position={[CW.x, CW.y, CW.z - 0.02]} castShadow={false} />
        <mesh ref={face} material={wall.face} position={[CW.x, CW.y, CW.z + 0.015]} receiveShadow>
          <planeGeometry args={[CW.w, CW.h]} />
        </mesh>
        {cases.map((c, i) => {
          const r = caseRect(i);
          return <mesh key={c.slug} geometry={wall.pin} material={M.pin} position={caseWallPoint(r.x + r.w / 2, r.y + 4)} castShadow />;
        })}
        <Plane size={[2.3, 0.5]} material={wall.neon} position={[CW.x, CW.y + CW.h / 2 + 0.33, CW.z + 0.05]} />
      </Interactive>
      <pointLight color="#ff3030" intensity={5} distance={4.5} decay={1.6} position={[CW.x, CW.y + CW.h / 2 + 0.3, CW.z + 0.5]} />
      {/* two picture lights wash the photos */}
      {[-1.2, 1.2].map((dx) => <PictureLight key={dx} dx={dx} />)}
    </>
  );
}

function PictureLight({ dx }: { dx: number }) {
  const light = useRef<SpotLight>(null);
  useLayoutEffect(() => {
    light.current!.target.position.set(CW.x + dx * 0.9, CW.y - 0.2, CW.z);
    light.current!.target.updateMatrixWorld();
  }, [dx]);
  return <spotLight ref={light} color="#ffe3b8" intensity={11} distance={6} angle={0.75} penumbra={0.6} decay={1.2} position={[CW.x + dx, 3.95, CW.z + 1.3]} />;
}
