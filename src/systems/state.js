// The running game's state: device settings and the save slot being played.

import * as save from './save.js';
import * as i18n from './i18n.js';
import * as layer from '../ui/textLayer.js';
import * as music from './music.js';
import * as a11y from './a11y.js';
import * as input from './input.js';

export const state = {
  settings: save.loadSettings(),
  slotIndex: null,
  slot: null,
};

export function applySettings() {
  const s = state.settings;
  if (!s.lang) s.lang = i18n.browserLang();
  i18n.setLang(s.lang);
  layer.applySettings(s);
  a11y.applySettings(s);
  input.setWalkMode(s.walkMode);
  music.applySettings(s);
}

export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  save.saveSettings(state.settings);
  applySettings();
}

export function startSlot(index, slot) {
  state.slotIndex = index;
  state.slot = slot;
  i18n.setTier(slot.tier);
  if (!slot.sessions) slot.sessions = [];
  const last = slot.sessions[slot.sessions.length - 1];
  const now = new Date().toISOString();
  // A new session if the last one started more than 30 minutes ago.
  if (!last || Date.now() - Date.parse(last) > 30 * 60 * 1000) slot.sessions.push(now);
  if (slot.sessions.length > 200) slot.sessions = slot.sessions.slice(-200);
  saveNow();
}

export function saveNow() {
  if (state.slot != null && state.slotIndex != null) save.saveSlot(state.slotIndex, state.slot);
}

/** The player's name, or a friendly default when they skipped it. */
export function playerName() {
  return (state.slot && state.slot.name) || i18n.ui('slots.defaultName');
}
