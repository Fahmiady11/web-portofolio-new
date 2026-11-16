"""Floor, rug, back and left walls with wainscoting, and a real window opening in the left wall so
the moonlight (and the blinds' shadow) comes in during the bake."""
from lib.build import box, cut


def build(L, M, col):
    size, height = L['ROOM']['size'], L['ROOM']['height']
    half = size / 2
    win = L['WIN']
    parts = [
        box('floor', (size, 0.2, size), (0, -0.1, 0), col, M['floor'], bevel=0),
        box('rug', (3.6, 0.02, 2.7), (0.2, 0.01, -0.6), col, M['rug'], bevel=0.005),
        box('back_wall', (size, height, 0.2), (0, height / 2, -half), col, M['wallpaper'], bevel=0),
        box('back_wainscot', (size, 1.05, 0.06), (0, 0.52, -half + 0.12), col, M['dark_wood']),
        box('back_rail', (size, 0.06, 0.1), (0, 1.06, -half + 0.14), col, M['dark_wood']),
        box('left_wainscot', (0.06, 1.05, size), (-half + 0.12, 0.52, 0), col, M['dark_wood']),
        box('left_rail', (0.1, 0.06, size), (-half + 0.14, 1.06, 0), col, M['dark_wood']),
    ]
    left = box('left_wall', (0.2, height, size), (-half, height / 2, 0), col, M['wallpaper'], bevel=0)
    hole = box('window_hole', (0.6, win['h'], win['w']), (-half, win['y'], win['z']), col, bevel=0)
    parts.append(cut(left, hole))
    return parts
