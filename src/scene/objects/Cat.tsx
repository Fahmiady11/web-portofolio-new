import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { ConeGeometry, MeshStandardMaterial, SphereGeometry, type Group, type Mesh } from 'three';
import { CAT } from '../layout';
import { QualityContext, reduceMotion } from '../quality';
import { catState, tracked } from '../registry';
import { Swappable } from '../Swappable';

const TAIL = 9;
const CLOSED = 0.06;
/** Bend per tail joint: nine of them wrap the tail round the loaf. */
const CURL = 0.36;

/** Blink plan: a brief, sleepy peek (random 4–10 s apart), or the slow "I trust you" blink when clicked. */
interface Blink { start: number; open: number; hold: number; close: number; peak: number }
const quick = (t: number): Blink => ({ start: t, open: 0.22, hold: 0.12, close: 0.3, peak: 0.42 });
const slow = (t: number): Blink => ({ start: t, open: 0.7, hold: 0.45, close: 1.3, peak: 0.55 });
const openness = (b: Blink | null, t: number) => {
  if (!b) return CLOSED;
  const k = t - b.start;
  const ease = (x: number) => x * x * (3 - 2 * x);
  if (k < 0) return CLOSED;
  if (k < b.open) return CLOSED + (b.peak - CLOSED) * ease(k / b.open);
  if (k < b.open + b.hold) return b.peak;
  if (k < b.open + b.hold + b.close) return b.peak - (b.peak - CLOSED) * ease((k - b.open - b.hold) / b.close);
  return CLOSED;
};

/**
 * A black cat loafed on the desk in the lamp light, mostly asleep: the tail swishes slowly, it breathes, an ear
 * twitches now and then, and every 4–10 s it peeks. Clicking it gets a slow blink. Static, eyes shut,
 * with reduced motion. Its warm rim light is skipped on the low quality tier.
 */
