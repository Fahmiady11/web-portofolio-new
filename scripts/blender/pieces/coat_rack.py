"""Coat rack with a trench coat and a fedora, front-left corner."""
from lib.build import box, cylinder


def build(L, M, col):
    x, z = L['COAT_RACK']['x'], L['COAT_RACK']['z']
    return [
        cylinder('rack_pole', 0.025, 0.03, 1.9, (x, 0.95, z), col, M['dark_wood'], segments=16),
        cylinder('rack_foot', 0.2, 0.24, 0.04, (x, 0.02, z), col, M['dark_wood']),
        box('coat_body', (0.2, 0.95, 0.42), (x + 0.12, 1.2, z), col, M['coat'], bevel=0.08),
        box('coat_shoulders', (0.24, 0.18, 0.5), (x + 0.1, 1.66, z), col, M['coat'], bevel=0.08),
        cylinder('hat_brim', 0.2, 0.2, 0.015, (x, 1.92, z), col, M['felt'], segments=48),
        cylinder('hat_crown', 0.11, 0.13, 0.13, (x, 1.99, z), col, M['felt']),
        cylinder('hat_band', 0.135, 0.135, 0.03, (x, 1.95, z), col, M['black']),
    ]
