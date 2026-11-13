// Content checker. Pure JavaScript with no browser or Phaser code, so it runs in
// three places: the game (on load), tools/validate.html (in a browser) and
// tools/validate.mjs (on the command line and in the GitHub Pages workflow).
//
// Errors must be fixed. Warnings are advice (for example two puzzles of the same type in a row).

export const PUZZLE_TYPES = ['choice', 'sort', 'spot', 'sequence', 'match', 'predict', 'cocreate'];
export const KNOWN_TIERS = ['E2', 'E3', 'S1', 'S2', 'S3'];
import { parseLine } from './music.js';

export const ELEMENTS = ['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '4a', '4b', '5a', '6a', '6b', '7a', '7b'];
export const DIMENSIONS = Array.from({ length: 12 }, (_, i) => 'D' + (i + 1));
const LANGS = ['en', 'fr'];

function isText(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'fr' in v);
}

/** Walks every value; any {en, fr} object must have both languages filled in. */
function checkTexts(node, path, errors) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => checkTexts(v, `${path}[${i}]`, errors));
  } else if (isText(node)) {
    for (const l of LANGS) {
      if (typeof node[l] !== 'string' || !node[l].trim()) errors.push(`${path}: missing "${l}" text`);
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) checkTexts(v, path ? `${path}.${k}` : k, errors);
  }
}

function checkTiers(item, where, errors) {
  if (item.tiers === undefined) return;
  if (!Array.isArray(item.tiers) || !item.tiers.length) {
    errors.push(`${where}: "tiers" must be a list like ["E2", "E3"]`);
    return;
  }
  for (const t of item.tiers) if (!KNOWN_TIERS.includes(t)) errors.push(`${where}: unknown tier "${t}"`);
}

