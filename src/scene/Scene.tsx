// The 3D office. Loaded lazily as its own chunk; the page works (panel, dock, dossier) before it arrives.
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useRef, useState } from 'react';
import { Box3, Vector3 } from 'three';
import type { SectionId } from '../sections';
import { useRoom } from '../store';
import { CameraRig } from './CameraRig';
import { HotspotTracker, Hotspots, type MarkerRefs } from './Hotspots';
import { tracked } from './registry';
import { caseRect, caseWallPoint } from './layout';
import { QualityContext, reduceMotion, type Quality } from './quality';
import { Room } from './Room';

// labels are painted into textures once, so wait (briefly) for the typewriter font first
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('30px "Special Elite"'), document.fonts.load('600 21px "IBM Plex Mono"')]),
  new Promise((ok) => setTimeout(ok, 1500)),
]);

const MAX_DPR: Record<Quality, number> = { high: 2, medium: 1.5, low: 1 };

/** Shadows are rendered once, not every frame: nothing that casts them moves. */
function StaticShadows({ quality }: { quality: Quality }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    gl.shadowMap.enabled = quality !== 'low';
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, quality, invalidate]);
  return null;
}

/** Marks the room ready after its first frame, and exposes hooks for tests/interactions.mjs. */
function Ready({ tweening }: { tweening: { current: boolean } }) {
  const get = useThree((s) => s.get);
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current !== 1) return;
    const toScreen = (p: Vector3) => {
      const { camera, size } = get();
      const v = p.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height, z: v.z };
    };
    window.__room = {
      webgl: true,
      // centre of the object itself
      screen: (id: SectionId) => toScreen(new Box3().setFromObject(tracked.get(id)!).getCenter(new Vector3())),
      cam: () => get().camera.position.toArray().map((n) => +n.toFixed(3)),
      current: () => useRoom.getState().current,
      caseCard: (i: number) => { const r = caseRect(i); return toScreen(caseWallPoint(r.x + r.w / 2, r.y + r.h / 2)); },
      busy: () => tweening.current,
    };
    useRoom.getState().setWebGL('ready');
  });
  return null;
}

export default function Scene() {
  use(fontsReady);
  const [quality, setQuality] = useState<Quality>(() => (innerWidth < 760 ? 'medium' : 'high'));
  const dossierOpen = useRoom((s) => s.dossierOpen);
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
          gl.toneMappingExposure = 1.3;
          gl.domElement.style.cursor = 'grab';
        }}
      >
        <PerformanceMonitor onDecline={() => setQuality('low')} onFallback={() => setQuality('low')} flipflops={3} />
        <QualityContext.Provider value={quality}>
          <StaticShadows quality={quality} />
          <Room />
        </QualityContext.Provider>
        <CameraRig tweening={tweening} />
        <HotspotTracker markers={markers} />
        <Ready tweening={tweening} />
      </Canvas>
      <Hotspots markers={markers} />
    </>
  );
}
