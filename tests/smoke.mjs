// Smoke test (developers only, not needed to play).
// Loads the game in a headless browser, once per language: picks a cycle, walks into the
// village, talks to Théo, solves both Fix-it puzzles (with one wrong try), and fails on any
// console error. Then plays all of Dungeon 2 (the Temple of Traces) for each cycle and
// language: every puzzle (one wrong try each), the hidden door, the key stones, the chests,
// the final room, a save-and-resume in the middle, and the trip home.
//
//   npm install --no-save playwright   (once)
//   node tests/smoke.mjs               (SHOTS=dir to save screenshots)
//
// If the CDN is unreachable, set PHASER_FILE=/path/to/phaser.min.js to serve Phaser locally.

import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.tmj': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

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

const hub = JSON.parse(await readFile(join(root, 'content/hub.json'), 'utf8'));
const area2 = JSON.parse(await readFile(join(root, 'content/area2.json'), 'utf8'));
const browser = await chromium.launch();
let failures = 0;

async function newPage(lang, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  if (process.env.PHASER_FILE && existsSync(process.env.PHASER_FILE)) {
    await page.route('**/cdn.jsdelivr.net/npm/phaser@*/**', (route) => route.fulfill({ path: process.env.PHASER_FILE, contentType: 'text/javascript' }));
  }
  await page.addInitScript((l) => {
    if (!sessionStorage.getItem('smoke')) {
      localStorage.clear();
      localStorage.setItem('dcc.v1.settings', JSON.stringify({ lang: l, textSpeed: 'fast' }));
      sessionStorage.setItem('smoke', '1');
    }
  }, lang);
  return { context, page, problems };
}

const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png') }); };

