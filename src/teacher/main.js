// The teacher dashboard (teacher.html). A static page: no account, no server, no tracking.
// Students share a progress code from the game's Journal; the teacher pastes, scans or opens
// codes here, as many as needed, over time. Class lists stay in this browser (see store.js).
//
// The page describes progress in words (not yet, exploring, completed, completed without
// hints). It never shows marks, totals, percentages or rankings: the Ministry content is
// not evaluated. All words come from content/teacher.json.

import { DASHBOARD_FILES } from '../systems/contentFiles.js';
import { t, setLang, getLang, browserLang } from '../systems/i18n.js';
import { setStrings, tt } from '../systems/teacherText.js';
import * as progress from '../systems/progress.js';
import * as store from './store.js';
import * as model from './model.js';
import { addSampleClass } from './sample.js';
import * as scan from './scan.js';

const VIEWS = ['class', 'sheets', 'dimensions', 'time', 'talk', 'guide'];
const FEEL_ICON = { 1: '💬', 2: '🌱', 3: '✋' };
const app = { files: {}, cat: null, registry: null, data: store.load(), view: 'class', guideTier: 'E2', saved: true };
const root = document.getElementById('app');
const dialog = document.getElementById('dialog');

// ---------- small helpers ----------
function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  if (tag === 'button' && !(attrs && attrs.type)) node.type = 'button';
  return node;
}
/** Adds nodes to a parent, skipping the empty ones (lists inside lists are fine). */
const put = (parent, ...nodes) => parent.append(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
const sr = (text) => h('span', { class: 'sr-only' }, text);
const locale = () => (getLang() === 'fr' ? 'fr-CA' : 'en-CA');
function fmtDate(day, long) {
  if (!day) return '';
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
}
const cycle = (tier) => tt('cycle.' + tier);
const cls = () => store.currentClass(app.data);
const nameOf = (s) => store.displayName(s, tt('dash.noName'));
const byName = (a, b) => nameOf(a).localeCompare(nameOf(b), locale());
const students = () => (cls() ? cls().students.slice().sort(byName) : []);
// The exploring mark is drawn with CSS: the half-circle character is tiny or missing in some fonts.
const sym = (state) => (state === 'exploring' ? h('span', { class: 'half' }) : model.STATE_SYMBOL[state]);
const elName = (code) => t(app.cat.elements[code].name);
const save = () => { app.saved = store.persist(app.data); };
const commit = () => { save(); render(); };

function stateMark(state, extra) {
  return h('span', { class: 'mark state-' + state }, h('span', { 'aria-hidden': 'true' }, sym(state)), sr(tt('state.' + state)), extra || null);
}

/** Students of the class grouped by the state of something: { solo: [], done: [], exploring: [], none: [] }. */
function groupByState(fn) {
  const groups = { solo: [], done: [], exploring: [], none: [] };
  for (const s of students()) {
    const r = fn(store.latest(s).data);
    if (r.families.length) groups[r.state].push(s);
  }
  return groups;
}

function nameButton(s) {
  return h('button', { class: 'name', onclick: () => openStudent(s.id) }, nameOf(s));
}

function nameGroups(groups) {
  return h('div', { class: 'groups' }, ['solo', 'done', 'exploring', 'none'].map((state) => h('div', { class: 'group state-' + state },
    h('h4', {}, h('span', { 'aria-hidden': 'true' }, sym(state), ' '), tt('state.' + state)),
    groups[state].length ? h('ul', { class: 'names' }, groups[state].map((s) => h('li', {}, nameButton(s)))) : h('p', { class: 'none' }, tt('dash.nobody')))));
}

// ---------- page frame ----------
function render() {
  document.title = tt('dash.title') + ' · ' + tt('dash.game');
  const c = cls();
  root.innerHTML = '';
  put(root, 
    h('header', { class: 'top' },
      h('div', { class: 'brand' },
        h('span', { class: 'logo', 'aria-hidden': 'true' }, '★'),
        h('div', {}, h('h1', {}, tt('dash.title')), h('p', {}, tt('dash.game')))),
      h('div', { class: 'tools' },
        app.data.classes.length ? h('label', { class: 'pick' }, tt('dash.class'),
          h('select', { 'data-test': 'class-select', onchange: (e) => { app.data.current = e.target.value; commit(); } },
            app.data.classes.map((k) => h('option', { value: k.id, selected: c && k.id === c.id }, k.name)))) : null,
        c ? h('button', { class: 'primary', 'data-test': 'add-codes', onclick: openAdd }, '+ ' + tt('dash.addCodes')) : null,
        h('div', { class: 'seg', role: 'group', 'aria-label': tt('dash.language') },
          ['en', 'fr'].map((l) => h('button', { lang: l, 'aria-pressed': String(getLang() === l), 'data-test': 'lang-' + l, onclick: () => { app.data.lang = l; setLang(l); commit(); } }, l === 'en' ? 'English' : 'Français'))),
        moreMenu())),
    h('p', { class: 'frame-note' }, h('strong', {}, tt('dash.notMarks')), ' ', tt('dash.notMarksMore')),
    app.saved ? null : h('p', { class: 'warn', role: 'alert' }, tt('dash.notSaved')),
    c && c.sample ? h('p', { class: 'warn sample' }, tt('dash.sampleNote')) : null,
  );
  if (!c) { put(root, welcome()); return; }
  if (!c.students.length) { put(root, emptyClass()); put(root, footer()); return; }
  put(root, 
    h('nav', { class: 'tabs', role: 'tablist', 'aria-label': tt('dash.views') },
      VIEWS.map((v) => h('button', { role: 'tab', 'aria-selected': String(app.view === v), 'data-test': 'tab-' + v, onclick: () => { app.view = v; render(); } }, tt('dash.tab.' + v)))),
    h('main', { id: 'view', class: 'view-' + app.view, role: 'tabpanel' }, VIEW_FN[app.view]()),
    footer(),
  );
}

// The single-file preview build has no index.html beside it, so it shows no link back to the game.
function footer() {
  return h('footer', {}, h('p', {}, tt('dash.privacy')),
    h('p', {}, window.DCC_INLINE ? null : h('a', { href: './index.html' }, tt('dash.toGame')), window.DCC_INLINE ? null : ' · ', h('a', { href: (app.files.teacher.links || {}).guide || './docs/teacher-guide.md', target: '_blank', rel: 'noopener' }, tt('dash.toGuide'))));
}

function moreMenu() {
  const c = cls();
  const item = (label, fn, test) => h('button', { 'data-test': test, onclick: (e) => { e.target.closest('details').open = false; fn(); } }, label);
  return h('details', { class: 'more' },
    h('summary', { 'data-test': 'more' }, tt('dash.more')),
    h('div', { class: 'menu' },
      c && c.students.length ? item(tt('dash.print'), () => window.print(), 'print') : null,
      c && c.students.length ? item(tt('dash.csv'), exportCsv, 'csv') : null,
      c ? item(tt('dash.backup'), exportBackup, 'backup') : null,
      item(tt('dash.restore'), () => document.getElementById('restore-file').click(), 'restore'),
      h('hr', {}),
      item(tt('dash.newClass'), () => openClassName(null), 'new-class'),
      c ? item(tt('dash.rename'), () => openClassName(c), 'rename-class') : null,
      item(tt('dash.trySample'), addSample, 'sample'),
      c ? item(tt('dash.deleteClass'), () => openConfirm(tt('dash.deleteClassAsk', { name: c.name }), () => { store.removeClass(app.data, c.id); commit(); }), 'delete-class') : null));
}

function steps() {
  return h('ol', { class: 'steps' }, [1, 2, 3].map((n) => h('li', {}, h('strong', {}, tt(`dash.step${n}`)), ' ', tt(`dash.step${n}More`))));
}

function welcome() {
  return h('main', { class: 'welcome' },
    h('h2', {}, tt('dash.welcome')),
    h('p', {}, tt('dash.welcomeMore')),
    steps(),
    h('div', { class: 'row' },
      h('button', { class: 'primary', 'data-test': 'first-class', onclick: () => openClassName(null) }, tt('dash.makeClass')),
      h('button', { 'data-test': 'first-sample', onclick: addSample }, tt('dash.trySample'))),
    footer());
}

function emptyClass() {
  return h('main', { class: 'welcome' },
    h('h2', {}, tt('dash.emptyClass', { name: cls().name })),
    steps(),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: openAdd }, '+ ' + tt('dash.addCodes'))));
}

