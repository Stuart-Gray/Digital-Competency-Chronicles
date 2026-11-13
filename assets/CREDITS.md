# Asset credits

Every image, sound and font in the game, where it came from and its licence.
Add a line here whenever an asset is added or replaced.

| File | Source | Licence |
|---|---|---|
| `tiles/village.png` | Drawn for this project by `tools/art/make_placeholder_art.py` (placeholder art, 2026) | CC0 1.0 (public domain) |
| `sprites/hero.png` | Drawn for this project by `tools/art/make_placeholder_art.py` | CC0 1.0 |
| `sprites/npcs.png` | Drawn for this project by `tools/art/make_placeholder_art.py` | CC0 1.0 |
| `../maps/hub.tmj` | Built for this project by `tools/art/make_hub_map.py`; editable in Tiled | CC0 1.0 |
| `tiles/dungeon.png` | Drawn for this project by `tools/art/make_dungeon_art.py` | CC0 1.0 |
| `sprites/fx.png` (traces, lantern, badge pieces) | Drawn for this project by `tools/art/make_dungeon_art.py` | CC0 1.0 |
| `sprites/icons.png` (puzzle card icons) | Drawn for this project by `tools/art/make_dungeon_art.py` | CC0 1.0 |
| `pictures/*.png` (puzzle pictures; no words in them, text is laid over from `/content`) | Drawn for this project by `tools/art/make_dungeon_art.py` | CC0 1.0 |
| `../maps/area2.tmj` | Built for this project by `tools/art/make_area2_map.py`; editable in Tiled | CC0 1.0 |
| `fonts/atkinson-hyperlegible-*.woff2` | Atkinson Hyperlegible by the Braille Institute of America, via Fontsource (`@fontsource/atkinson-hyperlegible` 5.x) | SIL OFL 1.1 (`fonts/OFL-AtkinsonHyperlegible.txt`) |
| `fonts/press-start-2p-*.woff2` | Press Start 2P by CodeMan38, via Fontsource (`@fontsource/press-start-2p` 5.3.0) | SIL OFL 1.1 (`fonts/OFL-PressStart2P.txt`) |
| Phaser 3.90.0 (loaded from jsDelivr, not stored here) | https://phaser.io | MIT |

Why our own placeholder art: the plan suggested Kenney's CC0 packs, but drawing a small
set of tiles in code keeps the licence question simple (no third-party art at all) and lets
us change colours and tiles quickly. The final art direction is still open (decided at the
teacher review, milestone 4). No art is copied from, or made to imitate, any commercial game.

Audio: no audio files. The background music is played live by `src/systems/music.js`
(Web Audio) from the notes in `content/music.json`. All three songs ("Chronicles Overture",
"Market Waltz", "Lantern in the Dark") are original compositions written for this project in
2026, in the style of 8-bit console music but not based on any existing tune. Licence: CC BY 4.0,
like the rest of `/content`.
