// Smoke test (developers only, not needed to play).
// Loads the game in a headless browser, once per language: picks a cycle, walks into the
// village, talks to Théo, solves both Fix-it puzzles (with one wrong try), and fails on any
// console error. Then plays all of Dungeon 2 (the Temple of Traces) for each cycle and
// language: every puzzle (one wrong try each), the hidden door, the key stones, the chests,
// the final room, a save-and-resume in the middle, and the trip home.
// Also checks the avatar maker: old saves, ready-made heroes, colours, Mix it up, keyboard use,
// and changing the look from the pause menu.
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
    await page.click('[data-test=look-done]');
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
    await page.waitForFunction(() => window.DCC.music().playing === 'village', null, { timeout: 5000 });
    step('village music playing');
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
  // A tablet-sized screen with touch: tap to move, tap a person to talk, no arrow pad unless asked for.
  const { context, page, problems } = await newPage('en', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const tapAt = async (pt) => page.touchscreen.tap(Math.round(pt.x), Math.round(pt.y));
  const waitStill = () => page.waitForFunction(() => !window.DCC.debug.walking(), null, { timeout: 15000 });
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    await page.tap('[data-test=play]');
    await page.tap('[data-test=slot-0]');
    await page.tap('[data-test=avatar-2]');
    await page.tap('[data-test=look-done]');
    await page.tap('[data-test=skip-name]');
    await page.tap('[data-test=cycle-E2]');
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub');
    await page.locator('#dialogue').waitFor();
    // Tapping the dialogue box moves it along.
    for (let i = 0; i < 12 && await page.locator('#dialogue').isVisible(); i++) {
      await page.tap('#dialogue');
      await page.waitForTimeout(150);
    }
    if (await page.locator('#touch .act').isVisible()) throw new Error('arrow pad showing although it is off by default');

    // Tap the ground a few tiles to the left: the hero walks there.
    const before = await page.evaluate(() => window.DCC.debug.pos());
    const me = await page.evaluate(() => {
      const r = window.DCC.game.canvas.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, u: r.width / 320 };
    });
    await page.waitForTimeout(400); // let the camera settle on the hero
    await tapAt({ x: me.x - 48 * me.u, y: me.y });
    await page.waitForTimeout(200);
    await waitStill();
    const after = await page.evaluate(() => window.DCC.debug.pos());
    if (before.x - after.x < 30) throw new Error(`tap to move did not move the hero (${before.x} -> ${after.x})`);
    await shot(page, 'touch-walked');

    // Tap the guide: the hero walks up and they talk.
    await tapAt(await page.evaluate(() => window.DCC.debug.screenOf('guide')));
    await page.locator('#dialogue').waitFor({ timeout: 15000 });
    const speaker = await page.locator('#dialogue .speaker').textContent().catch(() => '');
    if (!speaker) throw new Error('tapping the guide did not start a talk');
    await shot(page, 'touch-talk');
    for (let i = 0; i < 12 && await page.locator('#dialogue').isVisible(); i++) {
      await page.tap('#dialogue');
      await page.waitForTimeout(150);
    }

    // Théo is behind the shop counter: tapping the counter walks up to it and talks to him across it.
    await tapAt(await page.evaluate(() => window.DCC.debug.screenOf('counter30')));
    await page.locator('#dialogue').waitFor({ timeout: 20000 });
    await shot(page, 'touch-counter');
    for (let i = 0; i < 20 && await page.locator('#dialogue').isVisible(); i++) {
      if (await page.locator('#dialogue .choices button').count()) { await page.tap('#dialogue .choices button >> nth=-1'); }
      else await page.tap('#dialogue');
      await page.waitForTimeout(150);
      if (await page.locator('#panel [data-puzzle]').isVisible()) { await page.tap('#panel button:has-text("later"), #panel button:has-text("Leave")').catch(() => {}); }
    }

    // The arrow pad can be turned on in Settings, and hides behind cards.
    if (await page.locator('#panel').isVisible()) await page.keyboard.press('Escape');
    await page.tap('[data-test=menu]');
    await page.tap('#panel button:has-text("Settings")');
    await page.tap('#panel [data-setting=arrowPad] [data-value=true]');
    await page.tap('#panel .actions button');
    await page.waitForTimeout(150);
    if (await page.locator('#touch .act').isVisible()) throw new Error('touch controls still showing over a card');
    await page.tap('#panel button.primary');
    await page.locator('#touch .act').waitFor({ timeout: 3000 });
    await shot(page, 'touch-pad');
    if (problems.length) throw new Error(problems.join('\n'));
    console.log('PASS touch');
  } catch (e) {
    failures++;
    console.error('FAIL touch: ' + e.message);
    await shot(page, 'touch-fail');
  } finally {
    await context.close();
  }
}

