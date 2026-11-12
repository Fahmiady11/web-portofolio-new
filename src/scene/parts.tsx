// Small building blocks for the procedural room. Every mesh casts and receives shadows unless told otherwise.
import { useMemo } from 'react';
import { BoxGeometry, CylinderGeometry, PlaneGeometry, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type V3 = [number, number, number];

interface MeshProps {
  position?: V3;
  rotation?: V3;
  material: Material | Material[];
  /** Defaults to true; large flat backdrops turn it off. */
  castShadow?: boolean;
}

export function Box({ size, radius = 0, ...p }: MeshProps & { size: V3; radius?: number }) {
  const [w, h, d] = size;
  const geo = useMemo(() => (radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new BoxGeometry(w, h, d)), [w, h, d, radius]);
  return <mesh geometry={geo} material={p.material} position={p.position} rotation={p.rotation} castShadow={p.castShadow ?? true} receiveShadow />;
}

export function Cyl({ top, bottom = top, height, segments = 24, ...p }: MeshProps & { top: number; bottom?: number; height: number; segments?: number }) {
  const geo = useMemo(() => new CylinderGeometry(top, bottom, height, segments), [top, bottom, height, segments]);
  return <mesh geometry={geo} material={p.material} position={p.position} rotation={p.rotation} castShadow={p.castShadow ?? true} receiveShadow />;
}

export function Plane({ size, ...p }: Omit<MeshProps, 'castShadow'> & { size: [number, number] }) {
  const [w, h] = size;
  const geo = useMemo(() => new PlaneGeometry(w, h), [w, h]);
  return <mesh geometry={geo} material={p.material} position={p.position} rotation={p.rotation} receiveShadow />;
}
