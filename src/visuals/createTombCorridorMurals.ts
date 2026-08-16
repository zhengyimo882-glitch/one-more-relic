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
  marker: Phaser.GameObjects.Container;
  level: number;
  definition: TombCorridorMuralPanel;
};

export function createTombCorridorMurals(
  scene: Phaser.Scene,
): TombCorridorMurals {
  const panels = [
    createMuralPanel(scene, {
      id: 'soul-guide', englishName: 'The Array', chineseName: '建阵',
      description: 'The geomancer measures two burial mounds while attendants draw a vast network of cinnabar lines. Every route converges on the sealed chamber.',
      chineseDescription: '风水师站在阵心校准方位。\n众人用朱砂线，将两座墓冢连成一体。',
      worldX: 638, worldY: 1160, textureKey: CORRIDOR_MURAL_TEXTURES.leftUpper,
    }, 664, 1160),
    createMuralPanel(scene, {
      id: 'tomb-guardian', englishName: 'The Awakening', chineseName: '复苏',
      description: 'A crowned figure rises beyond the broken array. Water runs backward through the mountains as discarded seals tumble toward the viewer.',
      chineseDescription: '阵法崩裂后，冠冕人影\n从山河尽头苏醒。\n逆流与坠落的印块，\n正朝画外涌来。',
      worldX: 962, worldY: 1160, textureKey: CORRIDOR_MURAL_TEXTURES.rightUpper,
    }, 936, 1160),
    createMuralPanel(scene, {
      id: 'crane-crossing', englishName: 'The Alliance', chineseName: '结盟',
      description: 'The geomancer presents a compass to the ruler above the clouds. A matching instrument rests in the ruler\'s hand, binding the two sides to the same design.',
      chineseDescription: '风水师向云上的王者献出罗盘。\n对方手中，也握着一枚相同的器物。',
      worldX: 638, worldY: 1400, textureKey: CORRIDOR_MURAL_TEXTURES.leftLower,
    }, 664, 1400),
    createMuralPanel(scene, {
      id: 'underworld-court', englishName: 'The Oath', chineseName: '立誓',
      description: 'Before a celestial throne, the geomancer raises one hand over a compass. Mountain routes and celestial marks spread outward from the ritual table.',
      chineseDescription: '风水师在云端王座前举手立誓。\n罗盘、山脉与星位，从祭桌向外铺开。',
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
        panel.marker.setAlpha(panel.level);
      }
    },
    getRevealLevels: () => panels.map((panel) => panel.level),
    getPanels: () => panels.map((panel) => panel.definition),
    destroy: () => panels.forEach((panel) => panel.marker.destroy(true)),
  };
}

function createMuralPanel(
  scene: Phaser.Scene,
  definition: TombCorridorMuralPanel,
  sampleX: number,
  sampleY: number,
): MuralPanel {
  const plate = scene.add.graphics();
  plate.fillStyle(0x090907, 0.42);
  plate.fillRoundedRect(-39, -57, 78, 114, 5);
  plate.fillStyle(0x26231d, 0.96);
  plate.fillRoundedRect(-34, -52, 68, 104, 4);
  plate.lineStyle(2, 0x8f6d3f, 0.74);
  plate.strokeRoundedRect(-34, -52, 68, 104, 4);
  plate.lineStyle(1, 0x4c4130, 0.9);
  plate.strokeRect(-28, -46, 56, 92);
  plate.lineBetween(-21, -20, 21, -20);
  plate.lineBetween(-21, 17, 21, 17);
  plate.lineStyle(2, 0x9f7b46, 0.78);
  plate.lineBetween(0, -14, 12, -2);
  plate.lineBetween(12, -2, 0, 10);
  plate.lineBetween(0, 10, -12, -2);
  plate.lineBetween(-12, -2, 0, -14);
  plate.fillStyle(0xb38b4f, 0.78);
  plate.fillCircle(0, -2, 4);
  plate.lineStyle(1, 0x6d5a3c, 0.7);
  plate.lineBetween(-27, -43, -16, -32);
  plate.lineBetween(27, 43, 16, 32);

  const keyTile = scene.add.rectangle(0, 31, 28, 20, 0x11100d, 0.96)
    .setStrokeStyle(1, 0xb08a51, 0.92);
  const keyLabel = scene.add.text(0, 31, 'E', {
    fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#d7c39d',
  }).setOrigin(0.5);
  const marker = scene.add.container(definition.worldX, definition.worldY, [
    plate,
    keyTile,
    keyLabel,
  ]).setDepth(1.52).setAlpha(0.018);
  return { sampleX, sampleY, marker, level: 0.018, definition };
}
