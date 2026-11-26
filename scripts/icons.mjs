// Generates icons/*.svg and icons/theme.json (the "Flexoki Icons" file icon theme).
// Base set: Symbols by Miguel Solorio (MIT) https://github.com/miguelsolorio/vscode-symbols
//   vendored in src/symbols/ from upstream commit a405d32cca082d838ad7739b6d0044dea9dbbb79.
// Hybrid: where @pierre/trees 1.0.0 (Apache-2.0, Pierre Computer Company) has an icon for a file type, its glyph
//   (vendored in src/pierre/, from the npm tarball, see src/pierre/SOURCE.md) replaces the Symbols artwork (PIERRE_MAP).
// Extra icons drawn for this plugin live in src/icons-extra/ (extra.json + SVGs).
// Run: NODE_PATH=$HOME/.local/share/thought-partner/node/node_modules node scripts/icons.mjs
// (needs the `sharp` package, resolved through NODE_PATH, to measure each icon's painted bounds)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire(import.meta.url)('sharp');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => join(root, p);

// ---------------------------------------------------------------------------
// Size normalization: Orca draws every icon in a fixed 12x12 box with `contain`, so each SVG's viewBox is
// rewritten to a square around its painted bounds; the longer side fills FILL of the box.
// Vertical alignment: Orca centers the 12x12 icon box on the row, but a text line's x-height center sits lower,
// so artwork looked too high. Two rules fix that without touching geometry:
//   1. OFFSET_Y: artwork moves DOWN by OFFSET_Y * side (the viewBox origin moves up). The only room for this is the
//      empty margin, so (1 - FILL) / 2 >= OFFSET_Y must hold (checked below, FILL_EXCEPTIONS included).
//   2. Optical center: the vertical center is a blend (INK_BLEND) of the bounding-box center and the alpha-weighted
//      ink center, so bottom-heavy artwork (image, folder base) and top-heavy artwork both read centered.
//      If the blended center would clip the artwork, the side grows just enough to keep every pixel inside.
// FILL_EXCEPTIONS (icon file id -> fill) is for optical balance of icons that look oversized.
// ---------------------------------------------------------------------------
// Tuned on a simulated Orca row (13 px text, 26 px row): 0.82/0.09 centered within 0.5 px but shrank ink to
// ~10 px; 0.86/0.07 keeps ~10.3 px ink and leaves icons ~0.7 px above the x-height center.
const FILL = 0.86;
const OFFSET_Y = 0.07;
const INK_BLEND = 0.25; // 0 = bbox center, 1 = ink-weighted center
const FILL_EXCEPTIONS = { c: 0.7, h: 0.7, yaml: 0.7 }; // single big glyphs that otherwise tower over the wordmark icons
// Why readme: its open book already reads ~1 px lower than other icons before any shift (measured on the
// user's Orca screenshot: -1 px vs -3 px), so the global OFFSET_Y pushed it below the text center.
const OFFSET_Y_EXCEPTIONS = { readme: 0 };

for (const [id, f] of Object.entries({ '*': FILL, ...FILL_EXCEPTIONS })) {
  if ((1 - f) / 2 < OFFSET_Y - 1e-9) throw new Error(`FILL ${f} (${id}) leaves too little margin for OFFSET_Y ${OFFSET_Y}`);
}

// ---------------------------------------------------------------------------
// Orca limits
// ---------------------------------------------------------------------------
// Orca counts slot icons + fileNames + fileExtensions + folderNames + folderNamesExpanded together
// (pluginIconThemeIconRefs(...).length <= 512). We aim lower for headroom.
const ORCA_MAX_REFS = 512;
const TOTAL_BUDGET = 505;
const MAX_SVGS = 512;
const MAX_SVG_BYTES = 64 * 1024;
const EXT_KEY = /^[A-Za-z0-9][A-Za-z0-9+._-]{0,31}$/;

// ---------------------------------------------------------------------------
// Flexoki 500 accents (readable on both the light and dark sidebar)
// ---------------------------------------------------------------------------
const FLEXOKI = {
  red: '#C03E35',
  orange: '#CB6120',
  yellow: '#BE9207',
  green: '#768D21',
  cyan: '#2F968D',
  blue: '#3171B2',
  purple: '#735EB5',
  magenta: '#B74583',
  neutral: '#878580'
};

// ---------------------------------------------------------------------------
// Classification of every Symbols icon that the upstream theme uses.
//   mono  -> every paint becomes currentColor (follows the sidebar text color)
//   color -> Tailwind hex mapped to the nearest Flexoki 500 accent by hue
//   drop  -> not used (cannot be sanitized for Orca, or needs <style>/<filter>)
// Rule: language/framework/tool brand marks and office/design formats are color;
// generic file types and obscure tooling are mono. When unsure: mono.
// Every used id must appear in exactly one list (checked at run time).
// ---------------------------------------------------------------------------
const COLOR = [
  // languages
  'c', 'cplus', 'csharp', 'clojure', 'coffeescript', 'crystal', 'dart', 'elixir', 'erlang', 'fortran', 'fsharp',
  'gleam', 'go', 'go-mod', 'h', 'haskell', 'java', 'java-class', 'js', 'js-test', 'julia', 'julia-markdown',
  'kotlin', 'lua', 'luau', 'nim', 'ocaml', 'perl', 'rescript', 'rescript-interface', 'php', 'python', 'r', 'ruby', 'rust', 'scala', 'solidity',
  'swift', 'ts', 'ts-test', 'ts-types', 'dts', 'tsconfig', 'typst', 'zig', 'gdscript', 'razor', 'twig', 'haml',
  'pug', 'stylus', 'sass', 'postcss', 'graphql', 'svg', 'brackets-orange', 'brackets-sky', 'brackets-purple', 'code-orange', 'cuda',
  // frameworks
  'cloudflare-workers', 'docker-green', 'docker-pink', 'firebase',
  'angular', 'angular-component', 'angular-directive', 'angular-guard', 'angular-module', 'angular-pipe',
  'angular-service', 'astro', 'gatsby', 'laravel', 'nest', 'next', 'nuxt', 'react', 'react-test', 'react-ts',
  'svelte', 'svelte-service', 'svelte-ts', 'tailwind', 'tauri', 'vue', 'storybook', 'redux-actions',
  'redux-effects', 'redux-facade', 'redux-reducer', 'redux-selector', 'slint',
  // tooling and platforms
  'babel', 'bun', 'cypress', 'deno', 'docker', 'eslint',
  'git', 'gitlab', 'gradle', 'jest', 'maven', 'minecraft', 'mongo', 'netlify', 'node', 'npm', 'pnpm',
  'prettier', 'prisma', 'pulumi', 'puppeteer', 'sbt', 'stylelint', 'terraform', 'vite', 'vitest', 'webpack',
  'yarn', 'uv', 'nix', 'hugo', 'docusaurus', 'notebook',
  // apps and formats
  'claude', 'cursor', 'illustrator', 'pdf', 'photoshop'
];
const DROP = [
  'earthfile', // luminance mask + 11 gradient/neon hues
  'expressive-code', // masks, gradients and 40 hues
  'jenkins', // photographic multi-hue mascot
  'lunaria', // masks and gradients
  'statamic-antlers', // <style> classes and gradient
  'v' // <filter> and masks
];
const MONO = [
  'animate', 'audio', 'biome', 'brackets-blue', 'brackets-red', 'brackets-yellow',
  'browserslist', 'bruno', 'caddy', 'capacitor', 'clapper', 'cmake', 'code-blue', 'code-green',
  'coldfusion', 'compressed', 'contentlayer', 'csv', 'cucumber', 'database', 'document', 'drawio', 'drizzle',
  'dune', 'editorconfig', 'exe', 'font', 'fresh', 'func', 'gdextension', 'gdignore', 'gdproject', 'gdshader',
  'gear', 'gif', 'github', 'globe', 'gulp', 'http', 'i18n', 'ignore', 'image', 'ionic', 'keystatic', 'knip',
  'kubb', 'license', 'link', 'liquid', 'lock', 'markdoc', 'markdown', 'mdx', 'moon', 'nodemon', 'nunjucks', 'nx',
  'orval', 'oxc', 'panda', 'patch', 'pkl', 'proto', 'puzzle', 'readme', 'renovate', 'resource', 'rolldown', 'rome',
  'rsbuild', 'rslib', 'rspack', 'sanity', 'severless', 'shadcn', 'shell', 'svx', 'swc', 'taskfile', 'tex', 'text',
  'turborepo', 'unity-asmdef', 'unity-asmref', 'unity-asset', 'unity-meta', 'unity-package', 'unity-prefab',
  'unity-scene', 'unity-shader', 'unocss', 'vanilla-extract', 'vercel', 'video', 'visual-studio', 'webgpu', 'xml',
  'yaml', 'yummacss'
];

