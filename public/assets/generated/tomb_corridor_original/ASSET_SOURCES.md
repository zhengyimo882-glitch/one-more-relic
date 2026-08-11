# Tomb Corridor Original Art

These runtime PNGs were created specifically for the *One More Relic / 见好不收*
prototype on 2026-08-11. They are project-owned generated artwork and do not replace
or modify any third-party source pack.

## Files and art direction

- `mural_left_soul_guide.png` — two-register funerary mural: a Daoist soul guide,
  moon gate, crane, lotus and underworld river.
- `mural_right_tomb_guardian.png` — companion funerary mural: tomb guardian,
  spirit beast and underworld judgement court.
- `mural_left_upper.png`, `mural_left_lower.png`, `mural_right_upper.png` and
  `mural_right_lower.png` — runtime crops of those two master murals. Keeping the
  halves explicit avoids Phaser scaling a cropped source as though it were still
  the full-height painting.
- `gate_closed.png` — complete closed Chinese ceremonial tomb gate with tiled roof,
  lacquered studded doors, timber columns, blank plaque and unlit braziers.
- `gate_open.png` — matching fully-open state of the same gate.
- `ghost_fire.png` — blue will-o'-wisp and bronze lotus brazier used for the animated
  approach and extinguish effect.

The gate and ghost-fire masters were generated on a flat magenta chroma-key field,
then converted to alpha PNGs and cropped without altering the original generated
masters. The murals are opaque rectangular wall paintings. Runtime filtering is
linear because these are high-resolution hand-painted assets rather than pixel art.

No readable inscription was generated for the plaque, avoiding invented or malformed
Chinese characters. The plaque intentionally remains blank for a later approved title.
