// Card-fit check (developers only, not needed to play).
// Young players should see the whole question and every answer without scrolling. This opens
// every puzzle card and every thinking-time card in a headless browser, in English and French,
// plays each one through (wrong tries, hints, the solved message) and measures after every step
// whether the card is taller than the screen.
//
// It does this at common laptop and Chromebook window sizes, at every text size, with and
// without high contrast, and with both letter styles.
//   - At the normal text size a card that needs scrolling FAILS the check, unless it is in
//     tests/cards-allow.json (cards we know cannot fit, each with a reason).
//   - At Large and Larger text, scrolling is allowed (the text matters more); those are listed
//     in the report only.
//
//   npm install --no-save playwright   (once)
//   node tests/cards.mjs               REPORT=file.md writes the full table. SHOTS=dir saves
//                                      pictures of each step (use it with ONLY=id,id and
//                                      CASE=fr,normal,default,plain,1366 to keep it small)
//
// If the CDN is unreachable, set PHASER_FILE=/path/to/phaser.min.js to serve Phaser locally.

import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SHOTS || '';
const REPORT = process.env.REPORT || '';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const CASE = process.env.CASE || ''; // e.g. CASE=fr,normal,default,plain,1366 to run one combination
const QUICK = !!process.env.QUICK; // normal text only
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.tmj': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

// The inside of a browser window (not the whole screen): the screen size minus the taskbar or
// shelf, the tabs and the address bar.
const VIEWPORTS = [
  { name: '1280x720 laptop', width: 1280, height: 593 },
  { name: '1366x768 laptop or Chromebook', width: 1366, height: 641 },
  { name: '1440x900 laptop', width: 1440, height: 773 },
  { name: '1024x768 tablet', width: 1024, height: 690 },
];
const SIZES = QUICK ? ['normal'] : ['normal', 'large', 'larger'];
const FONTS = ['default', 'dyslexia'];
const CONTRAST = [false, true];
const LANGS = ['en', 'fr'];
const FILES = ['hub', 'area2'];

