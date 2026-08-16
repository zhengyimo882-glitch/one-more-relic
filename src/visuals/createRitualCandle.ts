import Phaser from 'phaser';
import type { TombPointLight } from '../types/TombLighting';

export const RITUAL_CANDLE_TEXTURES = {
  unlit: 'ritual-candle-unlit',
  litA: 'ritual-candle-lit-a',
  litB: 'ritual-candle-lit-b',
  litC: 'ritual-candle-lit-c',
} as const;

export interface RitualCandleVisual {
  container: Phaser.GameObjects.Container;
  isLit(): boolean;
  setNearby(nearby: boolean): void;
  ignite(): void;
  update(time: number): void;
  getLightSource(): TombPointLight | null;
  destroy(): void;
}

export function createRitualCandle(
  scene: Phaser.Scene,
  x: number,
  y: number,
): RitualCandleVisual {
  // The interaction rune remains a quiet navigation aid; the candle itself is
  // original painted pixel art rather than runtime geometric primitives.
  const floorRune = scene.add.graphics();
  floorRune.lineStyle(1, 0x8b6538, 0.5);
  floorRune.strokeCircle(0, 7, 24);
  floorRune.strokeCircle(0, 7, 18);
  floorRune.lineBetween(-20, 7, 20, 7);
  floorRune.lineBetween(0, -13, 0, 27);

  const candle = scene.add
    .image(0, -31, RITUAL_CANDLE_TEXTURES.unlit)
    .setDisplaySize(56, 56)
    .setY(-24);
  const baseScaleX = candle.scaleX;
  const baseScaleY = candle.scaleY;
  const sparks = scene.add.graphics().setPosition(0, -48).setAlpha(0);
  sparks.fillStyle(0xffd078, 1);
  sparks.fillCircle(-8, -2, 2);
  sparks.fillCircle(7, -6, 1.5);
  sparks.fillCircle(2, -13, 1.3);

  const container = scene.add
    .container(x, y, [floorRune, candle, sparks])
    .setDepth(2 + y / 1000);

  let lit = false;
  let ignitionLevel = 0;
  let nearby = false;
  let activeLitFrame = -1;
  const litFrames = [
    RITUAL_CANDLE_TEXTURES.litA,
    RITUAL_CANDLE_TEXTURES.litB,
    RITUAL_CANDLE_TEXTURES.litC,
  ];

  const setNearby = (isNearby: boolean): void => {
    nearby = isNearby;
    floorRune.setAlpha(lit ? 0.32 : nearby ? 1 : 0.55);
    candle.setAlpha(nearby && !lit ? 1 : 0.94);
  };

  const ignite = (): void => {
    if (lit) return;
    lit = true;
    activeLitFrame = 0;
    candle
      .setTexture(litFrames[0])
      .setAlpha(0.35)
      .setScale(baseScaleX * 0.9, baseScaleY * 0.9);
    sparks.setAlpha(1).setScale(0.3);
    scene.tweens.add({
      targets: sparks,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      y: -14,
      duration: 420,
      ease: 'Cubic.Out',
    });
    scene.tweens.add({
      targets: candle,
      alpha: 1,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      duration: 360,
      ease: 'Back.Out',
      onUpdate: (tween) => {
        ignitionLevel = tween.progress;
      },
      onComplete: () => {
        ignitionLevel = 1;
      },
    });
    scene.tweens.add({
      targets: floorRune,
      alpha: { from: 1, to: 0.32 },
      scaleX: { from: 1.24, to: 1 },
      scaleY: { from: 1.24, to: 1 },
      duration: 520,
      ease: 'Sine.Out',
    });
  };

  setNearby(false);
  return {
    container,
    isLit: () => lit,
    setNearby,
    ignite,
    update(time: number): void {
      if (lit) {
        const frame = Math.floor((time + x * 0.37) / 118) % litFrames.length;
        if (frame !== activeLitFrame) {
          activeLitFrame = frame;
          candle.setTexture(litFrames[frame]);
        }
      } else {
        const pulse = nearby ? 0.72 + Math.sin(time / 230) * 0.2 : 0.55;
        floorRune.setAlpha(pulse);
      }
    },
    getLightSource(): TombPointLight | null {
      if (!lit || ignitionLevel <= 0.01) return null;
      const pulse = 0.94 + Math.sin(scene.time.now / 127 + x * 0.01) * 0.06;
      return {
        x,
        y: y - 54,
        radius: 158,
        intensity: ignitionLevel * pulse * 0.78,
        color: 0xffb35a,
      };
    },
    destroy(): void {
      scene.tweens.killTweensOf([floorRune, candle, sparks]);
      container.destroy(true);
    },
  };
}
