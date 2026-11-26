# Flexoki for Orca

[Flexoki](https://stephango.com/flexoki) is an inky color scheme for prose and code, designed by [Steph Ango](https://stephango.com) and released under the MIT license at [kepano/flexoki](https://github.com/kepano/flexoki). This plugin brings it to [Orca](https://orca.dev): app themes **Flexoki Light** and **Flexoki Dark**, syntax colors, and matching terminal themes.

This is an unofficial port. All credit for the palette and the syntax color design goes to Steph Ango.

## Install

In Orca, open the plugin directory and search for Flexoki, or run:

```sh
orca plugin install dungnt95/orca-flexoki-theme
```

Then pick **Flexoki Light** or **Flexoki Dark** in Orca's theme picker, and the terminal theme of the same name. The file icon theme **Flexoki Symbols** is selectable in the same place.

## Credits

- Palette and accent values: [Flexoki](https://stephango.com/flexoki) by Steph Ango. Light themes use the 600 accents, dark themes the 400 accents, as the spec recommends.
- Syntax colors: `tokenColors` from the official [Flexoki VS Code themes](https://github.com/kepano/flexoki/tree/main/vscode) (MIT, © 2023 Steph Ango), with two fixes: empty-scope placeholder rules are dropped, and local variables use the text color instead of the UI background color.
- Terminal palette: based on the official [Flexoki kitty themes](https://github.com/kepano/flexoki/tree/main/kitty). The light theme uses 600 accents for normal colors so they stay readable on paper.
- File icons: [Symbols](https://github.com/miguelsolorio/vscode-symbols) by Miguel Solorio (MIT, © 2020-22 Miguel Solorio), vendored in `src/symbols/` (commit `a405d32`). Generic file types are monochrome and follow the sidebar text color in light and dark. Language logos and brand marks are recolored to the nearest Flexoki 500 accent (`#C03E35`, `#CB6120`, `#BE9207`, `#768D21`, `#2F968D`, `#3171B2`, `#735EB5`, `#B74583`, neutral `#878580`). Extra icons for Office files, Figma, logs and similar formats are drawn for this plugin in the same style (`src/icons-extra/`). Folders are one uniform monochrome pair (closed and open).

## Files

| Path                        | Role                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `src/flexoki-source.json`   | App color spec (light `colors` + `variants.dark`); edit this            |
| `src/vscode/*.json`         | Upstream syntax colors from kepano/flexoki (MIT)                        |
| `scripts/build.mjs`         | Maps the spec to Orca tokens; writes `themes/` and `terminal/`          |
| `scripts/check-contrast.mjs`| Lists tokens Orca would drop for low contrast; must print no `✗`        |
| `scripts/images.mjs`        | Renders `images/` (cover and screenshots) from the generated themes     |
| `scripts/icons.mjs`         | Recolors Symbols + extras; writes `icons/` and `icons/theme.json`       |
| `src/symbols/`, `src/icons-extra/` | Vendored Symbols (MIT) and extra icons; edit extras, not `icons/` |
| `themes/`, `terminal/`, `icons/` | Generated; do not edit by hand                                     |

## Develop

```sh
node scripts/build.mjs
node scripts/check-contrast.mjs
node scripts/icons.mjs         # prints mono/color counts, unmapped hex and prune report
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

MIT. See [LICENSE](LICENSE).
