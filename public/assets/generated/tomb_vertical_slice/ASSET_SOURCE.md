# Tomb vertical slice generated sprites

These assets were generated specifically for the *One More Relic / 见好不收* prototype with OpenAI's built-in image generation tool on 2026-08-09. They are original generated raster assets, not downloaded third-party artwork.

Runtime assets:

- `player_explorer_sheet.png` — 4 directions × 4 states: idle, walk, carry idle, carry walk.
- `tomb_ghost_sheet.png` — four restrained apparition animation frames.
- `wall_shadow_sheet.png` — four distorted wall-projection animation frames.

Only the optimized transparent runtime sheets are kept in `public/`, so Vite does not copy chroma-key sources and background-removal intermediates into the game build. The raw generated images remain in the local Codex generated-image output for this task. Runtime sheets were resized to exact 1024×1024 canvases so Phaser can use stable 256×256 or 512×512 source rectangles.

Generation direction:

- Player: a cautious young Chinese tomb explorer in worn, low-saturation clothing, rendered as a fixed 45-degree top-down game sprite sheet with normal and carrying poses.
- Ghost: a thin, asymmetrical ruined-robed apparition with incomplete smoky edges, dark gray/teal palette, and no bright white glow.
- Wall shadow: a flattened, elongated and torn projection related to the apparition, intentionally inconsistent with the real lamp direction.

All source images were generated on a flat `#ff00ff` chroma background. Background removal used the installed Codex `remove_chroma_key.py` helper with soft matte, despill, and edge contraction for the ghost/shadow sheets.
