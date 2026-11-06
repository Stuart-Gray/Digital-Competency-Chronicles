"""Builds maps/area2.tmj, Dungeon 2 (Understanding digital identity), as a Tiled map.

Like make_hub_map.py: once someone edits the map in Tiled, stop running this script.

    python3 tools/art/make_area2_map.py

Rooms (see docs/content-mapping.md for the puzzles in each):
    Atrium          start, Lumi gives the Lantern of Traces, exit back to the village
    Hall of Traces  west wing (2a), with a hidden door only the lantern shows
    Vault of Keys   north wing (2b), with three key stones and an inner vault
    Window Gallery  east wing (2c)
    Mask Hall       final room, north of the gallery
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H, T = 46, 38, 16

# Tile indices from make_dungeon_art.py
FLOOR, CRACKED, RUG, TOP, FACE, TORCH, DOOR, DOOR_OPEN, CRACK, PILLAR = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
STONE, STONE_DOWN, BOARD, MIRROR, EASEL, CHEST, CHEST_OPEN, EXIT, WINDOW, SHELF = 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
VAULT, PLANT, PLANKS, VFLOOR, TOP_EDGE = 20, 21, 22, 23, 24
COLLIDES = [3, 4, 5, 6, 8, 9, 12, 13, 14, 15, 16, 18, 19, 20, 21, 24]
EMPTY = -1

ground = [[EMPTY] * W for _ in range(H)]
struct = [[TOP] * W for _ in range(H)]
objects = []


def room(x0, y0, x1, y1, tile=FLOOR):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            ground[y][x] = tile
            struct[y][x] = EMPTY


def g(x, y, t):
    ground[y][x] = t


def s(x, y, t):
    struct[y][x] = t


def obj(name, typ, x, y, **props):
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


# ---------------------------------------------------------------- rooms
room(18, 27, 29, 35)                 # Atrium
room(3, 30, 15, 35)                  # Hall of Traces, first half
room(3, 21, 15, 27)                  # Hall of Traces, second half (behind the hidden door)
room(16, 32, 17, 33)                 # passage Atrium -> Hall
room(18, 18, 29, 24, VFLOOR)         # Vault of Keys
room(21, 13, 26, 15, VFLOOR)         # inner vault
room(32, 27, 43, 35, PLANKS)         # Window Gallery
room(33, 14, 42, 23)                 # Mask Hall (final room)

# Doors cut through the walls (the door objects below draw them open or closed)
for (x, y) in [(23, 25), (23, 26), (23, 16), (23, 17), (30, 31), (31, 31), (37, 24), (37, 25), (37, 26), (9, 28), (9, 29)]:
    ground[y][x] = FLOOR

# Front-facing walls: a wall tile with floor just below it shows bricks.
for y in range(H - 1):
    for x in range(W):
        if struct[y][x] == TOP and ground[y + 1][x] != EMPTY and struct[y + 1][x] == EMPTY:
            struct[y][x] = FACE

# Decoration
room_rug = [(x, y) for x in range(21, 27) for y in range(29, 33)]
for (x, y) in room_rug:
    g(x, y, RUG)
for (x, y) in [(5, 33), (13, 31), (20, 34), (40, 33), (35, 16), (40, 20)]:
    g(x, y, CRACKED)
for x in range(35, 41):
    for y in range(16, 21):
        g(x, y, RUG)
for (x, y) in [(20, 26), (27, 26), (6, 29), (13, 29), (6, 20), (12, 20), (20, 17), (27, 17), (35, 26), (40, 26), (35, 13), (40, 13)]:
    if struct[y][x] == FACE:
        s(x, y, TORCH)
for (x, y) in [(34, 26), (41, 26)]:
    if struct[y][x] == FACE:
        s(x, y, WINDOW)
for (x, y) in [(4, 20), (5, 20), (14, 20)]:
    if struct[y][x] == FACE:
        s(x, y, SHELF)
s(18, 27, PLANT); s(29, 27, PLANT); s(32, 35, PLANT); s(43, 27, PLANT)
s(18, 18, PILLAR); s(29, 18, PILLAR); s(33, 14, PILLAR); s(42, 14, PILLAR)

# ---------------------------------------------------------------- atrium
obj("from_village", "spawn", 23, 33, facing="up")
g(23, 35, EXIT); g(24, 35, EXIT)
obj("exit_a", "exit", 23, 35, to="Hub", spawn="from_dungeon2")
obj("exit_b", "exit", 24, 35, to="Hub", spawn="from_dungeon2")
obj("lumi", "npc", 21, 28, npc="lumi", sprite=4)
obj("door_vault", "door", 23, 25, h=2, flag="got_piece_traces", dialogue="door_vault_closed")
obj("door_gallery", "door", 30, 31, w=2, flag="got_piece_keys", dialogue="door_gallery_closed", closed=6, closedTop=6)
obj("atrium_plaque", "sign", 26, 28, dialogue="atrium_plaque")
s(26, 28, BOARD)

# ---------------------------------------------------------------- hall of traces (2a)
obj("juno_a", "npc", 12, 32, npc="juno", sprite=5, ifNotFlag="hall_door_open")
# A trail of footprints the lantern shows once Juno's traces are matched, leading to the wall
for i, (x, y) in enumerate([(11, 32), (10, 31), (9, 30)]):
    obj(f"trail{i}", "trace", x, y, fx=1, lantern=True, ifFlag="d2_traces_done")
obj("hidden_door", "door", 9, 28, h=2, flag="hall_door_open", closed=CRACK, dialogue="hidden_door",
    lantern=True, fx=3, ifFlag="d2_traces_done")
obj("hall_wall_note", "sign", 5, 30, dialogue="hall_wall_note")
g(5, 30, CRACKED)
# Second half: the board (a deleted post) and the mirror (a profile picture)
obj("juno_b", "npc", 10, 25, npc="juno", sprite=5, ifFlag="hall_door_open")
s(6, 21, BOARD)
obj("board", "sign", 6, 21, dialogue="board_vanishing")
s(13, 21, MIRROR)
obj("mirror", "sign", 13, 21, dialogue="mirror_profile")
obj("chest_traces", "chest", 4, 24, flag="opened_chest_traces", dialogue="chest_traces", ifFlag="d2_vanishing_done,d2_profile_done")

# ---------------------------------------------------------------- vault of keys (2b)
obj("kai", "npc", 20, 21, npc="kai", sprite=6)
# Key stones: the lantern shows one, two, then three footprints beside them
obj("stone1", "keystone", 27, 23, group="vault", order=1, flag="keystones_done",
    ifFlag="d2_personal_done,d2_request_done,d2_password_done", resetDialogue="stones_reset", doneDialogue="stones_done")
obj("stone2", "keystone", 19, 23, group="vault", order=2, flag="keystones_done",
    ifFlag="d2_personal_done,d2_request_done,d2_password_done", resetDialogue="stones_reset", doneDialogue="stones_done")
obj("stone3", "keystone", 25, 20, group="vault", order=3, flag="keystones_done",
    ifFlag="d2_personal_done,d2_request_done,d2_password_done", resetDialogue="stones_reset", doneDialogue="stones_done")
obj("stone1_trace", "trace", 28, 23, fx=0, lantern=True, ifFlag="d2_password_done")
obj("stone2_trace", "trace", 18, 23, fx=1, lantern=True, ifFlag="d2_password_done")
obj("stone3_trace", "trace", 26, 20, fx=2, lantern=True, ifFlag="d2_password_done")
obj("vault_door", "door", 23, 16, h=2, flag="keystones_done", closed=VAULT, dialogue="vault_door_closed")
obj("chest_keys", "chest", 23, 14, flag="opened_chest_keys", dialogue="chest_keys")

# ---------------------------------------------------------------- window gallery (2c)
obj("nova", "npc", 35, 30, npc="nova", sprite=7)
s(38, 27, EASEL)
obj("easel", "sign", 38, 27, dialogue="easel_photo")
s(42, 30, BOARD)
obj("laptop", "sign", 42, 30, dialogue="laptop_call")
obj("chest_gallery", "chest", 42, 34, flag="opened_chest_gallery", dialogue="chest_gallery", ifFlag="d2_photo_done,d2_access_done,d2_camera_done")
obj("door_final", "door", 37, 24, h=3, flag="got_piece_traces,got_piece_keys,got_piece_gallery", dialogue="door_final_closed")

# ---------------------------------------------------------------- mask hall (final room)
obj("merchant", "npc", 37, 17, npc="merchant", sprite=8, ifNotFlag="area2_done")
obj("lumi_end", "npc", 37, 17, npc="lumi", sprite=4, ifFlag="area2_done")
# The way home appears when the area is done
obj("portal_c", "deco", 37, 22, tile=EXIT, layer="ground", ifFlag="area2_done")
obj("portal_d", "deco", 38, 22, tile=EXIT, layer="ground", ifFlag="area2_done")
obj("exit_c", "exit", 37, 22, to="Hub", spawn="from_dungeon2", ifFlag="area2_done")
obj("exit_d", "exit", 38, 22, to="Hub", spawn="from_dungeon2", ifFlag="area2_done")

# Keep people, spawns and exits on free floor
for o in objects:
    if o["type"] in ("spawn", "npc", "exit", "keystone", "trace", "deco"):
        tx, ty = int(o["x"] // T), int(o["y"] // T)
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
                    "value": "Dungeon 2: digital identity. Object types are listed in src/scenes/WorldScene.js and docs/content-schema.md."}],
    "tilesets": [{
        "firstgid": 1, "name": "dungeon", "image": "../assets/tiles/dungeon.png",
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

out = os.path.join(ROOT, "maps", "area2.tmj")
with open(out, "w", encoding="utf-8") as f:
    json.dump(tmj, f, indent=1)
print("wrote", os.path.relpath(out, ROOT), f"({W}x{H}, {len(objects)} objects)")
