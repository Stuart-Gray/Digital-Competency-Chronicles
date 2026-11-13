"""Draws the extra art for the growing village: landmarks, new villagers and animals.

Everything here is drawn by this script (CC0, see assets/CREDITS.md). It stands on its
own (it does not import the other art scripts). Run it again after changing something:

    python3 tools/art/make_village_art.py

Needs Pillow. Writes:
    assets/tiles/hub.png           the village tileset: the 25 tiles of village.png (copied
                                   as they are) plus the new tiles listed in TILES, 8 per row
    assets/sprites/villagers.png   one row per new villager, 2 idle frames each
    assets/sprites/critters.png    one row per animal, 4 frames each (2 resting, 2 moving)

Run make_placeholder_art.py first if village.png is missing.
"""
import os
import random
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
T = 16
rnd = random.Random(23)  # fixed seed: the art is the same every run


def hexc(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


P = {k: hexc(v) for k, v in {
    "g1": "4c9a3f", "g2": "5fb04a", "g3": "3d7f34", "g4": "76c35a",
    "d1": "c9a46a", "d2": "b58f57", "d3": "dcbb83",
    "w1": "3b7dd8", "w2": "5b9cf0", "w3": "2c5fb0", "w4": "a8d4ff",
    "t1": "2f6b2c", "t2": "3f8a37", "t3": "57a84a", "tk": "6b4a2b",
    "r1": "8d8f99", "r2": "a9abb5", "r3": "6c6e78",
    "wa": "efe2c4", "wb": "d8c7a0", "wc": "b8a47c",
    "ro": "c0453b", "rd": "8f2e28", "rl": "dd6a55",
    "bl": "3a64b8", "bd": "27458a", "bL": "5b86d6",
    "wd": "7a5230", "wD": "5a3a20", "wl": "9a6c40",
    "st": "9a9aa6", "sD": "6e6e7c", "sL": "bfbfca",
    "k": "1d1b26", "gl": "ffe680", "gd": "e0b440",
    "pk": "f27aa8", "ye": "ffd84a", "wh": "ffffff", "or": "e8823a", "oD": "b85e20",
    "cb1": "cfc6b4", "cb2": "b9af9b", "cb3": "e0d8c8",
    "so": "7a5a3a", "sO": "664a2e", "sl": "8e6c48",
    "pu": "7a3a8a", "pU": "a565b8", "cy": "2a9d8f", "cr": "f2ead6",
}.items()}


def blank():
    return Image.new("RGBA", (T, T), (0, 0, 0, 0))


def put(im, x, y, c):
    if 0 <= x < im.size[0] and 0 <= y < im.size[1]:
        im.putpixel((int(x), int(y)), c)


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(im, x, y, c)


def circle(im, cx, cy, r, c):
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(im, x, y, c)


def outline(im, color=None):
    color = color or P["k"]
    w, h = im.size
    src = im.copy()
    for y in range(h):
        for x in range(w):
            if src.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] > 0:
                        im.putpixel((x, y), color)
                        break
    return im


def over(base, top):
    out = base.copy()
    out.alpha_composite(top)
    return out


# ---------------------------------------------------------------- tiles
BASE = Image.open(os.path.join(ROOT, "assets", "tiles", "village.png")).convert("RGBA")