function checkPuzzle(p, where, errors) {
  if (!p.id) errors.push(`${where}: puzzle needs an "id"`);
  if (!ELEMENTS.includes(p.element)) errors.push(`${where}: "element" must be one of ${ELEMENTS.join(' ')} (got "${p.element}")`);
  if (!isText(p.application)) errors.push(`${where}: "application" (the sheet's student application, in en and fr) is required`);
  if (!PUZZLE_TYPES.includes(p.type)) errors.push(`${where}: unknown puzzle type "${p.type}"`);
  if (!isText(p.prompt)) errors.push(`${where}: "prompt" is required`);
  if (!isText(p.success)) errors.push(`${where}: "success" text is required`);
  checkTiers(p, where, errors);
  // Optional: the Framework dimensions a puzzle counts toward, when it is not just the sheet's own
  if (p.dcf !== undefined && (!Array.isArray(p.dcf) || p.dcf.some((d) => !DIMENSIONS.includes(d)))) errors.push(`${where}: "dcf" must be a list like ["D1"] (D1 to D12)`);

  if (p.type === 'sequence') {
    if (!Array.isArray(p.steps) || p.steps.length < 2) errors.push(`${where}: a sequence needs at least 2 "steps"`);
    else p.steps.forEach((s, i) => { if (!s.id || !isText(s.text)) errors.push(`${where}.steps[${i}]: needs "id" and "text"`); });
  }
  if (p.type === 'choice' || p.type === 'predict') {
    if (p.type === 'predict') {
      if (!Array.isArray(p.scene) || !p.scene.length) errors.push(`${where}: a predict puzzle needs a "scene" (a list of moments, each with "text")`);
      else p.scene.forEach((f, i) => { if (!isText(f.text)) errors.push(`${where}.scene[${i}]: needs "text"`); });
      if (!isText(p.question)) errors.push(`${where}: a predict puzzle needs a "question"`);
    }
    if (!Array.isArray(p.options) || p.options.length < 2 || p.options.length > 4) errors.push(`${where}: needs 2 to 4 "options"`);
    else {
      const right = p.options.filter((o) => o.correct).length;
      if (right !== 1) errors.push(`${where}: a choice needs exactly one option with "correct": true (found ${right})`);
      p.options.forEach((o, i) => {
        if (!isText(o.text)) errors.push(`${where}.options[${i}]: needs "text"`);
        if (!o.correct && !isText(o.hint)) errors.push(`${where}.options[${i}]: a wrong option needs a "hint" that helps the player try again`);
      });
    }
  }
  if (p.type === 'sort') {
    const bins = new Set((p.bins || []).map((b) => b.id));
    if (bins.size < 2 || bins.size > 3) errors.push(`${where}: a sort needs 2 or 3 "bins", each with an "id" and "text"`);
    if (!Array.isArray(p.items) || p.items.length < 2) errors.push(`${where}: a sort needs at least 2 "items"`);
    else p.items.forEach((it, i) => {
      const w = `${where}.items[${i}]`;
      const ok = Array.isArray(it.bin) ? it.bin : [it.bin];
      if (!it.id || !isText(it.text)) errors.push(`${w}: needs "id" and "text"`);
      if (!ok.length || ok.some((b) => !bins.has(b))) errors.push(`${w}: "bin" must name one of the bins (or a list of bins that are all right)`);
      if (ok.length < bins.size && !isText(it.hint)) errors.push(`${w}: needs a "hint" for when it goes in the wrong box`);
    });
  }
  if (p.type === 'match') {
    if (!Array.isArray(p.pairs) || p.pairs.length < 2) errors.push(`${where}: a match needs at least 2 "pairs"`);
    else p.pairs.forEach((pr, i) => {
      const w = `${where}.pairs[${i}]`;
      if (!pr.id || !pr.left || !isText(pr.left.text) || !pr.right || !isText(pr.right.text)) errors.push(`${w}: needs "id", "left.text" and "right.text"`);
      if (!isText(pr.hint)) errors.push(`${w}: needs a "hint" for a wrong pairing`);
    });
  }
  if (p.type === 'spot') {
    if (!p.picture) errors.push(`${where}: a spot puzzle needs a "picture"`);
    if (!isText(p.pictureAlt)) errors.push(`${where}: a spot puzzle needs "pictureAlt" (what the picture shows, for screen readers)`);
    const spots = p.spots || [];
    if (!spots.some((s) => s.clue)) errors.push(`${where}: a spot puzzle needs at least one spot with "clue": true`);
    spots.forEach((s, i) => {
      const w = `${where}.spots[${i}]`;
      if (!s.id || !isText(s.name)) errors.push(`${w}: needs "id" and "name"`);
      for (const k of ['x', 'y', 'w', 'h']) if (typeof s[k] !== 'number') errors.push(`${w}: "${k}" must be a number (percent of the picture)`);
      if (s.clue && !isText(s.why)) errors.push(`${w}: a clue needs "why" (what it gives away)`);
      if (!s.clue && !isText(s.hint)) errors.push(`${w}: a spot that is not a clue needs a "hint"`);
    });
  }
}

const MUSIC_CHANNELS = ['pulse1', 'pulse2', 'triangle', 'noise'];

/** Songs in music.json: known channels, valid notes, and every bar the right length. */
function checkMusic(songs, name, errors) {
  for (const [id, song] of Object.entries(songs)) {
    const where = `${name}.songs.${id}`;
    if (!(song.bpm > 0)) errors.push(`${where}: "bpm" must be a number`);
    const barSteps = (song.stepsPerBeat || 2) * (song.beatsPerBar || 4);
    for (const ch of Object.keys(song.channels || {})) {
      if (!MUSIC_CHANNELS.includes(ch)) errors.push(`${where}: unknown channel "${ch}" (use ${MUSIC_CHANNELS.join(', ')})`);
    }
    if (!Array.isArray(song.order) || !song.order.length) { errors.push(`${where}: "order" must list its parts`); continue; }
    for (const p of song.order) if (!(song.parts || {})[p]) errors.push(`${where}: "order" names a missing part "${p}"`);
    for (const [pid, part] of Object.entries(song.parts || {})) {
      const lengths = new Set();
      for (const [ch, line] of Object.entries(part)) {
        const w = `${where}.parts.${pid}.${ch}`;
        if (!(song.channels || {})[ch]) errors.push(`${w}: no settings for this channel in "channels"`);
        try {
          String(line).split('|').forEach((bar, i) => {
            const n = parseLine(bar).steps;
            if (n !== barSteps) errors.push(`${w}: bar ${i + 1} is ${n} steps long, should be ${barSteps}`);
          });
          lengths.add(parseLine(line).steps);
        } catch (e) { errors.push(`${w}: ${e.message}`); }
      }
      if (lengths.size > 1) errors.push(`${where}.parts.${pid}: its channels are not the same length`);
    }
  }
}

