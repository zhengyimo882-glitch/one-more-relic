# ART-V2 asset provenance

Generated on 2026-08-25 for the playable web demo. All originals remain in the legacy asset folders; this directory is an additive, reversible replacement set.

## Generation prompt set

- Characters: full-body Chinese supernatural-antique-game protagonist / elderly shopkeeper, strict 4×4 directional sprite-sheet layout, painterly pixel-art, 32-bit-era texture discipline, muted old wood / soil black / verdigris / cinnabar palette, warm shop key light, readable 1 px source outline, no text or props crossing cells.
- Dialogue portraits v3: identity-preserving head-and-shoulders close-ups derived from the v2 protagonist and shopkeeper portraits; faces occupy roughly 45% of the square, with readable eyes, brows, nose, mouth, beard, wrinkles and hair silhouette at a 152 px runtime size; transparent background, warm upper-left shop light, no frame or text.
- Relics: isolated top-down three-quarter ritual compass / thread-bound atlas / burial vessel / bronze mirror, Chinese funerary-antique design, painterly pixel-art, oxidized bronze / clay / lacquer / old paper materials, strong silhouette, chroma-key background, no text.
- UI: seamless carved dark-brass lacquer panel and aged handmade-paper panel, restrained Chinese geometric corner ornaments, low-contrast center, no text.
- Cellar: concealed burial cellar interior, top-down three-quarter 2D game background, stone / packed earth / damp timber, cold cyan ambient light with faint warm candle accents, pixel-painted treatment, no characters or UI.

The exact generated masters are preserved in `artifacts/art-v2-source/`. `scripts/build_art_v2_assets.py` performs chroma-key removal, edge despill, nearest-neighbor sizing, portrait extraction, tier exports, and scene grading. Runtime files in this directory are the processed outputs.
