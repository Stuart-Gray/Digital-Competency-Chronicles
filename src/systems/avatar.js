// The player's hero. A "look" is a short list of choices (hairstyle, colours, outfit...).
// This file stacks the chosen parts from assets/sprites/hero_parts.png, swaps the marker
// colours for the player's colours, adds the dark outline, and hands the picture to
// Phaser (the walking sprite) and to the HTML menus (small canvases).
//
// The choices, their names and the ready-made heroes are in content/avatar.json.
// A look holds no personal data: only ids such as { hair: "curly", top: "teal" }.

import { FRAME, FRAMES_PER_ROW, PART_ROWS, HAT_HIDES_HAIR, HAIR_LINE, WAIST_LINE, MARKERS, OUTLINE } from './avatarParts.js';
import { t } from './i18n.js';

/** Every choice in a look, in the order the maker shows them. */
export const KINDS = ['skin', 'eyes', 'body', 'hair', 'hairColor', 'outfit', 'top', 'bottom', 'hat', 'hatColor', 'glasses'];
const COLOUR_KINDS = ['skin', 'eyes', 'hairColor', 'top', 'bottom', 'hatColor'];
export const TEXTURE = 'hero-player';
/** Animation keys are hero<ANIM>-walk-down, hero<ANIM>-idle-left and so on. */
export const ANIM = 'P';
const SHEET_W = FRAME * FRAMES_PER_ROW;

let parts = null;   // { data, width } pixels of the parts sheet
let def = null;     // content/avatar.json
const cache = new Map();
const markerRole = new Map(Object.entries(MARKERS).map(([hex, role]) => [parseInt(hex, 16), role]));

const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (c, other, k) => c.map((v, i) => Math.round(v * (1 - k) + other[i] * k));

/** Called once by the Preload scene with the loaded parts image and content/avatar.json. */
export function init(image, content) {
  def = content;
  cache.clear();
  try {
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    parts = { data: ctx.getImageData(0, 0, c.width, c.height).data, width: c.width };
  } catch (e) {
    parts = null;
    console.error('[avatar] could not read the hero parts sheet', e);
  }
}

/** A word from the "strings" part of content/avatar.json, e.g. text('rows.hair'). */
export function text(path, vars) {
  const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), def && def.strings);
  if (v === undefined) { console.warn('Missing avatar string:', path); return path; }
  return t(v, vars);
}

/** The list of options for one kind of choice: [{ id, name, hex? }]. */
export function options(kind) { return (def && def[kind]) || []; }
function option(kind, id) { return options(kind).find((o) => o.id === id); }
export function optionName(kind, id) { const o = option(kind, id); return o ? t(o.name) : ''; }
export function presetCount() { return ((def && def.presets) || []).length; }
export function quips() { return ((def && def.quips) || []).map((q) => t(q)); }

/** A complete, valid look. Unknown or missing choices fall back to the ready-made hero. */
export function normalize(look, presetIndex = 0) {
  const presets = (def && def.presets) || [];
  const base = presets[((presetIndex | 0) % (presets.length || 1) + (presets.length || 1)) % (presets.length || 1)] || {};
  const out = {};
  for (const kind of KINDS) {
    const want = look && look[kind];
    const list = options(kind);
    out[kind] = list.some((o) => o.id === want) ? want
      : list.some((o) => o.id === base[kind]) ? base[kind]
        : (list[0] && list[0].id);
  }
  return out;
}

export function preset(i) { return normalize(null, i); }

