// The HTML layer over the canvas: menus, dialogue box, puzzle panels, HUD, toasts.
// Real HTML text (not canvas text) so Read&Write, screen readers and zoom work.

import * as input from '../systems/input.js';
import * as speech from '../systems/speech.js';
import { getLang } from '../systems/i18n.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const screenEl = $('screen');
const panelEl = $('panel');
const dialogueEl = $('dialogue');
const hudEl = $('hud');
const markerEl = $('marker');
const toastsEl = $('toasts');
const touchEl = $('touch');
const liveEl = $('sr-live');

export const GAME_W = 320;
export const GAME_H = 180;

let textSpeed = 'normal';
const SPEEDS = { slow: 22, normal: 45, fast: 90, instant: Infinity }; // characters per second

// ---------- small DOM helper ----------
/** el('button', { class: 'primary', onclick: fn }, 'Play') */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  if (tag === 'button' && !attrs.type) node.type = 'button';
  return node;
}

// ---------- layout: keep a 16:9 stage that fills the window ----------
export function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let w = vw, h = (vw * 9) / 16;
  if (h > vh) { h = vh; w = (vh * 16) / 9; }
  w = Math.floor(w); h = Math.floor(h);
  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
  document.documentElement.style.setProperty('--u', (w / GAME_W).toFixed(3) + 'px');
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
layout();

export function applySettings(s) {
  document.documentElement.style.setProperty('--text-scale', s.largeText ? '1.25' : '1');
  document.body.classList.toggle('hc', !!s.highContrast);
  textSpeed = s.textSpeed || 'normal';
  speech.setReadAloud(s.readAloud);
}

/** Converts a world position (game pixels on screen) into a CSS position on the stage. */
export function placeMarker(screenX, screenY) {
  if (screenX == null) { markerEl.hidden = true; return; }
  markerEl.hidden = false;
  markerEl.style.left = (screenX / GAME_W) * 100 + '%';
  markerEl.style.top = (screenY / GAME_H) * 100 + '%';
}

/** Screen-reader announcement (does not move focus). */
export function announce(text) {
  liveEl.textContent = '';
  setTimeout(() => { liveEl.textContent = text; }, 30);
}

// ---------- full-screen menus ----------
export function showScreen(...nodes) {
  screenEl.innerHTML = '';
  nodes.flat().forEach((n) => n && screenEl.appendChild(n));
  screenEl.hidden = false;
  focusFirst(screenEl);
}
export function hideScreen() { screenEl.hidden = true; screenEl.innerHTML = ''; }

// ---------- modal panels ----------
export function showPanel(card, { onCancel } = {}) {
  panelEl.innerHTML = '';
  panelEl.appendChild(card);
  panelEl.hidden = false;
  panelEl.onkeydown = (e) => {
    if (e.code === 'Escape' && onCancel) { e.stopPropagation(); onCancel(); }
    arrowNav(e, panelEl);
  };
  focusFirst(card);
}
export function hidePanel() {
  panelEl.hidden = true; panelEl.innerHTML = ''; panelEl.onkeydown = null;
}

export function isBusy() {
  return !dialogueEl.hidden || !panelEl.hidden || !screenEl.hidden;
}

function focusFirst(root) {
  const f = root.querySelector('[autofocus], button:not([disabled]), input');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
}

/** Up/down/left/right arrows move between buttons inside a container. */
export function arrowNav(e, root) {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  const items = [...root.querySelectorAll('button:not([disabled])')].filter((b) => b.offsetParent !== null);
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  const step = e.code === 'ArrowUp' || e.code === 'ArrowLeft' ? -1 : 1;
  const next = items[(i + step + items.length) % items.length];
  next.focus();
  e.preventDefault();
}
screenEl.addEventListener('keydown', (e) => arrowNav(e, screenEl));

// ---------- dialogue box ----------
/**
 * Shows one line of dialogue. Resolves with the chosen choice index,
 * or null when there are no choices.
 */
