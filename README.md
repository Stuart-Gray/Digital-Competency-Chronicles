# The Digital Competency Chronicles (working title)

A browser-based, top-down retro adventure game (Zelda-style) that guides Quebec elementary students through the Ministry of Education's **Content for Developing Digital Competency** (2026). Built by and for the English school boards' educational technology consultant network.

**Title candidates** (final choice to be made with teacher and student feedback):

- *The Digital Competency Chronicles*
- *Legend of the 12 Dimensions*
- *Rise of the Digital Citizen*

## Play it

- **Live game:** https://stuart-gray.github.io/Digital-Competency-Chronicles/
- **Content checker:** https://stuart-gray.github.io/Digital-Competency-Chronicles/tools/validate.html

**Status (6 Nov 2026): milestone 2, the Dungeon 2 slice.** Title → village → Dungeon 2 is playable from start to finish in English and French, for Cycle 2 and Cycle 3.

- **The village:** four people whose lines follow the player's progress, Théo's Fix-it shop (4b), seven gates (the purple one opens), and a village that grows (a garden, Théo's shop opens) when the Digital Identity Badge comes home.
- **Dungeon 2, the Temple of Traces** (sheet 2: 2a, 2b, 2c): Lumi gives the **Lantern of Traces**, which lights the dark temple and reveals hidden traces. Three wings (Hall of Traces, Vault of Keys, Window Gallery), each with three puzzles from the sheet's student applications, a world puzzle (a hidden door, three key stones) and a chest with a badge piece; then the Mask Merchant's three tricks in the final room. Every puzzle is written twice, for Cycle 2 and Cycle 3. See [docs/content-mapping.md](docs/content-mapping.md).
- **Puzzle types:** choice, sequence, sort, match, spot (find clues in a picture) and predict (watch a scene, choose what happens next). No scores: a wrong try gives a hint, and hints are counted quietly for the teacher view.
- **Engine:** cycle choice, five save slots, saves and resumes anywhere (including inside the dungeon), journal with items, badge pieces and achievements, keyboard and touch, real HTML text for Read&Write and screen readers.

Next is milestone 3: the teacher corner and dashboard, the teacher guide for area 2, and testing on Chromebooks, Windows and iPads. The full plan is in [docs/build-plan.md](docs/build-plan.md).

### For developers and content editors

- No build step. Serve the folder with any static server (for example `npx http-server .` or `python3 -m http.server`) and open `http://localhost:8080/`. Opening `index.html` straight from disk does not work because browsers block loading the JSON files that way.
- Words, dialogue and puzzles live in [`content/`](content/). The format is explained in [docs/content-schema.md](docs/content-schema.md).
- Check content: `node tools/validate.mjs` (also runs on every push before GitHub Pages publishes) or open `tools/validate.html`.
- Smoke test: `npm install --no-save playwright` once, then `node tests/smoke.mjs`.
- Single-file preview build (used for the Claude Artifact copy): `node tools/build-artifact.mjs`.
- Placeholder art is drawn by `tools/art/make_placeholder_art.py` (village, characters) and `tools/art/make_dungeon_art.py` (dungeon tiles, icons, puzzle pictures). Maps are Tiled files in `maps/` (`hub.tmj`, `area2.tmj`), first built by `tools/art/make_hub_map.py` and `tools/art/make_area2_map.py`. Asset sources: [assets/CREDITS.md](assets/CREDITS.md).
- Licences: code under MIT ([LICENSE](LICENSE)); content and docs under CC BY 4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).

> Sections 5 to 7 below are the original kickoff notes. Where they differ from [docs/build-plan.md](docs/build-plan.md), the build plan wins.

---

## 1. Project purpose

- Give teachers a concrete, drop-in tool for conveying the Ministry's seven elementary content areas, which become **compulsory in 2028-2029** (optional in 2026-27 and 2027-28).
- Make the 12 dimensions of the Digital Competency Framework (DCF) tangible for students through play.
- Pilot with students possibly in 2026-27, definitely in 2027-28, across multiple boards.
- Let consultants and teachers contribute content (dialogue, puzzles, scenarios) without touching engine code.

## 2. Official sources

- Content page (EN): https://www.quebec.ca/en/education/digital-technology/content-developing-digital-competency
- Presentation document (PDF): https://cdn-contenu.quebec.ca/cdn-contenu/education/Numerique/contenus_competence_numerique_doc_pres_primaire_AN.pdf
- Sheets 1–7 (PDF): same CDN path, `contenus_competence_numerique_fiche{1-7}_primaire_AN.pdf`
- Digital Competency Framework (2026 update): https://www.quebec.ca/en/education/digital-technology/digital-competency-framework
- École ouverte DC resources (planning template, visuals): https://ecoleouverte.ca/en/digital-competency

## 3. Key constraints from the Ministry documents

| Point | Implication for the game |
|---|---|
| Content is **not a subject and is not evaluated**; feedback only | No grades or scores that feel like marks. Use badges, progress, in-game feedback. |
| "Simple mechanisms" to confirm content was presented and understood: observation, spontaneous questions, brief discussion | Build teacher-facing look-fors and reflection prompts, not rubrics. |
| Deliberately **not organized by cycle**; schools/boards distribute | Game can offer a suggested Cycle 1/2/3 progression (e.g. difficulty tiers per dungeon). |
| Integrate via "a simple adjustment" to existing activities; BALs and CCQ are the main levers | Keep play sessions short (10–15 min chunks) so they fit inside existing lessons. |
| AI is intrinsic to digital competency, not separate | Weave AI (GenAI images, recommendation algorithms) into relevant dungeons rather than a separate area. |
| Boards must train staff, set timelines, support materials (Education Act s. 461) | Ship a teacher guide alongside the game. |

