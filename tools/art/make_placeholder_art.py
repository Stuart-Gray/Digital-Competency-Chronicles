"""Draws the placeholder pixel art for The Digital Competency Chronicles.

Everything here is drawn by this script, so the output is ours to license
(CC0, see assets/CREDITS.md). Run it again after changing a tile:

    python3 tools/art/make_placeholder_art.py

Needs Pillow (pip install pillow). Writes:
    assets/tiles/village.png      16x16 tiles, 8 per row (index list below)
    assets/sprites/hero.png       4 avatar rows x 12 frames (down, up, left, right x 3)
    assets/sprites/npcs.png       4 NPC rows x 2 idle frames
"""
import os
import random
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
T = 16
rnd = random.Random(7)  # fixed seed: the art is the same every run


def hexc(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


# A small 16-bit style palette.
P = {
    "g1": hexc("4c9a3f"), "g2": hexc("5fb04a"), "g3": hexc("3d7f34"), "g4": hexc("76c35a"),
    "d1": hexc("c9a46a"), "d2": hexc("b58f57"), "d3": hexc("dcbb83"),
    "w1": hexc("3b7dd8"), "w2": hexc("5b9cf0"), "w3": hexc("2c5fb0"), "w4": hexc("a8d4ff"),
    "t1": hexc("2f6b2c"), "t2": hexc("3f8a37"), "t3": hexc("57a84a"), "tk": hexc("6b4a2b"),
    "r1": hexc("8d8f99"), "r2": hexc("a9abb5"), "r3": hexc("6c6e78"),
    "f1": hexc("e8d9b5"), "f2": hexc("b89c6e"),
    "wa": hexc("efe2c4"), "wb": hexc("d8c7a0"), "wc": hexc("b8a47c"),
    "ro": hexc("c0453b"), "rd": hexc("8f2e28"), "rl": hexc("dd6a55"),
    "bl": hexc("3a64b8"), "bd": hexc("27458a"), "bL": hexc("5b86d6"),
    "wd": hexc("7a5230"), "wD": hexc("5a3a20"),
    "st": hexc("9a9aa6"), "sD": hexc("6e6e7c"), "sL": hexc("bfbfca"),
    "k": hexc("1d1b26"), "gl": hexc("ffe680"), "gd": hexc("e0b440"),
    "pk": hexc("f27aa8"), "ye": hexc("ffd84a"), "wh": hexc("ffffff"),
    "cb1": hexc("cfc6b4"), "cb2": hexc("b9af9b"), "cb3": hexc("e0d8c8"),
}


def new_tile(base=None):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    if base:
        for y in range(T):
            for x in range(T):
                im.putpixel((x, y), base(x, y))
    return im


def speckle(colors, weights):
    def f(x, y):
        return rnd.choices(colors, weights)[0]
    return f


def grass(x, y):
    return rnd.choices([P["g2"], P["g1"], P["g4"], P["g3"]], [70, 18, 8, 4])[0]


def put(im, x, y, c):
    if 0 <= x < T and 0 <= y < T:
        im.putpixel((x, y), c)


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(im, x, y, c)


def circle(im, cx, cy, r, c):
    for y in range(T):
        for x in range(T):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(im, x, y, c)


def outline(im, color=None):
    """Adds a dark 1px outline around opaque pixels (classic sprite look)."""
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
def t_grass():
    return new_tile(grass)


def t_flowers():
    im = t_grass()
    for (x, y, c) in [(3, 4, "pk"), (11, 3, "ye"), (6, 10, "wh"), (13, 12, "pk"), (2, 13, "ye")]:
        put(im, x, y, P[c]); put(im, x + 1, y, P[c]); put(im, x, y + 1, P[c]); put(im, x + 1, y + 1, P["gd"] if c != "ye" else P["wh"])
    return im


def t_path():
    return new_tile(speckle([P["d1"], P["d2"], P["d3"]], [70, 18, 12]))


def t_water():
    im = new_tile(speckle([P["w1"], P["w2"], P["w3"]], [70, 20, 10]))
    for (x, y) in [(2, 4), (9, 9), (5, 13), (12, 3)]:
        for i in range(3):
            put(im, x + i, y, P["w4"])
    return im


def t_tree():
    im = t_grass()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 7, 11, 8, 14, P["tk"])
    circle(top, 7.5, 6.5, 6.2, P["t1"])
    circle(top, 7, 6, 5, P["t2"])
    circle(top, 6, 4.5, 2.5, P["t3"])
    outline(top)
    return over(im, top)


