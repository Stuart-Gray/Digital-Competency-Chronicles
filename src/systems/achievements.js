// Achievements: positive, optional, never lost. Names and descriptions live in content/ui.json.
// The Journal only lists what a player HAS done, never what they have not.

import * as layer from '../ui/textLayer.js';
import { t, ui } from './i18n.js';
import * as content from './content.js';

/** Unlocks an achievement on the slot (once) and shows the fanfare toast. Returns true if new. */
export function unlock(slot, id) {
  if (slot.achievements[id]) return false;
  const def = content.get('ui').achievements[id];
  if (!def) { console.error('Unknown achievement', id); return false; }
  slot.achievements[id] = new Date().toISOString();
  layer.toast(ui('journal.unlocked'), t(def.name));
  return true;
}

/** The unlocked achievements of a slot, in the order they appear in ui.json. */
export function listUnlocked(slot) {
  const defs = content.get('ui').achievements;
  return Object.keys(defs).filter((id) => slot.achievements[id]).map((id) => ({ id, ...defs[id] }));
}