/** The look for a save slot. Saves from before the avatar maker only have a number (0 to 3). */
export function lookOf(slot) {
  return normalize(slot && slot.look, (slot && slot.avatar) || 0);
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

/**
 * A look chosen by chance. Options marked "keep" in content/avatar.json (wheelchair, hijab,
 * turban) are part of who a player is, not a costume: chance never adds or removes them.
 */
export function randomLook(current, rnd = Math.random) {
  const now = normalize(current);
  const out = { ...now };
  for (const kind of COLOUR_KINDS) out[kind] = pick(options(kind), rnd).id;
  out.hair = pick(options('hair'), rnd).id;
  out.outfit = pick(options('outfit'), rnd).id;
  const hatNow = option('hat', now.hat);
  if (!(hatNow && hatNow.keep)) {
    const free = options('hat').filter((o) => !o.keep && o.id !== 'none');
    out.hat = rnd() < 0.5 || !free.length ? 'none' : pick(free, rnd).id;
  }
  const specs = options('glasses').filter((o) => o.id !== 'none');
  out.glasses = rnd() < 0.6 || !specs.length ? 'none' : pick(specs, rnd).id;
  return normalize(out);
}

/** Does this choice show on the hero right now? (No hair colour without hair, and so on.) */
export function applies(look, kind) {
  if (kind === 'hairColor') return look.hair !== 'none' && HAT_HIDES_HAIR[look.hat] !== 'all';
  if (kind === 'hair') return HAT_HIDES_HAIR[look.hat] !== 'all';
  if (kind === 'hatColor') return look.hat !== 'none';
  return true;
}

/** The look in words, for screen readers: "Skin: Tone 3. Hairstyle: Curly. ..." */
export function describe(look) {
  const l = normalize(look);
  return KINDS.filter((k) => applies(l, k) && !(k === 'body' && l.body === 'walk') && !(k === 'glasses' && l.glasses === 'none') && !(k === 'hat' && l.hat === 'none'))
    .map((k) => text('option', { row: text('rows.' + k), name: optionName(k, l[k]) }))
    .join('. ') + '.';
}

// ---------- drawing ----------
function colourTable(look) {
  const hex = (kind) => { const o = option(kind, look[kind]); return rgb(o && o.hex ? o.hex : '#888888'); };
  const base = { skin: hex('skin'), hair: hex('hairColor'), eyes: hex('eyes'), top: hex('top'), bottom: hex('bottom'), hat: hex('hatColor') };
  const table = new Map();
  for (const [key, role] of markerRole) {
    let c;
    if (role === 'mouth') c = [Math.round(base.skin[0] * 0.85), Math.round(base.skin[1] * 0.6), Math.round(base.skin[2] * 0.6)];
    else {
      const [name, tone] = role.split('-');
      c = base[name];
      if (tone === 'shade') c = mix(c, [0, 0, 0], 0.26);
      else if (tone === 'light') c = mix(c, [255, 255, 255], 0.4);
    }
    table.set(key, c);
  }
  return table;
}

/** All 12 frames of a look (down, up, left, right x 3 steps) as one 192x16 canvas. Cached. */
export function sheet(look) {
  const l = normalize(look);
  const key = KINDS.map((k) => l[k]).join('|');
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_W; canvas.height = FRAME;
  if (!parts) return canvas;

  const out = new Uint8ClampedArray(SHEET_W * FRAME * 4);
  const stamp = (row, fromY = 0, toY = FRAME) => {
    if (row == null) return;
    for (let y = fromY; y < toY; y++) {
      let s = ((row * FRAME + y) * parts.width) * 4;
      let d = (y * SHEET_W) * 4;
      for (let x = 0; x < SHEET_W; x++, s += 4, d += 4) {
        if (parts.data[s + 3] > 0) { out[d] = parts.data[s]; out[d + 1] = parts.data[s + 1]; out[d + 2] = parts.data[s + 2]; out[d + 3] = 255; }
      }
    }
  };
  const seated = l.body === 'chair';
  stamp(PART_ROWS.head);
  stamp(PART_ROWS.outfit[l.outfit], 0, seated ? WAIST_LINE : FRAME);
  if (seated) stamp(PART_ROWS.chair);
  const hides = HAT_HIDES_HAIR[l.hat];
  if (hides !== 'all') stamp(PART_ROWS.hair[l.hair], hides === 'top' ? HAIR_LINE : 0);
  stamp(PART_ROWS.hat[l.hat]);
  stamp(PART_ROWS.glasses[l.glasses]);

  // marker colours -> the player's colours
  const table = colourTable(l);
  for (let i = 0; i < out.length; i += 4) {
    if (!out[i + 3]) continue;
    const c = table.get((out[i] << 16) | (out[i + 1] << 8) | out[i + 2]);
    if (c) { out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; }
  }
  // dark outline around each frame (never across the edge into the next frame)
  const line = rgb(OUTLINE);
  const solid = new Uint8Array(SHEET_W * FRAME);
  for (let i = 0; i < solid.length; i++) solid[i] = out[i * 4 + 3] ? 1 : 0;
  for (let y = 0; y < FRAME; y++) {
    for (let x = 0; x < SHEET_W; x++) {
      const i = y * SHEET_W + x;
      if (solid[i]) continue;
      const fx = x % FRAME;
      if ((fx > 0 && solid[i - 1]) || (fx < FRAME - 1 && solid[i + 1]) || (y > 0 && solid[i - SHEET_W]) || (y < FRAME - 1 && solid[i + SHEET_W])) {
        out[i * 4] = line[0]; out[i * 4 + 1] = line[1]; out[i * 4 + 2] = line[2]; out[i * 4 + 3] = 255;
      }
    }
  }
  canvas.getContext('2d').putImageData(new ImageData(out, SHEET_W, FRAME), 0, 0);
  if (cache.size > 300) cache.clear();
  cache.set(key, canvas);
  return canvas;
}

const HEAD = { x: 2, y: 0, size: 12 }; // the close-up used for hairstyle, hat and glasses choices

/** Draws one frame of a look onto a canvas made by node(). */
export function draw(canvas, look, frame = 0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.width === HEAD.size) ctx.drawImage(sheet(look), frame * FRAME + HEAD.x, HEAD.y, HEAD.size, HEAD.size, 0, 0, HEAD.size, HEAD.size);
  else ctx.drawImage(sheet(look), frame * FRAME, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
}

/**
 * A small picture of a hero for the HTML menus.
 * size: '' (16 game pixels), 'big' (24), 'huge' (56), 'head' (a close-up of the head).
 * label: read by screen readers; without one the picture is decoration next to a name.
 */
export function node(look, { size = '', frame = 0, label = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size === 'head' ? HEAD.size : FRAME;
  canvas.className = 'avatar-c' + (size ? ' ' + size : '');
  if (label) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label); } else canvas.setAttribute('aria-hidden', 'true');
  draw(canvas, look, frame);
  return canvas;
}

