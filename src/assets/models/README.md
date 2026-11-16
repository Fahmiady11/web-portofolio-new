# Modelled room pieces

`scripts/blender/` writes the baked, compressed `.glb` files here (`desk.glb`, `typewriter.glb`, …).
Any file named after a piece in `src/scene/models.ts` replaces that piece's procedural version at build
time; with no file, the procedural object is used. Delete a file to go back.