/**
 * files: { ui: {...}, hub: {...}, area2: {...} } (parsed JSON)
 * returns { errors: [], warnings: [] }
 */
export function validateContent(files) {
  const errors = [];
  const warnings = [];
  const refs = []; // give: and achieve: actions, checked once every file is read

  for (const [name, data] of Object.entries(files)) {
    if (!data || typeof data !== 'object') { errors.push(`${name}: could not be read as JSON`); continue; }
    if (data.schemaVersion !== 1) errors.push(`${name}: "schemaVersion" must be 1`);
    checkTexts(data, name, errors);
    if (data.songs) checkMusic(data.songs, name, errors);

    const dialogue = data.dialogue || {};
    const puzzles = data.puzzles || [];
    const puzzleIds = new Set();
    const familyIds = new Set();

    puzzles.forEach((p, i) => {
      const where = `${name}.puzzles[${i}]${p.id ? ' (' + p.id + ')' : ''}`;
      checkPuzzle(p, where, errors);
      if (puzzleIds.has(p.id)) errors.push(`${where}: duplicate puzzle id`);
      puzzleIds.add(p.id);
      if (p.family) familyIds.add(p.family);
    });

    // Variety rule: no two content puzzles in a row of the same type (per tier).
    // The final room's chain of tricks ("finale": true) is a chain of choices by design.
    for (const tier of ['E2', 'E3']) {
      const seq = puzzles.filter((p) => !p.finale && (!p.tiers || p.tiers.includes(tier)));
      for (let i = 1; i < seq.length; i++) {
        if (seq[i].type === seq[i - 1].type) {
          warnings.push(`${name}: ${seq[i - 1].id} and ${seq[i].id} are both "${seq[i].type}" puzzles in a row for ${tier}`);
        }
      }
    }

    // Each family needs a version for each tier it is written for, and no tier twice.
    for (const fam of familyIds) {
      const members = puzzles.filter((p) => p.family === fam);
      for (const tier of ['E2', 'E3']) {
        const n = members.filter((p) => !p.tiers || p.tiers.includes(tier)).length;
        if (n === 0) warnings.push(`${name}: puzzle family "${fam}" has no version for ${tier}`);
        if (n > 1) errors.push(`${name}: puzzle family "${fam}" has ${n} versions for ${tier}`);
      }
    }

    // A dialogue action can start a puzzle by its id or by its family (the version for the player's cycle).
    const puzzleRefs = new Set([...puzzleIds, ...familyIds]);

    // Dialogue: every link must point to something that exists.
    for (const [nodeId, lines] of Object.entries(dialogue)) {
      if (!Array.isArray(lines) || !lines.length) { errors.push(`${name}.dialogue.${nodeId}: must be a list of lines`); continue; }
      lines.forEach((line, i) => {
        const where = `${name}.dialogue.${nodeId}[${i}]`;
        if (!isText(line.text)) errors.push(`${where}: needs "text"`);
        if (line.speaker && data.npcs && !data.npcs[line.speaker]) errors.push(`${where}: unknown speaker "${line.speaker}"`);
        checkTiers(line, where, errors);
        for (const c of line.choices || []) {
          if (c.next && !dialogue[c.next]) errors.push(`${where}: choice goes to missing node "${c.next}"`);
          if (c.action) checkAction(c.action, where, puzzleRefs, dialogue, errors, data.quests);
        }
        if (line.action) checkAction(line.action, where, puzzleRefs, dialogue, errors, data.quests);
        for (const a of [line.action, ...(line.choices || []).map((c) => c.action)]) if (a) refs.push({ a, where });
      });
    }
    for (const [npcId, npc] of Object.entries(data.npcs || {})) {
      for (const d of npc.dialogue || []) {
        if (!dialogue[d.node]) errors.push(`${name}.npcs.${npcId}: dialogue node "${d.node}" does not exist`);
      }
    }
    // Side quests: a villager, the puzzles that make it up, and what it helps develop.
    for (const [qid, q] of Object.entries(data.quests || {})) {
      const where = `${name}.quests.${qid}`;
      if (!isText(q.title)) errors.push(`${where}: needs a "title"`);
      if (!q.flag) errors.push(`${where}: needs a "flag" (set when the quest is done)`);
      if (!data.npcs || !data.npcs[q.giver]) errors.push(`${where}: "giver" must be a person from "npcs" (got "${q.giver}")`);
      if (!DIMENSIONS.includes(q.dcf)) errors.push(`${where}: "dcf" must be a Framework dimension like "D1" or "D2"`);
      if (!Array.isArray(q.elements) || !q.elements.length || q.elements.some((e) => !ELEMENTS.includes(e))) errors.push(`${where}: "elements" must list element codes like ["3a"]`);
      if (!Array.isArray(q.families) || !q.families.length) errors.push(`${where}: "families" must list its puzzles`);
      else for (const f of q.families) if (!puzzleRefs.has(f)) errors.push(`${where}: puzzle "${f}" does not exist`);
    }
    // Scenes played when the player comes home after the village has grown
    (data.arrivals || []).forEach((a, i) => {
      if (!a.if || !a.seen || !dialogue[a.node]) errors.push(`${name}.arrivals[${i}]: needs "if", "seen" and a "node" that exists`);
    });
  }
  checkReflections(files, errors, warnings);
  checkRegistry(files, errors, warnings);

  // Items and achievements named in dialogue must exist somewhere.
  const items = new Set(Object.values(files).flatMap((d) => Object.keys((d && d.items) || {})));
  const achievements = new Set(Object.keys((files.ui && files.ui.achievements) || {}));
  for (const { a, where } of refs) {
    const [kind, arg] = String(a).split(':');
    if (kind === 'give' && !items.has(arg)) errors.push(`${where}: gives unknown item "${arg}"`);
    if (kind === 'achieve' && files.ui && !achievements.has(arg)) errors.push(`${where}: unknown achievement "${arg}"`);
  }
  for (const d of Object.values(files)) {
    for (const [id, it] of Object.entries((d && d.items) || {})) {
      if (it.achievement && files.ui && !achievements.has(it.achievement)) errors.push(`item ${id}: unknown achievement "${it.achievement}"`);
    }
  }
  return { errors, warnings };
}

