// Puzzle-type registry. Each type turns puzzle data into an HTML panel.
// There is no score and no fail state: a wrong try shows a hint and the player tries again.
// Hints used are counted quietly for the teacher view.
//
// Built: choice, sequence, sort, match, spot, predict. Still to come: cocreate (Area 5).
// See docs/content-schema.md for the data each type needs.
//
// Every card is laid out to fit one screen without scrolling (src/ui/cardFit.js). For that to
// work a card says, when it opens, how full it can get: each type lists its hints and notes with
// api.reserve(), and builds the parts that only show later with the class "later" (or
// "later-end" for the finished state). Those are measured but not shown.

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
    const card = el('section', { class: 'card pz', 'aria-labelledby': 'pz-prompt', 'data-puzzle': p.id, 'data-element': p.element, 'data-type': p.type });
    card.appendChild(el('span', { class: 'tag', title: ui('puzzle.elementTag') }, p.element));
    card.appendChild(el('p', { class: 'prompt', id: 'pz-prompt' }, t(p.prompt)));
    const body = el('div', { class: 'body' });
    // The bottom row: on the left the "how to play" line, which makes way for hints and notes;
    // on the right the buttons.
    const help = el('p', { class: 'help', hidden: true });
    const feedback = el('p', { class: 'feedback', role: 'status', hidden: true });
    const talk = el('div', { class: 'talk' }, help, feedback);
    const actions = el('div', { class: 'actions' });
    card.append(body, el('div', { class: 'foot' }, talk, actions));
    const hintText = (text) => ui('puzzle.tryAgain') + ' ' + text;
    const show = (cls, text) => {
      feedback.className = cls;
      feedback.textContent = text;
      feedback.hidden = false;
      help.hidden = true;
      layer.announce(text);
    };

    const api = {
      card, body, actions,
      /** The short "how to play" line. It waits in the bottom row until a hint needs the space. */
      help(text) { help.textContent = text; help.hidden = !text || !feedback.hidden; },
      /**
       * Tells the card how much room its messages can need, so it can be sized once, when it
       * opens (src/ui/cardFit.js). kind is 'hint' or 'note'. The words are measured, never shown.
       */
      reserve(kind, ...texts) {
        for (const text of texts.flat()) {
          if (!text) continue;
          talk.appendChild(el('p', { class: 'sizer', 'aria-hidden': 'true' }, kind === 'hint' ? hintText(text) : text));
        }
      },
      /** The ways this card can be full, for sizing (see the "later-end" class in style.css). */
      phases(...names) { card.dataset.phases = names.join(' '); },
      hint(text) {
        hints++;
        show('feedback', hintText(text));
      },
      clearFeedback() { feedback.hidden = true; help.hidden = !help.textContent; },
      /** A friendly note that is not a hint (an explanation, or "pick one first"). */
      note(text) { show('feedback note', text); },
      solved() {
        body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        card.classList.add('solved');
        show('feedback good', t(p.success));
        actions.innerHTML = '';
        const btn = el('button', { class: 'primary', 'data-test': 'puzzle-continue', onclick: () => { layer.hidePanel(); resolve({ solved: true, hints }); } }, ui('puzzle.continue'));
        actions.appendChild(btn);
        setTimeout(() => btn.focus(), 30);
      },
    };
    api.reserve('good', t(p.success));
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
  api.reserve('hint', options.map((o) => t(o.hint)));
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
  if (pic) { api.body.classList.add('with-picture'); api.body.appendChild(pic); }
  api.body.appendChild(choiceOptions(p, api, p.options));
});