/** Makes (or repaints) the Phaser texture and walk animations for the player's hero. */
export function applyTexture(scene, look) {
  const src = sheet(look);
  let tex;
  if (scene.textures.exists(TEXTURE)) tex = scene.textures.get(TEXTURE);
  else {
    tex = scene.textures.createCanvas(TEXTURE, SHEET_W, FRAME);
    for (let i = 0; i < FRAMES_PER_ROW; i++) tex.add(i, 0, i * FRAME, 0, FRAME, FRAME);
  }
  tex.context.clearRect(0, 0, SHEET_W, FRAME);
  tex.context.drawImage(src, 0, 0);
  tex.refresh();
  ['down', 'up', 'left', 'right'].forEach((d, di) => {
    const base = di * 3;
    const f = (n) => ({ key: TEXTURE, frame: n });
    if (!scene.anims.exists(`hero${ANIM}-walk-${d}`)) scene.anims.create({ key: `hero${ANIM}-walk-${d}`, frames: [f(base + 1), f(base), f(base + 2), f(base)], frameRate: 8, repeat: -1 });
    if (!scene.anims.exists(`hero${ANIM}-idle-${d}`)) scene.anims.create({ key: `hero${ANIM}-idle-${d}`, frames: [f(base)] });
  });
  return TEXTURE;
}
