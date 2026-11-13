// "Share with my teacher": shows a save's progress code, as text and as a QR code.
// Nothing is sent anywhere. The student shows the screen, copies the code or saves a small
// text file, and the teacher adds it to the dashboard (teacher.html).

import qrcode from '../vendor/qrcode.js';
import { el, showPanel, announce } from './textLayer.js';
import { tt } from '../systems/teacherText.js';
import { ui } from '../systems/i18n.js';
import * as content from '../systems/content.js';
import * as progress from '../systems/progress.js';

const SVG = 'http://www.w3.org/2000/svg';

/** A QR code as an SVG picture (dark squares on white, with the quiet edge scanners need). */
export function qrSvg(text, label) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Alphanumeric');
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  }
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n + quiet * 2} ${n + quiet * 2}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label || '');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('class', 'qr');
  const bg = document.createElementNS(SVG, 'rect');
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.append(bg, path);
  return svg;
}

/** The progress code for a save. Gives the save its random id the first time (see progress.js). */
export function codeFor(slot, saveSlot) {
  if (!slot.sid) { slot.sid = progress.newSid(); if (saveSlot) saveSlot(); }
  return progress.codeForSlot(slot, content.get('progress').order, content.all());
}

async function copyText(text, node) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Older browsers and some embedded pages: select the code and use the old copy command.
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      return document.execCommand('copy');
    } catch (e2) { return false; }
  }
}

function saveFile(name, text) {
  const url = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }));
  const a = el('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Opens the share card for a save slot.
 * opts = { back: () => {}, save: () => {} (stores the slot), teacher: true for the teacher corner wording }
 */
export function sharePanel(slot, opts = {}) {
  const code = codeFor(slot, opts.save);
  const who = slot.name || ui('slots.defaultName');
  const codeEl = el('output', { class: 'code', 'data-test': 'share-code', 'aria-label': tt('share.codeLabel') }, code);
  const status = el('p', { class: 'feedback note', role: 'status', hidden: true });
  const say = (text) => { status.textContent = text; status.hidden = false; announce(text); };
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `DCC-${(slot.name || 'code').replace(/[^\p{L}\-']/gu, '')}-${date}.txt`;

  const card = el('section', { class: 'card share', 'aria-labelledby': 'share-title' },
    el('h2', { id: 'share-title' }, tt(opts.teacher ? 'share.titleTeacher' : 'share.title', { name: who })),
    el('p', {}, tt(opts.teacher ? 'share.introTeacher' : 'share.intro')),
    el('div', { class: 'share-box' },
      qrSvg(code, tt('share.qrLabel')),
      el('div', { class: 'share-side' },
        el('strong', {}, who),
        codeEl,
        el('div', { class: 'row', style: { justifyContent: 'flex-start' } },
          el('button', { class: 'small', 'data-test': 'share-copy', onclick: async () => say(tt((await copyText(code, codeEl)) ? 'share.copied' : 'share.copyFailed')) }, tt('share.copy')),
          el('button', { class: 'small', 'data-test': 'share-file', onclick: () => { saveFile(fileName, code); say(tt('share.saved')); } }, tt('share.file'))))),
    status,
    el('p', { class: 'help' }, tt('share.whatsInside')),
    el('div', { class: 'actions' }, el('button', { class: 'primary', 'data-test': 'share-back', onclick: opts.back }, tt('share.back'))));
  showPanel(card, { onCancel: opts.back });
}