def base_tile(i):
    return BASE.crop(((i % 8) * T, (i // 8) * T, (i % 8) * T + T, (i // 8) * T + T))


GRASS, WATER, COBBLE, PATH = base_tile(0), base_tile(3), base_tile(19), base_tile(2)


def on(base, fn):
    top = blank()
    fn(top)
    return over(base, outline(top))


def t_water2():
    """Second frame of the water, for a slow shimmer."""
    im = WATER.copy()
    px = im.load()
    for y in range(T):
        for x in range(T):
            if px[x, y] == P["w4"]:
                px[x, y] = P["w1"]
    for (x, y) in [(6, 2), (12, 7), (1, 10), (8, 14)]:
        for i in range(3):
            put(im, x + i, y, P["w4"])
    return im


def t_lily():
    def f(top):
        circle(top, 6, 8, 3.6, P["t2"]); circle(top, 5, 7, 1.5, P["t3"])
        rect(top, 6, 8, 9, 8, (0, 0, 0, 0))
        circle(top, 11, 5, 1.2, P["pk"]); put(top, 11, 5, P["ye"])
    return on(WATER, f)


def t_board():
    """The village board: a cork board on two posts, with notes pinned to it."""
    def f(top):
        rect(top, 2, 9, 3, 14, P["wD"]); rect(top, 12, 9, 13, 14, P["wD"])
        rect(top, 1, 1, 14, 10, P["wd"]); rect(top, 2, 2, 13, 9, P["d1"])
        rect(top, 3, 3, 6, 6, P["wh"]); rect(top, 8, 3, 12, 5, P["ye"]); rect(top, 7, 7, 10, 8, P["pk"])
        rect(top, 3, 8, 5, 8, P["w4"])
        put(top, 4, 3, P["ro"]); put(top, 10, 3, P["bl"]); put(top, 8, 7, P["ro"])
    return on(COBBLE, f)


def t_bench():
    def f(top):
        rect(top, 1, 5, 14, 6, P["wl"]); rect(top, 1, 8, 14, 10, P["wd"]); rect(top, 1, 8, 14, 8, P["wl"])
        rect(top, 2, 11, 3, 13, P["wD"]); rect(top, 12, 11, 13, 13, P["wD"])
        rect(top, 2, 6, 2, 8, P["wD"]); rect(top, 13, 6, 13, 8, P["wD"])
    return on(COBBLE, f)


def t_table_laptop():
    def f(top):
        rect(top, 1, 8, 14, 10, P["wl"]); rect(top, 2, 11, 3, 14, P["wD"]); rect(top, 12, 11, 13, 14, P["wD"])
        rect(top, 4, 2, 12, 7, P["r3"]); rect(top, 5, 3, 11, 6, P["w2"]); put(top, 6, 4, P["w4"])
        rect(top, 3, 8, 13, 8, P["r2"])
    return on(COBBLE, f)


def t_statue():
    """A statue of the Save icon: a floppy disk on a stone base."""
    def f(top):
        rect(top, 3, 11, 12, 14, P["st"]); rect(top, 3, 11, 12, 11, P["sL"]); rect(top, 2, 14, 13, 14, P["sD"])
        rect(top, 4, 1, 11, 10, P["bl"]); put(top, 11, 1, (0, 0, 0, 0))
        rect(top, 6, 1, 9, 4, P["sL"]); rect(top, 8, 2, 8, 3, P["bd"])
        rect(top, 5, 6, 10, 10, P["wh"]); rect(top, 6, 7, 9, 7, P["r2"]); rect(top, 6, 9, 9, 9, P["r2"])
    return on(COBBLE, f)


def t_mailbox():
    def f(top):
        rect(top, 7, 8, 8, 14, P["wD"])
        rect(top, 3, 3, 12, 8, P["bl"]); rect(top, 3, 3, 12, 4, P["bL"]); rect(top, 4, 6, 8, 6, P["k"])
        rect(top, 12, 2, 13, 5, P["ro"])
    return on(GRASS, f)


def t_cart():
    """Zoé's cart, piled with folders."""
    def f(top):
        rect(top, 1, 8, 14, 11, P["wd"]); rect(top, 1, 8, 14, 8, P["wl"])
        circle(top, 4, 13, 1.6, P["r3"]); circle(top, 11, 13, 1.6, P["r3"])
        rect(top, 2, 4, 5, 7, P["ye"]); rect(top, 2, 3, 3, 3, P["ye"])
        rect(top, 6, 2, 9, 7, P["bL"]); rect(top, 6, 1, 7, 1, P["bL"])
        rect(top, 10, 5, 13, 7, P["pk"]); rect(top, 10, 4, 11, 4, P["pk"])
    return on(GRASS, f)


def soil(x, y):
    return rnd.choices([P["so"], P["sO"], P["sl"]], [70, 18, 12])[0]


def t_soil():
    im = blank()
    for y in range(T):
        for x in range(T):
            im.putpixel((x, y), soil(x, y))
    for y in (3, 8, 13):
        rect(im, 0, y, 15, y, P["sO"])
    return im


def t_sprout():
    im = t_soil()
    for (x, y) in [(3, 2), (11, 2), (7, 7), (3, 12), (11, 12)]:
        put(im, x, y, P["g4"]); put(im, x - 1, y - 1, P["g2"]); put(im, x + 1, y - 1, P["g2"]); put(im, x, y + 1, P["g3"])
    return im


def t_veggies():
    im = t_soil()
    for (x, y) in [(3, 3), (11, 12)]:  # carrots
        rect(im, x - 1, y - 2, x + 1, y - 1, P["g2"]); put(im, x, y - 3, P["g4"])
        rect(im, x, y, x, y + 1, P["or"])
    for (x, y) in [(11, 3), (4, 12)]:  # leafy greens
        circle(im, x, y, 2.2, P["t2"]); put(im, x, y, P["t3"]); put(im, x - 1, y - 1, P["g4"])
    circle(im, 8, 8, 2, P["or"]); put(im, 8, 6, P["g3"]); put(im, 7, 8, P["oD"])  # a small pumpkin
    return im


def t_scarecrow():
    def f(top):
        rect(top, 7, 9, 8, 14, P["wD"]); rect(top, 2, 7, 13, 8, P["wD"])
        rect(top, 5, 6, 10, 11, P["ro"]); rect(top, 5, 9, 10, 9, P["rd"])
        circle(top, 7.5, 3.5, 2.6, P["d3"])
        rect(top, 4, 1, 11, 1, P["gd"]); rect(top, 6, 0, 9, 0, P["gd"])
        rect(top, 5, 3, 10, 3, P["k"]); put(top, 7, 3, P["d3"]); put(top, 8, 3, P["d3"])  # sunglasses
        put(top, 7, 5, P["rd"]); put(top, 8, 5, P["rd"])
    return on(t_soil(), f)


def t_scaffold(top_part=False):
    """A building going up: a wooden frame."""
    def f(top):
        for x in (1, 13):
            rect(top, x, 0, x + 1, 15, P["wl"])
        rect(top, 0, 4, 15, 5, P["wd"])
        if top_part:
            rect(top, 0, 0, 15, 1, P["wd"])
            for i in range(12):
                put(top, 2 + i, 4 - (i if i < 3 else 3), P["wl"])
        else:
            rect(top, 0, 12, 15, 13, P["wd"])
            for i in range(7):
                put(top, 3 + i, 11 - i, P["wl"]); put(top, 12 - i, 11 - i, P["wl"])
    return on(GRASS, f)


def t_roof(c1, c2, c3, eave=False, chimney=False):
    im = blank()
    rect(im, 0, 0, 15, 15, c1)
    for y in range(0, T, 4):
        rect(im, 0, y, 15, y, c2)
        for x in range((y // 4 % 2) * 4, T, 8):
            put(im, x, y + 1, c2); put(im, x, y + 2, c2)
    rect(im, 0, 0, 15, 0, c3)
    if eave:
        rect(im, 0, 13, 15, 15, c2); rect(im, 0, 15, 15, 15, P["k"])
    if chimney:
        rect(im, 5, 3, 10, 11, P["k"]); rect(im, 6, 4, 9, 10, P["ro"]); rect(im, 6, 7, 9, 7, P["rd"])
        rect(im, 5, 2, 10, 3, P["sD"])
    return im


def wall():
    return base_tile(8)


def t_bakery_window():
    im = wall()
    rect(im, 2, 3, 13, 12, P["wD"]); rect(im, 3, 4, 12, 11, P["w4"])
    rect(im, 3, 9, 12, 11, P["wl"])
    rect(im, 4, 7, 7, 8, P["d1"]); put(im, 5, 7, P["d2"])           # a loaf
    circle(im, 10, 7.5, 1.6, P["gd"]); put(im, 10, 7, P["d2"])       # a bun
    rect(im, 2, 1, 13, 2, P["or"])
    for x in range(2, 14, 4):
        rect(im, x, 1, x + 1, 2, P["cr"])                             # striped awning
    return im


def t_bakery_door():
    im = wall()
    rect(im, 4, 2, 11, 15, P["wD"]); rect(im, 5, 3, 10, 15, P["or"]); rect(im, 6, 4, 9, 8, P["w4"])
    put(im, 9, 10, P["gl"])
    return im


def t_stall():
    """Pip's mail stand: a striped awning over a counter with letters."""
    def f(top):
        rect(top, 0, 1, 15, 4, P["bl"])
        for x in range(0, 16, 4):
            rect(top, x, 1, x + 1, 4, P["cr"])
        rect(top, 1, 5, 1, 9, P["wD"]); rect(top, 14, 5, 14, 9, P["wD"])
        rect(top, 0, 9, 15, 14, P["wd"]); rect(top, 0, 9, 15, 10, P["wl"])
        rect(top, 4, 6, 8, 8, P["wh"]); put(top, 6, 7, P["ro"]); rect(top, 10, 7, 12, 8, P["ye"])
    return on(GRASS, f)


def t_postbox():
    def f(top):
        rect(top, 4, 3, 11, 14, P["ro"]); rect(top, 4, 3, 11, 4, P["rl"]); rect(top, 5, 2, 10, 2, P["ro"])
        rect(top, 5, 6, 10, 6, P["k"]); rect(top, 6, 9, 9, 11, P["wh"]); put(top, 7, 10, P["ro"])
        rect(top, 4, 14, 11, 14, P["rd"])
    return on(GRASS, f)


def t_chest(open_=False):
    def f(top):
        rect(top, 2, 6, 13, 13, P["wd"]); rect(top, 2, 9, 13, 9, P["wD"])
        rect(top, 2, 6, 2, 13, P["gd"]); rect(top, 13, 6, 13, 13, P["gd"])
        if open_:
            rect(top, 2, 2, 13, 5, P["wD"]); rect(top, 3, 3, 12, 5, P["k"]); rect(top, 4, 5, 11, 5, P["gl"])
        else:
            rect(top, 2, 4, 13, 6, P["wl"]); rect(top, 7, 7, 8, 9, P["gl"])
    return on(GRASS, f)


def t_thicket():
    """Very tall grass you can push through. It hides a way in."""
    im = GRASS.copy()
    for x in range(0, 16, 2):
        h = rnd.randint(7, 12)
        rect(im, x, 15 - h, x, 15, P["g3"]); put(im, x, 15 - h, P["g4"])
        rect(im, x + 1, 15 - h + 3, x + 1, 15, P["t2"])
    return im


def t_stump():
    def f(top):
        rect(top, 4, 7, 11, 13, P["wd"]); circle(top, 7.5, 7, 4, P["d3"]); circle(top, 7.5, 7, 2, P["d1"])
        put(top, 7, 7, P["wd"]); rect(top, 3, 13, 5, 13, P["wD"]); rect(top, 10, 13, 12, 13, P["wD"])
    return on(GRASS, f)


def t_mushrooms():
    im = GRASS.copy()
    for (x, y) in [(4, 6), (11, 10)]:
        rect(im, x - 2, y - 2, x + 2, y - 1, P["ro"]); rect(im, x - 1, y - 3, x + 1, y - 3, P["ro"])
        put(im, x - 1, y - 2, P["wh"]); put(im, x + 1, y - 3, P["wh"])
        rect(im, x, y, x, y + 1, P["cr"])
    return im


def t_flowerpot():
    def f(top):
        rect(top, 4, 9, 11, 14, P["or"]); rect(top, 3, 8, 12, 9, P["oD"])
        circle(top, 5, 5, 2, P["pk"]); circle(top, 10, 4, 2, P["ye"]); circle(top, 8, 6, 2, P["pU"])
        put(top, 5, 5, P["ye"]); put(top, 10, 4, P["or"]); put(top, 8, 6, P["wh"])
    return on(COBBLE, f)


def t_barrel():
    def f(top):
        rect(top, 4, 3, 11, 14, P["wd"]); rect(top, 3, 5, 12, 12, P["wd"])
        rect(top, 3, 5, 12, 5, P["r3"]); rect(top, 3, 11, 12, 11, P["r3"]); rect(top, 6, 3, 6, 14, P["wD"]); rect(top, 9, 3, 9, 14, P["wD"])
    return on(GRASS, f)


def t_sacks():
    """Flour sacks by the bakery."""
    def f(top):
        circle(top, 5, 10, 4, P["cr"]); circle(top, 11, 11, 3.5, P["wb"]); rect(top, 4, 5, 6, 6, P["cr"])
        rect(top, 4, 10, 6, 10, P["d2"]); put(top, 11, 11, P["d2"])
    return on(GRASS, f)


def t_flowers_blue():
    im = GRASS.copy()
    for (x, y, c) in [(3, 3, "pU"), (10, 5, "w4"), (6, 11, "pU"), (13, 12, "wh"), (2, 9, "w4")]:
        put(im, x, y, P[c]); put(im, x + 1, y, P[c]); put(im, x, y + 1, P[c]); put(im, x + 1, y + 1, P["ye"])
    return im


def t_stepping():
    im = GRASS.copy()
    circle(im, 5, 5, 3, P["r2"]); circle(im, 11, 11, 3, P["r2"]); put(im, 4, 4, P["sL"]); put(im, 10, 10, P["sL"])
    return im


def t_hedge():
    im = GRASS.copy()
    top = blank()
    rect(top, 0, 3, 15, 13, P["t1"]); rect(top, 0, 3, 15, 5, P["t2"])
    for (x, y) in [(2, 4), (7, 3), (12, 5), (4, 8), (10, 9)]:
        put(top, x, y, P["t3"])
    outline(top)
    return over(im, top)


def t_pumpkin():
    def f(top):
        circle(top, 7.5, 9, 5, P["or"]); rect(top, 7, 3, 8, 5, P["g3"]); rect(top, 5, 5, 5, 13, P["oD"]); rect(top, 10, 5, 10, 13, P["oD"])
        put(top, 6, 7, P["ye"])
    return on(GRASS, f)


def t_signpost():
    """A post with arrows pointing three ways."""
    def f(top):
        rect(top, 7, 2, 8, 14, P["wD"])
        rect(top, 8, 2, 13, 4, P["d3"]); put(top, 14, 3, P["d3"])
        rect(top, 2, 6, 7, 8, P["d3"]); put(top, 1, 7, P["d3"])
        rect(top, 8, 10, 12, 12, P["d3"]); put(top, 13, 11, P["d3"])
    return on(GRASS, f)


def t_lot():
    """An empty lot: bare ground with a few pegs."""
    im = PATH.copy()
    for (x, y) in [(2, 2), (13, 2), (2, 13), (13, 13)]:
        rect(im, x, y - 1, x, y + 1, P["wD"])
    return im


def t_kite_tree():
    """A tree with a kite stuck in it."""
    im = base_tile(4)
    d = ImageDraw.Draw(im)
    d.polygon([(9, 2), (13, 5), (9, 9), (6, 5)], fill=P["ye"])
    d.line([(9, 2), (9, 9)], fill=P["ro"]); d.line([(6, 5), (13, 5)], fill=P["ro"])
    put(im, 10, 10, P["wh"]); put(im, 11, 12, P["wh"])
    return im


# name, function, collides. Index = 25 + position in this list.
TILES = [
    ("water2", t_water2, True),               # 25
    ("lily", t_lily, True),                   # 26
    ("board", t_board, True),                 # 27
    ("bench", t_bench, True),                 # 28
    ("table_laptop", t_table_laptop, True),   # 29
    ("statue", t_statue, True),               # 30
    ("mailbox", t_mailbox, True),             # 31
    ("cart", t_cart, True),                   # 32
    ("soil", t_soil, False),                  # 33
    ("sprout", t_sprout, False),              # 34
    ("veggies", t_veggies, False),            # 35
    ("scarecrow", t_scarecrow, True),         # 36
    ("scaffold", lambda: t_scaffold(False), True),      # 37
    ("scaffold_top", lambda: t_scaffold(True), True),   # 38
    ("roof_orange", lambda: t_roof(P["or"], P["oD"], P["ye"]), True),                 # 39
    ("roof_orange_eave", lambda: t_roof(P["or"], P["oD"], P["ye"], eave=True), True),  # 40
    ("roof_orange_chimney", lambda: t_roof(P["or"], P["oD"], P["ye"], chimney=True), True),  # 41
    ("bakery_window", t_bakery_window, True),  # 42
    ("bakery_door", t_bakery_door, True),      # 43
    ("stall", t_stall, True),                  # 44
    ("postbox", t_postbox, True),              # 45
    ("chest", lambda: t_chest(False), True),   # 46
    ("chest_open", lambda: t_chest(True), True),  # 47
    ("thicket", t_thicket, False),             # 48
    ("stump", t_stump, True),                  # 49
    ("mushrooms", t_mushrooms, False),         # 50
    ("flowerpot", t_flowerpot, True),          # 51
    ("barrel", t_barrel, True),                # 52
    ("sacks", t_sacks, True),                  # 53
    ("flowers_blue", t_flowers_blue, False),   # 54
    ("stepping", t_stepping, False),           # 55
    ("hedge", t_hedge, True),                  # 56
    ("pumpkin", t_pumpkin, True),              # 57
    ("signpost", t_signpost, True),            # 58
    ("lot", t_lot, False),                     # 59
    ("kite_tree", t_kite_tree, True),          # 60
]
FIRST = 25
BASE_COLLIDES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24]


def build_tiles():
    cols, rows = 8, 8
    sheet = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    sheet.paste(BASE.crop((0, 0, 8 * T, 4 * T)), (0, 0))
    for i, (_, fn, _) in enumerate(TILES):
        n = FIRST + i
        sheet.paste(fn(), ((n % cols) * T, (n // cols) * T))
    path = os.path.join(ROOT, "assets", "tiles", "hub.png")
    sheet.save(path)
    return path


# ---------------------------------------------------------------- villagers
# Letters: H hair or head covering, S skin, E eye, A mouth, C top, D top shade, P pants,
# B shoes, T hat, U hat shade, M moustache or beard, G glasses, W apron or bag strap
BODY = [
    "....CCCCCCCC....",
    "...SCCCCCCCCS...",
    "...SDCCCCCCDS...",
    "....DDDDDDDD....",
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....BBB..BBB....",
    "................",
]
HEADS = {
    "plain": [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HSSSSSSH....",
        "....SSESSESS....",
        "....SSSSSSSS....",
        ".....SSAASS.....",
    ],
    "grandpa": [  # bald on top, grey at the sides, glasses and a moustache
        "................",
        "................",
        ".....SSSSSS.....",
        "....HSSSSSSH....",
        "....HSSSSSSH....",
        "....GGEGGEGG....",
        "....SSSSSSSS....",
        ".....SMMMMS.....",
    ],
    "scarf": [  # a head scarf
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "...HHSSSSSSHH...",
        "...HSSESSESSH...",
        "...HHSSSSSSHH...",
        "....HHSAASHH....",
    ],
    "ponytail": [
        "................",
        "...........HH...",
        ".....HHHHHHHH...",
        "....HHHHHHHHH...",
        "....HSSSSSSHH...",
        "....SSESSESS.H..",
        "....SSSSSSSS....",
        ".....SSAASS.....",
    ],
    "strawhat": [
        "................",
        ".....TTTTTT.....",
        "....TTTTTTTT....",
        "..UUUUUUUUUUUU..",
        "....HSSSSSSH....",
        "....SSESSESS....",
        "....SSSSSSSS....",
        ".....SSAASS.....",
    ],
    "cap": [
        "................",
        "................",
        ".....TTTTTT.....",
        "....TTTTTTTT....",
        "....UUUUUUUUUU..",
        "....SSESSESS....",
        "....SSSSSSSS....",
        ".....SSAASS.....",
    ],
    "curly": [
        "................",
        "....H.HH.HH.....",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "...HHSSSSSSHH...",
        "....SSESSESS....",
        "....SSSSSSSS....",
        ".....SSAASS.....",
    ],
    "toque": [  # a baker's hat and a moustache
        "....TTTTTTTT....",
        "....TTTTTTTT....",
        ".....TTTTTT.....",
        ".....UUUUUU.....",
        "....HSSSSSSH....",
        "....SSESSESS....",
        "....SMMSSMMS....",
        ".....SSAASS.....",
    ],
}
VILLAGERS = [  # rows of villagers.png: the "sprite" property on the map picks a row
    dict(head="grandpa", H="c9c9d6", S="e8c39e", E="1d1b26", G="5a5a6a", M="f2f0e6", C="5a8a5a", D="3f6b3f", P="6b4a2b", B="2a2a34"),                      # 0 Gus
    dict(head="scarf", H="2a9d8f", S="c68c5e", E="1d1b26", A="9c5a4a", C="e0b440", D="b8902a", P="3a3a4a", B="2a2a34"),                                    # 1 Noor
    dict(head="ponytail", H="2a1a10", S="a86a44", E="1d1b26", A="7a4030", C="8a5ac0", D="6a3aa0", P="3a64b8", B="2a2a34"),                                 # 2 Zoé
    dict(head="strawhat", T="e8d08a", U="c9a85a", H="8a4a20", S="f2c8a0", E="1d1b26", A="d77a6a", C="5fb04a", D="3d7f34", P="3a64b8", B="6b4a2b", W="3a64b8"),  # 3 Fern
    dict(head="cap", T="27458a", U="1a2f66", S="d9a77c", E="1d1b26", A="9c5a4a", C="3a64b8", D="27458a", P="27458a", B="2a2a34", W="6b4a2b"),              # 4 Pip
    dict(head="curly", H="1d1b26", S="8d5a3a", E="1d1b26", A="6a3a2a", C="ffd84a", D="e0b440", P="c0453b", B="2a2a34"),                                    # 5 Sami
    dict(head="toque", T="ffffff", U="d9d9e2", H="5a3a20", S="f2c8a0", E="1d1b26", M="5a3a20", A="d77a6a", C="ffffff", D="d9d9e2", P="5a5a6a", B="2a2a34", W="ffffff"),  # 6 Bruno
]


def draw_rows(rows, colors):
    im = blank()
    for y, line in enumerate(rows):
        for x, ch in enumerate(line):
            if ch != "." and ch in colors:
                put(im, x, y, colors[ch])
    return outline(im)


def villager_rows(v):
    body = [list(r) for r in BODY]
    if v["head"] == "strawhat":   # overalls: straps over the shirt
        for y in (0, 1, 2):
            body[y][5] = "W"; body[y][10] = "W"
        for x in range(4, 12):
            body[3][x] = "W"
    if v["head"] == "cap":        # a mail bag strap across the chest
        for i, x in enumerate((5, 6, 7, 8)):
            body[min(i, 3)][x] = "W"
    if v["head"] == "toque":      # apron
        for y in (1, 2, 3):
            for x in range(5, 11):
                body[y][x] = "C"
        body[0] = list("....DCCCCCCD....")
    return HEADS[v["head"]] + ["".join(r) for r in body]


def build_villagers():
    sheet = Image.new("RGBA", (2 * T, len(VILLAGERS) * T), (0, 0, 0, 0))
    for row, v in enumerate(VILLAGERS):
        colors = {k: hexc(val) for k, val in v.items() if k != "head"}
        rows = villager_rows(v)
        a = draw_rows(rows, colors)
        b = draw_rows(rows[1:] + ["................"], colors)  # a little bob
        sheet.paste(a, (0, row * T)); sheet.paste(b, (T, row * T))
    path = os.path.join(ROOT, "assets", "sprites", "villagers.png")
    sheet.save(path)
    return path


# ---------------------------------------------------------------- animals
# Each animal: 4 frames facing right (rest A, rest B, move A, move B). The game flips them to face left.
def duck(frame):
    im = blank()
    bob = 1 if frame in (1, 3) else 0
    circle(im, 7, 10 + bob, 3.6, P["wh"]); rect(im, 3, 9 + bob, 5, 10 + bob, P["wh"])     # body and tail
    circle(im, 11, 6 + bob, 2.4, P["wh"]); rect(im, 13, 6 + bob, 14, 7 + bob, P["or"])     # head and bill
    put(im, 11, 5 + bob, P["k"]); rect(im, 6, 10 + bob, 8, 10 + bob, P["r2"])
    outline(im)
    ripple = [(2, 14), (3, 14), (11, 14), (12, 14)] if frame % 2 == 0 else [(1, 14), (2, 14), (12, 14), (13, 14)]
    if frame >= 2:
        ripple += [(0, 12), (1, 13)]
    for (x, y) in ripple:
        put(im, x, y, P["w4"])
    return im


def cat(frame):
    im = blank()
    c, c2 = P["or"], P["oD"]
    if frame < 2:  # sitting; the tail flicks
        rect(im, 5, 8, 10, 13, c); rect(im, 6, 4, 11, 8, c); put(im, 6, 3, c); put(im, 11, 3, c)
        put(im, 7, 6, P["k"]); put(im, 10, 6, P["k"]); put(im, 8, 7, P["pk"]); put(im, 9, 7, P["pk"])
        rect(im, 6, 10, 9, 10, c2)
        if frame == 0:
            rect(im, 3, 12, 5, 13, c); put(im, 2, 11, c)
        else:
            rect(im, 3, 11, 4, 13, c); put(im, 3, 10, c)
    else:           # walking
        rect(im, 3, 8, 11, 11, c); rect(im, 10, 5, 14, 9, c); put(im, 10, 4, c); put(im, 14, 4, c)
        put(im, 12, 7, P["k"]); put(im, 14, 8, P["pk"]); rect(im, 5, 8, 6, 9, c2); rect(im, 8, 8, 9, 9, c2)
        rect(im, 1, 6, 2, 8, c); put(im, 2, 9, c)
        legs = [(4, 12), (10, 12)] if frame == 2 else [(5, 12), (9, 12)]
        for (x, y) in legs:
            rect(im, x, y, x, y + 1, c)
    return outline(im)


def cat_asleep(frame):
    im = blank()
    c, c2 = P["or"], P["oD"]
    circle(im, 8, 11, 4, c); rect(im, 4, 10, 12, 13, c); rect(im, 9, 8, 13, 11, c); put(im, 9, 7, c); put(im, 13, 7, c)
    rect(im, 10, 10, 11, 10, P["k"]); rect(im, 5, 11, 7, 11, c2); rect(im, 3, 12, 5, 13, c)
    outline(im)
    z = [(13, 3), (14, 3), (14, 4), (13, 5), (14, 5)] if frame % 2 == 0 else [(11, 1), (12, 1), (12, 2), (11, 3), (12, 3)]
    for (x, y) in z:
        put(im, x, y, P["wh"])
    return im


def chicken(frame):
    im = blank()
    peck = frame == 1
    circle(im, 7, 9, 3.6, P["wh"]); rect(im, 3, 6, 4, 8, P["wh"])
    hx, hy = (11, 5) if not peck else (12, 9)
    circle(im, hx, hy, 2, P["wh"]); put(im, hx + 2, hy, P["ye"]); put(im, hx, hy - 1, P["k"]); rect(im, hx - 1, hy - 3, hx, hy - 3, P["ro"])
    legs = [(6, 13), (9, 13)] if frame != 3 else [(5, 13), (10, 13)]
    for (x, y) in legs:
        rect(im, x, y, x, y + 1, P["ye"])
    return outline(im)


def butterfly(frame):
    im = blank()
    c = P["pk"] if frame < 2 else P["ye"]
    if frame % 2 == 0:
        rect(im, 4, 5, 6, 8, c); rect(im, 9, 5, 11, 8, c); put(im, 5, 6, P["wh"]); put(im, 10, 6, P["wh"])
    else:
        rect(im, 6, 5, 6, 8, c); rect(im, 9, 5, 9, 8, c)
    rect(im, 7, 5, 8, 9, P["k"])
    return im


def pigeon(frame):
    im = blank()
    bob = 1 if frame in (1, 3) else 0
    circle(im, 7, 10, 3.4, P["r2"]); rect(im, 2, 10, 4, 11, P["r3"])
    circle(im, 10, 6 + bob, 2, P["r1"]); put(im, 12, 6 + bob, P["ye"]); put(im, 10, 5 + bob, P["k"])
    rect(im, 8, 8 + bob, 10, 8 + bob, hexc("5fb04a")); rect(im, 5, 10, 8, 10, P["r3"])
    for x in (6, 8):
        rect(im, x, 13, x, 14, P["ro"])
    return outline(im)


CRITTERS = [("duck", duck), ("cat", cat), ("chicken", chicken), ("butterfly", butterfly), ("pigeon", pigeon), ("cat_asleep", cat_asleep)]


def build_critters():
    sheet = Image.new("RGBA", (4 * T, len(CRITTERS) * T), (0, 0, 0, 0))
    for row, (_, fn) in enumerate(CRITTERS):
        for f in range(4):
            sheet.paste(fn(f), (f * T, row * T))
    path = os.path.join(ROOT, "assets", "sprites", "critters.png")
    sheet.save(path)
    return path


if __name__ == "__main__":
    for p in (build_tiles(), build_villagers(), build_critters()):
        print("wrote", os.path.relpath(p, ROOT))
    print("new tiles:", ", ".join(f"{FIRST + i}={n}" for i, (n, _, _) in enumerate(TILES)))
    print("colliding tiles:", BASE_COLLIDES + [FIRST + i for i, (_, _, c) in enumerate(TILES) if c])
    print("villagers:", len(VILLAGERS), "rows; critters:", ", ".join(f"{i}={n}" for i, (n, _) in enumerate(CRITTERS)))