// Icons whose upstream SVG cannot be recolored mechanically; replaced with this SVG (final mono markup).
const OVERRIDES = {
  // upstream is a filled mascot that turns into a solid blob in mono: three sliders instead
  editorconfig:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 7h3M13 7h7M4 12h9M19 12h1M4 17h2M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="10" cy="7" r="2" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="16" cy="12" r="2" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="9" cy="17" r="2" stroke="currentColor" stroke-width="2"/></svg>',
  // upstream uses a luminance mask to draw an outside-only stroke
  csv:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2"/>' +
    '<rect x="7" y="7" width="4" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="7" y="11" width="4" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="7" y="15" width="4" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="13" y="7" width="4" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="13" y="11" width="4" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="13" y="15" width="4" height="2" rx="1" fill="currentColor"/></svg>'
};

// ---------------------------------------------------------------------------
// languageIds -> file extensions (standard VS Code associations).
// Order matters: the first language to claim an extension wins.
// Explicit upstream fileExtensions are never overridden.
// ---------------------------------------------------------------------------
const LANG_EXT = {
  typescript: ['ts', 'mts', 'cts'],
  typescriptreact: ['tsx'],
  javascript: ['js', 'mjs', 'cjs', 'es6'],
  javascriptreact: ['jsx'],
  python: ['py', 'pyi', 'pyw', 'pyx'],
  markdown: ['md', 'markdown', 'mdown', 'mkd'],
  json: ['json', 'jsonl', 'webmanifest', 'jsonc', 'json5'],
  yaml: ['yml', 'yaml'],
  yml: ['yml'],
  shellscript: ['sh', 'bash', 'zsh', 'ksh', 'fish'],
  html: ['html', 'htm', 'xhtml'],
  css: ['css'],
  scss: ['scss'],
  sass: ['sass'],
  less: ['less'],
  xml: ['xml', 'xsd', 'plist', 'svgz'],
  xsl: ['xsl', 'xslt'],
  xquery: ['xq', 'xql', 'xqm', 'xquery'],
  svg: ['svg'],
  sql: ['sql'],
  csv: ['csv'],
  tsv: ['tsv'],
  psv: ['psv'],
  excel: ['xls', 'xlsx'],
  jupyter: ['ipynb'],
  plaintext: ['txt'],
  pdf: ['pdf'],
  go: ['go'],
  rust: ['rs'],
  java: ['java'],
  c: ['c'],
  cpp: ['cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx', 'ino'],
  csharp: ['cs', 'csx'],
  fsharp: ['fs', 'fsi', 'fsx'],
  'objective-c': ['m'],
  'objective-cpp': ['mm'],
  swift: ['swift'],
  ruby: ['rb', 'rbw', 'gemspec'],
  php: ['php', 'phtml'],
  dart: ['dart'],
  lua: ['lua'],
  perl: ['pl', 'pm'],
  r: ['r'],
  rsweave: ['rnw'],
  julia: ['jl'],
  juliamarkdown: ['jmd'],
  scala: ['scala', 'sc'],
  clojure: ['clj', 'cljs', 'cljc', 'edn'],
  elixir: ['ex', 'exs'],
  erlang: ['erl', 'hrl'],
  haskell: ['hs', 'lhs'],
  coffeescript: ['coffee'],
  crystal: ['cr'],
  nix: ['nix'],
  terraform: ['tf', 'tfvars'],
  graphql: ['graphql', 'gql'],
  vue: ['vue'],
  svelte: ['svelte'],
  pug: ['pug', 'jade'],
  jade: ['jade'],
  handlebars: ['hbs', 'handlebars'],
  haml: ['haml'],
  twig: ['twig'],
  jinja: ['jinja', 'jinja2', 'j2'],
  nunjucks: ['njk', 'nunjucks'],
  razor: ['cshtml', 'razor'],
  postcss: ['pcss', 'postcss'],
  styl: ['styl'],
  powershell: ['ps1', 'psm1', 'psd1'],
  bat: ['bat', 'cmd'],
  awk: ['awk'],
  makefile: ['mk'],
  properties: ['properties'],
  tex: ['tex', 'sty', 'cls'],
  latex: ['ltx'],
  doctex: ['dtx'],
  typst: ['typ'],
  mdx: ['mdx'],
  hlsl: ['hlsl'],
  gherkin: ['feature'],
  rescript: ['res'],
  'rescript-interface': ['resi'],
  slint: ['slint'],
  vb: ['vb'],
  'lang-cfml': ['cfm', 'cfc'],
  func: ['fc'],
  gdshader: ['gdshader'],
  gdscript: ['gd'],
  gdresource: ['tres'],
  gdscene: ['tscn'],
  UnityUSS: ['uss'],
  UnityUXML: ['uxml'],
  UnityShader: ['shader']
};

