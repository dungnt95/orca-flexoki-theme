# Flexoki for Orca

[Flexoki](https://stephango.com/flexoki) is an inky color scheme for prose and code, designed by [Steph Ango](https://stephango.com) and released under the MIT license at [kepano/flexoki](https://github.com/kepano/flexoki). This plugin brings it to [Orca](https://orca.dev): app themes **Flexoki Light** and **Flexoki Dark**, syntax colors, and matching terminal themes.

This is an unofficial port. All credit for the palette and the syntax color design goes to Steph Ango.

## Install

In Orca, open the plugin directory and search for Flexoki, or run:

```sh
orca plugin install dungnt95/orca-flexoki-theme
```

Then pick **Flexoki Light** or **Flexoki Dark** in Orca's theme picker, and the terminal theme of the same name.

## Credits

- Palette and accent values: [Flexoki](https://stephango.com/flexoki) by Steph Ango. Light themes use the 600 accents, dark themes the 400 accents, as the spec recommends.
- Syntax colors: `tokenColors` from the official [Flexoki VS Code themes](https://github.com/kepano/flexoki/tree/main/vscode) (MIT, © 2023 Steph Ango), with two fixes: empty-scope placeholder rules are dropped, and local variables use the text color instead of the UI background color.
- Terminal palette: based on the official [Flexoki kitty themes](https://github.com/kepano/flexoki/tree/main/kitty). The light theme uses 600 accents for normal colors so they stay readable on paper.

## Files

| Path                      | Role                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `src/flexoki-source.json` | App color spec (light `colors` + `variants.dark`); edit this   |
| `src/vscode/*.json`       | Upstream syntax colors from kepano/flexoki (MIT)               |
| `scripts/build.mjs`       | Maps the spec to Orca tokens; writes `themes/` and `terminal/` |
| `themes/`, `terminal/`    | Generated; do not edit by hand                                 |

## Develop

```sh
node scripts/build.mjs
orca plugin validate . --json
orca plugin dev load .
```

## Spec keys Orca cannot use

Orca's public theme API has no token for these, so they are not applied: `toolbarControlHover`, `placeholder`, `iconMuted`, `secondaryLabel`, `sidebarControlSurface`, `sidebarMutedForeground`, `warningSurface`, `messageAction*`, `searchMatch*`, `terminalScrollbar*`, and every `*Foreground` paired with error/warning/update.

Translucent `terminalSelection` is flattened onto the terminal background, because Orca terminal colors accept opaque hex only.

## License

MIT. See [LICENSE](LICENSE).
