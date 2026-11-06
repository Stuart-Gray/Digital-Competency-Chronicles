"""Draws the placeholder art for the dungeons, the puzzle pictures and the icons.

Everything here is drawn by this script (CC0, see assets/CREDITS.md). Run it again
after changing something:

    python3 tools/art/make_dungeon_art.py

Needs Pillow. Writes:
    assets/tiles/dungeon.png      16x16 dungeon tiles, 8 per row (index list in TILES)
    assets/sprites/fx.png         16x16 world sprites: traces, key stones, lantern, pieces
    assets/sprites/icons.png      16x16 icons used in puzzle cards (names in ICONS)
    assets/pictures/*.png         pictures for "spot" and "predict" puzzles (no words in
                                  the pictures: any text is laid over them from /content,
                                  so it can be English or French)
"""
import os
import random
from PIL import Image, ImageDraw

import make_placeholder_art as base

ROOT = base.ROOT
T = 16
P = base.P
hexc = base.hexc
put, rect, circle, outline, over = base.put, base.rect, base.circle, base.outline, base.over
rnd = random.Random(11)

D = {
    "f1": hexc("5a5470"), "f2": hexc("4e4863"), "f3": hexc("67607e"),
    "wt": hexc("2a2538"), "wT": hexc("3a3450"),
    "b1": hexc("7a6f96"), "b2": hexc("665c80"), "b3": hexc("8f84ab"),
    "ru": hexc("7a3a8a"), "rU": hexc("9a52ac"), "rg": hexc("e0b440"),
    "pl": hexc("a48a5e"), "pL": hexc("bca06e"), "pD": hexc("806a46"),
    "vt": hexc("3a5a8a"), "vT": hexc("4a6ea4"), "vD": hexc("2c4670"),
    "glow": hexc("ffe680"), "glow2": hexc("fff4c0"), "cyan": hexc("8ff0ff"),
}


def tile(fn=None):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    if fn:
        for y in range(T):
            for x in range(T):
                im.putpixel((x, y), fn(x, y))
    return im


def floor():
    im = tile(lambda x, y: rnd.choices([D["f1"], D["f2"], D["f3"]], [75, 15, 10])[0])
    rect(im, 0, 0, 15, 0, D["f2"]); rect(im, 0, 0, 0, 15, D["f2"])
    rect(im, 8, 8, 15, 8, D["f2"]); rect(im, 8, 0, 8, 7, D["f2"])
    return im


def floor_cracked():
    im = floor()
    for (x, y) in [(3, 4), (4, 5), (5, 5), (6, 6), (6, 7), (7, 8), (11, 11), (12, 12)]:
        put(im, x, y, D["wt"])
    return im


def rug():
    im = tile(lambda x, y: D["ru"])
    rect(im, 0, 0, 15, 0, D["rg"]); rect(im, 0, 15, 15, 15, D["rg"])
    for x in range(1, 16, 4):
        put(im, x, 7, D["rU"]); put(im, x + 1, 8, D["rU"])
    return im


def wall_top():
    im = tile(lambda x, y: D["wt"])
    for x in range(0, 16, 5):
        put(im, x, rnd.randint(0, 15), D["wT"])
    return im


def bricks(c1="b1", c2="b2", c3="b3"):
    im = tile(lambda x, y: D[c1])
    for y in (3, 7, 11, 15):
        rect(im, 0, y, 15, y, D[c2])
    for row, y0 in enumerate((0, 4, 8, 12)):
        off = 0 if row % 2 == 0 else 4
        for x in range(off, 16, 8):
            rect(im, x, y0, x, y0 + 2, D[c2])
        rect(im, off + 1, y0, off + 3, y0, D[c3])
    return im


def wall_face():
    return bricks()


def wall_torch():
    im = bricks()
    rect(im, 7, 7, 8, 12, P["wD"])
    rect(im, 6, 4, 9, 7, P["k"])
    rect(im, 7, 2, 8, 6, D["glow"]); put(im, 7, 1, D["glow2"]); put(im, 8, 3, P["ro"])
    return im


def door_closed():
    im = bricks()
    rect(im, 2, 1, 13, 15, P["k"])
    rect(im, 3, 2, 12, 15, P["wd"])
    for x in (5, 8, 11):
        rect(im, x, 2, x, 15, P["wD"])
    rect(im, 3, 7, 12, 8, P["r3"])
    put(im, 10, 10, D["glow"])
    return im


