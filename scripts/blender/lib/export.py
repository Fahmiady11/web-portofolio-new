"""glTF export of one piece. Compression (meshopt, WebP textures) happens afterwards in
scripts/blender/optimize.mjs, which writes the final files to src/assets/models/."""
import bpy


def glb(obj, path):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,          # back to three.js y-up; see lib/coords.py
        export_apply=True,
        export_extras=True,       # carries material['baked'] to the site's loader
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_lights=False,
        export_cameras=False,
    )