async function talkThrough(page, max = 30) {
  // Press Space until the dialogue box closes or shows choices.
  for (let i = 0; i < max; i++) {
    const open = await page.locator('#dialogue').isVisible();
    if (!open) return 'closed';
    if (await page.locator('#dialogue .choices button').count()) return 'choices';
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  throw new Error('dialogue did not finish');
}

async function run(lang, tier) {
  const { context, page, problems } = await newPage(lang);
  const step = (s) => console.log(`  [${lang}/${tier}] ${s}`);
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    await shot(page, `${lang}-1-title`);
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    if (!htmlLang.startsWith(lang)) throw new Error('page language is ' + htmlLang);

    await page.click('[data-test=play]');
    await page.click('[data-test=slot-0]');
    await page.click('[data-test=avatar-1]');
    if (lang === 'en') await page.fill('[data-test=name]', 'Sam9!');
    await shot(page, `${lang}-2-name`);
    if (lang === 'en') {
      const v = await page.inputValue('[data-test=name]');
      if (v !== 'Sam') throw new Error('name filter kept non-letters: ' + v);
      await page.keyboard.press('Enter');
    } else {
      await page.click('[data-test=skip-name]');
    }
    await shot(page, `${lang}-3-cycle`);
    await page.click(`[data-test=cycle-${tier}]`);
    step('cycle chosen');

    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
    await page.locator('#dialogue').waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await shot(page, `${lang}-4-welcome`);
    await talkThrough(page);
    step('welcome dialogue done');

    const ok = await page.evaluate(() => window.DCC.debug.goTo('fixer'));
    if (!ok) throw new Error('could not stand in front of Théo');
    await page.waitForTimeout(200);
    await shot(page, `${lang}-5-hub`);
    await page.keyboard.press('Space');
    await page.locator('#dialogue').waitFor();
    if ((await talkThrough(page)) !== 'choices') throw new Error('Théo did not offer a choice');
    await page.locator('#dialogue .choices button').first().click();
    step('puzzle 1 opened');

    // Sequence puzzle: one wrong try, then the right order.
    const seq = hub.puzzles.find((p) => p.family === 'fixer_steps' && p.tiers.includes(tier));
    await page.locator(`[data-puzzle=${seq.id}]`).waitFor();
    const order = seq.steps.map((s) => s.id);
    const wrong = [order[1], order[0], ...order.slice(2)];
    for (const id of wrong) await page.click(`[data-step=${id}]`);
    await page.click('[data-test=sequence-check]');
    await page.locator('.card .feedback').waitFor();
    await shot(page, `${lang}-6-hint`);
    const placed = await page.locator('[data-placed]').count();
    for (const id of order.slice(placed)) await page.click(`[data-step=${id}]`);
    await page.click('[data-test=sequence-check]');
    await page.locator('[data-test=puzzle-continue]').click();
    step('puzzle 1 solved after a hint');

    await page.locator('#dialogue').waitFor();
    await talkThrough(page);
    const choice = hub.puzzles.find((p) => p.family === 'fixer_first_try' && p.tiers.includes(tier));
    await page.locator(`[data-puzzle=${choice.id}]`).waitFor();
    await shot(page, `${lang}-7-choice`);
    await page.click('[data-correct=true]');
    await page.locator('[data-test=puzzle-continue]').click();
    await page.locator('#dialogue').waitFor();
    await talkThrough(page);
    step('puzzle 2 solved');

    const slot = await page.evaluate(() => window.DCC.debug.slot());
    if (!slot.puzzles[seq.id] || !slot.puzzles[choice.id]) throw new Error('puzzles not saved');
    if (slot.hints['4b'] !== 1) throw new Error('expected 1 hint on 4b, got ' + slot.hints['4b']);
    if (!slot.achievements.first_fix || !slot.flags.fixer_done) throw new Error('achievement or flag missing');
    if (slot.tier !== tier) throw new Error('tier not saved');

    // Journal, then save and quit, then continue from the slot.
    await page.click('[data-test=menu]');
    await page.click('[data-test=journal]');
    await page.waitForTimeout(200);
    await shot(page, `${lang}-8-journal`);
    await page.keyboard.press('Escape');
    await page.click('[data-test=quit]');
    await page.locator('[data-test=play]').waitFor();
    await page.click('[data-test=play]');
    await page.waitForTimeout(200);
    await shot(page, `${lang}-9-slots`);
    await page.click('[data-test=slot-0]');
    await page.waitForFunction(() => window.DCC.debug.scene === 'Hub');
    step('saved and resumed');

    if (problems.length) throw new Error(problems.join('\n'));
    console.log(`PASS ${lang}/${tier}`);
  } catch (e) {
    failures++;
    console.error(`FAIL ${lang}/${tier}: ${e.message}`);
    if (problems.length) console.error(problems.join('\n'));
    await shot(page, `${lang}-fail`);
  } finally {
    await context.close();
  }
}

async function touchCheck() {
  // A tablet-sized screen with touch: the on-screen controls must appear.
  const { context, page, problems } = await newPage('en', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    await page.tap('[data-test=play]');
    await page.tap('[data-test=slot-0]');
    await page.tap('[data-test=avatar-2]');
    await page.tap('[data-test=skip-name]');
    await page.tap('[data-test=cycle-E2]');
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub');
    await page.locator('#touch .act').waitFor();
    await page.locator('#dialogue').waitFor();
    for (let i = 0; i < 12 && await page.locator('#dialogue').isVisible(); i++) {
      await page.tap('#touch .act');
      await page.waitForTimeout(150);
    }
    await shot(page, 'touch-hub');
    // Open the menu card: the on-screen controls must hide behind it.
    await page.tap('[data-test=menu]');
    await page.waitForTimeout(150);
    if (await page.locator('#touch .act').isVisible()) throw new Error('touch controls still showing over a card');
    await shot(page, 'touch-menu');
    if (problems.length) throw new Error(problems.join('\n'));
    console.log('PASS touch');
  } catch (e) {
    failures++;
    console.error('FAIL touch: ' + e.message);
  } finally {
    await context.close();
  }
}

