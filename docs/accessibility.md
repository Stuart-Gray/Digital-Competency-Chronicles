# Accessibility

What the game does so every student can play, the settings behind it, and how it lines up with
the main game accessibility standards. Teachers: the short version is in
[teacher-guide.md](teacher-guide.md#settings-for-accessibility).

Standards used:

- **GAG**: [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/) (basic,
  intermediate and advanced levels).
- **XAG**: [Xbox Accessibility Guidelines](https://learn.microsoft.com/gaming/accessibility/guidelines)
  (numbers like XAG 101 below).
- **WCAG 2.2**: for the HTML menus, dialogue and puzzle cards, which are a web page laid over the
  game.

## Settings

All settings are in **Settings** (title screen, or **Menu → Settings** during play). They are
saved on the device in `localStorage` (`dcc.v1.settings`) and shared by every save slot on that
device. Words for every option are in `content/ui.json` (`settings.*`) in English and French.

| Setting | Options (default first) | What it does |
|---|---|---|
| Music | On, Off | Original background music. |
| Music volume | Medium, Quiet, Loud | Separate from the read-aloud voice. Music gets quieter while the voice reads. |
| Read aloud | Off, On | Reads each line of dialogue with the device's built-in voice. |
| Voice | Male, Female | Picks the clearest voice of that kind on this device, in English or Quebec French (see below). **Try the voice** plays a sample. |
| Reading speed | Normal, Slow, Fast | How fast the voice reads. |
| Text speed | Normal, Slow, Fast, All at once | How fast dialogue letters appear. *All at once* shows each line straight away. |
| Text size | Normal, Large (125 %), Larger (150 %) | All menus, dialogue and puzzle cards. Cards scroll when the text is big. |
| Letter style | Standard, Dyslexia-friendly | Standard is Atkinson Hyperlegible (made by the Braille Institute for low-vision readers). Dyslexia-friendly is OpenDyslexic with more space between words and lines. |
| High contrast | Off, On | Black, white and yellow everywhere: solid white cards with thick black edges and a yellow outline, black buttons with yellow words, a thick yellow focus ring, no see-through boxes, a sharper and more colourful game picture, a bigger "!" marker, and lighter darkness in the temple so walls and paths can be seen (the lantern still decides which hidden traces show). |
| Reduce motion | Like the device, On, Off | Stops camera shake, screen fades, the drifting title screen, bouncing markers, pop-in animations and shimmering traces. *Like the device* follows the operating system's "reduce motion" setting (Windows: *Show animations* off; ChromeOS: *Reduce animations*; iPad: *Reduce Motion*). |
| Walking | Hold to walk, Press to start and stop | In *Press to start and stop*, one press of an arrow key (or an on-screen arrow) starts walking that way; pressing it again, another arrow, or Space stops. For players who find holding a key hard, and for switch users. |
| Arrow buttons on screen | Off, On | Touch screens only. Tapping where to go always works too. |

### How the read-aloud voice is chosen (`src/systems/voices.js`)

Browsers do not say whether a voice is female or male, and every device has different voices, so
the game keeps a short list of the voices that school devices are known to have, best first:

| Device | English, female | English, male | French, female | French, male |
|---|---|---|---|---|
| Windows 11 (Edge, natural voices) | Clara (Canada) | Liam (Canada) | Sylvie (Quebec) | Antoine or Jean (Quebec) |
| Windows (older voices, Chrome) | Linda (Canada), Zira | Richard (Canada), David, Mark | Caroline (Quebec), Hortense | Claude (Quebec), Paul |
| Chromebook, Chrome | Google US English | Google UK English Male | Google français | *(none built in, see fallback)* |
| iPad | Samantha, Ava, Nicky (Enhanced/Premium first) | Aaron, Evan, Nathan, Daniel | Amélie (Quebec) | Nicolas (Quebec), Thomas |

Rules: Quebec French (`fr-CA`) before France French; Canadian English before US and UK;
"Natural", "Online", "Enhanced" and "Premium" voices before older ones; novelty voices (Bells,
Zarvox, Bad News...) are never used. If a device has no voice of the chosen kind, the game uses its
best voice for that language and makes it a little lower (male) or higher (female), and the
Settings screen says so. Settings also shows the name of the voice in use, which helps when a
teacher wants to install a better one (Windows: *Settings → Time & language → Speech → Add voices*;
iPad: *Settings → Accessibility → Spoken Content → Voices*).

The voice only reads what is on screen. Nothing is sent anywhere by the game. (Edge's natural
voices are Microsoft online voices; on a device without Internet the browser uses its offline
voices instead.)

## Always on (no setting needed)

- **Real web text.** Every word is HTML over the game picture, so Texthelp Read&Write, screen
  readers, browser zoom and translation tools can read it.
- **Look around** (button at the top right, or the **L** key). Lists the people, things and paths
  near the hero, nearest first, with where they are ("up and left, a few steps away"). Picking one
  walks the hero there and talks or looks. It also says where the hero is and which way they face.
  This gives screen-reader users a description of the hero's position, and switch and
  one-button players a way to move without steering.
- **"In front of you"** is read to screen readers whenever something the hero can talk to or look
  at comes into reach (the "!" that sighted players see). "You can't get there from here" is read
  when a tap can't be reached.
- **Three ways to move**, all always on: keyboard (arrows or WASD, Space/Enter/E to talk), tap or
  click where to go, and Look around.
- **No time pressure.** Nothing is timed. Puzzles have no fail state and no score: a wrong try
  shows a hint, and *Leave for now* is always there.
- **Pause anywhere** with Escape or the Menu button. The game saves by itself.
- **Colour is never the only signal.** Hints show a **?**, solved puzzles a **✓**, notes an **i**;
  the selected option in Settings has a **✓**; found clues get a **✓**; steps in the right place are
  numbered with a **✓**; a tap that can't be reached shows a red **X** (not just a red ring); paired
  matches get a number.
- **Toasts** (achievements, items) stay longer with *Slow* text or *Larger* text, stay up while a
  pointer rests on them, wait behind open cards, are read to screen readers, and are kept in the
  journal.
- **Speaker names** on every line of dialogue, and a speech bubble over whoever is talking.
- **Focus** is always visible and stays on the option just chosen in Settings. Arrow keys move
  between buttons in menus and cards. Escape closes cards.
- **Touch targets** are at least 44 by 44 CSS pixels.
- **The avatar maker** works with keyboard, touch and screen readers. Every colour and style is a
  button with a spoken name ("Hair colour: Blue"), the chosen one has a **✓** and its name is
  written beside the row, so colour is never the only clue. Focus starts on *Looks good!* (Enter is
  the quick way through) and stays on the choice just made. Each ready-made hero is described in
  words. The big hero walks on the spot and turns, and stands still when motion is reduced. The
  jokes are read to screen readers. Heroes include eight skin tones, a wheelchair, a hijab, a
  turban and glasses; *Mix it up!* never adds or removes a wheelchair, hijab or turban.
- **No flashing.** Nothing flashes more than once a second.
- **No sound-only information.** The game has music but no sound effects; everything that matters
  is shown as text. (If sound effects are added later, each needs a caption.)

## Checklist against the standards

| Need | Standard | Status |
|---|---|---|
| Text size options | GAG basic, XAG 101, WCAG 1.4.4 | Done: three sizes, plus browser zoom |
| Clear, readable font; dyslexia option | GAG basic/intermediate, XAG 101 | Done: Atkinson Hyperlegible, OpenDyslexic |
| High contrast | GAG intermediate, XAG 102, WCAG 1.4.3/1.4.11 | Done: full high-contrast theme |
| Colour not the only cue | GAG basic, XAG 103, WCAG 1.4.1 | Done: shapes and symbols everywhere |
| Reduce motion, respect the device | GAG intermediate, XAG 117, WCAG 2.3.3 | Done: setting + `prefers-reduced-motion` |
| No flashing | GAG basic, XAG 118, WCAG 2.3.1 | Done |
| Subtitles / speaker names | GAG basic, XAG 104 | Done: all speech is text with names |
| Captions for sound cues | XAG 104/105 | Not needed yet: no sound effects |
| Separate volume controls | GAG basic, XAG 105 | Done: music volume; voice ducks music |
| Text to speech | GAG advanced, XAG 106 | Done: built-in voice with female/male and speed; Read&Write works too |
| Text speed / no auto-advance | GAG basic, WCAG 2.2.1 | Done: four speeds, player advances every line |
| No timed pressure | GAG basic, XAG 116, WCAG 2.2.1 | Done |
| Difficulty and help | GAG basic, XAG 112 | Done: hints on every wrong try; two cycle levels |
| Pause and save anywhere | GAG basic, WCAG 2.2.2 | Done |
| Keyboard only | WCAG 2.1.1, XAG 107, XAG 111 | Done |
| Avoid holding buttons | GAG basic, XAG 107 | Done: *Press to start and stop* walking (the teacher corner's hold button is on purpose) |
| One switch / switch access | GAG advanced, XAG 107 | Done for moving and talking: Look around + Tab/Enter on buttons |
| Dragging alternative | WCAG 2.5.7 | Done: tap to move; drag is never needed |
| Target size | WCAG 2.5.8, GAG basic | Done: 44 px minimum |
| Screen reader | GAG advanced, XAG 106, WCAG 4.1.2 | Done for menus, dialogue, puzzles; hero position via Look around and "in front of you" |
| Focus visible, not hidden | WCAG 2.4.7, 2.4.11 | Done; touch controls hide behind cards |
| Remap controls | GAG intermediate, XAG 107 | Partly: two key sets (arrows and WASD; Space, Enter or E). Full remapping is not built; ask if a student needs it |
| Brightness / dark areas | GAG intermediate | Partly: high contrast lightens the temple's darkness |

## Thinking time and the teacher pages

- Thinking-time cards are real HTML like every other card: buttons with a visible focus, a
  **Read it to me** button, no timer, and **Later** always there. Answers are tapped, never typed.
  The three feelings each have a symbol as well as words.
- The share screen shows the progress code as text (selectable, read by screen readers) as well
  as a QR picture, with **Copy the code** and **Save as a file**, so no single way is required.
- The teacher dashboard (`teacher.html`) uses headings, real tables with row and column headers,
  buttons and native dialogs; every state has a symbol, a colour and its words (the words are
  always in the page for screen readers); it follows the device's light or dark setting and
  prints in black and white.

## For developers

- `src/systems/a11y.js`: `reducedMotion()` and `highContrast()` for scene code. Anything new that
  moves (tweens, shakes, fades, scrolling) must check `reducedMotion()` and keep still when it is
  true.
- `src/systems/voices.js`: the voice list. Add new device voices there, best first.
- CSS: `body.hc` (high contrast), `body.rm` (reduced motion), `body.font-dyslexia`, and
  `--text-scale`. New HTML must work in all of them; check with high contrast and *Larger* text.
- New sound effects need a caption (a toast or a line of text).
- `tests/smoke.mjs` (`SMOKE_ONLY=a11y`) checks the settings, voice choice, toggle walking and
  Look around.
