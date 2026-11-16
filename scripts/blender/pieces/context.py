"""Stand-ins for everything that stays procedural on the site (case wall, board, frames, blinds, desk
props) plus the neon and bulb as emitters. They shadow, bounce and glow during the bake but are never
exported."""
from lib.build import box, plane, sphere
from lib.coords import R
from lib.materials import emission


def build(L, M, col):
    cw, top, win = L['CW'], L['TOP'], L['WIN']
    b = L['BOARD_AT']
    parts = [
        box('ctx_case_wall', (cw['w'] + 0.16, cw['h'] + 0.16, 0.06), (cw['x'], cw['y'], cw['z'] - 0.02), col, M['paper']),
        box('ctx_board', (2.74 * b['scale'], 1.69 * b['scale'], 0.05), (b['x'], b['y'], b['z']), col, M['cardboard'], rot=R(0, 1.5708, 0)),
        box('ctx_commendations', (1.42, 1.62, 0.04), (2.71, 2.5, -3.6), col, M['frame']),
        box('ctx_diploma', (0.8, 0.62, 0.05), (L['DIPLOMA']['x'], L['DIPLOMA']['y'], L['DIPLOMA']['z']), col, M['paper']),
        box('ctx_evidence_box', (0.56, 0.24, 0.5), (L['EVIDENCE_BOX']['x'], L['EVIDENCE_BOX']['y'] + 0.12, L['EVIDENCE_BOX']['z']), col, M['cardboard']),
        box('ctx_folders', (0.46, 0.12, 0.34), (0.62, top + 0.06, -1.25), col, M['paper']),
        box('ctx_dossier', (0.3, 0.03, 0.4), (-0.45, top + 0.015, -1.3), col, M['black']),
        plane('ctx_neon', 2.0, 0.3, (cw['x'], cw['y'] + cw['h'] / 2 + 0.33, cw['z'] + 0.05), col, emission('neon', '#ff3b3b', 12)),
        sphere('ctx_bulb', 0.035, (-0.95, top + 0.36, -1.92), col, emission('bulb', '#ffd28a', 40)),
    ]
    # venetian blinds: tilted slats in the window opening; their shadow is the moonlight stripes
    for i in range(15):
        parts.append(box('ctx_slat', (0.07, 0.012, win['w']), (win['x'] + 0.26, win['y'] + win['h'] / 2 - 0.06 - i * 0.075, win['z']), col, M['slat'], rot=R(0, 0, 0.75), bevel=0))
    return parts
