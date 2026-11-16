"""Typewriter body, platen and carriage lever. Keys and the typed sheet stay live (painted text)."""
import math

from lib.build import box, cylinder
from lib.coords import R


def build(L, M, col):
    top = L['TOP']
    return [
        box('typewriter_body', (0.62, 0.14, 0.42), (0.05, top + 0.07, -1.72), col, M['bakelite'], bevel=0.04),
        box('typewriter_deck', (0.5, 0.05, 0.16), (0.05, top + 0.13, -1.78), col, M['bakelite'], rot=R(-0.35, 0, 0), bevel=0.01),
        cylinder('typewriter_platen', 0.05, 0.05, 0.72, (0.05, top + 0.2, -1.88), col, M['black'], rot=R(0, 0, math.pi / 2)),
        box('typewriter_lever', (0.12, 0.012, 0.012), (-0.37, top + 0.24, -1.86), col, M['brass'], rot=R(0, 0, 0.4), bevel=0.004),
    ]
