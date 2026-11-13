// The teacher layer's picture of the content and of a student's progress.
// Pure functions with no browser code: used by the dashboard, the in-game teacher corner and the tests.
//
// Nothing here is a mark. An element is described in words: not yet, exploring, completed,
// or completed without hints. There are no totals, percentages or rankings.

import { keyOf } from '../systems/progress.js';

export const STATES = ['none', 'exploring', 'done', 'solo'];
export const STATE_SYMBOL = { none: '·', exploring: '◐', done: '✓', solo: '★' };

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const uniq = (list) => [...new Set(list)];

/**
 * Builds the catalogue from the content files (files.framework is required).
 * {
 *   areas:      [{ id: '2', title, dcf: ['D1','D11'], elements: ['2a','2b','2c'] }]
 *   elements:   { '2a': { code, area, name, dcf, families: [keys], lookFors: [text], reflections: [keys] } }
 *   families:   { key: { key, file, element, dcf, quest, versions: { E2: puzzle, E3: puzzle } } }
 *   dimensions: { D1: { id, short, name, core, elements: [codes], families: [keys] } }
 *   quests:     [{ id, title, giver, dcf, elements, families, flag }]
 *   reflections:{ key: { key, file, element, area, versions: { E2: def, E3: def } } }
 *   prompts:    { '2': { before: [text], after: [text] } }
 *   activeElements: codes with at least one puzzle, in sheet order
 * }
 */
export function buildCatalogue(files) {
  const fw = files.framework;
  const areas = Object.entries(fw.areas).map(([id, a]) => ({ id, title: a.title, dcf: a.dcf.slice(), elements: Object.keys(a.elements) }));
  const elements = {};
  for (const a of areas) {
    for (const code of a.elements) {
      elements[code] = { code, area: a.id, name: fw.areas[a.id].elements[code], dcf: [], families: [], lookFors: [], reflections: [] };
    }
  }
  const families = {};
  const quests = [];
  const reflections = {};
  const prompts = {};
  const tiersOf = (x) => x.tiers || ['E2', 'E3'];

  for (const [file, data] of Object.entries(files)) {
    if (!data || typeof data !== 'object') continue;
    const fileQuests = Object.entries(data.quests || {}).map(([id, q]) => ({ id, file, ...q, dcf: asList(q.dcf), elements: asList(q.elements), families: asList(q.families) }));
    quests.push(...fileQuests);

    for (const p of data.puzzles || []) {
      const key = keyOf(p);
      const el = elements[p.element];
      if (!el) continue;
      const quest = fileQuests.find((q) => q.families.includes(key)) || null;
      const fam = families[key] || (families[key] = { key, file, element: p.element, dcf: [], quest: quest ? quest.id : null, versions: {} });
      const dcf = asList(p.dcf).length ? asList(p.dcf) : quest && quest.dcf.length ? quest.dcf : fw.areas[el.area].dcf;
      fam.dcf = uniq([...fam.dcf, ...dcf]);
      for (const tier of tiersOf(p)) fam.versions[tier] = p;
      if (!el.families.includes(key)) el.families.push(key);
    }

    for (const r of data.reflections || []) {
      const key = keyOf(r);
      const area = r.element && elements[r.element] ? elements[r.element].area : data.area != null ? String(data.area) : null;
      const def = reflections[key] || (reflections[key] = { key, file, element: r.element || null, area, speaker: r.speaker || null, versions: {} });
      for (const tier of tiersOf(r)) def.versions[tier] = r;
      if (r.element && elements[r.element] && !elements[r.element].reflections.includes(key)) elements[r.element].reflections.push(key);
    }

    const teacher = data.teacher;
    if (teacher) {
      for (const [code, list] of Object.entries(teacher.lookFors || {})) {
        if (elements[code]) elements[code].lookFors.push(...list);
      }
      if (data.area != null) prompts[String(data.area)] = { before: teacher.before || [], after: teacher.after || [] };
    }
  }

  const dimensions = {};
  for (const [id, d] of Object.entries(fw.dimensions)) dimensions[id] = { id, short: d.short, name: d.name, core: !!d.core, elements: [], families: [] };
  for (const fam of Object.values(families)) {
    for (const d of fam.dcf) {
      if (!dimensions[d]) continue;
      dimensions[d].families.push(fam.key);
      if (!dimensions[d].elements.includes(fam.element)) dimensions[d].elements.push(fam.element);
    }
  }
  const order = Object.keys(elements);
  for (const el of Object.values(elements)) {
    el.dcf = uniq(el.families.flatMap((k) => families[k].dcf));
    if (!el.dcf.length) el.dcf = fw.areas[el.area].dcf.slice();
  }
  for (const d of Object.values(dimensions)) d.elements.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return {
    areas, elements, families, dimensions, quests, reflections, prompts,
    activeElements: order.filter((c) => elements[c].families.length),
    npcName: (file, id) => (files[file] && files[file].npcs && files[file].npcs[id] ? files[file].npcs[id].name : null),
    achievements: (files.ui && files.ui.achievements) || {},
    items: Object.assign({}, ...Object.values(files).map((d) => (d && d.items) || {})),
    itemFile: (id) => (Object.entries(files).find(([, d]) => d && d.items && d.items[id]) || [null])[0],
  };
}