function addSample() {
  addSampleClass(app.data, app.cat, app.registry, tt('dash.sampleName'));
  app.view = 'class';
  commit();
}

// ---------- view: class grid ----------
function viewClass() {
  const cat = app.cat;
  const areas = cat.areas.map((a) => ({ a, codes: a.elements.filter((c) => cat.activeElements.includes(c)) })).filter((x) => x.codes.length);
  const codes = areas.flatMap((x) => x.codes);
  const badges = (summary) => summary.items.filter((id) => cat.items[id] && cat.items[id].kind === 'badge');

  const head = h('thead', {},
    h('tr', {},
      h('th', { rowspan: '2', scope: 'col', class: 'who' }, tt('dash.student')),
      areas.map(({ a, codes: cs }) => h('th', { colspan: String(cs.length), scope: 'colgroup', class: 'area' }, tt('dash.sheetN', { n: a.id }), h('small', {}, t(a.title)))),
      h('th', { rowspan: '2', scope: 'col' }, tt('dash.badges')),
      h('th', { rowspan: '2', scope: 'col' }, tt('dash.lastPlayed'))),
    h('tr', {}, codes.map((code) => h('th', { scope: 'col', class: 'el' },
      h('button', { title: elName(code), 'aria-label': `${code}: ${elName(code)}`, onclick: () => { app.view = 'guide'; app.jump = code; render(); } }, code)))));

  const body = h('tbody', {}, students().map((s) => {
    const sum = store.latest(s).data;
    const answers = model.reflectionAnswers(cat, sum);
    return h('tr', { 'data-student': s.name },
      h('th', { scope: 'row', class: 'who' }, nameButton(s), h('span', { class: 'cycle' }, cycle(sum.tier))),
      codes.map((code) => {
        const r = model.elementState(cat, sum, code);
        if (!r.families.length) return h('td', { class: 'na', title: tt('dash.notForCycle') }, h('span', { 'aria-hidden': 'true' }, '–'), sr(tt('dash.notForCycle')));
        const mine = answers.filter((x) => x.element === code);
        const extra = [
          mine.length ? h('span', { class: 'tiny', title: tt('dash.hasReflection') }, h('span', { 'aria-hidden': 'true' }, '💭'), sr(tt('dash.hasReflection'))) : null,
          mine.some((x) => x.feel === 3) ? h('span', { class: 'tiny', title: tt('dash.askedHelp') }, h('span', { 'aria-hidden': 'true' }, '✋'), sr(tt('dash.askedHelp'))) : null,
        ];
        return h('td', { class: 'cell state-' + r.state, 'data-el': code, 'data-state': r.state }, h('button', { title: `${elName(code)}: ${tt('state.' + r.state)}`, onclick: () => openStudent(s.id) }, stateMark(r.state, extra)));
      }),
      h('td', { class: 'badges' }, badges(sum).length ? badges(sum).map((id) => h('span', { class: 'badge' }, '🏅 ' + t(cat.items[id].name))) : h('span', { class: 'muted' }, '–')),
      h('td', { class: 'date' }, fmtDate(sum.date)));
  }));

  return [
    h('h2', {}, cls().name),
    h('p', { class: 'lead' }, tt('dash.gridLead')),
    h('div', { class: 'scroll' }, h('table', { class: 'grid', 'data-test': 'grid' }, head, body)),
    legend(),
  ];
}