def door_open():
    im = bricks()
    rect(im, 2, 1, 13, 15, P["k"])
    rect(im, 3, 2, 12, 15, hexc("15121e"))
    rect(im, 3, 14, 12, 15, D["f2"])
    return im


def wall_crack():
    """Looks like a wall. In lantern light a door-shaped crack shows (drawn by the fx sprite)."""
    im = bricks()
    for (x, y) in [(5, 3), (6, 4), (6, 5), (5, 6), (6, 8), (7, 9), (6, 11)]:
        put(im, x, y, D["b2"])
    return im


def pillar():
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 4, 1, 11, 15, D["b1"]); rect(top, 4, 1, 5, 15, D["b3"]); rect(top, 10, 1, 11, 15, D["b2"])
    rect(top, 3, 0, 12, 2, D["b3"]); rect(top, 3, 13, 12, 15, D["b2"])
    outline(top)
    return over(im, top)


def keystone(pressed=False):
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    if pressed:
        rect(top, 3, 6, 12, 13, D["vD"]); rect(top, 4, 7, 11, 12, D["vt"])
        rect(top, 6, 8, 9, 11, D["glow"])
    else:
        rect(top, 3, 4, 12, 12, D["vT"]); rect(top, 3, 12, 12, 13, D["vD"]); rect(top, 4, 5, 11, 11, D["vt"])
        rect(top, 7, 6, 8, 10, D["b3"]); rect(top, 6, 6, 9, 6, D["b3"])  # a little key shape
    outline(top)
    return over(im, top)


def board():
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 3, 11, 4, 15, P["wD"]); rect(top, 11, 11, 12, 15, P["wD"])
    rect(top, 1, 2, 14, 11, P["wd"]); rect(top, 2, 3, 13, 10, hexc("c9a46a"))
    rect(top, 3, 4, 7, 7, P["wh"]); rect(top, 9, 4, 12, 6, P["pk"]); rect(top, 8, 8, 12, 9, P["w4"])
    outline(top)
    return over(im, top)


def mirror():
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 3, 1, 12, 14, D["rg"]); rect(top, 4, 2, 11, 13, hexc("a8d4ff"))
    rect(top, 5, 3, 6, 8, P["wh"]); rect(top, 2, 14, 13, 15, P["wD"])
    outline(top)
    return over(im, top)


def easel():
    im = planks()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 3, 9, 3, 15, P["wD"]); rect(top, 12, 9, 12, 15, P["wD"])
    rect(top, 2, 1, 13, 10, P["wD"]); rect(top, 3, 2, 12, 9, hexc("a8d4ff"))
    rect(top, 3, 7, 12, 9, P["g2"]); circle(top, 10, 4, 1.5, P["ye"])
    outline(top)
    return over(im, top)


def chest(open_=False):
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 2, 6, 13, 14, P["wd"]); rect(top, 2, 9, 13, 9, P["wD"])
    rect(top, 2, 6, 2, 14, D["rg"]); rect(top, 13, 6, 13, 14, D["rg"])
    if open_:
        rect(top, 2, 3, 13, 6, P["wD"]); rect(top, 3, 6, 12, 8, D["glow"])
    else:
        rect(top, 2, 4, 13, 6, P["wd"]); rect(top, 7, 8, 8, 10, D["rg"])
    outline(top)
    return over(im, top)


def exit_tile():
    im = floor()
    circle(im, 7.5, 7.5, 6.5, hexc("3a2b5c"))
    circle(im, 7.5, 7.5, 4.5, hexc("5a3a8a"))
    circle(im, 7.5, 7.5, 2.5, P["g4"])
    return im


def window_wall():
    im = bricks()
    rect(im, 3, 2, 12, 12, P["k"]); rect(im, 4, 3, 11, 11, hexc("a8d4ff"))
    rect(im, 4, 9, 11, 11, P["g2"]); rect(im, 7, 3, 8, 11, P["k"]); rect(im, 4, 7, 11, 7, P["k"])
    return im


def shelf():
    im = bricks()
    rect(im, 1, 1, 14, 15, P["wD"])
    for y in (5, 10, 15):
        rect(im, 1, y, 14, y, P["wd"])
    for i, x in enumerate(range(2, 14, 2)):
        for y0 in (1, 6, 11):
            rect(im, x, y0 + (i % 2), x, y0 + 3, [P["ro"], P["bl"], P["g1"], P["ye"]][(i + y0) % 4])
    return im


