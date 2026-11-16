"""One module per modelled piece. Each build(L, M, col) returns the piece's parts, placed in room
coordinates from layout.json (L) with materials from lib.materials.library() (M).

Sizes follow the procedural objects in src/scene/objects/ so a modelled piece drops in where the
procedural one stood; painted labels (typewriter sheet and keys, phone dial, desk name plate) and the
lamp bulb stay live on the site and are not modelled here.
"""
from . import cabinet, chair, coat_rack, desk, lamp, room_shell, telephone, typewriter

# name → module; the names are the output files and match ModelName in src/scene/models.ts
PIECES = {
    'room-shell': room_shell,
    'desk': desk,
    'chair': chair,
    'lamp': lamp,
    'typewriter': typewriter,
    'telephone': telephone,
    'cabinet': cabinet,
    'coat-rack': coat_rack,
}