const allow = JSON.parse(await readFile(join(root, 'tests/cards-allow.json'), 'utf8')).allow || {};

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch (e) { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;
if (SHOTS) await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();

// ---------- runs inside the page ----------
// Opens every card for one language and one group of settings, plays it, and returns one row
// per card: the most it overflowed (in CSS pixels), and at which step.
async function measureAll({ lang, settings, files, only, shots }) {
  const mod = (p) => import(new URL(p, location.href).href);
  const [puzzle, i18n, content, layer, reflect] = await Promise.all([
    mod('src/systems/puzzle.js'), mod('src/systems/i18n.js'), mod('src/systems/content.js'),
    mod('src/ui/textLayer.js'), mod('src/systems/reflect.js'),
  ]);
  i18n.setLang(lang);
  layer.applySettings({ textSpeed: 'instant', voice: 'off', ...settings });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  await document.fonts.ready;

  // The same "random" order every run, so a card cannot pass one day and fail the next.
  const realRandom = Math.random;
  let seed = 1;
  const reseed = (text) => { seed = 7; for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; };
  Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const rows = [];
  const panel = document.getElementById('panel');
  const stage = document.getElementById('stage');

  async function probe(row, step) {
    const card = panel.querySelector('.card');
    if (!card) return;
    if (shots && (step !== row.last || card.scrollHeight - card.clientHeight > row.over)) { row.last = step; row.n = (row.n || 0) + 1; await frame(); await window.__shot(`${row.id}-${shots}-${String(row.n).padStart(2, '0')}-${step}`); }
    // Too tall = it scrolls inside, or it hangs out of the bottom of the game area.
    const over = Math.max(card.scrollHeight - card.clientHeight, Math.round(card.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom));
    const cs = getComputedStyle(card);
    const px = parseFloat(cs.fontSize);
    // Anything a child has to press must also be inside the card sideways.
    const box = card.getBoundingClientRect();
    let side = 0;
    for (const b of card.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width) side = Math.max(side, Math.round(r.right - box.right), Math.round(box.left - r.left));
    }
    row.steps++;
    if (over > row.over) { row.over = over; row.at = step; }
    if (side > row.side) { row.side = side; }
    if (px < row.px) row.px = px;
    row.fit = Math.max(row.fit, Number(card.dataset.fit || 0));
    row.scale = Math.min(row.scale, Number(card.style.getPropertyValue('--fit') || 1));
    if (card.classList.contains('cols')) row.cols = true;
    row.cardH = Math.max(row.cardH, card.scrollHeight);
    row.room = card.clientHeight;
  }
  const newRow = (kind, id, element, type, tier) => ({ kind, id, element, type, tier, over: 0, side: 0, at: '', steps: 0, px: 999, fit: 0, scale: 1, cols: false, cardH: 0, room: 0 });
  const click = async (sel) => {
    const b = typeof sel === 'string' ? panel.querySelector(sel) : sel;
    if (!b || b.disabled) return false;
    b.click();
    await tick();
    return true;
  };
  const asList = (x) => (Array.isArray(x) ? x : [x]);

  const play = {
    async choice(p, row) {
      await probe(row, 'question');
      for (const b of [...panel.querySelectorAll('.options button:not([data-correct])')]) { await click(b); await probe(row, 'hint'); }
      await click('.options button[data-correct]');
      await probe(row, 'solved');
    },
    async predict(p, row) {
      await probe(row, 'scene');
      while (panel.querySelector('[data-test=predict-next]')) { await click('[data-test=predict-next]'); await probe(row, 'scene'); }
      await play.choice(p, row);
    },
    async sort(p, row) {
      await probe(row, 'start');
      for (const it of p.items) {
        const wrong = p.bins.find((b) => !asList(it.bin).includes(b.id));
        if (wrong) { await click(`[data-item="${it.id}"]`); await click(`[data-bin="${wrong.id}"]`); await probe(row, 'hint'); }
        await click(`[data-item="${it.id}"]`);
        await click(`[data-bin="${asList(it.bin)[0]}"]`);
        await probe(row, 'sorted');
      }
      await probe(row, 'solved');
    },
    async match(p, row) {
      await probe(row, 'start');
      for (let i = 0; i < p.pairs.length; i++) {
        const pr = p.pairs[i], other = p.pairs[i + 1];
        if (other) { await click(`[data-left="${pr.id}"]`); await click(`[data-right="${other.id}"]`); await probe(row, 'hint'); }
        await click(`[data-left="${pr.id}"]`);
        await click(`[data-right="${pr.id}"]`);
        await probe(row, 'paired');
      }
      await probe(row, 'solved');
    },
    async spot(p, row) {
      await probe(row, 'start');
      for (const s of p.spots.filter((x) => !x.clue)) { await click(`[data-spot="${s.id}"]`); await probe(row, 'hint'); }
      for (const s of p.spots.filter((x) => x.clue)) { await click(`[data-spot="${s.id}"]`); await probe(row, 'found'); }
      await probe(row, 'solved');
    },
    async sequence(p, row) {
      await probe(row, 'start');
      const order = p.steps.map((s) => s.id);
      // One wrong try per place, so every hint is seen.
      for (let k = 0; k < order.length - 1; k++) {
        const done = panel.querySelectorAll('[data-placed]').length;
        const rest = order.slice(done);
        if (rest.length < 2) break;
        const tryOrder = [rest[1], rest[0], ...rest.slice(2)];
        for (const id of tryOrder) { await click(`[data-step="${id}"]`); await probe(row, 'placing'); }
        await click('[data-test=sequence-check]');
        await probe(row, 'hint');
        const now = panel.querySelectorAll('[data-placed]').length;
        for (const id of order.slice(now, now + 1)) await click(`[data-step="${id}"]`);
      }
      const done = panel.querySelectorAll('[data-placed]').length;
      for (const id of order.slice(done)) await click(`[data-step="${id}"]`);
      await probe(row, 'placed');
      await click('[data-test=sequence-check]');
      await probe(row, 'solved');
    },
  };

  for (const file of files) {
    const data = content.get(file);
    for (const p of data.puzzles || []) {
      if (only.length && !only.includes(p.id)) continue;
      if (!play[p.type]) { rows.push({ ...newRow('puzzle', p.id, p.element, p.type, (p.tiers || []).join('/')), error: 'no player for type ' + p.type }); continue; }
      const tier = (p.tiers || ['E2'])[0];
      i18n.setTier(tier);
      reseed(p.id);
      const row = newRow('puzzle', p.id, p.element, p.type, (p.tiers || []).join('/'));
      try {
        puzzle.open(p);
        await tick();
        await Promise.all([...panel.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
        await frame();
        await play[p.type](p, row);
        if (!panel.querySelector('[data-test=puzzle-continue]')) row.error = 'the test did not finish the puzzle';
      } catch (e) { row.error = String(e && e.message || e); }
      layer.hidePanel();
      rows.push(row);
    }
    for (const r of data.reflections || []) {
      const id = r.id;
      if (only.length && !only.includes(id)) continue;
      const tier = (r.tiers || ['E2'])[0];
      i18n.setTier(tier);
      const row = newRow('thinking', id, r.element || '', 'reflect', (r.tiers || []).join('/'));
      try {
        // Every answer in turn, so the longest one is seen on the next two steps.
        for (const o of r.options) {
          reflect.open({ reflections: {}, tier, flags: {} }, { ...r, file });
          await tick(); await frame();
          await probe(row, 'question');
          await click(`[data-option="${o.id}"]`);
          await probe(row, 'feeling');
          await click('[data-feel="3"]');
          await probe(row, 'thanks');
          layer.hidePanel();
        }
      } catch (e) { row.error = String(e && e.message || e); }
      layer.hidePanel();
      rows.push(row);
    }
  }
  // Dialogue boxes (people talking, and the choices they offer) must stay inside the game area.
  const dialogueEl = document.getElementById('dialogue');
  for (const file of only.length ? [] : files) {
    const data = content.get(file);
    for (const [node, lines] of Object.entries(data.dialogue || {})) {
      const row = newRow('dialogue', `${file}:${node}`, '', 'dialogue', '');
      try {
        for (const line of lines) {
          const tiers = line.tiers || ((line.choices || []).some((c) => c.tiers) ? ['E2', 'E3'] : ['E3']);
          for (const tier of tiers) {
            i18n.setTier(tier);
            const vars = { name: 'Maximilienne' };
            const speaker = line.speaker && data.npcs[line.speaker] ? i18n.t(data.npcs[line.speaker].name) : '';
            const choices = (line.choices || []).filter((c) => i18n.forTier(c)).map((c) => i18n.t(c.text, vars));
            layer.say({ speaker, text: i18n.t(line.text, vars), choices });
            // The box is already full size (the letters still to come take their room); only
            // the choices need a moment to appear.
            if (choices.length) { await frame(); await frame(); await tick(); }
            const top = Math.min(...[dialogueEl, ...dialogueEl.querySelectorAll('.speaker')].map((n) => n.getBoundingClientRect().top));
            const over = Math.round(stage.getBoundingClientRect().top - top);
            row.steps++;
            if (over > row.over) { row.over = over; row.at = tier; }
            row.px = Math.min(row.px, parseFloat(getComputedStyle(dialogueEl).fontSize));
            layer.closeDialogue();
          }
        }
      } catch (e) { row.error = String(e && e.message || e); }
      layer.closeDialogue();
      rows.push(row);
    }
  }
  Math.random = realRandom;
  const sr = stage.getBoundingClientRect();
  return { rows, stage: { w: Math.round(sr.width), h: Math.round(sr.height) } };
}

// ---------- the run ----------
const results = []; // { viewport, lang, size, font, hc, row }
let stageNote = {};
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  if (process.env.PHASER_FILE && existsSync(process.env.PHASER_FILE)) {
    await page.route('**/cdn.jsdelivr.net/npm/phaser@*/**', (route) => route.fulfill({ path: process.env.PHASER_FILE, contentType: 'text/javascript' }));
  }
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('dcc.v1.settings', JSON.stringify({ lang: 'en', textSpeed: 'instant', reflections: false, music: false, voice: 'off' }));
  });
  if (SHOTS) await page.exposeFunction('__shot', (name) => page.screenshot({ path: join(SHOTS, name + '.png') }));
  await page.goto(base);
  await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
  for (const size of SIZES) for (const font of FONTS) for (const hc of CONTRAST) for (const lang of LANGS) {
    const tags = [lang, size, font, hc ? 'hc' : 'plain', String(vp.width)];
    if (CASE && !CASE.split(',').every((c) => tags.includes(c))) continue;
    const settings = { textSize: size, font, highContrast: hc };
    const out = await page.evaluate(measureAll, { lang, settings, files: FILES, only: ONLY, shots: SHOTS ? tags.join('-') : '' });
    stageNote[vp.name] = out.stage;
    for (const row of out.rows) {
      results.push({ viewport: vp.name, lang, size, font, hc, row });
    }
  }
  if (problems.length) { console.error(`Problems at ${vp.name}:\n  ` + problems.slice(0, 10).join('\n  ')); process.exitCode = 1; }
  await context.close();
}
await browser.close();
server.close();

