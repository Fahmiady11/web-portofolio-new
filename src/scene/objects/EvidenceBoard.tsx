import { useEffect, useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, QuadraticBezierCurve3, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from 'three';
import { site } from '../../content/site';
import { BOARD, BOARD_AT, BOARD_PX } from '../layout';
import { M, std } from '../materials';
import { Box, Plane } from '../parts';
import { loadImage, TYPE } from '../textures';
import { Interactive } from '../interactive';

// layout in canvas px; career cards run oldest → newest, left → right
const CARD_POS = [[60, 380], [450, 650], [850, 340], [1220, 640]];
const SUBJECT = { x: 640, y: 40, w: 250, h: 300 };
const CLIP = { x: 1150, y: 40, w: 330, h: 230 };
const NOTE = { x: 70, y: 70, w: 270, h: 200 };
const chrono = [...site.experience].reverse();

function drawBoard(canvas: HTMLCanvasElement, avatar: HTMLImageElement | null) {
  const g = canvas.getContext('2d')!; const W = canvas.width, H = canvas.height;
  g.fillStyle = '#9c7446'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${60 + Math.random() * 70},${40 + Math.random() * 40},18,${0.25 + Math.random() * 0.3})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  const shadow = () => { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6; };
  const noShadow = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; };
  // subject polaroid
  g.save(); g.translate(SUBJECT.x + SUBJECT.w / 2, SUBJECT.y + SUBJECT.h / 2); g.rotate(-0.03); shadow();
  g.fillStyle = '#f6f2e8'; g.fillRect(-SUBJECT.w / 2, -SUBJECT.h / 2, SUBJECT.w, SUBJECT.h); noShadow();
  if (avatar) { g.filter = 'grayscale(1) contrast(1.15)'; g.drawImage(avatar, -SUBJECT.w / 2 + 16, -SUBJECT.h / 2 + 16, SUBJECT.w - 32, SUBJECT.w - 32); g.filter = 'none'; }
  g.fillStyle = '#222'; g.font = '30px ' + TYPE; g.textAlign = 'center'; g.fillText('THE SUBJECT', 0, SUBJECT.h / 2 - 22); g.restore();
  // newspaper clipping
  g.save(); g.translate(CLIP.x + CLIP.w / 2, CLIP.y + CLIP.h / 2); g.rotate(0.04); shadow();
  g.fillStyle = '#e4dcc8'; g.fillRect(-CLIP.w / 2, -CLIP.h / 2, CLIP.w, CLIP.h); noShadow();
  g.fillStyle = '#111'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'left';
  g.fillText('THE DAILY COMMIT', -CLIP.w / 2 + 18, -CLIP.h / 2 + 38);
  g.fillRect(-CLIP.w / 2 + 18, -CLIP.h / 2 + 50, CLIP.w - 36, 3);
  g.font = 'bold 38px Georgia, serif'; g.fillText('400+ CAMPUSES', -CLIP.w / 2 + 18, -CLIP.h / 2 + 100); g.fillText('RUN THE CODE', -CLIP.w / 2 + 18, -CLIP.h / 2 + 142);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 4; k++) g.fillRect(-CLIP.w / 2 + 18, -CLIP.h / 2 + 168 + k * 14, CLIP.w - 40 - (k % 2) * 60, 6);
  g.restore();
  // sticky note: modus operandi
  g.save(); g.translate(NOTE.x + NOTE.w / 2, NOTE.y + NOTE.h / 2); g.rotate(-0.05); shadow();
  g.fillStyle = '#f3d65a'; g.fillRect(-NOTE.w / 2, -NOTE.h / 2, NOTE.w, NOTE.h); noShadow();
  g.fillStyle = '#2b2208'; g.font = '30px ' + TYPE; g.textAlign = 'left';
  ['M.O.:', 'PHP · Laravel', 'React · Tailwind', 'PostgreSQL'].forEach((l, i) => g.fillText(l, -NOTE.w / 2 + 18, -NOTE.h / 2 + 46 + i * 40));
  g.restore();
  // career cards
  chrono.forEach((e, i) => {
    const [x, y] = CARD_POS[i % CARD_POS.length]; const w = 330, h = 205, rot = [-0.04, 0.03, -0.02, 0.035][i % 4];
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); shadow();
    g.fillStyle = e.latest ? '#fff6d0' : '#f7f4ec'; g.fillRect(-w / 2, -h / 2, w, h); noShadow();
    g.strokeStyle = 'rgba(179,38,30,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2, -h / 2 + 56); g.lineTo(w / 2, -h / 2 + 56); g.stroke();
    g.strokeStyle = 'rgba(60,110,180,.25)'; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-w / 2, -h / 2 + 56 + k * 30); g.lineTo(w / 2, -h / 2 + 56 + k * 30); g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = '#b3261e'; g.font = '26px ' + TYPE; g.fillText(`${e.start.slice(0, 4)} – ${e.end ? e.end.slice(0, 4) : 'NOW'}`, -w / 2 + 16, -h / 2 + 40);
    g.fillStyle = '#1b1b1b'; g.font = '27px ' + TYPE;
    g.fillText(e.role.length > 21 ? e.role.slice(0, 20) + '…' : e.role, -w / 2 + 16, -h / 2 + 92);
    g.font = '22px ' + TYPE; g.fillStyle = '#3b3b3b';
    let line = '', ly = -h / 2 + 128;
    for (const word of e.company.toUpperCase().split(' ')) {
      if ((line + ' ' + word).length > 24) { g.fillText(line.trim(), -w / 2 + 16, ly); line = word; ly += 28; } else line += ' ' + word;
    }
    g.fillText(line.trim(), -w / 2 + 16, ly);
    if (e.latest) { g.save(); g.translate(w / 2 - 80, h / 2 - 34); g.rotate(-0.2); g.strokeStyle = g.fillStyle = '#b3261e'; g.lineWidth = 4; g.strokeRect(-62, -24, 124, 42); g.font = '26px ' + TYPE; g.textAlign = 'center'; g.fillText('ACTIVE', 0, 8); g.restore(); }
    g.restore();
  });
}

