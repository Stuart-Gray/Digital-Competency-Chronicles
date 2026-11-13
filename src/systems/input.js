// Keyboard and touch input, merged into one simple interface:
//   input.dir()        -> { x, y } from arrows / WASD / on-screen D-pad
//   input.on('action') -> Space, Enter, E or the on-screen A button
//   input.on('cancel') -> Escape
//   input.on('look')   -> L: the "Look around" list of nearby people, things and paths
// Walk mode (Settings): "hold" walks while a direction is held; "toggle" starts walking with one
// press and stops with the next, for players who find holding keys or buttons hard (switches too).
// The HTML layer handles its own buttons; this is for moving and talking in the world.

const held = new Set();
const touchHeld = new Set();
const listeners = { action: [], cancel: [], look: [] };
let walkMode = 'hold';
let latched = null; // toggle mode: the direction we keep walking in

export function setWalkMode(mode) { walkMode = mode === 'toggle' ? 'toggle' : 'hold'; latched = null; }

/** Toggle mode: a press starts walking that way; pressing it again (or Space) stops. */
function toggleDir(d) { latched = latched === d ? null : d; }

const DIR_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const ACTION_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE']);

function isTyping(e) {
  const el = e.target;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
function isOnButton(e) {
  const el = e.target;
  return el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SELECT');
}

export function emit(name) {
  for (const fn of listeners[name].slice()) fn();
}

export function on(name, fn) {
  listeners[name].push(fn);
  return () => off(name, fn);
}
export function off(name, fn) {
  listeners[name] = listeners[name].filter((f) => f !== fn);
}

export function dir() {
  const has = (d) => held.has(d) || touchHeld.has(d) || latched === d;
  let x = 0, y = 0;
  if (has('left')) x -= 1;
  if (has('right')) x += 1;
  if (has('up')) y -= 1;
  if (has('down')) y += 1;
  return { x, y };
}

export function clearHeld() { held.clear(); touchHeld.clear(); latched = null; }

window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  const d = DIR_KEYS[e.code];
  if (d) {
    // Arrow keys on a focused button move focus between buttons (see textLayer), so leave those alone.
    if (isOnButton(e) && e.code.startsWith('Arrow')) return;
    if (walkMode === 'toggle') { if (!e.repeat) toggleDir(d); }
    else held.add(d);
    if (e.code.startsWith('Arrow')) e.preventDefault();
    return;
  }
  if (ACTION_KEYS.has(e.code)) {
    if (isOnButton(e)) return; // the browser clicks the focused button instead
    e.preventDefault();
    if (latched) { latched = null; return; } // toggle mode: Space stops walking first
    if (!e.repeat) emit('action');
    return;
  }
  if (e.code === 'Escape') { latched = null; emit('cancel'); }
  if (e.code === 'KeyL' && !e.repeat) emit('look');
});
window.addEventListener('keyup', (e) => {
  const d = DIR_KEYS[e.code];
  if (d) held.delete(d);
});
window.addEventListener('blur', clearHeld);

// ---------- on-screen controls for touch screens ----------
export function isTouchDevice() {
  return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
}

export function buildTouchControls(root, labels) {
  root.innerHTML = '';
  const pad = document.createElement('div');
  pad.className = 'dpad';
  const arrows = { up: '▲', down: '▼', left: '◀', right: '▶' };
  for (const d of ['up', 'down', 'left', 'right']) {
    const b = document.createElement('button');
    b.className = d;
    b.type = 'button';
    b.textContent = arrows[d];
    b.setAttribute('aria-label', labels[d]);
    const press = (e) => { e.preventDefault(); if (walkMode === 'toggle') toggleDir(d); else touchHeld.add(d); };
    const release = (e) => { e.preventDefault(); touchHeld.delete(d); };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.appendChild(b);
  }
  const act = document.createElement('button');
  act.className = 'act';
  act.type = 'button';
  act.textContent = 'A';
  act.setAttribute('aria-label', labels.action);
  act.addEventListener('pointerdown', (e) => { e.preventDefault(); if (latched) { latched = null; return; } emit('action'); });
  root.appendChild(pad);
  root.appendChild(act);
}
