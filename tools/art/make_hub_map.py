"""Builds maps/hub.tmj, the digital village, as a Tiled map.

The map can be opened and edited in Tiled (https://www.mapeditor.org/).
Once someone edits it in Tiled, stop running this script, or it will
overwrite their work. It exists so the first version is reproducible.

    python3 tools/art/make_hub_map.py

The village grows with the story. Things that appear later are objects with an
"ifFlag" property (people, animals, "deco" tiles for buildings and gardens):

    start              Gus and his cat, Noor and the village board, empty lots
    got_lantern        Zoé moves in with her cart; the bakery starts to go up;
                       the lantern shows duck tracks to a hidden grove
    got_piece_traces   Fern and the community garden, chickens
    got_piece_keys     Sami by the pond, a kite in a tree
    got_piece_gallery  Pip's mail stand, a pigeon
    area2_done         the bakery opens (Bruno), the garden is ready to pick,
                       flowers and butterflies around the plaza, Théo's shop opens
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H, T = 40, 30, 16

# Tile indices 0-24 come from make_placeholder_art.py, 25 and up from make_village_art.py.
# Both are in assets/tiles/hub.png.
GRASS, FLOWERS, PATH, WATER, TREE, BUSH, ROCK, FENCE = 0, 1, 2, 3, 4, 5, 6, 7
WALL, WINDOW, DOOR, ROOF, ROOF_EAVE, STONE, GATE_C, GATE_O = 8, 9, 10, 11, 12, 13, 14, 15
SIGN, TALLGRASS, BRIDGE, COBBLE, COUNTER, WELL, LAMP, ROOFB, ROOFB_EAVE = 16, 17, 18, 19, 20, 21, 22, 23, 24
(WATER2, LILY, BOARD, BENCH, TABLE, STATUE, MAILBOX, CART, SOIL, SPROUT, VEGGIES, SCARECROW,
 SCAFFOLD, SCAFFOLD_TOP, ROOFO, ROOFO_EAVE, ROOFO_CHIMNEY, BAKERY_WINDOW, BAKERY_DOOR, STALL, POSTBOX,
 CHEST, CHEST_OPEN, THICKET, STUMP, MUSHROOMS, FLOWERPOT, BARREL, SACKS, FLOWERS_BLUE, STEPPING,
 HEDGE, PUMPKIN, SIGNPOST, LOT, KITE_TREE) = range(25, 61)
COLLIDES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24,
            25, 26, 27, 28, 29, 30, 31, 32, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 51, 52, 53, 56, 57, 58, 60]
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


def deco(name, x, y, tile, layer, flag):
    obj(name, "deco", x, y, tile=tile, layer=layer, ifFlag=flag)


# A sprinkle of flowers, tall grass and mushrooms on the lawns
for (x, y) in [(3, 15), (12, 8), (14, 21), (36, 9), (11, 18), (24, 9), (22, 26), (30, 27), (16, 27)]:
    g(x, y, FLOWERS)
for (x, y) in [(2, 16), (26, 12), (35, 12), (18, 21), (27, 26), (11, 27), (35, 26)]:
    g(x, y, FLOWERS_BLUE)
for (x, y) in [(2, 18), (3, 18), (2, 19), (37, 21), (37, 20), (16, 22), (17, 22), (22, 20), (21, 25), (33, 27), (34, 27)]:
    g(x, y, TALLGRASS)
for (x, y) in [(15, 25), (25, 27), (37, 24)]:
    g(x, y, MUSHROOMS)

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
    if area == 2:
        obj("gate2", "gate", gx, 3, area=2, open=True, dialogue="gate2_open")
    else:
        obj(f"gate{area}", "gate", gx, 3, area=area, open=False)
    s(gx, 2, STONE)

# Path along the gates, and lanes down to the village
for x in range(3, W - 3):
    g(x, 4, PATH); g(x, 5, PATH)
for y in range(5, 25):
    g(20, y, PATH); g(19, y, PATH)
for x in range(7, 37):
    g(x, 15, PATH)
for y in range(12, 16):
    g(7, y, PATH); g(31, y, PATH)

# Village plaza with the well
for y in range(10, 17):
    for x in range(16, 24):
        g(x, y, COBBLE)
s(20, 12, WELL)
s(16, 10, LAMP); s(23, 10, LAMP); s(16, 16, LAMP); s(23, 16, LAMP)
obj("well", "sign", 20, 12, dialogues="hub_well,hub_well_2,hub_well_3,hub_well_4", label="well")

# The village board: notes from people who could use a hand
s(17, 10, BOARD)
obj("board", "sign", 17, 10, dialogue="hub_board", label="board")
# A statue of the Save icon
s(16, 13, STATUE)
obj("statue", "sign", 16, 13, dialogue="hub_statue", label="statue")
# Gus's table, a bench and flower pots
s(23, 12, TABLE); s(23, 13, BENCH)
obj("bench", "sign", 23, 13, dialogue="hub_bench", label="bench")
s(18, 16, FLOWERPOT); s(21, 16, FLOWERPOT)

# Player's house (left) with a mailbox
for x in range(5, 10):
    s(x, 8, ROOF); s(x, 9, ROOF); s(x, 10, ROOF_EAVE); s(x, 11, WALL)
s(6, 11, WINDOW); s(8, 11, WINDOW); s(7, 11, DOOR)
obj("home_door", "sign", 7, 11, dialogue="hub_home", label="home")
for x in range(4, 11):
    s(x, 13, FENCE) if x not in (7,) else None
s(9, 12, MAILBOX)
obj("mailbox", "sign", 9, 12, dialogue="hub_mailbox", label="mailbox")

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
obj("shop_sign", "sign", 34, 13, dialogue="hub_shop_sign", ifNotFlag="area2_done")
obj("shop_sign_open", "sign", 34, 13, dialogue="hub_shop_open", ifFlag="area2_done")
s(34, 13, SIGN)
s(28, 11, BARREL)

# Pond with a bridge (bottom left), lily pads and ducks
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
for (x, y) in [(7, 19), (10, 22)]:
    if ground[y][x] == WATER:
        g(x, y, LILY)
obj("duck1", "critter", 8, 19, kind=0, move="swim", range=3, dialogues="duck_1,duck_2,duck_3", label="duck")
obj("duck2", "critter", 9, 22, kind=0, move="swim", range=3, dialogues="duck_1,duck_2,duck_3", label="duck")

# Trees, bushes and rocks to make it feel like a place
for (x, y) in [(2, 7), (3, 9), (13, 7), (14, 9), (26, 7), (27, 9), (36, 7), (37, 10), (2, 22), (14, 23),
               (37, 13), (2, 12), (23, 24), (17, 25), (26, 25), (36, 22), (12, 26), (31, 26), (22, 28), (36, 28)]:
    s(x, y, TREE)
for (x, y) in [(11, 12), (12, 12), (27, 12), (15, 18), (24, 17), (29, 17), (15, 27), (28, 28)]:
    s(x, y, BUSH)
for (x, y) in [(16, 24), (37, 26), (22, 22)]:
    s(x, y, ROCK)
s(24, 26, STUMP); s(34, 25, STUMP)
obj("stump", "sign", 24, 26, dialogue="hub_stump", label="stump")

# Welcome sign at the plaza
s(18, 17, SIGN)
obj("welcome_sign", "sign", 18, 17, dialogue="hub_welcome_sign")

# ---------------------------------------------------------------- the village grows
# The Digital Identity badge: a garden blooms around the plaza (and butterflies come)
for i, (x, y) in enumerate([(15, 10), (15, 12), (15, 14), (24, 10), (24, 12), (24, 14), (17, 17), (22, 17),
                            (18, 9), (21, 9), (9, 14), (5, 14), (28, 14), (34, 14)]):
    deco(f"garden{i}", x, y, FLOWERS, "ground", "area2_done")
obj("butterfly1", "critter", 3, 15, kind=3, move="flutter", range=2)
obj("butterfly2", "critter", 15, 12, kind=3, move="flutter", range=2, ifFlag="area2_done", frames="2,3")
obj("butterfly3", "critter", 24, 13, kind=3, move="flutter", range=2, ifFlag="area2_done")

# Gus (laptop at the plaza) and his cat Pixel, who naps on your doorstep once the sound is back
obj("gus", "npc", 22, 12, npc="gus", sheet="villagers", sprite=0)
obj("cat", "critter", 22, 14, kind=1, move="roam", range=2, dialogue="cat_awake", label="cat", ifNotFlag="q_sound_done")
obj("cat_nap", "critter", 8, 12, kind=5, move="still", dialogue="cat_asleep", label="cat", ifFlag="q_sound_done")
# Noor looks after the village board
obj("noor", "npc", 18, 10, npc="noor", sheet="villagers", sprite=1)

# Zoé moves in with her cart of files once the lantern is found
obj("zoe", "npc", 11, 16, npc="zoe", sheet="villagers", sprite=2, ifFlag="got_lantern")
deco("zoe_cart", 12, 16, CART, "structures", "got_lantern")

# Fern and the community garden (first badge piece)
PLOT = [(x, y) for y in range(20, 23) for x in range(24, 29)]
for (x, y) in PLOT:
    g(x, y, TALLGRASS)
obj("garden_lot", "sign", 23, 20, dialogue="hub_garden_lot", ifNotFlag="got_piece_traces")
obj("garden_sign", "sign", 23, 20, dialogue="hub_garden_sign", ifFlag="got_piece_traces")
s(23, 20, SIGN)
for i, (x, y) in enumerate(PLOT):
    deco(f"plot{i}", x, y, SPROUT if (x + y) % 2 else SOIL, "ground", "got_piece_traces")
deco("scarecrow_tile", 28, 20, SCARECROW, "structures", "got_piece_traces")
obj("scarecrow", "sign", 28, 20, dialogues="hub_scarecrow,hub_scarecrow_2", label="scarecrow", ifFlag="got_piece_traces")
obj("fern", "npc", 26, 19, npc="fern", sheet="villagers", sprite=3, ifFlag="got_piece_traces")
obj("chicken1", "critter", 25, 24, kind=2, move="roam", range=2, dialogue="chicken", label="chicken", ifFlag="got_piece_traces")
obj("chicken2", "critter", 28, 24, kind=2, move="roam", range=2, dialogue="chicken", label="chicken", ifFlag="got_piece_traces")
for i, (x, y) in enumerate(PLOT):
    if (x, y) != (28, 20):
        deco(f"veg{i}", x, y, VEGGIES if (x + y) % 2 else SPROUT, "ground", "area2_done")
deco("pumpkin1", 29, 22, PUMPKIN, "structures", "area2_done")

# Sami by the pond (second badge piece), and a kite stuck in a tree
obj("sami", "npc", 13, 21, npc="sami", sheet="villagers", sprite=5, ifFlag="got_piece_keys")
deco("kite_tree", 14, 23, KITE_TREE, "structures", "got_piece_keys")
obj("kite", "sign", 14, 23, dialogue="hub_kite", label="kite", ifFlag="got_piece_keys")

# Pip's mail stand (third badge piece), on a lot that waits for it
for x in range(35, 37):
    g(x, 16, PATH)
for x in range(35, 38):
    g(x, 17, LOT)
obj("mail_lot", "sign", 34, 17, dialogue="hub_mail_lot", ifNotFlag="got_piece_gallery")
s(34, 17, SIGN)
obj("mail_sign", "sign", 34, 17, dialogue="hub_mail_sign", ifFlag="got_piece_gallery")
deco("stall1", 35, 17, STALL, "structures", "got_piece_gallery")
deco("stall2", 36, 17, STALL, "structures", "got_piece_gallery")
deco("postbox", 37, 17, POSTBOX, "structures", "got_piece_gallery")
obj("pip", "npc", 35, 18, npc="pip", sheet="villagers", sprite=4, ifFlag="got_piece_gallery")
obj("pigeon", "critter", 37, 18, kind=4, move="roam", range=1, dialogue="pigeon", label="pigeon", ifFlag="got_piece_gallery")

# The bakery: an empty lot, then a frame going up (lantern), then open (badge)
for y in (21, 22):
    for x in range(29, 34):
        g(x, y, LOT)
for y in range(16, 24):
    g(31, y, PATH)
for x in range(29, 35):
    g(x, 23, PATH)
obj("bakery_lot", "sign", 34, 22, dialogue="hub_bakery_lot", ifNotFlag="got_lantern")
obj("bakery_site", "sign", 34, 22, dialogue="hub_bakery_site", ifFlag="got_lantern", ifNotFlag="area2_done")
obj("bakery_sign", "sign", 34, 22, dialogue="hub_bakery_sign", ifFlag="area2_done")
s(34, 22, SIGN)
for x in range(29, 34):
    deco(f"frame_top{x}", x, 21, SCAFFOLD_TOP, "structures", "got_lantern")
    deco(f"frame{x}", x, 22, SCAFFOLD, "structures", "got_lantern")
for x in range(29, 34):
    deco(f"bakery_r1_{x}", x, 19, ROOFO_CHIMNEY if x == 32 else ROOFO, "structures", "area2_done")
    deco(f"bakery_r2_{x}", x, 20, ROOFO, "structures", "area2_done")
    deco(f"bakery_e_{x}", x, 21, ROOFO_EAVE, "structures", "area2_done")
    deco(f"bakery_w_{x}", x, 22, {30: BAKERY_WINDOW, 31: BAKERY_DOOR, 32: BAKERY_WINDOW}.get(x, WALL), "structures", "area2_done")
obj("bakery_door", "sign", 31, 22, dialogue="hub_bakery_door", label="bakery", ifFlag="area2_done")
deco("sacks", 34, 23, SACKS, "structures", "area2_done")
obj("bruno", "npc", 33, 24, npc="bruno", sheet="villagers", sprite=6, ifFlag="area2_done")

# A hidden grove in the south-west corner. The way in is through very tall grass;
# with the lantern, glowing duck tracks lead there from the pond.
for x in range(1, 9):
    s(x, 24, TREE)
for y in range(25, 29):
    s(7, y, TREE); s(8, y, TREE)
s(7, 26, EMPTY); s(8, 26, EMPTY)
g(7, 26, THICKET); g(8, 26, THICKET)
for (x, y) in [(13, 25), (18, 27), (29, 25), (33, 28)]:  # more tall grass, so the way in does not stand out
    g(x, y, THICKET)
for (x, y) in [(2, 25), (5, 27), (3, 27)]:
    g(x, y, FLOWERS_BLUE)
g(5, 25, MUSHROOMS); g(2, 27, MUSHROOMS)
for x in range(4, 7):
    g(x, 26, STEPPING)
obj("secret_chest", "chest", 3, 26, flag="hub_secret_chest", dialogue="hub_secret", closedTile=CHEST, openTile=CHEST_OPEN)
for i, (x, y) in enumerate([(11, 24), (10, 25), (9, 26), (6, 26)]):
    obj(f"track{i}", "trace", x, y, fx=15, lantern=True)
obj("butterfly4", "critter", 4, 26, kind=3, move="flutter", range=1, frames="2,3")

# People who were here from the start
obj("player", "spawn", 20, 18)
obj("from_dungeon2", "spawn", 10, 5, facing="down")
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
                    "value": "Digital village (hub). Object types: spawn, npc, gate, sign, talk, deco, critter, chest, trace."}],
    "tilesets": [{
        "firstgid": 1, "name": "village", "image": "../assets/tiles/hub.png",
        "imagewidth": 128, "imageheight": 128, "tilewidth": T, "tileheight": T,
        "tilecount": 64, "columns": 8, "margin": 0, "spacing": 0,
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
