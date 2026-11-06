// Picks English or French text and filters content for the player's cycle (tier).
// All player-facing words come from /content; this file only chooses between them.

export const LANGS = ['en', 'fr'];
export const TIERS = ['E2', 'E3']; // later: 'S1', 'S2', 'S3' for secondary

const state = { lang: 'en', tier: 'E2', ui: {} };

export function setLang(lang) {
  state.lang = LANGS.includes(lang) ? lang : 'en';
  document.documentElement.lang = state.lang === 'fr' ? 'fr-CA' : 'en-CA';
}
export function getLang() { return state.lang; }
export function setTier(tier) { state.tier = tier; }
export function getTier() { return state.tier; }
export function setUiStrings(ui) { state.ui = ui || {}; }

/** Guess a starting language from the browser, for the very first visit. */
export function browserLang() {
  const l = (navigator.language || 'en').toLowerCase();
  return l.startsWith('fr') ? 'fr' : 'en';
}

/** Turns a {en, fr} object into a string, filling {placeholders} from vars. */
export function t(text, vars) {
  if (text == null) return '';
  let s = typeof text === 'string' ? text : (text[state.lang] || text.en || '');
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

/** Looks up a UI string by dotted path in content/ui.json, e.g. ui('title.play'). */
export function ui(path, vars) {
  const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), state.ui.strings);
  if (v === undefined) {
    console.warn('Missing UI string:', path);
    return path;
  }
  return t(v, vars);
}

/** Does this piece of content apply to the current tier? No "tiers" = every tier. */
export function forTier(item, tier = state.tier) {
  return !item || !item.tiers || item.tiers.includes(tier);
}

/**
 * Keeps only the entries meant for this tier. When several entries share a
 * "family" (a Cycle 2 and a Cycle 3 version of the same thing), keeps the one
 * for this tier.
 */
export function pickForTier(list, tier = state.tier) {
  const out = [];
  const seenFamily = new Set();
  for (const item of list || []) {
    if (!forTier(item, tier)) continue;
    if (item.family) {
      if (seenFamily.has(item.family)) continue;
      seenFamily.add(item.family);
    }
    out.push(item);
  }
  return out;
}