function legend() {
  return h('ul', { class: 'legend', 'aria-label': tt('dash.legend') },
    model.STATES.map((s) => h('li', {}, h('span', { class: 'mark state-' + s, 'aria-hidden': 'true' }, sym(s)), ' ', tt('state.' + s))),
    h('li', {}, '💭 ', tt('dash.hasReflection')),
    h('li', {}, '✋ ', tt('dash.askedHelp')));
}

// ---------- view: by sheet ----------
function viewSheets() {
  const cat = app.cat;
  const withContent = cat.areas.filter((a) => a.elements.some((c) => cat.activeElements.includes(c)));
  const later = cat.areas.filter((a) => !withContent.includes(a));
  return [
    h('h2', {}, tt('dash.tab.sheets')),
    h('p', { class: 'lead' }, tt('dash.sheetsLead')),
    withContent.map((a) => h('section', { class: 'card', 'data-area': a.id },
      h('h3', {}, tt('dash.sheetN', { n: a.id }) + ': ' + t(a.title)),
      h('p', { class: 'dims' }, tt('dash.dimsFor'), ' ', a.dcf.map((d) => dimChip(d))),
      a.elements.filter((c) => cat.activeElements.includes(c)).map((code) => h('div', { class: 'element', 'data-el': code },
        h('h4', { class: 'el-title' }, h('span', { class: 'code' }, code), ' ', elName(code)),
        nameGroups(groupByState((sum) => model.elementState(cat, sum, code))))))),
    later.length ? h('p', { class: 'muted' }, tt('dash.sheetsLater'), ' ', later.map((a) => `${a.id} (${t(a.title)})`).join(' · ')) : null,
  ];
}

function dimChip(id) {
  const d = app.cat.dimensions[id];
  return h('span', { class: 'chip' + (d.core ? ' core' : ''), title: t(d.name) }, `${id} ${t(d.short)}`);
}

// ---------- view: by dimension ----------
function viewDimensions() {
  const cat = app.cat;
  const dims = Object.values(cat.dimensions);
  const active = dims.filter((d) => d.families.length);
  const idle = dims.filter((d) => !d.families.length);
  return [
    h('h2', {}, tt('dash.tab.dimensions')),
    h('p', { class: 'lead' }, tt('dash.dimsLead')),
    active.map((d) => h('section', { class: 'card', 'data-dim': d.id },
      h('h3', {}, h('span', { class: 'code' }, d.id), ' ', t(d.name), d.core ? h('span', { class: 'chip core' }, tt('dash.core')) : null),
      h('p', { class: 'dims' }, tt('dash.elementsFor'), ' ', d.elements.map((c) => h('span', { class: 'chip', title: elName(c) }, c + ' ' + elName(c)))),
      nameGroups(groupByState((sum) => model.dimensionState(cat, sum, d.id))))),
    idle.length ? h('section', { class: 'card quiet' },
      h('h3', {}, tt('dash.dimsIdle')),
      h('ul', { class: 'plain' }, idle.map((d) => h('li', {}, h('span', { class: 'code' }, d.id), ' ', t(d.name), d.id === 'D4' ? h('span', { class: 'muted' }, ' · ' + tt('dash.d4')) : null)))) : null,
  ];
}

