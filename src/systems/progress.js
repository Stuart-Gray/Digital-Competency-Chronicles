// Progress summaries and progress codes: how a student's progress reaches the teacher.
//
// There are no accounts and no server. A student opens "Share with my teacher" and the game
// turns their save into a short code (also shown as a QR code). The teacher types, pastes or
// scans codes into teacher.html. A code holds: the first name (if one was typed), the cycle,
// the date last played, how many times they played, and one small value per puzzle,
// reflection, item and achievement. Nothing else.
//
// This file has no browser or Phaser code, so the game, the dashboard and the tests share it.
// The order of things inside a code comes from content/progress.json (append-only).
// See docs/content-schema.md, "Progress codes".

export const CODE_PREFIX = 'DCC1';
const FORMAT = 1;
const TIERS = ['E2', 'E3', 'S1', 'S2', 'S3'];
const LANGS = ['en', 'fr'];
const EPOCH = Date.UTC(2026, 0, 1);

/** The calendar day where the student is, as YYYY-MM-DD (not the day in UTC). */
export function localDay(iso) {
  const d = iso ? new Date(iso) : new Date();
  const at = Number.isNaN(d.getTime()) ? new Date() : d;
  const two = (n) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}
const DAY = 24 * 60 * 60 * 1000;
const MAX_HINTS = 13; // a puzzle value is 0 (not yet), 1 (started), or 2 + hints used (finished)

// ---------- recording puzzle results on a save slot ----------

/**
 * Records one visit to a puzzle. result = { solved, hints } from puzzle.open().
 * Hints used on a visit that ended with "Leave for now" are remembered, so the teacher view
 * can tell "started" from "not yet", and they count once the puzzle is finished.
 */
export function recordPuzzle(slot, p, result) {
  slot.puzzles = slot.puzzles || {};
  slot.hints = slot.hints || {};
  slot.started = slot.started || {};
  const hints = (result && result.hints) || 0;
  if (hints) slot.hints[p.element] = (slot.hints[p.element] || 0) + hints;
  if (result && result.solved) {
    const prev = slot.puzzles[p.id];
    const before = prev ? prev.hints : ((slot.started[p.id] || {}).hints || 0);
    slot.puzzles[p.id] = { done: true, hints: before + hints, at: new Date().toISOString() };
    delete slot.started[p.id];
  } else if (!slot.puzzles[p.id]) {
    const st = slot.started[p.id] || { hints: 0 };
    st.hints += hints;
    st.at = new Date().toISOString();
    slot.started[p.id] = st;
  }
}

// ---------- content helpers ----------

/** The key a puzzle or reflection has in content/progress.json: its family, or its id. */
export const keyOf = (x) => x.family || x.id;

/** Every puzzle in every content file, with the file name: [{ file, puzzle }]. */
export function allPuzzles(files) {
  const out = [];
  for (const [file, data] of Object.entries(files || {})) {
    for (const puzzle of (data && data.puzzles) || []) out.push({ file, puzzle });
  }
  return out;
}

/** Every reflection in every content file: [{ file, reflection }]. */
export function allReflections(files) {
  const out = [];
  for (const [file, data] of Object.entries(files || {})) {
    for (const reflection of (data && data.reflections) || []) out.push({ file, reflection });
  }
  return out;
}

/** The version of a reflection (by family or id) written for a cycle. */
export function reflectionFor(files, key, tier) {
  const list = allReflections(files).map((r) => r.reflection).filter((r) => keyOf(r) === key);
  return list.find((r) => !r.tiers || r.tiers.includes(tier)) || list[0] || null;
}

// ---------- summary: what a code holds, as plain data ----------

/**
 * Turns a save slot into the summary a progress code carries.
 * files = the parsed content files ({ hub, area2, ... }).
 * {
 *   sid, name, tier, lang, date: 'YYYY-MM-DD', sessions,
 *   puzzles:      { family: { state: 'started' | 'done', hints } },   (missing = not yet)
 *   reflections:  { family: { choice: optionId | null, feel: 0..3 } },
 *   items: [ids], achievements: [ids]
 * }
 */
export function summarise(slot, files) {
  const puzzles = {};
  for (const { puzzle: p } of allPuzzles(files)) {
    const key = keyOf(p);
    const done = slot.puzzles && slot.puzzles[p.id];
    const started = slot.started && slot.started[p.id];
    const cur = puzzles[key];
    if (done) {
      // Played in both cycles: keep the visit with fewer hints.
      if (!cur || cur.state !== 'done' || done.hints < cur.hints) puzzles[key] = { state: 'done', hints: done.hints || 0 };
    } else if (started && !cur) {
      puzzles[key] = { state: 'started', hints: started.hints || 0 };
    }
  }
  const reflections = {};
  for (const [key, r] of Object.entries(slot.reflections || {})) {
    if (r && (r.choice || r.feel)) reflections[key] = { choice: r.choice || null, feel: r.feel || 0 };
  }
  return {
    sid: slot.sid || 0,
    name: slot.name || '',
    tier: slot.tier || 'E2',
    lang: slot.lang || 'en',
    date: localDay(slot.updated || slot.created),
    sessions: Math.max(1, (slot.sessions || []).length),
    puzzles,
    reflections,
    items: (slot.items || []).slice(),
    achievements: Object.keys(slot.achievements || {}),
  };
}

