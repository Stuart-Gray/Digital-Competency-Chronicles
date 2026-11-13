// Teacher-layer test (developers only, not needed to play).
// 1. Progress codes: a save becomes a code and the code reads back the same (no browser needed).
// 2. In the game: a thinking-time card after Théo's task, the Journal's "My thinking" list,
//    "Share with my teacher" (code + QR), and the teacher corner.
// 3. On the dashboard (teacher.html): make a class, add codes (paste, a file, a QR picture,
//    saves on this device), a typo, a later code from the same student, every view in both
//    languages, the student page, the sample class, CSV and backup files.
//
//   npm install --no-save playwright   (once)
//   node tests/teacher.mjs             (SHOTS=dir to save screenshots)
//
// If the CDN is unreachable, set PHASER_FILE=/path/to/phaser.min.js to serve Phaser locally.

import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import * as progress from '../src/systems/progress.js';
import * as model from '../src/teacher/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.tmj': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.md': 'text/markdown' };
const work = mkdtempSync(join(tmpdir(), 'dcc-teacher-'));
let failures = 0;
const check = (ok, what) => { if (!ok) throw new Error(what); };

const files = {};
for (const n of ['ui', 'hub', 'area2', 'teacher', 'progress', 'framework']) files[n] = JSON.parse(await readFile(join(root, `content/${n}.json`), 'utf8'));
const registry = files.progress.order;

// ---------- 1. codes, without a browser ----------
function codecCheck() {
  const slot = {
    sid: 0xabcdef, name: 'Zoé-Ève', tier: 'E3', lang: 'fr', updated: '2026-11-13T03:00:00Z', sessions: [1, 2, 3],
    puzzles: { fixer_steps_c3: { done: true, hints: 1 }, fixer_first_try_c3: { done: true, hints: 0 }, d2_traces_c3: { done: true, hints: 20 } },
    started: { d2_personal_c3: { hints: 2 } },
    reflections: { r_2a: { choice: 'c', feel: 3 }, r_hub_fixit: { choice: 'a', feel: 1 }, r_2b: { later: true } },
    items: ['lantern', 'piece_traces'], achievements: { first_steps: 'x', deep_thinker: 'y' },
  };
  const sum = progress.summarise(slot, files);
  const code = progress.encode(sum, registry, files);
  check(/^DCC1(-[0-9A-HJKMNP-TV-Z]{1,5})+$/.test(code), 'code shape: ' + code);
  const back = progress.decode(code.toLowerCase().replace(/-/g, ' '), registry, files);
  check(back.name === 'Zoé-Ève' && back.tier === 'E3' && back.lang === 'fr' && back.date === '2026-11-13' && back.sessions === 3 && back.sid === 0xabcdef, 'header fields');
  check(back.puzzles.fixer_steps.hints === 1 && back.puzzles.d2_traces.hints === 13 && back.puzzles.d2_personal.state === 'started' && !back.puzzles.d2_photo, 'puzzles');
  check(back.reflections.r_2a.choice === 'c' && back.reflections.r_2a.feel === 3 && back.reflections.r_hub_fixit.choice === 'a' && !back.reflections.r_2b, 'reflections');
  check(back.items.join() === 'lantern,piece_traces' && back.achievements.join() === 'first_steps,deep_thinker', 'items and achievements');
  const typo = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  let err = '';
  try { progress.decode(typo, registry, files); } catch (e) { err = e.message; }
  check(err === 'damaged', 'a typo must be noticed, got: ' + err);
  // Pasted text: words around a code, small letters, spaces for dashes, many codes in one go.
  const other = progress.encode({ ...sum, sid: 77, name: 'Sam' }, registry, files);
  const found = progress.findCodes(`Bonjour! ${code}\nSam: ${other.toLowerCase().replace(/-/g, ' ')} merci DCC1 et bonne journee\n${code}\n${other}thanks`);
  check(found.length === 2 && found[0] === code && found[1] === other, 'findCodes: ' + JSON.stringify(found));
  check(progress.findCodes(typo).length === 1, 'a code with a typo is still found, so the teacher hears about it');
  // Many codes: a cut-off end or a wrong last letter is never read as some other, shorter code.
  const refused = (text) => { try { progress.decode(text, registry, files); return false; } catch (e) { return e.message === 'damaged' || e.message === 'not-a-code'; } };
  for (let sid = 1; sid <= 4000; sid++) {
    const c = progress.encode({ ...sum, sid, name: sid % 3 ? 'Léa' : '' }, registry, files);
    for (let cut = 1; cut <= 4; cut++) check(refused(c.slice(0, -cut).replace(/-$/, '')), `a code cut by ${cut} must be refused: ${c}`);
    const wrong = c.slice(0, -1) + (c.endsWith('0') ? '1' : '0');
    for (const f of progress.findCodes(`${wrong} merci`)) check(refused(f), `a wrong last letter must be refused: ${c} read as ${f}`);
    check(progress.findCodes(`${c} merci`)[0] === c, 'a code followed by a word: ' + c);
  }
  // A longer registry (more content later) still reads today's codes.
  const longer = { ...registry, puzzles: [...registry.puzzles, 'future_one', 'future_two'] };
  check(JSON.stringify(progress.decode(code, longer, files).puzzles) === JSON.stringify(back.puzzles), 'append-only registry');
  // Every puzzle, reflection, item and achievement in the content has a place in the registry.
  const cat = model.buildCatalogue(files);
  for (const key of Object.keys(cat.families)) check(registry.puzzles.includes(key), 'registry is missing puzzle ' + key);
  for (const key of Object.keys(cat.reflections)) check(registry.reflections.includes(key), 'registry is missing reflection ' + key);
  check(model.elementState(cat, back, '4b').state === 'done' && model.elementState(cat, back, '2c').state === 'none', 'element states');
  console.log(`PASS codes (${code.length} characters for a typical save)`);
}

