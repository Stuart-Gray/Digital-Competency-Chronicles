# Build plan: The Digital Competency Chronicles

Status: **draft v2, for discussion** (6 November 2026). Nothing is built yet. Items marked **DECIDE** need Stuart's call before the related work starts. v2 folds in Stuart's feedback of 6 November (cycle selection, save slots, Area 5, achievements, Read&Write, variety, teacher dashboard) and the full set of Ministry PDFs.

---

## 1. Sources of truth for content

The official Ministry PDFs (English and French) live in `C:\dev\Digital Competency Chronicles\Digital Competency documents\`. They are the basis for everything the game says and asks.

- **Primary drivers:** the seven *Content for Developing Digital Competency* sheets (elementary). Every puzzle, dialogue theme and badge traces back to a sheet: its knowledge ("students come to understand"), skills ("students develop their ability to") and *examples of student applications*.
- **Referral document:** the *Digital Competency Framework* (2026 update) for the 12 dimensions and the wider meaning of each competency.
- The presentation document gives the rules of the game: content is not a subject, is not evaluated, feedback through observation, spontaneous questions and discussion; not organized by cycle; AI is intrinsic, not separate.

**Confirmed from the DCF PDF, the 12 dimensions:**

| | Dimension | | Dimension |
|---|---|---|---|
| D1 | Exercising ethical citizenship in the digital age | D7 | Producing content using digital technology |
| D2 | Developing and mobilizing technological skills | D8 | Using digital tools to address diverse needs |
| D3 | Harnessing the potential of digital resources for learning | D9 | Mobilizing digital technology for personal and professional empowerment |
| D4 | Developing and mobilizing information literacy in the digital age | D10 | Solving various problems using digital technology |
| D5 | Collaborating using digital technology | D11 | Developing critical thinking with regard to the use of digital technology |
| D6 | Communicating using digital technology | D12 | Adopting a creative and innovative approach to the use of digital technology |

**Confirmed from the sheets, area to dimension mapping:** 1 → D1, D11 · 2 → D1, D11 · 3 → D2, D3, D8 · 4 → D2, D9 · 5 → D5 · 6 → D6 · 7 → D7, D10, D12. D4 (information literacy) is not targeted by any elementary sheet. The game will therefore not claim to cover D4; the hub can give it a light nod (keyword search in 7a) without presenting it as covered.

**Element codes.** The sheets name elements but do not number them. We use `1a 1b 1c 2a 2b 2c 3a 3b 4a 4b 5a 6a 6b 7a 7b` in sheet order. `docs/content-mapping.md` records the exact Ministry title for each code.

**Copyright note.** The PDFs are Gouvernement du Québec documents. They stay in the local folder and out of the public GitHub repo (`.gitignore` excludes `Digital Competency documents/`). The repo links to the official URLs instead. Puzzles paraphrase the sheets in kid language and cite the element; they do not reproduce the sheets.

---

## 2. Review findings (updated)

1. **The GitHub repo was empty** before this plan. It now holds README, the kickoff summary and this plan on branch `claude/project-thread-p7vvs5`. No `main` yet, no Pages site yet.
2. **Sheet 2 matches the README** and the Dungeon 2 design in section 6.
3. **DCF names and the area-to-dimension mapping are now confirmed** (section 1). The README's mapping was right; D4 is the one dimension with no elementary content.
4. **Audience is now Cycle 2 and Cycle 3** (Grades 3 to 6). Cycle 1 is out of scope for this iteration, which removes the pre-reader problem. Read-aloud stays in for accessibility, not as a core requirement.
5. **Area 5 (collaboration)** gets a co-creation puzzle with NPC teammates (section 5.4).
6. **Teacher dashboard** is the one new feature that pushes on the privacy rule. Section 7 proposes a way to do it with no server and no accounts.

---

## 3. Guiding rules

Every feature is checked against these before it is built:

- No grades, scores, marks or timers that punish. Progress is shown as achievements, badges, pieces and rewards in the style of a classic adventure game. Wrong answers lead to a hint and another try, never a penalty.
- Teacher layer = reflection prompts, look-fors and a progress view framed as strengths and next steps. No rubrics, no levels, no percentages.
- AI is woven into the areas where the sheets put it: 1a (discussing a GenAI image), 1c (recommendation algorithms, notifications), 3b (AI features in tools). It is not a separate area.
- Every puzzle cites its element and quotes the sheet application it comes from.
- Content and language fit the chosen cycle (Cycle 2: Grades 3 and 4; Cycle 3: Grades 5 and 6). Nothing is shown to a student that was not written for their tier.
- Privacy first: no accounts, no analytics, no network calls except loading the game. Saves in `localStorage` only. The only personal data is an optional first name, stored on the device and clearable by the teacher.
- Every player-facing string lives in `/content`, as `{en, fr}` objects. None in engine code.
- Static files only, runs from GitHub Pages, Phaser from a CDN, no build step.
- Sessions fit 10 to 15 minutes: every room is a stopping point, the game auto-saves and resumes exactly where the student left off.
- Short sentences, plain language, written for the age group.
- Genre is "top-down adventure in the 16-bit style". We do not copy names, characters, art, music or maps from any existing game.

---

## 4. Architecture

### 4.1 Runtime

- **Phaser 3**, pinned to an exact version from jsDelivr, loaded by a `<script>` tag. No bundler, no npm needed to play.
- **Pixel-art canvas** at 320×180 internal resolution, 16×16 tiles, scaled with `Phaser.Scale.FIT`.
- **HTML text layer over the canvas (new, for Read&Write).** Dialogue, puzzle prompts, choices and menus are rendered as real HTML elements positioned over the game canvas, styled to match the pixel look, not drawn into the canvas. This is what makes the text work with Read&Write's text-to-speech and hover-to-read, with screen readers (ARIA live region for dialogue), with browser zoom and with the Screenshot Reader as a fallback. It also makes touch targets and large-text mode easy. Only the world (map, sprites) is canvas.
- **Input:** keyboard (arrows/WASD + Space/Enter/Esc), plus an on-screen D-pad and action button on touch devices. Puzzles are tap/click-first.
- **Performance target:** smooth on a low-end Chromebook and an older iPad in Safari.

### 4.2 Folder layout

```
/index.html                 the game
/teacher.html               the teacher dashboard (see section 7)
/src/
  main.js                   Phaser config, scene list
  scenes/
    Boot.js, Preload.js
    Title.js                title, cycle select, save slots, settings
    Hub.js                  the digital village
    Dungeon.js              one generic, data-driven dungeon scene
    UI.js                   HUD and touch controls (canvas side)
    Journal.js              achievements, badges, pieces, items
  systems/
    save.js                 localStorage wrapper, versioned, 5 slots
    i18n.js                 picks en/fr text, applies tier filter
    content.js              loads and checks content JSON
    dialogue.js             dialogue trees, drives the HTML text layer
    puzzle.js               puzzle-type registry
    mechanics.js            world mechanics (switches, keys, blocks, lanterns)
    achievements.js         unlock rules, reward fanfare
    progress.js             progress summary + export code (teacher layer)
    input.js                keyboard + touch
    speech.js               read-aloud via speechSynthesis
  ui/
    textLayer.js            the HTML overlay: dialogue box, choices, puzzle panels
