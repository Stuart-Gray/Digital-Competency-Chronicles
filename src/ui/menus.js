// Title-screen menus: title, save slots, new adventurer, cycle choice, settings, teacher corner.
// All words come from content/ui.json through ui().

import { el, showScreen, avatarStyle, showPanel, hidePanel } from './textLayer.js';
import { ui, getLang } from '../systems/i18n.js';
import * as save from '../systems/save.js';
import * as speech from '../systems/speech.js';
import { isTouchDevice } from '../systems/input.js';
import { state, updateSettings } from '../systems/state.js';

const AVATARS = 4;
const NAME_MAX = 12;

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(getLang() === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric' });
  } catch (e) { return ''; }
}

function cycleLabel(tier) {
  return tier === 'E3' ? ui('cycle.c3') : ui('cycle.c2');
}

/** Letters only (accents allowed), plus hyphen and apostrophe for names like Marie-Ève or O'Neil. */
export function cleanName(raw) {
  return (raw || '').normalize('NFC').replace(/[^\p{L}'\-]/gu, '').slice(0, NAME_MAX);
}

// ---------- title ----------
export function titleScreen(go) {
  const langRow = el('div', { class: 'row seg', role: 'group', 'aria-label': ui('settings.language') },
    el('button', { class: 'small', lang: 'en', 'aria-pressed': String(getLang() === 'en'), onclick: () => { updateSettings({ lang: 'en' }); titleScreen(go); } }, 'English'),
    el('button', { class: 'small', lang: 'fr', 'aria-pressed': String(getLang() === 'fr'), onclick: () => { updateSettings({ lang: 'fr' }); titleScreen(go); } }, 'Français'));

  showScreen(
    el('h1', {}, ui('title.name'), el('small', {}, ui('title.tagline'))),
    el('div', { class: 'menu' },
      el('button', { class: 'primary', 'data-test': 'play', autofocus: true, onclick: () => slotsScreen(go) }, ui('title.play')),
      el('button', { 'data-test': 'settings', onclick: () => settingsScreen(() => titleScreen(go)) }, ui('title.settings'))),
    langRow,
    save.canSave() ? null : el('p', {}, ui('title.noSave')),
    holdButton(ui('title.teacher'), ui('title.teacherHold'), () => teacherScreen(go), 'corner left'),
  );
}

/** A button that only acts after being held down (keeps students out of the teacher corner). */
function holdButton(label, help, onDone, cls) {
  const fill = el('span', { class: 'fill' });
  let timer = 0, start = 0, raf = 0;
  const HOLD_MS = 1500;
  const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); fill.style.width = '0'; };
  const anim = () => { fill.style.width = Math.min(100, ((performance.now() - start) / HOLD_MS) * 100) + '%'; raf = requestAnimationFrame(anim); };
  const begin = (e) => { e.preventDefault(); start = performance.now(); anim(); timer = setTimeout(() => { stop(); onDone(); }, HOLD_MS); };
  const b = el('button', { class: 'small hold ' + (cls || ''), title: help, 'aria-description': help, 'data-test': 'teacher' }, label, fill);
  b.addEventListener('pointerdown', begin);
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointerleave', stop);
  b.addEventListener('keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) begin(e); });
  b.addEventListener('keyup', (e) => { if (e.code === 'Enter' || e.code === 'Space') stop(); });
  return b;
}

// ---------- save slots ----------
export function slotsScreen(go) {
  const slots = save.listSlots();
  const grid = el('div', { class: 'slots' });
  slots.forEach((s, i) => {
    if (s) {
      const card = el('button', { class: 'slot', 'data-test': 'slot-' + i, onclick: () => go.start(i, s) },
        el('span', { class: 'avatar big', style: avatarStyle(s.avatar, 0, 24) }),
        el('span', { class: 'who' }, s.name || ui('slots.defaultName')),
        el('span', { class: 'meta' }, cycleLabel(s.tier)),
        el('span', { class: 'meta' }, ui('slots.lastPlayed', { date: fmtDate(s.updated) })));
      const change = el('button', { class: 'small', onclick: () => cycleScreen(s.tier, (tier) => { s.tier = tier; save.saveSlot(i, s); slotsScreen(go); }, () => slotsScreen(go)) }, ui('slots.changeCycle'));
      grid.appendChild(el('div', { class: 'slot-wrap' }, card, change));
    } else {
      grid.appendChild(el('div', { class: 'slot-wrap' },
        el('button', { class: 'slot empty', 'data-test': 'slot-' + i, onclick: () => newAdventurer(i, go) },
          el('span', { class: 'avatar big', style: { opacity: 0.25, ...avatarStyle(i % AVATARS, 0, 24) } }),
          el('span', { class: 'who' }, ui('slots.new')))));
    }
  });
  showScreen(
    el('h2', {}, ui('slots.title')),
    grid,
    el('button', { onclick: () => go.title() }, ui('common.back')),
  );
}

// ---------- new adventurer: avatar -> name -> cycle ----------
function newAdventurer(index, go) {
  const draft = { avatar: index % AVATARS, name: '' };

  const pickAvatar = () => {
    const row = el('div', { class: 'row', role: 'group', 'aria-label': ui('newSlot.avatar') });
    for (let a = 0; a < AVATARS; a++) {
      row.appendChild(el('button', {
        class: 'avatar-pick', 'aria-pressed': String(draft.avatar === a), 'aria-label': ui('newSlot.avatarN', { n: a + 1 }),
        'data-test': 'avatar-' + a,
        onclick: () => { draft.avatar = a; pickName(); },
      }, el('span', { class: 'avatar big', style: avatarStyle(a, 0, 24) })));
    }
    showScreen(el('h2', {}, ui('newSlot.avatar')), row, el('button', { onclick: () => slotsScreen(go) }, ui('common.back')));
  };

  const pickName = () => {
    const input = el('input', { type: 'text', maxlength: String(NAME_MAX), autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': ui('newSlot.name'), 'data-test': 'name' });
    input.value = draft.name;
    input.addEventListener('input', () => { const c = cleanName(input.value); if (c !== input.value) input.value = c; });
    const next = () => { draft.name = cleanName(input.value); pickCycle(); };
    input.addEventListener('keydown', (e) => { if (e.code === 'Enter') next(); });
    showScreen(
      el('h2', {}, ui('newSlot.name')),
      el('span', { class: 'avatar big', style: avatarStyle(draft.avatar, 0, 24) }),
      input,
      el('p', {}, ui('newSlot.nameHelp')),
      el('div', { class: 'row' },
        el('button', { 'data-test': 'skip-name', onclick: () => { draft.name = ''; pickCycle(); } }, ui('newSlot.skip')),
        el('button', { class: 'primary', onclick: next }, ui('common.next'))),
      el('button', { class: 'link', onclick: pickAvatar }, ui('common.back')),
    );
    setTimeout(() => input.focus(), 50);
  };

  const pickCycle = () => cycleScreen(null, (tier) => {
    const slot = save.newSlot({ name: draft.name, avatar: draft.avatar, tier, lang: getLang() });
    save.saveSlot(index, slot);
    go.start(index, slot);
  }, pickName);

  pickAvatar();
}

export function cycleScreen(current, onPick, onBack) {
  const btn = (tier, label, grades) => el('button', {
    class: 'cycle-btn' + (current === tier ? ' primary' : ''), 'data-test': 'cycle-' + tier,
    onclick: () => onPick(tier),
  }, label, el('small', {}, grades));
  showScreen(
    el('h2', {}, ui('cycle.question')),
    el('div', { class: 'row' },
      btn('E2', ui('cycle.c2'), ui('cycle.c2grades')),
      btn('E3', ui('cycle.c3'), ui('cycle.c3grades'))),
    el('p', {}, ui('cycle.help')),
    onBack ? el('button', { class: 'link', onclick: onBack }, ui('common.back')) : null,
  );
}

// ---------- settings (title screen or in-game panel) ----------
function settingsBody(rerender) {
  const s = state.settings;
  const seg = (label, key, options) => [
    el('span', {}, label),
    el('div', { class: 'seg', role: 'group', 'aria-label': label },
      options.map(([value, text, lang]) => el('button', {
        class: 'small', lang, 'aria-pressed': String(s[key] === value),
        onclick: () => { updateSettings({ [key]: value }); rerender(); },
      }, text))),
  ];
  const canSpeak = speech.isSupported();
  return el('div', { class: 'settings' },
    seg(ui('settings.language'), 'lang', [['en', 'English', 'en'], ['fr', 'Français', 'fr']]),
    canSpeak ? seg(ui('settings.readAloud'), 'readAloud', [[false, ui('common.off')], [true, ui('common.on')]]) : null,
    seg(ui('settings.music'), 'music', [[false, ui('common.off')], [true, ui('common.on')]]),
    s.music !== false ? seg(ui('settings.musicVolume'), 'musicVolume', [['low', ui('settings.quiet')], ['medium', ui('settings.medium')], ['high', ui('settings.loud')]]) : null,
    seg(ui('settings.textSpeed'), 'textSpeed', [['slow', ui('settings.slow')], ['normal', ui('settings.normal')], ['fast', ui('settings.fast')]]),
    seg(ui('settings.largeText'), 'largeText', [[false, ui('common.off')], [true, ui('common.on')]]),
    seg(ui('settings.highContrast'), 'highContrast', [[false, ui('common.off')], [true, ui('common.on')]]),
    // Tapping where to go always works; the old arrow pad is an option for players who prefer it.
    isTouchDevice() ? seg(ui('settings.arrowPad'), 'arrowPad', [[false, ui('common.off')], [true, ui('common.on')]]) : null,
  );
}

export function settingsScreen(back) {
  const render = () => showScreen(
    el('h2', {}, ui('settings.title')),
    settingsBody(render),
    el('button', { class: 'primary', onclick: back }, ui('common.back')),
  );
  render();
}

export function settingsPanel(back) {
  const render = () => showPanel(el('section', { class: 'card', 'aria-label': ui('settings.title') },
    el('h2', {}, ui('settings.title')),
    settingsBody(render),
    el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: back }, ui('common.back')))), { onCancel: back });
  render();
}

