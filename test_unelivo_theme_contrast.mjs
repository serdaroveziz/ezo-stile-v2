/* UNELIVO 2.0 P0 — her tema için WCAG AA kontrast testi (bağımlılıksız). */
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
const { THEMES } = await import('./src/theme.js');

const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

// theme.js applyTheme() ile aynı türetme: muted ve accent üstü metin rengi.
const derived = theme => ({ muted: theme.mode === 'dark' ? '#c2c4cb' : '#555555', onAccent: theme.mode === 'dark' ? '#171717' : '#ffffff' });

const required = ['gold', 'light', 'midnight', 'sage', 'rose', 'minimal'];
assert.deepEqual(THEMES.map(t => t.id).sort(), [...required].sort(), 'altı tema tanımlı olmalı (+ Sistem Teması)');
let checks = 0; const rows = [];
for (const theme of THEMES) {
  const { muted, onAccent } = derived(theme);
  const pairs = [
    ['metin / arka plan', theme.ink, theme.bg, 4.5],
    ['metin / kart', theme.ink, theme.surface, 4.5],
    ['ikincil metin / arka plan', muted, theme.bg, 4.5],
    ['ikincil metin / kart', muted, theme.surface, 4.5],
    ['vurgu metni / arka plan', theme.accent, theme.bg, 4.5],
    ['vurgu metni / kart', theme.accent, theme.surface, 4.5],
    ['buton metni / vurgu', onAccent, theme.accent, 4.5]
  ];
  for (const [label, fg, bg, min] of pairs) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= min, `${theme.id}: ${label} ${ratio.toFixed(2)}:1 < ${min}:1 (${fg} / ${bg})`);
    checks++;
  }
  rows.push(`${theme.id}: en düşük ${Math.min(...pairs.map(([, f, b]) => contrast(f, b))).toFixed(2)}:1`);
}
console.log(rows.join(' | '));
console.log(`UNELIVO THEME CONTRAST: ${checks}/${checks} PASS (WCAG AA 4.5:1)`);
