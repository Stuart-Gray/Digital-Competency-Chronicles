// Thinking time: short reflection moments for the student.
//
// A reflection is a question with two to four answers that are ALL good answers (there is no
// right or wrong, no score). It shows once, a moment after the story flag in its "after" is
// set, for example when a wing of a dungeon is finished. Then one follow-up asks how the
// student feels about the idea now. Answers are kept in the save slot and in the Journal, and
// travel to the teacher inside the progress code. The questions are in the content files
// ("reflections"); see docs/content-schema.md.

import * as layer from '../ui/textLayer.js';
import * as speech from './speech.js';
import * as content from './content.js';
import * as achievements from './achievements.js';
import { t, getLang, getTier, pickForTier } from './i18n.js';
import { tt } from './teacherText.js';
import { keyOf } from './progress.js';

const el = layer.el;
export const FEELINGS = [1, 2, 3]; // 1 could explain it, 2 still practising, 3 would like help
export const FEEL_ICON = { 1: '💬', 2: '🌱', 3: '✋' };

/** Every reflection written for this cycle, with the content file it came from. */
export function listFor(tier = getTier()) {
  const out = [];
  for (const file of content.CONTENT_FILES) {
    const data = content.get(file);
    for (const r of pickForTier((data && data.reflections) || [], tier)) out.push({ ...r, file });
  }
  return out;
}

const answered = (slot, key) => !!(slot.reflections && slot.reflections[key] && slot.reflections[key].choice);
const seen = (slot, key) => !!(slot.reflections && slot.reflections[key]);

/** Reflections the player has reached (the flag is set), split into answered and waiting. */
export function reached(slot, tier = slot.tier) {
  return listFor(tier).filter((r) => slot.flags[r.after]).map((r) => ({ def: r, key: keyOf(r), answer: answered(slot, keyOf(r)) ? slot.reflections[keyOf(r)] : null }));
}

/** The next reflection to show by itself: reached, and never shown before. */
export function next(slot) {
  return listFor(slot.tier).find((r) => slot.flags[r.after] && !seen(slot, keyOf(r))) || null;
}

/** The text of the answer a player picked, in the current language. */
export function answerText(def, answer) {
  const o = def.options.find((x) => x.id === answer.choice);
  return o ? t(o.text) : '';
}

// ---------- showing one when the game is calm ----------
let calmSince = 0;
let showing = false;
const greeted = new WeakSet(); // save slots already checked for questions from an earlier visit

/**
 * Called from the world's update loop. Opens the next reflection once nothing else has been
 * on screen for a moment (so it never interrupts a talk, a puzzle or a walk through a door).
 * ctx = { slot, enabled, busy, save, after }
 */
export function tick(now, ctx) {
  if (showing) return;
  if (ctx.busy || !ctx.enabled) { calmSince = 0; return; }
  if (!greeted.has(ctx.slot)) {
    // Questions reached before this visit (an older save, or the player left right away) wait in
    // the Journal, so a returning player is not met by several cards in a row.
    greeted.add(ctx.slot);
    const waiting = listFor(ctx.slot.tier).filter((r) => ctx.slot.flags[r.after] && !seen(ctx.slot, keyOf(r)));
    if (waiting.length) {
      ctx.slot.reflections = ctx.slot.reflections || {};
      for (const r of waiting) ctx.slot.reflections[keyOf(r)] = { later: true };
      ctx.save();
      layer.toast(tt('reflect.title'), tt('reflect.waiting'));
    }
    return;
  }
  if (!calmSince) { calmSince = now; return; }
  if (now - calmSince < 900) return;
  calmSince = now; // look again in a moment, not every frame
  const def = next(ctx.slot);
  if (!def) return;
  showing = true;
  open(ctx.slot, def).then(() => {
    showing = false;
    calmSince = 0;
    ctx.save();
    if (ctx.after) ctx.after();
  });
}

// ---------- the card ----------

