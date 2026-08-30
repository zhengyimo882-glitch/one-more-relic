import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { PlayerAppearanceDefinition } from '../data/playerAppearances';
import type { PlayerDirection, PlayerLocomotion } from '../objects/Player';
import { ART_TOKENS, tintForScene, type ArtSceneGrade } from '../config/artTokens';

export const PLAYER_TEXTURE_KEY = 'generated-tomb-explorer';
export const PLAYER_PORTRAIT_FRAME = 0;
export const PLAYER_PORTRAIT_TEXTURE_KEY = 'art-v2-protagonist-portrait';
const PLAYER_TEXTURE_PATH = 'assets/art-v2/characters/protagonist-v3-sheet.png';
const PLAYER_WALK_TEXTURE_KEY = 'art-v6-protagonist-walk';
const PLAYER_CARRY_WALK_TEXTURE_KEY = 'art-v6-protagonist-carry-walk';
const PLAYER_WALK_TEXTURE_PATH = 'assets/art-v2/characters/protagonist-v6-walk-sheet.png';
const PLAYER_CARRY_WALK_TEXTURE_PATH = 'assets/art-v2/characters/protagonist-v6-carry-walk-sheet.png';
const PLAYER_PORTRAIT_TEXTURE_PATH = 'assets/art-v2/portraits/protagonist-v3-dialogue-portrait.png';
const PLAYER_SHADOW_KEY = 'art-v2-character-ground-shadow';
const PLAYER_SHADOW_PATH = 'assets/art-v2/effects/character-ground-shadow-v2.png';
const PLAYER_FRAME_SIZE = 128;
const SHEET_COLUMNS = 4;

type PlayerAction = 'pickup' | 'place' | 'light-candle';
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

const CARDINAL_ROW: Record<CardinalPose, number> = {
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
  setMovement(
    moving: boolean,
    time: number,
    locomotion?: PlayerLocomotion,
    speedRatio?: number,
  ): void;
  setCarrying(carrying: boolean): void;
  playAction(action: PlayerAction): void;
  setEnvironmentGrade(grade: ArtSceneGrade): void;
  getAnimationState(): PlayerVisualState;
}