// ---------------------------------------------------------------------------
// Pruning priority (total refs must fit TOTAL_BUDGET).
// 0. Free: fileNames that resolve to the same icon through a suffix extension are always dropped.
// 1. REQUIRED_FILES (below) and extras are protected: the key(s) that make them resolve are never dropped.
// 2. Everything else drops in this order: tier RARE, then MIDDLE, then CORE (tier of the icon id);
//    within a tier fileNames go before fileExtensions (extensions cover more files), longer keys first.
// ---------------------------------------------------------------------------
const CORE = new Set([
  'ts', 'js', 'react', 'react-ts', 'python', 'markdown', 'readme', 'license', 'lock', 'gear', 'shell', 'yaml',
  'document', 'text', 'ignore', 'git', 'github', 'docker', 'npm', 'node', 'pnpm', 'yarn', 'bun', 'tsconfig',
  'eslint', 'prettier', 'tailwind', 'next', 'nuxt', 'vue', 'svelte', 'astro', 'editorconfig',
  'brackets-blue', 'brackets-yellow', 'brackets-orange', 'brackets-sky', 'brackets-red', 'brackets-purple',
  'code-blue', 'code-green', 'code-orange', 'sass', 'postcss', 'svg', 'pdf', 'csv', 'database', 'image', 'audio',
  'video', 'font', 'compressed', 'xml', 'c', 'cplus', 'csharp', 'go', 'go-mod', 'java', 'kotlin', 'swift', 'ruby',
  'php', 'rust', 'dart', 'lua', 'r', 'scala', 'terraform', 'prisma', 'graphql', 'claude', 'cursor', 'vitest', 'js-test', 'ts-test', 'ts-types', 'dts', 'notebook', 'exe', 'proto', 'gif', 'cmake', 'gradle', 'maven',
  'vercel', 'netlify', 'cypress', 'deno', 'storybook', 'patch', 'http', 'i18n', 'link', 'docker-pink', 'docker-green'
]);
const RARE = new Set([
  'unity-asmdef', 'unity-asmref', 'unity-asset', 'unity-meta', 'unity-package', 'unity-prefab', 'unity-scene',
  'unity-shader', 'gdextension', 'gdignore', 'gdproject', 'gdshader', 'gdscript', 'redux-actions', 'redux-effects',
  'redux-facade', 'redux-reducer', 'redux-selector', 'angular-component', 'angular-directive', 'angular-guard',
  'angular-module', 'angular-pipe', 'angular-service', 'svelte-service', 'svelte-ts', 'svx', 'slint', 'coldfusion',
  'puzzle', 'webgpu', 'visual-studio', 'yummacss', 'vanilla-extract', 'unocss', 'panda', 'kubb', 'orval', 'knip',
  'keystatic', 'contentlayer', 'drizzle', 'rolldown', 'rsbuild', 'rslib', 'rspack', 'oxc', 'swc', 'rome', 'biome',
  'capacitor', 'ionic', 'clapper', 'bruno', 'caddy', 'dune', 'sanity', 'severless', 'shadcn', 'moon', 'nodemon',
  'renovate', 'taskfile', 'turborepo', 'nx', 'tauri', 'fresh', 'animate', 'pkl', 'func', 'cuda', 'minecraft',
  'gatsby', 'laravel', 'nest', 'docusaurus', 'hugo', 'liquid', 'nunjucks', 'markdoc', 'cucumber', 'drawio',
  'sbt', 'puppeteer', 'pulumi', 'gulp', 'mongo'
]);
const tierOf = (id) => (CORE.has(id) ? 2 : RARE.has(id) ? 0 : 1); // lower tier drops first

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
const NAMED = { white: '#ffffff', black: '#000000' };
function parseHex(value) {
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return parseHex(NAMED[v]);
  const m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}
// Hue families: red/rose, orange, amber/yellow, green/emerald/lime, teal/cyan, sky/blue/indigo, violet/purple, fuchsia/pink.
function accentFor(rgb) {
  const { h, s, l } = hsl(rgb);
  if (s < 0.15 || l < 0.06 || l > 0.97) return { name: 'neutral', neutral: true };
  // Cool slate/gray-blue (#64748B, #475569, #334155 ...) is a neutral, not an accent.
  if (h >= 190 && h < 260 && s < 0.3) return { name: 'neutral', neutral: true, coolGray: true };
  const name =
    h >= 345 || h < 14 ? 'red' // claude #d97656 (h 14.7) must read as orange
    : h < 35 ? 'orange'
    : h < 70 ? 'yellow'
    : h < 165 ? 'green'
    : h < 195 ? 'cyan'
    : h < 255 ? 'blue'
    : h < 290 ? 'purple'
    : 'magenta';
  return { name };
}

const PAINT_ATTR = /\b(fill|stroke|stop-color|flood-color|lighting-color|color)="([^"]*)"/g;
const KEEP_PAINT = /^(none|currentcolor|transparent|inherit|url\(.*\))$/i;

// ---------------------------------------------------------------------------
// SVG sanitizing + recoloring
// ---------------------------------------------------------------------------
const FORBIDDEN = /<(style|filter|text|use|image|script|foreignObject)\b/i;
const STYLE_TO_ATTR = new Set(['fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'opacity', 'stop-color', 'stop-opacity']);
function sanitize(svg) {
  let s = svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(sodipodi|inkscape):[a-zA-Z]+\b[^>]*\/>/g, '')
    .replace(/<(sodipodi|inkscape):([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1:\2>/g, '')
    .replace(/<(title|desc|metadata)\b[\s\S]*?<\/\1>/g, '')
    .replace(/\s(sodipodi|inkscape):[\w-]+="[^"]*"/g, '')
    .replace(/\sxmlns:(svg|inkscape|sodipodi|v)="[^"]*"/g, '')
    .replace(/\sclass="[^"]*"/g, '');
  // Paint declarations in style="..." become presentation attributes so they are recolored like the rest.
  s = s.replace(/<([a-zA-Z]+)\b([^>]*?)\sstyle="([^"]*)"([^>]*?)(\/?)>/g, (all, tag, pre, style, post, close) => {
    if (/^\s*mask-type:\s*alpha;?\s*$/.test(style)) return all;
    let attrs = `${pre}${post}`;
    for (const decl of style.split(';')) {
      const m = /^\s*([a-z-]+)\s*:\s*(.+?)\s*$/.exec(decl);
      if (!m) continue;
      if (!STYLE_TO_ATTR.has(m[1])) continue; // anything else (isolation, mix-blend-mode, ...) is stripped by Orca anyway
      // style wins over a presentation attribute of the same name
      attrs = attrs.replace(new RegExp(`\\s${m[1]}="[^"]*"`), '') + ` ${m[1]}="${m[2]}"`;
    }
    return `<${tag}${attrs}${close}>`;
  });
  if (!/xlink:/.test(s.replace(/\sxmlns:xlink="[^"]*"/g, ''))) s = s.replace(/\sxmlns:xlink="[^"]*"/g, '');
  s = s.replace(/\s+version="[^"]*"/g, '').replace(/>\s+</g, '><').trim();
  return s;
}

// Drops unreferenced ids (Inkscape leftovers), empty <defs/> and attribute whitespace.
function minify(svg) {
  const refs = new Set([...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]));
  for (const m of svg.matchAll(/href="#([^"]+)"/g)) refs.add(m[1]);
  return svg
    .replace(/\sid="([^"]*)"/g, (all, id) => (refs.has(id) ? all : ''))
    .replace(/<defs\s*\/>/g, '')
    .replace(/<defs>\s*<\/defs>/g, '')
    .replace(/<[a-zA-Z][^>]*>/g, (t) => t.replace(/\s+/g, ' ').replace(/ \/>$/, '/>').replace(/ >$/, '>'))
    .replace(/>\s+</g, '><')
    .trim();
}

// Split the document into mask-content (left untouched in color mode) and visible content.
function mapPaints(svg, fn) {
  const masks = [];
  const masked = svg.replace(/<mask\b[\s\S]*?<\/mask>/g, (m) => {
    masks.push(m);
    return `\u0000${masks.length - 1}\u0000`;
  });
  const out = masked.replace(PAINT_ATTR, (all, attr, val) => (KEEP_PAINT.test(val.trim()) ? all : `${attr}="${fn(val, attr)}"`));
  return { out, masks };
}
const restoreMasks = (s, masks) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => masks[+i]);

