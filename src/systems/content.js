// Holds the content JSON files (loaded by the Preload scene) and checks them.

import { validateContent } from './validate.js';
import { CONTENT_FILES } from './contentFiles.js';
import { setStrings as setTeacherStrings } from './teacherText.js';

export { CONTENT_FILES };

const store = {};

export function init(cache) {
  for (const name of CONTENT_FILES) store[name] = cache.json.get('content-' + name);
  setTeacherStrings(store.teacher);
  const { errors, warnings } = validateContent(store);
  // Errors go to the console so the smoke test and editors notice them.
  errors.forEach((e) => console.error('[content]', e));
  warnings.forEach((w) => console.warn('[content]', w));
  return { errors, warnings };
}

export function get(name) { return store[name]; }

/** Every content file, by name (for progress codes, which look across all of them). */
export function all() { return store; }

export function puzzle(file, id) {
  return (store[file].puzzles || []).find((p) => p.id === id);
}
