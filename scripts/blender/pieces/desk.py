"""Partners' desk: top with a rounded edge, two pedestals with three drawers each, a modesty panel."""
from lib.build import box


def build(L, M, col):
    d = L['DESK']
    x, y, z = d['x'], d['y'], d['z']
    parts = [
        box('desk_top', (2.7, 0.08, 1.25), (x, y, z), col, M['wood'], bevel=0.02),
        box('desk_blotter', (2.5, 0.02, 1.0), (x, y + 0.05, z - 0.02), col, M['blotter'], bevel=0.003),
        box('desk_modesty', (1.4, 0.6, 0.04), (x + 0.1, 0.45, z + 0.5), col, M['wood']),
    ]
    for px in (-0.95, 1.15):
        cx = x + px - 0.1
        parts.append(box('desk_pedestal', (0.66, 0.76, 1.15), (cx, 0.38, z), col, M['wood'], bevel=0.01))
        for k in range(3):
            fy = 0.62 - k * 0.22
            parts.append(box('desk_drawer', (0.6, 0.2, 0.02), (cx, fy, z + 0.58), col, M['wood'], bevel=0.006))
            parts.append(box('desk_handle', (0.12, 0.025, 0.03), (cx, fy, z + 0.6), col, M['brass'], bevel=0.008))
    return parts
