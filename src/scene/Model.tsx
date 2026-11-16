import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Color, Mesh, MeshStandardMaterial, type Material } from 'three';
import { loadedModels } from './registry';

const BLACK = new Color(0);
const WHITE = new Color(1, 1, 1);

/**
 * Baked materials (Blender sets the custom property baked = 1, exported as glTF extras) carry all their
 * light in the texture. They become emissive-only, so the live lights don't light them a second time,
 * and they glow on hover by turning the emission up (see interactive.tsx).
 */
function prepare(m: Material): Material {
  if (!m.userData.baked || !(m instanceof MeshStandardMaterial)) return m;
  const baked = new MeshStandardMaterial({
    name: m.name, color: BLACK, roughness: 1, metalness: 0,
    emissive: WHITE, emissiveMap: m.emissiveMap ?? m.map, emissiveIntensity: 1,
    transparent: m.transparent, alphaMap: m.alphaMap,
  });
  baked.userData.baked = true;
  return baked;
}

/** A room piece exported by scripts/blender: meshopt-compressed, in room coordinates. */
export default function Model({ name, url }: { name: string; url: string }) {
  const { scene } = useGLTF(url, false, true);
  const object = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.material = Array.isArray(o.material) ? o.material.map(prepare) : prepare(o.material);
      const baked = Array.isArray(o.material) ? o.material.some((m) => m.userData.baked) : o.material.userData.baked;
      o.castShadow = o.userData.castShadow ?? true;
      // baked surfaces already contain their shadows
      o.receiveShadow = !baked;
    });
    loadedModels.add(name);
    return root;
  }, [scene, name]);
  return <primitive object={object} />;
}
