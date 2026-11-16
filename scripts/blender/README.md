# Blender pipeline: modelled, baked room pieces (milestone 2, part B)

Replaces the room's hero pieces with modelled meshes whose lighting is baked into their textures, without
touching the rest of the site. Nothing here has been run yet: it is ready for when Blender is installed.

## What gets modelled

| Piece (`src/assets/models/<name>.glb`) | Replaces (procedural) | Stays live on top |
| --- | --- | --- |
| `room-shell` | `Floor`, `Walls` | window glass with rain, blinds, gold lettering |
| `desk` | `Desk` | brass name plate (painted text) |
| `chair` | `Chair` | – |
| `lamp` | `Lamp` meshes | bulb (bloom), spot light and flicker |
| `typewriter` | `Typewriter` body | keys and typed sheet (painted text) |
| `telephone` | `Telephone` body | dial (painted digits) |
| `cabinet` | `Cabinet` | – |
| `coat-rack` | `CoatRack` | – |

The case wall, evidence board, certificates, diploma and evidence box stay procedural: their content
comes from `content/content.json` and must stay editable without a re-bake.

## How it fits the site

- **One layout.** `npm run models:layout` exports `src/scene/layout.ts` (positions, sizes and the light
  rig, `LIGHTS`) to `layout.json`. The Blender scene is built from it, in room coordinates, so every
  exported piece drops in at the origin with no transform. `lib/coords.py` maps three.js (y up) to
  Blender (z up); the glTF exporter maps it back.
- **Swap at build time.** `src/scene/models.ts` globs `src/assets/models/*.glb`. Each procedural piece
  is wrapped in `<Swappable model="…">` (`src/scene/Swappable.tsx`): with a file, the model is shown;
  without one, while it loads, or if it fails, the procedural object is. Delete a `.glb` to go back.
- **Baked materials.** A piece's lighting (direct + bounced, with its colours) is baked into one texture
  on its own UV map, and its materials are replaced by one emission-only material tagged `baked = 1`.
  `src/scene/Model.tsx` turns that into an emissive-only material, so the live lights don't light it
  twice; it skips live shadows on it (they are in the bake) and hover/keyboard glow brightens it.
- **Small downloads.** `optimize.mjs` (gltf-transform) welds, de-duplicates, compresses geometry with
  meshopt and textures to WebP. The loader chunk (GLTFLoader + meshopt decoder, ~21 KB gzipped) is only
  downloaded when at least one model exists.

## Run it

Needs Blender 4.2 LTS or newer (Cycles; uses the 4.x Principled BSDF socket names).

```sh
# 1. shapes and placement first: fast, no bake
npm run models:build -- --no-bake --preview
npm run models:optimize && npm run build && npm run preview

# 2. match the light: compare scripts/blender/out/preview.png with test-results/desktop-home.png,
#    adjust --light-scale until they agree (three.js and Cycles light units differ; see lib/lights.py)
npm run models:build -- --no-bake --preview --light-scale 1.6

# 3. the real bake (minutes per piece), then compress into src/assets/models/
npm run models:build -- --light-scale 1.6 --samples 512 --size 1024
npm run models:optimize

# 4. check, re-capture the poster/OG stills, commit the .glb files
npm run build && npm test && node scripts/capture-posters.mjs && npm run build
```

`BLENDER=/path/to/blender` overrides the default `/Applications/Blender.app/Contents/MacOS/Blender`.
`--only desk,lamp` re-exports a subset (everything is still built so the bake sees all occluders).
`--save-blend` keeps `out/room.blend` to open in the Blender UI.

## Files

- `build_models.py`: entry point; builds every piece, the stand-ins and the lights, bakes, exports.
- `pieces/*.py`: one module per piece (`build(L, M, col)`), sizes matching `src/scene/objects/`.
  `pieces/context.py` builds non-exported stand-ins (case wall, board, blinds, desk props) and the neon
  and bulb as emitters, so bakes get the right occlusion, bounce light and the red neon spill.
- `lib/`: coordinates, mesh helpers, procedural materials (wood grain, wallpaper stripes), the light rig,
  bake and export.
- `optimize.mjs`: compression into `src/assets/models/`.
- `layout.mjs`: `layout.json` from `src/scene/layout.ts`.

## Next steps once it runs

1. Tune `--light-scale` and the hemisphere/sun factors in `lib/lights.py` against the live room.
2. Add denoising (Cycles bakes are noisy below ~1024 samples): composite each bake through the
   Denoise node, or bake at 2× size and downscale in `optimize.mjs`.
3. Model detail where the camera gets close: carved desk edge, typewriter key stalks, phone cord,
   drawer recesses. The bake makes extra geometry cheap at runtime.
4. Optionally KTX2 textures (needs KTX-Software's `toktx`) for lower GPU memory on phones.