// ---------- view: over time ----------
function changeText(ch) {
  const cat = app.cat;
  if (ch.kind === 'element') return `${ch.element} ${elName(ch.element)}: ${tt('state.' + ch.from)} → ${tt('state.' + ch.to)}`;
  if (ch.kind === 'reflection') { const r = cat.reflections[ch.key]; return tt('dash.newReflection') + (r.element ? ` (${r.element})` : ''); }
  if (ch.kind === 'item') return tt('dash.earned', { what: t(cat.items[ch.id].name) });
  if (ch.kind === 'quest') { const q = cat.quests.find((x) => x.id === ch.id); return tt('dash.helped', { what: q && q.title ? t(q.title) : ch.id }); }
  return '';
}

function viewTime() {
  const cat = app.cat;
  const days = {};
  for (const s of students()) {
    s.snapshots.forEach((snap, i) => {
      const list = model.changes(cat, i ? s.snapshots[i - 1].data : null, snap.data);
      (days[snap.date] = days[snap.date] || []).push({ s, list, first: i === 0 });
    });
  }
  const dates = Object.keys(days).sort().reverse();
  return [
    h('h2', {}, tt('dash.tab.time')),
    h('p', { class: 'lead' }, tt('dash.timeLead')),
    dates.map((day) => h('section', { class: 'card day', 'data-day': day },
      h('h3', {}, fmtDate(day, true)),
      h('ul', { class: 'feed' }, days[day].map(({ s, list, first }) => h('li', {},
        nameButton(s), first ? h('span', { class: 'chip' }, tt('dash.firstCode')) : null,
        list.length ? h('ul', {}, list.map((ch) => h('li', {}, changeText(ch)))) : h('span', { class: 'muted' }, ' ' + tt(first ? 'dash.justStarted' : 'dash.noChange'))))))),
  ];
}

// ---------- view: conversations ----------
function lookFors(code) {
  const el = app.cat.elements[code];
  if (!el || !el.lookFors.length) return null;
  return h('details', { class: 'lookfors' }, h('summary', {}, tt('dash.lookFors') + ' · ' + code), h('ul', {}, el.lookFors.map((x) => h('li', {}, t(x)))));
}

function famLabel(key, tier) {
  const fam = app.cat.families[key];
  return fam ? t(model.versionFor(fam, tier).application) : key;
}

function viewTalk() {
  const cat = app.cat;
  const help = [], hints = [], started = [], explain = {};
  for (const s of students()) {
    const sum = store.latest(s).data;
    for (const p of model.talkingPoints(cat, sum)) ({ help, hints, started })[p.kind].push({ s, sum, p });
    for (const r of model.reflectionAnswers(cat, sum)) {
      if (r.feel === 1) { const k = r.element || 'area' + r.area; (explain[k] = explain[k] || { r, list: [] }).list.push(s); }
    }
  }
  const where = (p) => (p.element ? `${p.element} ${elName(p.element)}` : tt('dash.sheetN', { n: p.area }));
  const block = (title, lead, items, test) => h('section', { class: 'card', 'data-test': test },
    h('h3', {}, title), h('p', { class: 'lead' }, lead),
    items.length ? h('ul', { class: 'talk' }, items) : h('p', { class: 'muted' }, tt('dash.nobodyNow')));
  return [
    h('h2', {}, tt('dash.tab.talk')),
    h('p', { class: 'lead' }, tt('dash.talkLead')),
    block('✋ ' + tt('dash.talkHelp'), tt('dash.talkHelpLead'), help.map(({ s, p }) => h('li', {}, nameButton(s), ' · ', where(p), p.element ? lookFors(p.element) : null)), 'talk-help'),
    block('💡 ' + tt('dash.talkHints'), tt('dash.talkHintsLead'), hints.map(({ s, sum, p }) => h('li', {}, nameButton(s), ' · ', where(p),
      h('ul', {}, p.families.map((k) => h('li', {}, famLabel(k, sum.tier)))), lookFors(p.element))), 'talk-hints'),
    block('… ' + tt('dash.talkStarted'), tt('dash.talkStartedLead'), started.map(({ s, sum, p }) => h('li', {}, nameButton(s), ' · ', where(p),
      h('ul', {}, p.families.map((k) => h('li', {}, famLabel(k, sum.tier)))))), 'talk-started'),
    block('💬 ' + tt('dash.talkExplain'), tt('dash.talkExplainLead'), Object.values(explain).map(({ r, list }) => h('li', {},
      h('strong', {}, r.element ? `${r.element} ${elName(r.element)}` : tt('dash.sheetN', { n: r.area })), ': ', list.map((s, i) => [i ? ', ' : '', nameButton(s)]))), 'talk-explain'),
  ];
}

