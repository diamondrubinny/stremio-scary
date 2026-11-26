# SCARY brand sources

Copied from [SCARY](https://github.com/diamondrubinny/Scary) (`app/src/main/res`), Copyright 2026 diamondrubinny.
`scripts/make-brand-assets.py` turns them into the icons, logo and splash screens in `web/assets/`.

Fonts (SIL Open Font License 1.1, https://openfontlicense.org): Rubik Wet Paint here (used only to draw the logo
image); Rubik, Assistant and Cairo in `web/assets/fonts/scary/` (served to the browser).

## Illustrations and icons

- `illustrations/*.svg`: SCARY Web's own drawings (the empty web, the graveyard, the page of the thirteenth, the
  guest, the house on the hill), drawn for this project. `scripts/render-illustrations.cjs` renders them into
  `web/assets/images/`.
- The icons are drawn in code, in `web/src/scary/icons/icons.ts`. A sheet of all of them: `docs/screenshots/icons.jpg`.
