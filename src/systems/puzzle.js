// Puzzle-type registry. Each type turns puzzle data into an HTML panel.
// There is no score and no fail state: a wrong try shows a hint and the player tries again.
// Hints used are counted quietly for the teacher view.
//
// Built: choice, sequence, sort, match, spot, predict. Still to come: cocreate (Area 5).
// See docs/content-schema.md for the data each type needs.

import * as layer from '../ui/textLayer.js';
import { t, ui } from './i18n.js';
import { iconStyle, asset } from '../ui/art.js';

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
    const card = el('section', { class: 'card', 'aria-labelledby': 'pz-prompt', 'data-puzzle': p.id, 'data-element': p.element, 'data-type': p.type });
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
      /** A friendly note that is not a hint (an explanation, or "pick one first"). */
      note(text) {
        feedback.className = 'feedback note';
        feedback.textContent = text;
        feedback.hidden = false;
        layer.announce(text);
      },
      solved() {
        body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        card.classList.add('solved');
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

/** A small pixel icon (from assets/sprites/icons.png), or nothing. */
function icon(name) {
  return name ? el('span', { class: 'icon', 'aria-hidden': 'true', style: iconStyle(name) }) : null;
}

/** An optional picture above the question. Words over it come from content (labels). */
function picture(p) {
  if (!p.picture) return null;
  const fig = el('div', { class: 'picture' }, el('img', { src: asset(p.picture), alt: t(p.pictureAlt) || '' }));
  for (const l of p.labels || []) fig.appendChild(label(l));
  return fig;
}

function label(l) {
  return el('span', { class: 'pic-label', 'aria-hidden': 'true', style: { left: l.x + '%', top: l.y + '%', width: (l.w || 20) + '%' } }, t(l.text));
}

// ---------- choice: pick the best answer ----------
function choiceOptions(p, api, list) {
  const box = el('div', { class: 'options', role: 'group' });
  const options = p.shuffle === false ? list : shuffle(list);
  for (const o of options) {
    const b = el('button', {
      'data-correct': o.correct ? 'true' : null,
      onclick: () => {
        if (o.correct) { api.solved(); return; }
        b.classList.add('tried');
        b.disabled = true;
        api.hint(t(o.hint));
      },
    }, icon(o.icon), el('span', {}, t(o.text)));
    box.appendChild(b);
  }
  return box;
}

register('choice', (p, api) => {
  const pic = picture(p);
  if (pic) api.body.appendChild(pic);
  api.body.appendChild(choiceOptions(p, api, p.options));
});

// ---------- predict: watch a short scene, then choose what happens next ----------
register('predict', (p, api) => {
  const strip = el('ol', { class: 'strip' });
  const pic = picture(p);
  // With a picture, the picture sits beside the scene so the question stays in view.
  api.body.appendChild(pic ? el('div', { class: 'predict-top' }, pic, strip) : strip);
  let i = 0;
  const next = el('button', { class: 'primary', 'data-test': 'predict-next', onclick: () => show() }, ui('puzzle.predict.next'));
  const question = el('p', { class: 'prompt' }, t(p.question));
  function show() {
    const f = p.scene[i++];
    const li = el('li', {}, icon(f.icon), el('span', {}, t(f.text)));
    strip.appendChild(li);
    layer.announce(t(f.text));
    if (i >= p.scene.length) {
      next.remove();
      api.body.append(question, choiceOptions(p, api, p.options));
      setTimeout(() => { const b = api.body.querySelector('.options button'); if (b) b.focus(); }, 30);
    } else {
      setTimeout(() => next.focus(), 30);
    }
  }
  api.actions.appendChild(next);
  show();
});

// ---------- sort: put each item in the right box (tap an item, then tap a box) ----------
register('sort', (p, api) => {
  let selected = null;
  const pool = el('div', { class: 'sort-pool', role: 'group', 'aria-label': ui('puzzle.sort.items') });
  const binsBox = el('div', { class: 'sort-bins' });
  const binLists = {};
  const items = shuffle(p.items);
  const left = new Set(items);
  const accepts = (item, binId) => (Array.isArray(item.bin) ? item.bin : [item.bin]).includes(binId);

  const help = el('p', { class: 'help' }, ui('puzzle.sort.help'));
  for (const it of items) {
    it._btn = el('button', {
      class: 'sort-item', 'data-item': it.id, 'aria-pressed': 'false',
      onclick: () => select(it),
    }, icon(it.icon), el('span', {}, t(it.text)));
    pool.appendChild(it._btn);
  }
  for (const b of p.bins) {
    binLists[b.id] = el('ul', { class: 'bin-list' });
    binsBox.appendChild(el('div', { class: 'bin' },
      el('button', { class: 'bin-btn', 'data-bin': b.id, onclick: () => drop(b) }, icon(b.icon), el('span', {}, t(b.text))),
      binLists[b.id]));
  }
  api.body.append(help, pool, binsBox);

  function select(it) {
    selected = selected === it ? null : it;
    for (const x of left) x._btn.setAttribute('aria-pressed', String(x === selected));
    api.clearFeedback();
    if (selected) setTimeout(() => binsBox.querySelector('button').focus(), 20);
  }
  function drop(bin) {
    if (!selected) { api.note(ui('puzzle.sort.pickFirst')); return; }
    const it = selected;
    selected = null;
    if (accepts(it, bin.id)) {
      left.delete(it);
      it._btn.remove();
      binLists[bin.id].appendChild(el('li', {}, icon(it.icon), t(it.text)));
      api.clearFeedback();
      if (it.why) api.note(t(it.why));
      if (!left.size) { help.remove(); api.solved(); return; }
      setTimeout(() => pool.querySelector('button').focus(), 20);
    } else {
      it._btn.setAttribute('aria-pressed', 'false');
      api.hint(t(it.hint));
      setTimeout(() => it._btn.focus(), 20);
    }
  }
});

// ---------- match: pair each thing on the left with one on the right ----------
register('match', (p, api) => {
  const leftCol = el('div', { class: 'match-col', role: 'group', 'aria-label': t(p.leftTitle) || '' }, p.leftTitle ? el('h3', {}, t(p.leftTitle)) : null);
  const rightCol = el('div', { class: 'match-col', role: 'group', 'aria-label': t(p.rightTitle) || '' }, p.rightTitle ? el('h3', {}, t(p.rightTitle)) : null);
  let picked = null;
  let done = 0;
  const lefts = shuffle(p.pairs), rights = shuffle(p.pairs, lefts);
  for (const pr of lefts) {
    pr._l = el('button', { class: 'match-l', 'data-left': pr.id, 'aria-pressed': 'false', onclick: () => pick(pr) }, icon(pr.left.icon), el('span', {}, t(pr.left.text)));
    leftCol.appendChild(pr._l);
  }
  for (const pr of rights) {
    pr._r = el('button', { class: 'match-r', 'data-right': pr.id, onclick: () => pair(pr) }, icon(pr.right.icon), el('span', {}, t(pr.right.text)));
    rightCol.appendChild(pr._r);
  }
  api.body.append(el('p', { class: 'help' }, ui('puzzle.match.help')), el('div', { class: 'match' }, leftCol, rightCol));

  function pick(pr) {
    picked = picked === pr ? null : pr;
    for (const x of p.pairs) if (!x._done) x._l.setAttribute('aria-pressed', String(x === picked));
    api.clearFeedback();
    if (picked) setTimeout(() => rightCol.querySelector('button:not([disabled])').focus(), 20);
  }
  function pair(pr) {
    if (!picked) { api.note(ui('puzzle.match.pickFirst')); return; }
    const l = picked;
    picked = null;
    l._l.setAttribute('aria-pressed', 'false');
    if (l === pr) {
      pr._done = true;
      done++;
      const n = String(done);
      for (const b of [pr._l, pr._r]) { b.disabled = true; b.classList.add('paired'); b.prepend(el('span', { class: 'n' }, n)); }
      if (pr.why) api.note(t(pr.why)); else api.clearFeedback();
      if (done === p.pairs.length) { api.solved(); return; }
      setTimeout(() => leftCol.querySelector('button:not([disabled])').focus(), 20);
    } else {
      api.hint(t(l.hint));
      setTimeout(() => l._l.focus(), 20);
    }
  }
});

// ---------- spot: find the clues in a picture ----------
register('spot', (p, api) => {
  const fig = picture(p);
  const clues = p.spots.filter((s) => s.clue);
  const found = new Set();
  const list = el('ul', { class: 'list found' });
  const counter = el('p', { class: 'help' });
  const update = () => { counter.textContent = ui('puzzle.spot.found', { n: found.size, total: clues.length }); };
  for (const s of p.spots) {
    const b = el('button', {
      class: 'spot', 'data-spot': s.id, 'data-clue': s.clue ? 'true' : null, 'aria-label': t(s.name),
      style: { left: s.x + '%', top: s.y + '%', width: s.w + '%', height: s.h + '%' },
      onclick: () => {
        if (s.clue) {
          if (found.has(s)) return;
          found.add(s);
          b.classList.add('found');
          b.disabled = true;
          list.appendChild(el('li', {}, el('strong', {}, t(s.name)), ' · ', t(s.why)));
          api.clearFeedback();
          update();
          if (found.size === clues.length) api.solved();
        } else {
          api.hint(t(s.hint));
        }
      },
    });
    fig.appendChild(b);
  }
  update();
  api.body.append(el('p', { class: 'help' }, p.help ? t(p.help) : ui('puzzle.spot.help')), fig, counter, list);
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
