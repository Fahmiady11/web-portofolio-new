// Modelled versions of room pieces, found at build time. scripts/blender writes them to src/assets/models/;
// a piece without a file keeps its procedural object, so the room works with any subset (or none).
const urls = import.meta.glob<string>('../assets/models/*.glb', { query: '?url', import: 'default', eager: true });

/** The pieces the Blender pipeline can model; the names match its output files. */
export type ModelName = 'room-shell' | 'desk' | 'chair' | 'lamp' | 'typewriter' | 'telephone' | 'cabinet' | 'coat-rack' | 'cat';

export const MODELS: Partial<Record<ModelName, string>> = Object.fromEntries(
  Object.entries(urls).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.glb'.length), url]),
);
