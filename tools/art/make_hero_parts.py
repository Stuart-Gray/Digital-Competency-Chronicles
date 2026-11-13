"""Draws the hero "parts" sheet that the avatar maker recolours in the browser.

Everything here is drawn by this script, so the output is ours to license
(CC0, see assets/CREDITS.md). Run it again after changing a part:

    python3 tools/art/make_hero_parts.py            (writes the two files below)
    python3 tools/art/make_hero_parts.py preview.png  (also saves a big preview of sample heroes)

Needs Pillow (pip install pillow). Writes:
    assets/sprites/hero_parts.png   16x16 frames, 12 per row (down, up, left, right x 3 steps),
                                    one row per part (head, outfits, wheelchair, hair, hats, glasses)
    src/systems/avatarParts.js      which row is which part, and the marker colours

The parts are drawn in MARKER colours (pure red = skin, pure green = hair, ...).
src/systems/avatar.js stacks the rows a player chose, swaps each marker for the
colour they picked, and adds the dark outline. An artist can repaint this sheet
by hand as long as the same marker colours are used.
"""
import json
import os
import sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
T = 16
BLANK = "." * T

# letter -> (marker colour in the sheet, what it becomes in the game)
MARKERS = {
    "S": ("ff0000", "skin"), "s": ("c00000", "skin-shade"), "A": ("ff8080", "mouth"),
    "H": ("00ff00", "hair"), "h": ("00c000", "hair-shade"), "i": ("80ff80", "hair-light"),
    "E": ("0000ff", "eyes"),
    "C": ("ffff00", "top"), "D": ("c0c000", "top-shade"), "c": ("ffff80", "top-light"),
    "P": ("00ffff", "bottom"), "p": ("00c0c0", "bottom-shade"),
    "T": ("ff00ff", "hat"), "t": ("c000c0", "hat-shade"), "u": ("ff80ff", "hat-light"),
}
# letters that keep their own colour
FIXED = {
    "B": "2a2a34",  # shoes
    "W": "ffffff",  # white trim, socks, pom-pom
    "K": "1d1b26",  # dark frames and tyres
    "G": "9a9aa6",  # metal
    "g": "3a3a4a",  # seat fabric
    "L": "cfe8ff",  # glasses lens
}
OUTLINE = "1d1b26"


def rows(patch):
    """A 16-row frame from {row number: 16 characters}."""
    out = [BLANK] * T
    for y, line in patch.items():
        assert len(line) == T, (y, line)
        out[y] = line
    return out


def swap(frame, a, b):
    return [line.replace(a, b) for line in frame]


def put(frame, x, y, ch):
    line = frame[y]
    frame[y] = line[:x] + ch + line[x + 1:]


# ------------------------------------------------------------------ head (no hair)
HEAD = {
    "down": rows({2: ".....SSSSSS.....", 3: "....SSSSSSSS....", 4: "....SSSSSSSS....",
                  5: "....SSESSESS....", 6: "....SSSSSSSS....", 7: ".....SSAASS....."}),
    "up": rows({2: ".....SSSSSS.....", 3: "....SSSSSSSS....", 4: "....SSSSSSSS....",
                5: "....SSSSSSSS....", 6: "....SSSSSSSS....", 7: ".....SSSSSS....."}),
    "right": rows({2: ".....SSSSSS.....", 3: "....SSSSSSSS....", 4: "....SSSSSSSS....",
                   5: "....SSSSSSES....", 6: "....SSSSSSSS....", 7: ".....SSSSSA....."}),
}

# ------------------------------------------------------------------ outfits
# Q = lower leg: trousers (P), bare legs (S) or socks (W), chosen per outfit.
LEGS_FRONT = {12: "....PPPPPPPP....", 13: "....QQQ..QQQ....", 14: "....BBB..BBB...."}
LEGS_SIDE = {12: ".....PPPPPP.....", 13: ".....QQQQQQ.....", 14: ".....BBBBBB....."}

