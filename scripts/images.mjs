// Renders the plugin page images (images/cover.png, images/flexoki-{light,dark}.png) from the
// generated theme files, so every color in the mockup is a color the theme really ships.
// Needs Google Chrome and sharp. Run after build.mjs: node scripts/images.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// require() so a shared sharp install on NODE_PATH works too (ESM imports ignore NODE_PATH).
const sharp = createRequire(import.meta.url)('sharp');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1600;
const HEIGHT = 1000;

const ACCENTS = {
  light: ['#AF3029', '#BC5215', '#AD8301', '#66800B', '#24837B', '#205EA6', '#5E409D', '#A02F6F'],
  dark: ['#D14D41', '#DA702C', '#D0A215', '#879A39', '#3AA99F', '#4385BE', '#8B7EC8', '#CE5D97']
};
const BASES = {
  light: ['#FFFCF0', '#F2F0E5', '#E6E4D9', '#B7B5AC', '#6F6E69', '#100F0F'],
  dark: ['#100F0F', '#1C1B1A', '#282726', '#575653', '#878580', '#CECDC3']
};

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Most specific TextMate selector that prefixes the scope wins; later rules win ties (VS Code order).
function styleFor(tokenColors, scope, fallback) {
  let best = { length: -1, settings: {} };
  for (const rule of tokenColors) {
    for (const selector of [rule.scope].flat()) {
      const matches = scope === selector || scope.startsWith(`${selector}.`);
      if (matches && selector.length >= best.length) best = { length: selector.length, settings: rule.settings };
    }
  }
  const { foreground = fallback, fontStyle = '' } = best.settings;
  return `color:${foreground};${fontStyle.includes('bold') ? 'font-weight:600;' : ''}${fontStyle.includes('italic') ? 'font-style:italic;' : ''}`;
}

// [text, TextMate scope]; scope null = plain text.
const CODE = [
  [['// Inky colors for prose and code.', 'comment.line']],
  [['import', 'keyword.control.import'], [' { ', 'punctuation.definition.block'], ['readFile', 'variable.other.readwrite.alias'], [' } ', 'punctuation.definition.block'], ['from', 'keyword.control.from'], [" '", 'punctuation.definition.string'], ['node:fs/promises', 'string.quoted.single'], ["'", 'punctuation.definition.string']],
  [],
  [['export', 'keyword.control.export'], [' '], ['interface', 'storage.type.interface'], [' '], ['Note', 'entity.name.type.interface'], [' {', 'punctuation.definition.block']],
  [['  title', 'variable.other.property'], [':', 'punctuation.separator'], [' '], ['string', 'support.type.primitive']],
  [['  words', 'variable.other.property'], [':', 'punctuation.separator'], [' '], ['number', 'support.type.primitive']],
  [['}', 'punctuation.definition.block']],
  [],
  [['export', 'keyword.control.export'], [' '], ['async', 'storage.modifier.async'], [' '], ['function', 'storage.type.function'], [' '], ['loadNote', 'entity.name.function'], ['(', 'punctuation.definition.parameters'], ['path', 'variable.parameter'], [':', 'punctuation.separator'], [' '], ['string', 'support.type.primitive'], [')', 'punctuation.definition.parameters'], [':', 'punctuation.separator'], [' '], ['Promise', 'entity.name.type'], ['<', 'punctuation.definition.typeparameters'], ['Note', 'entity.name.type'], ['>', 'punctuation.definition.typeparameters'], [' {', 'punctuation.definition.block']],
  [['  '], ['const', 'storage.type'], [' text '], ['=', 'keyword.operator.assignment'], [' '], ['await', 'keyword.control.flow'], [' '], ['readFile', 'entity.name.function'], ['(', 'punctuation'], ['path', 'variable.parameter'], [',', 'punctuation.separator'], [" '", 'punctuation.definition.string'], ['utf8', 'string.quoted.single'], ["'", 'punctuation.definition.string'], [')', 'punctuation']],
  [['  '], ['if', 'keyword.control.conditional'], [' ('], ['text', 'variable.other.object'], ['.', 'punctuation.accessor'], ['length', 'variable.other.property'], [' '], ['===', 'keyword.operator.comparison'], [' '], ['0', 'constant.numeric.decimal'], [') '], ['return', 'keyword.control.flow'], [' { ', 'punctuation.definition.block'], ['title', 'meta.object-literal.key'], [':', 'punctuation.separator'], [" '", 'punctuation.definition.string'], ['Untitled', 'string.quoted.single'], ["'", 'punctuation.definition.string'], [', ', 'punctuation.separator'], ['words', 'meta.object-literal.key'], [':', 'punctuation.separator'], [' '], ['0', 'constant.numeric.decimal'], [' }', 'punctuation.definition.block']],
  [['  '], ['const', 'storage.type'], [' title '], ['=', 'keyword.operator.assignment'], [' '], ['text', 'variable.other.object'], ['.', 'punctuation.accessor'], ['split', 'entity.name.function'], ['(', 'punctuation'], ["'\\n'", 'string.quoted.single'], [')[', 'punctuation'], ['0', 'constant.numeric.decimal'], ['].', 'punctuation'], ['trim', 'entity.name.function'], ['()', 'punctuation']],
  [['  '], ['return', 'keyword.control.flow'], [' { ', 'punctuation.definition.block'], ['title', 'variable.other.readwrite'], [', ', 'punctuation.separator'], ['words', 'meta.object-literal.key'], [':', 'punctuation.separator'], [' '], ['text', 'variable.other.object'], ['.', 'punctuation.accessor'], ['split', 'entity.name.function'], ['(', 'punctuation'], ['/\\s+/', 'string.regexp'], [').', 'punctuation'], ['length', 'variable.other.property'], [' }', 'punctuation.definition.block']],
  [['}', 'punctuation.definition.block']]
];