// ---------- Dungeon 2, start to finish ----------
async function solvePuzzle(page, tier, problems) {
  const card = page.locator('#panel [data-puzzle]');
  const id = await card.getAttribute('data-puzzle');
  const p = area2.puzzles.find((x) => x.id === id) || hub.puzzles.find((x) => x.id === id);
  if (!p) throw new Error('unknown puzzle on screen: ' + id);
  if (p.tiers && !p.tiers.includes(tier)) throw new Error(`${id} is not written for ${tier}`);
  const hint = () => page.locator('#panel .feedback:not(.good):not(.note)').waitFor({ timeout: 2000 });
  if (p.type === 'choice' || p.type === 'predict') {
    while (await page.locator('[data-test=predict-next]').count()) await page.click('[data-test=predict-next]');
    await page.locator('#panel .options button:not([data-correct])').first().click();
    await hint();
    await page.click('#panel [data-correct=true]');
  } else if (p.type === 'sort') {
    const binIds = p.bins.map((b) => b.id);
    const ok = (it) => (Array.isArray(it.bin) ? it.bin : [it.bin]);
    const strict = p.items.find((it) => ok(it).length < binIds.length);
    await page.click(`[data-item="${strict.id}"]`);
    await page.click(`[data-bin="${binIds.find((b) => !ok(strict).includes(b))}"]`);
    await hint();
    for (const it of p.items) {
      await page.click(`[data-item="${it.id}"]`);
      await page.click(`[data-bin="${ok(it)[0]}"]`);
    }
  } else if (p.type === 'match') {
    await page.click(`[data-left="${p.pairs[0].id}"]`);
    await page.click(`[data-right="${p.pairs[1].id}"]`);
    await hint();
    for (const pr of p.pairs) {
      await page.click(`[data-left="${pr.id}"]`);
      await page.click(`[data-right="${pr.id}"]`);
    }
  } else if (p.type === 'spot') {
    await page.click(`[data-spot="${p.spots.find((s) => !s.clue).id}"]`);
    await hint();
    for (const s of p.spots.filter((x) => x.clue)) await page.click(`[data-spot="${s.id}"]`);
  } else {
    throw new Error('test does not know puzzle type ' + p.type);
  }
  await page.locator('[data-test=puzzle-continue]').click();
  return p;
}

/** Talks, picks the first choice, solves any puzzle that opens, until everything closes. */
async function converse(page, tier, solved, problems) {
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(90);
    if (await page.locator('#panel [data-puzzle]').count()) { solved.push((await solvePuzzle(page, tier, problems)).id); continue; }
    if (!(await page.locator('#dialogue').isVisible())) {
      await page.waitForTimeout(250);
      if (!(await page.locator('#dialogue').isVisible()) && !(await page.locator('#panel [data-puzzle]').count())) return;
      continue;
    }
    const choice = page.locator('#dialogue .choices button');
    if (await choice.count()) { await choice.first().click(); continue; }
    await page.keyboard.press('Space');
  }
  throw new Error('conversation did not end');
}