def vault_door():
    im = bricks("vt", "vD", "vT")
    rect(im, 2, 1, 13, 15, P["k"]); rect(im, 3, 2, 12, 15, D["rg"])
    circle(im, 7.5, 8, 3.5, P["gd"]); circle(im, 7.5, 8, 1.5, P["k"])
    return im


def plant():
    im = floor()
    top = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    rect(top, 5, 10, 10, 15, P["rd"]); rect(top, 4, 10, 11, 11, P["ro"])
    circle(top, 7.5, 6, 4.5, P["t2"]); circle(top, 6, 5, 2, P["t3"])
    outline(top)
    return over(im, top)


def planks():
    im = tile(lambda x, y: D["pl"])
    for y in (3, 7, 11, 15):
        rect(im, 0, y, 15, y, D["pD"])
    for row, y0 in enumerate((0, 4, 8, 12)):
        x = (row * 5) % 16
        rect(im, x, y0, x, y0 + 2, D["pD"]); put(im, (x + 7) % 16, y0 + 1, D["pL"])
    return im


def vault_floor():
    im = tile(lambda x, y: D["vt"])
    rect(im, 0, 0, 15, 0, D["vD"]); rect(im, 0, 0, 0, 15, D["vD"])
    rect(im, 1, 1, 15, 1, D["vT"]); rect(im, 1, 1, 1, 15, D["vT"])
    return im


def wall_top_edge():
    im = wall_top()
    rect(im, 0, 13, 15, 15, D["b2"])
    return im


TILES = [
    ("floor", floor, False),              # 0
    ("floor_cracked", floor_cracked, False),  # 1
    ("rug", rug, False),                  # 2
    ("wall_top", wall_top, True),         # 3
    ("wall_face", wall_face, True),       # 4
    ("wall_torch", wall_torch, True),     # 5
    ("door_closed", door_closed, True),   # 6
    ("door_open", door_open, False),      # 7
    ("wall_crack", wall_crack, True),     # 8
    ("pillar", pillar, True),             # 9
    ("keystone", keystone, False),        # 10
    ("keystone_down", lambda: keystone(True), False),  # 11
    ("board", board, True),               # 12
    ("mirror", mirror, True),             # 13
    ("easel", easel, True),               # 14
    ("chest", chest, True),               # 15
    ("chest_open", lambda: chest(True), True),  # 16
    ("exit", exit_tile, False),           # 17
    ("window_wall", window_wall, True),   # 18
    ("shelf", shelf, True),               # 19
    ("vault_door", vault_door, True),     # 20
    ("plant", plant, True),               # 21
    ("planks", planks, False),            # 22
    ("vault_floor", vault_floor, False),  # 23
    ("wall_top_edge", wall_top_edge, True),  # 24
]


