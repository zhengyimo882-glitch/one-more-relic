import Phaser from 'phaser';

export const CEREMONIAL_GATE_TEXTURES = {
  closed: 'original-tomb-gate-closed',
  open: 'original-tomb-gate-open',
  ghostFire: 'original-tomb-gate-ghost-fire',
} as const;

export type CeremonialGateState =
  | 'closed'
  | 'opening'
  | 'open'
  | 'closing';

export interface CeremonialTombGate {
  container: Phaser.GameObjects.Container;
  getState(): CeremonialGateState;
  open(duration?: number, onComplete?: () => void): void;
  close(duration?: number, onComplete?: () => void): void;
  setGhostFireLit(lit: boolean): void;
  isGhostFireLit(): boolean;
  update(time: number): void;
  destroy(): void;
}

type GhostFireSprite = {
  flame: Phaser.GameObjects.Image;
  emissive: Phaser.GameObjects.Image;
  phase: number;
  mirror: number;
  baseScaleX: number;
  baseScaleY: number;
};

const GATE_DISPLAY_WIDTH = 440;
const GATE_ORIGIN_Y = 0.70;
const GATE_ART_OFFSET_Y = 120;
const FIRE_DISPLAY_HEIGHT = 96;

export function createCeremonialTombGate(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
): CeremonialTombGate {
  const closedGate = scene.add
    .image(0, GATE_ART_OFFSET_Y, CEREMONIAL_GATE_TEXTURES.closed)
    .setOrigin(0.5, GATE_ORIGIN_Y)
    .setDisplaySize(GATE_DISPLAY_WIDTH, GATE_DISPLAY_WIDTH * (808 / 960));
  const openGate = scene.add
    .image(0, GATE_ART_OFFSET_Y, CEREMONIAL_GATE_TEXTURES.open)
    .setOrigin(0.5, GATE_ORIGIN_Y)
    .setDisplaySize(GATE_DISPLAY_WIDTH, GATE_DISPLAY_WIDTH * (808 / 960))
    .setAlpha(0);

  // The artwork itself is a bespoke raster asset. The container remains the
  // stable world anchor used by the existing collision and reveal sequence.
  const container = scene.add
    .container(worldX, worldY, [closedGate, openGate])
    .setDepth(7.03);

  const leftFire = createGhostFire(scene, worldX - 126, worldY + 73, 0.35, -1);
  const rightFire = createGhostFire(scene, worldX + 126, worldY + 73, 1.9, 1);
  const fireLayer = scene.add
    .container(0, 0, [
      leftFire.emissive,
      rightFire.emissive,
      leftFire.flame,
      rightFire.flame,
    ])
    .setDepth(7.14);

  let state: CeremonialGateState = 'closed';
  let gateTweens: Phaser.Tweens.Tween[] = [];
  let fireTween: Phaser.Tweens.Tween | undefined;
  const fireLevel = { value: 0 };
  let requestedFireLit = false;

  const stopGateTweens = (): void => {
    gateTweens.forEach((tween) => tween.stop());
    gateTweens = [];
  };

  const finishTransition = (
    nextState: CeremonialGateState,
    onComplete?: () => void,
  ): void => {
    state = nextState;
    closedGate.setAlpha(nextState === 'closed' ? 1 : 0);
    openGate.setAlpha(nextState === 'open' ? 1 : 0);
    gateTweens = [];
    onComplete?.();
  };

  const open = (duration = 430, onComplete?: () => void): void => {
    if (state === 'open') {
      onComplete?.();
      return;
    }
    stopGateTweens();
    state = 'opening';
    openGate.setVisible(true);
    gateTweens = [
      scene.tweens.add({
        targets: closedGate,
        alpha: 0,
        duration,
        ease: 'Cubic.InOut',
      }),
      scene.tweens.add({
        targets: openGate,
        alpha: 1,
        duration,
        ease: 'Cubic.InOut',
        onComplete: () => finishTransition('open', onComplete),
      }),
    ];
  };

  const close = (duration = 360, onComplete?: () => void): void => {
    if (state === 'closed') {
      onComplete?.();
      return;
    }
    stopGateTweens();
    state = 'closing';
    closedGate.setVisible(true);
    gateTweens = [
      scene.tweens.add({
        targets: openGate,
        alpha: 0,
        duration,
        ease: 'Cubic.InOut',
      }),
      scene.tweens.add({
        targets: closedGate,
        alpha: 1,
        duration,
        ease: 'Cubic.InOut',
        onComplete: () => finishTransition('closed', onComplete),
      }),
    ];
  };

  const setGhostFireLit = (lit: boolean): void => {
    if (requestedFireLit === lit) {
      return;
    }
    requestedFireLit = lit;
    fireTween?.stop();
    fireTween = scene.tweens.add({
      targets: fireLevel,
      value: lit ? 1 : 0,
      duration: lit ? 105 : 125,
      ease: lit ? 'Back.Out' : 'Quad.In',
    });
  };

  const update = (time: number): void => {
    updateGhostFire(leftFire, time, fireLevel.value);
    updateGhostFire(rightFire, time, fireLevel.value);
  };

  const destroy = (): void => {
    stopGateTweens();
    fireTween?.stop();
    container.destroy(true);
    fireLayer.destroy(true);
  };

  update(0);
  return {
    container,
    getState: () => state,
    open,
    close,
    setGhostFireLit,
    isGhostFireLit: () => requestedFireLit,
    update,
    destroy,
  };
}

function createGhostFire(
  scene: Phaser.Scene,
  x: number,
  y: number,
  phase: number,
  mirror: number,
): GhostFireSprite {
  const flame = scene.add
    .image(x, y, CEREMONIAL_GATE_TEXTURES.ghostFire)
    .setOrigin(0.5, 0.93)
    .setDisplaySize(FIRE_DISPLAY_HEIGHT * (220 / 485), FIRE_DISPLAY_HEIGHT)
    .setAlpha(0);
  const emissive = scene.add
    .image(x, y - 2, CEREMONIAL_GATE_TEXTURES.ghostFire)
    .setOrigin(0.5, 0.93)
    .setDisplaySize(FIRE_DISPLAY_HEIGHT * (220 / 485), FIRE_DISPLAY_HEIGHT)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0x74d8ff)
    .setAlpha(0);
  return {
    flame,
    emissive,
    phase,
    mirror,
    baseScaleX: flame.scaleX,
    baseScaleY: flame.scaleY,
  };
}

function updateGhostFire(
  fire: GhostFireSprite,
  time: number,
  level: number,
): void {
  const intensity = Phaser.Math.Clamp(level, 0, 1);
  const wave = Math.sin(time / 74 + fire.phase);
  const flutter = Math.sin(time / 41 + fire.phase * 2.1);
  const scaleX = 1 + wave * 0.045 * fire.mirror;
  const scaleY = 0.93 + intensity * 0.07 + flutter * 0.035;

  fire.flame
    .setAlpha(intensity * (0.88 + wave * 0.06))
    .setScale(fire.baseScaleX * scaleX, fire.baseScaleY * scaleY)
    .setAngle(wave * 1.8 * fire.mirror);
  fire.emissive
    .setAlpha(intensity * (0.12 + (wave + 1) * 0.035))
    .setScale(
      fire.baseScaleX * scaleX * 1.12,
      fire.baseScaleY * scaleY * 1.08,
    )
    .setAngle(wave * 2.2 * fire.mirror);
}