async function dungeon(lang, tier) {
  const { context, page, problems } = await newPage(lang);
  const step = (s) => console.log(`  [dungeon ${lang}/${tier}] ${s}`);
  const solved = [];
  const flags = () => page.evaluate(() => window.DCC.debug.flags());
  const go = async (name) => {
    const ok = await page.evaluate((n) => window.DCC.debug.goTo(n), name);
    if (!ok) throw new Error('could not stand by ' + name);
    await page.waitForTimeout(150);
    await page.keyboard.press('Space');
    await converse(page, tier, solved, problems);
  };
  const need = async (flag) => { if (!(await flags())[flag]) throw new Error('flag not set: ' + flag); };
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    await page.click('[data-test=play]');
    await page.click('[data-test=slot-0]');
    await page.click('[data-test=avatar-3]');
    await page.click('[data-test=skip-name]');
    await page.click(`[data-test=cycle-${tier}]`);
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await go('gate2');
    await page.waitForFunction(() => window.DCC.debug.scene === 'Dungeon2', null, { timeout: 5000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await need('got_lantern');
    await shot(page, `d-${lang}-${tier}-1-atrium`);
    step('entered the temple, got the lantern');

    // Hall of Traces (2a)
    await go('juno_a');
    await need('d2_traces_done');
    await go('hidden_door');
    await need('hall_door_open');
    await go('juno_b');
    await go('board');
    await go('mirror');
    await shot(page, `d-${lang}-${tier}-2-hall`);
    await go('chest_traces');
    await need('got_piece_traces');
    step('Hall of Traces done');

    // Vault of Keys (2b), with a save and resume in the middle
    await go('kai');
    await need('d2_password_done');
    await page.click('[data-test=menu]');
    await page.click('[data-test=quit]');
    await page.locator('[data-test=play]').waitFor();
    await page.click('[data-test=play]');
    await page.click('[data-test=slot-0]');
    await page.waitForFunction(() => window.DCC.debug.scene === 'Dungeon2', null, { timeout: 5000 });
    await page.waitForTimeout(500);
    step('saved and resumed inside the temple');
    for (const s of ['stone2', 'stone1']) { await page.evaluate((n) => window.DCC.debug.walkTo(n), s); await page.waitForTimeout(250); }
    await converse(page, tier, solved, problems); // wrong order: the stones pop back up
    if ((await flags()).keystones_done) throw new Error('key stones opened in the wrong order');
    for (const s of ['stone1', 'stone2', 'stone3']) { await page.evaluate((n) => window.DCC.debug.walkTo(n), s); await page.waitForTimeout(250); }
    await converse(page, tier, solved, problems);
    await need('keystones_done');
    await go('chest_keys');
    await need('got_piece_keys');
    step('Vault of Keys done');

    // Window Gallery (2c)
    await go('nova');
    await go('easel');
    await go('nova');
    await go('laptop');
    await shot(page, `d-${lang}-${tier}-3-gallery`);
    await go('chest_gallery');
    await need('got_piece_gallery');
    step('Window Gallery done');

    // Final room
    await go('merchant');
    await need('area2_done');
    await shot(page, `d-${lang}-${tier}-4-final`);
    const slot = await page.evaluate(() => window.DCC.debug.slot());
    if (!slot.items.includes('badge_2')) throw new Error('no badge');
    const expected = area2.puzzles.filter((p) => p.tiers.includes(tier)).map((p) => p.id);
    const missing = expected.filter((id) => !slot.puzzles[id]);
    if (missing.length) throw new Error('puzzles not solved: ' + missing.join(', '));
    for (const el of ['2a', '2b', '2c']) if (!slot.hints[el]) throw new Error('hints not counted for ' + el);
    for (const a of ['lantern_lit', 'secret_door', 'wing_traces', 'wing_keys', 'wing_gallery', 'area2_badge']) if (!slot.achievements[a]) throw new Error('missing achievement ' + a);
    step(`final room done, ${solved.length} puzzles solved`);

    // Home again: the village has grown
    await page.evaluate(() => window.DCC.debug.walkTo('exit_c'));
    await page.waitForFunction(() => window.DCC.debug.scene === 'Hub', null, { timeout: 5000 });
    await page.waitForTimeout(800);
    await converse(page, tier, solved, problems);
    await need('saw_village_grow');
    await go('fixer');
    await page.click('[data-test=menu]');
    await page.click('[data-test=journal]');
    await page.waitForTimeout(200);
    await shot(page, `d-${lang}-${tier}-5-journal`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    step('back in the village, garden and shop open');

    if (problems.length) throw new Error(problems.join('\n'));
    console.log(`PASS dungeon ${lang}/${tier}`);
  } catch (e) {
    failures++;
    console.error(`FAIL dungeon ${lang}/${tier}: ${e.message}`);
    if (problems.length) console.error(problems.join('\n'));
    await shot(page, `d-${lang}-${tier}-fail`);
  } finally {
    await context.close();
  }
}

await run('en', 'E3');
await run('fr', 'E2');
await touchCheck();
for (const [lang, tier] of [['en', 'E2'], ['en', 'E3'], ['fr', 'E2'], ['fr', 'E3']]) await dungeon(lang, tier);
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
