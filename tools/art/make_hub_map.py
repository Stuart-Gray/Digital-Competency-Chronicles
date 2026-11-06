"""Builds maps/hub.tmj, the digital village, as a Tiled map.

The map can be opened and edited in Tiled (https://www.mapeditor.org/).
Once someone edits it in Tiled, stop running this script, or it will
overwrite their work. It exists so the first version is reproducible.

    python3 tools/art/make_hub_map.py
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H, T = 40, 26, 16

# Tile indices from make_placeholder_art.py
GRASS, FLOWERS, PATH, WATER, TREE, BUSH, ROCK, FENCE = 0, 1, 2, 3, 4, 5, 6, 7
WALL, WINDOW, DOOR, ROOF, ROOF_EAVE, STONE, GATE_C, GATE_O = 8, 9, 10, 11, 12, 13, 14, 15
SIGN, TALLGRASS, BRIDGE, COBBLE, COUNTER, WELL, LAMP, ROOFB, ROOFB_EAVE = 16, 17, 18, 19, 20, 21, 22, 23, 24
COLLIDES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24]
EMPTY = -1

ground = [[GRASS] * W for _ in range(H)]
struct = [[EMPTY] * W for _ in range(H)]
objects = []


def g(x, y, t):
    ground[y][x] = t


def s(x, y, t):
    struct[y][x] = t


def obj(name, typ, x, y, **props):
    """x, y in tiles; stored as the tile centre in pixels, like a Tiled point."""
    o = {
        "id": len(objects) + 1, "name": name, "type": typ,
        "x": x * T + T / 2, "y": y * T + T / 2, "point": True,
        "width": 0, "height": 0, "rotation": 0, "visible": True,
    }
    if props:
        o["properties"] = [
            {"name": k, "type": "bool" if isinstance(v, bool) else "int" if isinstance(v, int) else "string", "value": v}
            for k, v in props.items()
        ]
    objects.append(o)


# A sprinkle of flowers and tall grass on the lawns
for (x, y) in [(3, 15), (12, 8), (14, 20), (25, 21), (35, 17), (27, 15), (4, 21), (36, 9), (11, 17), (24, 9)]:
    g(x, y, FLOWERS)
for (x, y) in [(2, 18), (3, 18), (2, 19), (36, 21), (37, 21), (37, 20), (15, 22), (16, 22)]:
    g(x, y, TALLGRASS)

# Border of trees
for x in range(W):
    s(x, 0, TREE); s(x, H - 1, TREE)
for y in range(H):
    s(0, y, TREE); s(W - 1, y, TREE)
for x in range(1, W - 1):
    s(x, 1, TREE)

# The wall of the seven gates (top)
for x in range(2, W - 2):
    s(x, 2, STONE); s(x, 3, STONE)
GATE_X = [5, 10, 15, 20, 25, 30, 35]
for area, gx in enumerate(GATE_X, start=1):
    s(gx, 3, GATE_O if area == 2 else GATE_C)
    obj(f"gate{area}", "gate", gx, 3, area=area, open=(area == 2))
    s(gx, 2, STONE)

# Path along the gates, and lanes down to the village
for x in range(3, W - 3):
    g(x, 4, PATH); g(x, 5, PATH)
for gx in GATE_X:
    g(gx, 4, PATH)
for y in range(5, 18):
    g(20, y, PATH); g(19, y, PATH)
for x in range(7, 33):
    g(x, 15, PATH)
for y in range(12, 16):
    g(7, y, PATH); g(31, y, PATH)

# Village plaza with the well
for y in range(10, 17):
    for x in range(16, 24):
        g(x, y, COBBLE)
s(20, 12, WELL)
s(16, 10, LAMP); s(23, 10, LAMP); s(16, 16, LAMP); s(23, 16, LAMP)
obj("well", "sign", 20, 12, dialogue="hub_well")

# Player's house (left)
for x in range(5, 10):
    s(x, 8, ROOF); s(x, 9, ROOF); s(x, 10, ROOF_EAVE); s(x, 11, WALL)
s(6, 11, WINDOW); s(8, 11, WINDOW); s(7, 11, DOOR)
obj("home_door", "sign", 7, 11, dialogue="hub_home")
for x in range(4, 11):
    s(x, 13, FENCE) if x not in (7,) else None

# Fix-it shop (right) with a counter
for x in range(29, 34):
    s(x, 8, ROOFB); s(x, 9, ROOFB); s(x, 10, ROOFB_EAVE); s(x, 11, WALL)
s(30, 11, WINDOW); s(32, 11, WINDOW); s(31, 11, DOOR)
s(30, 13, COUNTER); s(31, 13, COUNTER); s(32, 13, COUNTER)
for x in range(29, 34):
    g(x, 12, COBBLE); g(x, 13, COBBLE)
obj("fixer", "npc", 31, 12, npc="fixer", sprite=1, dialogue="fixer_intro")
for cx in (30, 31, 32):
    obj(f"counter{cx}", "talk", cx, 13, target="fixer")
obj("shop_sign", "sign", 34, 13, dialogue="hub_shop_sign")
s(34, 13, SIGN)

# Pond with a bridge (bottom left)
for y in range(18, 24):
    for x in range(5, 13):
        if (x - 8.5) ** 2 / 14 + (y - 20.5) ** 2 / 6 <= 1:
            g(x, y, WATER)
for x in range(5, 13):
    if ground[20][x] == WATER:
        g(x, 20, BRIDGE)
for y in range(16, 21):
    g(4, y, PATH)
for x in range(4, 13):
    if ground[20][x] != BRIDGE and ground[20][x] != WATER:
        g(x, 20, PATH)

# Trees, bushes and rocks to make it feel like a place
for (x, y) in [(2, 7), (3, 9), (13, 7), (14, 9), (26, 7), (27, 9), (36, 7), (37, 10), (2, 22), (14, 23),
               (26, 23), (33, 22), (37, 15), (24, 20), (2, 12)]:
    s(x, y, TREE)
for (x, y) in [(11, 12), (12, 12), (27, 12), (28, 18), (34, 18), (15, 18), (24, 18)]:
    s(x, y, BUSH)
for (x, y) in [(13, 22), (35, 23), (22, 22)]:
    s(x, y, ROCK)

# Welcome sign at the plaza
s(18, 17, SIGN)
obj("welcome_sign", "sign", 18, 17, dialogue="hub_welcome_sign")

# People
obj("player", "spawn", 20, 18)
obj("guide", "npc", 21, 14, npc="guide", sprite=0, dialogue="guide_intro")
obj("kid", "npc", 13, 5, npc="kid", sprite=2, dialogue="kid_gates")
obj("elder", "npc", 14, 19, npc="elder", sprite=3, dialogue="elder_pond")

# Keep the spawn and NPC tiles free of structures
for o in objects:
    if o["type"] in ("spawn", "npc"):
        tx, ty = int(o["x"] // T), int(o["y"] // T)
        if struct[ty][tx] != EMPTY and o["name"] != "fixer":
            struct[ty][tx] = EMPTY


def layer(lid, name, grid):
    return {
        "id": lid, "name": name, "type": "tilelayer", "width": W, "height": H,
        "x": 0, "y": 0, "opacity": 1, "visible": True,
        "data": [(t + 1 if t >= 0 else 0) for row in grid for t in row],
    }


tmj = {
    "type": "map", "version": "1.10", "tiledversion": "1.10.2",
    "orientation": "orthogonal", "renderorder": "right-down", "infinite": False,
    "width": W, "height": H, "tilewidth": T, "tileheight": T,
    "nextlayerid": 4, "nextobjectid": len(objects) + 1,
    "properties": [{"name": "note", "type": "string",
                    "value": "Digital village (hub). Object types: spawn, npc, gate, sign, talk."}],
    "tilesets": [{
        "firstgid": 1, "name": "village", "image": "../assets/tiles/village.png",
        "imagewidth": 128, "imageheight": 64, "tilewidth": T, "tileheight": T,
        "tilecount": 32, "columns": 8, "margin": 0, "spacing": 0,
        "tiles": [{"id": i, "properties": [{"name": "collides", "type": "bool", "value": True}]} for i in COLLIDES],
    }],
    "layers": [
        layer(1, "ground", ground),
        layer(2, "structures", struct),
        {"id": 3, "name": "objects", "type": "objectgroup", "x": 0, "y": 0,
         "opacity": 1, "visible": True, "draworder": "topdown", "objects": objects},
    ],
}

out = os.path.join(ROOT, "maps", "hub.tmj")
with open(out, "w", encoding="utf-8") as f:
    json.dump(tmj, f, indent=1)
print("wrote", os.path.relpath(out, ROOT), f"({W}x{H}, {len(objects)} objects)")
