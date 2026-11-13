// The teacher layer inside the game:
// - the Journal's "My thinking" list and its "Share with my teacher" button (students)
// - the teacher corner on the title screen (press and hold): saves on this device with a
//   plain-words progress line, progress codes, the link to the dashboard, and clearing saves.
// All words come from content/teacher.json through tt().

import { el, showScreen, hidePanel } from './textLayer.js';
import { t, ui } from '../systems/i18n.js';
import { tt } from '../systems/teacherText.js';
import * as save from '../systems/save.js';
import * as content from '../systems/content.js';
import * as progress from '../systems/progress.js';
import * as reflect from '../systems/reflect.js';
import { state, updateSettings } from '../systems/state.js';
import { sharePanel } from './share.js';
import * as avatar from '../systems/avatar.js';
import { buildCatalogue, elementState, STATES, STATE_SYMBOL } from '../teacher/model.js';

let catalogue = null;
function cat() { return catalogue || (catalogue = buildCatalogue(content.all())); }

// ---------- Journal (student) ----------

/**
 * Extra parts for the Journal card: reflections so far, questions still waiting, and the share button.
 * opts = { slot, save: () => {}, reopen: () => {} }
 */
export function journalExtras({ slot, save: saveNow, reopen }) {
  const list = reflect.reached(slot);
  const ask = (def) => reflect.open(slot, def).then(() => { saveNow(); reopen(); });
  const rows = list.map(({ def, answer }) => (answer
    ? el('li', { 'data-reflection': progress.keyOf(def) },
      el('span', { class: 'q' }, t(def.prompt)),
      el('span', { class: 'a' }, '✓ ' + reflect.answerText(def, answer), answer.feel ? ' ' + reflect.FEEL_ICON[answer.feel] + ' ' + tt('reflect.feel.' + answer.feel) : ''),
      el('button', { class: 'small', onclick: () => ask(def) }, tt('reflect.change')))
    : el('li', { 'data-reflection': progress.keyOf(def) },
      el('span', { class: 'q' }, t(def.prompt)),
      el('button', { class: 'small primary', 'data-test': 'reflect-answer', onclick: () => ask(def) }, '💭 ' + tt('reflect.answerNow')))));
  return [
    list.length ? [el('h3', {}, tt('reflect.journalTitle')), el('ul', { class: 'list thinking' }, rows)] : null,
    el('button', { 'data-test': 'share', onclick: () => sharePanel(slot, { back: reopen, save: saveNow }) }, '📨 ' + tt('share.button')),
  ];
}

// ---------- teacher corner (title screen) ----------

// The exploring mark is drawn with CSS: the half-circle character is tiny or missing in some fonts.
const stateSymbol = (state) => (state === 'exploring' ? el('span', { class: 'half' }) : STATE_SYMBOL[state]);

/** One save in plain words: each element that has puzzles, with its symbol. */
function progressLine(slot) {
  const summary = progress.summarise(slot, content.all());
  const c = cat();
  const chips = c.activeElements
    .map((code) => ({ code, s: elementState(c, summary, code) }))
    .filter(({ s }) => s.families.length)
    .map(({ code, s }) => el('span', { class: 'chip state-' + s.state, title: `${t(c.elements[code].name)}: ${tt('state.' + s.state)}` },
      el('span', { 'aria-hidden': 'true' }, stateSymbol(s.state), ' '), code,
      el('span', { class: 'sr-only' }, ' ' + tt('state.' + s.state))));
  return el('span', { class: 'chips' }, chips);
}

/** helpers = { cycleLabel, fmtDate } from menus.js */
export function teacherScreen(go, { cycleLabel, fmtDate }) {
  const again = () => teacherScreen(go, { cycleLabel, fmtDate });
  const slots = save.listSlots();
  const confirmBtn = (label, onConfirm) => {
    let armed = false;
    const b = el('button', { class: 'small', onclick: () => {
      if (!armed) { armed = true; b.textContent = ui('teacher.confirm'); return; }
      onConfirm();
    } }, label);
    return b;
  };
  const list = el('ul', { class: 'list saves' });
  slots.forEach((s, i) => {
    if (!s) return;
    list.appendChild(el('li', { 'data-slot': String(i) },
      el('span', { class: 'who' }, avatar.node(avatar.lookOf(s)), el('strong', {}, s.name || ui('slots.defaultName')), ` · ${cycleLabel(s.tier)} · ${ui('slots.lastPlayed', { date: fmtDate(s.updated) })}`),
      progressLine(s),
      el('span', { class: 'row' },
        el('button', { class: 'small', 'data-test': 'corner-code-' + i, onclick: () => sharePanel(s, { teacher: true, save: () => save.saveSlot(i, s), back: () => { hidePanel(); again(); } }) }, tt('corner.code')),
        confirmBtn(ui('teacher.clear'), () => { save.clearSlot(i); again(); }))));
  });
  const on = state.settings.reflections !== false;
  const toggle = (value, label) => el('button', { class: 'small', 'aria-pressed': String(on === value), 'data-test': 'corner-reflect-' + value, onclick: () => { updateSettings({ reflections: value }); again(); } }, label);

  showScreen(
    el('h2', {}, ui('teacher.title')),
    el('p', {}, tt('corner.intro')),
    el('a', { class: 'btn primary', href: './teacher.html', target: '_blank', rel: 'noopener', 'data-test': 'corner-dashboard' }, tt('corner.dashboard')),
    list.children.length ? [el('p', { class: 'legend' }, STATES.map((st) => el('span', {}, el('span', { 'aria-hidden': 'true' }, stateSymbol(st), ' '), tt('state.' + st)))), list] : el('p', {}, ui('teacher.noSlots')),
    el('div', { class: 'row seg', role: 'group', 'aria-label': tt('corner.reflections') },
      el('span', { class: 'label' }, tt('corner.reflections')), toggle(true, ui('common.on')), toggle(false, ui('common.off'))),
    el('div', { class: 'row' },
      list.children.length ? confirmBtn(ui('teacher.clearAll'), () => { save.clearAll(); again(); }) : null,
      el('button', { 'data-test': 'corner-back', onclick: () => go.title() }, ui('common.back'))),
  );
}
