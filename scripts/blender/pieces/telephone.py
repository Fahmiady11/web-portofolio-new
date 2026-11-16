"""Rotary telephone in black bakelite: body, handset on its cradle. The dial stays live (painted digits)."""
import math

from lib.build import box, capsule, sphere
from lib.coords import R


def build(L, M, col):
    top = L['TOP']
    parts = [
        box('phone_body', (0.3, 0.1, 0.26), (1.15, top + 0.05, -1.95), col, M['bakelite'], bevel=0.05),
        capsule('phone_handset', 0.035, 0.26, (1.15, top + 0.15, -2.0), col, M['bakelite'], rot=R(0, 0, math.pi / 2)),
    ]
    for s in (-1, 1):
        parts.append(sphere('phone_cup', 0.055, (1.15 + s * 0.15, top + 0.15, -2.0), col, M['bakelite']))
    return parts