// ---------- the verdict ----------
const TOL = 1; // a pixel of rounding is not scrolling
const bad = (r) => r.row.over > TOL || r.row.side > TOL || r.row.error;
const strict = results.filter((r) => r.size === 'normal');
const fails = [], allowed = [], errors = results.filter((r) => r.row.error);
const byCard = new Map();
for (const r of strict.filter(bad)) {
  const key = r.row.id;
  if (!byCard.has(key)) byCard.set(key, []);
  byCard.get(key).push(r);
}
// An allowed card may say when it is allowed ("only": every listed tag must match the run).
const tagsOf = (r) => [r.lang, r.font, r.hc ? 'hc' : 'plain', r.viewport.split('x')[0]];
const isAllowed = (id, r) => allow[id] && !r.row.error && (allow[id].only || []).every((tag) => tagsOf(r).includes(tag));
for (const [id, list] of byCard) (list.every((r) => isAllowed(id, r)) ? allowed : fails).push({ id, list });
const unusedAllow = Object.keys(allow).filter((id) => !byCard.has(id) && !ONLY.length && !CASE);

const describe = (r) => `${r.lang} · ${r.viewport} · ${r.font === 'dyslexia' ? 'dyslexia letters' : 'usual letters'}${r.hc ? ' · high contrast' : ''}: ${r.row.error ? r.row.error : `${Math.round(r.row.over)} px too tall at "${r.row.at}"${r.row.side > TOL ? `, ${r.row.side} px too wide` : ''}`}`;
const isCard = (r) => r.row.kind !== 'dialogue';
const cards = new Set(results.filter(isCard).map((r) => r.row.id)).size;
const talks = new Set(results.filter((r) => !isCard(r)).map((r) => r.row.id)).size;
console.log(`Card fit: ${cards} cards and ${talks} conversations, ${results.length} runs (${VIEWPORTS.length} window sizes, ${SIZES.length} text sizes, 2 letter styles, high contrast on and off, EN and FR).`);
for (const [name, s] of Object.entries(stageNote)) console.log(`  ${name}: game area ${s.w} x ${s.h}`);
const shrunk = new Set(strict.filter((r) => r.row.scale < 1 && r.font === 'default').map((r) => r.row.id));
const shrunkDys = new Set(strict.filter((r) => r.row.scale < 1 && r.font === 'dyslexia').map((r) => r.row.id));
const badCards = [...byCard.values()].filter((list) => isCard(list[0])).length;
console.log(`Normal text: ${cards - badCards} of ${cards} cards fit without scrolling in every run (${shrunk.size} are made a little smaller to do it, ${shrunkDys.size} with the dyslexia letters).`);
if (talks) console.log(`Normal text: ${talks - (byCard.size - badCards)} of ${talks} conversations stay inside the game area.`);
if (allowed.length) {
  console.log(`\nKnown cards that still scroll (tests/cards-allow.json):`);
  for (const a of allowed) { console.log(`  ${a.id}: ${allow[a.id].reason}`); for (const r of a.list.slice(0, 3)) console.log('      ' + describe(r)); if (a.list.length > 3) console.log(`      ... and ${a.list.length - 3} more runs`); }
}
if (unusedAllow.length) console.log(`\nThese cards are in tests/cards-allow.json but now fit. Please remove them: ${unusedAllow.join(', ')}`);
if (fails.length) {
  console.error(`\nFAIL: ${fails.length} card(s) need scrolling at the normal text size:`);
  for (const f of fails) { console.error(`  ${f.id} (${f.list[0].row.type}, ${f.list[0].row.element})`); for (const r of f.list.slice(0, 4)) console.error('      ' + describe(r)); if (f.list.length > 4) console.error(`      ... and ${f.list.length - 4} more runs`); }
  process.exitCode = 1;
}
if (!QUICK) {
  for (const size of ['large', 'larger']) {
    const list = results.filter((r) => r.size === size && isCard(r));
    const over = new Set(list.filter(bad).map((r) => r.row.id));
    const overUsual = new Set(list.filter((r) => bad(r) && r.font === 'default').map((r) => r.row.id));
    const talkOver = new Set(results.filter((r) => r.size === size && !isCard(r) && bad(r)).map((r) => r.row.id));
    console.log(`${size === 'large' ? 'Large' : 'Larger'} text: ${cards - overUsual.size} of ${cards} cards fit without scrolling with the usual letters, ${cards - over.size} in every run (scrolling is allowed here).${talkOver.size ? ` ${talkOver.size} conversation(s) do not fit: ${[...talkOver].join(', ')}` : ''}`);
  }
}

