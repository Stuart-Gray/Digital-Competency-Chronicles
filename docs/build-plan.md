# Build plan: The Digital Competency Chronicles

Status: **draft for discussion** (5 November 2026). Nothing here is built yet. Items marked **DECIDE** need Stuart's call before the related work starts.

---

## 1. Review findings

What I reviewed: the project instructions, `README.md`, `chat-summary.md`, the GitHub repo, the Ministry presentation document, Sheet 2 (Digital identity) and the DCF page on quebec.ca.

1. **The GitHub repo is empty.** No commits, no `main` branch, no Pages site. This plan's commit is the first one. It also adds `README.md` and `chat-summary.md` from the project files so the repo matches the "sources of truth" in the project instructions.
2. **Title mismatch.** The README header still says "Digital Competency Quest (working title)". The project instructions say the working title is *The Digital Competency Chronicles*. I updated the README header to match.
3. **Sheet 2 checks out against the README.** The three elements (digital identity, personal information, privacy protection) and their student applications match what the README lists. The sheets do **not** number elements "2a, 2b, 2c"; they use titles only. The codes are our own convention, so section 4.6 makes them official and records the mapping to the Ministry titles.
4. **DCF dimension names need confirming.** The quebec.ca DCF page (updated 10 Aug 2026) says the framework has 12 dimensions and was updated for AI, but the names are only in the full PDF. The presentation document maps areas to dimensions in its Appendix 1, which I could not read in text form. The README's mapping (D1, D2, D3, D5 to D12) matches the 2019 framework numbering. **Dimension 4 (information literacy in 2019) is not linked to any area in the README.** It probably belongs with 7a (keyword search, choosing sources). We should check Appendix 1 and the 2026 PDF before writing any in-game text that names dimensions.
5. **Network note.** From this environment I can read the quebec.ca pages but not download the sheet PDFs directly. If Stuart drops sheets 1 to 7 and the DCF PDF into the project files (or the local folder), every puzzle can be checked word for word against them.
6. **Two design risks the README does not cover yet:**
   - **Cycle 1 readers.** Six- and seven-year-olds cannot read long dialogue. The game needs read-aloud (browser text-to-speech), icon-led puzzles and very short lines from day one. Read-aloud is also a natural fit for element 3b (assistive tech).
   - **Shared devices.** Class sets of Chromebooks and iPads are shared. With no accounts, we need a few anonymous save slots per device (pick an avatar, no names) and a way to start fresh.
7. **Area 5 (collaboration) is the hardest fit for a single-player game.** It needs its own design spike later (ideas: two-players-one-device co-op, or a co-creation puzzle with NPC teammates). Not a blocker for the first slice.

---

## 2. Guiding rules (from the project instructions)

Every feature is checked against these before it is built:

- No grades, scores, timers that punish, or "wrong" sounds. Feedback is in-game: hints, retries, badges, progress pieces.
- Teacher layer = reflection prompts and look-fors. No rubrics.
- AI woven into the relevant areas (1c algorithms, 3b AI features, 7a GenAI images).
- Every puzzle cites its element (for example `2b`) and comes from a sheet's student applications.
- Privacy first: no accounts, no analytics, no network calls except loading the game itself. Saves in `localStorage` only.
- Every player-facing string lives in `/content`. None in engine code.
- Static files only, runs from GitHub Pages, Phaser from a CDN, no build step.
- Short sentences, plain English, kid-friendly.
- Genre is "top-down adventure in the 16-bit style". We do not copy any existing game's names, characters, art, music or maps.

---

## 3. Architecture

### 3.1 Runtime

- **Phaser 3**, pinned to one exact version from jsDelivr (for example `phaser@3.90.0`), loaded by a `<script>` tag in `index.html`. Pinning avoids surprise breakage.
- **Plain ES modules** (`<script type="module" src="src/main.js">`). No bundler, no npm needed to play.
- **Pixel-art canvas**: internal resolution 320×180 (16:9), 16×16 tiles, `pixelArt: true`, scaled with `Phaser.Scale.FIT` so it fills Chromebook, laptop and iPad screens without blur.
- **Input**: keyboard (arrows/WASD + Space/Enter), plus touch: an on-screen D-pad and an action button that appear automatically on touch devices. Puzzles are tap/click-first so they work the same everywhere.
- **Performance target**: smooth on a low-end Chromebook. Keep textures small, maps small (one screen or a few screens per room), no heavy effects.