// ---------- teacher corner (milestone 1: manage saves on this device) ----------
export function teacherScreen(go) {
  const slots = save.listSlots();
  const confirmBtn = (label, onConfirm) => {
    let armed = false;
    const b = el('button', { class: 'small', onclick: () => {
      if (!armed) { armed = true; b.textContent = ui('teacher.confirm'); return; }
      onConfirm();
    } }, label);
    return b;
  };
  const list = el('ul', { class: 'list', style: { textAlign: 'left' } });
  slots.forEach((s, i) => {
    if (!s) return;
    list.appendChild(el('li', {}, el('div', { class: 'row', style: { justifyContent: 'space-between' } },
      el('span', {}, `${s.name || ui('slots.defaultName')} · ${cycleLabel(s.tier)} · ${ui('slots.lastPlayed', { date: fmtDate(s.updated) })}`),
      confirmBtn(ui('teacher.clear'), () => { save.clearSlot(i); teacherScreen(go); }))));
  });
  showScreen(
    el('h2', {}, ui('teacher.title')),
    el('p', {}, ui('teacher.intro')),
    list.children.length ? list : el('p', {}, ui('teacher.noSlots')),
    el('div', { class: 'row' },
      list.children.length ? confirmBtn(ui('teacher.clearAll'), () => { save.clearAll(); teacherScreen(go); }) : null,
      el('button', { class: 'primary', onclick: () => go.title() }, ui('common.back'))),
  );
}

export { hidePanel };
