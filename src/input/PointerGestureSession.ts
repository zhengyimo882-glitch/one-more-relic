import Phaser from 'phaser';

export type PointerGestureEndReason =
  | 'pointer-up'
  | 'pointer-cancel'
  | 'game-out'
  | 'window-blur'
  | 'hidden'
  | 'shutdown'
  | 'replaced';

export class PointerGestureSession {
  private activePointerId: number | null = null;
  private capturedDomPointerId: number | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onEnd: (reason: PointerGestureEndReason) => void,
  ) {
    scene.input.on('gameout', this.onGameOut);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    window.addEventListener('pointerup', this.onWindowPointerUp, true);
    window.addEventListener('pointercancel', this.onWindowPointerCancel, true);
    window.addEventListener('blur', this.onWindowBlur, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange, true);
  }

  begin(pointer: Phaser.Input.Pointer): boolean {
    if (this.destroyed || pointer.button !== 0) return false;
    if (this.activePointerId !== null) this.finish('replaced');
    this.activePointerId = pointer.id;
    const domEvent = pointer.event as PointerEvent | undefined;
    if (domEvent && Number.isFinite(domEvent.pointerId)) {
      try {
        this.scene.game.canvas.setPointerCapture(domEvent.pointerId);
        this.capturedDomPointerId = domEvent.pointerId;
      } catch {
        this.capturedDomPointerId = null;
      }
    }
    return true;
  }

  isActive(pointer?: Phaser.Input.Pointer): boolean {
    return this.activePointerId !== null && (!pointer || pointer.id === this.activePointerId);
  }

  finish(reason: PointerGestureEndReason = 'pointer-up'): boolean {
    if (this.activePointerId === null) return false;
    this.activePointerId = null;
    if (this.capturedDomPointerId !== null) {
      try {
        if (this.scene.game.canvas.hasPointerCapture(this.capturedDomPointerId)) {
          this.scene.game.canvas.releasePointerCapture(this.capturedDomPointerId);
        }
      } catch {
        // The browser can release capture before Phaser receives pointerup.
      }
      this.capturedDomPointerId = null;
    }
    this.onEnd(reason);
    return true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.finish('shutdown');
    this.destroyed = true;
    this.scene.input.off('gameout', this.onGameOut);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    window.removeEventListener('pointerup', this.onWindowPointerUp, true);
    window.removeEventListener('pointercancel', this.onWindowPointerCancel, true);
    window.removeEventListener('blur', this.onWindowBlur, true);
    document.removeEventListener('visibilitychange', this.onVisibilityChange, true);
  }

  private readonly onGameOut = (): void => { this.finish('game-out'); };
  private readonly onBlur = (): void => { this.finish('window-blur'); };
  private readonly onWindowBlur = (): void => { this.finish('window-blur'); };
  private readonly onWindowPointerUp = (): void => { this.finish('pointer-up'); };
  private readonly onWindowPointerCancel = (): void => { this.finish('pointer-cancel'); };
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') this.finish('hidden');
  };
}