/** canvas px → position on the board's front, in the board's own space */
const onBoard = (px: number, py: number) => new Vector3(-BOARD.w / 2 + px / BOARD_PX, BOARD.h / 2 - py / BOARD_PX, 0.035);

/** Corkboard with the career on index cards, joined by red string: opens the timeline. */
export function EvidenceBoard() {
  const board = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = BOARD.w * BOARD_PX; canvas.height = BOARD.h * BOARD_PX;
    drawBoard(canvas, null);
    const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
    const pins = [...CARD_POS.map(([x, y]) => onBoard(x + 165, y + 16)), onBoard(SUBJECT.x + SUBJECT.w / 2, SUBJECT.y + 12), onBoard(CLIP.x + 40, CLIP.y + 14)];
    const string = (a: Vector3, b: Vector3) => {
      const mid = a.clone().lerp(b, 0.5); mid.y -= 0.06 + a.distanceTo(b) * 0.04; mid.z += 0.02;
      return new TubeGeometry(new QuadraticBezierCurve3(a, mid, b), 24, 0.0045, 6);
    };
    return {
      canvas, tex, pins,
      face: std('#fff', { map: tex, roughness: 0.95 }),
      frame: std('#24160b'),
      pin: new SphereGeometry(0.022, 12, 8),
      stringMat: new MeshStandardMaterial({ color: '#d1121f', roughness: 0.6, emissive: '#3a0306' }),
      strings: [[0, 1], [1, 2], [2, 3], [4, 3], [4, 0], [3, 5]].map(([a, b]) => string(pins[a], pins[b])),
    };
  }, []);

  useEffect(() => {
    let live = true;
    loadImage(site.photo.src).then((im) => {
      if (!live) return;
      drawBoard(board.canvas, im);
      board.tex.needsUpdate = true;
    });
    return () => { live = false; };
  }, [board]);

  return (
    <group position={[BOARD_AT.x, BOARD_AT.y, BOARD_AT.z]} rotation={[0, Math.PI / 2, 0]} scale={BOARD_AT.scale}>
      <Interactive id="board">
        <Box size={[BOARD.w + 0.14, BOARD.h + 0.14, 0.05]} material={board.frame} position={[0, 0, -0.02]} castShadow={false} />
        <Plane size={[BOARD.w, BOARD.h]} material={board.face} position={[0, 0, 0.01]} />
        {board.pins.map((p, i) => <mesh key={i} geometry={board.pin} material={M.pin} position={p} castShadow />)}
        {board.strings.map((geo, i) => <mesh key={i} geometry={geo} material={board.stringMat} castShadow />)}
      </Interactive>
    </group>
  );
}