## 4. The seven content areas → 14 elements

Each element in the sheets has: knowledge ("students come to understand"), skills ("students develop their ability to"), example student applications, and questions to consider before introducing it.

1. **Understanding the effects of using digital technology** (D1 Ethical citizenship, D11 Critical thinking)
   - 1a Recognize the social impacts of digital technology
   - 1b Recognize the environmental impacts (device life cycle, materials, energy, e-waste)
   - 1c Understand the factors that influence digital habits (notifications, algorithms, AI, screen-time balance)
2. **Understanding digital identity** (D1, D11)
   - 2a Understand digital identity (traces, persistence, how others perceive you)
   - 2b Understand personal information (identifiers, sensitivity, strong vs weak passwords, suspicious requests)
   - 2c Understand online privacy protection (what to share, clues in images, camera/mic, access requests)
3. **Understanding one's digital environment** (D2 Technological skills, D3 Digital for learning, D8 Diverse needs)
   - 3a Understand digital tools and hardware components
   - 3b Understand basic features of digital tools (interface, saving, AI features, assistive tech like text-to-speech and dictation)
4. **Getting organized with digital technology** (D2, D9 Personal/professional empowerment)
   - 4a Develop organizational skills (file naming, folders, routines, lock/shut down)
   - 4b Apply troubleshooting strategies (self → help menu → peer → teacher)
5. **Learning to collaborate using digital technology** (D5 Collaboration)
   - 5a Use a digital tool to interact and co-create (shared docs, concept maps, comments, co-created video)
6. **Communicating using digital technology** (D6 Communication)
   - 6a Explore digital communication channels (1:1 vs group, email features, multimodal, audience)
   - 6b Understand the impact of digital behaviours (consent, footprint, verify recipient, recorded conversations)
7. **Using available digital resources** (D7 Content production, D10 Problem solving, D12 Creativity/innovation)
   - 7a Integrate multimodal elements into a production (libraries, keyword search, citation, usage rights)
   - 7b Get started with computational thinking (instruction sequences, debugging, unplugged first)

## 5. Game design (decisions so far)

- **Style:** top-down 2D retro (16-bit, *Zelda: A Link to the Past* feel). Alternatives considered and set aside: Pokémon-style gyms/badges; EarthBound-style town adventure.
- **Structure:** a hub "digital village" + seven regions/dungeons, one per content area. Overworld tasks cover hands-on skills (hardware, file organizing, troubleshooting); dungeons handle the bigger ideas (privacy, algorithms, footprint, collaboration).
- **Puzzles map to the sheets' student applications**, e.g. find the personal information hidden in a picture; predict what happens after a post is deleted; fix the wrong step in an instruction sequence; choose the right channel for a message.
- **Progress:** badges/pieces collected per area (feedback, not evaluation). Suggested Cycle 1/2/3 tiers.
- **First playable slice:** title screen → hub village → Dungeon 2 (Digital Identity), chosen because its content is the most visual.
- **Teacher layer (later):** reflection prompts and look-fors per dungeon, printable or in-game.

## 6. Technical decisions

- **Browser-based** (Chromebooks, Windows laptops, iPads across boards). No installs.
- **Engine:** Phaser 3 (2D, tilemaps, sprites, touch input). Load from CDN initially; no build step.
- **Maps:** Tiled (`.tmj`/`.json`) so non-coders can design rooms.
- **Hosting:** public GitHub repo + GitHub Pages to start; other hosting later if needed.
- **Saves:** browser `localStorage` for now (simple, privacy-friendly). Sign-in for cross-device progress parked as a future option.
- **Music:** original chiptune songs played by the browser's Web Audio API from note data in `content/music.json` (no audio files, no licence questions). On/off and volume in Settings.
- **Content as data:** each area's dialogue/puzzles live in plain JSON under `/content/` so consultants and teachers can contribute without editing engine code.

### Proposed repo layout

```
/index.html
/src/
  main.js            # Phaser config, scene registry
  scenes/
    Boot.js
    Title.js
    Hub.js           # digital village
    Dungeon2.js      # digital identity (first slice)
  systems/
    save.js          # localStorage wrapper
    dialogue.js
    puzzle.js
/content/
  area1.json … area7.json   # dialogue, puzzles, badges per content area
/assets/
  tiles/  sprites/  audio/
/maps/                       # Tiled exports
/docs/
  teacher-guide.md
  content-mapping.md         # element ↔ dungeon ↔ puzzle crosswalk
README.md
LICENSE                      # suggest MIT for code, CC BY for content
```

## 7. Open questions / next steps

- Pick the final title from the three candidates above, using teacher and student feedback.
- Confirm art direction and licensing for tiles/sprites (free packs vs commissioned).
- Decide on French/English bilingual support from the start (likely yes).
- Define the Cycle 1/2/3 tiering per dungeon.
- Build the first playable slice (hub + Dungeon 2).
- Draft the teacher guide skeleton.
- Identify pilot classrooms and a feedback loop.
