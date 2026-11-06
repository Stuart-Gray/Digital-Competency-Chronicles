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
| `area1.json` … `area7.json` | One per content area (from milestone 2, starting with `area2.json`) |

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
story flag is set", `ifNot` means "only when it is not set". The id (`fixer`) must match the
`npc` property of the person on the Tiled map.

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
| `speaker` | Who is talking (an id from `npcs`). Leave out for signs. |
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

### Types coming in milestone 2

`sort`, `spot`, `match`, `predict`, `cocreate` (see `build-plan.md`, section 5.4).

### Variety rule

No two puzzles of the same type in a row (per cycle), in the order they appear in the file.
The checker warns when this is broken.

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

## Maps

Maps are Tiled files (`.tmj`) in `/maps`. Objects on the `objects` layer:

| Type | Properties | What it is |
|---|---|---|
| `spawn` | | Where a new player starts |
| `npc` | `npc` (id in content), `sprite` (row in `npcs.png`) | A person |
| `sign` | `dialogue` (node id) | Something to read or look at |
| `gate` | `area` (1 to 7), `open` (true/false) | A gate to a content area |
| `talk` | `target` (another object's name) | Talking here talks to the target (e.g. across a counter) |

Tiles with the `collides` property block walking.
