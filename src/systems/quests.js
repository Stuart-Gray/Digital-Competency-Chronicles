// Side quests: villagers who could use a hand. A quest is one or two puzzles and a short
// story, listed in a content file's "quests" map (see docs/content-schema.md):
//
//   "q_sound": { "title": {en, fr}, "giver": "gus", "dcf": "D2", "elements": ["3a"],
//                "families": ["gus_parts", "gus_volume"], "flag": "q_sound_done", "after": "<flag>" }
//
// A quest is done when its flag is set (the dialogue action "quest:<id>" sets it). Nothing is
// scored. The teacher view reads the same "quests" map and the puzzles' own records.

import * as content from './content.js';

const FILE = 'hub';

export function defs() {
  const data = content.get(FILE);
  return (data && data.quests) || {};
}

export function isDone(slot, id) {
  const q = defs()[id];
  return !!(q && slot.flags[q.flag]);
}

/** Has this quest started to be on offer? ("after" is the story flag that brings it.) */
export function isOffered(slot, id) {
  const q = defs()[id];
  return !!q && (!q.after || !!slot.flags[q.after]);
}

/** The quest this villager is offering now, if any. */
export function openFor(slot, npcId) {
  for (const [id, q] of Object.entries(defs())) {
    if (q.giver === npcId && isOffered(slot, id) && !isDone(slot, id)) return { id, ...q };
  }
  return null;
}

export function anyOpen(slot) {
  return Object.keys(defs()).some((id) => isOffered(slot, id) && !isDone(slot, id));
}

/** Marks a quest done (once). Returns true if it was not done before. */
export function complete(slot, id) {
  const q = defs()[id];
  if (!q) { console.error('Unknown quest', id); return false; }
  slot.quests = slot.quests || {};
  const wasDone = !!slot.flags[q.flag];
  slot.flags[q.flag] = true;
  if (!slot.quests[id]) slot.quests[id] = new Date().toISOString();
  return !wasDone;
}

/** The quests a player has finished, in the order they are listed in the content file. */
export function listDone(slot) {
  return Object.entries(defs()).filter(([id]) => isDone(slot, id)).map(([id, q]) => ({ id, ...q }));
}

export function allDone(slot) {
  const ids = Object.keys(defs());
  return ids.length > 0 && ids.every((id) => isDone(slot, id));
}