OUTFITS = {
    "tee": dict(
        leg="P",
        down={8: "....CCCCCCCC....", 9: "...SCCCCCCCCS...", 10: "...SDCCCCCCDS...", 11: "....DDDDDDDD...."},
        up={8: "....CCCCCCCC....", 9: "...SCCCCCCCCS...", 10: "...SDCCCCCCDS...", 11: "....DDDDDDDD...."},
        right={8: ".....CCCCCC.....", 9: ".....CCSCCC.....", 10: ".....DCSCCD.....", 11: ".....DDDDDD....."},
    ),
    "hoodie": dict(
        leg="P",
        down={8: "....CCDDDDCC....", 9: "...CCCcCCcCCC...", 10: "...SCCCCCCCCS...", 11: "....CDDDDDDC...."},
        up={8: "....CDDDDDDC....", 9: "...CCDDDDDDCC...", 10: "...SCCDDDDCCS...", 11: "....CCCCCCCC...."},
        right={8: "....DCCCCCC.....", 9: ".....CCDCCC.....", 10: ".....CCSCCC.....", 11: ".....CCCDDD....."},
    ),
    "stripes": dict(
        leg="S",
        down={8: "....CCCCCCCC....", 9: "...SDDDDDDDDS...", 10: "...SCCCCCCCCS...", 11: "....DDDDDDDD...."},
        up={8: "....CCCCCCCC....", 9: "...SDDDDDDDDS...", 10: "...SCCCCCCCCS...", 11: "....DDDDDDDD...."},
        right={8: ".....CCCCCC.....", 9: ".....DDSDDD.....", 10: ".....CCSCCC.....", 11: ".....DDDDDD....."},
    ),
    "overalls": dict(
        leg="P",
        down={8: "....CPCCCCPC....", 9: "...SCPPPPPPCS...", 10: "...SCPPppPPCS...", 11: "....PPPPPPPP...."},
        up={8: "....CPCCCCPC....", 9: "...SCCPCCPCCS...", 10: "...SCCCPPCCCS...", 11: "....PPPPPPPP...."},
        right={8: ".....CCCPCC.....", 9: ".....CCSPPP.....", 10: ".....DCSPPP.....", 11: ".....PPPPPP....."},
    ),
    "dress": dict(
        leg="P", skirt=True,
        down={8: "....CCCCCCCC....", 9: "...SCCCCCCCCS...", 10: "...SCccccccCS...", 11: "...CCCCCCCCCC...", 12: "...DCCCCCCCCD..."},
        up={8: "....CCCCCCCC....", 9: "...SCCCCCCCCS...", 10: "...SCccccccCS...", 11: "...CCCCCCCCCC...", 12: "...DCCCCCCCCD..."},
        right={8: ".....CCCCCC.....", 9: ".....CCSCCC.....", 10: ".....ccSccc.....", 11: "....CCCCCCCC....", 12: "....DCCCCCCD...."},
    ),
    "jersey": dict(
        leg="W",
        down={8: "....DCCCCCCD....", 9: "...SCCCCCCCCS...", 10: "...SWWWWWWWWS...", 11: "....DDDDDDDD...."},
        up={8: "....DCCCCCCD....", 9: "...SCCWWWWCCS...", 10: "...SWWWWWWWWS...", 11: "....DDDDDDDD...."},
        right={8: ".....DCCCCD.....", 9: ".....CCSCCC.....", 10: ".....WWSWWW.....", 11: ".....DDDDDD....."},
    ),
}


def outfit_frames(o):
    """12 frames for an outfit: down, up, left, right, each standing + two steps."""
    leg = o["leg"]
    skirt = o.get("skirt", False)

    def front(top, step):
        f = rows({**LEGS_FRONT, **top})
        if step == 1:
            f[14] = "....BBB..QQQ...."; f[15] = ".........BBB...."
        elif step == 2:
            f[14] = "....QQQ..BBB...."; f[15] = "....BBB........."
        return swap(f, "Q", leg)

    def side(top, step):
        f = rows({**LEGS_SIDE, **top})
        if step == 1:
            if not skirt:
                f[12] = "....PPP..PPP...."
            f[13] = "...QQQ....QQQ..." if not skirt else "....QQ....QQ...."
            f[14] = "...BBB....BBB..." if not skirt else "....BB....BB...."
        elif step == 2:
            f[13] = "......QQQQ......"; f[14] = "......BBBB......"
        # a small arm swing: the arm (column 7 of rows 9 and 10) moves forward, then back
        dx = {0: 0, 1: 1, 2: -1}[step]
        if dx:
            for y in (9, 10):
                a, b = f[y][7], f[y][7 + dx]
                put(f, 7, y, b); put(f, 7 + dx, y, a)
        return swap(f, "Q", leg)

    out = []
    for step in (0, 1, 2):
        out.append(front(o["down"], step))
    for step in (0, 1, 2):
        out.append(front(o["up"], step))
    right = [side(o["right"], step) for step in (0, 1, 2)]
    out += [mirror(f) for f in right] + right
    return out