// ---------- base32 (Crockford: no I, L, O or U, so codes are easy to read aloud and type) ----------
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase32(bytes) {
  let out = '', bits = 0, value = 0;
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(text) {
  const bytes = [];
  let bits = 0, value = 0;
  for (const ch of text) {
    const n = ALPHABET.indexOf(ch);
    if (n < 0) throw new Error('bad character');
    value = (value << 5) | n; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
    value &= (1 << bits) - 1; // keep only the bits not yet used
  }
  return bytes;
}

function crc16(bytes) {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

/**
 * The check digits of a code's bytes. The length is part of the check, so a code with its end
 * cut off is noticed (a plain CRC misses that about once in 256 codes).
 */
const checkOf = (payload) => crc16([payload.length & 255, ...payload]);

/** True when the bytes are laid out as a code is: the header, then five sections that end exactly at the end. */
function shapeOk(payload) {
  let i = 8;
  for (let n = 0; n < 5; n++) {
    if (i >= payload.length) return false;
    i += 1 + payload[i];
  }
  return i === payload.length;
}

const utf8 = {
  encode: (s) => Array.from(new TextEncoder().encode(s)),
  decode: (bytes) => new TextDecoder().decode(new Uint8Array(bytes)),
};

/** A list of bytes with the zeros at the end dropped, after a one-byte length. */
function section(bytes) {
  let n = bytes.length;
  while (n && !bytes[n - 1]) n--;
  return [n, ...bytes.slice(0, n)];
}

// ---------- encode ----------

/**
 * Builds the code for a summary. registry = the "order" lists of content/progress.json, files = content files
 * (needed to turn a reflection answer into its position in the list of options).
 */
export function encode(summary, registry, files) {
  const tier = Math.max(0, TIERS.indexOf(summary.tier));
  const lang = Math.max(0, LANGS.indexOf(summary.lang));
  const days = Math.min(0xffff, Math.max(0, Math.round((Date.parse(summary.date + 'T00:00:00Z') - EPOCH) / DAY) || 0));
  const sid = (summary.sid || 0) & 0xffffff;
  const name = utf8.encode(summary.name || '').slice(0, 60);

  // Two puzzles per byte.
  const pz = new Array(Math.ceil(registry.puzzles.length / 2)).fill(0);
  registry.puzzles.forEach((key, i) => {
    const p = summary.puzzles[key];
    const v = !p ? 0 : p.state === 'done' ? 2 + Math.min(MAX_HINTS, p.hints || 0) : 1;
    pz[i >> 1] |= i % 2 ? v : v << 4;
  });
  // One byte per reflection: the option chosen (1 to 7, 0 = none) and the feeling (1 to 3, 0 = none).
  const rf = registry.reflections.map((key) => {
    const r = summary.reflections[key];
    if (!r) return 0;
    const def = reflectionFor(files, key, summary.tier);
    const choice = def && r.choice ? def.options.findIndex((o) => o.id === r.choice) + 1 : 0;
    return (choice & 7) | ((r.feel & 3) << 3);
  });
  const bitset = (list, have) => {
    const out = new Array(Math.ceil(list.length / 8)).fill(0);
    list.forEach((id, i) => { if (have.includes(id)) out[i >> 3] |= 1 << (i % 8); });
    return out;
  };

  const bytes = [
    FORMAT, tier | (lang << 3),
    (sid >> 16) & 255, (sid >> 8) & 255, sid & 255,
    days >> 8, days & 255,
    Math.min(255, summary.sessions || 1),
    name.length, ...name,
    ...section(pz), ...section(rf),
    ...section(bitset(registry.items, summary.items || [])),
    ...section(bitset(registry.achievements, summary.achievements || [])),
  ];
  const crc = checkOf(bytes);
  bytes.push(crc >> 8, crc & 255);
  return CODE_PREFIX + '-' + toBase32(bytes).match(/.{1,5}/g).join('-');
}

/** Shortcut: the code for a save slot. */
export function codeForSlot(slot, registry, files) {
  return encode(summarise(slot, files), registry, files);
}

// ---------- decode ----------

/** Tidies what a person typed: capitals, the letters people mix up, any kind of dash or space. */
export function normaliseCode(raw) {
  let s = String(raw || '').toUpperCase().replace(/[\s‐-―_.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!s.startsWith(CODE_PREFIX)) return null;
  const body = s.slice(CODE_PREFIX.length).replace(/-/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  if (!body || /[^0-9A-HJKMNP-TV-Z]/.test(body)) return null;
  return CODE_PREFIX + '-' + body.match(/.{1,5}/g).join('-');
}

/** Do the check digits at the end of a code's letters and numbers match the rest? */
function bodyOk(body) {
  let bytes;
  try { bytes = fromBase32(body); } catch (e) { return false; }
  if (bytes.length < 11) return false;
  // Exactly the letters the bytes need, no extra one at the end (an extra letter can hide in the padding).
  if (toBase32(bytes) !== body) return false;
  const payload = bytes.slice(0, -2);
  if (checkOf(payload) !== ((bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1])) return false;
  // A code from a newer game may be laid out differently: decode() says so.
  return payload[0] !== FORMAT || shapeOk(payload);
}

/**
 * Finds every progress code in a block of text (an email, a chat, a file of many codes).
 * People paste codes with words around them ("my code is dcc1 04abc ... thanks"), so words that
 * follow a code are tried too and dropped again: the check digits say where the code ends.
 */
export function findCodes(text) {
  const found = [];
  const add = (code) => { if (code && !found.includes(code)) found.push(code); };
  const pieces = String(text || '').split(/(?=DCC1)/i).filter((p) => /^DCC1/i.test(p));
  const candidate = (piece) => {
    const m = piece.match(/^DCC1(?:[\s\u2010-\u2015_-]{0,3}[0-9A-Za-z]{1,5})+/i);
    return m ? normaliseCode(m[0]) : null;
  };
  const trimmed = (code) => {
    const body = code.slice(CODE_PREFIX.length).replace(/-/g, '');
    for (let cut = 0; cut <= 60 && body.length - cut >= 18; cut++) {
      const b = body.slice(0, body.length - cut);
      if (bodyOk(b)) return CODE_PREFIX + '-' + b.match(/.{1,5}/g).join('-');
    }
    return null;
  };
  for (let i = 0; i < pieces.length; i++) {
    const code = candidate(pieces[i]);
    if (!code) continue;
    let good = trimmed(code);
    // By chance a code can hold the letters "DCC1" in its middle: try it joined with what follows.
    if (!good && pieces[i + 1]) {
      const joined = candidate(pieces[i] + pieces[i + 1]);
      good = joined && trimmed(joined);
      if (good) i++;
    }
    // A code that never checks out is kept as typed, so the teacher is told it has a mistake
    // (unless it is far too short to be one: "DCC1" in a sentence is not a code).
    if (good || code.replace(/-/g, '').length >= CODE_PREFIX.length + 18) add(good || code);
  }
  return found;
}

/**
 * Reads a code back into a summary. Throws an Error whose message is one of:
 * 'not-a-code', 'damaged' (a typo: the check digits do not match), 'newer' (made by a newer game).
 */
export function decode(raw, registry, files) {
  const code = normaliseCode(raw);
  if (!code) throw new Error('not-a-code');
  let bytes;
  try { bytes = fromBase32(code.slice(CODE_PREFIX.length).replace(/-/g, '')); } catch (e) { throw new Error('not-a-code'); }
  if (!bodyOk(code.slice(CODE_PREFIX.length).replace(/-/g, ''))) throw new Error('damaged');
  bytes = bytes.slice(0, -2);
  if (bytes[0] !== FORMAT) throw new Error('newer');

  let i = 1;
  const flags = bytes[i++];
  const sid = (bytes[i++] << 16) | (bytes[i++] << 8) | bytes[i++];
  const days = (bytes[i++] << 8) | bytes[i++];
  const sessions = bytes[i++];
  const take = () => { const n = bytes[i++] || 0; const out = bytes.slice(i, i + n); i += n; return out; };
  const name = utf8.decode(take());
  const pz = take(), rf = take(), it = take(), ac = take();
  const tier = TIERS[flags & 7] || 'E2';

  const puzzles = {};
  registry.puzzles.forEach((key, n) => {
    const byte = pz[n >> 1] || 0;
    const v = n % 2 ? byte & 15 : byte >> 4;
    if (v === 1) puzzles[key] = { state: 'started', hints: 0 };
    else if (v >= 2) puzzles[key] = { state: 'done', hints: v - 2 };
  });
  const reflections = {};
  registry.reflections.forEach((key, n) => {
    const v = rf[n] || 0;
    if (!v) return;
    const def = reflectionFor(files, key, tier);
    const opt = def && def.options[(v & 7) - 1];
    reflections[key] = { choice: opt ? opt.id : null, feel: (v >> 3) & 3 };
  });
  const fromBits = (list, bits) => list.filter((id, n) => (bits[n >> 3] || 0) & (1 << (n % 8)));

  return {
    code, sid, name, tier,
    lang: LANGS[(flags >> 3) & 1],
    date: new Date(EPOCH + days * DAY).toISOString().slice(0, 10),
    sessions,
    puzzles, reflections,
    items: fromBits(registry.items, it),
    achievements: fromBits(registry.achievements, ac),
  };
}

/** A random number that tells the dashboard "this is the same save as last time". Not personal. */
export function newSid() {
  try {
    const a = new Uint8Array(3);
    crypto.getRandomValues(a);
    return ((a[0] << 16) | (a[1] << 8) | a[2]) || 1;
  } catch (e) {
    return Math.floor(Math.random() * 0xfffffe) + 1;
  }
}