def t_bush():
    im = t_grass()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    circle(top, 7.5, 9, 5.5, P["t1"])
    circle(top, 7, 8.5, 4.2, P["t2"])
    circle(top, 6, 7, 1.8, P["t3"])
    outline(top)
    return over(im, top)


def t_rock():
    im = t_grass()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    circle(top, 8, 9, 5.5, P["r3"])
    circle(top, 7.5, 8.5, 4.5, P["r1"])
    circle(top, 6, 7, 2, P["r2"])
    outline(top)
    return over(im, top)


def t_fence():
    im = t_grass()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 0, 6, 15, 7, P["f1"]); rect(top, 0, 10, 15, 11, P["f1"])
    for x in (2, 13):
        rect(top, x, 4, x + 1, 14, P["f1"]); rect(top, x + 1, 5, x + 1, 14, P["f2"])
    outline(top)
    return over(im, top)


def t_wall(window=False):
    im = new_tile(lambda x, y: P["wa"])
    for y in (4, 9, 14):
        rect(im, 0, y, 15, y, P["wb"])
    rect(im, 0, 15, 15, 15, P["wc"])
    rect(im, 0, 0, 0, 15, P["wb"]); rect(im, 15, 0, 15, 15, P["wc"])
    if window:
        rect(im, 4, 3, 11, 11, P["wD"])
        rect(im, 5, 4, 10, 10, P["w2"])
        rect(im, 5, 4, 7, 6, P["w4"])
        rect(im, 7, 4, 8, 10, P["wD"]); rect(im, 5, 7, 10, 7, P["wD"])
    return im


def t_door():
    im = t_wall()
    rect(im, 4, 2, 11, 15, P["wD"])
    rect(im, 5, 3, 10, 15, P["wd"])
    rect(im, 7, 3, 8, 15, P["wD"])
    put(im, 9, 9, P["gl"])
    return im


