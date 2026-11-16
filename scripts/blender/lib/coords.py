"""three.js room space (metres, y up, -z into the back wall) <-> Blender (metres, z up).

three (x, y, z) == Blender (x, -z, y). The glTF exporter converts Blender back to y-up on export
(export_yup=True), so a model built here with these helpers lands exactly where the live room expects it.
"""
from mathutils import Euler, Vector


def T(x, y, z):
    """A three.js position as a Blender vector."""
    return Vector((x, -z, y))


def S(w, h, d):
    """A three.js box size (width x, height y, depth z) as Blender dimensions."""
    return Vector((w, d, h))


def R(rx=0.0, ry=0.0, rz=0.0):
    """A three.js Euler rotation (order XYZ) as a Blender Euler.

    three applies Rx·Ry·Rz about its axes; mapped to Blender axes that is Rx·Rz·R(-y), which is
    Blender's 'YZX' mode with the angles (rx, -rz, ry).
    """
    return Euler((rx, -rz, ry), 'YZX')
