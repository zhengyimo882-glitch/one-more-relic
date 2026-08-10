import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { PlayerAppearanceDefinition } from '../data/playerAppearances';
import type { PlayerDirection } from '../objects/Player';

export const PLAYER_TEXTURE_KEY = 'generated-tomb-explorer';
export const PLAYER_PORTRAIT_FRAME = 0;
const PLAYER_TEXTURE_PATH =
  'assets/generated/tomb_vertical_slice/player_explorer_sheet.png';
const PLAYER_FRAME_SIZE = 256;

type PlayerAction = 'pickup' | 'place';
type PlayerVisualState = 'idle' | 'walk' | 'carry-idle' | 'carry-walk';

const DIRECTION_COLUMN: Record<PlayerDirection, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const APPEARANCE_TINTS: Record<PlayerAppearanceDefinition['id'], number> = {
  charcoal: 0xffffff,
  moss: 0xdbe5d3,
  umber: 0xead7ca,
  ash: 0xd9e1e7,
};

export interface PlayerAvatarVisual {
  container: Phaser.GameObjects.Container;
  setFacing(direction: PlayerDirection): void;
  setMovement(moving: boolean, time: number): void;
  setCarrying(carrying: boolean): void;
  playAction(action: PlayerAction): void;
  getAnimationState(): PlayerVisualState;
}

export function preloadPlayerAvatarAssets(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_TEXTURE_KEY)) {
    return;
  }
  scene.load.spritesheet(PLAYER_TEXTURE_KEY, PLAYER_TEXTURE_PATH, {
    frameWidth: PLAYER_FRAME_SIZE,
    frameHeight: PLAYER_FRAME_SIZE,
  });
}

export function getPlayerAvatarTint(
  appearanceId: PlayerAppearanceDefinition['id'],
): number {
  return APPEARANCE_TINTS[appearanceId];
}

export function createPlayerAvatarVisual(
  scene: Phaser.Scene,
  appearance: PlayerAppearanceDefinition,
): PlayerAvatarVisual {
  registerPlayerAnimations(scene);
  scene.textures.get(PLAYER_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);

  const sprite = scene.add
    .sprite(0, 0, PLAYER_TEXTURE_KEY, frameFor('up', false, false))
    .setOrigin(0.5, 0.66)
    .setScale(TOMB_FEEL.player.spriteScale)
    .setTint(APPEARANCE_TINTS[appearance.id]);
  const container = scene.add.container(0, 0, [sprite]);

  let facing: PlayerDirection = 'up';
  let moving = false;
  let carrying = false;
  let actionActive = false;

  const applyState = (): void => {
    if (moving) {
      const key = animationKey(facing, carrying);
      if (sprite.anims.currentAnim?.key !== key || !sprite.anims.isPlaying) {
        sprite.play(key, true);
      }
      sprite.anims.timeScale = TOMB_FEEL.player.movementAnimationSpeedMultiplier;
      return;
    }
    sprite.stop();
    sprite.setFrame(frameFor(facing, carrying, false));
  };

  return {
    container,
    setFacing(direction: PlayerDirection): void {
      if (facing === direction) {
        return;
      }
      facing = direction;
      applyState();
    },
    setMovement(isMoving: boolean, time: number): void {
      if (moving !== isMoving) {
        moving = isMoving;
        applyState();
      }
      if (actionActive) {
        return;
      }
      if (moving) {
        sprite.y = Math.sin(time / 82) * 0.75;
        sprite.rotation = Math.sin(time / 96) * 0.009;
        sprite.setScale(
          TOMB_FEEL.player.spriteScale,
          TOMB_FEEL.player.spriteScale * (1 + Math.sin(time / 82) * 0.008),
        );
      } else {
        const breath = Math.sin(time / 520) * TOMB_FEEL.player.idleBreathingAmplitude;
        sprite.y = breath;
        sprite.rotation = 0;
        sprite.setScale(
          TOMB_FEEL.player.spriteScale,
          TOMB_FEEL.player.spriteScale * (1 + breath * 0.0025),
        );
      }
    },
    setCarrying(isCarrying: boolean): void {
      if (carrying === isCarrying) {
        return;
      }
      carrying = isCarrying;
      applyState();
    },
    playAction(action: PlayerAction): void {
      actionActive = true;
      scene.tweens.killTweensOf(sprite);
      const duration = action === 'pickup'
        ? TOMB_FEEL.player.pickupFeedbackMs
        : TOMB_FEEL.player.placeFeedbackMs;
      scene.tweens.add({
        targets: sprite,
        y: action === 'pickup' ? -5 : 4,
        scaleX: TOMB_FEEL.player.spriteScale * (action === 'pickup' ? 1.045 : 0.97),
        scaleY: TOMB_FEEL.player.spriteScale * (action === 'pickup' ? 0.965 : 1.035),
        alpha: action === 'pickup' ? 1 : 0.9,
        duration: duration / 2,
        yoyo: true,
        ease: 'Sine.InOut',
        onComplete: () => {
          actionActive = false;
          sprite.setAlpha(1).setRotation(0).setScale(TOMB_FEEL.player.spriteScale);
          applyState();
        },
      });
    },
    getAnimationState(): PlayerVisualState {
      if (carrying) {
        return moving ? 'carry-walk' : 'carry-idle';
      }
      return moving ? 'walk' : 'idle';
    },
  };
}

function frameFor(
  direction: PlayerDirection,
  carrying: boolean,
  walking: boolean,
): number {
  const row = carrying ? (walking ? 3 : 2) : walking ? 1 : 0;
  return row * 4 + DIRECTION_COLUMN[direction];
}

function animationKey(direction: PlayerDirection, carrying: boolean): string {
  return `generated-explorer-${carrying ? 'carry-' : ''}walk-${direction}`;
}

function registerPlayerAnimations(scene: Phaser.Scene): void {
  for (const direction of ['up', 'down', 'left', 'right'] as const) {
    for (const carrying of [false, true]) {
      const key = animationKey(direction, carrying);
      if (scene.anims.exists(key)) {
        continue;
      }
      scene.anims.create({
        key,
        frames: [
          frameFor(direction, carrying, false),
          frameFor(direction, carrying, true),
          frameFor(direction, carrying, false),
          frameFor(direction, carrying, true),
        ].map((frame) => ({ key: PLAYER_TEXTURE_KEY, frame })),
        frameRate: TOMB_FEEL.player.animationFrameRate,
        repeat: -1,
      });
    }
  }
}