### 3.2 Folder layout

This follows the project instructions, with a few additions (marked *new*):

```
/index.html
/src/
  main.js                 Phaser config, scene list
  scenes/
    Boot.js               load settings + language, then Preload
    Preload.js            new: loads assets and content with a progress bar
    Title.js              title, save slots, settings, teacher corner
    Hub.js                the digital village
    Dungeon.js            new: one generic, data-driven dungeon scene
    UI.js                 new: overlay scene (dialogue box, touch controls, HUD)
    PuzzleScene.js        new: overlay that runs one puzzle from JSON
    Journal.js            new: badges and progress pieces collected
  systems/
    save.js               localStorage wrapper, versioned, save slots
    i18n.js               new: picks the en/fr text from content objects
    content.js            new: loads and lightly checks content JSON
    dialogue.js           dialogue trees from JSON
    puzzle.js             puzzle-type registry (see 4.4)
    input.js              new: keyboard + touch abstraction
    speech.js             new: read-aloud using the browser's speechSynthesis
/content/
  ui.json                 new: menus, buttons, settings labels
  hub.json                new: village NPCs and hub tasks
  area1.json ... area7.json
/maps/                    Tiled exports (.tmj), one per room
/assets/{tiles,sprites,audio,fonts}/
/assets/CREDITS.md        new: source + licence for every asset
/tools/
  validate.html           new: open in a browser to check all content files
/tests/
  smoke.spec.js           new: headless browser check (dev only)
/docs/
  build-plan.md           this file
  content-schema.md       new: how to edit content files
  content-mapping.md      element <-> dungeon <-> puzzle crosswalk
  teacher-guide.md
LICENSE                   MIT (code)
LICENSE-CONTENT.md        CC BY 4.0 (content + docs)
```

**Why one `Dungeon.js` and not `Dungeon2.js`:** every dungeon works the same way (rooms, NPCs, doors, puzzles, a badge). One scene that reads its map and its `areaN.json` means dungeons 1, 3 to 7 are mostly content and map work, not new code.

### 3.3 Saves (`save.js`)

- Key: `dcc.v1.slot1` to `dcc.v1.slot3`, plus `dcc.v1.settings`.
- A slot holds only: avatar choice, current location, puzzles completed, badges and pieces earned, tier, language. No names, no free text, nothing personal.
- Versioned so later releases can migrate old saves.
- "Start fresh" button per slot. Teacher corner has "clear all slots on this device".
- If `localStorage` is blocked (some managed browsers, private windows), the game still runs and says progress will not be kept.

### 3.4 Accessibility and kid-friendliness (built in from milestone 1)

- Read-aloud toggle on every dialogue line and puzzle prompt.
- Adjustable text speed, large-text option, a clear readable font for dialogue (pixel font only for titles).
- No time pressure, no fail state, no lives. Wrong choices lead to a short explanation and another try.
- Colour is never the only signal. Minimum 44 px touch targets after scaling.
- Each dungeon room is a natural stopping point, so a session fits a 10 to 15 minute slot. The game auto-saves at every room.

---

## 4. Content files

The full field-by-field guide goes in `docs/content-schema.md` (milestone 1). The shape below is the proposal to agree on first.

### 4.1 Bilingual text

Every player-facing text field is an object with one key per language:

```json
"text": { "en": "Strong passwords are long and hard to guess.", "fr": "" }
```

An empty or missing `fr` falls back to English and shows up in the validator's "missing translation" list. Translators then work in the same file, side by side with the English. (**DECIDE**: French at launch, or English first with the structure ready. See section 8.)

### 4.2 `areaN.json` top level

```json
{
  "schemaVersion": 1,
  "area": 2,
  "title": { "en": "Understanding digital identity", "fr": "" },
  "dcfDimensions": [1, 11],
  "elements": {
    "2a": { "en": "Understand digital identity", "fr": "" },
    "2b": { "en": "Understand personal information", "fr": "" },
    "2c": { "en": "Understand online privacy protection", "fr": "" }
  },
  "npcs": [ ... ],
  "dialogue": { ... },
  "puzzles": [ ... ],
  "badge": { ... },
  "teacher": { ... }
}
```

