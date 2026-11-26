// Mirrors Orca's app-theme contrast check (renderer chat-selection-mix chunk, Orca 1.4.x):
// a text/surface pair under its minimum makes Orca DROP both tokens and paint its own default.
// Reports every token this theme would lose. Run after build.mjs: node scripts/check-contrast.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const parse = (hex) => {
  const h = hex.slice(1);
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
};
const over = (top, bottom) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
const luminance = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Pairs Orca checks for tokens a theme can set (chat-internal pairs need Orca's own chat colors).
const pair = (surface, text, extra = {}) => ({ surface, text, min: 4.5, ...extra });
const PAIRS = [
  pair('--background', '--foreground'), pair('--background', '--muted-foreground'),
  pair('--editor-surface', '--foreground'), pair('--editor-surface', '--muted-foreground'),
  pair('--card', '--card-foreground'), pair('--popover', '--popover-foreground'),
  pair('--primary', '--primary-foreground'), pair('--secondary', '--secondary-foreground'),
  pair('--muted', '--muted-foreground'), pair('--accent', '--accent-foreground'),
  pair('--sidebar', '--sidebar-foreground'), pair('--sidebar-primary', '--sidebar-primary-foreground'),
  pair('--sidebar-accent', '--sidebar-accent-foreground'), pair('--worktree-sidebar', '--worktree-sidebar-foreground'),
  pair('--worktree-sidebar-accent', '--worktree-sidebar-accent-foreground'),
  pair('--worktree-sidebar-active', '--worktree-sidebar-foreground', { over: '--worktree-sidebar', drop: ['--worktree-sidebar-active'] }),
  pair('--host-badge', '--host-badge-foreground', { over: '--worktree-sidebar' }),
  pair('--tab-active', '--tab-active-foreground'), pair('--tab-inactive', '--tab-inactive-foreground'),
  pair('--tab-inactive', '--tab-active-foreground'),
  pair('--diff-added-background', '--foreground', { over: '--editor-surface', drop: ['--diff-added-background'] }),
  pair('--diff-removed-background', '--foreground', { over: '--editor-surface', drop: ['--diff-removed-background'] }),
  pair('--editor-surface', '--text-link', { drop: ['--text-link'] }),
  pair('--text-link', '--theme-accent-foreground', { drop: ['--theme-accent-foreground'] }),
  pair('--editor-selection', '--foreground', { over: '--editor-surface', drop: ['--editor-selection'] }),
  ...['added', 'modified', 'deleted', 'renamed', 'untracked', 'copied', 'ignored'].map((state) =>
    pair('--sidebar', `--git-decoration-${state}`, { min: 3, drop: [`--git-decoration-${state}`] }))
];
const VISIBLE = [['--ring', '--background'], ['--sidebar-ring', '--sidebar'], ['--worktree-sidebar-ring', '--worktree-sidebar'],
  ['--tab-active-indicator', '--tab-active'], ['--tab-active-indicator', '--sidebar']];

let failed = false;
for (const mode of ['light', 'dark']) {
  const tokens = JSON.parse(readFileSync(join(root, `themes/flexoki-${mode}.json`), 'utf8')).tokens;
  const color = (token) => (tokens[token]?.startsWith('#') ? parse(tokens[token]) : null);
  const problems = [];
  for (const p of PAIRS) {
    let surface = color(p.surface);
    const text = color(p.text);
    if (!surface || !text) continue;
    if (p.over && color(p.over)) surface = over(surface, color(p.over));
    const ratio = contrast(surface, text);
    if (surface[3] < 1 || text[3] < 1 || ratio < p.min) {
      problems.push(`${p.surface} ${tokens[p.surface]} / ${p.text} ${tokens[p.text]}: ${ratio.toFixed(2)} < ${p.min} → drops ${(p.drop ?? [p.surface, p.text]).join(', ')}`);
    }
  }
  for (const [ring, surfaceToken] of VISIBLE) {
    const ringColor = color(ring);
    const surface = color(surfaceToken);
    if (ringColor && surface && contrast(over(ringColor, surface), surface) < 2) {
      problems.push(`${ring} on ${surfaceToken}: under 2:1 → drops ${ring}`);
    }
  }
  console.log(`${mode}: ${problems.length ? '' : 'every checked token survives'}`);
  for (const line of problems) console.log(`  ✗ ${line}`);
  failed ||= problems.length > 0;
}
process.exitCode = failed ? 1 : 0;