// ---------- accessibility options ----------
async function a11yCheck() {
  // The device asks for reduced motion, and has the voices a Windows 11 laptop has.
  const { context, page, problems } = await newPage('en', { reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const V = (name, lang) => ({ name, lang, default: false, localService: true, voiceURI: name });
    const list = [V('Microsoft David - English (United States)', 'en-US'), V('Microsoft Zira - English (United States)', 'en-US'),
      V('Microsoft Clara Online (Natural) - English (Canada)', 'en-CA'), V('Microsoft Liam Online (Natural) - English (Canada)', 'en-CA'),
      V('Microsoft Sylvie Online (Natural) - French (Canada)', 'fr-CA'), V('Microsoft Antoine Online (Natural) - French (Canada)', 'fr-CA')];
    if (window.speechSynthesis) window.speechSynthesis.getVoices = () => list;
  });
  const step = (s) => console.log(`  [a11y] ${s}`);
  const has = (cls) => page.evaluate((c) => document.body.classList.contains(c), cls);
  const pick = async (key, value) => {
    await page.click(`[data-setting=${key}] [data-value="${value}"]`);
    await page.waitForTimeout(80);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.closest('[data-setting]') && document.activeElement.closest('[data-setting]').dataset.setting);
    if (focused !== key) throw new Error(`focus left the ${key} setting after choosing it (now on ${focused})`);
  };
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    if (!(await has('rm'))) throw new Error('device reduced-motion setting not followed');
    step('follows the device reduced-motion setting');

    await page.click('[data-test=settings]');
    await pick('highContrast', 'true');
    if (!(await has('hc'))) throw new Error('high contrast class missing');
    await pick('reduceMotion', 'off');
    if (await has('rm')) throw new Error('reduce motion off did not override the device');
    await pick('reduceMotion', 'on');
    await pick('font', 'dyslexia');
    if (!(await has('font-dyslexia'))) throw new Error('dyslexia font class missing');
    await pick('textSize', 'larger');
    const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim());
    if (scale !== '1.5') throw new Error('text size not applied: ' + scale);
    await pick('readAloud', 'true');
    await pick('voice', 'female');
    let info = await page.locator('[data-test=voice-info]').textContent();
    if (!info.includes('Clara')) throw new Error('female English voice should be Clara, got: ' + info);
    await pick('voice', 'male');
    info = await page.locator('[data-test=voice-info]').textContent();
    if (!info.includes('Liam')) throw new Error('male English voice should be Liam, got: ' + info);
    await pick('lang', 'fr');
    info = await page.locator('[data-test=voice-info]').textContent();
    if (!info.includes('Antoine')) throw new Error('male French voice should be Antoine, got: ' + info);
    await pick('lang', 'en');
    await pick('walkMode', 'toggle');
    await shot(page, 'a11y-settings');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dcc.v1.settings')));
    if (saved.voice !== 'male' || saved.textSize !== 'larger' || saved.walkMode !== 'toggle') throw new Error('settings not saved');
    await pick('textSize', 'normal');
    step('settings apply, save and keep focus');

    await page.click('#screen button.primary');
    await page.click('[data-test=play]');
    await page.click('[data-test=slot-0]');
    await page.click('[data-test=avatar-0]');
    await page.click('[data-test=look-done]');
    await page.click('[data-test=skip-name]');
    await page.click('[data-test=cycle-E2]');
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
    await page.locator('#dialogue').waitFor();
    await talkThrough(page);
    await shot(page, 'a11y-hub-contrast');

    // Toggle walking: one press starts, Space stops.
    await page.locator('#game canvas').focus().catch(() => {});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const p0 = await page.evaluate(() => window.DCC.debug.pos());
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    const p1 = await page.evaluate(() => window.DCC.debug.pos());
    if (p1.y === p0.y) throw new Error('toggle walking did not keep walking after the key was let go');
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const p2 = await page.evaluate(() => window.DCC.debug.pos());
    await page.waitForTimeout(300);
    const p3 = await page.evaluate(() => window.DCC.debug.pos());
    if (p3.y !== p2.y) throw new Error('Space did not stop toggle walking');
    step('toggle walking starts and stops');

    // Look around: a list of nearby people and things; picking one walks there and talks.
    await page.keyboard.press('KeyL');
    await page.locator('.card.look').waitFor();
    await shot(page, 'a11y-look');
    const names = await page.locator('[data-test=look-item] strong').allTextContents();
    if (!names.includes('Ada')) throw new Error('Ada not in the look-around list: ' + names.join(', '));
    await page.locator('[data-test=look-item]', { hasText: 'Ada' }).click();
    await page.locator('#dialogue').waitFor({ timeout: 15000 });
    await talkThrough(page);
    step('look around lists Ada and walks to her');

    if (problems.length) throw new Error(problems.join('\n'));
    console.log('PASS a11y');
  } catch (e) {
    failures++;
    console.error('FAIL a11y: ' + e.message);
    if (problems.length) console.error(problems.join('\n'));
    await shot(page, 'a11y-fail');
  } finally {
    await context.close();
  }
}

