import Phaser from 'phaser';
import { UI_TOKENS } from '../config/uiTokens';

export type ArtPanelTheme = 'dark' | 'paper';

export const ART_PANEL_TEXTURES = {
  dark: 'art-v2-ui-dark-panel',
  paper: 'art-v2-ui-paper-panel',
} as const;

export function preloadArtPanels(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ART_PANEL_TEXTURES.dark)) {
    scene.load.image(ART_PANEL_TEXTURES.dark, UI_TOKENS.textures.darkPanel);
  }
  if (!scene.textures.exists(ART_PANEL_TEXTURES.paper)) {
    scene.load.image(ART_PANEL_TEXTURES.paper, UI_TOKENS.textures.paperPanel);
  }
}

export function createArtPanel(
  scene: Phaser.Scene,
  width: number,
  height: number,
  theme: ArtPanelTheme,
  alpha = 1,
): Phaser.GameObjects.NineSlice {
  const texture = ART_PANEL_TEXTURES[theme];
  scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return scene.add
    .nineslice(0, 0, texture, undefined, width, height, 72, 72, 72, 72)
    .setAlpha(alpha);
}