### 4.3 Dialogue

A small node graph. Plain enough to edit by hand:

```json
"dialogue": {
  "keeper_intro": [
    { "speaker": "keeper", "text": { "en": "Welcome to the Hall of Mirrors!", "fr": "" } },
    { "speaker": "keeper", "text": { "en": "Everything you do online leaves a trace.", "fr": "" } },
    { "speaker": "keeper", "text": { "en": "Want to find out what yours say?", "fr": "" },
      "choices": [
        { "text": { "en": "Yes!", "fr": "" }, "next": "keeper_yes" },
        { "text": { "en": "Not yet.", "fr": "" }, "next": null }
      ] }
  ]
}
```

Optional fields: `startPuzzle` (opens a puzzle after the line), `requires` (only shown after a puzzle is done).

### 4.4 Puzzles

Six reusable puzzle types cover almost every student application on the sheets. Each is one engine template; a puzzle is just data.

| Type | What the player does | Example uses |
|---|---|---|
| `choice` | Pick the best answer from 2 to 4 | Respond to a suspicious message (2b), choose a channel (6a) |
| `sort` | Drag/tap items into 2 or 3 bins | Share or keep private (2c), recycle/repair/reuse (1b) |
| `spot` | Tap the clues hidden in a picture | Personal info in a photo (2c), hardware parts (3a) |
| `sequence` | Put steps in order, or find the wrong step | Instruction sequence and debugging (7b), help ladder (4b) |
| `match` | Pair items from two lists | Trace to what it reveals (2a), file to folder (4a) |
| `predict` | See a short scene, choose what happens next | A deleted post still exists (2a), a notification pulls you back (1c) |

Common fields on every puzzle:

```json
{
  "id": "d2_password_forge",
  "element": "2b",
  "type": "sort",
  "tiers": [2, 3],
  "application": "Compare weak and strong passwords.",
  "prompt": { "en": "Which passwords are strong? Put them in the right chest.", "fr": "" },
  "bins": [
    { "id": "strong", "label": { "en": "Strong", "fr": "" } },
    { "id": "weak",   "label": { "en": "Easy to guess", "fr": "" } }
  ],
  "items": [
    { "id": "p1", "label": { "en": "1234", "fr": "" }, "bin": "weak",
      "hint": { "en": "Lots of people use this one!", "fr": "" } },
    { "id": "p2", "label": { "en": "PurpleTiger!Jumps7", "fr": "" }, "bin": "strong" }
  ],
  "success": { "en": "You built a strong lock!", "fr": "" },
  "reward": { "piece": "d2_piece_2" },
  "teacherNote": { "en": "Ask: what makes a password hard to guess?", "fr": "" }
}
```

- `element` is required, and the validator rejects a puzzle without it.
- `application` quotes (in English) the sheet's student application it comes from. It is for consultants and the crosswalk, not shown to players.
- `tiers` says which cycles see this puzzle (1, 2, 3). A dungeon can offer easier and harder versions of the same idea.
- Wrong answers show the item's `hint` and let the player try again. There is no score, and nothing counts attempts.

### 4.5 Badges and teacher layer

```json
"badge": {
  "id": "badge_identity",
  "name": { "en": "Keeper of Traces", "fr": "" },
  "pieces": ["d2_piece_1", "d2_piece_2", "d2_piece_3"],
  "message": { "en": "You know how to protect who you are online.", "fr": "" }
},
"teacher": {
  "before": [ { "en": "What is something you've seen people share online?", "fr": "" } ],
  "after":  [ { "en": "What is one thing you would never share? Why?", "fr": "" } ],
  "lookFors": {
    "2a": [ { "en": "Student explains that a deleted post may still exist somewhere.", "fr": "" } ],
    "2b": [ { "en": "Student says they would ask an adult before answering a request for personal information.", "fr": "" } ],
    "2c": [ { "en": "Student points out details in a photo that could show where someone lives.", "fr": "" } ]
  }
}
```

The teacher corner in the game shows these, and `teacher-guide.md` prints them. No rubric levels.

### 4.6 Element codes