export function preloadPlayerAvatarAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PLAYER_TEXTURE_KEY)) {
    scene.load.spritesheet(PLAYER_TEXTURE_KEY, PLAYER_TEXTURE_PATH, {
      frameWidth: PLAYER_FRAME_SIZE,
      frameHeight: PLAYER_FRAME_SIZE,
    });
  }
  if (!scene.textures.exists(PLAYER_WALK_TEXTURE_KEY)) {
    scene.load.spritesheet(PLAYER_WALK_TEXTURE_KEY, PLAYER_WALK_TEXTURE_PATH, {
      frameWidth: PLAYER_FRAME_SIZE,
      frameHeight: PLAYER_FRAME_SIZE,
    });
  }
  if (!scene.textures.exists(PLAYER_CARRY_WALK_TEXTURE_KEY)) {
    scene.load.spritesheet(PLAYER_CARRY_WALK_TEXTURE_KEY, PLAYER_CARRY_WALK_TEXTURE_PATH, {
      frameWidth: PLAYER_FRAME_SIZE,
      frameHeight: PLAYER_FRAME_SIZE,
    });
  }
  if (!scene.textures.exists(PLAYER_SHADOW_KEY)) {
    scene.load.image(PLAYER_SHADOW_KEY, PLAYER_SHADOW_PATH);
  }
  if (!scene.textures.exists(PLAYER_PORTRAIT_TEXTURE_KEY)) {
    scene.load.image(PLAYER_PORTRAIT_TEXTURE_KEY, PLAYER_PORTRAIT_TEXTURE_PATH);
  }
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
  scene.textures.get(PLAYER_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.textures.get(PLAYER_WALK_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.textures.get(PLAYER_CARRY_WALK_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);

  const shadow = scene.add
    .image(0, 2, PLAYER_SHADOW_KEY)
    .setOrigin(0.5)
    .setAlpha(ART_TOKENS.lighting.shadowAlpha);
  const sprite = scene.add
    .sprite(0, 0, PLAYER_TEXTURE_KEY, idleFrameFor('north', false))
    .setOrigin(0.5, ART_TOKENS.character.footAnchorY / PLAYER_FRAME_SIZE)
    .setScale(1)
    .setTint(APPEARANCE_TINTS[appearance.id]);
  const container = scene.add.container(0, 0, [shadow, sprite]);
  const initialGrade: ArtSceneGrade = scene.scene.key.includes('Shop') ? 'shop' : 'tomb';
  sprite.setTint(tintForScene(initialGrade));

  let facing: PlayerDirection = 'north';
  let moving = false;
  let carrying = false;
  let locomotion: PlayerLocomotion = 'forward';
  let actionActive = false;

  const applyState = (): void => {
    if (moving) {
      sprite.play(animationKey(facing, carrying, locomotion), true);
      return;
    }
    sprite.stop();
    sprite.setTexture(PLAYER_TEXTURE_KEY, idleFrameFor(facing, carrying));
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
      _time: number,
      nextLocomotion: PlayerLocomotion = locomotion,
      speedRatio = 1,
    ): void {
      if (moving !== isMoving || locomotion !== nextLocomotion) {
        moving = isMoving;
        locomotion = nextLocomotion;
        applyState();
      }
      if (actionActive) return;

      sprite.anims.timeScale = Phaser.Math.Linear(
        0.78,
        1.18,
        Phaser.Math.Clamp(speedRatio, 0, 1),
      );
      sprite.y = 0;
      sprite.rotation = 0;
      sprite.setScale(1);
    },
    setCarrying(isCarrying: boolean): void {
      if (carrying === isCarrying) return;
      carrying = isCarrying;
      applyState();
    },
    playAction(action: PlayerAction): void {
      actionActive = true;
      scene.tweens.killTweensOf(sprite);
      const duration = action === 'light-candle'
        ? 620
        : action === 'pickup'
          ? TOMB_FEEL.player.pickupFeedbackMs
          : TOMB_FEEL.player.placeFeedbackMs;
      const targetY = action === 'light-candle' ? 5 : action === 'pickup' ? -3 : 2;
      scene.tweens.add({
        targets: sprite,
        y: targetY,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: duration / 2,
        yoyo: true,
        ease: 'Sine.InOut',
        onUpdate: () => sprite.setY(Math.round(sprite.y)),
        onComplete: () => {
          actionActive = false;
          sprite.setAlpha(1).setRotation(0).setScale(1).setY(0);
          applyState();
        },
      });
    },
    setEnvironmentGrade(grade: ArtSceneGrade): void {
      sprite.setTint(tintForScene(grade));
      shadow.setTint(ART_TOKENS.lighting.shadowColor);
      shadow.setAlpha(grade === 'cellar' ? 0.58 : ART_TOKENS.lighting.shadowAlpha);
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

function idleFrameFor(
  direction: PlayerDirection,
  carrying: boolean,
): number {
  const row = carrying ? 2 : 0;
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
        const row = CARDINAL_ROW[DIRECTION_POSE[direction]];
        const textureKey = carrying
          ? PLAYER_CARRY_WALK_TEXTURE_KEY
          : PLAYER_WALK_TEXTURE_KEY;
        const frames = [0, 1, 2, 3].map((column) => row * SHEET_COLUMNS + column);
        const frameSequence = locomotion === 'forward' ? frames : [...frames].reverse();
        scene.anims.create({
          key,
          frames: frameSequence.map((frame) => ({
            key: textureKey,
            frame,
          })),
          frameRate: TOMB_FEEL.player.animationFrameRate,
          repeat: -1,
        });
      }
    }
  }
}
