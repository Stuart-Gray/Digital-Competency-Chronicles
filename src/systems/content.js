// Holds the content JSON files (loaded by the Preload scene) and checks them.

import { validateContent } from './validate.js';

export const CONTENT_FILES = ['ui', 'hub', 'area2', 'music'];

const store = {};

export function init(cache) {
  for (const name of CONTENT_FILES) store[name] = cache.json.get('content-' + name);
  const { errors, warnings } = validateContent(store);
  // Errors go to the console so the smoke test and editors notice them.
  errors.forEach((e) => console.error('[content]', e));
  warnings.forEach((w) => console.warn('[content]', w));
  return { errors, warnings };
}

export function get(name) { return store[name]; }

export function puzzle(file, id) {
  return (store[file].puzzles || []).find((p) => p.id === id);
}
