// Room-wide light and mood: moonlight through the blinds, lightning, and dust in the lamp light.
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, PointsMaterial, type PointLight, type SpotLight } from 'three';
import { reduceMotion, useShadows } from '../quality';
import { canvasTexture } from '../textures';

export function Lights() {
  const shadows = useShadows();
  const moon = useRef<SpotLight>(null);
  const flash = useRef<PointLight>(null);
  // the slat pattern of the blinds, projected by the moonlight
  const blinds = useMemo(() => canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.fillStyle = '#fff'; g.fillRect(0, i * (H / 14) + 4, W, H / 14 - 9); }
    g.fillStyle = '#000'; g.fillRect(W / 2 - 3, 0, 6, H);
  }, { data: true }), []);

  useLayoutEffect(() => {
    const l = moon.current!;
    l.map = blinds;
    l.target.position.set(0, 0.7, -1.2);
    l.target.updateMatrixWorld();
  }, [blinds]);

  // lightning: a quick double flash through the window every 8–18 s
  const next = useRef(-1);
  useFrame(({ clock }) => {
    if (reduceMotion || !flash.current) return;
    const t = clock.getElapsedTime();
    if (next.current < 0) next.current = t + 6 + Math.random() * 8;
    if (t < next.current) return;
    const f = t - next.current;
    flash.current.intensity = f < 0.08 || (f > 0.16 && f < 0.22) ? 60 : 0;
    if (f > 0.4) { flash.current.intensity = 0; next.current = t + 8 + Math.random() * 10; }
  });

  return (
    <>
      <hemisphereLight args={['#5a6a90', '#2a180c', 0.75]} />
      {/* keeps the walls readable */}
      <pointLight color="#ffb070" intensity={4} distance={8} decay={1.5} position={[0.6, 3.3, -1.6]} />
      <spotLight
        ref={moon}
        color="#9db4ff" intensity={160} distance={16} angle={0.32} penumbra={0.25} decay={1.2}
        position={[-7.2, 4.4, 0.4]}
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006}
      />
      <directionalLight color="#7d7090" intensity={0.8} position={[5, 6, 6]} />
      <pointLight ref={flash} color="#bcd2ff" intensity={0} distance={12} decay={1.2} position={[-4.5, 2.6, -0.2]} />
    </>
  );
}

const DUST = 380;

function createDust(count: number) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { pos[i * 3] = -3.2 + Math.random() * 4.2; pos[i * 3 + 1] = 0.3 + Math.random() * 3; pos[i * 3 + 2] = -3 + Math.random() * 3.6; }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    return { geo, mat: new PointsMaterial({ color: '#ffe7c2', size: 0.014, transparent: true, opacity: 0.45, depthWrite: false, blending: AdditiveBlending }) };
}

/** Dust drifting through the light. */
export function Dust({ count = DUST }: { count?: number }) {
  const { geo, mat } = useMemo(() => createDust(count), [count]);

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.getElapsedTime();
    const a = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0006;
      a[i * 3] += 0.0004;
      if (a[i * 3] > 1.2) a[i * 3] = -3.2;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <points geometry={geo} material={mat} raycast={() => null} />;
}
