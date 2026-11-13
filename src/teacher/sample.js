// A made-up class, so a teacher can see what the dashboard does before any student has played.
// The students are not real. The same recipe is used every time (no randomness to explain).

import * as store from './store.js';

const NAMES = ['Amara', 'Léo', 'Maya', 'Noah', 'Zoé', 'Sam', 'Chloé', 'Olivier', 'Jade', 'Liam'];
const INITIALS = ['B', 'T', 'R', 'G', 'L', 'D', 'P', 'M', 'C', 'S'];
// How far each student is at each of three visits (0 = nothing yet, 1 = everything done).
const JOURNEYS = [
  [0.25, 0.6, 1], [0.15, 0.45, 0.8], [0.3, 0.3, 0.65], [0, 0.2, 0.5], [0.4, 0.85, 1],
  [0.1, 0.35, 0.35], [0.2, 0.55, 0.9], [0, 0, 0.3], [0.35, 0.7, 1], [0.15, 0.4, 0.7],
];

/** A small repeatable number generator (so the sample looks the same every time). */
function rng(seed) {
  let x = seed * 2654435761 % 4294967296;
  return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function summaryAt(cat, registry, i, tier, fraction, visit) {
  const rand = rng(i + 1);
  const careful = rand() < 0.35;      // rarely needs a hint
  const keys = registry.puzzles.filter((k) => cat.families[k] && cat.families[k].versions[tier]);
  const doneCount = Math.round(keys.length * fraction);
  const puzzles = {};
  keys.forEach((k, n) => {
    const r = rand();
    if (n < doneCount) puzzles[k] = { state: 'done', hints: careful ? (r < 0.15 ? 1 : 0) : r < 0.3 ? 0 : r < 0.65 ? 1 : r < 0.85 ? 2 : 4 };
    else if (n === doneCount && fraction > 0 && fraction < 1 && r < 0.5) puzzles[k] = { state: 'started', hints: r < 0.25 ? 1 : 0 };
  });
  const isDone = (k) => puzzles[k] && puzzles[k].state === 'done';
  const reflections = {};
  for (const key of registry.reflections) {
    const def = cat.reflections[key];
    if (!def || !def.versions[tier]) continue;
    const fams = def.element ? cat.elements[def.element].families : Object.values(cat.families).filter((f) => f.file === def.file).map((f) => f.key);
    const mine = fams.filter((k) => cat.families[k].versions[tier] && cat.families[k].file === def.file);
    if (!mine.length || !mine.every(isDone)) continue;
    const r = rand();
    if (r < 0.12) continue; // chose "Later"
    const hints = mine.reduce((n, k) => n + puzzles[k].hints, 0);
    const options = def.versions[tier].options;
    reflections[key] = { choice: options[Math.floor(rand() * options.length)].id, feel: hints >= 4 ? 3 : hints >= 2 || r < 0.45 ? 2 : 1 };
  }
  const items = [];
  for (const [id, item] of Object.entries(cat.items)) {
    if (item.kind === 'piece' && item.wing) { if (item.wing.every(isDone)) items.push(id); continue; }
    const inFile = Object.values(cat.families).filter((f) => cat.itemFile(id) === f.file && f.versions[tier]).map((f) => f.key);
    if (item.kind === 'badge') { if (inFile.length && inFile.every(isDone)) items.push(id); } else if (inFile.some((k) => puzzles[k])) items.push(id);
  }
  return {
    sid: 1000 + i, name: NAMES[i], tier, lang: i % 3 === 1 ? 'fr' : 'en',
    date: daysAgo([16, 9, 2][visit] + (i % 3)), sessions: 1 + visit * 2 + (i % 2),
    puzzles, reflections, items, achievements: fraction > 0 ? ['first_steps'] : [],
  };
}

/** Adds the sample class to the teacher's data and makes it the current class. */
export function addSampleClass(data, cat, registry, name) {
  const cls = store.addClass(data, name, { sample: true });
  NAMES.forEach((n, i) => {
    const tier = i % 2 ? 'E3' : 'E2';
    JOURNEYS[i].forEach((fraction, visit) => {
      if (!fraction && visit < 2 && JOURNEYS[i][visit + 1] === 0) return;
      const summary = summaryAt(cat, registry, i, tier, fraction, visit);
      const { student } = store.addSnapshot(cls, summary, `SAMPLE-${i}-${visit}`, new Date(Date.parse(summary.date) + 3600000).toISOString());
      student.initial = INITIALS[i];
    });
  });
  return cls;
}
