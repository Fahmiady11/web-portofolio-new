import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, type SpotLight } from 'three';
import { TOP } from '../layout';
import { M } from '../materials';
import { Cyl } from '../parts';
import { reduceMotion, useShadows } from '../quality';

const X = -0.95, Z = -1.95;
const BRIGHT = 26;

/** Green banker's lamp: the warm key light on the desk, with the odd flicker. */
export function Lamp() {
  const shadows = useShadows();
  const light = useRef<SpotLight>(null);
  const parts = useMemo(() => ({
    shade: new CylinderGeometry(0.16, 0.16, 0.42, 24, 1, true, 0, Math.PI),
    shadeMat: new MeshStandardMaterial({ color: '#0f5a33', emissive: '#0b4d2a', emissiveIntensity: 0.9, roughness: 0.3, side: DoubleSide }),
    bulb: new SphereGeometry(0.035, 12, 8),
    bulbMat: new MeshBasicMaterial({ color: '#ffd28a' }),
  }), []);

  useLayoutEffect(() => {
    const l = light.current!;
    l.target.position.set(-0.3, TOP, -1.55);
    l.target.updateMatrixWorld();
  }, []);

  useFrame(() => {
    if (!reduceMotion && light.current) light.current.intensity = BRIGHT + (Math.random() < 0.01 ? -10 : 0);
  });

  return (
    <group>
      <Cyl top={0.11} bottom={0.13} height={0.04} material={M.brass} position={[X, TOP + 0.02, Z]} />
      <Cyl top={0.012} height={0.36} segments={8} material={M.brass} position={[X, TOP + 0.2, Z]} />
      <mesh geometry={parts.shade} material={parts.shadeMat} rotation={[0, Math.PI / 2, Math.PI / 2]} position={[X, TOP + 0.4, -1.92]} castShadow />
      <mesh geometry={parts.bulb} material={parts.bulbMat} position={[X, TOP + 0.36, -1.92]} />
      <spotLight
        ref={light}
        color="#ffb45c" intensity={BRIGHT} distance={4.5} angle={1.05} penumbra={0.65} decay={1.4}
        position={[X, TOP + 0.36, -1.9]}
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0008}
      />
      <pointLight color="#ff9a3d" intensity={2.2} distance={5} decay={1.6} position={[-0.6, TOP + 0.5, -1.3]} />
    </group>
  );
}
