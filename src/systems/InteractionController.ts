import Phaser from 'phaser';

export type InteractionCandidate<T> = {
  readonly id: string;
  readonly value: T;
  /** Lower is better. Include distance, facing and design priority here. */
  readonly score: number;
};

export type InteractionControllerOptions = {
  stickMs?: number;
  switchAdvantage?: number;
  rejectCooldownMs?: number;
};

/** Stable world-target selection and immediate accept/reject feedback. */
export class InteractionController<T> {
  private selected?: InteractionCandidate<T>;
  private selectedAt = 0;
  private lastRejectAt = -Infinity;
  private readonly stickMs: number;
  private readonly switchAdvantage: number;
  private readonly rejectCooldownMs: number;

  constructor(
    private readonly scene: Phaser.Scene,
    options: InteractionControllerOptions = {},
  ) {
    this.stickMs = options.stickMs ?? 250;
    this.switchAdvantage = options.switchAdvantage ?? 16;
    this.rejectCooldownMs = options.rejectCooldownMs ?? 500;
  }

  select(candidates: readonly InteractionCandidate<T>[], now = this.scene.time.now): T | undefined {
    if (candidates.length === 0) {
      this.selected = undefined;
      return undefined;
    }
    let best = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      if (candidates[index].score < best.score) best = candidates[index];
    }
    const current = this.selected
      ? candidates.find((candidate) => candidate.id === this.selected?.id)
      : undefined;
    if (current) {
      const sticky = now - this.selectedAt < this.stickMs;
      const meaningfullyBetter = best.score + this.switchAdvantage < current.score;
      if (sticky || !meaningfullyBetter) best = current;
    }
    if (best.id !== this.selected?.id) this.selectedAt = now;
    this.selected = best;
    return best.value;
  }

  clear(): void { this.selected = undefined; }

  acknowledge(display: Phaser.GameObjects.GameObject): void {
    const target = display as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
    this.scene.tweens.killTweensOf(display);
    this.scene.tweens.add({
      targets: display,
      scaleX: target.scaleX * 0.975,
      scaleY: target.scaleY * 0.975,
      duration: 55,
      yoyo: true,
      ease: 'Sine.Out',
    });
  }

  rejectAt(x: number, y: number, message = '再靠近些'): void {
    const now = this.scene.time.now;
    if (now - this.lastRejectAt < this.rejectCooldownMs) return;
    this.lastRejectAt = now;
    const text = this.scene.add.text(x, y, message, {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: '14px', color: '#d7c29e',
      backgroundColor: 'rgba(17,14,11,0.88)',
      padding: { x: 9, y: 5 },
    }).setOrigin(0.5).setDepth(9000);
    text.setShadow(0, 2, '#000000', 3, true, true);
    this.scene.tweens.add({
      targets: text,
      y: y - 12,
      alpha: 0,
      duration: 650,
      ease: 'Sine.Out',
      onComplete: () => text.destroy(),
    });
  }
}
