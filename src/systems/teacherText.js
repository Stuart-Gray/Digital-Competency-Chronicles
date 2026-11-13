// Words for the teacher layer (reflections, progress codes, teacher corner, dashboard).
// They live in content/teacher.json, apart from ui.json, so the dashboard page can load
// them without the rest of the game.

import { t } from './i18n.js';

let strings = {};

export function setStrings(file) { strings = (file && file.strings) || {}; }

/** Looks up a string by dotted path in content/teacher.json, e.g. tt('share.title'). */
export function tt(path, vars) {
  const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), strings);
  if (v === undefined) {
    console.warn('Missing teacher string:', path);
    return path;
  }
  return t(v, vars);
}

/** The raw value at a path (for lists of strings). */
export function raw(path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), strings);
}