function codeHtml(theme) {
  const text = theme.tokens['--foreground'];
  return CODE.map((line, index) => {
    const spans = line.map(([part, scope]) => (scope ? `<span style="${styleFor(theme.tokenColors, scope, text)}">${escape(part)}</span>` : escape(part))).join('');
    return `<div class="line"><span class="ln">${index + 1}</span><span>${spans || ' '}</span></div>`;
  }).join('');
}

function windowHtml(mode, box, title = 'notes — Orca') {
  const theme = readJson(`themes/flexoki-${mode}.json`);
  const term = readJson(`terminal/flexoki-${mode}.json`).terminal;
  const t = theme.tokens;
  const files = [
    [0, 'src', 'folder'],
    [1, 'note.ts', 'modified', true],
    [1, 'palette.ts', 'added'],
    [1, 'render.ts'],
    [0, 'drafts', 'folder'],
    [1, 'ink.md', 'untracked'],
    [0, 'package.json'],
    [0, 'README.md'],
    [0, 'tsconfig.json']
  ];
  const decoration = { modified: ['--git-decoration-modified', 'M'], added: ['--git-decoration-added', 'A'], untracked: ['--git-decoration-untracked', 'U'] };
  const tree = files.map(([depth, name, state, active]) => {
    const [token, badge] = decoration[state] ?? [];
    const color = token ? t[token] : t['--worktree-sidebar-foreground'];
    return `<div class="file${active ? ' active' : ''}" style="padding-left:${18 + depth * 18}px;color:${color}">
      <span class="dot" style="background:${state === 'folder' ? t['--muted-foreground'] : color}"></span><span class="name">${name}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</div>`;
  }).join('');
  const swatches = [...BASES[mode], ...ACCENTS[mode]].map((c) => `<span style="background:${c}"></span>`).join('');
  return `<div class="window ${mode}" style="${box};
      --bg:${t['--background']};--fg:${t['--foreground']};--muted:${t['--muted-foreground']};--border:${t['--border']};
      --tabbar:${t['--tab-bar']};--tab:${t['--tab-active']};--tabfg:${t['--tab-active-foreground']};--tabmuted:${t['--tab-inactive-foreground']};--indicator:${t['--tab-active-indicator']};
      --side:${t['--worktree-sidebar']};--sideborder:${t['--worktree-sidebar-border']};--active:${t['--worktree-sidebar-active']};
      --editor:${t['--editor-surface']};--term:${term.background};--termfg:${term.foreground};--cursor:${term.cursor};">
    <div class="titlebar"><span class="lights"><i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i></span>
      <span class="title">${title}</span><span class="theme-name">Flexoki ${mode === 'light' ? 'Light' : 'Dark'}</span></div>
    <div class="body">
      <aside><div class="heading">EXPLORER</div>${tree}</aside>
      <main>
        <div class="tabs"><span class="tab current">note.ts</span><span class="tab">palette.ts</span><span class="tab">README.md</span></div>
        <div class="code">${codeHtml(theme)}</div>
        <div class="panel-head"><span>TERMINAL</span><span class="dim">zsh — notes</span></div>
        <div class="terminal">
          <div><span style="color:${term.blue}">~/notes</span> <span style="color:${term.green}">main</span></div>
          <div><span style="color:${term.cyan}">❯</span> git status --short</div>
          <div>&nbsp;<span style="color:${term.yellow}">M</span> src/note.ts</div>
          <div>&nbsp;<span style="color:${term.green}">A</span> src/palette.ts</div>
          <div><span style="color:${term.red}">??</span> drafts/ink.md</div>
          <div><span style="color:${term.cyan}">❯</span> npm test</div>
          <div><span style="color:${term.green}">✓</span> 12 passed <span style="color:${term.brightBlack}">(84 ms)</span></div>
          <div><span style="color:${term.cyan}">❯</span> <span class="cursor"></span></div>
          <div class="swatches">${swatches}</div>
        </div>
      </main>
    </div>
  </div>`;
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
body { font: 13px/1 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; position: relative; }
.window { position: absolute; display: flex; flex-direction: column; background: var(--bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 30px 80px rgba(16,15,15,.22), 0 4px 14px rgba(16,15,15,.10); }
.titlebar { height: 40px; flex: none; display: flex; align-items: center; gap: 14px; padding: 0 16px; background: var(--tabbar); border-bottom: 1px solid var(--border); color: var(--muted); }
.lights { display: flex; gap: 8px; } .lights i { width: 12px; height: 12px; border-radius: 50%; display: block; }
.title { flex: 1; color: var(--fg); opacity: .8; } .theme-name { font-size: 12px; }
.body { flex: 1; display: flex; min-height: 0; }
aside { width: 240px; flex: none; background: var(--side); border-right: 1px solid var(--sideborder); padding: 18px 8px; }
.heading { font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--muted); padding: 0 10px 12px; }
.file { display: flex; align-items: center; gap: 9px; height: 27px; border-radius: 6px; font-size: 13px; }
.file.active { background: var(--active); }
.dot { width: 6px; height: 6px; border-radius: 2px; opacity: .8; } .name { flex: 1; }
.badge { font: 600 11px ui-monospace, Menlo, monospace; padding-right: 12px; }
main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--editor); }
.tabs { height: 38px; flex: none; display: flex; background: var(--tabbar); border-bottom: 1px solid var(--border); }
.tab { display: flex; align-items: center; padding: 0 18px; color: var(--tabmuted); border-right: 1px solid var(--border); }
.tab.current { background: var(--tab); color: var(--tabfg); box-shadow: inset 0 2px 0 var(--indicator); margin-bottom: -1px; }
.code { flex: 1; padding: 22px 0; font: 15px/26px 'SF Mono', ui-monospace, Menlo, monospace; white-space: pre; overflow: hidden; }
.line { display: flex; } .ln { width: 56px; flex: none; text-align: right; padding-right: 22px; color: var(--muted); opacity: .7; }
.panel-head { height: 34px; flex: none; display: flex; align-items: center; gap: 28px; padding: 0 22px; font-size: 11px; letter-spacing: .04em; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--tabbar); color: var(--fg); }
.panel-head .dim { color: var(--muted); letter-spacing: 0; }
.terminal { height: 250px; flex: none; position: relative; padding: 18px 24px; background: var(--term); color: var(--termfg); font: 14px/24px 'SF Mono', ui-monospace, Menlo, monospace; }
.cursor { display: inline-block; width: 8px; height: 17px; vertical-align: -3px; background: var(--cursor); }
.swatches { position: absolute; right: 24px; bottom: 22px; display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.swatches span { width: 30px; height: 28px; }
`;

const page = (background, windows) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="background:${background}">${windows}</body></html>`;

const LAYOUTS = {
  'flexoki-light': page('#E6E4D9', windowHtml('light', 'left:90px;top:80px;width:1420px;height:840px')),
  'flexoki-dark': page('#1C1B1A', windowHtml('dark', 'left:90px;top:80px;width:1420px;height:840px')),
  cover: page('linear-gradient(135deg,#F2F0E5 0%,#F2F0E5 50%,#282726 50%,#282726 100%)',
    windowHtml('dark', 'left:520px;top:170px;width:1000px;height:800px') +
    windowHtml('light', 'left:80px;top:40px;width:1000px;height:800px'))
};

const work = join(root, '.work');
mkdirSync(work, { recursive: true });
mkdirSync(join(root, 'images'), { recursive: true });
// Why the extra height and crop: new headless Chrome's viewport is shorter than --window-size.
// Why the timeout: Chrome writes the screenshot, then sometimes never exits.
for (const [name, html] of Object.entries(LAYOUTS)) {
  const htmlPath = join(work, `${name}.html`);
  const rawPath = join(work, `${name}.raw.png`);
  writeFileSync(htmlPath, html);
  rmSync(rawPath, { force: true });
  spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${join(work, 'chrome-profile')}`,
    '--force-device-scale-factor=1', `--window-size=${WIDTH},${HEIGHT + 300}`, `--screenshot=${rawPath}`, `file://${htmlPath}`],
  { stdio: 'ignore', timeout: 30_000 });
  if (!existsSync(rawPath)) throw new Error(`Chrome wrote no screenshot for ${name}`);
  await sharp(rawPath).extract({ left: 0, top: 0, width: WIDTH, height: HEIGHT }).png({ compressionLevel: 9 }).toFile(join(root, 'images', `${name}.png`));
  console.log(`images/${name}.png`);
}
