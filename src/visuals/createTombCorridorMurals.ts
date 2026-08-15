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
  getPanels(): readonly TombCorridorMuralPanel[];
  destroy(): void;
}

export type TombCorridorMuralPanel = {
  id: 'soul-guide' | 'crane-crossing' | 'tomb-guardian' | 'underworld-court';
  englishName: string;
  chineseName: string;
  description: string;
  chineseDescription: string;
  worldX: number;
  worldY: number;
  textureKey: string;
};

type MuralPanel = {
  sampleX: number;
  sampleY: number;
  art: Phaser.GameObjects.Image;
  level: number;
  definition: TombCorridorMuralPanel;
};

export function createTombCorridorMurals(
  scene: Phaser.Scene,
): TombCorridorMurals {
  const panels = [
    createMuralPanel(scene, {
      id: 'soul-guide', englishName: 'The Soul Guide', chineseName: '引魂入墓',
      description: 'A robed guide leads a pale procession toward a moon gate. Every face has been scraped away except the guide\'s.',
      chineseDescription: '披袍的引魂人领着苍白队伍走向月门。除引魂人以外，所有人的面孔都被刮去了。',
      worldX: 638, worldY: 1160, textureKey: CORRIDOR_MURAL_TEXTURES.leftUpper,
    }, 664, 1160),
    createMuralPanel(scene, {
      id: 'tomb-guardian', englishName: 'The Tomb Guardian', chineseName: '镇墓守门',
      description: 'A guardian pins a spirit beast beneath one foot. Its painted eyes point toward the sealed red gate.',
      chineseDescription: '镇墓将军脚踏异兽，画中双眼却斜斜望向墓道尽头的朱漆封门。',
      worldX: 962, worldY: 1160, textureKey: CORRIDOR_MURAL_TEXTURES.rightUpper,
    }, 936, 1160),
    createMuralPanel(scene, {
      id: 'crane-crossing', englishName: 'The Crossing of Cranes', chineseName: '鹤渡冥河',
      description: 'Cranes cross a black river while lotus lamps drift against the current. One lamp has been painted over in fresh cinnabar.',
      chineseDescription: '群鹤飞越黑色冥河，莲灯却逆流而上。其中一盏灯被人用新鲜朱砂重新涂过。',
      worldX: 638, worldY: 1400, textureKey: CORRIDOR_MURAL_TEXTURES.leftLower,
    }, 664, 1400),
    createMuralPanel(scene, {
      id: 'underworld-court', englishName: 'The Silent Court', chineseName: '无字阴司',
      description: 'An underworld court waits behind an empty judgement table. The place where a verdict should be written is blank.',
      chineseDescription: '阴司众人围着一张空判桌静候。原本应写下判词的位置，只剩一块不自然的空白。',
      worldX: 962, worldY: 1400, textureKey: CORRIDOR_MURAL_TEXTURES.rightLower,
    }, 936, 1400),
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
    getPanels: () => panels.map((panel) => panel.definition),
    destroy: () => panels.forEach((panel) => panel.art.destroy()),
  };
}

function createMuralPanel(
  scene: Phaser.Scene,
  definition: TombCorridorMuralPanel,
  sampleX: number,
  sampleY: number,
): MuralPanel {
  const art = scene.add
    .image(definition.worldX, definition.worldY, definition.textureKey)
    .setDisplaySize(92, 218)
    .setDepth(1.52)
    .setAlpha(0.018);
  return { sampleX, sampleY, art, level: 0.018, definition };
}