export function say({ speaker, text, choices }) {
  return new Promise((resolve) => {
    dialogueEl.innerHTML = '';
    dialogueEl.hidden = false;
    touchEl.classList.add('dialogue-open');
    dialogueEl.setAttribute('aria-label', speaker || '');
    if (speaker) dialogueEl.appendChild(el('div', { class: 'speaker' }, speaker));
    const shown = el('span', { class: 'shown-part' });
    const hidden = el('span', { class: 'hidden-part', 'aria-hidden': 'true' }, text);
    const p = el('p', { class: 'text' }, shown, hidden);
    dialogueEl.appendChild(p);
    const more = el('div', { class: 'more', 'aria-hidden': 'true', hidden: true }, '▼');
    dialogueEl.appendChild(more);
    const choiceBox = el('div', { class: 'choices', role: 'group', hidden: true });
    dialogueEl.appendChild(choiceBox);

    announce((speaker ? speaker + ': ' : '') + text);
    speech.speak(text, getLang());
    dialogueEl.tabIndex = -1;
    dialogueEl.focus({ preventScroll: true });

    // Typewriter: reveal the text a few characters at a time.
    let shownCount = 0;
    let typing = true;
    const cps = SPEEDS[textSpeed] || SPEEDS.normal;
    let last = performance.now();
    let raf = 0;
    const tick = (now) => {
      if (!typing) return;
      shownCount = cps === Infinity ? text.length : Math.min(text.length, shownCount + ((now - last) / 1000) * cps);
      last = now;
      const n = Math.floor(shownCount);
      shown.textContent = text.slice(0, n);
      hidden.textContent = text.slice(n);
      if (n >= text.length) finishTyping();
      else raf = requestAnimationFrame(tick);
    };
    const finishTyping = () => {
      typing = false;
      cancelAnimationFrame(raf);
      shown.textContent = text;
      hidden.textContent = '';
      if (choices && choices.length) {
        choiceBox.hidden = false;
        choices.forEach((c, i) => {
          choiceBox.appendChild(el('button', { class: i === 0 ? 'primary' : '', onclick: (e) => { e.stopPropagation(); done(i); } }, c));
        });
        choiceBox.onkeydown = (e) => arrowNav(e, choiceBox);
        setTimeout(() => choiceBox.querySelector('button').focus({ preventScroll: true }), 30);
      } else {
        more.hidden = false;
      }
    };
    const advance = () => {
      if (typing) { finishTyping(); return; }
      if (!choices || !choices.length) done(null);
    };
    const onClick = () => advance();
    const offAction = input.on('action', advance);
    dialogueEl.addEventListener('click', onClick);

    function done(result) {
      offAction();
      dialogueEl.removeEventListener('click', onClick);
      resolve(result);
    }
    raf = requestAnimationFrame(tick);
  });
}

export function closeDialogue() {
  dialogueEl.hidden = true;
  dialogueEl.innerHTML = '';
  touchEl.classList.remove('dialogue-open');
  speech.stop();
}

// ---------- HUD ----------
export function setHud(nodes) {
  hudEl.innerHTML = '';
  if (!nodes) { hudEl.hidden = true; return; }
  nodes.forEach((n) => n && hudEl.appendChild(n));
  hudEl.hidden = false;
}

// ---------- toasts (achievements, notices) ----------
export function toast(title, text, ms = 3500) {
  const node = el('div', { class: 'toast' }, el('span', { class: 't' }, title), text);
  toastsEl.appendChild(node);
  announce(title + '. ' + text);
  setTimeout(() => node.remove(), ms);
}

// ---------- touch controls ----------
export function showTouch(labels) {
  if (!input.isTouchDevice()) return;
  input.buildTouchControls(touchEl, labels);
  touchEl.hidden = false;
}
export function hideTouch() { touchEl.hidden = true; }

/** Sprite position for an avatar in the hero sheet (CSS background). */
export function avatarStyle(avatar, frame = 0, size = 16) {
  return { backgroundPosition: `calc(var(--u) * ${-frame * size}) calc(var(--u) * ${-avatar * size})` };
}
