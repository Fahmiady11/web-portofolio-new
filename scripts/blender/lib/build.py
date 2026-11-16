"""Mesh helpers: every part is a real mesh object, linked into a collection, placed in three.js coordinates."""
import math

import bmesh
import bpy
from mathutils import Matrix

from .coords import R, S, T


def collection(name, parent=None):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in (parent or bpy.context.scene.collection).children:
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def _object(name, mesh, col, pos, rot, material):
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    obj.location = T(*pos)
    if rot:
        obj.rotation_mode = rot.order
        obj.rotation_euler = rot
    if material:
        obj.data.materials.append(material)
    return obj


def _bevel(obj, width, segments=3):
    if width <= 0:
        return obj
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    obj.modifiers.new('weighted', 'WEIGHTED_NORMAL').keep_sharp = True
    return obj


def box(name, size, pos, col, material=None, rot=None, bevel=0.004):
    """A box of three.js size (w, h, d) centred at pos, with softly bevelled edges."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=S(*size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    return _bevel(_object(name, mesh, col, pos, rot, material), min(bevel, min(size) / 2.2))


def cylinder(name, radius_top, radius_bottom, height, pos, col, material=None, rot=None, segments=32, bevel=0.002):
    """A cylinder along three.js y (Blender z), like THREE.CylinderGeometry."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius_bottom, radius2=radius_top, depth=height)
    bm.to_mesh(mesh)
    bm.free()
    obj = _object(name, mesh, col, pos, rot, material)
    for p in obj.data.polygons:
        p.use_smooth = True
    return _bevel(obj, bevel, 2)


def sphere(name, radius, pos, col, material=None, segments=24):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    obj = _object(name, mesh, col, pos, None, material)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def capsule(name, radius, length, pos, col, material=None, rot=None):
    """Like THREE.CapsuleGeometry(radius, length): a cylinder with hemispherical ends, along y."""
    body = cylinder(name, radius, radius, length, pos, col, material, rot, bevel=0)
    for end in (1, -1):
        cap = sphere(f'{name}_cap', radius, pos, col, material)
        cap.parent = body
        cap.location = (0, 0, end * length / 2)
    return body


def plane(name, w, h, pos, col, material=None, rot=None):
    """A flat w x h plane facing three.js +z, like THREE.PlaneGeometry."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(w, h, 1), verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bm.to_mesh(mesh)
    bm.free()
    return _object(name, mesh, col, pos, rot or R(), material)


def cut(target, cutter):
    """Boolean-subtract cutter from target, then delete the cutter."""
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    cutter.hide_render = True
    cutter.hide_viewport = True
    return target