function toMono(svg, id, report) {
  if (/<mask\b/.test(svg) && /<mask\b(?![^>]*mask-type:\s*alpha)/.test(svg)) {
    throw new Error(`mono icon ${id} has a luminance mask; add an OVERRIDES entry`);
  }
  // All paints, including those inside alpha masks, become currentColor.
  return svg.replace(PAINT_ATTR, (all, attr, val) => (KEEP_PAINT.test(val.trim()) ? all : `${attr}="currentColor"`));
}

function toColor(svg, id, report) {
  const { out, masks } = mapPaints(svg, (val) => {
    const rgb = parseHex(val);
    if (!rgb) {
      report.unmapped.add(`${id}: ${val}`);
      return val;
    }
    const a = accentFor(rgb);
    if (a.neutral) {
      (a.coolGray ? report.coolGray : report.neutral).add(`${id}: ${val.toLowerCase()}`);
      return FLEXOKI.neutral;
    }
    return FLEXOKI[a.name];
  });
  // Mask contents: map hex to Flexoki too (alpha masks ignore the color; luminance masks keep named white/black).
  const mappedMasks = masks.map((m) => {
    if (!/mask-type:\s*alpha/.test(m)) report.lumMask.add(id);
    return m.replace(PAINT_ATTR, (all, attr, val) => {
      const v = val.trim().toLowerCase();
      if (KEEP_PAINT.test(v) || v === 'white' || v === 'black') return all;
      const rgb = parseHex(v);
      if (!rgb) return all;
      if (!/mask-type:\s*alpha/.test(m)) return all; // luminance: preserve exact levels
      const a = accentFor(rgb);
      return `${attr}="${a.neutral ? FLEXOKI.neutral : FLEXOKI[a.name]}"`;
    });
  });
  return restoreMasks(out, mappedMasks);
}