// ---------- predict: watch a short scene, then choose what happens next ----------
register('predict', (p, api) => {
  const strip = el('ol', { class: 'strip' });
  const pic = picture(p);
  // With a picture, the picture sits beside the scene so the question stays in view.
  api.body.appendChild(pic ? el('div', { class: 'predict-top' }, pic, strip) : strip);
  // The whole scene, the question and the answers are built now and shown bit by bit ("later"
  // parts are measured but not shown), so the card is sized once and does not jump.
  const rows = p.scene.map((f) => el('li', { class: 'later' }, icon(f.icon), el('span', {}, t(f.text))));
  strip.append(...rows);
  let i = 0;
  const next = el('button', { class: 'primary', 'data-test': 'predict-next', onclick: () => show() }, ui('puzzle.predict.next'));
  const question = el('p', { class: 'prompt later' }, t(p.question));
  const options = choiceOptions(p, api, p.options);
  options.classList.add('later');
  api.body.append(question, options);
  function show() {
    const f = p.scene[i];
    rows[i++].classList.remove('later');
    layer.announce(t(f.text));
    if (i >= p.scene.length) {
      next.remove();
      question.classList.remove('later');
      options.classList.remove('later');
      setTimeout(() => { const b = options.querySelector('button'); if (b) b.focus(); }, 30);
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

  api.help(ui('puzzle.sort.help'));
  api.reserve('hint', items.map((it) => t(it.hint)));
  api.reserve('note', ui('puzzle.sort.pickFirst'), items.map((it) => t(it.why)));
  // Sized for the start (every item waiting) and for the end (every item in a box).
  api.phases('', 'end');
  for (const it of items) {
    it._btn = el('button', {
      class: 'sort-item', 'data-item': it.id, 'aria-pressed': 'false',
      onclick: () => select(it),
    }, icon(it.icon), el('span', {}, t(it.text)));
    pool.appendChild(it._btn);
  }
  const sorted = (it) => el('li', {}, icon(it.icon), t(it.text));
  for (const b of p.bins) {
    binLists[b.id] = el('ul', { class: 'bin-list' });
    for (const it of items) if (accepts(it, b.id) && (Array.isArray(it.bin) ? it.bin[0] : it.bin) === b.id) { it._ghost = sorted(it); it._ghost.className = 'later-end'; it._ghost.setAttribute('aria-hidden', 'true'); binLists[b.id].appendChild(it._ghost); }
    binsBox.appendChild(el('div', { class: 'bin' },
      el('button', { class: 'bin-btn', 'data-bin': b.id, onclick: () => drop(b) }, icon(b.icon), el('span', {}, t(b.text))),
      binLists[b.id]));
  }
  api.body.append(pool, binsBox);

  function select(it) {
    selected = selected === it ? null : it;
    for (const x of left) x._btn.setAttribute('aria-pressed', String(x === selected));
    api.clearFeedback();
    if (selected) setTimeout(() => { const b = binsBox.querySelector('button'); if (b) b.focus(); }, 20);
  }
  function drop(bin) {
    if (!selected) { api.note(ui('puzzle.sort.pickFirst')); return; }
    const it = selected;
    selected = null;
    if (accepts(it, bin.id)) {
      left.delete(it);
      it._btn.remove();
      if (it._ghost) it._ghost.remove();
      binLists[bin.id].appendChild(sorted(it));
      api.clearFeedback();
      if (it.why) api.note(t(it.why));
      if (!left.size) { api.help(''); api.solved(); return; }
      setTimeout(() => { const b = pool.querySelector('button'); if (b) b.focus(); }, 20);
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
  // Room for the number each card gets once it is paired (measured, not shown).
  const numberRoom = () => el('span', { class: 'n later', 'aria-hidden': 'true' }, '0');
  for (const pr of lefts) {
    pr._l = el('button', { class: 'match-l', 'data-left': pr.id, 'aria-pressed': 'false', onclick: () => pick(pr) }, numberRoom(), icon(pr.left.icon), el('span', {}, t(pr.left.text)));
    leftCol.appendChild(pr._l);
  }
  for (const pr of rights) {
    pr._r = el('button', { class: 'match-r', 'data-right': pr.id, onclick: () => pair(pr) }, numberRoom(), icon(pr.right.icon), el('span', {}, t(pr.right.text)));
    rightCol.appendChild(pr._r);
  }
  api.help(ui('puzzle.match.help'));
  api.reserve('hint', p.pairs.map((pr) => t(pr.hint)));
  api.reserve('note', ui('puzzle.match.pickFirst'), p.pairs.map((pr) => t(pr.why)));
  api.body.append(el('div', { class: 'match' }, leftCol, rightCol));

  function pick(pr) {
    picked = picked === pr ? null : pr;
    for (const x of p.pairs) if (!x._done) x._l.setAttribute('aria-pressed', String(x === picked));
    api.clearFeedback();
    if (picked) setTimeout(() => { const b = rightCol.querySelector('button:not([disabled])'); if (b) b.focus(); }, 20);
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
      for (const b of [pr._l, pr._r]) { b.disabled = true; b.classList.add('paired'); b.querySelector('.n.later').remove(); b.prepend(el('span', { class: 'n' }, n)); }
      if (pr.why) api.note(t(pr.why)); else api.clearFeedback();
      if (done === p.pairs.length) { api.solved(); return; }
      setTimeout(() => { const b = leftCol.querySelector('button:not([disabled])'); if (b) b.focus(); }, 20);
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
  const counter = el('p', { class: 'count' });
  const update = () => { counter.textContent = ui('puzzle.spot.found', { n: found.size, total: clues.length }); };
  // One line per clue, built now and shown when the clue is found ("later" = measured, not shown).
  for (const s of clues) { s._li = el('li', { class: 'later' }, el('strong', {}, t(s.name)), ' · ', t(s.why)); list.appendChild(s._li); }
  api.help(p.help ? t(p.help) : ui('puzzle.spot.help'));
  api.reserve('hint', p.spots.filter((s) => !s.clue).map((s) => t(s.hint)));
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
          s._li.classList.remove('later');
          list.insertBefore(s._li, list.querySelector('.later'));
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
  api.body.classList.add('with-picture');
  api.body.append(fig, el('div', { class: 'side' }, counter, list));
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

  api.reserve('hint', steps.map((s) => t(s.hint || p.hint)));
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
