// Saves live in this browser's localStorage only. No accounts, nothing sent anywhere.
// Keys are versioned (dcc.v1.*) so a later version can migrate old saves.

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
const DEFAULT_SETTINGS = { lang: null, readAloud: false, textSpeed: 'normal', largeText: false, highContrast: false, music: true, musicVolume: 'medium' };

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read('settings') || {}) };
}
export function saveSettings(s) { write('settings', s); }

// ---------- save slots ----------
export function newSlot({ name = '', avatar = 0, tier = 'E2', lang = 'en' }) {
  const now = new Date().toISOString();
  return {
    v: 1,
    name, avatar, tier, lang,
    created: now,
    updated: now,
    sessions: [now],            // when play sessions started (for the teacher view)
    location: { scene: 'Hub', x: null, y: null, facing: 'down' },
    flags: {},                  // story flags, e.g. "met_guide"
    puzzles: {},                // puzzleId -> { done, hints, at }
    hints: {},                  // element code -> hints used (never shown as a score)
    achievements: {},           // achievementId -> date unlocked
    items: [],
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
