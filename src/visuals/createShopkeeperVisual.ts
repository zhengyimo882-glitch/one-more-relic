import Phaser from 'phaser';
import { ART_TOKENS, tintForScene } from '../config/artTokens';

export type ShopkeeperGesture = 'idle' | 'raise-hand' | 'wave' | 'nod';

export const SHOPKEEPER_TEXTURE_KEY = 'generated-antique-shopkeeper';
export const SHOPKEEPER_PORTRAIT_TEXTURE_KEY = 'art-v2-shopkeeper-portrait';
const SHOPKEEPER_TEXTURE_PATH =
  'assets/art-v2/characters/shopkeeper-v3-sheet.png';
const SHOPKEEPER_SHADOW_KEY = 'art-v2-character-ground-shadow';
const SHOPKEEPER_SHADOW_PATH = 'assets/art-v2/effects/character-ground-shadow-v2.png';
const SHOPKEEPER_PORTRAIT_TEXTURE_PATH = 'assets/art-v2/portraits/shopkeeper-v3-dialogue-portrait.png';
const SHOPKEEPER_FRAME_SIZE = 128;

const GESTURE_ROW: Record<ShopkeeperGesture, number> = {
  idle: 0,
  'raise-hand': 1,
  wave: 2,
  nod: 3,
};

export interface ShopkeeperVisual {
  container: Phaser.GameObjects.Container;
  playGesture(gesture: ShopkeeperGesture): void;
  setFacing(direction: -1 | 1): void;
  reset(): void;
}

export function preloadShopkeeperAssets(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHOPKEEPER_TEXTURE_KEY)) {
    return;
  }
  scene.load.spritesheet(SHOPKEEPER_TEXTURE_KEY, SHOPKEEPER_TEXTURE_PATH, {
    frameWidth: SHOPKEEPER_FRAME_SIZE,
    frameHeight: SHOPKEEPER_FRAME_SIZE,
  });
  if (!scene.textures.exists(SHOPKEEPER_SHADOW_KEY)) {
    scene.load.image(SHOPKEEPER_SHADOW_KEY, SHOPKEEPER_SHADOW_PATH);
  }
  if (!scene.textures.exists(SHOPKEEPER_PORTRAIT_TEXTURE_KEY)) {
    scene.load.image(SHOPKEEPER_PORTRAIT_TEXTURE_KEY, SHOPKEEPER_PORTRAIT_TEXTURE_PATH);
  }
}

export function createShopkeeperVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
): ShopkeeperVisual {
  registerAnimations(scene);
  scene.textures
    .get(SHOPKEEPER_TEXTURE_KEY)
    .setFilter(Phaser.Textures.FilterMode.NEAREST);

  const shadow = scene.add
    .image(0, 2, SHOPKEEPER_SHADOW_KEY)
    .setOrigin(0.5)
    .setTint(ART_TOKENS.lighting.shadowColor)
    .setAlpha(ART_TOKENS.lighting.shadowAlpha);
  const sprite = scene.add
    .sprite(0, 0, SHOPKEEPER_TEXTURE_KEY, 0)
    .setOrigin(0.5, ART_TOKENS.character.footAnchorY / SHOPKEEPER_FRAME_SIZE)
    .setScale(1)
    .setTint(tintForScene('shop'));
  const container = scene.add.container(x, y, [shadow, sprite]);
  let gestureTimer: Phaser.Time.TimerEvent | undefined;

  const playIdle = (): void => {
    sprite.stop().setFrame(shopkeeperFrameForGesture('idle'));
  };
  playIdle();

  container.once(Phaser.GameObjects.Events.DESTROY, () => {
    gestureTimer?.remove(false);
  });

  return {
    container,
    playGesture(gesture: ShopkeeperGesture): void {
      gestureTimer?.remove(false);
      if (gesture === 'idle') {
        playIdle();
        return;
      }
      sprite.stop().setFrame(shopkeeperFrameForGesture(gesture));
      gestureTimer = scene.time.delayedCall(760, playIdle);
    },
    setFacing(direction: -1 | 1): void {
      void direction;
      container.setScale(1, 1);
    },
    reset(): void {
      gestureTimer?.remove(false);
      container.setScale(1, 1);
      playIdle();
    },
  };
}

export function shopkeeperFrameForGesture(gesture: ShopkeeperGesture): number {
  return GESTURE_ROW[gesture] * 4;
}

export function inferShopkeeperGesture(text: string): ShopkeeperGesture {
  const normalized = text.toLowerCase();
  if (
    normalized.includes('do not') ||
    normalized.includes("don't") ||
    normalized.includes(' no.') ||
    normalized.includes('not ready') ||
    normalized.includes('leave it')
  ) {
    return 'wave';
  }
  if (
    normalized.includes('one rule') ||
    normalized.includes('follow') ||
    normalized.includes('bring') ||
    normalized.includes('remember') ||
    normalized.includes('where') ||
    normalized.includes('close the door')
  ) {
    return 'raise-hand';
  }
  return 'nod';
}

function animationKey(gesture: ShopkeeperGesture): string {
  return `generated-shopkeeper-${gesture}`;
}

function registerAnimations(scene: Phaser.Scene): void {
  for (const gesture of Object.keys(GESTURE_ROW) as ShopkeeperGesture[]) {
    const key = animationKey(gesture);
    if (scene.anims.exists(key)) {
      continue;
    }
    const row = GESTURE_ROW[gesture];
    scene.anims.create({
      key,
      frames: [0, 1, 2, 3].map((column) => ({
        key: SHOPKEEPER_TEXTURE_KEY,
        frame: row * 4 + column,
      })),
      frameRate: gesture === 'idle' ? 2.4 : 5.4,
      repeat: -1,
      yoyo: gesture !== 'idle',
    });
  }
}
