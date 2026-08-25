# hogwash logo

A hog snout sitting in a block of prose, with one span highlighted — the tell
hogwash just found.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="hogwash-lockup-dark.svg">
  <img alt="hogwash" src="hogwash-lockup.svg" width="360">
</picture>

## Files

| file | use |
| --- | --- |
| `hogwash-lockup.svg` / `-dark.svg` | mark plus wordmark. The default for a README header or a docs site. |
| `hogwash-mark.svg` / `-dark.svg` | mark alone: snout between two lines of text. Square, transparent. |
| `hogwash-avatar.svg` | square, dark ground, rounded corners. GitHub org or npm avatar. |
| `hogwash-favicon.svg` / `-dark.svg` | snout only, no text lines. Legible below 32 px. |
| `favicon.ico` | 16, 32, 48 and 64 px, from `hogwash-favicon.svg`. |
| `png/` | rendered PNGs, transparent where the SVG is. |

The `-dark` files are for dark backgrounds; the others are for light ones. Both
carry the same amber, which holds on either ground.

## Palette

| role | light | dark |
| --- | --- | --- |
| snout | `#16181d` ink | `#f2efe9` paper |
| finding | `#e8a33d` amber | `#f0b055` amber |
| prose | `#cbc6bd` | `#454b55` |

Two neutrals and one accent, the same three the terminal output uses: the text
is quiet, the finding is not.

## Wordmark

JetBrains Mono ExtraBold, tracked in by 3%, converted to outlines — the SVGs
carry no font dependency. The bar under the word is the same highlighted span as
in the mark.

Set the name lowercase, always: `hogwash`, never `Hogwash` or `HOGWASH`.

## Clear space and minimum size

Keep clear space of one nostril width on every side. The lockup holds down to
120 px wide; below that use the mark, and below 32 px use the favicon, which
drops the text lines.

## Re-rendering

`export.py` rebuilds `png/` and `favicon.ico` from the SVGs. The SVGs are the
source; do not edit the PNGs.

```sh
pip install cairosvg pillow
python3 docs/logo/export.py
```

## Licence

MIT, with the rest of the project.