export function Cat() {
  const quality = useContext(QualityContext);
  const body = useRef<Group>(null);
  const tail = useRef<Group[]>([]);
  const ear = useRef<Mesh>(null);
  const eyes = useRef<Mesh[]>([]);
  const blink = useRef<{ now: Blink | null; next: number; twitch: number }>({ now: null, next: 3, twitch: 6 });
  const canvas = useThree((s) => s.gl.domElement);
  const clock = useThree((s) => s.clock);

  const m = useMemo(() => ({
    fur: new MeshStandardMaterial({ color: '#09090b', roughness: 0.95 }),
    inner: new MeshStandardMaterial({ color: '#3a2427', roughness: 0.9 }),
    nose: new MeshStandardMaterial({ color: '#5a3438', roughness: 0.6 }),
    eye: new MeshStandardMaterial({ color: '#1b1612', emissive: '#e8b13a', emissiveIntensity: 0, roughness: 0.3 }),
    ball: new SphereGeometry(1, 28, 20),
    ear: new ConeGeometry(0.032, 0.06, 4),
    seg: new SphereGeometry(1, 12, 10),
  }), []);

  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    catState.exists = true;
    if (root.current) tracked.set('cat', root.current);
    return () => { catState.exists = false; tracked.delete('cat'); };
  }, []);

  useFrame(() => {
    const t = clock.getElapsedTime();
    const b = blink.current;
    const still = reduceMotion;
    // tail: a travelling wave down the segments, so it curves rather than swinging like a stick
    tail.current.forEach((g, i) => {
      if (!g) return;
      const k = i / (TAIL - 1);
      // curled round the body; the swish grows towards the tip
      g.rotation.y = still ? CURL : CURL + Math.sin(t * 0.9 - i * 0.55) * (0.03 + 0.12 * k);
      g.rotation.z = still ? 0.05 * k : 0.05 * k + Math.max(0, Math.sin(t * 0.6 - i * 0.4)) * 0.08 * k;
    });
    if (body.current) body.current.scale.y = still ? 1 : 1 + Math.sin(t * 1.5) * 0.018;
    if (!still) {
      if (!b.now && t > b.next) { b.now = quick(t); b.next = t + 4 + Math.random() * 6; }
      if (b.now && t > b.now.start + b.now.open + b.now.hold + b.now.close) b.now = null;
      if (ear.current) {
        if (t > b.twitch) { b.twitch = t + 7 + Math.random() * 9; }
        const k = b.twitch - t;
        ear.current.rotation.z = -0.25 + (k > 8.7 ? Math.sin((9 - k) * 30) * 0.25 : 0);
      }
    } else if (b.now && t > b.now.start + 4) b.now = null;
    const open = openness(b.now, t);
    // shut: a thin dark line; open: a half-open, glowing almond
    eyes.current.forEach((e) => { if (e) e.scale.y = 0.0015 + open * 0.013; });
    m.eye.emissiveIntensity = Math.max(0, (open - CLOSED) * 3.2);
    const first = tail.current[0], last = tail.current[TAIL - 1];
    catState.tail = first && last ? first.rotation.y + last.rotation.y : 0;
    catState.eyes = open;
  });

  const { x, y, z, facing, scale } = CAT;
  return (
    <group ref={root} position={[x, y, z]} rotation={[0, facing, 0]} scale={scale}>
      <Swappable model="cat">
        <group
          onPointerOver={(e) => { e.stopPropagation(); if (e.pointerType === 'mouse') canvas.style.cursor = 'pointer'; }}
          onPointerOut={() => { canvas.style.cursor = 'grab'; }}
          onClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; blink.current.now = slow(clock.getElapsedTime()); }}
        >
          {/* the loaf: body, chest and folded front paws */}
          <group ref={body}>
            <mesh geometry={m.ball} material={m.fur} scale={[0.17, 0.085, 0.1]} position={[0, 0.085, 0]} castShadow />
            <mesh geometry={m.ball} material={m.fur} scale={[0.07, 0.075, 0.085]} position={[0.12, 0.08, 0]} castShadow />
            <mesh geometry={m.ball} material={m.fur} scale={[0.04, 0.018, 0.025]} position={[0.175, 0.015, 0.035]} />
            <mesh geometry={m.ball} material={m.fur} scale={[0.04, 0.018, 0.025]} position={[0.175, 0.015, -0.035]} />
          </group>
          {/* head, tucked low and content */}
          <group position={[0.17, 0.16, 0]}>
            <mesh geometry={m.ball} material={m.fur} scale={[0.062, 0.058, 0.07]} castShadow />
            <mesh geometry={m.ball} material={m.fur} scale={[0.03, 0.022, 0.035]} position={[0.05, -0.022, 0]} />
            <mesh geometry={m.ball} material={m.nose} scale={0.007} position={[0.077, -0.012, 0]} />
            <mesh geometry={m.ear} material={m.fur} position={[-0.005, 0.06, 0.035]} rotation={[0.3, 0, -0.25]} castShadow />
            <mesh ref={ear} geometry={m.ear} material={m.fur} position={[-0.005, 0.06, -0.035]} rotation={[-0.3, 0, -0.25]} castShadow />
            {[0.026, -0.026].map((ez, i) => (
              <mesh key={ez} ref={(el) => { if (el) eyes.current[i] = el; }} geometry={m.ball} material={m.eye}
                scale={[0.006, 0.002, 0.012]} position={[0.057, 0.008, ez]} rotation={[0, 0, -0.2]} />
            ))}
          </group>
          {/* tail: nested segments from the rump, curling round the front */}
          <group position={[-0.15, 0.03, 0.04]} rotation={[0, 0.5, 0]}>
            <TailSegment i={0} refs={tail} m={m} />
          </group>
        </group>
      </Swappable>
      {/* a little warm rim light so the black cat reads against the dark */}
      {quality !== 'low' && <pointLight color="#ffb46a" intensity={1.2} distance={1.2} decay={2} position={[0.4, 0.35, 0.35]} />}
    </group>
  );
}

function TailSegment({ i, refs, m }: { i: number; refs: RefObject<Group[]>; m: { fur: MeshStandardMaterial; seg: SphereGeometry } }) {
  const len = 0.04;
  const r = 0.019 - i * 0.0011;
  return (
    <group ref={(el) => { if (el) refs.current[i] = el; }}>
      <mesh geometry={m.seg} material={m.fur} scale={[len * 0.85, r, r]} position={[-len / 2, 0, 0]} castShadow />
      {i < TAIL - 1 && (
        <group position={[-len, 0, 0]}>
          <TailSegment i={i + 1} refs={refs} m={m} />
        </group>
      )}
    </group>
  );
}