function checkAction(action, where, puzzleIds, dialogue, errors, quests) {
  const [kind, arg] = String(action).split(':');
  if (kind === 'puzzle' && !puzzleIds.has(arg)) errors.push(`${where}: action starts missing puzzle "${arg}"`);
  else if (kind === 'goto' && !dialogue[arg]) errors.push(`${where}: action goes to missing node "${arg}"`);
  else if (kind === 'quest' && !(quests || {})[arg]) errors.push(`${where}: action finishes missing quest "${arg}"`);
  else if (!['puzzle', 'goto', 'set', 'unset', 'give', 'achieve', 'travel', 'quest'].includes(kind)) errors.push(`${where}: unknown action "${action}"`);
}

// ---------- teacher layer: reflections and the progress-code registry ----------

/** Thinking-time questions ("reflections" in a content file). Every answer is a good answer. */
function checkReflections(files, errors, warnings) {
  const seen = new Set();
  for (const [name, data] of Object.entries(files)) {
    const list = (data && data.reflections) || [];
    if (!Array.isArray(list)) { errors.push(`${name}.reflections: must be a list`); continue; }
    list.forEach((r, i) => {
      const where = `${name}.reflections[${i}]${r.id ? ' (' + r.id + ')' : ''}`;
      if (!r.id) errors.push(`${where}: needs an "id"`);
      if (seen.has(r.id)) errors.push(`${where}: duplicate reflection id`);
      seen.add(r.id);
      if (r.element !== undefined && !ELEMENTS.includes(r.element)) errors.push(`${where}: unknown element "${r.element}"`);
      if (r.element === undefined && data.area === undefined) errors.push(`${where}: needs an "element" (or put it in an area file to make it about the whole area)`);
      if (!r.after || typeof r.after !== 'string') errors.push(`${where}: needs "after" (the story flag that makes it show)`);
      if (!isText(r.prompt)) errors.push(`${where}: "prompt" is required`);
      if (r.speaker && data.npcs && !data.npcs[r.speaker]) errors.push(`${where}: unknown speaker "${r.speaker}"`);
      checkTiers(r, where, errors);
      if (!Array.isArray(r.options) || r.options.length < 2 || r.options.length > 4) errors.push(`${where}: needs 2 to 4 "options"`);
      else {
        const ids = new Set();
        r.options.forEach((o, j) => {
          if (!o.id || !isText(o.text)) errors.push(`${where}.options[${j}]: needs "id" and "text"`);
          if (ids.has(o.id)) errors.push(`${where}.options[${j}]: duplicate option id "${o.id}"`);
          ids.add(o.id);
          if (o.correct !== undefined || o.hint !== undefined) errors.push(`${where}.options[${j}]: a reflection has no right or wrong answer (remove "correct" and "hint")`);
        });
      }
    });
    const families = new Set(list.filter((r) => r.family).map((r) => r.family));
    for (const fam of families) {
      const members = list.filter((r) => r.family === fam);
      for (const tier of ['E2', 'E3']) {
        const n = members.filter((r) => !r.tiers || r.tiers.includes(tier)).length;
        if (n === 0) warnings.push(`${name}: reflection family "${fam}" has no version for ${tier}`);
        if (n > 1) errors.push(`${name}: reflection family "${fam}" has ${n} versions for ${tier}`);
      }
      if (new Set(members.map((r) => r.options && r.options.length)).size > 1) warnings.push(`${name}: the versions of reflection "${fam}" have different numbers of options`);
    }
  }
}