/** Opens the reflection card. Resolves with true when the player answered, false for "Later". */
export function open(slot, def) {
  return new Promise((resolve) => {
    const key = keyOf(def);
    const data = content.get(def.file) || {};
    const npc = def.speaker && data.npcs && data.npcs[def.speaker];
    const prompt = t(def.prompt);
    slot.reflections = slot.reflections || {};
    const before = slot.reflections[key] || {};
    const draft = { choice: before.choice || null, feel: before.feel || 0 };

    // "pz" = a question card: src/ui/cardFit.js keeps it on one screen, like the puzzle cards.
    const card = el('section', { class: 'card reflect pz', 'aria-labelledby': 'rf-title', 'data-reflection': key });
    const who = el('p', { class: 'who', hidden: true });
    const body = el('div', { class: 'body' });
    // The bottom row: a short line on the left (no wrong answer, or the thank-you), buttons on the right.
    const talk = el('div', { class: 'talk' });
    const actions = el('div', { class: 'actions' });
    card.append(...[
      def.element ? el('span', { class: 'tag', title: tt('reflect.elementTag') }, def.element) : null,
      el('div', { class: 'head' }, el('h2', { id: 'rf-title' }, '💭 ' + tt('reflect.title')), who),
      body, el('div', { class: 'foot' }, talk, actions),
    ].filter(Boolean));

    const finish = (ok) => { speech.stop(); layer.hidePanel(); resolve(ok); };
    const keep = () => {
      // "Later": remember that it was shown, and keep whatever was already picked.
      slot.reflections[key] = draft.choice ? { ...before, choice: draft.choice, feel: draft.feel, at: new Date().toISOString(), tier: slot.tier } : { ...before, later: true };
    };
    const later = () => { keep(); finish(false); };
    const listen = (text) => (speech.isSupported()
      ? el('button', { class: 'small', 'data-test': 'reflect-listen', onclick: () => speech.sample(text, getLang()) }, '🔊 ' + tt('reflect.listen'))
      : null);
    const laterBtn = () => el('button', { class: 'link', 'data-test': 'reflect-later', onclick: later }, tt('reflect.later'));

    function askChoice() {
      const spoken = [prompt, ...def.options.map((o) => t(o.text))].join('. ');
      body.innerHTML = '';
      actions.innerHTML = '';
      talk.innerHTML = '';
      who.textContent = npc ? tt('reflect.asks', { name: t(npc.name) }) : '';
      who.hidden = !npc;
      body.append(
        el('p', { class: 'prompt' }, prompt),
        el('div', { class: 'options', role: 'group', 'aria-label': tt('reflect.title') },
          def.options.map((o) => el('button', {
            'data-option': o.id, 'aria-pressed': String(draft.choice === o.id),
            onclick: () => { draft.choice = o.id; askFeel(); },
          }, el('span', {}, t(o.text))))),
      );
      talk.append(el('p', { class: 'help' }, tt('reflect.noWrong')));
      actions.append(laterBtn(), listen(spoken));
      layer.announce(prompt);
      speech.speak(spoken, getLang());
    }

    function askFeel() {
      const q = tt('reflect.feelQuestion');
      const spoken = [q, ...FEELINGS.map((f) => tt('reflect.feel.' + f))].join('. ');
      body.innerHTML = '';
      actions.innerHTML = '';
      talk.innerHTML = '';
      body.append(
        el('p', { class: 'picked' }, '✓ ' + answerText(def, draft)),
        el('p', { class: 'prompt' }, q),
        el('div', { class: 'options', role: 'group', 'aria-label': q },
          FEELINGS.map((f) => el('button', {
            'data-feel': String(f), 'aria-pressed': String(draft.feel === f),
            onclick: () => { draft.feel = f; done(); },
          }, el('span', { class: 'emo', 'aria-hidden': 'true' }, FEEL_ICON[f]), el('span', {}, tt('reflect.feel.' + f))))),
      );
      actions.append(laterBtn(), listen(spoken));
      layer.announce(q);
      speech.speak(spoken, getLang());
      setTimeout(() => { const b = body.querySelector('.options button'); if (b) b.focus({ preventScroll: true }); }, 30);
    }

    function done() {
      slot.reflections[key] = { choice: draft.choice, feel: draft.feel, at: new Date().toISOString(), tier: slot.tier };
      const thanks = tt(draft.feel === 3 ? 'reflect.thanksHelp' : 'reflect.thanks');
      body.innerHTML = '';
      actions.innerHTML = '';
      talk.innerHTML = '';
      card.classList.add('solved');
      body.append(
        el('p', { class: 'picked' }, '✓ ' + answerText(def, draft)),
        el('p', { class: 'picked' }, FEEL_ICON[draft.feel] + ' ' + tt('reflect.feel.' + draft.feel)),
      );
      talk.append(el('p', { class: 'feedback good', role: 'status' }, thanks));
      const btn = el('button', { class: 'primary', 'data-test': 'reflect-continue', onclick: () => { finish(true); achievements.unlock(slot, 'deep_thinker'); } }, tt('reflect.continue'));
      actions.append(btn);
      layer.announce(thanks);
      speech.speak(thanks, getLang());
      setTimeout(() => btn.focus({ preventScroll: true }), 30);
    }

    layer.showPanel(card, { onCancel: later });
    askChoice();
  });
}