// ---------- view: prompts and look-fors ----------
function viewGuide() {
  const cat = app.cat;
  const tier = app.guideTier;
  const areas = cat.areas.filter((a) => a.elements.some((c) => cat.activeElements.includes(c)));
  const out = [
    h('h2', {}, tt('dash.tab.guide')),
    h('p', { class: 'lead' }, tt('dash.guideLead')),
    h('div', { class: 'seg', role: 'group', 'aria-label': tt('dash.showCycle') },
      h('span', { class: 'label' }, tt('dash.showCycle')),
      ['E2', 'E3'].map((x) => h('button', { 'aria-pressed': String(tier === x), 'data-test': 'guide-' + x, onclick: () => { app.guideTier = x; render(); } }, cycle(x)))),
    areas.map((a) => {
      const pr = cat.prompts[a.id];
      const areaRefl = Object.values(cat.reflections).filter((r) => !r.element && r.area === a.id && r.versions[tier]);
      return h('section', { class: 'card', 'data-area': a.id },
        h('h3', {}, tt('dash.sheetN', { n: a.id }) + ': ' + t(a.title)),
        pr && pr.before.length ? [h('h4', {}, tt('dash.before')), h('ul', {}, pr.before.map((x) => h('li', {}, t(x))))] : null,
        pr && pr.after.length ? [h('h4', {}, tt('dash.after')), h('ul', {}, pr.after.map((x) => h('li', {}, t(x))))] : null,
        a.elements.filter((c) => cat.activeElements.includes(c)).map((code) => {
          const el = cat.elements[code];
          const fams = el.families.map((k) => cat.families[k]).filter((f) => f.versions[tier]);
          const refl = el.reflections.map((k) => cat.reflections[k]).filter((r) => r.versions[tier]);
          return h('div', { class: 'element', id: 'el-' + code, 'data-el': code },
            h('h4', { class: 'el-title' }, h('span', { class: 'code' }, code), ' ', t(el.name), ' ', el.dcf.map((d) => dimChip(d))),
            el.lookFors.length ? [h('h5', {}, tt('dash.lookFors')), h('ul', {}, el.lookFors.map((x) => h('li', {}, t(x))))] : null,
            fams.length ? [h('h5', {}, tt('dash.inGame')), h('ul', { class: 'apps' }, fams.map((f) => {
              const p = f.versions[tier];
              return h('li', {}, h('span', { class: 'chip' }, tt('dash.type.' + p.type)), ' ', t(p.application),
                p.teacherNote ? h('p', { class: 'ask' }, t(p.teacherNote)) : null);
            }))] : h('p', { class: 'muted' }, tt('dash.notForCycle')),
            refl.map((r) => reflectionBox(r.versions[tier])));
        }),
        areaRefl.map((r) => reflectionBox(r.versions[tier])));
    }),
  ];
  if (app.jump) { const id = 'el-' + app.jump; app.jump = null; setTimeout(() => { const n = document.getElementById(id); if (n) n.scrollIntoView({ block: 'start' }); }, 30); }
  return out;
}

function reflectionBox(def) {
  return h('div', { class: 'reflection' },
    h('h5', {}, '💭 ' + tt('dash.thinkingTime')),
    h('p', { class: 'q' }, t(def.prompt)),
    h('ul', {}, def.options.map((o) => h('li', {}, t(o.text)))));
}

const VIEW_FN = { class: viewClass, sheets: viewSheets, dimensions: viewDimensions, time: viewTime, talk: viewTalk, guide: viewGuide };

// ---------- dialogs ----------
let whenClosed = null;
function openDialog(label, nodes, onClose) {
  dialog.innerHTML = '';
  dialog.setAttribute('aria-label', label);
  put(dialog, nodes);
  whenClosed = onClose || null;
  if (!dialog.open) dialog.showModal();
}
/** Runs once per dialog, whether it was closed with a button or with the Escape key. */
function afterClose() {
  const fn = whenClosed;
  whenClosed = null;
  if (fn) fn();
}
dialog.addEventListener('close', afterClose);
function closeDialog() {
  if (dialog.open) dialog.close();
  afterClose();
}
const closeBtn = (label) => h('button', { class: 'primary', 'data-test': 'dialog-close', onclick: closeDialog }, label || tt('dash.close'));

function openConfirm(question, onYes) {
  openDialog(question, [
    h('p', {}, question),
    h('div', { class: 'row end' },
      h('button', { 'data-test': 'confirm-no', onclick: closeDialog }, tt('dash.cancel')),
      h('button', { class: 'primary danger', 'data-test': 'confirm-yes', onclick: () => { closeDialog(); onYes(); } }, tt('dash.yesDelete'))),
  ]);
}

