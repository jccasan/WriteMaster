# James D. May Books — design system

Author brand for the Oracle Veil series (Oracle Veil, Darkwell, The Long Sleep) and the
Alex Guerrero series (Slingshot, Shield).

**Canvas:** https://claude.ai/code/artifact/8887063a-57dd-4132-b007-59cb870bbfa2

## Source of truth

Every value here was taken off the Oracle Veil Book 1 front cover and the approved
JAMES D. MAY BOOKS wordmark. Where the brief and the cover disagreed, the cover won and the
disagreement is flagged in the system rather than quietly resolved.

Hex values were eyedropped from supplied raster images. Re-sample against the layered cover
file before any press run.

## Layout

```
marks/     wordmark-stacked.svg      primary lockup, corrected vector master
           wordmark-horizontal.svg   site header and email footer
           monogram.svg              JDM in the reticle ring, 32px floor
           reticle.svg               the glyph alone, 16px floor, the favicon
tokens/    tokens.json               colour, contrast, type, space, cover grid, reticle geometry
           tokens.css                the same values as CSS custom properties
canvas/    *.dc.html                 eleven artboards, one per section
           canvas.json              canvas layout, two pages
           james-d-may-books-design-system.html   the published canvas
```

## Editing the canvas

Edit the `.dc.html` working files, then re-seed and republish to the same URL. Do not edit
the seeded `james-d-may-books-design-system.html` directly; it is regenerated every time.

```
node "<design skill dir>/seed-canvas.mjs" \
  --template "<design skill dir>/payload.template.html" \
  --out james-d-may-books-design-system.html \
  --title "James D. May Books Design System" \
  --artboard Main.dc.html --artboard Color.dc.html --artboard Type.dc.html \
  --artboard Marks.dc.html --artboard Texture.dc.html --artboard Voice.dc.html \
  --artboard CoverGrid.dc.html --artboard WebComponents.dc.html \
  --artboard Email.dc.html --artboard Social.dc.html --artboard QuickRef.dc.html \
  --canvas canvas.json
```

## Open items

These are flagged inside the system and none of them are design decisions to make alone.

1. **The CIA seal on the Book 1 cover.** The brief's anti-reference list bans eagles. The seal
   has one. Separately, 50 U.S.C. §3613 restricts use of the CIA seal and colourable imitations
   of it. Needs a rights lawyer before the Darkwell cover locks.
2. **The display face is identified, not confirmed.** Druk Condensed is the closest licensable
   match read off a rendered image. Ask whoever built the cover for their font list.
3. **The concrete distress texture** was approximated from a compressed image. Get the original
   asset or the layered cover file, or Darkwell will not match Book 1.
4. **CMYK and Pantone values** are press-ready starting points and visual nearest matches. Neither
   has been checked against a chip or a proof.
5. **There is no photo library.** One cover is not an art direction.
6. **The Alex Guerrero series has no visual identity.** The cover grid will carry it. Whether the
   two series should read as distinct on a shelf is a commercial question, not a design one.

## Rules that are not negotiable

- One accent colour. One symbol. Three typefaces.
- Signal appears once per screen. Covers are the only exception and they take exactly two.
- Buttons fill with `#C31219`, not `#D4141B`. Bone on the brighter red fails WCAG AA.
- Fog never exceeds 24% opacity and never sets type. Ember never touches interface.
- The reticle is never animated to track or target anything.