/content/
  ui.json                   menus, buttons, settings, achievement names
  hub.json                  village NPCs and hub tasks
  area1.json ... area7.json
/maps/                      Tiled exports (.tmj)
/assets/{tiles,sprites,audio,fonts}/
/assets/CREDITS.md          source + licence for every asset
/tools/validate.html        content checker, opens in a browser
/tests/smoke.spec.js        headless browser check (dev only)
/docs/
  build-plan.md, content-schema.md, content-mapping.md, teacher-guide.md
LICENSE (MIT, code)   LICENSE-CONTENT.md (CC BY 4.0, content + docs)
.gitignore                  excludes the Ministry PDFs folder
```

One generic `Dungeon.js` means dungeons 1 and 3 to 7 are mostly content and map work.

### 4.3 Cycle selection and tiers

- The title screen asks **"Which cycle are you in?"** with two big buttons: *Cycle 2 (Grades 3 and 4)* and *Cycle 3 (Grades 5 and 6)*. The choice is saved with the slot, and can be changed from the slot menu or the teacher corner.
- Tier ids are strings so secondary can be added next year without renumbering: `"E2"`, `"E3"` now; `"S1"`, `"S2"`, `"S3"` later. Every piece of content declares which tiers it is for.
- **What the tier changes:** sentence length and vocabulary, the scenarios and examples (for example, Cycle 3 gets group chats, online games with strangers, sharing a friend's photo; Cycle 2 gets classroom tablets, family photos, a class message board), the number of items per puzzle, and how much the hint gives away.
- **How content is written per tier:** a puzzle or dialogue line either applies to both tiers (`"tiers": ["E2","E3"]`) or exists as two entries sharing a `family` id. The loader picks the entry for the active tier. Editors therefore write Cycle 2 and Cycle 3 versions side by side in the same file, which keeps them aligned with the same sheet application.
- A content checklist in `content-schema.md` sets the language targets per tier (reading level, sentence length, words to avoid) so consultants write consistently.

### 4.4 Saves

- Up to **five slots per device**, each with an avatar and an **optional first name** (max 12 characters, letters only). The slot screen shows avatar + name + how far they got, so returning students find themselves quickly. "Skip" leaves the name blank.
- A slot holds: name, avatar, tier, language, current location, puzzles completed, hints used, achievements, items, timestamps of play sessions (for the teacher view). Nothing else.
- Auto-save on every room change and every puzzle result. "Continue" resumes at the exact spot.
- Versioned keys (`dcc.v1.slotN`) so later versions can migrate.
- Teacher corner can clear one slot or all slots on the device. If `localStorage` is blocked, the game still plays and says progress will not be kept.

### 4.5 Accessibility

- All text in the HTML layer (4.1), so Read&Write, screen readers and browser zoom work.
- Built-in read-aloud toggle (browser voices) as a fallback where Read&Write is not installed.
- Text speed, large-text mode, high-contrast dialogue box, no time pressure, no fail state, colour never the only signal, 44 px minimum touch targets.
- Both keyboard and touch can do everything, including puzzles.

---

## 5. Content, puzzles and play

The full field-by-field guide goes in `docs/content-schema.md` (milestone 1). The shape below is what to agree on first.

### 5.1 Text and tiers

```json
"text": { "en": "Strong passwords are long and hard to guess.", "fr": "" },
"tiers": ["E2", "E3"]
```

Empty `fr` falls back to English and is listed by the validator. (**DECIDE**: French at launch, or English first with the structure ready.)

### 5.2 `areaN.json` top level

```json
{
  "schemaVersion": 1,
  "area": 2,
  "title": { "en": "Understanding digital identity", "fr": "" },
  "dcfDimensions": ["D1", "D11"],
  "elements": {
    "2a": { "en": "Understand digital identity", "fr": "" },
    "2b": { "en": "Understand personal information", "fr": "" },
    "2c": { "en": "Understand online privacy protection", "fr": "" }
  },
  "npcs": [], "dialogue": {}, "puzzles": [], "rewards": {}, "teacher": {}
}
```

### 5.3 Dialogue

A small node graph, plain enough to edit by hand:

```json
"keeper_intro": [
  { "speaker": "keeper", "tiers": ["E2","E3"],
    "text": { "en": "Everything you do online leaves a trace.", "fr": "" } },
  { "speaker": "keeper", "text": { "en": "Want to see what yours say?", "fr": "" },
    "choices": [
      { "text": { "en": "Yes!", "fr": "" }, "next": "keeper_yes" },
      { "text": { "en": "Not yet.", "fr": "" }, "next": null }
    ] }
]
```

### 5.4 Puzzle types

Seven data-driven types. Each is one engine template; a puzzle is just data.

| Type | What the player does | Example uses |
|---|---|---|
| `choice` | Pick the best answer from 2 to 4 | Respond to a suspicious request (2b), choose a channel (6a) |
| `sort` | Drag/tap items into 2 or 3 bins | Share or keep private (2c), reduce / reuse / recycle a device (1b) |
| `spot` | Tap the clues hidden in a picture | Personal info in a photo (2c), parts of a device (3a) |
| `sequence` | Put steps in order, or find the wrong step | Instruction sequences and debugging (7b), the help ladder (4b) |
| `match` | Pair items from two lists | Trace to what it reveals (2a), file to folder (4a) |
| `predict` | Watch a short scene, choose what happens next | A deleted post still exists (2a), a notification pulls you back (1c) |
| `cocreate` | Build something with NPC teammates: each teammate proposes a piece, the player adds, comments or suggests an improvement, and the team adapts | Co-write a story, build a concept map, plan a short video (5a) |

`cocreate` is the Area 5 answer: a turn-based team activity in a single-player game. Teammates have personalities (one rushes, one forgets to save, one talks over others), so the puzzle also covers respectful interaction and giving feedback in a shared space, straight from the sheet's "use a digital comment feature to suggest improvements".

### 5.5 Variety: the anti-repetition rules

A puzzle type is a verb, not a level. To keep the game feeling like a game:

1. **No two content puzzles in a row use the same type.** The validator warns if a dungeon breaks this.
2. **Every dungeon introduces one signature mechanic** that only makes sense there, built on `mechanics.js` and used in both the world and the puzzles. Examples: Dungeon 2's *Lantern of Traces* reveals glowing footprints and hidden clues; Dungeon 7's *Command Scroll* programs a little helper robot to walk a grid; Dungeon 1's *Notification Bells* ring to pull you off your path until you silence them; Dungeon 4's *Sorting Chests* only open when files are named well.
3. **World puzzles between content puzzles:** switches, keys, pushable blocks, locked doors, hidden passages. These carry no content (no element) and exist purely for pacing and fun. They use the signature item.
4. **Mini-games where the sheet invites it:** 7b as a grid-walking robot you program; 1c as a "resist the feed" scene; 6a as composing a message from parts.
5. **Boss as a conversation duel, not a fight.** The final room of each dungeon is a character who tries the tricks from that area (the Mask Merchant in Dungeon 2). The player answers with what they learned.
6. **Set dressing changes with each wing** (lighting, music, tileset accents) so wings feel like places, not screens.

### 5.6 A puzzle in data

```json
{
  "id": "d2_password_forge",
  "family": "d2_passwords",
  "tiers": ["E3"],
  "element": "2b",
  "type": "sort",
  "application": "Compare an easy-to-guess password with a harder-to-guess password for protecting personal information.",
  "prompt": { "en": "Which passwords are strong? Put them in the right chest.", "fr": "" },
  "bins": [
    { "id": "strong", "label": { "en": "Strong", "fr": "" } },
    { "id": "weak",   "label": { "en": "Easy to guess", "fr": "" } }
  ],
  "items": [
    { "id": "p1", "label": { "en": "1234", "fr": "" }, "bin": "weak",
      "hint": { "en": "Lots of people use this one.", "fr": "" } },
    { "id": "p2", "label": { "en": "PurpleTiger!Jumps7", "fr": "" }, "bin": "strong" }
  ],
  "success": { "en": "You forged a strong lock!", "fr": "" },
  "reward": { "piece": "d2_piece_2" },
  "teacherNote": { "en": "Ask: what makes a password hard to guess?", "fr": "" }
}
```

- `element` and `application` are required; the validator rejects a puzzle without them.
- Wrong answers show the item's `hint` and let the player try again. Hints used are recorded quietly for the teacher view, never shown as a score.

### 5.7 Achievements and rewards

Progress feels like a classic adventure, without ever reading as a mark:

- **Pieces and badges.** Each wing of a dungeon awards a badge piece; all pieces plus the final room award the area badge, with a chest-opening fanfare.
- **Key items** (the signature mechanic of each dungeon) stay with the player and open shortcuts in the village and in other dungeons.
- **The village grows.** Each badge restores a part of the hub: a shop opens, a bridge is repaired, a new NPC moves in. Returning players see what they have changed.
- **Achievement list** in the Journal for things like finishing a wing without a hint, finding every hidden clue, visiting every NPC, finishing a dungeon on both tiers. Achievements are positive and optional; the Journal never shows what was *not* done.
- **Cosmetic rewards:** avatar hats and colours, a house that fills with trophies.
- Nothing is lost, ever. No lives, no hearts, no "game over".

### 5.8 Teacher content in each area

```json
"teacher": {
  "before": [ { "en": "What is something you've seen people share online?", "fr": "" } ],
  "after":  [ { "en": "What is one thing you would never share? Why?", "fr": "" } ],
  "lookFors": {
    "2a": [ { "en": "Explains that a deleted post may still exist somewhere.", "fr": "" } ],
    "2b": [ { "en": "Says they would ask an adult before answering a request for personal information.", "fr": "" } ],
    "2c": [ { "en": "Points out details in a photo that could show where someone lives.", "fr": "" } ]
  }
}
```

---

## 6. First playable slice: Title → Hub → Dungeon 2

Room and NPC names are placeholders until the art direction is set.

### 6.1 Title
Title, *Play* (five avatar slots with optional first name, cycle selection on a new slot), *Settings* (language, read-aloud, text speed, large text), *Teacher corner* (press-and-hold to open; tier override, prompts and look-fors, progress view, export, clear saves).

### 6.2 Hub: the digital village
Small for the slice: the player's house, a few NPCs, the gate to Dungeon 2 open, six gates visibly closed. One hub task shows the hands-on side:
- **Fix-it shop (4b):** an NPC's tablet won't respond. Put the help steps in order: try to find the problem yourself, check the Help section, ask a peer, ask the teacher (`sequence`). Reward: the shop stays open and sells a cosmetic.

### 6.3 Dungeon 2: Digital identity
Signature item: the **Lantern of Traces**. Three wings, one per element, world puzzles between, and a final room. One wing per 10 to 15 minute session.

| Wing | Puzzle | Type | Element | Sheet application |
|---|---|---|---|---|
| Hall of Traces | Light the lantern: glowing footprints show what each online action (post, like, comment, photo) reveals about a person | `match` | 2a | Recognize situations where an online action reveals information about a person, even unintentionally |
| | World puzzle: use the lantern to find the hidden door | — | — | — |
| | The vanishing post: a post is "deleted"… where can copies still be? | `predict` | 2a | Explain what can happen after they post something, even if they delete it later |
| | Pick a profile picture that protects you | `choice` | 2a | Choose an image that doesn't show their face or create an avatar |
| Vault of Keys | Is it personal information? (name, birthday, favourite colour, address, photo) | `sort` | 2b | Identify what constitutes personal information and decide whether it can be shared |
| | Password forge: strong or easy to guess (Cycle 3) / Which lock is harder to pick? (Cycle 2) | `sort` / `choice` | 2b | Compare an easy-to-guess password with a harder-to-guess password |
| | A stranger in the game chat asks for your address. What do you do? | `choice` | 2b | Recognize messages or requests seeking personal information and explain what to do |
| | World puzzle: three keys, three locks, in the right order | — | — | — |
| Window Gallery | Find the clues in the photo (house number, school logo, street sign). Cycle 3 adds an AI-filtered photo that still shows a clue | `spot` | 2c | Identify elements in an image that reveal personal information |
| | An app asks for camera, microphone, location: allow, deny, or ask for help? | `sort` | 2c | Recognize access requests and determine whether access should be granted or whether to ask for help |
| | The camera light is on in the classroom scene: leave it on or not? | `predict` | 2c | Recognize when a camera and microphone are active |
| Final room | The Mask Merchant tries every trick from the three wings | `choice` chain | 2a–2c | Review |

Cycle 2 sees fewer items per puzzle, more pictures, and scenarios set at school and at home. Cycle 3 gets group chats, online games, sharing a friend's information without permission (2b "explain what can happen… if personal information is shared without permission"), and the AI-filtered photo.

---

## 7. Teacher layer and dashboard

Goal: teachers can see progress and areas of strength and growth for their class, and print or export it, while the game keeps no accounts and sends nothing anywhere.

**Proposal: progress codes and a teacher page.**

1. **In the game**, the teacher corner on any device shows every save slot on that device: name, avatar, tier, areas visited, wings and badges done, hints used per element, last played. It can print this page.
2. **Export.** From the Journal, a student (or teacher) taps *Share with my teacher*. The game builds a short **progress code** (a compact string that encodes the slot's progress, about 40 to 60 characters) and shows it big on screen with a QR code. It can also be copied or downloaded as a small text file. The code contains the first name and progress only.
3. **`teacher.html`** on the same GitHub Pages site is the dashboard. The teacher pastes codes, scans QR codes with the device camera, or opens the text files. The page builds a **class view**: one row per student, one column per element, with cells showing *not yet · explored · completed · completed without hints*. Clicking an element shows the look-fors and reflection prompts for it. The page can **print** or **export CSV**. The data lives only in that browser tab (optionally saved in the teacher's own `localStorage`, cleared with one button).
4. **Framing.** The dashboard uses the Ministry's own feedback language. Columns are elements, not scores. "Areas to talk about" lists elements where hints were used a lot, paired with the matching look-fors and a prompt for a brief discussion. No totals, no percentages, no ranking.

This keeps the privacy rule intact (nothing leaves the device without the student or teacher doing it, and even then it is a code the teacher types into a static page). **DECIDE**: is first name + per-element progress + hints the right amount of detail, and is the code/QR approach acceptable to the boards?

---

## 8. Art, audio and licensing

- Start with CC0 placeholder art (Kenney 16×16 town and dungeon packs are CC0) so we can build and playtest without licence worries. Avoid share-alike packs. Never use ripped or "inspired-by" assets from commercial games.
- Open-licence (OFL) readable font for dialogue; pixel font only for titles.
- CC0 chiptune loops and sound effects we generate ourselves. Gentle sounds; nothing that signals failure.
- Every asset gets a line in `/assets/CREDITS.md`.
- After the teacher review, decide whether to commission a custom tileset and characters under CC BY.

---

## 9. Milestones

The focus is one high-quality slice, then teacher review, then the rest.

| # | Milestone | Delivers | Target |
|---|---|---|---|
| M0 | Foundations | This plan, licences, `.gitignore`, docs skeleton, `main` branch, GitHub Pages on, local folder in sync | Mid-Nov 2026 |
| M1 | Engine skeleton | Boot/Title/Hub with placeholder art, cycle select, 5 save slots with names, keyboard + touch, HTML text layer with read-aloud, en/fr loader with tier filter, content validator, smoke test, first Artifact build | End of Nov 2026 |
| M2 | Dungeon 2 slice | Lantern mechanic, three wings, world puzzles, final room, both tiers, pieces and badge, village-grows reward, hub fix-it task, `content-mapping.md` for area 2 | Mid-Jan 2027 |
| M3 | Teacher layer + polish | Teacher corner, progress codes, `teacher.html` class view with print/CSV, `teacher-guide.md` for area 2, accessibility pass with Read&Write, tests on Chromebook / Windows / iPad Safari | Mid-Feb 2027 |
| M4 | Teacher review | Network and a few teachers play the slice; gather feedback on layout, style, interface and language; decide title, art direction, French scope; revise | Mar 2027 |
| M5 | Remaining dungeons | After revisions, one dungeon every 3 to 4 weeks: 4, 7, 1, 6, 3, 5 | Apr–Sept 2027 |
| M6 | Pilot release 2027-28 | All seven areas, full teacher guide, French if chosen; secondary tiers slot in when the secondary sheets arrive | Autumn 2027 |

Each milestone ends with: a merged pull request, GitHub Pages updated, the local folder in sync, the Artifact updated.

---

## 10. Workflow

1. **Branches and pull requests** into `main`, so every change is visible before it goes live. (**DECIDE**: or direct pushes to `main`.)
2. **GitHub Pages** from `main`, root folder. Live link: `https://stuart-gray.github.io/Digital-Competency-Chronicles/`. The repo stays public.
3. **Local backup** to `C:\dev\Digital Competency Chronicles`. Recommended: make the folder a git clone so it can always be checked against GitHub; the Ministry PDF folder is git-ignored and stays local. Until then files are copied across after each push. (**DECIDE**)
4. **Claude Artifact:** one Artifact, republished (same link, new version) after each meaningful change.
5. **Before each push:** the content validator passes, and a headless-browser smoke test loads the game, selects a cycle, walks into the hub and opens a puzzle with no console errors.

---

## 11. Decisions for Stuart

Before M1 (they shape the code):

1. **Bilingual scope.** Recommended: `{en, fr}` fields from day one, ship English first, translate the Dungeon 2 slice before the teacher review.
2. **Placeholder art.** OK to start with CC0 Kenney packs?
3. **Workflow.** Pull requests into `main` (recommended) or direct pushes?
4. **Local folder.** OK to turn `C:\dev\Digital Competency Chronicles` into a git clone (PDFs stay local, git-ignored)?

Before M3:

5. **Teacher dashboard detail and the progress-code approach** (section 7).

At M4:

6. Final title, final art direction, pilot classrooms and how teacher feedback is collected (a short form outside the game).