// ---------- browser set-up ----------
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
const shot = async (page, name, opts = {}) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png'), ...opts }); };

async function talkThrough(page, max = 30) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('#dialogue').isVisible())) return 'closed';
    if (await page.locator('#dialogue .choices button').count()) return 'choices';
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  throw new Error('dialogue did not finish');
}

/** Plays Théo's task (one wrong try on purpose), answers the thinking-time card, shares the code. */
async function game(context, lang, tier, name) {
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  if (process.env.PHASER_FILE && existsSync(process.env.PHASER_FILE)) {
    await page.route('**/cdn.jsdelivr.net/npm/phaser@*/**', (route) => route.fulfill({ path: process.env.PHASER_FILE, contentType: 'text/javascript' }));
  }
  await page.addInitScript((l) => {
    if (!sessionStorage.getItem('teacher-test')) {
      localStorage.clear();
      localStorage.setItem('dcc.v1.settings', JSON.stringify({ lang: l, textSpeed: 'instant', music: false }));
      sessionStorage.setItem('teacher-test', '1');
    }
  }, lang);
  const step = (s) => console.log(`  [game ${lang}/${tier}] ${s}`);

  await page.goto(base);
  await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
  await page.click('[data-test=play]');
  await page.click('[data-test=slot-0]');
  await page.click('[data-test=avatar-1]');
  await page.click('[data-test=look-done]');
  await page.fill('[data-test=name]', name);
  await page.keyboard.press('Enter');
  await page.click(`[data-test=cycle-${tier}]`);
  await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
  await page.locator('#dialogue').waitFor({ timeout: 5000 });
  await talkThrough(page);

  check(await page.evaluate(() => window.DCC.debug.goTo('fixer')), 'could not stand in front of Théo');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await page.locator('#dialogue').waitFor();
  check((await talkThrough(page)) === 'choices', 'Théo did not offer a choice');
  await page.locator('#dialogue .choices button').first().click();

  // Open the first puzzle, leave it ("Leave for now"), and check it counts as started.
  const seq = files.hub.puzzles.find((p) => p.family === 'fixer_steps' && p.tiers.includes(tier));
  await page.locator(`[data-puzzle=${seq.id}]`).waitFor();
  await page.click('[data-test=puzzle-leave]');
  await page.waitForTimeout(300);
  let slot = await page.evaluate(() => window.DCC.debug.slot());
  check(slot.started[seq.id] && !slot.puzzles[seq.id], 'a puzzle left for later should be remembered as started');
  step('left a puzzle for later: remembered as started');

  await page.keyboard.press('Space');
  await page.locator('#dialogue').waitFor();
  check((await talkThrough(page)) === 'choices', 'Théo did not offer a choice the second time');
  await page.locator('#dialogue .choices button').first().click();
  await page.locator(`[data-puzzle=${seq.id}]`).waitFor();
  const order = seq.steps.map((s) => s.id);
  for (const id of [order[1], order[0], ...order.slice(2)]) await page.click(`[data-step=${id}]`);
  await page.click('[data-test=sequence-check]');
  await page.locator('.card .feedback').waitFor();
  const placed = await page.locator('[data-placed]').count();
  for (const id of order.slice(placed)) await page.click(`[data-step=${id}]`);
  await page.click('[data-test=sequence-check]');
  await page.locator('[data-test=puzzle-continue]').click();
  await page.locator('#dialogue').waitFor();
  await talkThrough(page);
  const choice = files.hub.puzzles.find((p) => p.family === 'fixer_first_try' && p.tiers.includes(tier));
  await page.locator(`[data-puzzle=${choice.id}]`).waitFor();
  await page.click('[data-correct=true]');
  await page.locator('[data-test=puzzle-continue]').click();
  await page.locator('#dialogue').waitFor();
  await talkThrough(page);
  step('Théo helped (one hint used)');

  // Thinking time opens by itself a moment later.
  const card = page.locator('[data-reflection=r_hub_fixit]');
  await card.waitFor({ timeout: 5000 });
  const def = files.hub.reflections.find((r) => r.family === 'r_hub_fixit' && r.tiers.includes(tier));
  check((await card.locator('.prompt').first().textContent()) === def.prompt[lang], 'the reflection question is not the one for this cycle and language');
  check((await card.locator('[data-option]').count()) === def.options.length, 'reflection options');
  await shot(page, `t-${lang}-1-reflect`);
  await card.locator('[data-option=b]').click();
  await card.locator('[data-feel="3"]').waitFor();
  await shot(page, `t-${lang}-2-feel`);
  await card.locator('[data-feel="3"]').click();
  await page.click('[data-test=reflect-continue]');
  await page.waitForTimeout(300);
  slot = await page.evaluate(() => window.DCC.debug.slot());
  check(slot.reflections.r_hub_fixit.choice === 'b' && slot.reflections.r_hub_fixit.feel === 3, 'reflection not saved');
  check(slot.achievements.deep_thinker, 'thinking achievement missing');
  check(slot.puzzles[seq.id].hints === 1 && slot.hints['4b'] === 1 && !slot.started[seq.id], 'hints or started state wrong after solving');
  step('thinking-time card answered and saved');
  // It must not open a second time.
  await page.waitForTimeout(2500);
  check(!(await page.locator('#panel').isVisible()), 'the reflection opened again');

  // Journal: the answer is there and can be shared.
  await page.click('[data-test=menu]');
  await page.click('[data-test=journal]');
  await page.locator('.thinking [data-reflection=r_hub_fixit]').waitFor();
  check((await page.locator('.thinking .a').textContent()).includes(def.options[1].text[lang]), 'Journal does not show the chosen answer');
  await shot(page, `t-${lang}-3-journal`);
  await page.click('[data-test=share]');
  const code = (await page.locator('[data-test=share-code]').textContent()).trim();
  const read = progress.decode(code, registry, files);
  check(read.name === name && read.tier === tier && read.puzzles.fixer_steps.hints === 1 && read.reflections.r_hub_fixit.feel === 3, 'the shared code does not match the save');
  await page.waitForTimeout(200);
  await shot(page, `t-${lang}-4-share`);
  const qrFile = join(work, `qr-${lang}.png`);
  await page.locator('.share .qr').screenshot({ path: qrFile });
  const download = page.waitForEvent('download');
  await page.click('[data-test=share-file]');
  const txtFile = join(work, `code-${lang}.txt`);
  await (await download).saveAs(txtFile);
  check((await readFile(txtFile, 'utf8')).trim() === code, 'the saved file does not hold the code');
  step(`shared: ${code}`);
  await page.click('[data-test=share-back]');
  await page.locator('.journal').waitFor();
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.click('[data-test=quit]');

  // Teacher corner: press and hold.
  const hold = page.locator('[data-test=teacher]');
  await hold.waitFor();
  await hold.dispatchEvent('pointerdown');
  await page.locator('[data-test=corner-dashboard]').waitFor({ timeout: 4000 });
  check((await page.locator('.saves [data-slot="0"] .chip').count()) >= 1, 'teacher corner shows no progress for the save');
  check((await page.locator('[data-test=corner-dashboard]').getAttribute('href')) === './teacher.html', 'dashboard link');
  await shot(page, `t-${lang}-5-corner`);
  await page.click('[data-test=corner-code-0]');
  check((await page.locator('[data-test=share-code]').textContent()).trim() === code, 'teacher corner code differs');
  await page.click('[data-test=share-back]');
  // Turning thinking time off is remembered.
  await page.click('[data-test=corner-reflect-false]');
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('dcc.v1.settings')).reflections)) === false, 'thinking-time switch not saved');
  await page.click('[data-test=corner-reflect-true]');
  step('teacher corner checked');

  if (problems.length) throw new Error(problems.join('\n'));
  await page.close();
  return { code, qrFile, txtFile };
}

