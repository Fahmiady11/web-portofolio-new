"""Model, light, bake and export the room's hero pieces. Runs headless inside Blender 4.2+:

    npm run models:layout                       # layout.json from src/scene/layout.ts
    blender -b -P scripts/blender/build_models.py -- [options]
    npm run models:optimize                     # meshopt + WebP → src/assets/models/*.glb

Options (after the --):
    --only desk,lamp     export just these pieces (the rest are still built: they shadow and bounce)
    --samples 256        Cycles samples per bake
    --size 1024          bake texture size (the room shell gets twice this)
    --light-scale 1.0    overall light power; tune with --preview against the live room
    --preview            also render the default camera view to out/preview.png
    --no-bake            export with the plain materials (fast, for checking shapes and placement)
    --save-blend         keep out/room.blend for inspection

Raw exports and bake textures go to scripts/blender/out/ (gitignored).
"""
import argparse
import json
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from lib import bake, export, lights  # noqa: E402
from lib.build import collection  # noqa: E402
from lib.coords import T  # noqa: E402
from lib.materials import library  # noqa: E402
from pieces import PIECES, context  # noqa: E402


def parse():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser(prog='build_models.py')
    p.add_argument('--only', default='')
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--size', type=int, default=1024)
    p.add_argument('--light-scale', type=float, default=1.0)
    p.add_argument('--preview', action='store_true')
    p.add_argument('--no-bake', action='store_true')
    p.add_argument('--save-blend', action='store_true')
    p.add_argument('--layout', default=os.path.join(HERE, 'layout.json'))
    p.add_argument('--out', default=os.path.join(HERE, 'out'))
    return p.parse_args(argv)


def preview(L, out):
    """A Cycles render from the site's default camera, to compare against test-results/desktop-home.png."""
    scene = bpy.context.scene
    cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
    scene.collection.objects.link(cam)
    cam.location = T(*L['HOME']['pos'])
    cam.rotation_euler = (T(*L['HOME']['target']) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(38)  # three.js fov is vertical
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = os.path.join(out, 'preview.png')
    bpy.ops.render.render(write_still=True)


def main():
    args = parse()
    with open(args.layout) as f:
        L = json.load(f)
    os.makedirs(args.out, exist_ok=True)
    wanted = [n for n in args.only.split(',') if n] or list(PIECES)
    unknown = set(wanted) - set(PIECES)
    if unknown:
        sys.exit(f'unknown pieces: {", ".join(sorted(unknown))} (known: {", ".join(PIECES)})')

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.render.engine = 'CYCLES'
    M = library()

    built = {name: module.build(L, M, collection(name)) for name, module in PIECES.items()}
    context.build(L, M, collection('context'))
    lights.build(L['LIGHTS'], collection('lights'), args.light_scale)
    if args.preview:
        preview(L, args.out)

    # join everything first, bake everything, and only then swap materials: a piece already showing its
    # bake would otherwise light its neighbours a second time
    pieces = {name: bake.join(name, parts) for name, parts in built.items()}
    images = {}
    if not args.no_bake:
        for name in wanted:
            obj = pieces[name]
            bake.unwrap(obj)
            size = args.size * (2 if name == 'room-shell' else 1)
            print(f'baking {name} at {size}px, {args.samples} samples…', flush=True)
            images[name] = bake.bake(obj, size, os.path.join(args.out, f'{name}_bake.png'), args.samples)
        for name, image in images.items():
            bake.swap_to_baked(pieces[name], image)

    for name in wanted:
        path = os.path.join(args.out, f'{name}.glb')
        export.glb(pieces[name], path)
        print(f'exported {path}', flush=True)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, 'room.blend'))


main()
