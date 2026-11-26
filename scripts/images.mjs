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

const iconTheme = readJson('icons/theme.json');

function windowHtml(mode, box, title = 'notes — Orca') {
  const theme = readJson(`themes/flexoki-${mode}.json`);
  const term = readJson(`terminal/flexoki-${mode}.json`).terminal;
  const t = theme.tokens;
  const files = [
    [0, 'src', 'folder-open'],
    [1, 'note.ts', 'modified', true],
    [1, 'palette.ts', 'added'],
    [1, 'App.tsx'],
    [0, 'drafts', 'folder-open'],
    [1, 'ink.md', 'untracked'],
    [0, 'data', 'folder-open'],
    [1, 'report.xlsx'],
    [1, 'brief.docx'],
    [0, 'Dockerfile'],
    [0, 'package.json', 'modified'],
    [0, 'pnpm-lock.yaml'],
    [0, 'README.md'],
    [0, '.gitignore'],
    [0, 'main.py']
  ];
  const decoration = { modified: ['--git-decoration-modified', 'M'], added: ['--git-decoration-added', 'A'], untracked: ['--git-decoration-untracked', 'U'] };
  const tree = files.map(([depth, name, state, active]) => {
    const [token, badge] = decoration[state] ?? [];
    const folder = state === 'folder' || state === 'folder-open';
    const color = token ? t[token] : t['--worktree-sidebar-foreground'];
    return `<div class="file${active ? ' active' : ''}" style="padding-left:${18 + depth * 18}px;color:${color}">
      ${iconSvg(name, folder ? state : 'file', color)}<span class="name">${name}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</div>`;
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
        <div class="tabs"><span class="tab current">${iconSvg('note.ts', 'file', t['--tab-active-foreground'])}note.ts</span><span class="tab">${iconSvg('palette.ts', 'file', t['--tab-inactive-foreground'])}palette.ts</span><span class="tab">${iconSvg('README.md', 'file', t['--tab-inactive-foreground'])}README.md</span></div>
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
.file svg, .tab svg { width: 16px; height: 16px; flex: none; display: block; }
.tab { gap: 8px; }
.gtitle { position: absolute; left: 0; right: 0; top: 46px; text-align: center; color: #100F0F; }
.gtitle h1 { font: 600 44px/1 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; letter-spacing: -.01em; }
.gtitle p { margin-top: 14px; font-size: 17px; color: #6F6E69; }
.gpanel { position: absolute; top: 170px; width: 700px; height: 770px; border-radius: 14px; padding: 30px 32px; border: 1px solid; box-shadow: 0 30px 80px rgba(16,15,15,.18), 0 4px 14px rgba(16,15,15,.10); }
.gpanel .ghead { font-size: 12px; font-weight: 600; letter-spacing: .08em; margin-bottom: 18px; }
.ggrid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 66px; }
.gitem { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.gitem svg { width: 28px; height: 28px; display: block; }
.gitem span { font-size: 12px; white-space: nowrap; }
`;

const page = (background, windows) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="background:${background}">${windows}</body></html>`;

// Orca's rule: exact fileName, then the longest dotted suffix as an extension (case-insensitive), else the file icon.
function iconPath(name, kind) {
  if (kind === 'folder') return iconTheme.icons.folder;
  if (kind === 'folder-open') return iconTheme.icons['folder-open'];
  const lower = name.toLowerCase();
  if (iconTheme.fileNames[lower]) return iconTheme.fileNames[lower];
  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const hit = iconTheme.fileExtensions[parts.slice(i).join('.')];
    if (hit) return hit;
  }
  return iconTheme.icons.file;
}
// Mono icons only use currentColor; paint it with the row's text color. Color icons stay as drawn.
function iconSvg(name, kind, color) {
  return readFileSync(join(root, iconPath(name, kind)), 'utf8').trim().replace(/currentColor/g, color);
}

const GALLERY = [
  ['folder', '', 'folder'], ['folder-open', '', 'folder-open'], ['file', 'unknown.xyz'], ['README.md', 'README.md'],
  ['note.md', 'note.md'], ['notes.txt', 'notes.txt'], ['LICENSE', 'LICENSE'], ['lock file', 'a.lock'],
  ['main.ts', 'main.ts'], ['main.test.ts', 'main.test.ts'], ['App.tsx', 'App.tsx'], ['index.js', 'index.js'],
  ['main.py', 'main.py'], ['main.rs', 'main.rs'], ['main.go', 'main.go'], ['Main.java', 'Main.java'],
  ['App.swift', 'App.swift'], ['App.kt', 'App.kt'], ['index.php', 'index.php'], ['app.rb', 'app.rb'],
  ['App.vue', 'App.vue'], ['style.css', 'style.css'], ['style.scss', 'style.scss'], ['index.html', 'index.html'],
  ['data.json', 'data.json'], ['config.yaml', 'config.yaml'], ['query.sql', 'query.sql'], ['run.sh', 'run.sh'],
  ['Dockerfile', 'Dockerfile'], ['package.json', 'package.json'], ['pnpm-lock.yaml', 'pnpm-lock.yaml'], ['tsconfig.json', 'tsconfig.json'],
  ['.gitignore', '.gitignore'], ['.env', '.env'], ['report.xlsx', 'report.xlsx'], ['brief.docx', 'brief.docx'],
  ['deck.pptx', 'deck.pptx'], ['paper.pdf', 'paper.pdf'], ['photo.png', 'photo.png'], ['clip.mp4', 'clip.mp4']
];

function galleryHtml() {
  const panel = (mode, left) => {
    const t = readJson(`themes/flexoki-${mode}.json`).tokens;
    const fg = t['--worktree-sidebar-foreground'];
    const cells = GALLERY.map(([label, file, kind]) => `<div class="gitem">${iconSvg(file, kind, fg)}<span>${escape(label)}</span></div>`).join('');
    return `<div class="gpanel" style="left:${left}px;background:${t['--worktree-sidebar']};border-color:${t['--worktree-sidebar-border']};color:${fg}">
      <div class="ghead" style="color:${t['--muted-foreground']}">FLEXOKI ${mode.toUpperCase()}</div><div class="ggrid">${cells}</div></div>`;
  };
  return `<div class="gtitle"><h1>Flexoki Icons</h1><p>Based on Symbols by Miguel Solorio (MIT) and @pierre/trees by Pierre Computer Company (Apache-2.0)</p></div>${panel('light', 80)}${panel('dark', 820)}`;
}

const LAYOUTS = {
  'flexoki-light': page('#E6E4D9', windowHtml('light', 'left:90px;top:80px;width:1420px;height:840px')),
  'flexoki-dark': page('#1C1B1A', windowHtml('dark', 'left:90px;top:80px;width:1420px;height:840px')),
  cover: page('linear-gradient(135deg,#F2F0E5 0%,#F2F0E5 50%,#282726 50%,#282726 100%)',
    windowHtml('dark', 'left:520px;top:170px;width:1000px;height:800px') +
    windowHtml('light', 'left:80px;top:40px;width:1000px;height:800px')),
  'flexoki-icons': page('#E6E4D9', galleryHtml())
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
