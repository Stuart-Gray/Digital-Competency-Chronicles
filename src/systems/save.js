// Saves live in this browser's localStorage only. No accounts, nothing sent anywhere.
// Keys are versioned (dcc.v1.*) so a later version can migrate old saves.

import { newSid } from './progress.js';

const PREFIX = 'dcc.v1.';
export const SLOT_COUNT = 5;

const memory = new Map(); // used when localStorage is blocked: the game still plays
let storageOk = true;
try {
  const k = PREFIX + 'probe';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
} catch (e) {
  storageOk = false;
}

export function canSave() { return storageOk; }

function read(key) {
  try {
    const raw = storageOk ? window.localStorage.getItem(PREFIX + key) : memory.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function write(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (storageOk) window.localStorage.setItem(PREFIX + key, raw);
    else memory.set(key, raw);
  } catch (e) {
    memory.set(key, raw);
  }
}

function remove(key) {
  try { if (storageOk) window.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  memory.delete(key);
}

// ---------- settings (shared by every slot on this device) ----------
// See docs/accessibility.md for what each one does.
const DEFAULT_SETTINGS = {
  lang: null,
  // sound and voice
  music: true, musicVolume: 'medium',
  readAloud: false, voice: 'male', speechRate: 'normal',
  // reading and seeing
  textSpeed: 'normal',        // slow, normal, fast, instant
  textSize: 'normal',         // normal, large, larger
  font: 'standard',           // standard (Atkinson Hyperlegible) or dyslexia (OpenDyslexic)
  highContrast: false,
  reduceMotion: 'auto',       // auto (follow the device), on, off
  // moving
  walkMode: 'hold',           // hold a direction to walk, or toggle: tap once to start, again to stop
  arrowPad: false,
  // teacher corner
  reflections: true,          // thinking-time questions after a wing or a village task
};

export function loadSettings() {
  const saved = read('settings') || {};
  // Older saves had largeText: true/false.
  if (saved.textSize == null && saved.largeText) saved.textSize = 'large';
  delete saved.largeText;
  return { ...DEFAULT_SETTINGS, ...saved };
}
export function saveSettings(s) { write('settings', s); }

// ---------- save slots ----------
export function newSlot({ name = '', avatar = 0, look = null, tier = 'E2', lang = 'en' }) {
  const now = new Date().toISOString();
  return {
    v: 1,
    sid: newSid(),              // a random number so the teacher dashboard can tell saves apart; not personal
    name, avatar, tier, lang,
    look,                       // the hero's styles and colours (ids from content/avatar.json); avatar = the ready-made hero it began as
    created: now,
    updated: now,
    sessions: [now],            // when play sessions started (for the teacher view)
    location: { scene: 'Hub', x: null, y: null, facing: 'down' },
    flags: {},                  // story flags, e.g. "met_guide"
    puzzles: {},                // puzzleId -> { done, hints, at }
    started: {},                // puzzleId -> { hints, at } for puzzles opened and left for later
    reflections: {},            // reflection family -> { choice, feel, at } (thinking-time answers)
    hints: {},                  // element code -> hints used (never shown as a score)
    achievements: {},           // achievementId -> date unlocked
    items: [],
    quests: {},                 // side quest id -> date finished (villagers helped)
  };
}

export function loadSlot(i) { return read('slot' + i); }

export function saveSlot(i, data) {
  data.updated = new Date().toISOString();
  write('slot' + i, data);
}

export function clearSlot(i) { remove('slot' + i); }

export function listSlots() {
  const out = [];
  for (let i = 0; i < SLOT_COUNT; i++) out.push(loadSlot(i));
  return out;
}

export function clearAll() {
  for (let i = 0; i < SLOT_COUNT; i++) clearSlot(i);
}
