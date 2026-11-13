// Which row of assets/sprites/hero_parts.png holds which part, and what each marker colour means.
// Written by tools/art/make_hero_parts.py. Do not edit by hand: change the script and run it again.
export const FRAME = 16;
export const FRAMES_PER_ROW = 12; // down, up, left, right x (standing, step, step)
export const PART_ROWS = {"head": 0, "chair": 7, "outfit": {"tee": 1, "hoodie": 2, "stripes": 3, "overalls": 4, "dress": 5, "jersey": 6}, "hair": {"short": 8, "long": 9, "curly": 10, "ponytail": 11, "pigtails": 12, "bun": 13, "spiky": 14, "mohawk": 15}, "hat": {"toque": 16, "cap": 17, "headphones": 18, "hijab": 19, "turban": 20}, "glasses": {"glasses": 21, "sunglasses": 22}};
export const HAT_HIDES_HAIR = {"toque": "top", "cap": "top", "hijab": "all", "turban": "all"}; // top = above the ears, all = everything
export const HAIR_LINE = 4;   // rows above this are hidden under a hat that hides the top
export const WAIST_LINE = 11; // a seated hero's outfit is drawn above this row only
export const MARKERS = {"ff0000": "skin", "c00000": "skin-shade", "ff8080": "mouth", "00ff00": "hair", "00c000": "hair-shade", "80ff80": "hair-light", "0000ff": "eyes", "ffff00": "top", "c0c000": "top-shade", "ffff80": "top-light", "00ffff": "bottom", "00c0c0": "bottom-shade", "ff00ff": "hat", "c000c0": "hat-shade", "ff80ff": "hat-light"};
export const OUTLINE = "1d1b26";
