"""Leather swivel chair with a low back (it must never hide the case wall) on a five-star base."""
import math

from lib.build import box, cylinder
from lib.coords import R


def build(L, M, col):
    parts = [
        box('chair_seat', (0.62, 0.1, 0.56), (0.1, 0.55, -2.65), col, M['leather'], bevel=0.04),
        box('chair_back', (0.66, 0.55, 0.12), (0.1, 0.86, -2.95), col, M['leather'], bevel=0.05),
        cylinder('chair_post', 0.035, 0.035, 0.5, (0.1, 0.27, -2.65), col, M['black'], segments=16),
    ]
    for i in range(5):
        a = i * 2 * math.pi / 5
        parts.append(box('chair_leg', (0.3, 0.03, 0.05), (0.1 + math.cos(a) * 0.15, 0.04, -2.65 + math.sin(a) * 0.15), col, M['black'], rot=R(0, -a, 0)))
    return parts