/** A returning player whose save already reached a question: it waits in the Journal. */
async function waitingCheck(context, tier) {
  const page = await context.newPage();
  if (process.env.PHASER_FILE && existsSync(process.env.PHASER_FILE)) {
    await page.route('**/cdn.jsdelivr.net/npm/phaser@*/**', (route) => route.fulfill({ path: process.env.PHASER_FILE, contentType: 'text/javascript' }));
  }
  await page.goto(base);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dcc.v1.slot0'));
    s.reflections = {};
    localStorage.setItem('dcc.v1.slot0', JSON.stringify(s));
  });
  await page.reload();
  await page.click('[data-test=play]');
  await page.click('[data-test=slot-0]');
  await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub');
  await page.waitForTimeout(2500);
  check(!(await page.locator('#panel').isVisible()), 'an old question should wait in the Journal, not open by itself');
  await page.click('[data-test=menu]');
  await page.click('[data-test=journal]');
  await page.click('[data-test=reflect-answer]');
  await page.locator('[data-reflection=r_hub_fixit] [data-option=a]').click();
  await page.locator('[data-feel="1"]').click();
  await page.click('[data-test=reflect-continue]');
  await page.locator('.thinking .a').waitFor();
  console.log(`  [game ${tier}] an older question waited in the Journal and was answered from there`);
  await page.close();
}