def t_roof(c1, c2, c3, eave=False):
    im = new_tile(lambda x, y: P[c1])
    for y in range(0, T, 4):
        rect(im, 0, y, 15, y, P[c2])
        for x in range((y // 4 % 2) * 4, T, 8):
            put(im, x, y + 1, P[c2]); put(im, x, y + 2, P[c2])
    rect(im, 0, 0, 15, 0, P[c3])
    if eave:
        rect(im, 0, 13, 15, 15, P[c2]); rect(im, 0, 15, 15, 15, P["k"])
    return im


def t_stone():
    im = new_tile(lambda x, y: P["st"])
    for y in (0, 5, 10, 15):
        rect(im, 0, y, 15, y, P["sD"])
    for row, y0 in enumerate((1, 6, 11)):
        off = 0 if row % 2 == 0 else 4
        for x in range(off, T, 8):
            rect(im, x, y0, x, y0 + 3, P["sD"])
        rect(im, 1, y0, 14, y0, P["sL"])
    return im


def t_gate(open_=False):
    im = t_stone()
    rect(im, 3, 3, 12, 15, P["k"])
    rect(im, 4, 2, 11, 2, P["k"]); rect(im, 5, 1, 10, 1, P["k"])
    if open_:
        rect(im, 4, 4, 11, 15, hexc("3a2b5c"))
        rect(im, 5, 3, 10, 3, hexc("3a2b5c"))
        for (x, y) in [(6, 7), (9, 10), (7, 13), (10, 6)]:
            put(im, x, y, P["gl"])
    else:
        rect(im, 4, 4, 11, 15, hexc("2a2a34"))
        for x in (5, 7, 9, 11):
            rect(im, x, 3, x, 15, P["r2"])
        rect(im, 4, 8, 11, 8, P["r2"]); rect(im, 4, 12, 11, 12, P["r2"])
    return im


def t_sign():
    im = t_grass()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 7, 9, 8, 14, P["wD"])
    rect(top, 2, 3, 13, 9, P["wd"])
    rect(top, 3, 4, 12, 8, P["d3"])
    for y in (5, 7):
        rect(top, 4, y, 11, y, P["wd"])
    outline(top)
    return over(im, top)


def t_tallgrass():
    im = t_grass()
    for x in range(1, 16, 3):
        h = rnd.randint(3, 6)
        rect(im, x, 14 - h, x, 14, P["g3"])
        put(im, x, 14 - h, P["g4"])
    return im


def t_bridge():
    im = t_water()
    rect(im, 0, 1, 15, 14, P["wd"])
    for y in range(1, 15, 3):
        rect(im, 0, y, 15, y, P["wD"])
    rect(im, 0, 0, 15, 0, P["k"]); rect(im, 0, 15, 15, 15, P["k"])
    return im


def t_cobble():
    im = new_tile(lambda x, y: P["cb1"])
    for y0 in range(0, T, 4):
        off = 0 if (y0 // 4) % 2 == 0 else 2
        rect(im, 0, y0, 15, y0, P["cb2"])
        for x in range(off, T, 5):
            rect(im, x, y0, x, y0 + 3, P["cb2"])
        put(im, off + 1, y0 + 1, P["cb3"])
    return im


def t_counter():
    im = t_cobble()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 0, 6, 15, 14, P["wd"]); rect(top, 0, 6, 15, 7, P["d3"])
    rect(top, 4, 3, 11, 7, P["k"]); rect(top, 5, 4, 10, 6, P["w2"])  # a tablet on the counter
    put(top, 6, 4, P["w4"])
    outline(top)
    return over(im, top)


def t_well():
    im = t_cobble()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    circle(top, 7.5, 9.5, 6, P["st"])
    circle(top, 7.5, 9.5, 3.5, P["w3"])
    rect(top, 2, 2, 2, 8, P["wD"]); rect(top, 13, 2, 13, 8, P["wD"])
    rect(top, 1, 1, 14, 2, P["rd"])
    outline(top)
    return over(im, top)


def t_lamp():
    im = t_cobble()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 7, 5, 8, 14, P["k"]); rect(top, 5, 14, 10, 14, P["k"])
    rect(top, 5, 1, 10, 5, P["k"]); rect(top, 6, 2, 9, 4, P["gl"])
    return over(im, top)


def t_roof_blue(eave=False):
    return t_roof("bl", "bd", "bL", eave)


TILES = [
    ("grass", t_grass, False),          # 0
    ("flowers", t_flowers, False),      # 1
    ("path", t_path, False),            # 2
    ("water", t_water, True),           # 3
    ("tree", t_tree, True),             # 4
    ("bush", t_bush, True),             # 5
    ("rock", t_rock, True),             # 6
    ("fence", t_fence, True),           # 7
    ("wall", lambda: t_wall(False), True),     # 8
    ("window", lambda: t_wall(True), True),    # 9
    ("door", t_door, True),             # 10
    ("roof", lambda: t_roof("ro", "rd", "rl"), True),          # 11
    ("roof_eave", lambda: t_roof("ro", "rd", "rl", True), True),  # 12
    ("stone", t_stone, True),           # 13
    ("gate_closed", lambda: t_gate(False), True),  # 14
    ("gate_open", lambda: t_gate(True), True),     # 15
    ("sign", t_sign, True),             # 16
    ("tallgrass", t_tallgrass, False),  # 17
    ("bridge", t_bridge, False),        # 18
    ("cobble", t_cobble, False),        # 19
    ("counter", t_counter, True),       # 20
    ("well", t_well, True),             # 21
    ("lamp", t_lamp, True),             # 22
    ("roof_blue", lambda: t_roof_blue(False), True),   # 23
    ("roof_blue_eave", lambda: t_roof_blue(True), True),  # 24
]