// ---------- the avatar maker ----------
async function avatarCheck() {
  const { context, page, problems } = await newPage('en');
  // A save from before the avatar maker: it only knows "avatar: 2" (the third ready-made hero).
  await page.addInitScript(() => {
    if (sessionStorage.getItem('old-save')) return;
    sessionStorage.setItem('old-save', '1');
    const now = new Date().toISOString();
    localStorage.setItem('dcc.v1.slot1', JSON.stringify({ v: 1, name: 'Old', avatar: 2, tier: 'E2', lang: 'en', created: now, updated: now, sessions: [now],
      location: { scene: 'Hub', x: null, y: null, facing: 'down' }, flags: {}, puzzles: {}, hints: {}, achievements: {}, items: [] }));
  });
  const step = (s) => console.log(`  [avatar] ${s}`);
  const pressed = (test) => page.getAttribute(`[data-test=${test}]`, 'aria-pressed');
  const expectPressed = async (test) => { if ((await pressed(test)) !== 'true') throw new Error(test + ' should be chosen'); };
  const inked = (sel) => page.evaluate((q) => {
    const c = document.querySelector(q);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  }, sel);
  const slotLook = (i) => page.evaluate((n) => (JSON.parse(localStorage.getItem('dcc.v1.slot' + n)) || {}).look, i);
  try {
    await page.goto(base);
    await page.locator('[data-test=play]').waitFor({ timeout: 15000 });
    await page.click('[data-test=play]');

    // The old save still shows its hero, and "Change look" opens the maker on that same hero.
    if ((await inked('[data-test=slot-1] canvas')) < 60) throw new Error('old save has no hero picture');
    await page.click('[data-test=change-look-1]');
    await page.click('[data-test=look-tab-hair]');
    await expectPressed('look-hair-short');
    await expectPressed('look-hairColor-blonde');
    await page.click('[data-test=look-hairColor-blue]');
    await page.click('[data-test=look-done]');
    const old = await slotLook(1);
    if (!old || old.hairColor !== 'blue' || old.top !== 'green') throw new Error('old save was not upgraded: ' + JSON.stringify(old));
    step('a save from before the maker keeps its hero and can be restyled');

    // New adventurer: twelve ready-made heroes, each with a spoken description.
    await page.click('[data-test=slot-0]');
    const heroes = await page.$$eval('.hero-grid button', (list) => list.map((b) => b.getAttribute('aria-label') || ''));
    if (heroes.length !== 12 || heroes.some((l) => l.length < 20)) throw new Error('hero grid: ' + JSON.stringify(heroes));
    await shot(page, 'avatar-1-heroes');

    // Surprise me: a look by chance and a joke. Back returns to the heroes.
    await page.click('[data-test=avatar-surprise]');
    if (!(await page.textContent('[data-test=look-quip]')).trim()) throw new Error('no joke after Surprise me');
    await page.click('[data-test=look-back]');
    step('twelve heroes, Surprise me tells a joke');

    // The hero who uses a wheelchair. Focus starts on "Looks good!" so Enter is the quick way through.
    await page.click('[data-test=avatar-8]');
    const focus = await page.evaluate(() => new Promise((r) => setTimeout(() => r(document.activeElement && document.activeElement.getAttribute('data-test')), 120)));
    if (focus !== 'look-done') throw new Error('focus should start on Looks good!, not ' + focus);
    await expectPressed('look-body-chair');
    if ((await inked('[data-test=look-preview]')) < 60) throw new Error('the big hero was not drawn');

    // Every choice has a spoken label, and each row has exactly one choice marked.
    for (const tab of ['body', 'hair', 'clothes', 'extras']) {
      await page.click(`[data-test=look-tab-${tab}]`);
      const rows = await page.$$eval('.maker-row .swatches', (groups) => groups.map((g) => ({
        named: !!g.getAttribute('aria-labelledby'),
        labels: [...g.querySelectorAll('button')].every((b) => (b.getAttribute('aria-label') || '').includes(':')),
        chosen: g.querySelectorAll('button[aria-pressed="true"]').length,
      })));
      if (!rows.length || rows.some((r) => !r.named || !r.labels || r.chosen !== 1)) throw new Error(`${tab} tab: ${JSON.stringify(rows)}`);
    }
    step('all four tabs: labels and one choice per row');

    // Keyboard: Enter on a swatch chooses it and the focus stays on it.
    await page.click('[data-test=look-tab-clothes]');
    await page.focus('[data-test=look-top-pink]');
    await page.keyboard.press('Enter');
    await expectPressed('look-top-pink');
    if ((await page.evaluate(() => document.activeElement.getAttribute('data-test'))) !== 'look-top-pink') throw new Error('focus left the swatch');
    await page.keyboard.press('ArrowRight');
    if ((await page.evaluate(() => document.activeElement.getAttribute('data-test'))) !== 'look-top-white') throw new Error('arrow keys do not move along the swatches');
    step('keyboard choosing keeps its place');

    // Hijab: the hair tab explains itself, and Mix it up never takes away a hijab or a wheelchair.
    await page.click('[data-test=look-tab-extras]');
    await page.click('[data-test=look-hat-hijab]');
    await page.click('[data-test=look-tab-hair]');
    await page.locator('[data-test=look-note]').waitFor();
    const jokes = new Set();
    for (let i = 0; i < 6; i++) {
      await page.click('[data-test=look-mix]');
      jokes.add(await page.textContent('[data-test=look-quip]'));
    }
    if (jokes.size < 2) throw new Error('Mix it up keeps telling the same joke');
    await page.click('[data-test=look-tab-extras]');
    await expectPressed('look-hat-hijab');
    await page.click('[data-test=look-tab-body]');
    await expectPressed('look-body-chair');
    await shot(page, 'avatar-2-maker');
    step('Mix it up changes the look, tells jokes, keeps hijab and wheelchair');

    await page.click('[data-test=look-tab-clothes]');
    await page.click('[data-test=look-top-teal]');
    await page.click('[data-test=look-done]');
    await page.click('[data-test=skip-name]');
    await page.click('[data-test=cycle-E3]');
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
    const saved = await slotLook(0);
    const KINDS = ['body', 'eyes', 'glasses', 'hair', 'hairColor', 'hat', 'hatColor', 'outfit', 'skin', 'top', 'bottom'].sort();
    if (JSON.stringify(Object.keys(saved || {}).sort()) !== JSON.stringify(KINDS)) throw new Error('saved look has unexpected fields: ' + JSON.stringify(saved));
    if (saved.body !== 'chair' || saved.hat !== 'hijab' || saved.top !== 'teal') throw new Error('look not saved: ' + JSON.stringify(saved));
    if (!(await page.evaluate(() => window.DCC.game.textures.exists('hero-player')))) throw new Error('the hero was not painted for the game');
    step('the look is saved (ids only) and painted in the village');

    // Change the look from the pause menu while playing.
    await page.locator('#dialogue').waitFor({ timeout: 5000 });
    await talkThrough(page);
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.click('[data-test=change-look]');
    await page.click('[data-test=look-tab-clothes]');
    await page.click('[data-test=look-outfit-jersey]');
    await page.click('[data-test=look-done]');
    await page.locator('[data-test=change-look]').waitFor();
    if ((await slotLook(0)).outfit !== 'jersey') throw new Error('look from the pause menu was not saved');
    await page.click('#panel button.primary');
    await page.waitForTimeout(200);
    await shot(page, 'avatar-3-village');
    step('pause menu: change my look');

    if (problems.length) throw new Error(problems.join('\n'));
    console.log('PASS avatar');
  } catch (e) {
    failures++;
    console.error('FAIL avatar: ' + e.message);
    if (problems.length) console.error(problems.join('\n'));
    await shot(page, 'avatar-fail');
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
  } else if (p.type === 'sequence') {
    const order = p.steps.map((x) => x.id);
    for (const sid of [order[1], order[0], ...order.slice(2)]) await page.click(`[data-step=${sid}]`);
    await page.click('[data-test=sequence-check]');
    await hint();
    const placed = await page.locator('[data-placed]').count();
    for (const sid of order.slice(placed)) await page.click(`[data-step=${sid}]`);
    await page.click('[data-test=sequence-check]');
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
    await page.click('[data-test=look-done]');
    await page.click('[data-test=skip-name]');
    await page.click(`[data-test=cycle-${tier}]`);
    await page.waitForFunction(() => window.DCC && window.DCC.debug.scene === 'Hub', null, { timeout: 10000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await go('gate2');
    await page.waitForFunction(() => window.DCC.debug.scene === 'Dungeon2', null, { timeout: 5000 });
    await page.waitForFunction(() => window.DCC.music().playing === 'temple', null, { timeout: 5000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await need('got_lantern');
    await shot(page, `d-${lang}-${tier}-1-atrium`);
    step('entered the temple, got the lantern');

    // Leave early and come back: the player must still walk with the keyboard both ways
    const canWalk = async (where) => {
      const a = await page.evaluate(() => window.DCC.debug.pos());
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
      const b = await page.evaluate(() => window.DCC.debug.pos());
      if (a.x === b.x && a.y === b.y) throw new Error('player cannot move after coming back to ' + where);
    };
    await page.evaluate(() => window.DCC.debug.walkTo('exit_a'));
    await page.waitForFunction(() => window.DCC.debug.scene === 'Hub', null, { timeout: 5000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await canWalk('the village');
    await go('gate2');
    await page.waitForFunction(() => window.DCC.debug.scene === 'Dungeon2', null, { timeout: 5000 });
    await page.waitForTimeout(700);
    await converse(page, tier, solved, problems);
    await canWalk('the temple');
    step('left the temple early, came back, still walking');

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

// SMOKE_ONLY=dungeon runs just the dungeon play-throughs, and SMOKE_ONE=1 only the first of those
// (faster while fixing a bug there); SMOKE_ONLY=touch runs just the tablet check, SMOKE_ONLY=a11y
// just the accessibility options, SMOKE_ONLY=avatar just the avatar maker
const only = process.env.SMOKE_ONLY;
if (only === 'touch') {
  await touchCheck();
} else if (only === 'a11y') {
  await a11yCheck();
} else if (only === 'avatar') {
  await avatarCheck();
} else {
if (only !== 'dungeon') {
  await run('en', 'E3');
  await run('fr', 'E2');
  await touchCheck();
  await a11yCheck();
  await avatarCheck();
}
for (const [lang, tier] of (process.env.SMOKE_ONE ? [['en','E2']] : [['en', 'E2'], ['en', 'E3'], ['fr', 'E2'], ['fr', 'E3']])) await dungeon(lang, tier);
}
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
