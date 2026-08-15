import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { PlayerAppearanceDefinition } from '../data/playerAppearances';
import type { PlayerDirection, PlayerLocomotion } from '../objects/Player';

export const PLAYER_TEXTURE_KEY = 'generated-tomb-explorer';
export const PLAYER_PORTRAIT_FRAME = 0;
const PLAYER_TEXTURE_PATH = 'assets/generated/tomb_vertical_slice/player_explorer_sheet.png';
const PLAYER_FRAME_SIZE = 256;
const SHEET_COLUMNS = 4;

type PlayerAction = 'pickup' | 'place';
type PlayerVisualState =
  | 'idle'
  | 'walk-forward'
  | 'walk-backward'
  | 'carry-idle'
  | 'carry-walk-forward'
  | 'carry-walk-backward';
type CardinalPose = 'down' | 'left' | 'right' | 'up';

const CARDINAL_COLUMN: Record<CardinalPose, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

// The source sheet contains four intact silhouettes. Diagonal movement uses the
// nearest side-facing pose so that every frame remains anatomically coherent.
const DIRECTION_POSE: Record<PlayerDirection, CardinalPose> = {
  north: 'up',
  'north-east': 'right',
  east: 'right',
  'south-east': 'right',
  south: 'down',
  'south-west': 'left',
  west: 'left',
  'north-west': 'left',
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
  setMovement(moving: boolean, time: number, locomotion?: PlayerLocomotion): void;
  setCarrying(carrying: boolean): void;
  playAction(action: PlayerAction): void;
  getAnimationState(): PlayerVisualState;
}

export function preloadPlayerAvatarAssets(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_TEXTURE_KEY)) return;
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
    .sprite(0, 0, PLAYER_TEXTURE_KEY, frameFor('north', false, false))
    .setOrigin(0.5, 0.66)
    .setScale(TOMB_FEEL.player.spriteScale)
    .setTint(APPEARANCE_TINTS[appearance.id]);
  const container = scene.add.container(0, 0, [sprite]);

  let facing: PlayerDirection = 'north';
  let moving = false;
  let carrying = false;
  let locomotion: PlayerLocomotion = 'forward';
  let actionActive = false;

  const applyState = (): void => {
    if (moving) {
      const key = animationKey(facing, carrying, locomotion);
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
      if (facing === direction) return;
      facing = direction;
      applyState();
    },
    setMovement(
      isMoving: boolean,
      time: number,
      nextLocomotion: PlayerLocomotion = locomotion,
    ): void {
      if (moving !== isMoving || locomotion !== nextLocomotion) {
        moving = isMoving;
        locomotion = nextLocomotion;
        applyState();
      }
      if (actionActive) return;

      if (moving) {
        const stride = Math.sin(time / 102);
        const locomotionSign = locomotion === 'backward' ? -1 : 1;
        sprite.y = -Math.abs(stride) * 0.48;
        sprite.rotation = stride * 0.003 * locomotionSign;
        sprite.setScale(
          TOMB_FEEL.player.spriteScale * (1 + Math.cos(time / 204) * 0.0015),
          TOMB_FEEL.player.spriteScale * (1 + Math.abs(stride) * 0.0025),
        );
      } else {
        const breath = Math.sin(time / 560) * TOMB_FEEL.player.idleBreathingAmplitude;
        sprite.y = breath * 0.34;
        sprite.rotation = 0;
        sprite.setScale(
          TOMB_FEEL.player.spriteScale,
          TOMB_FEEL.player.spriteScale * (1 + breath * 0.0012),
        );
      }
    },
    setCarrying(isCarrying: boolean): void {
      if (carrying === isCarrying) return;
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
        y: action === 'pickup' ? -3 : 2,
        scaleX: TOMB_FEEL.player.spriteScale * (action === 'pickup' ? 1.025 : 0.985),
        scaleY: TOMB_FEEL.player.spriteScale * (action === 'pickup' ? 0.985 : 1.02),
        alpha: action === 'pickup' ? 1 : 0.94,
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
      if (!moving) return carrying ? 'carry-idle' : 'idle';
      if (carrying) {
        return locomotion === 'backward' ? 'carry-walk-backward' : 'carry-walk-forward';
      }
      return locomotion === 'backward' ? 'walk-backward' : 'walk-forward';
    },
  };
}

function frameFor(
  direction: PlayerDirection,
  carrying: boolean,
  walking: boolean,
): number {
  const row = carrying ? (walking ? 3 : 2) : (walking ? 1 : 0);
  return row * SHEET_COLUMNS + CARDINAL_COLUMN[DIRECTION_POSE[direction]];
}

function animationKey(
  direction: PlayerDirection,
  carrying: boolean,
  locomotion: PlayerLocomotion,
): string {
  return `generated-explorer-${carrying ? 'carry-' : ''}${locomotion}-${direction}`;
}

function registerPlayerAnimations(scene: Phaser.Scene): void {
  const directions = Object.keys(DIRECTION_POSE) as PlayerDirection[];
  for (const direction of directions) {
    for (const carrying of [false, true]) {
      for (const locomotion of ['forward', 'backward'] as const) {
        const key = animationKey(direction, carrying, locomotion);
        if (scene.anims.exists(key)) continue;
        const idleFrame = frameFor(direction, carrying, false);
        const stepFrame = frameFor(direction, carrying, true);
        const frameSequence = locomotion === 'forward'
          ? [idleFrame, stepFrame, idleFrame, stepFrame]
          : [stepFrame, idleFrame, stepFrame, idleFrame];
        scene.anims.create({
          key,
          frames: frameSequence.map((frame) => ({
            key: PLAYER_TEXTURE_KEY,
            frame,
          })),
          frameRate: TOMB_FEEL.player.animationFrameRate,
          repeat: -1,
        });
      }
    }
  }
}