def build_tileset():
    cols = 8
    rows = (len(TILES) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    for i, (_, fn, _) in enumerate(TILES):
        sheet.paste(fn(), ((i % cols) * T, (i // cols) * T))
    path = os.path.join(ROOT, "assets", "tiles", "village.png")
    sheet.save(path)
    return path


# ---------------------------------------------------------------- characters
# Letters: H hair, S skin, E eye, C shirt, D shirt shade, P pants, B shoes, A accent
DOWN = [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HSSSSSSH....",
    "....SSESSESS....",
    "....SSSSSSSS....",
    ".....SSAASS.....",
    "....CCCCCCCC....",
    "...SCCCCCCCCS...",
    "...SDCCCCCCDS...",
    "....DDDDDDDD....",
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....BBB..BBB....",
    "................",
]
UP = [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....SHHHHHHS....",
    ".....SSSSSS.....",
    "....CCCCCCCC....",
    "...SCCCCCCCCS...",
    "...SDCCCCCCDS...",
    "....DDDDDDDD....",
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....BBB..BBB....",
    "................",
]
RIGHT = [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HHHSSSSS....",
    "....HHSSSSES....",
    "....HSSSSSSS....",
    ".....SSSSSA.....",
    ".....CCCCCC.....",
    ".....CCSCCC.....",
    ".....DCSCCD.....",
    ".....DDDDDD.....",
    ".....PPPPPP.....",
    ".....PPPPPP.....",
    ".....BBBBBB.....",
    "................",
]


def walk(rows, step, side=False):
    """Moves the legs to make walk frames. step 0 = standing, 1 and 2 = steps."""
    r = list(rows)
    if step == 0:
        return r
    if side:
        if step == 1:
            r[12], r[13], r[14] = "....PPP..PPP....", "...PPP....PPP...", "...BBB....BBB..."
        else:
            r[12], r[13], r[14] = ".....PPPPPP.....", "......PPPP......", "......BBBB......"
        return r
    if step == 1:
        r[13], r[14] = "....PPP..PPP....", "....BBB..PPP...."
        r = r[:15] + [".........BBB...."]
    else:
        r[13], r[14] = "....PPP..PPP....", "....PPP..BBB...."
        r = r[:15] + ["....BBB........."]
    return r


def draw(rows, colors, mirror=False):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    for y, line in enumerate(rows):
        for x, ch in enumerate(line):
            if ch != "." and ch in colors:
                put(im, (T - 1 - x) if mirror else x, y, colors[ch])
    return outline(im)


AVATARS = [  # hair, skin, shirt, shirt shade, pants, shoes, accent (mouth)
    dict(H="5a3a20", S="f2c8a0", E="1d1b26", C="3a64b8", D="27458a", P="4a4a5a", B="2a2a34", A="d77a6a"),
    dict(H="1d1b26", S="c68c5e", E="1d1b26", C="c0453b", D="8f2e28", P="3a3a4a", B="2a2a34", A="9c5a4a"),
    dict(H="e0b440", S="f6d6b8", E="1d1b26", C="3f8a37", D="2f6b2c", P="5a4a3a", B="2a2a34", A="d77a6a"),
    dict(H="7a3a8a", S="8d5a3a", E="1d1b26", C="e8a33a", D="b87a20", P="3a3a4a", B="2a2a34", A="6a3a2a"),
]
NPCS = [  # rows of npcs.png: the "sprite" property on the map picks a row
    dict(H="dcdcdc", S="f2c8a0", E="1d1b26", C="7a3a8a", D="5a2a6a", P="5a3a20", B="2a2a34", A="d77a6a"),  # 0 guide (Ada)
    dict(H="5a3a20", S="c68c5e", E="1d1b26", C="e8a33a", D="b87a20", P="27458a", B="2a2a34", A="9c5a4a"),  # 1 fixer (Théo)
    dict(H="c0453b", S="f6d6b8", E="1d1b26", C="5b9cf0", D="3a64b8", P="3f8a37", B="2a2a34", A="d77a6a"),  # 2 kid (Mika)
    dict(H="8d8f99", S="8d5a3a", E="1d1b26", C="3f8a37", D="2f6b2c", P="6b4a2b", B="2a2a34", A="6a3a2a"),  # 3 elder (Rosa)
    dict(H="f2f0e6", S="e8c39e", E="1d1b26", C="e0b440", D="b8902a", P="5a2a6a", B="2a2a34", A="d77a6a"),  # 4 lantern keeper (Lumi)
    dict(H="2a1a10", S="a86a44", E="1d1b26", C="f27aa8", D="c0507e", P="3a3a4a", B="2a2a34", A="7a4030"),  # 5 Juno (Hall of Traces)
    dict(H="e0b440", S="f2c8a0", E="1d1b26", C="2a9d8f", D="1d7268", P="4a4a5a", B="2a2a34", A="d77a6a"),  # 6 Kai (Vault of Keys)
    dict(H="1d1b26", S="d9a77c", E="1d1b26", C="ffffff", D="c9c9d6", P="c0453b", B="2a2a34", A="9c5a4a"),  # 7 Nova (Window Gallery)
    dict(H="3a2b5c", S="f2c8a0", E="ffe680", C="3a2b5c", D="241a3a", P="241a3a", B="1d1b26", A="7a3a8a", mask=True),  # 8 Mask Merchant
]


def palette(d):
    return {k: hexc(v) for k, v in d.items() if isinstance(v, str)}


def masked(rows):
    """The Mask Merchant: a hood over the head and a gold mask over the face."""
    r = [list(x) for x in rows]
    for y in range(4, 8):
        for x in range(4, 12):
            if r[y][x] in "SEA":
                r[y][x] = "M"
    r[5][6] = "E"; r[5][9] = "E"
    for x in range(3, 13):
        if r[2][x] == "H" or r[3][x] == "H":
            pass
    r[3][3] = "H"; r[3][12] = "H"; r[4][3] = "H"; r[4][12] = "H"; r[5][3] = "H"; r[5][12] = "H"
    return ["".join(x) for x in r]


def build_hero():
    sheet = Image.new("RGBA", (12 * T, len(AVATARS) * T), (0, 0, 0, 0))
    for row, av in enumerate(AVATARS):
        c = palette(av)
        frames = []
        for base, side, mirror in ((DOWN, False, False), (UP, False, False), (RIGHT, True, True), (RIGHT, True, False)):
            for step in (0, 1, 2):
                frames.append(draw(walk(base, step, side), c, mirror))
        for i, f in enumerate(frames):
            sheet.paste(f, (i * T, row * T))
    path = os.path.join(ROOT, "assets", "sprites", "hero.png")
    sheet.save(path)
    return path


def build_npcs():
    sheet = Image.new("RGBA", (2 * T, len(NPCS) * T), (0, 0, 0, 0))
    for row, n in enumerate(NPCS):
        c = palette(n)
        base = DOWN
        if n.get("mask"):
            c["M"] = hexc("e0b440")
            base = masked(DOWN)
        a = draw(base, c)
        b = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        b.paste(draw(base[1:] + ["................"], c), (0, 0))  # a little bob
        sheet.paste(a, (0, row * T)); sheet.paste(b, (T, row * T))
    path = os.path.join(ROOT, "assets", "sprites", "npcs.png")
    sheet.save(path)
    return path


if __name__ == "__main__":
    for p in (build_tileset(), build_hero(), build_npcs()):
        print("wrote", os.path.relpath(p, ROOT))
    print("tile indices:", ", ".join(f"{i}={n}" for i, (n, _, _) in enumerate(TILES)))
    print("colliding tiles:", [i for i, (_, _, c) in enumerate(TILES) if c])