def mirror(frame):
    return [line[::-1] for line in frame]


# ------------------------------------------------------------------ wheelchair
# Drawn over the outfit, which is cut off below the waist (row 11 and down) for a seated hero.
def chair_frames():
    def down(step):
        f = rows({9: "..K..........K..", 10: "..K..........K..", 11: "..K.PPPPPPPP.K..", 12: "..K.PPPPPPPP.K..",
                  13: "..K.pPP..PPp.K..", 14: "..K.BBB..BBB.K..", 15: "....GGGGGGGG...."})
        y = (10, 12, 14)[step]          # a glint that rolls down the tyres
        put(f, 2, y, "G"); put(f, 13, y, "G")
        return f

    def up(step):
        f = rows({8: "...G........G...", 9: "..KGggggggggGK..", 10: "..KGggggggggGK..", 11: "..KGggggggggGK..",
                  12: "..K.GGGGGGGG.K..", 13: "..K..........K..", 14: "..K..........K.."})
        y = (14, 12, 10)[step]
        put(f, 2, y, "G"); put(f, 13, y, "G")
        return f

    def right(step):
        f = rows({8: "...GG...........", 9: "....GKKK........", 10: "....KGGGK.......", 11: "...KGGGGGKPP....",
                  12: "...KGGGGGKPP....", 13: "...KGGGGGKPP....", 14: "....KGGGK.BBB...", 15: ".....KKK..GGG..."})
        # spokes: a plus sign when standing, an X on the steps, so the wheel seems to turn
        spokes = ([(6, 10), (6, 11), (6, 12), (6, 13), (6, 14), (4, 12), (5, 12), (7, 12), (8, 12)],
                  [(5, 11), (6, 12), (7, 13), (7, 11), (5, 13)],
                  [(5, 11), (6, 12), (7, 13), (7, 11), (5, 13)])[step]
        for x, y in spokes:
            put(f, x, y, "g")
        return f

    r = [right(s) for s in (0, 1, 2)]
    return [down(s) for s in (0, 1, 2)] + [up(s) for s in (0, 1, 2)] + [mirror(f) for f in r] + r


# ------------------------------------------------------------------ hair, hats, glasses
def still(d):
    """A part that looks the same on every step: {down, up, right} -> 12 frames."""
    dn, up, rt = rows(d["down"]), rows(d["up"]), rows(d["right"])
    return [dn] * 3 + [up] * 3 + [mirror(rt)] * 3 + [rt] * 3


