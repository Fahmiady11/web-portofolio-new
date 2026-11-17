// The 3D office. Loaded lazily as its own chunk; the page works (panel, dock, dossier) before it arrives.
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useRef, useState } from 'react';
import { Box3, Vector3 } from 'three';
import type { SectionId } from '../sections';
import { useRoom } from '../store';
import { CameraRig } from './CameraRig';
import Effects from './Effects';
import { HotspotTracker, Hotspots, type MarkerRefs } from './Hotspots';
import { catState, glowing, loadedModels, tracked } from './registry';
import { caseRect, caseWallPoint } from './layout';
import { liveQuality, pinnedQuality, QualityContext, reduceMotion, type Quality } from './quality';
import { Room } from './Room';
import { warm } from './warm';

// labels are painted into textures once, so wait (briefly) for the typewriter font first
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('30px "Special Elite"'), document.fonts.load('600 21px "IBM Plex Mono"')]),
  new Promise((ok) => setTimeout(ok, 1500)),
]);


const EXPOSURE = 1.3;
/** The first frames carry shader compiles and texture uploads; animations start after them. */
const WARM_FRAMES = 4;

/** Lights coming on: on a plain first visit the exposure rises from near dark as the poster fades. */
function LightsOn() {
  const gl = useThree((s) => s.gl);
  const ramp = useRef<{ start: number } | null>(null);
  useEffect(() => {
    const s = useRoom.getState();
    if (reduceMotion || s.deepLink || s.current || s.dossierOpen) return;
    gl.toneMappingExposure = 0.08;
    ramp.current = { start: -1 };
  }, [gl]);
  useFrame(() => {
    const r = ramp.current;
    if (!r) return;
    if (r.start < 0) { if (!warm.done) return; r.start = performance.now(); }
    const k = Math.min(1, (performance.now() - r.start) / 2200);
    gl.toneMappingExposure = 0.08 + (EXPOSURE - 0.08) * (1 - Math.pow(1 - k, 2));
    if (k === 1) ramp.current = null;
  });
  return null;
}

const MAX_DPR: Record<Quality, number> = { high: 2, medium: 1.5, low: 1 };

/** Shadows are rendered once, not every frame: nothing that casts them moves. */
function StaticShadows() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate]);
  return null;
}

/**
 * Marks the room ready once it is warmed up (shaders compiled, first frames out), and exposes hooks for
 * tests/interactions.mjs. Until then the poster stays up and the intro waits.
 */
function Ready({ tweening }: { tweening: { current: boolean } }) {
  const get = useThree((s) => s.get);
  useFrame(({ invalidate }) => {
    if (warm.done) return;
    if (++warm.frames < WARM_FRAMES) { invalidate(); return; }
    warm.done = true;
    const toScreen = (p: Vector3) => {
      const { camera, size } = get();
      const v = p.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height, z: v.z };
    };
    window.__room = {
      webgl: true,
      // centre of the object itself
      screen: (id: SectionId | 'music' | 'cat') => toScreen(new Box3().setFromObject(tracked.get(id)!).getCenter(new Vector3())),
      cam: () => get().camera.position.toArray().map((n) => +n.toFixed(3)),
      current: () => useRoom.getState().current,
      caseCard: (i: number) => { const r = caseRect(i); return toScreen(caseWallPoint(r.x + r.w / 2, r.y + r.h / 2)); },
      busy: () => tweening.current,
      glowing,
      models: () => [...loadedModels],
      quality: () => liveQuality.value,
      bloom: () => liveQuality.bloom,
      cat: () => ({ ...catState }),
      // close-ups for screenshots: put the camera somewhere and look at something
      look: (pos: [number, number, number], target: [number, number, number]) => {
        const { camera, controls } = get();
        camera.position.set(...pos);
        const c = controls as unknown as { target: Vector3; update: () => void } | null;
        c?.target.set(...target);
        c?.update();
      },
    };
    useRoom.getState().setWebGL('ready');
  });
  return null;
}

export default function Scene() {
  use(fontsReady);
  const [quality, setQuality] = useState<Quality>(() => pinnedQuality ?? (innerWidth < 760 ? 'medium' : 'high'));
  const dossierOpen = useRoom((s) => s.dossierOpen);
  useEffect(() => { liveQuality.value = quality; }, [quality]);
  const [markers] = useState<MarkerRefs>(() => new Map());
  const tweening = useRef(false);

  return (
    <>
      <Canvas
        dpr={[1, Math.min(devicePixelRatio, MAX_DPR[quality])]}
        // nothing moves under the dossier or with reduced motion: draw only when something changes
        frameloop={dossierOpen || reduceMotion ? 'demand' : 'always'}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
        camera={{ fov: 38, near: 0.1, far: 100, position: [3, 3.7, 5.9] }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = EXPOSURE;
          gl.domElement.style.cursor = 'grab';
        }}
      >
        {!pinnedQuality && <PerformanceMonitor onDecline={() => setQuality('low')} onFallback={() => setQuality('low')} flipflops={3} />}
        <QualityContext.Provider value={quality}>
          <StaticShadows />
          <Room />
        </QualityContext.Provider>
        <LightsOn />
        {quality !== 'low' && <Effects />}
        <CameraRig tweening={tweening} />
        <HotspotTracker markers={markers} />
        <Ready tweening={tweening} />
      </Canvas>
      <Hotspots markers={markers} />
    </>
  );
}
