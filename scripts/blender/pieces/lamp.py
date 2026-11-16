"""Banker's lamp: brass base and stem, green glass half-cylinder shade. The bulb stays live (bloom)."""
import math

import bmesh
import bpy

from lib.build import _object, cylinder
from lib.coords import R


def build(L, M, col):
    top = L['TOP']
    x, z = -0.95, -1.95
    parts = [
        cylinder('lamp_base', 0.11, 0.13, 0.04, (x, top + 0.02, z), col, M['brass']),
        cylinder('lamp_stem', 0.012, 0.012, 0.36, (x, top + 0.2, z), col, M['brass'], segments=12),
    ]
    # an open half-cylinder, like THREE.CylinderGeometry(0.16, 0.16, 0.42, 24, 1, true, 0, PI)
    mesh = bpy.data.meshes.new('lamp_shade')
    bm = bmesh.new()
    ring = []
    for i in range(25):
        a = math.pi * i / 24
        ring.append((math.sin(a) * 0.16, math.cos(a) * 0.16))
    lo = [bm.verts.new((u, v, -0.21)) for u, v in ring]
    hi = [bm.verts.new((u, v, 0.21)) for u, v in ring]
    for i in range(24):
        bm.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
    bm.to_mesh(mesh)
    bm.free()
    shade = _object('lamp_shade', mesh, col, (x, top + 0.4, -1.92), R(0, math.pi / 2, math.pi / 2), M['shade'])
    shade.modifiers.new('thickness', 'SOLIDIFY').thickness = 0.004
    parts.append(shade)
    return parts
