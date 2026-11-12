import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useRoom } from '../store';
import { caseView, EVIDENCE, HOME, HOME_PORTRAIT, type View } from './layout';
import { reduceMotion } from './quality';

const PHONE = 760;
const isPortrait = (w: number, h: number) => w / h < 0.8;

function homeView(w: number, h: number): View {
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

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Tween { p0: Vector3; t0: Vector3; p1: Vector3; t1: Vector3; start: number; ms: number }

/** Orbit controls, the fly-to between pieces of evidence, and the off-centre framing beside the open panel. */
export function CameraRig({ tweening }: { tweening: { current: boolean } }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const tween = useRef<Tween | null>(null);
  const shift = useRef(0);

  const jump = (v: View) => {
    tween.current = null;
    camera.position.copy(v.pos);
    controls.current?.target.copy(v.target);
    controls.current?.update();
  };

  // lens and home framing follow the window shape
  useEffect(() => {
    camera.fov = isPortrait(size.width, size.height) ? 58 : 38;
    camera.updateProjectionMatrix();
    if (!tween.current) jump(viewFor(size.width, size.height));
    invalidate();
  }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // fly to whatever was opened (or back home on close)
  useEffect(() => useRoom.subscribe((s, prev) => {
    if (s.current === prev.current && s.focusCase === prev.focusCase && s.openCount === prev.openCount) return;
    const v = viewFor(size.width, size.height);
    if (reduceMotion || s.instant) jump(v);
    else tween.current = { p0: camera.position.clone(), t0: controls.current!.target.clone(), p1: v.pos.clone(), t1: v.target.clone(), start: performance.now(), ms: 1200 };
    invalidate();
  }), [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const tw = tween.current;
    if (tw) {
      const k = Math.min(1, (performance.now() - tw.start) / tw.ms);
      const e = ease(k);
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
      enableDamping
      enablePan={false}
      minDistance={2.5}
      maxDistance={15}
      minPolarAngle={0.55}
      maxPolarAngle={1.38}
      minAzimuthAngle={-0.2}
      maxAzimuthAngle={Math.PI / 2 + 0.1}
    />
  );
}