function openClassName(existing) {
  const input = h('input', { type: 'text', maxlength: '40', value: existing ? existing.name : '', 'data-test': 'class-name', placeholder: tt('dash.classExample') });
  const go = () => {
    const name = input.value.trim() || tt('dash.classDefault');
    if (existing) existing.name = name; else store.addClass(app.data, name);
    closeDialog();
    commit();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  openDialog(tt('dash.className'), [
    h('h2', {}, tt(existing ? 'dash.rename' : 'dash.newClass')),
    h('label', {}, tt('dash.className'), input),
    h('p', { class: 'muted' }, tt('dash.classNameHelp')),
    h('div', { class: 'row end' }, h('button', { onclick: closeDialog }, tt('dash.cancel')), h('button', { class: 'primary', 'data-test': 'class-save', onclick: go }, tt('dash.save'))),
  ]);
  setTimeout(() => input.focus(), 30);
}

// ---------- adding codes ----------
function importCodes(codes, results) {
  for (const raw of codes) {
    try {
      const summary = progress.decode(raw, app.registry, app.files);
      const { status, student } = store.addSnapshot(cls(), summary, summary.code);
      results.push({ status, student, summary });
    } catch (e) {
      results.push({ status: e.message === 'damaged' || e.message === 'newer' ? e.message : 'not-a-code', raw });
    }
  }
  save();
}

function openAdd() {
  const results = [];
  let stopCamera = null;
  const out = h('div', { class: 'results', 'aria-live': 'polite', 'data-test': 'import-results' });
  const text = h('textarea', { rows: '4', 'data-test': 'paste', placeholder: 'DCC1-…', 'aria-label': tt('dash.pasteLabel') });
  const video = h('video', { muted: true, hidden: true });
  const camNote = h('p', { class: 'muted', hidden: true });

  const showResults = () => {
    out.innerHTML = '';
    if (!results.length) return;
    put(out, h('h3', {}, tt('dash.results')), h('ul', {}, results.slice().reverse().map((r) => {
      if (!r.student) return h('li', { class: 'bad', 'data-status': r.status }, '✗ ', tt('dash.result.' + r.status), r.raw ? h('code', {}, ' ' + String(r.raw).slice(0, 24) + '…') : null);
      const initial = h('input', { type: 'text', maxlength: '2', size: '2', value: r.student.initial || '', 'aria-label': tt('dash.initialFor', { name: r.student.name || tt('dash.noName') }), 'data-test': 'initial' });
      initial.addEventListener('input', () => { initial.value = store.cleanInitial(initial.value); r.student.initial = initial.value; save(); });
      return h('li', { class: 'ok', 'data-status': r.status }, '✓ ', h('strong', {}, r.student.name || tt('dash.noName')), ` · ${cycle(r.summary.tier)} · ${fmtDate(r.summary.date)} · `, tt('dash.result.' + r.status),
        h('label', { class: 'initial' }, tt('dash.initial'), initial));
    })));
  };
  const add = (codes) => { importCodes(codes, results); showResults(); };
  const addText = (raw) => {
    const codes = progress.findCodes(raw);
    if (codes.length) add(codes); else { results.push({ status: 'not-a-code', raw: String(raw).trim() }); showResults(); }
  };

  const onFiles = async (files) => {
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        let found = null;
        try { found = await scan.readImageFile(f); } catch (e) { found = null; }
        if (found) addText(found); else { results.push({ status: 'no-qr', raw: f.name }); showResults(); }
      } else {
        addText(await f.text());
      }
    }
  };
  const fileInput = h('input', { type: 'file', multiple: true, accept: '.txt,text/plain,image/*', hidden: true, 'data-test': 'code-files', onchange: (e) => { onFiles([...e.target.files]); e.target.value = ''; } });

  const toggleCamera = async (btn) => {
    if (stopCamera) { stopCamera(); stopCamera = null; video.hidden = true; btn.textContent = tt('dash.scan'); return; }
    camNote.hidden = false; camNote.textContent = tt('dash.cameraStarting');
    try {
      stopCamera = await scan.startCamera(video, (found) => addText(found));
      video.hidden = false; btn.textContent = tt('dash.scanStop'); camNote.textContent = tt('dash.cameraHelp');
    } catch (e) {
      camNote.textContent = tt('dash.cameraFailed');
    }
  };

  const slots = deviceSlots();
  openDialog(tt('dash.addCodes'), [
    h('h2', {}, tt('dash.addCodes')),
    h('p', {}, tt('dash.addLead')),
    h('section', {},
      h('h3', {}, tt('dash.paste')),
      text,
      h('button', { class: 'primary', 'data-test': 'paste-add', onclick: () => { if (text.value.trim()) { addText(text.value); text.value = ''; } } }, tt('dash.pasteAdd'))),
    h('section', { class: 'row start' },
      scan.cameraAvailable() ? h('button', { 'data-test': 'scan', onclick: (e) => toggleCamera(e.currentTarget) }, tt('dash.scan')) : null,
      h('button', { 'data-test': 'open-files', onclick: () => fileInput.click() }, tt('dash.files')), fileInput,
      slots.length ? h('button', { 'data-test': 'this-device', onclick: () => add(slots.map((s) => s.code)) }, tt('dash.thisDevice', { n: slots.length })) : null),
    camNote, video, out,
    h('div', { class: 'row end' }, closeBtn(tt('dash.done'))),
  ], () => { if (stopCamera) stopCamera(); render(); });
  setTimeout(() => text.focus(), 30);
}

