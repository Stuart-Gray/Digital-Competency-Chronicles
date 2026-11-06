// Command-line content check: node tools/validate.mjs
// Exits with code 1 if any content file has an error. Runs in the GitHub Pages workflow too.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../src/systems/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content');
const files = {};
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const name = f.replace(/\.json$/, '');
  try {
    files[name] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  } catch (e) {
    files[name] = null;
    console.error(`${f}: not valid JSON (${e.message})`);
  }
}
const { errors, warnings } = validateContent(files);
warnings.forEach((w) => console.warn('warning:', w));
errors.forEach((e) => console.error('error:', e));
console.log(`Checked ${Object.keys(files).length} content files: ${errors.length} errors, ${warnings.length} warnings.`);
process.exit(errors.length ? 1 : 0);
