"""Steel filing cabinet: three drawers with brass pulls and label holders."""
from lib.build import box


def build(L, M, col):
    x, z = L['CABINET']['x'], L['CABINET']['z']
    parts = [box('cabinet_body', (0.62, 1.32, 0.66), (x, 0.66, z), col, M['steel'], bevel=0.02)]
    for k in range(3):
        y = 1.1 - k * 0.42
        parts += [
            box('cabinet_drawer', (0.56, 0.38, 0.02), (x, y, z + 0.34), col, M['steel'], bevel=0.006),
            box('cabinet_pull', (0.16, 0.03, 0.04), (x, y + 0.02, z + 0.36), col, M['brass'], bevel=0.01),
            box('cabinet_label', (0.1, 0.05, 0.006), (x, y + 0.1, z + 0.355), col, M['paper'], bevel=0.001),
        ]
    return parts
