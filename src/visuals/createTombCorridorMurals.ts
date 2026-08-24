import Phaser from 'phaser';

export const CORRIDOR_MURAL_TEXTURES = {
  leftUpper: 'original-corridor-mural-left-upper',
  leftLower: 'original-corridor-mural-left-lower',
  rightUpper: 'original-corridor-mural-right-upper',
  rightLower: 'original-corridor-mural-right-lower',
} as const;

export const MURAL_DISCOVERY_UI_TEXTURES = {
  chrome: 'mural-discovery-environmental-chrome',
  wallMarkerFrame: 'mural-wall-marker-crop',
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
          ? Phaser.Math.Clamp(0.28 + lampBrightness * 0.72, 0, 1)
          : 0.035;
        panel.level = Phaser.Math.Linear(panel.level, target, visible ? 0.22 : 0.12);
        const breathing = visible ? Math.sin(scene.time.now * 0.0035) * 0.025 : 0;
        panel.marker
          .setAlpha(panel.level)
          .setScale(1 + panel.level * 0.045 + breathing);
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
  const glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  glow.fillStyle(0xb9874c, 0.16);
  glow.fillEllipse(0, 0, 112, 76);
  const plate = scene.add
    .image(0, 0, MURAL_DISCOVERY_UI_TEXTURES.chrome, MURAL_DISCOVERY_UI_TEXTURES.wallMarkerFrame)
    .setDisplaySize(96, 62);
  const marker = scene.add.container(definition.worldX, definition.worldY, [
    glow,
    plate,
  ]).setDepth(1.52).setAlpha(0.035);
  return { sampleX, sampleY, marker, level: 0.035, definition };
}
