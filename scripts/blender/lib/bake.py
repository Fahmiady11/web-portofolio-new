"""Bake each piece's lighting (direct + indirect, with its colours) into one texture on its own UV map,
then swap its materials for a single emission-only material that shows that texture.

The exported material is tagged baked = 1 (a custom property, exported as glTF extras): the site's
loader (src/scene/Model.tsx) turns it into an emissive-only material that the live lights leave alone.
"""
import bpy


def _select_only(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def join(name, objects):
    """Applies modifiers and joins a piece's parts into one mesh object (one draw call on the site)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
        for child in o.children_recursive:
            child.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.convert(target='MESH')  # applies bevels/booleans, clears parenting offsets
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    return obj


def unwrap(obj, margin=0.004):
    _select_only(obj)
    uv = obj.data.uv_layers.new(name='bake')
    obj.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')
    return uv


def bake(obj, size, out_png, samples):
    """Cycles DIFFUSE bake (direct + indirect + colour) into a size×size PNG."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    image = bpy.data.images.new(f'{obj.name}_bake', size, size, alpha=False, float_buffer=True)
    for slot in obj.material_slots:
        nodes = slot.material.node_tree.nodes
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        nodes.active = node  # Cycles bakes into the active image node of every material
    _select_only(obj)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT', 'COLOR'}, margin=8, use_clear=True)
    image.filepath_raw = out_png
    image.file_format = 'PNG'
    image.save()
    return image


def swap_to_baked(obj, image):
    """One emission-only material showing the bake; old UV maps go so the export carries just one."""
    mat = bpy.data.materials.new(f'{obj.name}_baked')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)
    bsdf.inputs['Roughness'].default_value = 1
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 1.0
    mat['baked'] = 1
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for uv in [u for u in obj.data.uv_layers if u.name != 'bake']:
        obj.data.uv_layers.remove(uv)
    return mat
