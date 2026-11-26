# Flexoki for Orca

[Flexoki](https://stephango.com/flexoki) is an inky color scheme for prose and code, designed by [Steph Ango](https://stephango.com) and released under the MIT license at [kepano/flexoki](https://github.com/kepano/flexoki). This plugin brings it to [Orca](https://orca.dev): app themes **Flexoki Light** and **Flexoki Dark**, syntax colors, and matching terminal themes.

This is an unofficial port. All credit for the palette and the syntax color design goes to Steph Ango.

## Install

In Orca, open the plugin directory and search for Flexoki, or run:

```sh
orca plugin install dungnt95/orca-flexoki-theme
```

Then pick **Flexoki Light** or **Flexoki Dark** in Orca's theme picker, and the terminal theme of the same name. The file icon theme **Flexoki Icons** is selectable in the same place.

## Credits

- Palette and accent values: [Flexoki](https://stephango.com/flexoki) by Steph Ango. Light themes use the 600 accents, dark themes the 400 accents, as the spec recommends.
- Syntax colors: `tokenColors` from the official [Flexoki VS Code themes](https://github.com/kepano/flexoki/tree/main/vscode) (MIT, © 2023 Steph Ango), with two fixes: empty-scope placeholder rules are dropped, and local variables use the text color instead of the UI background color.
- Terminal palette: based on the official [Flexoki kitty themes](https://github.com/kepano/flexoki/tree/main/kitty). The light theme uses 600 accents for normal colors so they stay readable on paper.
- File icons (Flexoki Icons): a hybrid based on two icon sets, recolored to Flexoki. Where [@pierre/trees](https://github.com/pierrecomputer/pierre) 1.0.0 (Apache-2.0, © 2025 Pierre Computer Company; vendored in `src/pierre/`) has a glyph for a file type, a recolored and re-framed copy of it is used (for example Python, Docker, Git, React, Swift, Rust); everything else uses [Symbols](https://github.com/miguelsolorio/vscode-symbols) by Miguel Solorio (MIT, © 2020-22 Miguel Solorio; vendored in `src/symbols/`, commit `a405d32`). Neutral file types (document, text, log, lock files, env/config gears, license, font, shell, folders, certificates) are monochrome and follow the sidebar text color in light and dark; file-type groups are single-accent Flexoki colors (docs green, JSON/YAML/XML orange, CSV and databases cyan, images magenta, video and audio purple, archives yellow); language logos and brand marks use Flexoki accents that read on both sidebars: the 500 values (`#C03E35`, `#CB6120`, `#BE9207`, `#2F968D`, `#3171B2`, `#735EB5`, `#B74583`), green-600 `#66800B`, and neutral `#878580`. Extra icons for Office files, Figma, logs and similar formats are drawn for this plugin on Symbols' document and folder outlines (`src/icons-extra/`). Folders are one uniform monochrome pair. This theme is based on those projects and is not affiliated with or endorsed by their authors. Full attribution, licenses and the list of changes: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Trademarks: language, tool and product logos shown as file icons are trademarks of their respective owners. They are recolored only to identify file types; this plugin is not affiliated with or endorsed by those owners.

## Files

| Path                        | Role                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `src/flexoki-source.json`   | App color spec (light `colors` + `variants.dark`); edit this            |
| `src/vscode/*.json`         | Upstream syntax colors from kepano/flexoki (MIT)                        |
| `scripts/build.mjs`         | Maps the spec to Orca tokens; writes `themes/` and `terminal/`          |
| `scripts/check-contrast.mjs`| Lists tokens Orca would drop for low contrast; must print no `✗`        |
| `scripts/images.mjs`        | Renders `images/` (cover and screenshots) from the generated themes     |
| `scripts/icons.mjs`         | Merges Pierre + Symbols + extras, recolors; writes `icons/` and `icons/theme.json` |
| `src/symbols/`, `src/pierre/`, `src/icons-extra/` | Vendored Symbols (MIT), vendored Pierre Trees icons (Apache-2.0, see `src/pierre/SOURCE.md`) and extra icons; edit extras, not `icons/` |
| `themes/`, `terminal/`, `icons/` | Generated; do not edit by hand                                     |

## Develop

```sh
node scripts/build.mjs
node scripts/check-contrast.mjs
NODE_PATH=$HOME/.local/share/thought-partner/node/node_modules node scripts/icons.mjs  # needs sharp; prints mono/color counts, unmapped hex and prune report
node scripts/images.mjs        # needs Google Chrome and sharp
orca plugin validate . --json
orca plugin dev load .
```

## Spec keys Orca cannot use

Orca drops a text/surface token pair below 4.5:1 (3:1 for git colors) and paints its own neutral defaults instead. Two consequences shape the build:

- `--muted` uses Flexoki `ui` (`#E6E4D9` / `#282726`), not the spec's `bg-2`. Orca paints segmented-control tracks with `--muted` on the `bg-2` sidebar, so `bg-2` made the track invisible. `--accent` sits one step above (`#DAD8CE` / `#343331`) so the selected segment still shows in dark mode.
- Muted text is nudged toward `tx` just enough to pass on `ui`: `#666561` in light (spec `#6F6E69`), `#908E88` in dark (spec `#878580`). Ignored files use `#878580`.

Orca's public theme API has no token for these, so they are not applied: `toolbarControlHover`, `placeholder`, `secondaryLabel`, `sidebarControlSurface`, `sidebarMutedForeground`, `warningSurface`, `messageAction*`, `searchMatch*`, `terminalScrollbar*`, and every `*Foreground` paired with error/warning/update.

Translucent `terminalSelection` is flattened onto the terminal background, because Orca terminal colors accept opaque hex only.

## License

MIT, see [LICENSE](LICENSE). The Pierre-derived icons are Apache-2.0 ([LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
