import Phaser from 'phaser';

const NARRATIVE_ART_ROOT = 'assets/generated/narrative_art_v1';

export const NARRATIVE_ART_TEXTURES = {
  storyIntroUnemployed: 'narrative-story-intro-unemployed',
  storyIntroTally: 'narrative-story-intro-tally',
  storyIntroShop: 'narrative-story-intro-shop',
  myriadAtlasReveal: 'narrative-myriad-atlas-reveal',
} as const;

export const STORY_INTRO_TEXTURES = [
  NARRATIVE_ART_TEXTURES.storyIntroUnemployed,
  NARRATIVE_ART_TEXTURES.storyIntroTally,
  NARRATIVE_ART_TEXTURES.storyIntroShop,
] as const;

export function preloadNarrativeArt(scene: Phaser.Scene): void {
  const entries: Array<[string, string]> = [
    [NARRATIVE_ART_TEXTURES.storyIntroUnemployed, `${NARRATIVE_ART_ROOT}/story_intro_unemployed.png`],
    [NARRATIVE_ART_TEXTURES.storyIntroTally, `${NARRATIVE_ART_ROOT}/story_intro_tally.png`],
    [NARRATIVE_ART_TEXTURES.storyIntroShop, `${NARRATIVE_ART_ROOT}/story_intro_shop.png`],
    [NARRATIVE_ART_TEXTURES.myriadAtlasReveal, `${NARRATIVE_ART_ROOT}/myriad_atlas_reveal.png`],
  ];

  entries.forEach(([key, path]) => {
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  });
}
