import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, DoubleSide, type Group } from 'three';
import { useSound } from '../../audio/sound';
import { GRAMOPHONE } from '../layout';
import { M, std } from '../materials';
import { Box, Cyl } from '../parts';
import { reduceMotion } from '../quality';
import { highlight } from '../glow';
import { tracked } from '../registry';

const RPM78 = (78 / 60) * Math.PI * 2;
const ARM_REST = 0.55, ARM_PLAY = 0.05;

/**
 * A gramophone on a side table: the room's music switch. Click it (or the header's music button, or its
 * ♪ marker) to play or stop. The record spins and the arm swings onto it only while music plays.
 */
export function Gramophone() {
  const root = useRef<Group>(null);
  const record = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const m = useMemo(() => ({
    wood: std('#4a2c17', { roughness: 0.45 }),
    vinyl: std('#0b0b0b', { roughness: 0.3, metalness: 0.2 }),
    label: std('#b3261e'),
    horn: std('#c69a45', { metalness: 0.85, roughness: 0.28, side: DoubleSide }),
    hornGeo: new CylinderGeometry(0.2, 0.025, 0.36, 40, 1, true),
  }), []);
  const { x, z, top } = GRAMOPHONE;

  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    tracked.set('music', g);
    return () => { tracked.delete('music'); };
  }, []);
  // the arm moves on and off the record whenever the music changes, even with reduced motion
  useLayoutEffect(() => useSound.subscribe(() => invalidate()), [invalidate]);

  useFrame((_, dt) => {
    const playing = useSound.getState().playing;
    if (record.current && playing && !reduceMotion) record.current.rotation.y -= RPM78 * dt * 0.42; // 33⅓ rpm
    if (arm.current) {
      const want = playing ? ARM_PLAY : ARM_REST;
      const a = arm.current.rotation.y;
      arm.current.rotation.y = reduceMotion ? want : a + (want - a) * Math.min(1, dt * 4);
    }
  });

  return (
    <group
      ref={root}
      onPointerOver={(e) => { e.stopPropagation(); if (e.pointerType !== 'mouse') return; highlight(root.current!, true); canvas.style.cursor = 'pointer'; }}
      onPointerOut={() => { highlight(root.current!, false); canvas.style.cursor = 'grab'; }}
      onClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; useSound.getState().toggle(); }}
    >
      {/* side table */}
      <Cyl top={0.32} height={0.04} material={M.darkWood} position={[x, top - 0.02, z]} segments={40} />
      <Cyl top={0.035} height={top - 0.06} material={M.darkWood} position={[x, (top - 0.04) / 2 + 0.02, z]} segments={12} />
      <Cyl top={0.18} bottom={0.22} height={0.04} material={M.darkWood} position={[x, 0.02, z]} />
      {/* cabinet and turntable */}
      <Box size={[0.36, 0.13, 0.36]} radius={0.012} material={m.wood} position={[x, top + 0.065, z]} />
      <group ref={record} position={[x, top + 0.14, z + 0.01]}>
        <Cyl top={0.14} height={0.01} material={m.vinyl} segments={48} />
        <Cyl top={0.045} height={0.012} material={m.label} segments={24} />
        <Box size={[0.012, 0.013, 0.05]} material={M.brass} position={[0, 0.001, 0.07]} castShadow={false} />
      </group>
      {/* tone arm: pivots at the back-right corner */}
      <group ref={arm} position={[x + 0.15, top + 0.155, z - 0.13]} rotation={[0, ARM_REST, 0]}>
        <Cyl top={0.018} height={0.03} material={M.brass} />
        <Box size={[0.012, 0.012, 0.2]} material={M.brass} position={[-0.04, 0.012, 0.1]} rotation={[0, 0.4, 0]} />
      </group>
      {/* neck and horn */}
      <Cyl top={0.016} height={0.3} material={m.horn} position={[x - 0.11, top + 0.27, z - 0.12]} rotation={[-0.35, 0, 0]} segments={12} />
      <mesh geometry={m.hornGeo} material={m.horn} position={[x - 0.11, top + 0.52, z - 0.02]} rotation={[0.95, 0, 0]} castShadow />
    </group>
  );
}