We number elements within each area in the order the sheet lists them: `1a 1b 1c 2a 2b 2c 3a 3b 4a 4b 5a 6a 6b 7a 7b`. `content-mapping.md` will record the exact Ministry title for each code so nobody has to guess.

### 4.7 Checking content without a build step

`/tools/validate.html` loads every content file in the browser and lists problems in plain English: invalid JSON, a puzzle with no `element`, a `next` that points nowhere, an item in a bin that does not exist, missing French. Consultants open it after editing, before sending changes.

---

## 5. First playable slice: Title → Hub → Dungeon 2

Room and NPC names are placeholders until the art direction is set.

### 5.1 Title

Game title, "Play" with three avatar-based save slots, Settings (language, read-aloud, text speed, large text), and a Teacher corner (cycle tier, reflection prompts, clear saves). The teacher corner opens with a "press and hold" so students do not wander in by accident. It is not a password and holds nothing private.

### 5.2 Hub: the digital village

For the slice the village is small: the player's house, a few NPCs, the gate to Dungeon 2 open, the other six gates visibly closed ("Coming soon"). One short hub task shows how the hands-on skills will work:

- **Fix-it shop (4b):** an NPC's tablet won't turn on. The player puts the help steps in order: try it yourself, check the help menu, ask a friend, ask the teacher (`sequence`).

### 5.3 Dungeon 2: Digital identity

Three wings, one per element, then a final room. About eight puzzles in total, so a class can finish one wing per 10 to 15 minute session.

| Wing | Puzzle | Type | Element | Sheet application it comes from |
|---|---|---|---|---|
| Hall of Traces | Footprints that glow behind you; match each trace (photo, comment, like) to what it tells others | `match` | 2a | Recognize digital traces |
| | The vanishing post: a post is "deleted"... where can copies still be? | `predict` | 2a | Explain that deleted posts may still exist |
| | Choose a profile picture that protects you (avatar, no face) | `choice` | 2a | Use an avatar or photo without a face |
| Vault of Keys | Password forge: strong or easy to guess | `sort` | 2b | Compare weak and strong passwords |
| | The stranger at the gate asks for your address. What do you do? | `choice` | 2b | Identify requests for personal information and how to respond |
| | Is it personal information? (name, birthday, favourite colour, address) | `sort` | 2b | Know what can identify a person |
| Window Gallery | Find the clues in the photo (house number, school logo, street sign) | `spot` | 2c | Spot revealing details in images |
| | An app asks for camera, microphone, location. Allow or not? | `sort` | 2c | Evaluate access requests |
| Final room | The "Mask Merchant" tries every trick from the three wings; the player answers with what they learned | `choice` chain | 2a–2c | Review of the above |

Finishing a wing gives a badge piece. All three pieces + the final room give the badge. AI comes into this dungeon lightly (for example, an AI-filtered photo that still shows a street sign); the bigger AI content belongs in areas 1, 3 and 7.

