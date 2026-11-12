import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Color, Mesh, type Group, type Material, type MeshStandardMaterial, type Object3D } from 'three';
import type { SectionId } from '../sections';
import { useRoom } from '../store';
import { tracked } from './registry';

const GLOW = new Color('#5a3a10');

function highlight(root: Object3D, on: boolean) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (on) {
      const m = o.material as Material | Material[];
      if (Array.isArray(m) || !('emissive' in m) || o.userData.noHighlight || o.userData.base) return;
      const lit = (m as MeshStandardMaterial).clone();
      lit.emissive = GLOW;
      lit.emissiveIntensity = 0.6;
      o.userData.base = m;
      o.material = lit;
    } else if (o.userData.base) {
      (o.material as Material).dispose();
      o.material = o.userData.base;
      delete o.userData.base;
    }
  });
}

interface Props {
  id: SectionId;
  /** Register as the section's main object (false for secondary ways in, like the desk folders). */
  track?: boolean;
  /** For the case wall: which case photo was hit, or -1. */
  pickCase?: (e: ThreeEvent<MouseEvent>) => number;
  children: ReactNode;
}

/** A piece of evidence: glows under the mouse, and a click (not a drag) opens its case file. */
export function Interactive({ id, track = true, pickCase, children }: Props) {
  const ref = useRef<Group>(null);
  const open = useRoom((s) => s.open);
  const canvas = useThree((s) => s.gl.domElement);

  useLayoutEffect(() => {
    const g = ref.current;
    if (!track || !g) return;
    tracked.set(id, g);
    return () => { tracked.delete(id); };
  }, [id, track]);

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (e.pointerType !== 'mouse') return;
        highlight(ref.current!, true);
        canvas.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        highlight(ref.current!, false);
        canvas.style.cursor = 'grab';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return; // that was a drag to look around
        open(id, pickCase ? pickCase(e) : -1);
      }}
    >
      {children}
    </group>
  );
}
