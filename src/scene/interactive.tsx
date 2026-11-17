import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import type { SectionId } from '../sections';
import { useRoom } from '../store';
import { highlight } from './glow';
import { tracked } from './registry';

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
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const g = ref.current;
    if (!track || !g) return;
    tracked.set(id, g);
    return () => { tracked.delete(id); };
  }, [id, track]);

  // a keyboard-focused marker lights its object the same way the mouse does
  const hovered = useRef(false);
  const previewed = useRoom((s) => s.preview === id);
  useEffect(() => {
    if (ref.current && !hovered.current) highlight(ref.current, previewed);
    invalidate();
  }, [previewed, invalidate]);

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (e.pointerType !== 'mouse') return;
        hovered.current = true;
        highlight(ref.current!, true);
        canvas.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hovered.current = false;
        if (useRoom.getState().preview !== id) highlight(ref.current!, false);
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
