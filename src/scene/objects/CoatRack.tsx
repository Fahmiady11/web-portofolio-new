import { useMemo } from 'react';
import { COAT_RACK } from '../layout';
import { M, std } from '../materials';
import { Box, Cyl } from '../parts';

/** Coat rack with a trench coat and a fedora, front-left corner. */
export function CoatRack() {
  const m = useMemo(() => ({ coat: std('#5e4a30', { roughness: 0.95 }), felt: std('#2d2a26', { roughness: 0.85 }) }), []);
  const { x, z } = COAT_RACK;
  return (
    <group>
      <Cyl top={0.025} bottom={0.03} height={1.9} segments={10} material={M.darkWood} position={[x, 0.95, z]} />
      <Cyl top={0.2} bottom={0.24} height={0.04} segments={16} material={M.darkWood} position={[x, 0.02, z]} />
      <Box size={[0.2, 0.95, 0.42]} radius={0.08} material={m.coat} position={[x + 0.12, 1.2, z]} />
      <Box size={[0.24, 0.18, 0.5]} radius={0.08} material={m.coat} position={[x + 0.1, 1.66, z]} />
      <Cyl top={0.2} height={0.015} segments={32} material={m.felt} position={[x, 1.92, z]} />
      <Cyl top={0.11} bottom={0.13} height={0.13} material={m.felt} position={[x, 1.99, z]} />
      <Cyl top={0.135} height={0.03} material={M.black} position={[x, 1.95, z]} />
    </group>
  );
}
