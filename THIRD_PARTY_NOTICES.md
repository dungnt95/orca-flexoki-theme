# Third-party notices

Flexoki for Orca combines work from the following sources. The plugin's own code and data are MIT-licensed (see `LICENSE`);
the Pierre-derived icons are Apache-2.0 (see `LICENSES/Apache-2.0.txt`).

## 1. Flexoki palette and syntax colors

- Source: https://github.com/kepano/flexoki, https://stephango.com/flexoki
- Author: Steph Ango. License: MIT. Copyright (c) 2023 Steph Ango.
- Used in: `src/flexoki-source.json`, `src/vscode/*.json`, `themes/`, `terminal/`, and every icon color in `icons/`.
- Changes: colors mapped into Orca theme/terminal tokens; syntax `tokenColors` fixed as described in the README; icon colors
  use the Flexoki 500 accents.

## 2. Symbols icon theme

- Source: https://github.com/miguelsolorio/vscode-symbols, commit `a405d32cca082d838ad7739b6d0044dea9dbbb79`
- Author: Miguel Solorio. License: MIT. Copyright (c) 2020-22 Miguel Solorio. Full text: `src/symbols/LICENSE`.
- Files: `src/symbols/` (vendored unmodified), the SVGs in `icons/` not listed under section 3, and the extra icons in `src/icons-extra/` (drawn for this plugin on Symbols' document and folder outlines).
- Changes: SVGs sanitized for Orca (comments, editor metadata, `<style>` and unsupported attributes removed; style
  declarations converted to attributes); generic file types recolored to `currentColor`, language and brand marks recolored to the
  nearest Flexoki 500 accent; `csv` and `editorconfig` redrawn; viewBox normalized (square, cropped to the artwork, optical
  vertical offset); file and extension mappings merged from the upstream theme's `fileNames`, `fileExtensions` and
  `languageIds` and pruned to Orca's 512-mapping limit.

## 3. @pierre/trees icons

- Source: https://github.com/pierrecomputer/pierre, npm package `@pierre/trees` version 1.0.0
  (tarball sha1 `ffd720bb975d7d7b95ae09362eddec0a0bff7927`, see `src/pierre/SOURCE.md`)
- Author: Pierre Computer Company. License: Apache License 2.0. Copyright 2025 Pierre Computer Company.
  Full text: `LICENSES/Apache-2.0.txt` (identical to `src/pierre/LICENSE.md`).
- Files: `src/pierre/` (symbols converted to standalone SVG files; `LICENSE.md` and `NOTICE.md` verbatim) and the generated
  `icons/*.svg` that start with a "Derived from @pierre/trees" comment (the list is printed by `node scripts/icons.mjs`).
- Changes (Apache-2.0 section 4(b)): each `<symbol>` of the "complete" built-in set was converted to a standalone `<svg>` with
  the geometry untouched; the `fill="currentColor"` paints were replaced by Flexoki 500 accents (or kept as `currentColor` for
  monochrome icons, python uses two accents); `class` attributes removed; the viewBox was rewritten to a square cropped to the
  artwork with a small optical vertical offset; whitespace and unused ids were minified; a change-notice comment was added at the
  top of each derived file. Which Pierre icon replaces which Symbols icon is the `PIERRE_MAP` table in `scripts/icons.mjs`; the Symbols `c` and `cplus` icons keep their Symbols artwork (Pierre's `c`/`cpp` glyphs are not used). Each vendored file in `src/pierre/files/` carries a first-line comment stating its origin and that only the container changed (symbol to standalone svg).
- This project is not affiliated with or endorsed by Pierre Computer Company; no Pierre trademarks are used.

### NOTICE (Apache-2.0 section 4(d)), reproduced from the package's `NOTICE.md`

This project includes some code derived from
[@headless-tree/core](https://github.com/lukasbach/headless-tree).

The initial version of this project used `headless-tree` as the underlying tree
implementation. We have since written our own core at `packages/path-store`, but
many of the best ideas from `headless-tree` made their way to `path-store` and
`trees`. It's hard to identify exactly which code this is at this point, but
definitely things like the drag and drop implementation and the general list
approach to rendering and I'm sure more. The work that `@lukasbach` has
contributed to this space is greatly appreciated. `<3`

Original license for `headless-tree/core`:

```
MIT License

Copyright (c) 2023 Lukas Bach

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
