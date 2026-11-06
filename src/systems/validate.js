// Content checker. Pure JavaScript with no browser or Phaser code, so it runs in
// three places: the game (on load), tools/validate.html (in a browser) and
// tools/validate.mjs (on the command line and in the GitHub Pages workflow).
//
// Errors must be fixed. Warnings are advice (for example two puzzles of the same type in a row).

export const PUZZLE_TYPES = ['choice', 'sort', 'spot', 'sequence', 'match', 'predict', 'cocreate'];
export const KNOWN_TIERS = ['E2', 'E3', 'S1', 'S2', 'S3'];
export const ELEMENTS = ['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '4a', '4b', '5a', '6a', '6b', '7a', '7b'];
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

  if (p.type === 'sequence') {
    if (!Array.isArray(p.steps) || p.steps.length < 2) errors.push(`${where}: a sequence needs at least 2 "steps"`);
    else p.steps.forEach((s, i) => { if (!s.id || !isText(s.text)) errors.push(`${where}.steps[${i}]: needs "id" and "text"`); });
  }
  if (p.type === 'choice') {
    if (!Array.isArray(p.options) || p.options.length < 2 || p.options.length > 4) errors.push(`${where}: a choice needs 2 to 4 "options"`);
    else {
      const right = p.options.filter((o) => o.correct).length;
      if (right !== 1) errors.push(`${where}: a choice needs exactly one option with "correct": true (found ${right})`);
      p.options.forEach((o, i) => {
        if (!isText(o.text)) errors.push(`${where}.options[${i}]: needs "text"`);
        if (!o.correct && !isText(o.hint)) errors.push(`${where}.options[${i}]: a wrong option needs a "hint" that helps the player try again`);
      });
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

  for (const [name, data] of Object.entries(files)) {
    if (!data || typeof data !== 'object') { errors.push(`${name}: could not be read as JSON`); continue; }
    if (data.schemaVersion !== 1) errors.push(`${name}: "schemaVersion" must be 1`);
    checkTexts(data, name, errors);

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
    for (const tier of ['E2', 'E3']) {
      const seq = puzzles.filter((p) => !p.tiers || p.tiers.includes(tier));
      for (let i = 1; i < seq.length; i++) {
        if (seq[i].type === seq[i - 1].type) {
          warnings.push(`${name}: ${seq[i - 1].id} and ${seq[i].id} are both "${seq[i].type}" puzzles in a row for ${tier}`);
        }
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
          if (c.action) checkAction(c.action, where, puzzleRefs, dialogue, errors);
        }
        if (line.action) checkAction(line.action, where, puzzleRefs, dialogue, errors);
      });
    }
    for (const [npcId, npc] of Object.entries(data.npcs || {})) {
      for (const d of npc.dialogue || []) {
        if (!dialogue[d.node]) errors.push(`${name}.npcs.${npcId}: dialogue node "${d.node}" does not exist`);
      }
    }
  }
  return { errors, warnings };
}

function checkAction(action, where, puzzleIds, dialogue, errors) {
  const [kind, arg] = String(action).split(':');
  if (kind === 'puzzle' && !puzzleIds.has(arg)) errors.push(`${where}: action starts missing puzzle "${arg}"`);
  else if (kind === 'goto' && !dialogue[arg]) errors.push(`${where}: action goes to missing node "${arg}"`);
  else if (!['puzzle', 'goto', 'set', 'unset'].includes(kind)) errors.push(`${where}: unknown action "${action}"`);
}