if (REPORT) {
  const lines = ['# Card fit report', '', `Made by \`node tests/cards.mjs\`. The window columns show the most a card was taller than its space, in CSS pixels, over every step of playing it (0 = no scrolling). Layout: 100 % is the full-size card; "2 by 2" means the answers sit two by two; 94 %, 88 % and 82 % mean the whole card is that much smaller so it fits.`, ''];
  for (const size of SIZES) {
    lines.push(`## Text size: ${size}`, '');
    lines.push('| Card | Type | Cycle | ' + VIEWPORTS.map((v) => v.name).join(' | ') + ' | Layout, EN / FR | Layout with dyslexia letters, EN / FR | Smallest text (px) | Worst step |', '|---|---|---|' + VIEWPORTS.map(() => '---').join('|') + '|---|---|---|---|');
    const ids = [...new Set(results.map((r) => r.row.id))];
    for (const id of ids) {
      const list = results.filter((r) => r.size === size && r.row.id === id);
      const worst = list.reduce((a, b) => (b.row.over > a.row.over ? b : a), list[0]);
      const cells = VIEWPORTS.map((v) => Math.round(Math.max(...list.filter((r) => r.viewport === v.name).map((r) => r.row.over))));
      if ((size !== 'normal' || worst.row.kind === 'dialogue') && cells.every((c) => c <= TOL)) continue;
      const step = (lang, font) => {
        const runs = list.filter((r) => r.lang === lang && r.font === font);
        const scale = Math.min(...runs.map((r) => r.row.scale));
        return (runs.some((r) => r.row.cols) ? '2 by 2, ' : '') + Math.round(scale * 100) + ' %';
      };
      lines.push(`| ${id} | ${worst.row.type} | ${worst.row.tier} | ${cells.join(' | ')} | ${step('en', 'default')} / ${step('fr', 'default')} | ${step('en', 'dyslexia')} / ${step('fr', 'dyslexia')} | ${Math.min(...list.map((r) => r.row.px)).toFixed(1)} | ${worst.row.over > TOL ? `${worst.lang}, ${worst.font}${worst.hc ? ', hc' : ''}: ${worst.row.at}` : ''} |`);
    }
    lines.push('');
  }
  await writeFile(REPORT, lines.join('\n'));
  console.log('Report written to ' + REPORT);
}
if (process.exitCode) console.error('\nCard fit check FAILED.');
else console.log('\nCard fit check passed.');
