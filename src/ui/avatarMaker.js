// The avatar maker: pick a ready-made hero, then change its colours and styles.
// Every word comes from content/avatar.json (through avatar.text) or content/ui.json.
//
// Built for a quick start: one tap picks a hero, "Looks good!" has the focus, and
// "Mix it up!" rolls a whole new look. Colour is never the only clue: each row shows the
// name of what is chosen, and every swatch has a spoken label and a check mark.

import { el, showScreen, announce } from './textLayer.js';
import { ui } from '../systems/i18n.js';
import * as avatar from '../systems/avatar.js';
import * as a11y from '../systems/a11y.js';

const TABS = [
  ['body', ['skin', 'eyes', 'body']],
  ['hair', ['hair', 'hairColor']],
  ['clothes', ['outfit', 'top', 'bottom']],
  ['extras', ['hat', 'hatColor', 'glasses']],
];

/** White or black, whichever shows better on a colour (for the check mark on a swatch). */
function inkOn(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 140 ? '#000' : '#fff';
}

/** First screen: a grid of ready-made heroes and a "Surprise me!" button. */
export function pickHero({ selected = -1, onPick, onBack }) {
  const grid = el('div', { class: 'hero-grid', role: 'group', 'aria-label': ui('newSlot.avatar') });
  for (let i = 0; i < avatar.presetCount(); i++) {
    const look = avatar.preset(i);
    grid.appendChild(el('button', {
      class: 'avatar-pick', 'aria-pressed': String(selected === i), 'data-test': 'avatar-' + i,
      'aria-label': avatar.text('heroN', { n: i + 1 }) + '. ' + avatar.describe(look),
      autofocus: selected === i,
      onclick: () => onPick(look, i, false),
    }, avatar.node(look, { size: 'big' })));
  }
  showScreen(
    el('h2', {}, ui('newSlot.avatar')),
    grid,
    el('p', {}, avatar.text('pickHelp')),
    el('div', { class: 'row' },
      el('button', { onclick: onBack }, ui('common.back')),
      el('button', { 'data-test': 'avatar-surprise', onclick: () => onPick(avatar.randomLook(avatar.preset(0)), 0, true) },
        el('span', { 'aria-hidden': 'true' }, '🎲 '), avatar.text('surprise'))),
  );
}

/**
 * Second screen: the maker. onDone gets the finished look.
 * joke: show a funny line straight away (after "Surprise me!").
 */
export function makeLook({ look: startLook, onDone, onBack, joke = false }) {
  let look = avatar.normalize(startLook);
  let tab = TABS[0][0];
  let lastQuip = -1;

  // ----- the big hero on the left: walks on the spot and turns, unless motion is reduced -----
  const preview = avatar.node(look, { size: 'huge', label: avatar.text('preview') });
  preview.setAttribute('data-test', 'look-preview');
  let tick = 0;
  const WALK = [1, 0, 2, 0];
  const TURN = [0, 9, 3, 6]; // first frame of down, right, up, left
  const paint = () => {
    if (a11y.reducedMotion()) { avatar.draw(preview, look, 0); return; }
    avatar.draw(preview, look, TURN[Math.floor(tick / 8) % 4] + WALK[tick % 4]);
  };
  const timer = setInterval(() => {
    if (!preview.isConnected) { clearInterval(timer); return; }
    tick++;
    paint();
  }, 170);

  const quip = el('p', { class: 'maker-quip', 'data-test': 'look-quip' });
  const tellJoke = () => {
    const list = avatar.quips();
    if (!list.length) return;
    let i = Math.floor(Math.random() * list.length);
    if (i === lastQuip) i = (i + 1) % list.length;
    lastQuip = i;
    quip.textContent = list[i];
    announce(list[i]);
  };

  const rowsBox = el('div', { class: 'maker-rows' });
  const refresh = (focus) => {
    paint();
    preview.setAttribute('aria-label', avatar.text('preview') + '. ' + avatar.describe(look));
    drawRows();
    if (focus) {
      const b = rowsBox.querySelector(`[data-kind="${focus.kind}"][data-id="${focus.id}"]`);
      if (b) b.focus({ preventScroll: true });
    }
  };
  const choose = (kind, id) => { look = avatar.normalize({ ...look, [kind]: id }); refresh({ kind, id }); };

  function drawRows() {
    rowsBox.replaceChildren();
    const kinds = TABS.find(([id]) => id === tab)[1];
    for (const kind of kinds) {
      if (!avatar.applies(look, kind)) continue;
      const rowName = avatar.text('rows.' + kind);
      const labelId = 'look-row-' + kind;
      const group = el('div', { class: 'swatches', role: 'group', 'aria-labelledby': labelId });
      for (const o of avatar.options(kind)) {
        const name = avatar.optionName(kind, o.id);
        const attrs = {
          'data-kind': kind, 'data-id': o.id, 'data-test': `look-${kind}-${o.id}`,
          'aria-pressed': String(look[kind] === o.id), 'aria-label': avatar.text('option', { row: rowName, name }), title: name,
          onclick: () => choose(kind, o.id),
        };
        if (o.hex) {
          group.appendChild(el('button', { ...attrs, class: 'swatch', style: { background: o.hex, color: inkOn(o.hex) } }));
        } else {
          // a style (hairstyle, outfit, hat...): show the hero wearing it
          const size = ['hair', 'hat', 'glasses'].includes(kind) ? 'head' : '';
          group.appendChild(el('button', { ...attrs, class: 'swatch style' }, avatar.node({ ...look, [kind]: o.id }, { size })));
        }
      }
      rowsBox.appendChild(el('div', { class: 'maker-row' },
        el('span', { class: 'label', id: labelId }, rowName, el('span', { class: 'chosen' }, ' · ' + avatar.optionName(kind, look[kind]))),
        group));
    }
    // Under a hijab or a turban there is no hair to style: say so instead of showing an empty tab.
    if (!rowsBox.children.length) rowsBox.appendChild(el('p', { class: 'maker-note', 'data-test': 'look-note' }, avatar.text('hairCovered')));
  }

  const tabRow = el('div', { class: 'seg maker-tabs', role: 'group', 'aria-label': avatar.text('makeTitle') });
  const tabButtons = TABS.map(([id]) => el('button', {
    class: 'small', 'data-test': 'look-tab-' + id, 'aria-pressed': String(id === tab),
    onclick: () => {
      tab = id;
      tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(TABS[i][0] === tab)));
      drawRows();
    },
  }, avatar.text('tabs.' + id)));
  tabButtons.forEach((b) => tabRow.appendChild(b));

  const mix = el('button', {
    'data-test': 'look-mix', title: avatar.text('mixHelp'), 'aria-description': avatar.text('mixHelp'),
    onclick: () => { look = avatar.randomLook(look); refresh(); tellJoke(); },
  }, el('span', { 'aria-hidden': 'true' }, '🎲 '), avatar.text('mix'));

  refresh();
  if (joke) tellJoke();
  showScreen(
    el('h2', {}, avatar.text('makeTitle')),
    el('div', { class: 'maker' },
      el('div', { class: 'maker-side' }, preview, mix, quip),
      el('div', { class: 'maker-main' }, tabRow, rowsBox)),
    el('div', { class: 'row' },
      el('button', { 'data-test': 'look-back', onclick: () => { clearInterval(timer); onBack(); } }, ui('common.back')),
      el('button', { class: 'primary', autofocus: true, 'data-test': 'look-done', onclick: () => { clearInterval(timer); onDone(look); } }, avatar.text('done'))),
  );
}