HAIR = {
    "short": dict(
        down={2: ".....HiiHHH.....", 3: "....HHHHHHHH....", 4: "....H......H...."},
        up={2: ".....HHHHHH.....", 3: "....HHHHHHHH....", 4: "....HHHHHHHH....", 5: "....HHHHHHHH....", 6: ".....hhhhhh....."},
        right={2: ".....HHiiHH.....", 3: "....HHHHHHHH....", 4: "....HHH.........", 5: "....HH..........", 6: "....h..........."},
    ),
    "long": dict(
        down={2: ".....HiiHHH.....", 3: "....HHHHHHHH....", 4: "...HH......HH...", 5: "...H........H...", 6: "...H........H...",
              7: "...HH......HH...", 8: "...HH......HH...", 9: "...h........h..."},
        up={2: ".....HHHHHH.....", 3: "...HHHHHHHHHH...", 4: "...HHHHHHHHHH...", 5: "...HHHHHHHHHH...", 6: "...HHHHHHHHHH...",
            7: "...HHHHHHHHHH...", 8: "...HHHHHHHHHH...", 9: "....hhhhhhhh...."},
        right={2: ".....HHiiHH.....", 3: "....HHHHHHHH....", 4: "...HHHH.........", 5: "...HHH..........", 6: "...HHH..........",
               7: "...HHH..........", 8: "...HHH..........", 9: "...hh..........."},
    ),
    "curly": dict(
        down={1: ".....HHHiHH.....", 2: "...HHhHiHHhHH...", 3: "...HiHHhHHHhH...", 4: "...HH......HH...", 5: "...H........H..."},
        up={1: ".....HHHiHH.....", 2: "...HHhHiHHhHH...", 3: "...HiHHhHHHhH...", 4: "...HHHhHHiHHH...", 5: "...HhHHHHHHhH...", 6: "....HHHhHHHH...."},
        right={1: ".....HHHiHH.....", 2: "...HHhHiHHhHH...", 3: "...HiHHhHHHHH...", 4: "...HHhH.........", 5: "...HHH..........", 6: "....H..........."},
    ),
    "ponytail": dict(
        down={2: ".....HiiHHH.....", 3: "....HHHHHHHH....", 4: "....H......HHH..", 5: "............HH..", 6: "............HH..", 7: "............h..."},
        up={2: ".....HHHHHH.....", 3: "....HHHHHHHH....", 4: "....HHHHHHHH....", 5: "....HHHWWHHH....", 6: ".....hhHHhh.....",
            7: ".......HH.......", 8: ".......HH.......", 9: ".......hh......."},
        right={2: ".....HHiiHH.....", 3: "....HHHHHHHH....", 4: "..HWHHH.........", 5: "..HHHH..........", 6: "..HHh...........", 7: "..h............."},
    ),
    "pigtails": dict(
        down={2: ".....HiiHHH.....", 3: "....HHHHHHHH....", 4: "..HHH......HHH..", 5: "..HH........HH..", 6: "..HH........HH..", 7: "..h..........h.."},
        up={2: ".....HHHHHH.....", 3: "....HHHHHHHH....", 4: "..HHHHHHHHHHHH..", 5: "..HHHHHHHHHHHH..", 6: "..HH.hhhhhh.HH..", 7: "..h..........h.."},
        right={2: ".....HHiiHH.....", 3: "....HHHHHHHH....", 4: "....HHH.........", 5: "...HHH..........", 6: "...HH...........",
               7: "...HH...........", 8: "...h............"},
    ),
    "bun": dict(
        down={0: ".......HH.......", 1: "......HHHH......", 2: ".....HiiHHH.....", 3: "....HHHHHHHH....", 4: "....H......H...."},
        up={0: ".......HH.......", 1: "......HHHH......", 2: ".....HHHHHH.....", 3: "....HHHHHHHH....", 4: "....HHHHHHHH....",
            5: "....HHHHHHHH....", 6: ".....hhhhhh....."},
        right={0: ".....HH.........", 1: "....HHHH........", 2: ".....HHiiHH.....", 3: "....HHHHHHHH....", 4: "....HHH.........",
               5: "....HH..........", 6: "....h..........."},
    ),
    "spiky": dict(
        down={1: "....H.H..H.H....", 2: "....HHiHHHHH....", 3: "....HHHHHHHH....", 4: "....H......H...."},
        up={1: "....H.H..H.H....", 2: "....HHHHHHHH....", 3: "....HHHHHHHH....", 4: "....HHHHHHHH....", 5: "....HHHHHHHH....", 6: ".....hhhhhh....."},
        right={1: ".....H.H.H.H....", 2: "....HHHiHHHH....", 3: "....HHHHHHHHH...", 4: "....HHH.........", 5: "....HH..........", 6: "....h..........."},
    ),
    "mohawk": dict(
        down={0: ".......HH.......", 1: "......HiHH......", 2: "......HHHH......", 3: "......hHHh......"},
        up={0: ".......HH.......", 1: "......HHHH......", 2: "......HHHH......", 3: "......HHHH......", 4: ".......HH.......", 5: ".......hh......."},
        right={0: ".....H.H.H.H....", 1: ".....HHHiHHH....", 2: "....hHHHHHHh...."},
    ),
}

