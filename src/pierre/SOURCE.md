# Pierre Trees icons: source

| Field | Value |
| --- | --- |
| Package | `@pierre/trees` |
| Version | 1.0.0 |
| Obtained with | `npm pack @pierre/trees@1.0.0` (npm registry) |
| Tarball | `pierre-trees-1.0.0.tgz`, 347131 bytes |
| shasum (sha1) | `ffd720bb975d7d7b95ae09362eddec0a0bff7927` |
| integrity | `sha512-skHNPs4LK1nScFrSvMwN4LnZyHfFf1M7I9ivWePecFqWSYYJYdgKUFCaxPBL0MPY/Z8c3q0yhl8bkkzdDfotug==` |
| sha256 of the tarball | `4864bb2de47a2efe101de8ede2ff1d4bfc1278d3bf460bec966d0643d28541f3` |
| Source file | `package/dist/builtInIcons.js` (`<symbol id="file-tree-builtin-*">`, "complete" tier; lookup tables `BUILT_IN_FILE_NAME_TOKENS`, `BUILT_IN_FILE_EXTENSION_TOKENS`, `COMPLETE_EXTENSION_OVERRIDES`) |
| License | Apache-2.0, Copyright 2025 Pierre Computer Company (`LICENSE.md`, `NOTICE.md` copied verbatim from the tarball) |
| Upstream | https://github.com/pierrecomputer/pierre |
| Vendored | 2026-11-26 |

## Conversion

`files/<token>.svg` is one file per `file-tree-builtin-<token>` symbol (53 symbols). Each `<symbol id viewBox>…</symbol>` became
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">…</svg>`. Each file also starts with a one-line origin comment (Apache-2.0 section 4). The child elements (paths, `class`, `opacity`, `fill="currentColor"`)
are byte-for-byte the upstream ones; nothing else was changed in this directory. Recoloring, viewBox normalization and the
change notice are applied later by `scripts/icons.mjs` to the generated files in `icons/`.

Not vendored: the UI symbols (`file-tree-icon-*`: chevron, dot, file, lock, ellipsis).
