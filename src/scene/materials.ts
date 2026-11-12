import { MeshStandardMaterial, type MeshStandardMaterialParameters } from 'three';

/** Matte by default, like most things in an old office. */
export const std = (color: string, o: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });

/** Materials shared by several objects. */
export const M = {
  brass: std('#b08d3c', { metalness: 0.85, roughness: 0.3 }),
  darkWood: std('#2a1a0e'),
  frameWood: std('#2c1b0e', { roughness: 0.5 }),
  pin: std('#c1121f', { roughness: 0.3 }),
  bakelite: std('#0d0d0d', { roughness: 0.25, metalness: 0.1 }),
  black: std('#111'),
};
