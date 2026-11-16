# Muhammad Fahmi Ady Susilo — portfolio

A noir detective office in real-time 3D: every piece of evidence opens part of the portfolio.
Vite + React + TypeScript + Tailwind, with React Three Fiber for the room.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (builds images from `content/` first). |
| `npm run build` | Type-check, build, server-render the first paint into `dist/index.html`. |
| `npm run preview` | Serve `dist/`. |
| `npm run lint` | ESLint. |
| `npm test` | Drive the built site in headless Chrome (`tests/interactions.mjs`); screenshots in `test-results/`. |
| `node scripts/capture-posters.mjs` | Re-capture `public/poster-*.webp` and `public/og.jpg` from the built room. |
| `npm run lighthouse [-- --no-webgl]` | Lighthouse mobile profile against the built site (report in `test-results/`). |
| `npm run models:build` / `models:optimize` | Blender pipeline for modelled, baked pieces: see `scripts/blender/README.md`. |

## Layout

- `content/content.json` — the single source of truth for all text, links and images (`content/assets/`).
  `src/content/site.ts` maps it into the typed `Site`; `scripts/build-assets.mjs` turns the images into
  AVIF/WebP sizes under `public/img/` and copies the CV to `public/files/` (both generated, not committed).
- `src/components/` — the page: header, phone dock, case-file panel, full dossier, poster.
- `src/scene/` — the 3D room, loaded lazily. `layout.ts` holds every position, camera view and marker anchor;
  `objects/` has one component per object, so any of them can be swapped for a modelled `.glb`.
- `mockups/` — the approved prototype (`a-detective-room.html`) and earlier concepts, for reference.

Deep links: `?open=cases|board|evidence|about|wall|record|phone|dossier`, `?open=case-<n>`, `?open=quick`.
`?quality=high|medium|low` pins the 3D quality (no automatic step-down).

Canonical and Open Graph URLs use `https://portofolio.asfahmidev.com`; set `SITE_URL` at build time to override.