async function dashboard(context, lang, made) {
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  const step = (s) => console.log(`  [dashboard ${lang}] ${s}`);
  const T = (path) => path.split('.').reduce((o, k) => o[k], files.teacher.strings)[lang];

  await page.goto(base + 'teacher.html');
  await page.locator('[data-test=first-class]').waitFor({ timeout: 10000 });
  await page.click(`[data-test=lang-${lang}]`);
  check((await page.locator('h1').textContent()) === T('dash.title'), 'dashboard title language');
  await shot(page, `d-${lang}-1-welcome`, { fullPage: true });
  await page.click('[data-test=first-class]');
  await page.fill('[data-test=class-name]', 'Groupe 401');
  await page.click('[data-test=class-save]');

  // Paste: the real code inside a sentence, plus a typo of it.
  await page.click('[data-test=add-codes]');
  const typo = made.code.slice(0, -1) + (made.code.endsWith('0') ? '1' : '0');
  await page.fill('[data-test=paste]', `Voici mon code: ${made.code.toLowerCase()} merci!`);
  await page.click('[data-test=paste-add]');
  await page.locator('[data-test=import-results] [data-status=new]').waitFor();
  await page.fill('[data-test=initial]', 'b9');
  check((await page.inputValue('[data-test=initial]')) === 'B', 'the last initial should be one or two letters');
  await page.fill('[data-test=paste]', typo);
  await page.click('[data-test=paste-add]');
  await page.locator('[data-status=damaged]').waitFor();
  await page.fill('[data-test=paste]', 'hello there');
  await page.click('[data-test=paste-add]');
  await page.locator('[data-status=not-a-code]').waitFor();
  // The same student again: from the text file, from the QR picture, and from this device's saves.
  await page.setInputFiles('[data-test=code-files]', made.txtFile);
  await page.locator('[data-status=same]').first().waitFor();
  await page.setInputFiles('[data-test=code-files]', made.qrFile);
  await page.waitForFunction(() => document.querySelectorAll('[data-status=same]').length >= 2, null, { timeout: 15000 });
  step('pasted code, typo noticed, text file and QR picture read');
  await page.click('[data-test=this-device]');
  await page.waitForFunction(() => document.querySelectorAll('[data-status=same], [data-status=updated]').length >= 3);
  await shot(page, `d-${lang}-2-add`);
  await page.click('[data-test=dialog-close]');

  const row = page.locator('[data-test=grid] tbody tr');
  check((await row.count()) === 1, 'expected one student in the grid, got ' + (await row.count()));
  check((await row.locator('th').textContent()).includes(made.name + ' B.'), 'name with initial');
  check((await row.locator('[data-el="4b"]').getAttribute('data-state')) === 'done', '4b should read "completed" (one hint was used)');
  check((await row.locator('[data-el="2a"]').getAttribute('data-state')) === 'none', '2a should read "not yet"');

  // A later code from the same save: more done, a day later.
  const later = await page.evaluate(() => {
    const slot = JSON.parse(localStorage.getItem('dcc.v1.slot0'));
    slot.updated = new Date(Date.parse(slot.updated) + 86400000).toISOString();
    const tier = slot.tier === 'E3' ? 'c3' : 'c2';
    for (const fam of ['d2_traces', 'd2_vanishing', 'd2_profile', 'd2_boss2']) slot.puzzles[`${fam}_${tier}`] = { done: true, hints: 0 };
    slot.reflections.r_2a = { choice: 'a', feel: 2 };
    slot.items = ['lantern', 'piece_traces'];
    const { progress, app } = window.DCCT;
    return progress.codeForSlot(slot, app.registry, app.files);
  });
  await page.click('[data-test=add-codes]');
  await page.fill('[data-test=paste]', later);
  await page.click('[data-test=paste-add]');
  await page.locator('[data-status=updated]').waitFor();
  await page.click('[data-test=dialog-close]');
  check((await row.count()) === 1, 'a later code from the same student must not add a second row');
  check((await row.locator('[data-el="2a"]').getAttribute('data-state')) === 'solo', '2a should now read "completed without hints"');
  step('a later code updated the same student');

  // Student page.
  await row.locator('button.name').click();
  await page.locator('[data-test=student-reflections]').waitFor();
  check((await page.locator('[data-test=journey] tbody tr').count()) === 2, 'the student story should have two visits');
  const words = await page.locator('[data-test=student-reflections]').textContent();
  check(words.includes(T('reflect.feel.2')) && words.includes(T('reflect.feel.1')), 'student reflections in their own words');
  await shot(page, `d-${lang}-3-student`);
  await page.click('[data-test=dialog-close]');

  // Every view, with the sample class added (ten made-up students).
  await page.click('[data-test=more]');
  await page.click('[data-test=sample]');
  check((await row.count()) === 10, 'sample class should have ten students');
  for (const v of ['class', 'sheets', 'dimensions', 'time', 'talk', 'guide']) {
    await page.click(`[data-test=tab-${v}]`);
    await page.waitForTimeout(100);
    check((await page.locator('#view h2').first().textContent()).length > 0, 'view ' + v + ' is empty');
    await shot(page, `d-${lang}-view-${v}`, { fullPage: true });
  }
  check((await page.locator('#view [data-el="2a"]').count()) === 1 && (await page.locator('#view .reflection').count()) >= 4, 'prompts and look-fors view');
  await page.click('[data-test=guide-E3]');
  await page.click('[data-test=tab-talk]');
  check((await page.locator('[data-test=talk-explain] li').count()) > 0, 'conversations view should list students who could explain');
  await page.click('[data-test=tab-dimensions]');
  check((await page.locator('[data-dim=D1]').count()) === 1 && (await page.locator('[data-dim=D2]').count()) === 1, 'dimensions D1 and D2');
  step('all six views drawn with the sample class');

  // No marks anywhere: no percent signs and no "x/y" scores on any view.
  for (const v of ['class', 'sheets', 'dimensions', 'time', 'talk']) {
    await page.click(`[data-test=tab-${v}]`);
    const text = await page.locator('#view').innerText();
    check(!/%|\b\d+\s*\/\s*\d+\b/.test(text), `view ${v} shows something that reads like a mark`);
  }

  // Files: CSV and a backup that can be opened again.
  await page.click('[data-test=tab-class]');
  await page.click('[data-test=more]');
  let dl = page.waitForEvent('download');
  await page.click('[data-test=csv]');
  const csv = join(work, `class-${lang}.csv`);
  await (await dl).saveAs(csv);
  const lines = (await readFile(csv, 'utf8')).trim().split('\r\n');
  check(lines.length === 11 && lines[0].includes('4b'), 'CSV should have a heading and ten students');
  await page.click('[data-test=more]');
  dl = page.waitForEvent('download');
  await page.click('[data-test=backup]');
  const backup = join(work, `backup-${lang}.json`);
  await (await dl).saveAs(backup);
  await page.setInputFiles('#restore-file', backup);
  await page.waitForFunction(() => document.querySelectorAll('[data-test=class-select] option').length === 3);
  check((await row.count()) === 10, 'the restored class should have ten students');
  // Delete it again, and remove a student.
  await page.click('[data-test=more]');
  await page.click('[data-test=delete-class]');
  await page.click('[data-test=confirm-yes]');
  check((await page.locator('[data-test=class-select] option').count()) === 2, 'class not deleted');
  step('CSV, backup, restore and delete work');

  // It all survives a reload (kept in this browser only).
  await page.reload();
  await page.locator('[data-test=grid]').waitFor();
  check((await page.locator('h1').textContent()) === T('dash.title'), 'language not remembered');
  if (problems.length) throw new Error(problems.join('\n'));
  await page.close();
}

async function run(lang, tier, name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  try {
    const made = await game(context, lang, tier, name);
    await waitingCheck(context, tier);
    await dashboard(context, lang, { ...made, name });
    console.log(`PASS teacher layer ${lang}/${tier}`);
  } catch (e) {
    failures++;
    console.error(`FAIL teacher layer ${lang}/${tier}: ${e.message}`);
    for (const p of context.pages()) await shot(p, `fail-${lang}-${context.pages().indexOf(p)}`).catch(() => {});
  } finally {
    await context.close();
  }
}

try { codecCheck(); } catch (e) { failures++; console.error('FAIL codes: ' + e.message); }
await run('en', 'E3', 'Sam');
await run('fr', 'E2', 'Zoé');
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
