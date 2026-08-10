import Phaser from 'phaser';

const PARCHMENT_TEXTURE_KEY = 'generated-dialogue-parchment';
const PARCHMENT_VISIBLE_FRAME = 'visible-paper';
const PARCHMENT_TEXTURE_PATH =
  'assets/generated/shop_dialogue_v1/parchment_panel_9slice.png';
const PARCHMENT_VISIBLE_BOUNDS = {
  x: 42,
  y: 45,
  width: 947,
  height: 425,
} as const;

export function preloadParchmentPanel(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PARCHMENT_TEXTURE_KEY)) {
    scene.load.image(PARCHMENT_TEXTURE_KEY, PARCHMENT_TEXTURE_PATH);
  }
}

export function createParchmentPanel(
  scene: Phaser.Scene,
  width: number,
  height: number,
  tint = 0xffffff,
): Phaser.GameObjects.NineSlice {
  const texture = scene.textures.get(PARCHMENT_TEXTURE_KEY);
  if (!texture.has(PARCHMENT_VISIBLE_FRAME)) {
    texture.add(
      PARCHMENT_VISIBLE_FRAME,
      0,
      PARCHMENT_VISIBLE_BOUNDS.x,
      PARCHMENT_VISIBLE_BOUNDS.y,
      PARCHMENT_VISIBLE_BOUNDS.width,
      PARCHMENT_VISIBLE_BOUNDS.height,
    );
  }
  const horizontalSlice = Math.min(150, Math.floor(width * 0.18));
  const verticalSlice = Math.min(72, Math.max(42, Math.floor(height * 0.3)));
  const panel = scene.add.nineslice(
    0,
    0,
    PARCHMENT_TEXTURE_KEY,
    PARCHMENT_VISIBLE_FRAME,
    width,
    height,
    horizontalSlice,
    horizontalSlice,
    verticalSlice,
    verticalSlice,
  );
  panel.setTint(tint);
  return panel;
}
