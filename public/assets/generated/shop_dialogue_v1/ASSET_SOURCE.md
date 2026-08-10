# Shopkeeper and parchment generated assets

These images were generated specifically for *One More Relic / 见好不收* with OpenAI's built-in image generation tool on 2026-08-10. They are original generated raster assets, not downloaded third-party artwork.

Runtime assets:

- `shopkeeper_sheet.png`: 4 columns by 4 rows. Rows are idle, raise-hand explanation, restrained hand wave, and nod.
- `parchment_panel_9slice.png`: text-free aged parchment dialogue background prepared for Phaser NineSlice scaling.

Only the optimized transparent runtime images are kept in `public/`, so Vite does not copy intermediate masters into the game build. The raw generated images remain in the local Codex generated-image output for this task. Background removal used the installed Codex `remove_chroma_key.py` helper with soft matte, despill, and one-pixel edge contraction.

Final prompt direction:

- Shopkeeper: lean middle-aged Chinese antique dealer in a worn charcoal changshan and brown traditional vest, fixed 45-degree top-down game view, restrained gestures, consistent identity across sixteen frames.
- Parchment: text-free torn fibrous paper with water and soot wear plus subdued Chinese-ledger-inspired corner fittings, quiet center, designed for nine-slice scaling.
