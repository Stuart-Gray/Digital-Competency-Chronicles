// Puzzle-type registry. Each type turns puzzle data into an HTML panel.
// There is no score and no fail state: a wrong try shows a hint and the player tries again.
// Hints used are counted quietly for the teacher view.
//
// Built so far: "choice" and "sequence". The other types in the build plan
// (sort, spot, match, predict, cocreate) are added the same way in milestone 2.

import * as layer from '../ui/textLayer.js';
import { t, ui } from './i18n.js';

const el = layer.el;
const TYPES = {};

export function register(type, render) { TYPES[type] = render; }
export function has(type) { return !!TYPES[type]; }

/** Opens a puzzle. Resolves with { solved: true, hints } when the player finishes it. */
export function open(p) {
  return new Promise((resolve) => {
    const render = TYPES[p.type];
    if (!render) {
      console.error('No puzzle type', p.type);
      resolve({ solved: false, hints: 0 });
      return;
    }
    let hints = 0;
    const card = el('section', { class: 'card', 'aria-labelledby': 'pz-prompt', 'data-puzzle': p.id, 'data-element': p.element });
    card.appendChild(el('span', { class: 'tag', title: ui('puzzle.elementTag') }, p.element));
    card.appendChild(el('p', { class: 'prompt', id: 'pz-prompt' }, t(p.prompt)));
    const body = el('div', { class: 'body' });
    const feedback = el('p', { class: 'feedback', role: 'status', hidden: true });
    const actions = el('div', { class: 'actions' });
    card.append(body, feedback, actions);

    const api = {
      body, actions,
      hint(text) {
        hints++;
        feedback.className = 'feedback';
        feedback.textContent = ui('puzzle.tryAgain') + ' ' + text;
        feedback.hidden = false;
        layer.announce(feedback.textContent);
      },
      clearFeedback() { feedback.hidden = true; },
      solved() {
        body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        feedback.className = 'feedback good';
        feedback.textContent = t(p.success);
        feedback.hidden = false;
        layer.announce(feedback.textContent);
        actions.innerHTML = '';
        const btn = el('button', { class: 'primary', 'data-test': 'puzzle-continue', onclick: () => { layer.hidePanel(); resolve({ solved: true, hints }); } }, ui('puzzle.continue'));
        actions.appendChild(btn);
        setTimeout(() => btn.focus(), 30);
      },
    };
    render(p, api);
    // Leaving is always allowed: nothing is lost, the puzzle waits for next time.
    const leave = () => { layer.hidePanel(); resolve({ solved: false, hints }); };
    actions.prepend(el('button', { class: 'link', 'data-test': 'puzzle-leave', onclick: leave }, ui('puzzle.later')));
    layer.showPanel(card, { onCancel: leave });
  });
}

function shuffle(list, avoidOrder) {
  const a = list.slice();
  for (let tries = 0; tries < 10; tries++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (!avoidOrder || a.some((x, i) => x !== avoidOrder[i])) break;
  }
  return a;
}

// ---------- choice: pick the best answer ----------
register('choice', (p, api) => {
  const box = el('div', { class: 'options', role: 'group' });
  const options = p.shuffle === false ? p.options : shuffle(p.options);
  for (const o of options) {
    const b = el('button', {
      'data-correct': o.correct ? 'true' : null,
      onclick: () => {
        if (o.correct) { api.solved(); return; }
        b.classList.add('tried');
        b.disabled = true;
        api.hint(t(o.hint));
      },
    }, t(o.text));
    box.appendChild(b);
  }
  api.body.appendChild(box);
});

// ---------- sequence: put the steps in order (tap to place, tap again to take back) ----------
register('sequence', (p, api) => {
  const steps = p.steps;
  const placed = [];        // step objects in the player's order
  const locked = new Set(); // ids confirmed in the right place
  let pool = shuffle(steps, steps);

  const wrap = el('div', { class: 'seq' });
  const leftCol = el('div', {}, el('h3', {}, ui('puzzle.sequence.cards')));
  const rightCol = el('div', {}, el('h3', {}, ui('puzzle.sequence.order')));
  const poolList = el('ul');
  const orderList = el('ol');
  leftCol.appendChild(poolList);
  rightCol.appendChild(orderList);
  wrap.append(leftCol, rightCol);
  api.body.appendChild(wrap);

  const check = el('button', { class: 'primary', 'data-test': 'sequence-check', disabled: true, onclick: onCheck }, ui('puzzle.sequence.check'));
  api.actions.appendChild(check);

  function draw() {
    poolList.innerHTML = '';
    orderList.innerHTML = '';
    for (const s of pool) {
      poolList.appendChild(el('li', {}, el('button', {
        class: 'step', 'data-step': s.id,
        onclick: () => { pool = pool.filter((x) => x !== s); placed.push(s); api.clearFeedback(); draw(); focusNext(); },
      }, t(s.text))));
    }
    for (let i = 0; i < steps.length; i++) {
      const s = placed[i];
      if (!s) {
        orderList.appendChild(el('li', { class: 'slot-empty' }, `${i + 1}.`));
        continue;
      }
      const isLocked = locked.has(s.id);
      orderList.appendChild(el('li', {}, el('button', {
        class: 'step' + (isLocked ? ' locked' : ''), 'data-placed': s.id,
        'aria-label': `${i + 1}. ${t(s.text)}${isLocked ? ' ✓' : ''}`,
        disabled: isLocked,
        onclick: () => { placed.splice(placed.indexOf(s), 1); pool.push(s); draw(); },
      }, el('span', { class: 'n' }, `${i + 1}.${isLocked ? '✓' : ''}`), t(s.text))));
    }
    check.disabled = placed.length !== steps.length;
  }

  function focusNext() {
    const b = poolList.querySelector('button') || check;
    setTimeout(() => b.focus(), 20);
  }

  function onCheck() {
    const firstWrong = placed.findIndex((s, i) => s.id !== steps[i].id);
    if (firstWrong === -1) {
      placed.forEach((s) => locked.add(s.id));
      draw();
      check.remove();
      api.solved();
      return;
    }
    // Keep the right part, send the rest back, and give a hint about the first wrong spot.
    for (let i = 0; i < firstWrong; i++) locked.add(placed[i].id);
    const expected = steps[firstWrong];
    const back = placed.splice(firstWrong);
    pool = pool.concat(back);
    draw();
    api.hint(t(expected.hint || p.hint));
    focusNext();
  }

  draw();
});