/**
 * content/progress.json lists, in a fixed order, everything a progress code stores.
 * Anything missing from it would be invisible to teachers, so that is an error.
 */
function checkRegistry(files, errors, warnings) {
  const reg = files.progress && files.progress.order;
  if (!reg) return;
  const all = Object.entries(files).filter(([, d]) => d && typeof d === 'object');
  const inContent = {
    puzzles: all.flatMap(([, d]) => (d.puzzles || []).map((p) => p.family || p.id)),
    reflections: all.flatMap(([, d]) => (Array.isArray(d.reflections) ? d.reflections : []).map((r) => r.family || r.id)),
    items: all.flatMap(([, d]) => Object.keys(d.items || {})),
    achievements: Object.keys((files.ui && files.ui.achievements) || {}),
  };
  // Files that are not loaded (the game does not load every file in every place) cannot be checked for leftovers.
  const complete = { puzzles: true, reflections: true, items: true, achievements: !!files.ui };
  for (const kind of Object.keys(inContent)) {
    const list = reg[kind];
    if (!Array.isArray(list)) { errors.push(`progress.order.${kind}: must be a list`); continue; }
    if (list.length > 250) errors.push(`progress.order.${kind}: too long for a progress code (250 at most)`);
    const dup = list.filter((x, i) => list.indexOf(x) !== i);
    if (dup.length) errors.push(`progress.order.${kind}: listed twice: ${[...new Set(dup)].join(', ')}`);
    const missing = [...new Set(inContent[kind])].filter((x) => x && !list.includes(x));
    if (missing.length) errors.push(`progress.order.${kind}: add at the END of the list (never reorder it): ${missing.join(', ')}`);
    if (complete[kind]) {
      const gone = list.filter((x) => !inContent[kind].includes(x));
      if (gone.length) warnings.push(`progress.order.${kind}: no longer in the content (leave them in the list, old codes still use their place): ${gone.join(', ')}`);
    }
  }
}
