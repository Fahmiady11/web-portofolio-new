"""The live room's lights (layout.json → LIGHTS), rebuilt as Cycles lights for the bake.

three.js uses physical units (candela for point/spot lights) but the room's lights use decay 1.2–1.6
instead of the physical 2, so they reach further than real lamps would. Blender lights are always
inverse-square, so powers are converted and then scaled by --light-scale: tune it once by comparing
`--preview` renders with test-results/desktop-home.png, then keep it.
"""
import math

import bpy

from .coords import T
from .materials import _rgb

CANDELA_TO_WATT = 4 * math.pi / 683


def build(lights, col, scale):
    world = bpy.context.scene.world or bpy.data.worlds.new('world')
    bpy.context.scene.world = world
    world.use_nodes = True
    made = []
    for name, spec in lights.items():
        if spec.get('dynamic'):
            continue  # flicker and lightning stay live
        kind = spec['kind']
        if kind == 'hemisphere':
            bg = world.node_tree.nodes['Background']
            sky, ground = _rgb(spec['color']), _rgb(spec['groundColor'])
            bg.inputs['Color'].default_value = (*[(a + b) / 2 for a, b in zip(sky, ground)], 1)
            bg.inputs['Strength'].default_value = spec['intensity'] * 0.35 * scale
            continue
        data = bpy.data.lights.new(name, {'spot': 'SPOT', 'point': 'POINT', 'directional': 'SUN'}[kind])
        data.color = _rgb(spec['color'])
        if kind == 'directional':
            data.energy = spec['intensity'] * 1.5 * scale
        else:
            data.energy = spec['intensity'] * CANDELA_TO_WATT * 100 * scale
            data.shadow_soft_size = 0.05
        if kind == 'spot':
            data.spot_size = 2 * spec['angle']
            data.spot_blend = spec.get('penumbra', 0)
        obj = bpy.data.objects.new(name, data)
        col.objects.link(obj)
        obj.location = T(*spec['position'])
        aim = spec.get('target') or ([0, 0, 0] if kind == 'directional' else None)
        if aim is not None:
            direction = T(*aim) - obj.location
            obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        made.append(obj)
    return made
