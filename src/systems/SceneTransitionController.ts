import Phaser from 'phaser';
import { InputActionManager } from '../input/InputActionManager';
import { setTypographyRole } from '../ui/gameTypography';

type TransitionOptions = {
  durationMs?: number;
  label?: string;
  color?: number;
};

type TransitionRecord = {
  from: string;
  to: string;
  startedAt: number;
  acceptedAt: number;
  readyAt?: number;
  elapsedMs?: number;
};

const TRANSITION_REGISTRY_KEY = '__interactionTransitionRecord';

export class SceneTransitionController {
  private busy = false;
  private overlay?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: InputActionManager = InputActionManager.forScene(scene),
  ) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  isBusy(): boolean { return this.busy; }

  start(target: string, data?: object, options: TransitionOptions = {}): boolean {
    if (this.busy) return false;
    this.busy = true;
    this.input.setContext('transition');
    const duration = Phaser.Math.Clamp(options.durationMs ?? 280, 200, 350);
    const record: TransitionRecord = {
      from: this.scene.scene.key,
      to: target,
      acceptedAt: performance.now(),
      startedAt: performance.now(),
    };
    this.scene.registry.set(TRANSITION_REGISTRY_KEY, record);
    this.overlay = this.createOverlay(options.label ?? '拓片显影 · 正在换景', options.color ?? 0x090806);
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration,
      ease: 'Sine.InOut',
      onComplete: () => this.scene.scene.start(target, data),
    });
    return true;
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.overlay = undefined;
  }

  private createOverlay(label: string, color: number): Phaser.GameObjects.Container {
    const { width, height } = this.scene.scale;
    const backdrop = this.scene.add.rectangle(0, 0, width, height, color, 0.98).setOrigin(0);
    const rubbing = this.scene.add.graphics();
    rubbing.lineStyle(1, 0x8b6b43, 0.32);
    for (let index = 0; index < 9; index += 1) {
      rubbing.lineBetween(width / 2 - 230, height / 2 - 72 + index * 17, width / 2 + 230, height / 2 - 68 + index * 17);
    }
    const stamp = this.scene.add.text(width / 2, height / 2 - 28, '印', {
      fontFamily: 'Georgia, "Noto Serif SC", serif', fontSize: '38px', color: '#a74635',
      stroke: '#4d1712', strokeThickness: 2,
    }).setOrigin(0.5).setAngle(-5);
    const text = this.scene.add.text(width / 2, height / 2 + 55, label, {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontSize: '15px', color: '#d8c5a4', letterSpacing: 2,
    }).setOrigin(0.5);
    setTypographyRole(text, 'hint-light');
    const container = this.scene.add.container(0, 0, [backdrop, rubbing, stamp, text]).setScrollFactor(0).setDepth(10000);
    this.scene.tweens.add({ targets: stamp, scale: 1.04, alpha: 0.72, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return container;
  }
}

export function installSceneLoadingOverlay(scene: Phaser.Scene): void {
  let complete = false;
  let visible = false;
  const { width, height } = scene.scale;
  const backdrop = scene.add.rectangle(0, 0, width, height, 0x090806, 1).setOrigin(0).setDepth(10001).setVisible(false);
  const status = scene.add.text(width / 2, height / 2, '拓片显影 · 载入资源', {
    fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontSize: '15px', color: '#d8c5a4', letterSpacing: 2,
  }).setOrigin(0.5).setDepth(10002).setVisible(false);
  setTypographyRole(status, 'hint-light');
  const timer = window.setTimeout(() => {
    if (complete) return;
    visible = true;
    backdrop.setVisible(true);
    status.setVisible(true);
  }, 200);
  const onProgress = (progress: number): void => {
    if (visible) status.setText(`拓片显影 · 载入资源 ${Math.round(progress * 100)}%`);
  };
  scene.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    complete = true;
    window.clearTimeout(timer);
    scene.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
    backdrop.destroy();
    status.destroy();
  });
}

export function markSceneInteractive(scene: Phaser.Scene): void {
  const record = scene.registry.get(TRANSITION_REGISTRY_KEY) as TransitionRecord | undefined;
  if (!record || record.to !== scene.scene.key || record.readyAt) return;
  record.readyAt = performance.now();
  record.elapsedMs = record.readyAt - record.acceptedAt;
  scene.registry.set(TRANSITION_REGISTRY_KEY, record);
}

export function getLastTransitionRecord(scene: Phaser.Scene): TransitionRecord | undefined {
  return scene.registry.get(TRANSITION_REGISTRY_KEY) as TransitionRecord | undefined;
}
