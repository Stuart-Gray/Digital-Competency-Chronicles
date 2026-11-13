// Builds a single-file copy of the game for the Claude Artifact preview (developers only).
// The real game on GitHub Pages does not use this: it runs straight from the source files.
//
//   node tools/build-artifact.mjs [output.html]        (default: dist/artifact.html)
//
// Bundles src/ with esbuild (fetched by npx, or set ESBUILD=/path/to/esbuild), inlines the CSS,
// and embeds the content JSON, map, art and fonts so the page needs nothing but Phaser from the CDN.
// The output has no <html>/<head>/<body> tags because the Artifact host adds them.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'artifact.html');
const MIME = { '.png': 'image/png', '.woff2': 'font/woff2' };
const dataUri = (rel) => `data:${MIME[extname(rel)]};base64,${readFileSync(join(root, rel)).toString('base64')}`;

// 1. JavaScript bundle
const esbuild = process.env.ESBUILD;
const args = ['src/main.js', '--bundle', '--format=iife', '--minify', '--target=es2020', '--legal-comments=none'];
const js = esbuild
  ? execFileSync(esbuild, args, { cwd: root, encoding: 'utf8' })
  : execFileSync('npx', ['--yes', 'esbuild@0.24.0', ...args], { cwd: root, encoding: 'utf8' });

// 2. CSS with fonts and the avatar sheet inlined
let css = readFileSync(join(root, 'src/ui/style.css'), 'utf8');
css = css.replace(/url\("\.\.\/\.\.\/(assets\/[^"]+)"\)/g, (m, rel) => `url("${dataUri(rel)}")`);

// 3. Content, map and art
const files = {};
for (const f of readdirSync(join(root, 'content')).filter((n) => n.endsWith('.json'))) {
  files[`content/${f}`] = JSON.parse(readFileSync(join(root, 'content', f), 'utf8'));
}
for (const f of readdirSync(join(root, 'maps')).filter((n) => n.endsWith('.tmj'))) {
  files[`maps/${f}`] = JSON.parse(readFileSync(join(root, 'maps', f), 'utf8'));
}
const art = [
  'assets/tiles/hub.png', 'assets/tiles/dungeon.png',
  'assets/sprites/hero.png', 'assets/sprites/hero_parts.png', 'assets/sprites/npcs.png', 'assets/sprites/fx.png',
  'assets/sprites/villagers.png', 'assets/sprites/critters.png',
  ...readdirSync(join(root, 'assets/pictures')).filter((n) => n.endsWith('.png')).map((n) => `assets/pictures/${n}`),
];
for (const rel of art) files[rel] = dataUri(rel);

// 4. Page markup from index.html
const html = readFileSync(join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<!-- Phaser 3'));
const phaser = html.match(/<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/phaser@[^"]+)"><\/script>/)[1];

const page = `<title>Digital Competency Chronicles</title>
<meta name="theme-color" content="#14121c">
<style>
:root { color-scheme: dark; }
${css}
</style>
${body}
<script>window.DCC_INLINE = ${JSON.stringify({ files }).replace(/</g, '\\u003c')};</script>
<script src="${phaser}"></script>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`wrote ${out} (${Math.round(page.length / 1024)} KB)`);
