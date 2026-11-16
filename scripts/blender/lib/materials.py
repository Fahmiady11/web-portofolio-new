"""Principled materials with procedural detail (wood grain, wallpaper stripes, worn brass). The bake
captures them together with the lighting, so they cost nothing at runtime."""
import bpy


def _principled(name, color, roughness=0.75, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*_rgb(color), 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat, bsdf


def _rgb(hex_color):
    """sRGB hex → linear RGB, which is what Blender colour inputs expect."""
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]


def plain(name, color, roughness=0.75, metallic=0.0):
    return _principled(name, color, roughness, metallic)[0]


def _ramp_texture(mat, bsdf, texture, colors, scale_input='Scale', scale=4.0):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    tex = nodes.new(texture)
    if scale_input in tex.inputs:
        tex.inputs[scale_input].default_value = scale
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*_rgb(colors[0]), 1)
    ramp.color_ramp.elements[1].color = (*_rgb(colors[1]), 1)
    links.new(tex.outputs['Fac'] if 'Fac' in tex.outputs else tex.outputs[0], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return tex


def wood(name='wood', light='#5a3720', dark='#2e1a0c', roughness=0.45):
    mat, bsdf = _principled(name, light, roughness)
    tex = _ramp_texture(mat, bsdf, 'ShaderNodeTexWave', (dark, light), scale=3.0)
    tex.wave_type = 'BANDS'
    tex.inputs['Distortion'].default_value = 6.0
    tex.inputs['Detail'].default_value = 4.0
    return mat


def wallpaper(name='wallpaper'):
    mat, bsdf = _principled(name, '#26302b', 0.9)
    tex = _ramp_texture(mat, bsdf, 'ShaderNodeTexWave', ('#1f2824', '#2b3631'), scale=18.0)
    tex.wave_type = 'BANDS'
    tex.bands_direction = 'X'
    return mat


def metal(name, color, roughness=0.3):
    return plain(name, color, roughness, 0.85)


def library():
    """Every material the pieces use, by role."""
    return {
        'wood': wood(),
        'dark_wood': wood('dark_wood', '#3b2616', '#1d120a', 0.6),
        'floor': wood('floor', '#42291a', '#2a170c', 0.55),
        'wallpaper': wallpaper(),
        'blotter': plain('blotter', '#1f3b2b', 0.9),
        'rug': plain('rug', '#4a0f12', 1.0),
        'brass': metal('brass', '#b08d3c'),
        'steel': plain('steel', '#4c5550', 0.45, 0.4),
        'bakelite': plain('bakelite', '#0d0d0d', 0.25, 0.1),
        'black': plain('black', '#111111'),
        'leather': plain('leather', '#3a1712', 0.55),
        'coat': plain('coat', '#5e4a30', 0.95),
        'felt': plain('felt', '#2d2a26', 0.85),
        'shade': plain('shade', '#0f5a33', 0.3),
        'paper': plain('paper', '#e6dfcf', 0.9),
        'cardboard': plain('cardboard', '#a07a4a', 0.95),
        'frame': plain('frame', '#1d140c'),
        'slat': plain('slat', '#cbbf9f', 0.5),
    }


def emission(name, color, strength):
    """A light-emitting surface (the neon, the lamp bulb) for the bake; not exported."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*_rgb(color), 1)
    em.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(em.outputs[0], out.inputs['Surface'])
    return mat