def build_tiles():
    cols = 8
    rows = (len(TILES) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    for i, (_, fn, _) in enumerate(TILES):
        sheet.paste(fn(), ((i % cols) * T, (i // cols) * T))
    path = os.path.join(ROOT, "assets", "tiles", "dungeon.png")
    sheet.save(path)
    return path


# ---------------------------------------------------------------- fx sprites
def fx_footprints(n=2, color="glow"):
    im = tile()
    spots = [(4, 11), (10, 7), (5, 3)][:n] if n <= 3 else [(4, 12), (10, 9), (4, 6), (10, 2)]
    for (x, y) in spots:
        rect(im, x, y, x + 2, y + 3, D[color]); put(im, x + 1, y - 1, D[color])
    return im


def fx_trace_door():
    im = tile()
    for y in range(2, 16):
        put(im, 3, y, D["glow"]); put(im, 12, y, D["glow"])
    for x in range(4, 12):
        put(im, x, 1, D["glow"])
    put(im, 10, 9, D["glow2"])
    return im


def fx_sparkle(big=False):
    im = tile()
    c = 7
    r = 5 if big else 3
    for i in range(-r, r + 1):
        put(im, c + i, c, D["glow2"] if abs(i) < 2 else D["glow"])
        put(im, c, c + i, D["glow2"] if abs(i) < 2 else D["glow"])
    return im


def fx_lantern():
    im = tile()
    rect(im, 6, 1, 9, 2, P["k"]); rect(im, 5, 3, 10, 13, P["k"])
    rect(im, 6, 4, 9, 12, D["glow"]); rect(im, 7, 5, 8, 10, D["glow2"])
    rect(im, 4, 13, 11, 14, D["rg"])
    return outline(im)


def fx_piece(i):
    """One third of the area badge, as a gem shard."""
    im = tile()
    colours = [P["pk"], hexc("8ff0ff"), D["glow"]]
    c = colours[i % 3]
    pts = [(7, 2), (12, 7), (7, 14), (3, 7)]
    ImageDraw.Draw(im).polygon(pts, fill=c)
    rect(im, 6, 5, 7, 8, P["wh"])
    return outline(im)


def fx_badge():
    im = tile()
    circle(im, 7.5, 7.5, 6.5, D["rg"]); circle(im, 7.5, 7.5, 5, hexc("7a3a8a"))
    rect(im, 6, 4, 9, 11, D["glow"]); rect(im, 5, 6, 10, 9, D["glow"])
    return outline(im)


def fx_glow_ring():
    im = tile()
    for y in range(T):
        for x in range(T):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if 5.5 < d < 7.5:
                im.putpixel((x, y), (255, 230, 128, 140))
    return im


FX = [
    ("traces1", lambda: fx_footprints(1)),   # 0
    ("traces2", lambda: fx_footprints(2)),   # 1
    ("traces3", lambda: fx_footprints(3)),   # 2
    ("trace_door", fx_trace_door),           # 3
    ("sparkle", fx_sparkle),                 # 4
    ("sparkle_big", lambda: fx_sparkle(True)),  # 5
    ("lantern", fx_lantern),                 # 6
    ("piece0", lambda: fx_piece(0)),         # 7
    ("piece1", lambda: fx_piece(1)),         # 8
    ("piece2", lambda: fx_piece(2)),         # 9
    ("badge", fx_badge),                     # 10
    ("glow_ring", fx_glow_ring),             # 11
    ("traces_cyan", lambda: fx_footprints(4, "cyan")),  # 12
]


def build_fx():
    sheet = Image.new("RGBA", (len(FX) * T, T), (0, 0, 0, 0))
    for i, (_, fn) in enumerate(FX):
        sheet.paste(fn(), (i * T, 0))
    path = os.path.join(ROOT, "assets", "sprites", "fx.png")
    sheet.save(path)
    return path


# ---------------------------------------------------------------- icons for puzzle cards
def ic():
    return Image.new("RGBA", (T, T), (0, 0, 0, 0))


def i_post():
    im = ic(); rect(im, 1, 2, 14, 13, P["wh"]); rect(im, 2, 3, 13, 8, P["w2"]); rect(im, 2, 6, 13, 8, P["g2"])
    circle(im, 10, 4, 1, P["ye"]); rect(im, 2, 10, 10, 10, P["r1"]); rect(im, 2, 12, 7, 12, P["r1"]); return outline(im)


def i_like():
    im = ic(); circle(im, 5, 6, 3, P["pk"]); circle(im, 10, 6, 3, P["pk"])
    ImageDraw.Draw(im).polygon([(2, 7), (13, 7), (7.5, 13)], fill=P["pk"]); put(im, 4, 5, P["wh"]); return outline(im)


def i_comment():
    im = ic(); rect(im, 1, 2, 14, 10, P["wh"]); ImageDraw.Draw(im).polygon([(4, 10), (8, 10), (4, 14)], fill=P["wh"])
    for x in (4, 7, 10):
        rect(im, x, 6, x + 1, 6, P["r3"])
    return outline(im)


def i_photo():
    im = ic(); rect(im, 1, 4, 14, 13, P["k"]); rect(im, 2, 5, 13, 12, P["r1"]); circle(im, 7.5, 8.5, 3, P["k"])
    circle(im, 7.5, 8.5, 2, P["w2"]); rect(im, 4, 2, 7, 4, P["k"]); return outline(im)


def i_game():
    im = ic(); rect(im, 1, 5, 14, 11, P["r1"]); rect(im, 3, 7, 5, 7, P["k"]); rect(im, 4, 6, 4, 8, P["k"])
    put(im, 10, 7, P["ro"]); put(im, 12, 8, P["bl"]); return outline(im)


def i_house():
    im = ic(); ImageDraw.Draw(im).polygon([(1, 8), (7.5, 2), (14, 8)], fill=P["ro"]); rect(im, 3, 8, 12, 14, P["wa"])
    rect(im, 6, 10, 9, 14, P["wd"]); return outline(im)


def i_cake():
    im = ic(); rect(im, 2, 8, 13, 14, P["pk"]); rect(im, 2, 8, 13, 9, P["wh"]); rect(im, 7, 4, 8, 7, P["ye"])
    put(im, 7, 3, P["ro"]); return outline(im)


def i_star():
    im = ic(); ImageDraw.Draw(im).polygon([(7.5, 1), (9.5, 6), (14, 6), (10.5, 9), (12, 14), (7.5, 11), (3, 14), (4.5, 9), (1, 6), (5.5, 6)], fill=P["ye"])
    return outline(im)


def i_person():
    im = ic(); circle(im, 7.5, 5, 3, P["d3"]); rect(im, 3, 9, 12, 14, P["bl"]); return outline(im)


def i_avatar():
    im = ic(); circle(im, 7.5, 7.5, 6.5, P["g4"]); circle(im, 5, 6, 1, P["k"]); circle(im, 10, 6, 1, P["k"])
    rect(im, 5, 10, 10, 10, P["k"]); put(im, 4, 9, P["k"]); put(im, 11, 9, P["k"]); return outline(im)


def i_face():
    im = ic(); rect(im, 1, 1, 14, 14, P["w4"]); circle(im, 7.5, 7, 4.5, P["d3"]); rect(im, 3, 2, 12, 4, P["wD"])
    put(im, 6, 7, P["k"]); put(im, 9, 7, P["k"]); rect(im, 6, 9, 9, 9, P["rd"]); rect(im, 3, 12, 12, 14, P["ro"]); return outline(im)


def i_pet():
    im = ic(); circle(im, 7.5, 9, 4.5, P["d2"]); ImageDraw.Draw(im).polygon([(3, 6), (4, 1), (7, 5)], fill=P["d2"])
    ImageDraw.Draw(im).polygon([(12, 6), (11, 1), (8, 5)], fill=P["d2"]); put(im, 6, 8, P["k"]); put(im, 9, 8, P["k"]); put(im, 7, 10, P["pk"]); return outline(im)


def i_lock():
    im = ic(); rect(im, 3, 7, 12, 14, D["rg"]); rect(im, 5, 2, 10, 3, P["r1"]); rect(im, 4, 3, 5, 7, P["r1"])
    rect(im, 10, 3, 11, 7, P["r1"]); rect(im, 7, 9, 8, 12, P["k"]); return outline(im)


def i_key():
    im = ic(); circle(im, 4.5, 7.5, 3.5, D["rg"]); circle(im, 4.5, 7.5, 1.5, (0, 0, 0, 0)); rect(im, 8, 7, 14, 8, D["rg"])
    rect(im, 12, 9, 12, 10, D["rg"]); rect(im, 10, 9, 10, 10, D["rg"]); return outline(im)


def i_chat():
    im = ic(); rect(im, 1, 1, 10, 7, P["w2"]); rect(im, 5, 6, 14, 12, P["wh"]); put(im, 3, 8, P["w2"])
    put(im, 12, 13, P["wh"]); return outline(im)


def i_camera():
    im = ic(); rect(im, 1, 4, 10, 12, P["r3"]); ImageDraw.Draw(im).polygon([(10, 8), (15, 4), (15, 12)], fill=P["r3"])
    circle(im, 4, 7, 1.2, P["ro"]); return outline(im)


def i_mic():
    im = ic(); rect(im, 6, 1, 9, 9, P["r1"]); rect(im, 6, 1, 6, 9, P["r2"]); rect(im, 4, 7, 4, 10, P["r3"])
    rect(im, 11, 7, 11, 10, P["r3"]); rect(im, 5, 11, 10, 11, P["r3"]); rect(im, 7, 12, 8, 14, P["r3"]); return outline(im)


def i_location():
    im = ic(); circle(im, 7.5, 6, 5, P["ro"]); ImageDraw.Draw(im).polygon([(3, 8), (12, 8), (7.5, 15)], fill=P["ro"])
    circle(im, 7.5, 6, 2, P["wh"]); return outline(im)


def i_school():
    im = ic(); rect(im, 2, 6, 13, 14, P["ye"]); ImageDraw.Draw(im).polygon([(1, 6), (7.5, 1), (14, 6)], fill=P["ro"])
    rect(im, 6, 10, 9, 14, P["wd"]); rect(im, 3, 8, 4, 9, P["w2"]); rect(im, 11, 8, 12, 9, P["w2"]); return outline(im)


def i_trash():
    im = ic(); rect(im, 3, 4, 12, 14, P["r1"]); rect(im, 2, 2, 13, 3, P["r3"]); rect(im, 6, 1, 9, 1, P["r3"])
    for x in (5, 8, 11):
        rect(im, x, 6, x, 12, P["r3"])
    return outline(im)


def i_screenshot():
    im = ic(); rect(im, 3, 1, 12, 14, P["k"]); rect(im, 4, 2, 11, 12, P["w4"])
    for (x, y) in [(1, 1), (14, 1), (1, 14), (14, 14)]:
        put(im, x, y, P["ye"])
    rect(im, 5, 4, 10, 4, P["r3"]); rect(im, 5, 6, 8, 6, P["r3"]); return outline(im)


def i_tablet():
    im = ic(); rect(im, 2, 1, 13, 14, P["k"]); rect(im, 3, 2, 12, 12, P["w2"]); put(im, 7, 13, P["r2"]); return outline(im)


def i_book():
    im = ic(); rect(im, 2, 2, 13, 13, P["g1"]); rect(im, 2, 2, 3, 13, P["t1"]); rect(im, 5, 5, 11, 6, P["wh"]); return outline(im)


def i_question():
    im = ic(); circle(im, 7.5, 7.5, 6.5, P["bl"])
    for (x, y) in [(6, 4), (7, 3), (8, 3), (9, 4), (9, 5), (8, 6), (7, 7), (7, 8), (7, 11)]:
        put(im, x, y, P["wh"])
    return outline(im)


def i_globe():
    im = ic(); circle(im, 7.5, 7.5, 6.5, P["w2"]); rect(im, 4, 4, 7, 7, P["g2"]); rect(im, 9, 9, 11, 12, P["g2"]); return outline(im)


def i_eye():
    im = ic(); ImageDraw.Draw(im).ellipse([1, 4, 14, 11], fill=P["wh"]); circle(im, 7.5, 7.5, 2.5, P["bl"]); circle(im, 7.5, 7.5, 1, P["k"]); return outline(im)


def i_gift():
    im = ic(); rect(im, 2, 6, 13, 14, P["ro"]); rect(im, 1, 4, 14, 6, P["rd"]); rect(im, 7, 4, 8, 14, P["ye"])
    put(im, 5, 2, P["ye"]); put(im, 6, 3, P["ye"]); put(im, 10, 2, P["ye"]); put(im, 9, 3, P["ye"]); return outline(im)


def i_mask():
    im = ic(); ImageDraw.Draw(im).ellipse([1, 3, 14, 12], fill=D["rg"]); circle(im, 5, 7, 1.5, P["k"]); circle(im, 10, 7, 1.5, P["k"]); return outline(im)


def i_number():
    im = ic(); rect(im, 1, 3, 14, 12, P["wh"])
    for (x, y) in [(3, 5), (4, 5), (5, 5), (5, 6), (4, 7), (3, 8), (3, 9), (4, 9), (5, 9)]:
        put(im, x, y, P["k"])
    for (x, y) in [(8, 5), (8, 6), (8, 7), (9, 7), (10, 7), (10, 5), (10, 6), (10, 8), (10, 9)]:
        put(im, x, y, P["k"])
    return outline(im)


def i_palette():
    im = ic(); ImageDraw.Draw(im).ellipse([1, 2, 14, 13], fill=P["d3"]); circle(im, 4, 6, 1.2, P["ro"]); circle(im, 7, 4, 1.2, P["bl"])
    circle(im, 11, 5, 1.2, P["ye"]); circle(im, 10, 10, 1.5, (0, 0, 0, 0)); return outline(im)


def i_ball():
    im = ic(); circle(im, 7.5, 7.5, 6, P["wh"]); circle(im, 7.5, 7.5, 2, P["k"])
    for (x, y) in [(3, 4), (12, 4), (3, 11), (12, 11)]:
        put(im, x, y, P["k"])
    return outline(im)


def i_phone():
    im = ic(); rect(im, 4, 1, 11, 14, P["k"]); rect(im, 5, 2, 10, 11, P["w4"]); put(im, 7, 13, P["r2"]); return outline(im)


def i_email():
    im = ic(); rect(im, 1, 3, 14, 12, P["wh"])
    for i in range(7):
        put(im, 1 + i, 3 + i // 1 if i < 5 else 8, P["r3"]); put(im, 14 - i, 3 + i if i < 5 else 8, P["r3"])
    return outline(im)


ICONS = [
    ("post", i_post), ("like", i_like), ("comment", i_comment), ("photo", i_photo),
    ("game", i_game), ("house", i_house), ("cake", i_cake), ("star", i_star),
    ("person", i_person), ("avatar", i_avatar), ("face", i_face), ("pet", i_pet),
    ("lock", i_lock), ("key", i_key), ("chat", i_chat), ("camera", i_camera),
    ("mic", i_mic), ("location", i_location), ("school", i_school), ("trash", i_trash),
    ("screenshot", i_screenshot), ("tablet", i_tablet), ("book", i_book), ("question", i_question),
    ("globe", i_globe), ("eye", i_eye), ("gift", i_gift), ("mask", i_mask),
    ("number", i_number), ("palette", i_palette), ("ball", i_ball), ("phone", i_phone),
    ("email", i_email), ("lantern", fx_lantern),
]


def build_icons():
    cols = 8
    rows = (len(ICONS) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    for i, (_, fn) in enumerate(ICONS):
        sheet.paste(fn(), ((i % cols) * T, (i // cols) * T))
    path = os.path.join(ROOT, "assets", "sprites", "icons.png")
    sheet.save(path)
    # The names, in order, for src/ui/icons.js
    js = os.path.join(ROOT, "src", "ui", "icons.js")
    with open(js, "w", encoding="utf-8") as f:
        f.write("// Icon names in assets/sprites/icons.png (8 per row), written by tools/art/make_dungeon_art.py.\n")
        f.write("// Content files use these names in an \"icon\" field.\n")
        f.write("export const ICONS = " + str([n for n, _ in ICONS]).replace("'", '"') + ";\n")
        f.write("export const ICON_COLS = 8;\n")
    return path


# ---------------------------------------------------------------- pictures
PW, PH = 160, 96


def picture():
    return Image.new("RGBA", (PW, PH), P["w4"])


def prect(im, x0, y0, x1, y1, c):
    ImageDraw.Draw(im).rectangle([x0, y0, x1, y1], fill=c)


def digits(im, x, y, text, c, s=2):
    """Tiny 3x5 pixel digits (numbers read the same in English and French)."""
    font = {
        "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
        "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
        "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
        "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"],
        "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
    }
    for ch in text:
        for ry, row in enumerate(font[ch]):
            for rx, bit in enumerate(row):
                if bit == "1":
                    prect(im, x + rx * s, y + ry * s, x + rx * s + s - 1, y + ry * s + s - 1, c)
        x += 4 * s


def kid(im, x, y, shirt, hair, skin, logo=True):
    """A child seen from the front, about 22 px tall."""
    d = ImageDraw.Draw(im)
    d.ellipse([x + 3, y, x + 13, y + 10], fill=skin)
    d.rectangle([x + 3, y, x + 13, y + 3], fill=hair)
    d.point([(x + 6, y + 5), (x + 10, y + 5)], fill=P["k"])
    d.line([(x + 7, y + 8), (x + 9, y + 8)], fill=P["rd"])
    d.rectangle([x + 2, y + 11, x + 14, y + 22], fill=shirt)
    if logo:  # school crest on the shirt
        d.rectangle([x + 6, y + 13, x + 10, y + 17], fill=P["ye"])
        d.point([(x + 8, y + 15)], fill=P["ro"])
    d.rectangle([x + 4, y + 23, x + 7, y + 28], fill=P["bd"])
    d.rectangle([x + 9, y + 23, x + 12, y + 28], fill=P["bd"])


def house_scene(filtered=False):
    """A photo a classmate wants to post: kid and dog in front of a house.
    Clues: the house number, the street sign, the school crest on the shirt.
    Not clues: the dog, the tree, the sky, the flowers."""
    im = picture()
    # sky and clouds
    for (cx, cy) in [(20, 12), (120, 8)]:
        ImageDraw.Draw(im).ellipse([cx, cy, cx + 24, cy + 8], fill=P["wh"])
    # grass
    prect(im, 0, 66, PW, PH, P["g2"])
    # house
    prect(im, 48, 28, 124, 70, P["wa"])
    ImageDraw.Draw(im).polygon([(42, 30), (86, 6), (130, 30)], fill=P["ro"])
    prect(im, 80, 46, 94, 70, P["wd"])
    prect(im, 56, 38, 70, 50, P["w2"]); prect(im, 104, 38, 118, 50, P["w2"])
    # house number plate (clue)
    prect(im, 97, 52, 115, 62, P["wh"])
    digits(im, 99, 54, "24", P["k"], 2) if not filtered else digits(im, 99, 54, "24", hexc("3a2b5c"), 2)
    # street sign (clue): a green sign on a pole; the street name is laid over from content
    prect(im, 141, 34, 142, 80, P["r3"])
    prect(im, 128, 26, 158, 36, hexc("2f8a4a"))
    prect(im, 129, 27, 157, 35, hexc("3fa45a"))
    # tree (not a clue)
    prect(im, 18, 46, 22, 72, P["tk"])
    ImageDraw.Draw(im).ellipse([6, 22, 34, 52], fill=P["t2"])
    # flowers (not a clue)
    for x in range(8, 40, 6):
        prect(im, x, 76, x + 1, 77, P["pk"])
    # kid with school crest (clue) and dog (not a clue)
    kid(im, 62, 60, P["bl"], P["wD"], P["d3"])
    d = ImageDraw.Draw(im)
    d.ellipse([28, 78, 46, 90], fill=P["d2"])
    d.ellipse([42, 72, 52, 82], fill=P["d2"])
    d.point([(47, 76)], fill=P["k"])
    if filtered:
        # "AI cartoon filter": posterize, bold outlines, sparkles; the clues are still there
        px = im.load()
        for y in range(PH):
            for x in range(PW):
                r, g, b, a = px[x, y]
                px[x, y] = ((r // 64) * 64 + 40 if r > 30 else r, (g // 64) * 64 + 40 if g > 30 else g, min(255, (b // 64) * 64 + 70), a)
        for (sx, sy) in [(12, 10), (40, 60), (136, 70), (70, 16), (150, 12), (24, 88)]:
            for i in range(-2, 3):
                put_big(im, sx + i, sy, P["wh"]); put_big(im, sx, sy + i, P["wh"])
        d.ellipse([64, 58, 80, 63], outline=P["pk"])  # a cartoon crown over the kid
        d.polygon([(64, 58), (68, 52), (72, 58), (76, 52), (80, 58)], fill=P["ye"])
    return im


def put_big(im, x, y, c):
    if 0 <= x < PW and 0 <= y < PH:
        im.putpixel((x, y), c)


def classroom_call(light_on=True):
    """A laptop on a desk after a class video call. The camera light is on (predict puzzle)."""
    im = picture()
    prect(im, 0, 0, PW, PH, hexc("efe2c4"))
    prect(im, 0, 70, PW, PH, P["wd"])  # desk
    prect(im, 10, 10, 50, 40, P["g1"]); prect(im, 12, 12, 48, 38, P["g3"])  # chalkboard
    # laptop
    prect(im, 44, 14, 116, 62, P["k"]); prect(im, 48, 20, 112, 58, hexc("1d2a44"))
    prect(im, 36, 62, 124, 72, P["r2"]); prect(im, 36, 70, 124, 72, P["r3"])
    # camera dot and light
    prect(im, 78, 16, 81, 18, P["r3"])
    if light_on:
        prect(im, 84, 16, 86, 18, hexc("4cff6a"))
        ImageDraw.Draw(im).ellipse([82, 14, 88, 20], outline=hexc("4cff6a"))
    # "call ended" screen: a big rounded rectangle and a person icon
    ImageDraw.Draw(im).ellipse([70, 28, 90, 48], fill=P["r3"])
    ImageDraw.Draw(im).ellipse([76, 31, 84, 39], fill=P["r1"])
    prect(im, 74, 40, 86, 46, P["r1"])
    # mic icon on screen, not crossed out
    prect(im, 98, 46, 101, 52, P["wh"]); prect(im, 96, 50, 103, 51, P["wh"])
    return im


def build_pictures():
    out = os.path.join(ROOT, "assets", "pictures")
    os.makedirs(out, exist_ok=True)
    paths = []
    for name, im in [("photo_house.png", house_scene(False)), ("photo_house_ai.png", house_scene(True)),
                     ("call_camera_on.png", classroom_call(True))]:
        p = os.path.join(out, name)
        im.save(p)
        paths.append(p)
    return paths


if __name__ == "__main__":
    for p in [build_tiles(), build_fx(), build_icons(), *build_pictures()]:
        print("wrote", os.path.relpath(p, ROOT))
    print("dungeon tiles:", ", ".join(f"{i}={n}" for i, (n, _, _) in enumerate(TILES)))
    print("colliding:", [i for i, (_, _, c) in enumerate(TILES) if c])
    print("fx:", ", ".join(f"{i}={n}" for i, (n, _) in enumerate(FX)))
