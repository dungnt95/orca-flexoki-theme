// Generates themes/*.json and terminal/*.json from src/flexoki-source.json (app colors)
// and src/vscode/*.json (kepano/flexoki VS Code syntax colors, MIT).
// Run: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const writeJson = (path, value) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
};

const source = readJson('src/flexoki-source.json');

// Flexoki accents: light themes use 600, dark themes use 400 (stephango.com/flexoki).
const ACCENTS = {
  600: { red: '#AF3029', orange: '#BC5215', yellow: '#AD8301', green: '#66800B', cyan: '#24837B', blue: '#205EA6', purple: '#5E409D', magenta: '#A02F6F' },
  400: { red: '#D14D41', orange: '#DA702C', yellow: '#D0A215', green: '#879A39', cyan: '#3AA99F', blue: '#4385BE', purple: '#8B7EC8', magenta: '#CE5D97' }
};

// Orca terminal colors accept opaque hex only, so translucent selections are flattened onto the background.
function flatten(hex, background) {
  const alphaHex = hex.slice(7, 9);
  if (!alphaHex) return hex;
  const alpha = parseInt(alphaHex, 16) / 255;
  const channel = (color, i) => parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) => Math.round(alpha * channel(hex, i) + (1 - alpha) * channel(background, i)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const rgb = (hex) => [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16));
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, bl] = rgb(hex).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Orca drops a text/surface token pair under 4.5:1 and paints its own neutral defaults instead
// (Flexoki light tx-2 #6F6E69 on bg-2 #F2F0E5 is 4.47:1). Nudge the text toward `ink` just enough.
function readable(text, surfaces, ink, min = 4.6) {
  for (let percent = 0; percent <= 100; percent++) {
    const mixed = `#${rgb(text).map((v, i) => Math.round(v + (rgb(ink)[i] - v) * percent / 100).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    if (surfaces.every((surface) => contrast(mixed, surface) >= min)) return mixed;
  }
  return ink;
}

function appTokens(c, accent) {
  // Why ui (`secondary`) for --muted, not the spec's bg-2: Orca paints segmented-control tracks and
  // other quiet fills with --muted on top of the bg-2 sidebar, so bg-2 made them vanish.
  const mutedFill = c.secondary;
  const mutedText = readable(c.mutedForeground, [c.canvas, c.surface, mutedFill, c.toolbar], c.text, 4.55);
  return {
    '--background': c.canvas,
    '--editor-surface': c.surface,
    '--foreground': c.text,
    '--card': c.surfaceRaised,
    '--card-foreground': c.text,
    '--popover': c.surfaceOverlay,
    '--popover-foreground': c.text,
    '--primary': c.accent,
    '--primary-foreground': c.accentForeground,
    '--secondary': c.secondary,
    '--secondary-foreground': c.secondaryForeground,
    '--muted': mutedFill,
    '--muted-foreground': mutedText,
    // Why one step above --muted: dark segmented controls mark the selected segment with --accent.
    '--accent': c.toolbarControlHover,
    '--accent-foreground': c.text,
    '--border': c.border,
    '--input': c.input,
    '--ring': c.focus,
    '--chart-1': accent.blue,
    '--chart-2': accent.cyan,
    '--chart-3': accent.green,
    '--chart-4': accent.orange,
    '--chart-5': accent.purple,
    '--sidebar': c.sidebar,
    '--sidebar-foreground': c.sidebarForeground,
    '--sidebar-primary': c.accent,
    '--sidebar-primary-foreground': c.accentForeground,
    '--sidebar-accent': c.sidebarRowHover,
    '--sidebar-accent-foreground': c.sidebarForeground,
    '--sidebar-border': c.sidebarBorder,
    '--sidebar-ring': c.focus,
    '--worktree-sidebar': c.sidebar,
    '--worktree-sidebar-foreground': c.sidebarForeground,
    '--worktree-sidebar-accent': c.sidebarRowHover,
    '--worktree-sidebar-accent-foreground': c.sidebarForeground,
    '--worktree-sidebar-border': c.sidebarBorder,
    '--worktree-sidebar-ring': c.focus,
    '--worktree-sidebar-active': c.sidebarRowActive,
    '--worktree-sidebar-active-border': c.sidebarRowSelected,
    '--host-badge': c.toolbarControl,
    '--host-badge-foreground': c.toolbarControlForeground,
    '--tab-bar': c.toolbar,
    '--tab-active': c.canvas,
    '--tab-active-foreground': c.toolbarForeground,
    '--tab-active-indicator': c.accent,
    '--tab-inactive': c.toolbar,
    '--tab-inactive-foreground': mutedText,
    '--split-divider': c.toolbarBorder,
    '--split-divider-hover': c.focus,
    '--chat-user-message': c.messageSurface,
    '--chat-inline-code': c.codeBackground,
    '--chat-inline-code-foreground': c.codeForeground,
    '--chat-code-block': c.codeBackground,
    '--chat-selection': c.accentSurface,
    '--chat-selection-foreground': c.text,
    '--text-link': c.accent,
    '--theme-accent-foreground': c.accentForeground,
    '--editor-selection': c.terminalSelection,
    '--diff-added': c.update,
    '--diff-added-background': c.updateSurface,
    '--diff-removed': c.error,
    '--diff-removed-background': c.errorSurface,
    '--git-decoration-added': c.update,
    '--git-decoration-modified': c.warning,
    '--git-decoration-deleted': c.error,
    '--git-decoration-renamed': accent.blue,
    '--git-decoration-untracked': accent.cyan,
    '--git-decoration-copied': accent.purple,
    '--git-decoration-ignored': c.iconMuted
  };
}

function tokenColors(vscodeFile, text) {
  return readJson(vscodeFile).tokenColors.flatMap((rule) => {
    // Upstream has palette placeholder rules with empty scopes; Orca requires at least one.
    if (!rule.scope || rule.scope.length === 0) return [];
    // Upstream paints local variables in the UI background color (#E6E4D9 / #282726): unreadable.
    const settings = rule.name === 'localVariables' ? { ...rule.settings, foreground: text } : rule.settings;
    return [{ name: rule.name, scope: rule.scope, settings }];
  });
}

// ANSI: dark follows kepano/flexoki kitty (normal 600, bright 400). Light uses 600 for normal
// colors too, because upstream's 400 values (yellow #D0A215, cyan #3AA99F) read poorly on paper.
function terminal(c, mode) {
  const normal = ACCENTS[600];
  const bright = ACCENTS[400];
  return {
    schemaVersion: 1,
    mode,
    terminal: {
      foreground: c.terminalForeground,
      background: c.terminalBackground,
      cursor: c.terminalCursor,
      cursorAccent: c.terminalBackground,
      selectionBackground: flatten(c.terminalSelection, c.terminalBackground),
      selectionForeground: c.terminalForeground,
      black: '#100F0F',
      red: normal.red,
      green: normal.green,
      yellow: normal.yellow,
      blue: normal.blue,
      magenta: normal.magenta,
      cyan: normal.cyan,
      white: '#878580',
      brightBlack: '#6F6E69',
      brightRed: bright.red,
      brightGreen: bright.green,
      brightYellow: bright.yellow,
      brightBlue: bright.blue,
      brightMagenta: bright.magenta,
      brightCyan: bright.cyan,
      brightWhite: mode === 'light' ? '#B7B5AC' : '#CECDC3'
    }
  };
}

const modes = [
  { mode: 'light', colors: source.colors, accent: ACCENTS[600], vscode: 'src/vscode/Flexoki-Light-color-theme.json' },
  { mode: 'dark', colors: { ...source.colors, ...source.variants.dark }, accent: ACCENTS[400], vscode: 'src/vscode/Flexoki-Dark-color-theme.json' }
];

for (const { mode, colors, accent, vscode } of modes) {
  writeJson(`themes/flexoki-${mode}.json`, {
    schemaVersion: 1,
    base: mode,
    tokens: appTokens(colors, accent),
    tokenColors: tokenColors(vscode, colors.text)
  });
  writeJson(`terminal/flexoki-${mode}.json`, terminal(colors, mode));
}
console.log('built themes/ and terminal/ for light and dark');
