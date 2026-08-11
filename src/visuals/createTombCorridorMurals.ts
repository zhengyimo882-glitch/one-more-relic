import Phaser from 'phaser';

export const CORRIDOR_MURAL_TEXTURES = {
  leftUpper: 'original-corridor-mural-left-upper',
  leftLower: 'original-corridor-mural-left-lower',
  rightUpper: 'original-corridor-mural-right-upper',
  rightLower: 'original-corridor-mural-right-lower',
} as const;

export interface TombCorridorMurals {
  update(
    visibilityResolver: (worldX: number, worldY: number) => boolean,
    lampBrightness: number,
  ): void;
  getRevealLevels(): readonly number[];
  destroy(): void;
}

type MuralPanel = {
  sampleX: number;
  sampleY: number;
  art: Phaser.GameObjects.Image;
  level: number;
};

export function createTombCorridorMurals(
  scene: Phaser.Scene,
): TombCorridorMurals {
  const panels = [
    createMuralPanel(scene, 638, 1160, CORRIDOR_MURAL_TEXTURES.leftUpper, 664, 1160),
    createMuralPanel(scene, 962, 1160, CORRIDOR_MURAL_TEXTURES.rightUpper, 936, 1160),
    createMuralPanel(scene, 638, 1400, CORRIDOR_MURAL_TEXTURES.leftLower, 664, 1400),
    createMuralPanel(scene, 962, 1400, CORRIDOR_MURAL_TEXTURES.rightLower, 936, 1400),
  ];

  return {
    update: (visibilityResolver, lampBrightness) => {
      for (const panel of panels) {
        const visible = visibilityResolver(panel.sampleX, panel.sampleY);
        const target = visible
          ? Phaser.Math.Clamp(0.38 + lampBrightness * 0.62, 0, 1)
          : 0.018;
        panel.level = Phaser.Math.Linear(panel.level, target, visible ? 0.22 : 0.12);
        panel.art.setAlpha(panel.level);
      }
    },
    getRevealLevels: () => panels.map((panel) => panel.level),
    destroy: () => panels.forEach((panel) => panel.art.destroy()),
  };
}

function createMuralPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  sampleX: number,
  sampleY: number,
): MuralPanel {
  const art = scene.add
    .image(x, y, textureKey)
    .setDisplaySize(92, 218)
    .setDepth(1.52)
    .setAlpha(0.018);
  return { sampleX, sampleY, art, level: 0.018 };
}