/** Saves made by the game in this same browser (a shared class device, or the teacher's own try-out). */
function deviceSlots() {
  const out = [];
  for (let i = 0; i < 5; i++) {
    try {
      const slot = JSON.parse(window.localStorage.getItem('dcc.v1.slot' + i));
      if (!slot) continue;
      if (!slot.sid) { slot.sid = progress.newSid(); window.localStorage.setItem('dcc.v1.slot' + i, JSON.stringify(slot)); }
      out.push({ slot, code: progress.codeForSlot(slot, app.registry, app.files) });
    } catch (e) { /* no saves here, or storage is blocked */ }
  }
  return out;
}

// ---------- one student ----------
function openStudent(id) {
  const cat = app.cat;
  const s = cls().students.find((x) => x.id === id);
  if (!s) return;
  const sum = store.latest(s).data;
  const answers = model.reflectionAnswers(cat, sum);
  const points = model.talkingPoints(cat, sum);
  const codes = cat.activeElements.filter((c) => model.elementState(cat, sum, c).families.length);
  const quests = model.questStates(cat, sum).filter((q) => q.done);
  const items = sum.items.filter((x) => cat.items[x]);
  const achievements = sum.achievements.filter((x) => cat.achievements[x]);

  const initial = h('input', { type: 'text', maxlength: '2', size: '2', value: s.initial || '', 'data-test': 'student-initial' });
  initial.addEventListener('input', () => { initial.value = store.cleanInitial(initial.value); s.initial = initial.value; save(); });

  const famLine = (f) => {
    const label = f.state === 'done' ? (f.hints ? tt('dash.doneHints', { n: f.hints }) : tt('state.solo')) : f.state === 'started' ? tt('dash.started') : tt('state.none');
    const st = f.state === 'done' ? (f.hints ? 'done' : 'solo') : f.state === 'started' ? 'exploring' : 'none';
    return h('li', {}, h('span', { class: 'mark state-' + st, 'aria-hidden': 'true' }, sym(st)), ' ', famLabel(f.key, sum.tier), h('span', { class: 'muted' }, ' · ' + label));
  };

  const journey = s.snapshots.length > 1 ? h('section', {},
    h('h3', {}, tt('dash.journey')),
    h('div', { class: 'scroll' }, h('table', { class: 'grid small', 'data-test': 'journey' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, tt('dash.lastPlayed')), codes.map((c) => h('th', { scope: 'col', title: elName(c) }, c)))),
      h('tbody', {}, s.snapshots.map((snap) => h('tr', {}, h('th', { scope: 'row' }, fmtDate(snap.date)),
        codes.map((c) => { const r = model.elementState(cat, snap.data, c); return h('td', { class: 'cell state-' + r.state }, stateMark(r.state)); }))))))) : null;

  openDialog(nameOf(s), [
    h('div', { class: 'student-head' },
      h('h2', {}, s.name || tt('dash.noName'), ' ', h('label', { class: 'initial' }, tt('dash.initial'), initial)),
      h('p', {}, `${cycle(sum.tier)} · ${tt('dash.lastPlayedOn', { date: fmtDate(sum.date, true) })} · ${tt('dash.sessions', { n: sum.sessions })}`)),
    h('section', {},
      h('h3', {}, tt('dash.byElement')),
      codes.map((code) => {
        const r = model.elementState(cat, sum, code);
        return h('details', { class: 'el-detail', open: r.state === 'exploring' }, h('summary', {}, stateMark(r.state), ' ', h('span', { class: 'code' }, code), ' ', elName(code), h('span', { class: 'muted' }, ' · ' + tt('state.' + r.state))),
          h('ul', { class: 'plain' }, r.families.map(famLine)));
      })),
    answers.length ? h('section', { 'data-test': 'student-reflections' },
      h('h3', {}, '💭 ' + tt('dash.ownWords')),
      h('ul', { class: 'plain reflections' }, answers.map((a) => h('li', {},
        h('p', { class: 'q' }, a.element ? h('span', { class: 'code' }, a.element) : null, a.element ? ' ' : null, t(a.prompt)),
        a.answer ? h('p', { class: 'a' }, '“' + t(a.answer) + '”') : null,
        a.feel ? h('p', { class: 'a' }, FEEL_ICON[a.feel] + ' “' + tt('reflect.feel.' + a.feel) + '”') : null)))) : null,
    points.length ? h('section', {},
      h('h3', {}, tt('dash.ideas')),
      h('ul', { class: 'plain' }, points.map((p) => h('li', {}, tt('dash.point.' + p.kind, { where: p.element ? `${p.element} ${elName(p.element)}` : tt('dash.sheetN', { n: p.area }) }), p.element ? lookFors(p.element) : null)))) : null,
    quests.length ? h('section', {}, h('h3', {}, tt('dash.villagers')), h('p', {}, quests.map(({ quest }) => h('span', { class: 'chip' }, quest.title ? t(quest.title) : quest.id)))) : null,
    items.length || achievements.length ? h('section', {},
      h('h3', {}, tt('dash.collected')),
      h('p', {}, items.map((x) => h('span', { class: 'chip' }, (cat.items[x].kind === 'badge' ? '🏅 ' : '') + t(cat.items[x].name))), achievements.map((x) => h('span', { class: 'chip', title: t(cat.achievements[x].desc) }, '☆ ' + t(cat.achievements[x].name))))) : null,
    journey,
    h('div', { class: 'row end no-print' },
      h('button', { class: 'danger', 'data-test': 'remove-student', onclick: () => openConfirm(tt('dash.removeAsk', { name: nameOf(s) }), () => { store.removeStudent(cls(), s.id); commit(); }) }, tt('dash.remove')),
      h('button', { onclick: () => window.print() }, tt('dash.print')),
      closeBtn()),
  ], render);
}

