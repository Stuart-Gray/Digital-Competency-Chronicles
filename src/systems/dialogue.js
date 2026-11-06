// Plays dialogue nodes from a content file through the HTML dialogue box.
//
// A node is a list of lines. A line can have:
//   speaker   npc id from the file's "npcs" (shown as a name tag)
//   text      { en, fr }, may use {name} and other placeholders
//   tiers     only shown for these cycles
//   if/ifNot  only shown when a story flag is (not) set
//   choices   [{ text, next, action }]
//   action    "puzzle:<id>", "set:<flag>", "unset:<flag>", "goto:<node>",
//             "give:<item>", "achieve:<id>" or "travel:<Scene>:<spawn>"
// See docs/content-schema.md.

import * as layer from '../ui/textLayer.js';
import { t, forTier } from './i18n.js';
import * as content from './content.js';

const END = '__end__'; // special "node" that stops the conversation

/**
 * ctx = {
 *   flags: {},                       story flags of the save slot (read and written)
 *   vars: {},                        placeholder values, e.g. { name: 'Sam' }
 *   startPuzzle: async (id) => {},   called for "puzzle:<id>" actions
 *   give, achieve, travel, changed    optional callbacks from the world scene
 * }
 */
export async function run(file, nodeId, ctx) {
  const data = content.get(file);
  let next = nodeId;
  let guard = 0;
  try {
    while (next && next !== END && guard++ < 50) {
      const lines = (data.dialogue[next] || []).filter((l) => showLine(l, ctx));
      next = null;
      for (const line of lines) {
        const speaker = line.speaker && data.npcs[line.speaker] ? t(data.npcs[line.speaker].name) : '';
        const choices = (line.choices || []).filter((c) => forTier(c));
        const picked = await layer.say({
          speaker,
          text: t(line.text, ctx.vars),
          choices: choices.map((c) => t(c.text, ctx.vars)),
        });
        if (line.action) {
          const r = await doAction(line.action, ctx);
          if (r) { next = r; break; }
        }
        if (picked != null) {
          const c = choices[picked];
          if (c.action) {
            const r = await doAction(c.action, ctx);
            if (r) { next = r; break; }
          }
          next = c.next || null;
          break;
        }
      }
    }
  } finally {
    layer.closeDialogue();
  }
}

function showLine(line, ctx) {
  if (!forTier(line)) return false;
  if (line.if && !ctx.flags[line.if]) return false;
  if (line.ifNot && ctx.flags[line.ifNot]) return false;
  return true;
}

/** Runs an action. Returns a node id to jump to, or null. */
async function doAction(action, ctx) {
  const [kind, arg, arg2] = String(action).split(':');
  if (kind === 'set') { ctx.flags[arg] = true; ctx.changed && ctx.changed(); }
  else if (kind === 'unset') { delete ctx.flags[arg]; ctx.changed && ctx.changed(); }
  else if (kind === 'goto') return arg;
  else if (kind === 'give' && ctx.give) { ctx.give(arg); ctx.changed && ctx.changed(); }
  else if (kind === 'achieve' && ctx.achieve) ctx.achieve(arg);
  else if (kind === 'travel' && ctx.travel) { ctx.travel(arg, arg2); return END; }
  else if (kind === 'puzzle' && ctx.startPuzzle) {
    layer.closeDialogue();
    const result = await ctx.startPuzzle(arg);
    // The player left the puzzle for later: end the conversation here.
    if (!result || !result.solved) return END;
  }
  return null;
}

/** Picks which node an NPC should say, from its "dialogue" list (first match wins). */
export function nodeFor(file, npcId, flags) {
  const npc = content.get(file).npcs[npcId];
  if (!npc) return null;
  for (const d of npc.dialogue || []) {
    if (d.if && !flags[d.if]) continue;
    if (d.ifNot && flags[d.ifNot]) continue;
    return d.node;
  }
  return null;
}
