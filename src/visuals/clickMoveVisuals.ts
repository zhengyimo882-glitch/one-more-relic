import Phaser from 'phaser';

const CLICK_MOVE_ART_ROOT = 'assets/generated/click_move_v1';

export const CLICK_MOVE_TEXTURES = {
  pointer: 'click-move-cinnabar-ruyi-arrow',
  floorSeal: 'click-move-geomantic-floor-seal',
} as const;

export function preloadClickMoveVisuals(scene: Phaser.Scene): void {
  if (!scene.textures.exists(CLICK_MOVE_TEXTURES.pointer)) {
    scene.load.image(CLICK_MOVE_TEXTURES.pointer, `${CLICK_MOVE_ART_ROOT}/cinnabar_ruyi_arrow.png`);
  }
  if (!scene.textures.exists(CLICK_MOVE_TEXTURES.floorSeal)) {
    scene.load.image(CLICK_MOVE_TEXTURES.floorSeal, `${CLICK_MOVE_ART_ROOT}/geomantic_floor_seal.png`);
  }
}
