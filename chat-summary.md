# Background: how this project started (summary of the kickoff chat, Nov 5, 2026)

## Context
Stuart is part of a network of educational technology consultants working with the English school boards in Quebec. This year the network is tasked with supporting the rollout of the Ministry's **Content for Developing Digital Competency** (elementary). The goal is concrete resources and tools teachers can incorporate directly into their classrooms at specific grade levels and subject areas.

Current state in schools: the Digital Competency Framework (DCF) exists but is not directly integrated or assessed in most Quebec classrooms. The only place with direct reference is the Culture and Citizenship in Quebec (CCQ) program.

## What we confirmed from the Ministry documents
- Rollout timeline: optional 2026-27 and 2027-28, compulsory from 2028-29. Secondary content arrives for 2027-28, also compulsory 2028-29.
- The content is based on the DCF (2019, updated 2026 after consultations with 100+ specialists). AI is treated as intrinsic to digital competency.
- Not organized by cycle, deliberately, so schools and boards decide distribution. Ministry recommends cycle teams plan together.
- Not a subject and not evaluated. Feedback only, through "simple mechanisms": observation, spontaneous questions, brief student discussion.
- Ministry's own integration model: (1) take stock of what's already in place; (2) check whether an existing activity can cover it with "a simple adjustment" (a reflection question, discussion, brief observation); (3) choose a targeted activity; (4) build a new learning situation modelled on an existing one.
- Levers named: the Broad Areas of Learning, CCQ (explicit), the updated Français program (explicit, compulsory 2027-28), other subjects implicit.
- Board responsibilities (Education Act s. 461): inform/train staff, clarify roles, set a timeline, advise school teams, set up support and follow-up, monitor planning, support materials development.
- Structure: 7 content sheets, 14 elements. See README section 4 for the full list.

## Ideas explored
1. **Integration cards** (first idea): one page per unit pairing a DC element with an existing subject unit and a simple observable success criterion. Still worth building alongside the game.
2. **A retro video game** (chosen direction): students explore the seven content areas through play.
   - Styles considered: top-down Zelda (chosen), Pokémon-style gyms/badges, EarthBound-style town adventure.
   - Why Zelda won: seven content areas map cleanly to seven dungeons/regions; the sheets' student applications translate directly into puzzles.
   - Hub "digital village" for hands-on skills (hardware, files, troubleshooting); dungeons for bigger ideas (privacy, algorithms, footprint, collaboration).
   - First slice: title → hub → Dungeon 2 (Digital Identity).

## Decisions made
- Browser-based so it runs on Chromebooks, Windows laptops and iPads across boards.
- Phaser 3 engine (CDN, no build step to start), Tiled for maps.
- Public GitHub repo with GitHub Pages hosting to start.
- Local-storage saves for now; sign-in for cross-device progress is a future option, not a current requirement.
- Content stored as plain JSON data files so consultants and teachers can contribute without editing engine code.
- Pilot possibly this school year, definitely next.
- Title shortlisted to three candidates; final decision deferred until teacher and student feedback:
  - *The Digital Competency Chronicles*
  - *Legend of the 12 Dimensions*
  - *Rise of the Digital Citizen*

## Immediate next steps
- Create the GitHub repo and apply the layout in README section 6.
- Scaffold the first playable slice (hub + Dungeon 2).
- Start the content-mapping crosswalk (element ↔ dungeon ↔ puzzle).
- Draft the teacher guide skeleton.