// ---------------------------------------------------------------------------
// Load sources
// ---------------------------------------------------------------------------
const upstream = JSON.parse(readFileSync(rel('src/symbols/symbol-icon-theme.json'), 'utf8'));
const baseName = (iconPath) => iconPath.replace(/^.*\//, '').replace(/\.svg$/, '');
const defs = upstream.iconDefinitions;

const used = new Set([
  upstream.file,
  ...Object.values(upstream.fileExtensions),
  ...Object.values(upstream.fileNames),
  ...Object.values(upstream.languageIds)
]);

// classification coverage check
const cls = new Map();
for (const [list, kind] of [[COLOR, 'color'], [MONO, 'mono'], [DROP, 'drop']]) {
  for (const id of list) {
    if (cls.has(id)) throw new Error(`classified twice: ${id}`);
    cls.set(id, kind);
  }
}
const unclassified = [...used].filter((id) => !cls.has(id));
if (unclassified.length) throw new Error(`unclassified icons: ${unclassified.join(', ')}`);
for (const id of cls.keys()) if (!used.has(id)) console.warn(`note: classified but unused upstream: ${id}`);

const outDir = rel('icons');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// Build SVGs: upstream icons
// ---------------------------------------------------------------------------
const report = { unmapped: new Set(), neutral: new Set(), lumMask: new Set(), coolGray: new Set(), dropped: [], oversize: [] };
const svgOf = new Map(); // id -> final svg string (only usable icons)

for (const id of [...used].sort()) {
  const kind = cls.get(id);
  if (kind === 'drop') {
    report.dropped.push(`${id} (classified drop)`);
    continue;
  }
  const file = rel(`src/symbols/files/${baseName(defs[id].iconPath)}.svg`);
  let svg;
  if (OVERRIDES[id]) {
    svg = OVERRIDES[id];
  } else {
    const raw = readFileSync(file, 'utf8');
    if (FORBIDDEN.test(raw)) {
      report.dropped.push(`${id} (forbidden element)`);
      continue;
    }
    svg = sanitize(raw);
    svg = kind === 'mono' ? toMono(svg, id, report) : toColor(svg, id, report);
  }
  if (Buffer.byteLength(svg) > MAX_SVG_BYTES) {
    report.oversize.push(`${id} (${Buffer.byteLength(svg)} B)`);
    continue;
  }
  if (!svg.startsWith('<svg')) throw new Error(`${id}: output does not start with <svg`);
  svgOf.set(id, { svg, kind });
}

// ---------------------------------------------------------------------------
// Pierre Trees icons (@pierre/trees 1.0.0, "complete" set; 16x16, one <symbol> per file type, vendored per token).
// PIERRE_MAP is the equivalence table: Pierre token -> our Symbols icon ids whose ARTWORK it replaces.
//   - Replacement is icon-level: every key that pointed at our icon keeps its mapping, the picture changes.
//   - First id is the color source: mono stays mono (currentColor); color uses that icon's dominant Flexoki accent.
//   - Extra ids (react-ts, docker-pink) are aliased to the first id so both resolve to the same Pierre file.
// Derived from Pierre's own BUILT_IN_FILE_EXTENSION_TOKENS / BUILT_IN_FILE_NAME_TOKENS / COMPLETE_EXTENSION_OVERRIDES by
// cross-tabulating each token's keys against our current icon for the same key. Where Pierre's notion is broader than
// ours the narrower Symbols icon is kept (see PIERRE_KEPT_OURS), so e.g. .h, .gif, .mdx, README keep their own icon.
// ---------------------------------------------------------------------------
const PIERRE_COMMENT = '<!-- Derived from @pierre/trees 1.0.0 (Apache-2.0, © 2025 Pierre Computer Company); recolored and re-framed for Flexoki. See THIRD_PARTY_NOTICES.md. -->';
const PIERRE_MAP = {
  astro: ['astro'], babel: ['babel'], biome: ['biome'], browserslist: ['browserslist'], bun: ['bun'],
  // c/cpp: Pierre's two circled-C badges are near-identical at 12 px and clash with Symbols' `h`, so Symbols keeps them.
  claude: ['claude'], database: ['database'],
  docker: ['docker', 'docker-pink'], eslint: ['eslint'], font: ['font'], git: ['git'], go: ['go'], graphql: ['graphql'],
  image: ['image'], json: ['brackets-yellow'], markdown: ['markdown'],
  nextjs: ['next'], oxc: ['oxc'], postcss: ['postcss'], prettier: ['prettier'], python: ['python'],
  react: ['react', 'react-ts'], ruby: ['ruby'], rust: ['rust'], sass: ['sass'], stylelint: ['stylelint'],
  svelte: ['svelte'], svg: ['svg'], swift: ['swift'], tailwind: ['tailwind'], terraform: ['terraform'],
  text: ['text'], vite: ['vite'], vue: ['vue'], webpack: ['webpack'], zig: ['zig'],
  zip: ['compressed']
};
// Pierre file types Symbols lacks: new ids with explicit paint and the extensions Pierre maps to them.
const PIERRE_NEW = {
  vscode: { paint: 'blue', exts: ['code-workspace'] },
  mcp: { paint: 'mono', exts: ['mcp'] }
};
// Two-part logos: separable paths get two accents (bg = class "bg" path, fg = everything else).
const PIERRE_TWO_TONE = { python: { fg: 'blue', bg: 'yellow' } };
// Symbols icons deliberately kept although Pierre has a related glyph (Pierre's notion is broader or has no counterpart).
// Pierre badge-style glyphs (a pale chip with tiny letters: ts, js, css, html, bash, yml, wasm) and its table icon were
// compared against ours at 12/16 px (hybrid-sheet.png) and lose to the bolder Symbols wordmarks: ours kept.
const PIERRE_KEPT_OURS = {
  ts: 'Pierre typescript = pale badge, low contrast at 12 px', js: 'Pierre javascript = pale badge', 'brackets-purple': 'Pierre css = pale badge',
  'code-orange': 'Pierre html is a pale # badge', shell: 'Pierre bash = tiny boxed prompt', yaml: 'Pierre yml glyph is cryptic at 12 px',
  csv: 'Pierre table reads as a generic document', wasm: 'Pierre wasm badge too small, no Symbols icon: not added',
  h: 'Pierre c covers .h too; ours distinguishes headers', gif: 'Pierre image covers gif; ours is distinct',
  mdx: 'Pierre markdown covers mdx', readme: 'no Pierre README icon', 'js-test': 'Pierre has no test icons',
  'ts-test': 'Pierre has no test icons', 'ts-types': 'Pierre typescript is broader than .d.ts', tsconfig: 'config file',
  'react-test': 'Pierre has no test icons', 'go-mod': 'config file', 'svelte-ts': 'variant', 'svelte-service': 'variant',
  'brackets-sky': 'Pierre css covers less/stylus, ours keeps them apart', stylus: 'Pierre css covers styl',
  'brackets-orange': 'handlebars etc.', 'brackets-blue': 'Unity USS', 'brackets-red': 'jinja', document: 'default file icon',
  node: 'Pierre has no package.json icon', npm: 'unused by Pierre tables', bootstrap: 'niche; Pierre bootstrap filenames skipped',
  svgo: 'niche; Pierre svgo filenames skipped'
};
const accentOf = (id) => {
  const counts = {};
  for (const m of svgOf.get(id).svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)) {
    const h = m[1].toUpperCase();
    if (h !== FLEXOKI.neutral) counts[h] = (counts[h] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? FLEXOKI.neutral;
};
function pierreSvg(token, paint) {
  // paint: 'mono' | '#RRGGBB' | { fg, bg } (Flexoki hex)
  let raw = readFileSync(rel(`src/pierre/files/${token}.svg`), 'utf8');
  raw = raw.replace(/<(path|circle|rect|ellipse|polygon|line|polyline|stop)\b[^>]*>/g, (tag, name) => {
    const role = /class="(\w+)"/.exec(tag)?.[1];
    const color = paint === 'mono' ? 'currentColor' : typeof paint === 'string' ? paint : role === 'bg' ? paint.bg : paint.fg;
    // gradient stops carry the color; url(#id) fills keep pointing at their gradient
    tag = tag.replace(/\s(fill|stop-color)="currentcolor"/gi, (all, attr) => ` ${attr}="${color}"`);
    if (name !== 'stop' && !/\sfill="/.test(tag)) tag = tag.replace(/^<(\w+)/, `<$1 fill="${color}"`);
    return tag;
  });
  return sanitize(raw);
}
const pierreIds = new Set();
const pierreAlias = new Map();
const pierreTable = [];
for (const [token, ids] of Object.entries(PIERRE_MAP)) {
  const primary = ids[0];
  if (!svgOf.has(primary)) {
    console.warn(`note: Pierre ${token} not used, our ${primary} is unavailable`);
    continue;
  }
  const { kind } = svgOf.get(primary);
  const tone = PIERRE_TWO_TONE[token];
  const paint = tone ? { fg: FLEXOKI[tone.fg], bg: FLEXOKI[tone.bg] } : kind === 'mono' ? 'mono' : accentOf(primary);
  svgOf.set(primary, { svg: pierreSvg(token, paint), kind: tone ? 'color' : kind, pierre: true });
  for (const other of ids.slice(1)) pierreAlias.set(other, primary);
  pierreIds.add(primary);
  pierreTable.push(`${token} -> ${ids.join(' + ')} [${tone ? `${tone.fg}+${tone.bg}` : paint === 'mono' ? 'mono' : paint}]`);
}
for (const [token, { paint, exts: e }] of Object.entries(PIERRE_NEW)) {
  const p = paint === 'mono' ? 'mono' : FLEXOKI[paint];
  svgOf.set(token, { svg: pierreSvg(token, p), kind: p === 'mono' ? 'mono' : 'color', pierre: true });
  pierreIds.add(token);
  pierreTable.push(`${token} -> (new) .${e.join(' .')} [${paint}]`);
}

// folder (uniform monochrome); folder-open comes from extras
const folderSvg = toMono(sanitize(readFileSync(rel('src/symbols/folders/folder.svg'), 'utf8')), 'folder', report);

// ---------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------
const extraPath = rel('src/icons-extra/extra.json');
const extras = existsSync(extraPath) ? JSON.parse(readFileSync(extraPath, 'utf8')) : {};
if (!existsSync(extraPath)) console.warn('note: src/icons-extra/extra.json not found; building without extras');
const extraFiles = new Map(); // output file name -> svg
const slots = {};
for (const [id, e] of Object.entries(extras)) {
  let svg = readFileSync(rel(`src/icons-extra/${e.file}`), 'utf8').trim();
  svg = sanitize(svg);
  if (FORBIDDEN.test(svg)) throw new Error(`extra ${id}: forbidden element`);
  if (Buffer.byteLength(svg) > MAX_SVG_BYTES) throw new Error(`extra ${id}: over 64 KB`);
  if (!svg.startsWith('<svg')) throw new Error(`extra ${id}: must start with <svg`);
  const hasCC = /currentColor/.test(svg);
  const hasHex = /#[0-9a-fA-F]{3,8}\b/.test(svg);
  if (e.kind === 'mono' && hasHex) throw new Error(`extra ${id}: mono SVG contains hex`);
  if (e.kind === 'color' && hasCC) throw new Error(`extra ${id}: color SVG contains currentColor`);
  if (svgOf.has(id) || id === 'folder' || extraFiles.has(`${id}.svg`)) throw new Error(`extra ${id}: id collides with an upstream icon`);
  extraFiles.set(`${id}.svg`, svg);
  if (e.slot) slots[e.slot] = `icons/${id}.svg`;
}

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------
const ICON_FILE = (id) => `icons/${id}.svg`;
const idOfPath = (p) => p.replace(/^icons\//, '').replace(/\.svg$/, '');
const exts = new Map(); // key -> icon id (upstream id) | extra id
const names = new Map();
const lower = (k) => k.toLowerCase();

for (const [k, id] of Object.entries(upstream.fileExtensions)) if (!exts.has(lower(k))) exts.set(lower(k), id);
let langAdded = 0;
for (const lang of Object.keys(LANG_EXT)) {
  const id = upstream.languageIds[lang];
  if (!id) continue;
  for (const ext of LANG_EXT[lang]) {
    if (!exts.has(lower(ext))) {
      exts.set(lower(ext), id);
      langAdded++;
    }
  }
}
for (const [k, id] of Object.entries(upstream.fileNames)) if (!names.has(lower(k))) names.set(lower(k), id);

// Supplemental keys upstream lacks (exact names / extensions). Added only when absent.
const ADD_NAMES = {
  'docker-compose.yml': 'docker-pink', 'docker-compose.yaml': 'docker-pink', 'compose.yml': 'docker-pink',
  'compose.yaml': 'docker-pink', 'docker-compose.override.yml': 'docker', 'docker-compose.override.yaml': 'docker-pink',
  makefile: 'gear', gnumakefile: 'gear', gemfile: 'ruby', procfile: 'gear', codeowners: 'gear', '.ds_store': 'gear',
  licence: 'license', '.env.example': 'gear', '.env.production': 'gear', '.env.development': 'gear', '.env.test': 'gear',
  'agents.md': 'markdown', 'readme.txt': 'readme', readme: 'readme', '.python-version': 'python'
};
const ADD_EXTS = { parquet: 'database', rtf: 'text', epub: 'readme', aac: 'audio', hpp: 'h', hh: 'h', hxx: 'h' };
for (const [k, id] of Object.entries(ADD_NAMES)) if (!names.has(k)) names.set(k, id);
for (const [k, id] of Object.entries(ADD_EXTS)) if (!exts.has(k)) exts.set(k, id);

const before = { fileExtensions: exts.size, fileNames: names.size, langAdded };

// extras win
for (const [id, e] of Object.entries(extras)) {
  for (const x of e.fileExtensions || []) exts.set(lower(x), id);
  for (const n of e.fileNames || []) names.set(lower(n), id);
}
for (const map of [exts, names]) for (const [k, id] of map) if (pierreAlias.has(id)) map.set(k, pierreAlias.get(id));
for (const [token, { exts: e }] of Object.entries(PIERRE_NEW)) for (const x of e) if (!exts.has(x)) exts.set(x, token);
const extraIds = new Set(Object.keys(extras));
const available = (id) => extraIds.has(id) || svgOf.has(id);

const dropLog = [];
// 1. remove entries whose icon is unavailable (dropped/oversize/classified drop) and invalid keys
for (const [map, label] of [[exts, 'ext'], [names, 'name']]) {
  for (const [k, id] of [...map]) {
    const invalidKey = label === 'ext' ? !EXT_KEY.test(k) : k.length > 128 || k.includes('/') || k.length === 0;
    if (invalidKey) {
      map.delete(k);
      dropLog.push(`invalid ${label} key: ${k}`);
    } else if (!available(id)) {
      map.delete(k);
      dropLog.push(`${label} ${k} -> ${id} (icon unavailable)`);
    }
  }
}
const countsAvail = { fileExtensions: exts.size, fileNames: names.size };

// Same lookup order as Orca: exact fileName, then longest dotted suffix as extension (leading dot included).
function lookup(file) {
  const f = file.toLowerCase();
  if (names.has(f)) return { id: names.get(f), via: ['name', f] };
  const parts = f.split('.');
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join('.');
    if (exts.has(suffix)) return { id: exts.get(suffix), via: ['ext', suffix] };
  }
  return { id: null, via: null };
}

// ---------------------------------------------------------------------------
// Per-key pruning policy
//   DROP_*  explicit long tail, removed even when under budget
//   KEEP_*  curated common keys; never pruned (REQUIRED_FILES and extras are protected too)
//   rest    ranked by commonness: icon tier (core 200 / middle 100 / rare 0) + 50 for extensions
//           - key length, lowest drops first
// ---------------------------------------------------------------------------
const DROP_EXTS = new Set((
  'afphoto ami apx brk cpt fpx jb2 jbig2 jng jxr mdp pgf pic reb sai ora pdn bpg dds exr kra gbr bmap mrf ntf odttf ' +
  'sui suit fnt font fonts m2v mpe mpv rm rmvb vob yuv accdb mdb pdb pkb pks pgsql postgres psql db3 ftl lang resw ' +
  'resx xlf xliff pot mo arb uid freezed.dart g.dart'
).split(' '));
const DROP_NAMES = new Set((
  'tailwind.js tailwind.ts now.json .nowignore cypress.json git-history .gitinclude .direnv file.config maven.config ' +
  'mvnw.cmd pom.properties .luacheckrc .rhistory .d.ts'
).split(' '));
const DROP_NAME_PATTERNS = [/^license-/, /^licence-/, /^\.postcssrc/, /^\.graphqlrc/];
const dropName = (k) => DROP_NAMES.has(k) || DROP_NAME_PATTERNS.some((re) => re.test(k));

const KEEP_NAMES = new Set((
  'docker-compose.yml docker-compose.yaml docker-compose.override.yml docker-compose.override.yaml compose.yml compose.yaml ' +
  'dockerfile .dockerignore tailwind.config.js tailwind.config.ts tailwind.config.mjs tailwind.config.cjs ' +
  'eslint.config.js eslint.config.mjs eslint.config.ts eslint.config.cjs .eslintrc .eslintrc.js .eslintrc.json .eslintrc.cjs ' +
  '.eslintrc.yml .eslintignore vitest.config.ts vitest.config.js vitest.config.mts vite.config.js vite.config.mjs vite.config.ts ' +
  'vite.config.mts postcss.config.js postcss.config.mjs postcss.config.cjs svelte.config.js astro.config.mjs astro.config.ts ' +
  'next.config.js next.config.mjs next.config.ts next.config.mts nuxt.config.ts nuxt.config.js .prettierrc .prettierrc.json ' +
  '.prettierrc.js .prettierignore prettier.config.js prettier.config.mjs tsconfig.json tsconfig.app.json tsconfig.node.json ' +
  'tsconfig.base.json jsconfig.json package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml yarn.lock bun.lock bun.lockb ' +
  'requirements.txt pyproject.toml .python-version uv.lock poetry.lock .env .env.local .env.development .env.production .env.test ' +
  '.env.example .babelrc babel.config.js biome.json biome.jsonc gemfile procfile codeowners .ds_store makefile ' +
  '.gitignore .gitattributes .gitkeep .gitmodules .editorconfig .npmrc .nvmrc license licence license.md license.txt ' +
  'readme readme.md readme.txt claude.md agents.md webpack.config.js webpack.config.ts jest.config.js jest.config.ts ' +
  'go.mod go.sum cargo.toml cargo.lock'
).split(' '));
const KEEP_EXTS = new Set((
  'ts tsx js jsx mjs cjs mts cts d.ts py ipynb md mdx json jsonc yaml yml toml csv xlsx docx pptx pdf png jpg jpeg gif webp svg ' +
  'fig sketch lottie mmd mermaid sh bash zsh html css scss sass less sql go rs java kt swift c cpp cs rb php h hpp ai psd psb ' +
  'drawio tex typ nix zig test.tsx spec.tsx test.ts spec.ts test.js spec.js parquet rtf epub aac key numbers pages xd afdesign ' +
  'lock env txt log code-workspace mcp'
).split(' '));

// Files that must keep resolving to a sensible icon (id = expected icon id after pruning).
const REQUIRED_FILES = {
  'index.ts': 'ts', 'index.mts': 'ts', 'index.cts': 'ts', 'app.tsx': 'react', 'index.js': 'js', 'index.mjs': 'js',
  'index.cjs': 'js', 'app.jsx': 'react', 'main.py': 'python', 'notebook.ipynb': 'notebook', 'README.md': 'readme',
  'notes.md': 'markdown', 'page.mdx': 'mdx', 'data.json': 'brackets-yellow', 'tsconfig.jsonc': 'brackets-yellow',
  'config.yaml': 'yaml', 'config.yml': 'yaml', 'Cargo.toml': 'gear', 'data.csv': 'csv', 'report.xlsx': 'xlsx',
  'brief.docx': 'docx', 'deck.pptx': 'pptx', 'spec.pdf': 'pdf', 'photo.png': 'image', 'photo.jpg': 'image',
  'photo.jpeg': 'image', 'photo.webp': 'image', 'anim.gif': 'gif', 'logo.svg': 'svg', 'design.fig': 'figma',
  'ui.sketch': 'sketch', 'anim.lottie': 'lottie', 'diagram.mmd': 'mermaid', 'run.sh': 'shell', 'run.zsh': 'shell',
  'run.bash': 'shell', Dockerfile: 'docker', 'docker-compose.yml': 'docker', 'compose.yml': 'docker',
  'docker-compose.override.yml': 'docker', '.gitignore': 'git', '.gitattributes': 'git', '.gitkeep': 'git',
  '.env': 'gear', '.env.local': 'gear', '.env.example': 'gear', '.env.production': 'gear', '.env.development': 'gear',
  'package-lock.json': 'node', 'pnpm-lock.yaml': 'pnpm', 'pnpm-workspace.yaml': 'pnpm', 'yarn.lock': 'yarn',
  'bun.lock': 'bun', 'bun.lockb': 'bun', 'uv.lock': 'uv', 'package.json': 'node', 'README.txt': 'readme',
  LICENSE: 'license', 'LICENSE.md': 'license', 'tsconfig.json': 'tsconfig', 'tsconfig.app.json': 'tsconfig',
  'vite.config.ts': 'vite', 'vitest.config.ts': 'vitest', 'next.config.mjs': 'next', 'tailwind.config.js': 'tailwind',
  'tailwind.config.ts': 'tailwind', 'eslint.config.js': 'eslint', 'eslint.config.mjs': 'eslint', '.eslintrc.json': 'eslint',
  '.prettierrc': 'prettier', '.prettierrc.json': 'prettier', 'prettier.config.js': 'prettier', Makefile: 'gear',
  'requirements.txt': 'python', 'CLAUDE.md': 'claude', 'AGENTS.md': 'markdown', '.editorconfig': 'editorconfig',
  'index.html': 'code-orange', 'style.css': 'brackets-purple', 'style.scss': 'sass', 'schema.sql': 'database',
  'main.go': 'go', 'main.rs': 'rust', 'Main.java': 'java', 'Main.kt': 'kotlin', 'main.swift': 'swift', 'main.c': 'c',
  'main.h': 'h', 'main.cpp': 'cplus', 'Program.cs': 'csharp', 'app.rb': 'ruby', Gemfile: 'ruby', 'index.php': 'php',
  'component.test.tsx': 'react-test', 'logo.ai': 'illustrator', 'mock.psd': 'photoshop', 'deck.key': 'pptx',
  'sheet.numbers': 'xlsx', 'doc.pages': 'docx', 'data.parquet': 'database', 'mock.xd': 'figma', 'logo.afdesign': 'sketch'
};

// 1. explicit long-tail drops
for (const [map, label, isDrop] of [[exts, 'ext', (k) => DROP_EXTS.has(k)], [names, 'name', dropName]]) {
  for (const [k, id] of [...map]) {
    if (isDrop(k)) {
      map.delete(k);
      dropLog.push(`${label} ${k} -> ${id} (long-tail DROP list)`);
    }
  }
}

// 2. free pruning: any fileName that resolves to the same icon through its extension suffix (same rule Orca applies)
for (const [k, id] of [...names].sort()) {
  const parts = k.split('.');
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join('.');
    if (exts.has(suffix)) {
      if (exts.get(suffix) === id) {
        names.delete(k);
        dropLog.push(`name ${k} -> ${id} (redundant via extension)`);
      }
      break;
    }
  }
}
const slotCount = 3; // file, folder, folder-open
const countsRedundantFree = { fileExtensions: exts.size, fileNames: names.size };

// 3. protected keys: those REQUIRED_FILES resolve through, KEEP lists, extras
const protectedKeys = new Set();
const unresolved = [];
for (const [file, expected] of Object.entries(REQUIRED_FILES)) {
  const r = lookup(file);
  if (r.id !== expected) unresolved.push(`${file}: ${r.id} (expected ${expected})`);
  else protectedKeys.add(r.via.join(':'));
}
if (unresolved.length) throw new Error(`REQUIRED_FILES do not resolve as expected before pruning:\n  ${unresolved.join('\n  ')}`);
for (const k of KEEP_NAMES) if (names.has(k)) protectedKeys.add(`name:${k}`);
for (const k of KEEP_EXTS) if (exts.has(k)) protectedKeys.add(`ext:${k}`);
for (const [id, e] of Object.entries(extras)) {
  for (const x of e.fileExtensions || []) protectedKeys.add(`ext:${lower(x)}`);
  for (const n of e.fileNames || []) protectedKeys.add(`name:${lower(n)}`);
}

// 4. rank the rest by commonness and prune to TOTAL_BUDGET
const total = () => slotCount + exts.size + names.size;
const score = (c) => (CORE.has(c.id) ? 200 : RARE.has(c.id) ? 0 : 100) + (c.label === 'ext' ? 50 : 0) - c.k.length;
const candidates = [
  ...[...names].map(([k, id]) => ({ map: names, label: 'name', k, id })),
  ...[...exts].map(([k, id]) => ({ map: exts, label: 'ext', k, id }))
]
  .filter((c) => !protectedKeys.has(`${c.label}:${c.k}`))
  .sort((x, y) => score(x) - score(y) || (x.k < y.k ? -1 : 1));
for (const c of candidates) {
  if (total() <= TOTAL_BUDGET) break;
  c.map.delete(c.k);
  dropLog.push(`${c.label} ${c.k} -> ${c.id} (pruned by commonness score)`);
}
if (total() > TOTAL_BUDGET) throw new Error(`still ${total()} refs > ${TOTAL_BUDGET} after pruning`);

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const referenced = new Set([...exts.values(), ...names.values()]);
if (!available(upstream.file)) throw new Error('default file icon unavailable');
referenced.add(upstream.file);
const fileIconId = slots.file ? idOfPath(slots.file) : upstream.file;
referenced.add(fileIconId);

const written = new Map(); // file name -> svg (minified at write time)
const pierreFiles = new Set();
for (const id of [...referenced].sort()) {
  if (extraIds.has(id)) written.set(`${id}.svg`, extraFiles.get(`${id}.svg`));
  else written.set(`${id}.svg`, svgOf.get(id).svg);
  if (svgOf.get(id)?.pierre) pierreFiles.add(`${id}.svg`);
}
// extra slot icons (folder-open etc.) are always written
for (const p of Object.values(slots)) {
  const id = idOfPath(p);
  written.set(`${id}.svg`, extraFiles.get(`${id}.svg`));
}
written.set('folder.svg', folderSvg);
if (written.size > MAX_SVGS) throw new Error(`distinct SVGs ${written.size} > ${MAX_SVGS}`);

const r2 = (n) => String(+n.toFixed(2));
// Renders at 480 px (currentColor -> black) and returns the alpha bounding box in user units.
async function paintedBounds(svg) {
  const m = /<svg\b[^>]*\sviewBox="([^"]+)"/.exec(svg);
  const [vx, vy, vw, vh] = m[1].trim().split(/[\s,]+/).map(Number);
  const W = 480;
  const H = Math.round((W * vh) / vw);
  const probe = svg
    .replace(/currentColor/g, '#000000')
    .replace(/<svg\b([^>]*)>/, (all, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')} width="${W}" height="${H}">`);
  const { data, info } = await sharp(Buffer.from(probe)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1, inkSum = 0, inkY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      inkSum += alpha;
      inkY += alpha * (y + 0.5);
      if (alpha > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('icon renders empty');
  const sx = vw / info.width, sy = vh / info.height;
  return { x0: vx + x0 * sx, x1: vx + (x1 + 1) * sx, y0: vy + y0 * sy, y1: vy + (y1 + 1) * sy, inkCy: vy + (inkY / inkSum) * sy };
}
async function normalizeViewBox(svg, id) {
  const b = await paintedBounds(svg);
  const fill = FILL_EXCEPTIONS[id] ?? FILL;
  const offsetY = OFFSET_Y_EXCEPTIONS[id] ?? OFFSET_Y;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (1 - INK_BLEND) * ((b.y0 + b.y1) / 2) + INK_BLEND * b.inkCy;
  // viewBox center = cy - OFFSET_Y * side; grow the side if that would clip the top or bottom of the artwork
  const side = Math.max(
    Math.max(b.x1 - b.x0, b.y1 - b.y0) / fill,
    (b.y1 - cy) / (0.5 - offsetY),
    (cy - b.y0) / (0.5 + offsetY)
  );
  const viewBox = `${r2(cx - side / 2)} ${r2(cy - side / 2 - offsetY * side)} ${r2(side)} ${r2(side)}`;
  return svg.replace(/<svg\b([^>]*)>/, (all, attrs) => `<svg${attrs.replace(/\s(width|height|viewBox)="[^"]*"/g, '')} viewBox="${viewBox}">`);
}
for (const [file, svg] of [...written].sort()) {
  const id = file.replace(/\.svg$/, '');
  if (FILL_EXCEPTIONS[id] !== undefined) console.log(`note: optical fill exception ${id} = ${FILL_EXCEPTIONS[id]}`);
  const body = await normalizeViewBox(minify(svg), id);
  writeFileSync(join(outDir, file), `${pierreFiles.has(file) ? `${PIERRE_COMMENT}\n` : ''}${body}\n`);
}

const sortObj = (map, fmt) =>
  Object.fromEntries([...map].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, id]) => [k, fmt(id)]));
const theme = {
  schemaVersion: 1,
  icons: {
    file: ICON_FILE(fileIconId),
    folder: 'icons/folder.svg',
    ...(slots['folder-open'] ? { 'folder-open': slots['folder-open'] } : {})
  },
  fileNames: sortObj(names, ICON_FILE),
  fileExtensions: sortObj(exts, ICON_FILE),
  folderNames: {},
  folderNamesExpanded: {}
};
writeFileSync(join(outDir, 'theme.json'), `${JSON.stringify(theme, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Manifest wiring
// ---------------------------------------------------------------------------
const manifestPath = rel('orca-plugin.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const entry = { id: 'flexoki-icons', title: 'Flexoki Icons', path: 'icons/theme.json' };
manifest.contributes.iconThemes = [entry];
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const bucket = { mono: [], color: [], drop: [] };
for (const [id, k] of cls) bucket[k].push(id);
const emitted = { mono: 0, color: 0 };
for (const id of referenced) if (svgOf.has(id)) emitted[svgOf.get(id).kind]++;
const extraKinds = { mono: 0, color: 0 };
for (const e of Object.values(extras)) extraKinds[e.kind]++;

console.log(`Pierre equivalence (token -> our ids [paint]):\n  ${pierreTable.join('\n  ')}`);
console.log(`pierre-derived icon files: ${[...pierreFiles].sort().join(',')}`);
console.log(`Symbols icons kept despite a related Pierre glyph: ${Object.keys(PIERRE_KEPT_OURS).join(', ')}`);
console.log(`classification: mono ${bucket.mono.length}, color ${bucket.color.length}, drop ${bucket.drop.length}`);
console.log(`emitted upstream icons: mono ${emitted.mono}, color ${emitted.color}; extras: mono ${extraKinds.mono}, color ${extraKinds.color}; folder 1`);
console.log(`counts before pruning (merged with ${langAdded} language-derived extensions): fileExtensions ${before.fileExtensions}, fileNames ${before.fileNames}`);
console.log(`after availability filter + extras: fileExtensions ${countsAvail.fileExtensions}, fileNames ${countsAvail.fileNames}`);
console.log(`after dropping redundant fileNames: fileExtensions ${countsRedundantFree.fileExtensions}, fileNames ${countsRedundantFree.fileNames}`);
console.log(`after pruning: fileExtensions ${exts.size}, fileNames ${names.size}, slots ${slotCount}, TOTAL refs ${total()} (Orca limit ${ORCA_MAX_REFS}, budget ${TOTAL_BUDGET}), SVGs ${written.size}`);
console.log('required files:');
const sourceOf = (id) => (svgOf.get(id)?.pierre ? 'Pierre' : extraIds.has(id) ? 'extra' : 'Symbols');
for (const f of Object.keys(REQUIRED_FILES)) console.log(`  ${f.padEnd(28)} ${lookup(f).id.padEnd(16)} ${sourceOf(lookup(f).id)}`);
console.log(`unavailable icons: ${report.dropped.join('; ') || 'none'}`);
if (report.oversize.length) console.log(`oversize (>64KB) skipped: ${report.oversize.join('; ')}`);
console.log(`unmapped hex: ${report.unmapped.size ? [...report.unmapped].sort().join('; ') : 'none'}`);
console.log(`neutral-mapped hex in color icons (-> ${FLEXOKI.neutral}): ${[...report.neutral].sort().join('; ') || 'none'}`);
console.log(`cool slate/gray treated as neutral (-> ${FLEXOKI.neutral}): ${[...report.coolGray].sort().join('; ') || 'none'}`);
const keepMissing = [...[...KEEP_NAMES].filter((k) => !names.has(k) && !lookup(k).id).map((k) => `name ${k}`), ...[...KEEP_EXTS].filter((k) => !exts.has(k)).map((k) => `ext ${k}`)];
console.log(`KEEP keys with no mapping (not provided upstream or by extras): ${keepMissing.join(', ') || 'none'}`);
if (report.lumMask.size) console.log(`color icons with luminance masks (mask paints untouched): ${[...report.lumMask].sort().join(', ')}`);
const grouped = new Map();
for (const l of dropLog) {
  const m = / -> (\S+) \((.*)\)$/.exec(l);
  const key = m ? `${m[1]} [${m[2]}]` : l;
  grouped.set(key, (grouped.get(key) || 0) + 1);
}
console.log(`dropped entries (${dropLog.length}), grouped by icon [reason]:`);
for (const [k, n] of [...grouped].sort()) console.log(`  ${k}: ${n}`);