**Cycle tiers (proposal):** Cycle 1 sees fewer items per puzzle, picture-based items and read-aloud on by default. Cycle 3 gets the trickier items (for example, sharing a friend's info without permission). The teacher sets the tier in the teacher corner; Cycle 2 is the default.

---

## 6. Art, audio and licensing

- **Proposal for now:** use CC0 placeholder art (Kenney's 16×16 "Tiny Town" and "Tiny Dungeon" packs are CC0) so we can build and playtest without licence worries. CC0 means no attribution required, though we credit anyway.
- **Avoid for now:** share-alike packs (for example LPC art under CC BY-SA/GPL). They are usable, but they would put share-alike terms on parts of a project that is otherwise MIT + CC BY.
- **Never:** ripped or "inspired-by" sprites, music or names from commercial games.
- **Fonts:** an open (OFL) font that is easy for young readers for dialogue; a pixel font only for titles.
- **Audio:** CC0 chiptune loops and sound effects made with a generator such as jsfxr (output is ours). Gentle sounds only; nothing that signals failure.
- **Every asset** gets a line in `/assets/CREDITS.md`: file, author, source URL, licence, date added.
- **Later:** if the boards want a distinct look, commission a small custom tileset and character set, with a contract that licenses it under CC BY (or assigns it to the project).

---

## 7. Milestones

Dates are proposals, built backwards from a possible small pilot in spring 2027 and the definite pilot in 2027-28.

| # | Milestone | What it delivers | Target |
|---|---|---|---|
| M0 | Foundations | This plan, licences, docs skeleton, `main` branch, GitHub Pages on, local backup in sync | Mid-Nov 2026 |
| M1 | Engine skeleton | Boot/Title/Hub with placeholder art, keyboard + touch movement, dialogue box with read-aloud, save slots, en/fr loader, content validator, smoke test. First Artifact build | End of Nov 2026 |
| M2 | Dungeon 2 slice | Three wings + final room, ~8 puzzles, badge, journal, the one hub task. `content-mapping.md` complete for area 2 | Mid-Jan 2027 |
| M3 | Teacher layer + polish | Teacher corner, `teacher-guide.md` section for area 2, accessibility pass, testing on Chromebook / Windows / iPad Safari | Mid-Feb 2027 |
| M4 | Consultant feedback round | Network plays the slice; decide title, art direction, tier model, French scope | Mar 2027 |
| M5 | Small pilot (optional) | A few classrooms try Dungeon 2 with teacher look-fors | Apr–May 2027 |
| M6 | Remaining dungeons | One dungeon about every 3–4 weeks: 4 (organizing, builds on the hub), 7 (computational thinking + resources), 1 (effects, AI habits), 6 (communication), 3 (digital environment), 5 (collaboration, after a design spike) | May–Aug 2027 |
| M7 | Pilot release 2027-28 | All seven areas, full teacher guide, French (if chosen) | Before Sept 2027 |

Each milestone ends with: a merged pull request, GitHub Pages updated, the local folder in sync, and the Artifact updated.

---

## 8. Workflow: GitHub, Pages, local backup, Artifact

1. **Branches and pull requests.** Each piece of work happens on its own branch and arrives as a pull request into `main`, so Stuart can see every change before it goes live. (**DECIDE**: or push straight to `main` for speed. The project instructions allow automatic pushes; PRs just add a review point.)
2. **GitHub Pages** deploys from `main`, root folder (Settings → Pages → "Deploy from a branch" → `main` / `(root)`). The live link will be `https://stuart-gray.github.io/Digital-Competency-Chronicles/`. No Actions workflow needed. The repo must stay public for free Pages.
3. **Local backup** to `C:\dev\Digital Competency Chronicles`. After every push, the same files are copied to that folder. Right now the folder holds only `README_1.md` and `chat-summary_1.md`. **Recommendation:** make the local folder a git clone of the repo (`git clone` into it once), so it can always be checked against GitHub. Until then I copy files across directly.
4. **Claude Artifact.** One Artifact holds the current playable build. After each meaningful change I republish the same Artifact (same link, new version) with the game files. It loads Phaser from jsDelivr, so it runs the same code as GitHub Pages.
5. **Checks before each push:** the content validator passes, and a headless-browser smoke test loads the game, walks into the hub and opens one puzzle with no errors in the console.

---

## 9. Decisions for Stuart

Needed **before M1** (they shape the code):

1. **Bilingual scope.** Recommended: build with `{en, fr}` text from day one (already in the schema), ship English first, and translate the Dungeon 2 slice before the M4 feedback round to prove the pipeline works.
2. **Placeholder art.** OK to start with CC0 Kenney packs, with final art decided at M4?
3. **Workflow.** Pull requests into `main` (recommended) or direct pushes to `main`?
4. **Local folder.** OK to turn `C:\dev\Digital Competency Chronicles` into a git clone?

Needed **before M2**:

5. **Cycle tiering.** Teacher sets the tier in the teacher corner, Cycle 2 by default (recommended), versus students choosing.
6. **Read-aloud.** Use the browser's built-in voices (free, offline, quality varies by device) versus recorded voice-over later (better, costs time).

Can wait until **M4**:

7. Final title.
8. Final art direction (stay with CC0 art or commission).
9. Pilot classrooms and how teacher feedback is collected (a short form outside the game; nothing collected inside it).

Content questions to settle with the Ministry documents:

10. The 2026 DCF dimension names and the Appendix 1 area-to-dimension mapping (including where dimension 4, information literacy, fits).
