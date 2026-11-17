import { Color, Mesh, type Material, type MeshStandardMaterial, type Object3D } from 'three';

const GLOW = new Color('#5a3a10');

/** Glows (or stops glowing) every lit material under root, as on hover. */
export function highlight(root: Object3D, on: boolean) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (on) {
      const m = o.material as Material | Material[];
      if (Array.isArray(m) || !('emissive' in m) || o.userData.noHighlight || o.userData.base) return;
      const lit = (m as MeshStandardMaterial).clone();
      // baked models (Model.tsx) are lit by their emission: brighten it instead of tinting
      if (m.userData.baked) lit.emissiveIntensity = 1.45;
      else { lit.emissive = GLOW; lit.emissiveIntensity = 0.6; }
      o.userData.base = m;
      o.material = lit;
    } else if (o.userData.base) {
      (o.material as Material).dispose();
      o.material = o.userData.base;
      delete o.userData.base;
    }
  });
}
