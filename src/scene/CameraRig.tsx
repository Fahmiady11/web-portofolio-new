import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Box3, Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useRoom } from '../store';
import { fitView, isCompact, measureSafe } from './fit';
import { caseView, EVIDENCE, HOME, HOME_PORTRAIT, introStart, type View } from './layout';
import { tracked } from './registry';
import { reduceMotion } from './quality';
import { warm } from './warm';

const PHONE = 760;
const isPortrait = (w: number, h: number) => w / h < 0.8;

const ROOM_FLOOR = new Box3(new Vector3(-3.7, 0, -3.7), new Vector3(3.7, 0.01, 0.9));

// tall screens: a gentle downward look (about 24° below eye level), a little from the right like desktop
const PORTRAIT_POLAR = 1.15, PORTRAIT_AZIMUTH = 0.3;
const PORTRAIT_FIT: View = {
  target: new Vector3(0, 1.4, -1.6),
  pos: new Vector3(0, 1.4, -1.6).add(new Vector3(
    Math.sin(PORTRAIT_POLAR) * Math.sin(PORTRAIT_AZIMUTH), Math.cos(PORTRAIT_POLAR), Math.sin(PORTRAIT_POLAR) * Math.cos(PORTRAIT_AZIMUTH),
  ).multiplyScalar(9)),
};

const fovFor = (w: number, h: number) => (isPortrait(w, h) ? 58 : 38);

/** The whole room on a small screen: every piece of evidence and its marker inside the visible strip. */
function fittedHome(w: number, h: number): View {
  const boxes = [...tracked.values()].map((o) => { o.updateWorldMatrix(true, true); return new Box3().setFromObject(o); });
  // and the floor the eye reads as the room's lower edge, so the room is centred, not just the evidence
  boxes.push(ROOM_FLOOR);
  const pins = Object.values(EVIDENCE).map((e) => e.anchor);
  return fitView(isPortrait(w, h) ? PORTRAIT_FIT : HOME, fovFor(w, h), w, h, boxes, pins);
}

function homeView(w: number, h: number): View {
  if (isCompact(w, h) && tracked.size) return fittedHome(w, h);
  if (isPortrait(w, h)) return HOME_PORTRAIT;
  // squarer windows step back a little so the whole case wall stays in frame
  const pos = HOME.target.clone().add(HOME.pos.clone().sub(HOME.target).multiplyScalar(w / h < 1.2 ? 1.25 : 1));
  return { pos, target: HOME.target };
}

/** Where the camera should be for the current state of the room. */
function viewFor(w: number, h: number): View {
  const { current, focusCase } = useRoom.getState();
  if (current === 'cases' && focusCase >= 0) return caseView(focusCase, w < PHONE);
  if (!current) return homeView(w, h);
  const v = EVIDENCE[current].view;
  // phones back off a little so the object clears the bottom sheet
  return w < PHONE ? { pos: v.pos.clone().add(v.pos.clone().sub(v.target).multiplyScalar(0.35)), target: v.target } : v;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Tween { p0: Vector3; t0: Vector3; p1: Vector3; t1: Vector3; start: number; ms: number; ease: (t: number) => number }

/** The intro dolly plays on a plain first visit only: not with reduced motion, a deep link, or a file already open. */
function wantsIntro() {
  const s = useRoom.getState();
  return !reduceMotion && !s.deepLink && !s.current && !s.dossierOpen;
}

/** Orbit controls, the fly-to between pieces of evidence, and the off-centre framing beside the open panel. */
export function CameraRig({ tweening }: { tweening: { current: boolean } }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const tween = useRef<Tween | null>(null);
  const shift = useRef(0);
  const started = useRef(false);

  const flyTo = (v: View, ms: number, ease = easeInOut) => {
    tween.current = { p0: camera.position.clone(), t0: controls.current!.target.clone(), p1: v.pos.clone(), t1: v.target.clone(), start: -1, ms, ease };
  };

  const jump = (v: View) => {
    tween.current = null;
    camera.position.copy(v.pos);
    controls.current?.target.copy(v.target);
    controls.current?.update();
  };

  // lens and home framing follow the window shape
  useEffect(() => {
    camera.fov = fovFor(size.width, size.height);
    camera.updateProjectionMatrix();
    measureSafe(size.height);
    const v = viewFor(size.width, size.height);
    if (!started.current && wantsIntro()) {
      // the room comes into view: start back by the door and settle on the case wall
      jump(introStart(v));
      flyTo(v, 2800, easeOut);
    } else if (!tween.current) jump(v);
    started.current = true;
    invalidate();
  }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // fly to whatever was opened (or back home on close)
  useEffect(() => useRoom.subscribe((s, prev) => {
    if (s.current === prev.current && s.focusCase === prev.focusCase && s.openCount === prev.openCount) return;
    const v = viewFor(size.width, size.height);
    if (reduceMotion || s.instant) jump(v);
    else flyTo(v, 1200);
    invalidate();
  }), [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const tw = tween.current;
    // the clock starts once the room is warmed up, so slow first frames never eat the move
    if (tw && tw.start < 0 && warm.done) tw.start = performance.now();
    if (tw && tw.start >= 0) {
      const k = Math.min(1, (performance.now() - tw.start) / tw.ms);
      const e = tw.ease(k);
      camera.position.lerpVectors(tw.p0, tw.p1, e);
      c.target.lerpVectors(tw.t0, tw.t1, e);
      c.update();
      if (k === 1) tween.current = null;
      else invalidate();
    }
    tweening.current = !!tween.current;

    // slide the projection centre away from the open panel, so the object stays in view beside it
    const { width: w, height: h } = size;
    const phone = w < PHONE;
    const open = useRoom.getState().current;
    const want = open ? (phone ? h * 0.74 : Math.min(open === 'cases' ? 640 : 470, w)) : 0;
    const before = shift.current;
    shift.current += (want - shift.current) * (reduceMotion ? 1 : 0.12);
    if (Math.abs(want - shift.current) < 0.5) shift.current = want;
    if (shift.current !== before) invalidate();
    if (shift.current < 0.5) camera.clearViewOffset();
    else if (phone) camera.setViewOffset(w, h + shift.current, 0, shift.current, w, h);
    else camera.setViewOffset(w + shift.current, h, shift.current, 0, w, h);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      // dragging takes over from any camera move in progress (including the intro)
      onStart={() => { tween.current = null; }}
      enableDamping
      enablePan={false}
      minDistance={2.5}
      maxDistance={isCompact(size.width, size.height) ? 40 : 15}
      minPolarAngle={0.55}
      maxPolarAngle={1.38}
      minAzimuthAngle={-0.2}
      maxAzimuthAngle={Math.PI / 2 + 0.1}
    />
  );
}
