import Phaser from 'phaser';
import type { Player } from '../objects/Player';
import { InputActionManager } from '../input/InputActionManager';
import { getLastTransitionRecord } from './SceneTransitionController';

type DebugSources = {
  player?: () => Player | undefined;
  target?: () => string;
  dragging?: () => string;
};

/** Development-only F8 diagnostics. Production builds create no display objects. */
export class InteractionDebugOverlay {
  private visible = false;
  private text?: Phaser.GameObjects.Text;
  private graphics?: Phaser.GameObjects.Graphics;
  private lastUpdateAt = 0;
  private readonly input: InputActionManager;

  constructor(private readonly scene: Phaser.Scene, private readonly sources: DebugSources = {}) {
    this.input = InputActionManager.forScene(scene);
    if (!import.meta.env.DEV) return;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(20000).setVisible(false);
    this.text = scene.add.text(12, 12, '', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#d7e7d2',
      backgroundColor: 'rgba(0,0,0,0.82)', padding: { x: 8, y: 7 },
    }).setScrollFactor(0).setDepth(20001).setVisible(false);
  }

  update(time: number): void {
    if (!import.meta.env.DEV) return;
    if (this.input.consume('debug-toggle', { cooldownMs: 200 })) {
      this.visible = !this.visible;
      this.text?.setVisible(this.visible);
      this.graphics?.setVisible(this.visible);
    }
    if (!this.visible || time - this.lastUpdateAt < 100) return;
    this.lastUpdateAt = time;
    const player = this.sources.player?.();
    const velocity = player?.getMovementVelocity();
    const input = this.input.getDebugSnapshot();
    const transition = getLastTransitionRecord(this.scene);
    this.text?.setText([
      `FPS ${Math.round(this.scene.game.loop.actualFps)}  Scene ${this.scene.scene.key}`,
      `velocity ${velocity ? `${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)} | ${velocity.length().toFixed(1)}` : '-'}`,
      `input ${input.held.join('+') || '-'}  buffer ${input.buffered}  context ${input.context}`,
      `target ${this.sources.target?.() || '-'}  drag ${this.sources.dragging?.() || '-'}`,
      `listeners keyboard ${input.keyboardListeners} pointer ${input.pointerListeners}`,
      `camera deadzone ${this.scene.cameras.main.deadzone?.width ?? 0}×${this.scene.cameras.main.deadzone?.height ?? 0}`,
      `transition ${transition ? `${transition.from} → ${transition.to} ${Math.round(transition.elapsedMs ?? 0)}ms` : '-'}`,
    ]);
    this.graphics?.clear();
    const body = player?.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      const camera = this.scene.cameras.main;
      const x = (body.x - camera.scrollX) * camera.zoom;
      const y = (body.y - camera.scrollY) * camera.zoom;
      this.graphics?.lineStyle(1, 0x62ef8f, 0.9).strokeRect(x, y, body.width * camera.zoom, body.height * camera.zoom);
    }
    const dz = this.scene.cameras.main.deadzone;
    if (dz) {
      this.graphics?.lineStyle(1, 0xf1cf62, 0.55).strokeRect(
        (this.scene.scale.width - dz.width) / 2,
        (this.scene.scale.height - dz.height) / 2,
        dz.width,
        dz.height,
      );
    }
  }
}
