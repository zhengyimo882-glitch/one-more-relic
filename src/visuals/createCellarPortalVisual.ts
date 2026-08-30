import Phaser from 'phaser';
import type { TombPointLight } from '../types/TombLighting';

export const CELLAR_PORTAL_TEXTURE = 'cellar-portal-animation-v1';
export const CELLAR_PORTAL_SPAWN_ANIMATION = 'cellar-portal-spawn-v1';
export const CELLAR_PORTAL_IDLE_ANIMATION = 'cellar-portal-idle-v1';

const CELLAR_PORTAL_PATH = 'assets/art-v2/effects/cellar-portal-animation-sheet-v1.png';
const FRAME_SIZE = 256;
const PORTAL_SCALE = 0.74;
const PORTAL_ORIGIN_Y = 0.87;

// Measured from the approved sprite sheet: the stable portal is about 200 px tall.
// At this scale its visible height is ~148 px, versus ~94 px for the player, a
// natural 1.57:1 doorway-to-person ratio.
export const CELLAR_PORTAL_METRICS = {
  playerVisibleHeight: 94,
  sourceVisibleWidth: 124,
  sourceVisibleHeight: 200,
  displayVisibleWidth: Math.round(124 * PORTAL_SCALE),
  displayVisibleHeight: Math.round(200 * PORTAL_SCALE),
  heightRatioToPlayer: Number(((200 * PORTAL_SCALE) / 94).toFixed(2)),
} as const;

export type CellarPortalVisual = {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  activate: (playSpawn?: boolean) => void;
  deactivate: () => void;
  getLightSource: () => TombPointLight | null;
};

export function preloadCellarPortalVisual(scene: Phaser.Scene): void {
  scene.load.spritesheet(CELLAR_PORTAL_TEXTURE, CELLAR_PORTAL_PATH, {
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
  });
}

export function registerCellarPortalAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists(CELLAR_PORTAL_SPAWN_ANIMATION)) {
    scene.anims.create({
      key: CELLAR_PORTAL_SPAWN_ANIMATION,
      frames: scene.anims.generateFrameNumbers(CELLAR_PORTAL_TEXTURE, {
        start: 0,
        end: 3,
      }),
      frameRate: 7,
      repeat: 0,
    });
  }
  if (!scene.anims.exists(CELLAR_PORTAL_IDLE_ANIMATION)) {
    scene.anims.create({
      key: CELLAR_PORTAL_IDLE_ANIMATION,
      frames: scene.anims.generateFrameNumbers(CELLAR_PORTAL_TEXTURE, {
        start: 4,
        end: 7,
      }),
      frameRate: 3.2,
      repeat: -1,
    });
  }
}

export function createCellarPortalVisual(
  scene: Phaser.Scene,
  worldX: number,
  floorY: number,
  depth: number,
): CellarPortalVisual {
  const halo = scene.add.graphics();
  halo.fillStyle(0x684cff, 0.075);
  halo.fillEllipse(0, -76, 126, 166);
  halo.setBlendMode(Phaser.BlendModes.ADD);

  const sprite = scene.add
    .sprite(0, 0, CELLAR_PORTAL_TEXTURE, 0)
    .setOrigin(0.5, PORTAL_ORIGIN_Y)
    .setScale(PORTAL_SCALE);
  const container = scene.add
    .container(worldX, floorY, [halo, sprite])
    .setDepth(depth)
    .setVisible(false)
    .setDataEnabled();
  container.setData('portalMetrics', CELLAR_PORTAL_METRICS);

  scene.tweens.add({
    targets: halo,
    alpha: { from: 0.72, to: 1 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  const playIdle = (): void => {
    if (container.active && container.visible) {
      sprite.play(CELLAR_PORTAL_IDLE_ANIMATION, true);
    }
  };

  return {
    container,
    sprite,
    activate: (playSpawn = true) => {
      container.setVisible(true);
      sprite.stop();
      if (!playSpawn) {
        playIdle();
        return;
      }
      sprite.setFrame(0);
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, playIdle);
      sprite.play(CELLAR_PORTAL_SPAWN_ANIMATION);
    },
    deactivate: () => {
      sprite.stop().setFrame(0);
      container.setVisible(false);
    },
    getLightSource: () => container.visible
      ? {
          x: worldX,
          y: floorY - 72,
          radius: 176,
          intensity: 0.48,
          color: 0x765cff,
        }
      : null,
  };
}