// ---------- files out and in ----------
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileSafe = (s) => s.replace(/[^\p{L}\p{N}\-]+/gu, '-').replace(/^-|-$/g, '') || 'class';

function exportCsv() {
  const cat = app.cat;
  const codes = cat.activeElements;
  const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = [tt('dash.student'), tt('dash.cycleWord'), tt('dash.lastPlayed'), tt('dash.sessionsWord'),
    ...codes.flatMap((c) => [c, `${c} ${tt('dash.hintsWord')}`, `${c} ${tt('dash.reflectionWord')}`, `${c} ${tt('dash.feelingWord')}`]), tt('dash.badges')];
  const rows = students().map((s) => {
    const sum = store.latest(s).data;
    const answers = model.reflectionAnswers(cat, sum);
    return [nameOf(s), cycle(sum.tier), sum.date, sum.sessions,
      ...codes.flatMap((c) => {
        const r = model.elementState(cat, sum, c);
        const a = answers.find((x) => x.element === c);
        return [r.families.length ? tt('state.' + r.state) : '', r.families.length ? r.hints : '', a && a.answer ? t(a.answer) : '', a && a.feel ? tt('reflect.feel.' + a.feel) : ''];
      }),
      sum.items.filter((x) => cat.items[x] && cat.items[x].kind === 'badge').map((x) => t(cat.items[x].name)).join('; ')];
  });
  // The first three characters tell spreadsheet programs the file is UTF-8 (accents stay right).
  download(`${fileSafe(cls().name)}.csv`, '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n'), 'text/csv');
}

function exportBackup() {
  download(`${fileSafe(cls().name)}-backup.json`, JSON.stringify({ kind: 'dcc-class', v: 1, class: cls() }, null, 1), 'application/json');
}

async function restoreBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.kind !== 'dcc-class' || !data.class || !Array.isArray(data.class.students)) throw new Error('kind');
    const c = store.addClass(app.data, data.class.name || tt('dash.classDefault'));
    c.students = data.class.students;
    c.sample = !!data.class.sample;
    commit();
  } catch (e) {
    openDialog(tt('dash.restoreFailed'), [h('p', {}, tt('dash.restoreFailed')), h('div', { class: 'row end' }, closeBtn())]);
  }
}

// ---------- start ----------
async function loadContent() {
  const inline = window.DCC_INLINE;
  await Promise.all(DASHBOARD_FILES.map(async (name) => {
    if (inline) { app.files[name] = inline.files[`content/${name}.json`]; return; }
    const res = await fetch(new URL(`../../content/${name}.json`, import.meta.url));
    if (!res.ok) throw new Error(name);
    app.files[name] = await res.json();
  }));
}

async function start() {
  try {
    await loadContent();
  } catch (e) {
    document.getElementById('load-error').hidden = false;
    return;
  }
  setStrings(app.files.teacher);
  app.registry = app.files.progress.order;
  app.cat = model.buildCatalogue(app.files);
  setLang(app.data.lang || browserLang());
  document.getElementById('restore-file').addEventListener('change', (e) => { if (e.target.files[0]) restoreBackup(e.target.files[0]); e.target.value = ''; });
  // A link like teacher.html#DCC1-... adds that code (handy for a QR scanned with a phone's own camera).
  const fromLink = progress.findCodes(decodeURIComponent(window.location.hash.slice(1)));
  render();
  if (fromLink.length && cls()) { const results = []; importCodes(fromLink, results); render(); }
  // A handle for the tests. Holds nothing personal.
  window.DCCT = { app, store, model, progress };
}

start();
