// Builds a single-file copy of the game for the Claude Artifact preview (developers only).
// The real game on GitHub Pages does not use this: it runs straight from the source files.
//
//   node tools/build-artifact.mjs [output.html]        (default: dist/artifact.html)
//
// Also writes teacher.html next to it: the teacher dashboard as one file, published beside the game
// so the "Open the teacher dashboard" link in the teacher corner works in the preview too.
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
const big = { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
function bundle(entry) {
  const args = [entry, '--bundle', '--format=iife', '--minify', '--target=es2020', '--legal-comments=none', '--log-level=error'];
  return esbuild ? execFileSync(esbuild, args, big) : execFileSync('npx', ['--yes', 'esbuild@0.24.0', ...args], big);
}
const inlineScript = (code) => code.replace(/<\/script/gi, '<\\/script');
const inlineJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const inlineFonts = (text) => text.replace(/url\("\.\.\/\.\.\/(assets\/[^"]+)"\)/g, (m, rel) => `url("${dataUri(rel)}")`);
const js = bundle('src/main.js');

// 2. CSS with fonts and the avatar sheet inlined
const css = inlineFonts(readFileSync(join(root, 'src/ui/style.css'), 'utf8') + '\n' + readFileSync(join(root, 'src/ui/teacher-layer.css'), 'utf8'));

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
<script>window.DCC_INLINE = ${inlineJson({ files })};</script>
<script src="${phaser}"></script>
<script>${inlineScript(js)}</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`wrote ${out} (${Math.round(page.length / 1024)} KB)`);

// 5. The teacher dashboard as one complete page: its own CSS, the content it reads and the QR reader
const shell = readFileSync(join(root, 'teacher.html'), 'utf8');
const dashFiles = Object.fromEntries(Object.entries(files).filter(([name]) => name.startsWith('content/')));
const teacherPage = shell
  .replace('<link rel="stylesheet" href="./src/teacher/teacher.css">', () => `<style>\n${inlineFonts(readFileSync(join(root, 'src/teacher/teacher.css'), 'utf8'))}\n</style>`)
  .replace('<script type="module" src="./src/teacher/main.js"></script>', () => [
    `<script>window.DCC_INLINE = ${inlineJson({ files: dashFiles })};</script>`,
    `<script>${inlineScript(readFileSync(join(root, 'src/vendor/jsQR.js'), 'utf8'))}</script>`,
    `<script>${inlineScript(bundle('src/teacher/main.js'))}</script>`,
  ].join('\n  '));
if (!teacherPage.includes('window.DCC_INLINE')) throw new Error('teacher.html has changed: update tools/build-artifact.mjs');
const teacherOut = join(dirname(out), 'teacher.html');
writeFileSync(teacherOut, teacherPage);
console.log(`wrote ${teacherOut} (${Math.round(teacherPage.length / 1024)} KB)`);
