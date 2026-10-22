// Text on accent-coloured surfaces must follow the theme (owner/admin review, 22 Oct 2026).
// Light palettes use a dark accent, so a hard-coded dark label on var(--gold-primary) was 1.2:1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrast } from './src/brand-colors.js';

let passed = 0;
const check = (ok, message) => { assert.ok(ok, message); passed++; };

const css = ['app.css', 'workspace.css', 'unelivo.css', 'staff-unified.css', 'theme-palette.css'].map(f => fs.readFileSync('src/styles/' + f, 'utf8')).join('\n');
const ui = fs.readdirSync('src/ui').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('src/ui/' + f, 'utf8')).join('\n');

const hardcoded = css.match(/background:\s?var\(--gold(?:-primary)?\);\s?color:\s?#[0-9a-f]{3,6}/gi) || [];
check(hardcoded.length === 0, `accent backgrounds use var(--theme-on-accent) text, found: ${hardcoded.join(' | ')}`);
check(!/background: ?var\(--gold-gradient\)[^"]*color: ?#000;/.test(ui), 'accent avatars use var(--theme-on-accent) text');
check(!/background: ?#ef4444; ?color: ?var\(--theme-ink-ffffff/.test(ui), 'red counters keep fixed white text (light palettes remap --theme-ink-ffffff to dark ink)');

// theme.js: dark palettes put #171717 on the accent, light palettes put #ffffff.
const themes = [...fs.readFileSync('src/theme.js', 'utf8').matchAll(/\{id:'(\w+)'[^}]*mode:'(\w+)'[^}]*accent:'(#[0-9a-f]{6})'/gi)];
check(themes.length === 6, 'six palettes found');
for (const [, id, mode, accent] of themes) {
  const onAccent = mode === 'dark' ? '#171717' : '#ffffff';
  check(contrast(accent, onAccent) >= 4.5, `${id}: label on accent ${contrast(accent, onAccent).toFixed(2)}:1`);
}

console.log(`UNELIVO ACCENT TEXT: ${passed}/${passed} PASS`);