# "hides": which part of the hair a hat covers ("top" = everything above the ears, "all" = all of it)
HATS = {
    "toque": dict(
        hides="top",
        down={0: ".......WW.......", 1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....uuuuuuuu...."},
        up={0: ".......WW.......", 1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....uuuuuuuu...."},
        right={0: ".......WW.......", 1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....uuuuuuuu...."},
    ),
    "cap": dict(
        hides="top",
        down={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....TTTuuTTT....", 4: "....tttttttt...."},
        up={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....TTTTTTTT....", 4: "....TTTKKTTT...."},
        right={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....TTTTTTTT....", 4: "........tttttt.."},
    ),
    "headphones": dict(
        hides="",
        down={0: "......TTTT......", 1: "....TT....TT....", 2: "...T........T...", 4: "..tT........Tt..", 5: "..tT........Tt..", 6: "..tT........Tt.."},
        up={0: "......TTTT......", 1: "....TT....TT....", 2: "...T........T...", 4: "..tT........Tt..", 5: "..tT........Tt..", 6: "..tT........Tt.."},
        right={0: ".......T........", 1: ".......T........", 2: ".......T........", 3: ".......T........", 4: "......TTT.......", 5: "......TtT.......", 6: "......TTT......."},
    ),
    "hijab": dict(
        hides="all",
        down={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "...TTTTTTTTTT...", 4: "...TT......TT...", 5: "...TT......TT...",
              6: "...TT......TT...", 7: "...TTT....TTT...", 8: "...tTTTTTTTTt...", 9: ".....tTTTTt....."},
        up={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "...TTTTTTTTTT...", 4: "...TTTTTTTTTT...", 5: "...TTTTTTTTTT...",
            6: "...TTTTTTTTTT...", 7: "...TTTTTTTTTT...", 8: "...tTTTTTTTTt...", 9: "....tttttttt...."},
        right={1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "...TTTTTTTTT....", 4: "...TTTTTT.......", 5: "...TTTTTT.......",
               6: "...TTTTTT.......", 7: "...TTTTTTT......", 8: "....tTTTTTt.....", 9: ".....ttttt......"},
    ),
    "turban": dict(
        hides="all",
        down={0: "......TTTT......", 1: ".....TTuuTT.....", 2: "....TTuTTuTT....", 3: "....TuTTTTuT....", 4: "....t......t...."},
        up={0: "......TTTT......", 1: ".....TTTTTT.....", 2: "....TTTTTTTT....", 3: "....TTTTTTTT....", 4: "....TTTTTTTT....", 5: ".....tttttt....."},
        right={0: "......TTTT......", 1: ".....TTTTuT.....", 2: "....TTTTuTTT....", 3: "....TTTuTTTT....", 4: "....ttt........."},
    ),
}

GLASSES = {
    "glasses": dict(
        down={5: "....KLEKKELK...."},
        up={},
        right={5: "......KKKLEK...."},
    ),
    "sunglasses": dict(
        down={5: "....KGKKKKKK...."},
        up={},
        right={5: "......KKKKKK...."},
    ),
}

# ------------------------------------------------------------------ build
PART_ROWS = []  # (kind, id, frames)
PART_ROWS.append(("head", "head", [HEAD["down"]] * 3 + [HEAD["up"]] * 3 + [mirror(HEAD["right"])] * 3 + [HEAD["right"]] * 3))
for name, o in OUTFITS.items():
    PART_ROWS.append(("outfit", name, outfit_frames(o)))
PART_ROWS.append(("chair", "chair", chair_frames()))
for name, h in HAIR.items():
    PART_ROWS.append(("hair", name, still(h)))
for name, h in HATS.items():
    PART_ROWS.append(("hat", name, still(h)))
for name, g in GLASSES.items():
    PART_ROWS.append(("glasses", name, still(g)))


def hexc(s, a=255):
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def build_sheet():
    sheet = Image.new("RGBA", (12 * T, len(PART_ROWS) * T), (0, 0, 0, 0))
    for r, (_, _, frames) in enumerate(PART_ROWS):
        assert len(frames) == 12
        for f, frame in enumerate(frames):
            for y, line in enumerate(frame):
                for x, ch in enumerate(line):
                    if ch == ".":
                        continue
                    colour = MARKERS[ch][0] if ch in MARKERS else FIXED[ch]
                    sheet.putpixel((f * T + x, r * T + y), hexc(colour))
    path = os.path.join(ROOT, "assets", "sprites", "hero_parts.png")
    sheet.save(path)
    return path


def build_manifest():
    parts = {"head": 0, "chair": 0, "outfit": {}, "hair": {}, "hat": {}, "glasses": {}}
    for r, (kind, name, _) in enumerate(PART_ROWS):
        if kind in ("head", "chair"):
            parts[kind] = r
        else:
            parts[kind][name] = r
    hides = {name: h["hides"] for name, h in HATS.items() if h["hides"]}
    markers = {colour: role for (colour, role) in MARKERS.values()}
    js = (
        "// Which row of assets/sprites/hero_parts.png holds which part, and what each marker colour means.\n"
        "// Written by tools/art/make_hero_parts.py. Do not edit by hand: change the script and run it again.\n"
        f"export const FRAME = {T};\n"
        "export const FRAMES_PER_ROW = 12; // down, up, left, right x (standing, step, step)\n"
        f"export const PART_ROWS = {json.dumps(parts)};\n"
        f"export const HAT_HIDES_HAIR = {json.dumps(hides)}; // top = above the ears, all = everything\n"
        "export const HAIR_LINE = 4;   // rows above this are hidden under a hat that hides the top\n"
        "export const WAIST_LINE = 11; // a seated hero's outfit is drawn above this row only\n"
        f"export const MARKERS = {json.dumps(markers)};\n"
        f"export const OUTLINE = {json.dumps(OUTLINE)};\n"
    )
    path = os.path.join(ROOT, "src", "systems", "avatarParts.js")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(js)
    return path


# ------------------------------------------------------------------ preview (for whoever is drawing)
def compose(look, colours, frame):
    """Python copy of what src/systems/avatar.js does, for one frame.
    look: the chosen parts (body, outfit, hair, hat, glasses). colours: hex for skin, hair, eyes, top, bottom, hat."""
    grid = [["."] * T for _ in range(T)]

    def layer(kind, name=None, keep=lambda y: True):
        for (k, n, frames) in PART_ROWS:
            if k == kind and (name is None or n == name):
                for y, line in enumerate(frames[frame]):
                    if keep(y):
                        for x, ch in enumerate(line):
                            if ch != ".":
                                grid[y][x] = ch

    seated = look.get("body") == "chair"
    layer("head")
    layer("outfit", look["outfit"], (lambda y: y < 11) if seated else (lambda y: True))
    if seated:
        layer("chair")
    hides = HATS.get(look.get("hat"), {}).get("hides", "")
    if look.get("hair") in HAIR and hides != "all":
        layer("hair", look["hair"], (lambda y: y >= 4) if hides == "top" else (lambda y: True))
    if look.get("hat") in HATS:
        layer("hat", look["hat"])
    if look.get("glasses") in GLASSES:
        layer("glasses", look["glasses"])

    def mix(c, other, k):
        return tuple(round(c[i] * (1 - k) + other[i] * k) for i in range(3)) + (255,)

    def colour(ch):
        if ch in FIXED:
            return hexc(FIXED[ch])
        role = MARKERS[ch][1]
        if role == "mouth":
            base = hexc(colours["skin"])
            return (round(base[0] * .85), round(base[1] * .6), round(base[2] * .6), 255)
        base = hexc(colours[role.split("-")[0]])
        if role.endswith("-shade"):
            return mix(base, (0, 0, 0), .26)
        if role.endswith("-light"):
            return mix(base, (255, 255, 255), .4)
        return base

    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    for y in range(T):
        for x in range(T):
            if grid[y][x] != ".":
                im.putpixel((x, y), colour(grid[y][x]))
    src = im.copy()
    for y in range(T):
        for x in range(T):
            if src.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < T and 0 <= ny < T and src.getpixel((nx, ny))[3] > 0:
                        im.putpixel((x, y), hexc(OUTLINE))
                        break
    return im


def preview(path, data, scale=8, frames=(0, 1, 3, 9, 10, 6)):
    """One row per ready-made hero in content/avatar.json."""
    pal = {kind: {c["id"]: c["hex"].lstrip("#") for c in data[kind]} for kind in ("skin", "hairColor", "eyes", "top", "bottom", "hatColor")}
    looks = data["presets"]
    sheet = Image.new("RGBA", (len(frames) * T, len(looks) * T), hexc("5fb04a"))
    for r, p in enumerate(looks):
        colours = dict(skin=pal["skin"][p["skin"]], hair=pal["hairColor"][p["hairColor"]], eyes=pal["eyes"][p["eyes"]],
                       top=pal["top"][p["top"]], bottom=pal["bottom"][p["bottom"]], hat=pal["hatColor"][p["hatColor"]])
        for c, f in enumerate(frames):
            sheet.alpha_composite(compose(p, colours, f), (c * T, r * T))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(path)


if __name__ == "__main__":
    for p in (build_sheet(), build_manifest()):
        print("wrote", os.path.relpath(p, ROOT))
    print("rows:", ", ".join(f"{r}={k}:{n}" for r, (k, n, _) in enumerate(PART_ROWS)))
    if len(sys.argv) > 1:
        with open(os.path.join(ROOT, "content", "avatar.json"), encoding="utf-8") as fh:
            preview(sys.argv[1], json.load(fh))
        print("wrote", sys.argv[1])