// ---------- one student's progress, in words ----------

/** The puzzle written for this cycle (or any version, when there is none for it). */
export function versionFor(fam, tier) {
  return fam.versions[tier] || Object.values(fam.versions)[0];
}

/**
 * Rolls a list of puzzle families up into one state for a student.
 * Only families that exist for the student's cycle count.
 * { state, done, started, hints, families: [{ key, state: 'none'|'started'|'done', hints }] }
 */
export function rollUp(cat, summary, keys) {
  const fams = [];
  for (const key of keys) {
    const fam = cat.families[key];
    if (!fam || !fam.versions[summary.tier]) continue;
    const p = summary.puzzles[key];
    fams.push({ key, state: p ? p.state : 'none', hints: p ? p.hints : 0 });
  }
  const done = fams.filter((f) => f.state === 'done').length;
  const started = fams.filter((f) => f.state === 'started').length;
  const hints = fams.reduce((n, f) => n + f.hints, 0);
  let state = 'none';
  if (fams.length && done === fams.length) state = hints ? 'done' : 'solo';
  else if (done || started) state = 'exploring';
  return { state, done, started, hints, families: fams };
}

export const elementState = (cat, summary, code) => rollUp(cat, summary, cat.elements[code].families);
export const dimensionState = (cat, summary, id) => rollUp(cat, summary, cat.dimensions[id].families);

/** Villagers helped: quests whose puzzles are all done. [{ quest, done }] */
export function questStates(cat, summary) {
  return cat.quests.map((quest) => ({ quest, done: quest.families.length > 0 && quest.families.every((k) => summary.puzzles[k] && summary.puzzles[k].state === 'done') }));
}

/** The student's reflections with the question and the answer they picked, as content text objects. */
export function reflectionAnswers(cat, summary) {
  const out = [];
  for (const [key, r] of Object.entries(summary.reflections || {})) {
    const def = cat.reflections[key];
    if (!def) continue;
    const v = def.versions[summary.tier] || Object.values(def.versions)[0];
    const opt = v.options.find((o) => o.id === r.choice);
    out.push({ key, element: def.element, area: def.area, prompt: v.prompt, answer: opt ? opt.text : null, feel: r.feel || 0 });
  }
  return out;
}

/**
 * Things worth a short conversation with this student, never a judgment:
 * - 'help'    the student said they would like help (their own words)
 * - 'hints'   several hints were used in an element
 * - 'started' a puzzle was opened and left for later
 * [{ kind, element, families: [keys] }]
 */
export function talkingPoints(cat, summary) {
  const out = [];
  for (const r of reflectionAnswers(cat, summary)) {
    if (r.feel === 3) out.push({ kind: 'help', element: r.element, area: r.area, families: [] });
  }
  for (const code of cat.activeElements) {
    const s = elementState(cat, summary, code);
    const heavy = s.families.filter((f) => f.hints >= 3).map((f) => f.key);
    if (heavy.length || (s.done && s.hints >= 2 * s.done)) {
      out.push({ kind: 'hints', element: code, area: cat.elements[code].area, families: heavy.length ? heavy : s.families.filter((f) => f.hints).map((f) => f.key) });
    }
    const left = s.families.filter((f) => f.state === 'started').map((f) => f.key);
    if (left.length) out.push({ kind: 'started', element: code, area: cat.elements[code].area, families: left });
  }
  return out;
}

/**
 * What changed between two snapshots of the same student (older may be null).
 * [{ kind: 'element', element, from, to } | { kind: 'reflection', key } | { kind: 'item', id } | { kind: 'quest', id }]
 */
export function changes(cat, older, newer) {
  const out = [];
  for (const code of cat.activeElements) {
    const to = elementState(cat, newer, code).state;
    const from = older ? elementState(cat, older, code).state : 'none';
    if (STATES.indexOf(to) > STATES.indexOf(from)) out.push({ kind: 'element', element: code, from, to });
  }
  for (const key of Object.keys(newer.reflections || {})) {
    const a = older && older.reflections[key];
    const b = newer.reflections[key];
    if (cat.reflections[key] && (!a || a.choice !== b.choice || a.feel !== b.feel)) out.push({ kind: 'reflection', key });
  }
  for (const id of newer.items || []) {
    if (cat.items[id] && cat.items[id].kind === 'badge' && !(older && older.items.includes(id))) out.push({ kind: 'item', id });
  }
  const before = older ? questStates(cat, older) : [];
  questStates(cat, newer).forEach((q, i) => { if (q.done && !(before[i] && before[i].done)) out.push({ kind: 'quest', id: q.quest.id }); });
  return out;
}
