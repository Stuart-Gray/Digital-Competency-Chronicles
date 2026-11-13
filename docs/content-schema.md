# Content format guide

Everything a player reads lives in the JSON files in `/content`. You can change the words,
the dialogue and the puzzles without touching any code. This guide explains the format.

After any change, check your work: open `tools/validate.html` on the live site (or run
`node tools/validate.mjs`). Errors must be fixed; warnings are advice.

## Files

| File | What it holds |
|---|---|
| `ui.json` | Menus, buttons, settings, area names, achievements |
| `hub.json` | The digital village: people, signs, gates, the Fix-it shop puzzles |
| `area2.json` | Dungeon 2, the Temple of Traces (sheet 2: digital identity) |
| `area1.json`, `area3.json` … `area7.json` | One per content area, added dungeon by dungeon |
| `music.json` | Background music: the notes of each song (see [Music](#music-musicjson)) |

Every file starts with `"schemaVersion": 1`.

## Text: always English and French

Every piece of text is an object with both languages:

```json
{ "en": "Ask a classmate for advice.", "fr": "Demande conseil à un ou une camarade." }
```

- Both are required. An empty `en` or `fr` is an error.
- English follows the English Ministry sheets and uses Canadian spelling (colour, behaviour, centre).
- French follows the French Ministry sheets and Quebec French vocabulary (courriel, clavardage,
  téléverser, numérique). Write the French from the French sheet, not as a translation of the English.
- Placeholders in curly brackets are filled in by the game: `{name}` is the player's first name
  (or "Mystery" / "Mystère" if they skipped it). Gate text also uses `{area}`.
- Short sentences, plain words, written for the cycle.

## Cycles (tiers)

Tier ids: `"E2"` = Cycle 2 (Grades 3 and 4), `"E3"` = Cycle 3 (Grades 5 and 6).
Secondary will add `"S1"`, `"S2"`, `"S3"` later.

- Leave out `tiers` and the item is shown to everyone.
- `"tiers": ["E2"]` shows it only to Cycle 2.
- For puzzles written twice (one per cycle), give both the same `family`. The game picks the
  one for the player's cycle, and dialogue starts the puzzle by its family name.

Language targets per cycle (a guide, not a rule):

| | Cycle 2 | Cycle 3 |
|---|---|---|
| Sentence length | About 10 words or fewer | About 15 words or fewer |
| Scenarios | Classroom tablets, family photos, class message board | Group chats, online games, sharing a friend's photo, projects |
| Puzzle size | 3 options, 3 to 4 items | Up to 4 options, 4 to 6 items |
| Hints | Point straight at the answer | Give a clue to think about |

## People (`npcs`)

```json
"npcs": {
  "fixer": {
    "name": { "en": "Théo", "fr": "Théo" },
    "dialogue": [
      { "if": "fixer_done", "node": "fixer_thanks" },
      { "node": "fixer_intro" }
    ]
  }
}
```

`dialogue` is a list of choices; the first one that fits is used. `if` means "only when this
story flag is set", `ifNot` means "only when it is not set" (an entry can have both). The id
(`fixer`) must match the `npc` property of the person on the Tiled map.

**Keep dialogue in the moment.** What a person says must follow from where they are, what they
are doing, and how far the player has got. Put the newest situation first in the list
(for example "after the badge", then "after the lantern", then the first meeting), so people
move on with the story instead of repeating advice the player has already used.

## Dialogue

A dialogue node is a list of lines, shown one at a time.

```json
"fixer_intro": [
  { "speaker": "fixer", "text": { "en": "Oh no! My app is frozen.", "fr": "Oh non! Mon application est gelée." } },
  { "speaker": "fixer", "tiers": ["E2"],
    "text": { "en": "Can you help me?", "fr": "Peux-tu m’aider?" },
    "choices": [
      { "text": { "en": "Yes!", "fr": "Oui!" }, "action": "puzzle:fixer_steps", "next": "fixer_try" },
      { "text": { "en": "Maybe later.", "fr": "Peut-être plus tard." }, "next": null }
    ] }
]
```

A line can have:

| Field | Meaning |
|---|---|
| `speaker` | Who is talking (an id from `npcs`). Shows their name on the box and a speech bubble over them when they are in the scene. Leave out for signs. |
| `text` | What they say. |
| `tiers` | Only for these cycles. |
| `if` / `ifNot` | Only when a story flag is (not) set. |
| `choices` | Buttons to pick from. Each has `text`, and can have `next` (node to go to) and `action`. |
| `action` | Something that happens after the line (see below). |

Actions:

| Action | What it does |
|---|---|
| `puzzle:<id or family>` | Opens a puzzle. If the player leaves it for later, the conversation ends there. |
| `set:<flag>` / `unset:<flag>` | Sets or clears a story flag (saved with the player). |
| `goto:<node>` | Jumps to another node. |
| `give:<item>` | Gives an item, badge piece or badge from an `items` list (see below). Also sets the flag `got_<item>`. |
| `achieve:<id>` | Unlocks an achievement from `ui.json`. |
| `travel:<Scene>:<spawn>` | Goes to another place, e.g. `travel:Dungeon2:from_village`. |

Story flags you can rely on: `got_<item>` when an item is given, `talked_<npc>` after talking to
someone, and each puzzle's `flag` when it is solved.

## Puzzles

Every puzzle must cite the element it comes from and the sheet's student application.

```json
{
  "id": "fixer_steps_c3",
  "family": "fixer_steps",
  "tiers": ["E3"],
  "element": "4b",
  "type": "sequence",
  "application": {
    "en": "Establish a troubleshooting procedure for the group.",
    "fr": "Établir une procédure de dépannage en groupe."
  },
  "prompt": { "en": "…", "fr": "…" },
  "success": { "en": "…", "fr": "…" },
  "flag": "fixer_fixed",
  "achievement": "first_fix",
  "teacherNote": { "en": "Ask: …", "fr": "Demandez : …" }
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique name. |
| `element` | yes | Element code: `1a 1b 1c 2a 2b 2c 3a 3b 4a 4b 5a 6a 6b 7a 7b` (sheet order, see `content-mapping.md`). |
| `application` | yes | The sheet's student application this puzzle comes from, in both languages, copied from the English and French sheets. |
| `type` | yes | One of the puzzle types below. |
| `prompt` | yes | The question or instruction. |
| `success` | yes | What the game says when it is solved. Explain *why*, briefly. |
| `family`, `tiers` | no | See "Cycles" above. |
| `flag` | no | Story flag set when solved. |
| `achievement` | no | Achievement unlocked when solved (id from `ui.json`). |
| `teacherNote` | no | A question for a brief class discussion (teacher layer, milestone 3). |

There is no score and no fail state. A wrong try shows a hint and the player tries again.
Hints used are counted quietly for the teacher view, by element, and never shown as a mark.
Players can always leave a puzzle and come back.

### Types built so far

**`sequence`**: put steps in order. Tap a step to add it; tap it again to take it back. When the
order is checked, correct steps at the start lock in, the rest go back, and the hint of the first
wrong spot is shown.

```json
"steps": [
  { "id": "self", "text": { … }, "hint": { … } },
  { "id": "help", "text": { … }, "hint": { … } }
]
```

Write the steps in the correct order; the game shuffles them. Each step's `hint` is shown when
that is the first spot the player got wrong.

**`choice`**: pick the best answer. 2 to 4 options, exactly one with `"correct": true`. Every wrong
option needs a `hint`. Options are shuffled unless `"shuffle": false`. Try to keep options about the
same length so the right answer is not the longest one.

```json
"options": [
  { "text": { … }, "correct": true },
  { "text": { … }, "hint": { … } }
]
```

Any option, sort item, sort box or match side can have an `"icon"`: one of the names in
`src/ui/icons.js` (for example `photo`, `like`, `comment`, `lock`, `camera`, `mic`, `location`).
A choice can also show a `"picture"` (see `spot`).

**`predict`**: watch a short scene, then choose what happens next. `scene` is a list of moments
shown one at a time; then `question` and the `options` (same rules as `choice`).

```json
"scene": [
  { "icon": "post", "text": { … } },
  { "icon": "trash", "text": { … } }
],
"question": { "en": "What happens next?", "fr": "Que se passe-t-il ensuite?" },
"options": [ … ]
```

**`sort`**: tap a card, then the box it goes in. 2 or 3 `bins`. Each item names its right box in
`bin`; when more than one box is a good answer, give a list (`"bin": ["ask", "private"]`). An item
that can go in the wrong box needs a `hint`. An optional `why` is shown when it goes in a right box.

```json
"bins": [ { "id": "personal", "icon": "lock", "text": { … } }, { "id": "notpersonal", "text": { … } } ],
"items": [ { "id": "address", "icon": "house", "text": { … }, "bin": "personal", "hint": { … } } ]
```

**`match`**: pair each thing on the left with one on the right. Write the pairs together; the game
shuffles both columns. Each pair needs a `hint` (shown when its left side is paired wrongly).
`leftTitle` and `rightTitle` are optional column headings.

```json
"pairs": [ { "id": "like", "left": { "icon": "like", "text": { … } }, "right": { "text": { … } }, "hint": { … } } ]
```

**`spot`**: find the clues in a picture. `picture` is a file in `assets/pictures/` (pictures have no
words in them, so they work in both languages); `pictureAlt` says what it shows, for screen readers.
`labels` put words on the picture (like a street name) from the content file. Each spot is a
rectangle in percent of the picture (`x`, `y`, `w`, `h`). Spots with `"clue": true` must all be found
and need `why`; the others are decoys and need a `hint`.

```json
"picture": "assets/pictures/photo_house.png",
"labels": [ { "x": 80, "y": 32, "w": 19, "text": { "en": "Maple St", "fr": "rue des Érables" } } ],
"spots": [
  { "id": "number", "clue": true, "x": 59, "y": 52, "w": 14, "h": 15, "name": { … }, "why": { … } },
  { "id": "dog", "clue": false, "x": 16, "y": 75, "w": 18, "h": 20, "name": { … }, "hint": { … } }
]
```

### Type still to come

`cocreate` (Area 5, see `build-plan.md`, section 5.4).

### Variety rule

No two puzzles of the same type in a row (per cycle), in the order they appear in the file.
The checker warns when this is broken. The final room's chain of tricks is a chain of choices on
purpose: mark those puzzles `"finale": true` and the check skips them.

## Items, pieces and badges (`items`)

```json
"items": {
  "lantern": { "kind": "item", "fx": 6, "name": { … }, "desc": { … }, "achievement": "lantern_lit" },
  "piece_traces": { "kind": "piece", "fx": 7, "name": { … }, "desc": { … }, "wing": ["d2_traces", "d2_vanishing", "d2_profile"] }
}
```

`kind` is `item`, `piece` or `badge`; `fx` is the picture (a frame of `assets/sprites/fx.png`);
`achievement` is unlocked when the item is given. `wing` lists the puzzle families of a wing:
finishing them all without a hint quietly unlocks the *Clear thinker* achievement.

## Teacher notes (`teacher`)

Each area file has `teacher.before` and `teacher.after` (reflection prompts) and
`teacher.lookFors` (what to watch and listen for, by element). They are for the teacher corner
and the teacher guide, and are never shown to students as a checklist.

## Achievements (`ui.json`)

```json
"achievements": {
  "first_fix": {
    "name": { "en": "Fix-it helper", "fr": "As du dépannage" },
    "desc": { "en": "You helped Théo fix a frozen app.", "fr": "Tu as aidé Théo à réparer une application gelée." }
  }
}
```

Achievements are positive and optional. The Journal lists only what a player has done.

## Music (`music.json`)

The game plays chiptune music with the browser's own sound engine (no audio files). Each song
is written as notes, so anyone can change a tune in a text editor. All songs are original
compositions for this project (CC BY 4.0, like the rest of `/content`); please keep it that way
and never copy a melody from an existing game or song.

| Song id | Where it plays | Mood |
|---|---|---|
| `title` | Title screen and menus | Bright, hopeful |
| `village` | The digital village (a waltz, 3 beats a bar) | Friendly, easy-going |
| `temple` | Dungeon 2, the Temple of Traces | Mysterious but calm, never scary |

A scene picks its song with the `music` option in its `src/scenes/*.js` file. Changing places
fades one song out and the next one in.

```json
"village": {
  "bpm": 138, "stepsPerBeat": 2, "beatsPerBar": 3,
  "channels": {
    "pulse1":   {"duty": 0.5, "volume": 0.24},
    "triangle": {"wave": "triangle", "volume": 0.45, "gate": 0.8},
    "noise":    {"wave": "noise", "volume": 0.1}
  },
  "order": ["A", "B", "A"],
  "parts": {
    "A": {
      "pulse1":   "A4:2 C5 F5:3 | E5:2 D5 C5:3 | …",
      "triangle": "F2:2 C3:2 A2:2 | C3:2 G2:2 E2:2 | …",
      "noise":    "k - h - h - | k - h - h - | …"
    }
  }
}
```

- **Channels:** `pulse1` and `pulse2` are buzzy retro waves (`duty` 0.125 is thin, 0.25 is
  classic, 0.5 is round and soft), `triangle` is a soft bass, `noise` plays drums.
- **Notes:** a letter, an optional `#` or `b`, and an octave: `C5`, `F#4`, `Bb3`. `-` is a rest.
  Drums are `k` (kick), `s` (snare) and `h` (hi-hat).
- **Lengths:** `:2` after a note makes it last 2 steps. No number means 1 step. With
  `stepsPerBeat: 2`, one step is an eighth note.
- **Bars:** `|` marks a bar line. The checker makes sure every bar has the right number of
  steps (`stepsPerBeat` × `beatsPerBar`), so a mistake shows up right away.
- **Volume and feel:** `volume` (0 to 1) per channel, `gate` (how much of each step a note
  sounds; lower is more staccato), `sustain` (how much a note fades after it starts).
- `order` lists the parts to play; the song then loops.

Music is on by default at a medium volume. Players turn it off or change the volume in
Settings; the choice is saved on the device. It starts after the first tap or key press
(browsers, and iPads especially, don't allow sound before that), pauses when the tab is hidden,
and gets quieter while Read aloud is speaking.

## Maps

Maps are Tiled files (`.tmj`) in `/maps`. Objects on the `objects` layer:

| Type | Properties | What it is |
|---|---|---|
| `spawn` | | Where a new player starts |
| `npc` | `npc` (id in content), `sprite` (row in `npcs.png`) | A person |
| `sign` | `dialogue` (node id) | Something to read or look at |
| `gate` | `area` (1 to 7), `open` (true/false) | A gate to a content area |
| `talk` | `target` (another object's name) | Talking here talks to the target (e.g. across a counter) |
| `door` | `flag` (opens when set; `a,b` means all of them), `w`, `h`, `dialogue` (said when closed), `closed`, `closedTop` (tiles) | A door that opens with the story |
| `chest` | `flag` (set when opened), `dialogue` (usually with a `give:` action) | A treasure chest |
| `keystone` | `group`, `order` (1, 2, 3…), `flag` (set when the group is pressed in order), `resetDialogue`, `doneDialogue` | A floor stone to step on |
| `trace` | `fx` (frame of `fx.png`) | A glowing trace on the floor |
| `exit` | `to` (scene), `spawn` (spawn name there) | Walking onto it goes to another place |
| `deco` | `tile`, `layer` (`ground` or `structures`) | Changes a tile, usually with `ifFlag` (the village grows) |

Any object can also have `ifFlag` / `ifNotFlag` (only there when a flag is or is not set) and
`lantern: true` (only seen and used inside the lantern's light). A `spawn` can have `facing`.

Tiles with the `collides` property block walking. The maps are made by `tools/art/make_hub_map.py`
and `tools/art/make_area2_map.py`; once someone edits a map in Tiled, stop running its script.
