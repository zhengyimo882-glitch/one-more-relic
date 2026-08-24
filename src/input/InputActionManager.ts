import Phaser from 'phaser';

export type InputAction =
  | 'confirm'
  | 'cancel'
  | 'inventory'
  | 'lamp'
  | 'skip'
  | 'nav-up'
  | 'nav-down'
  | 'nav-left'
  | 'nav-right'
  | 'slot-1'
  | 'slot-2'
  | 'debug-toggle';

type BufferedInput = {
  readonly code: string;
  readonly actions: readonly InputAction[];
  readonly at: number;
  readonly sequence: number;
};

const ACTIONS_BY_CODE: Readonly<Record<string, readonly InputAction[]>> = {
  KeyE: ['confirm'],
  Enter: ['confirm'],
  NumpadEnter: ['confirm'],
  Space: ['confirm'],
  Escape: ['cancel'],
  Tab: ['inventory'],
  KeyF: ['lamp'],
  KeyS: ['skip', 'nav-down'],
  KeyW: ['nav-up'],
  KeyA: ['nav-left'],
  KeyD: ['nav-right'],
  ArrowUp: ['nav-up'],
  ArrowDown: ['nav-down'],
  ArrowLeft: ['nav-left'],
  ArrowRight: ['nav-right'],
  Digit1: ['slot-1'],
  Digit2: ['slot-2'],
  F8: ['debug-toggle'],
};

const PREVENT_DEFAULT_CODES = new Set([
  'Space',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export const DEFAULT_INPUT_BUFFER_MS = 130;
export const DEFAULT_INPUT_COOLDOWN_MS = 145;

export class InputActionManager extends Phaser.Events.EventEmitter {
  private static readonly instances = new WeakMap<Phaser.Scene, InputActionManager>();

  static forScene(scene: Phaser.Scene): InputActionManager {
    const existing = this.instances.get(scene);
    if (existing && !existing.destroyed) return existing;
    const manager = new InputActionManager(scene);
    this.instances.set(scene, manager);
    return manager;
  }

  private readonly heldCodes = new Set<string>();
  private readonly blockedUntilRelease = new Set<string>();
  private readonly queue: BufferedInput[] = [];
  private readonly lastConsumedAt = new Map<InputAction, number>();
  private sequence = 0;
  private context = 'world';
  private destroyed = false;

  private constructor(private readonly scene: Phaser.Scene) {
    super();
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required.');
    keyboard.on('keydown', this.onKeyDown);
    keyboard.on('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange, true);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.clearAll, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getContext(): string { return this.context; }

  setContext(context: string, requireRelease = true): void {
    if (this.context === context) return;
    this.context = context;
    this.queue.length = 0;
    if (requireRelease) this.heldCodes.forEach((code) => this.blockedUntilRelease.add(code));
    this.emit('context', context);
  }

  consume(
    action: InputAction,
    options: { bufferMs?: number; cooldownMs?: number } = {},
  ): boolean {
    if (this.destroyed) return false;
    const now = performance.now();
    const bufferMs = options.bufferMs ?? DEFAULT_INPUT_BUFFER_MS;
    const cooldownMs = options.cooldownMs ?? DEFAULT_INPUT_COOLDOWN_MS;
    this.removeExpired(now, bufferMs);
    const index = this.queue.findIndex((entry) => entry.actions.includes(action));
    if (index < 0) return false;
    const [entry] = this.queue.splice(index, 1);
    if (this.blockedUntilRelease.has(entry.code)) return false;
    const lastAt = this.lastConsumedAt.get(action) ?? -Infinity;
    if (now - lastAt < cooldownMs) return false;
    this.lastConsumedAt.set(action, now);
    this.emit('accepted', action, entry.sequence, now - entry.at);
    return true;
  }

  clearBuffered(): void { this.queue.length = 0; }

  isCodeDown(code: string): boolean {
    return this.heldCodes.has(code) && !this.blockedUntilRelease.has(code);
  }

  readMovement(out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const horizontal = Number(this.isCodeDown('KeyD')) - Number(this.isCodeDown('KeyA'));
    const vertical = Number(this.isCodeDown('KeyS')) - Number(this.isCodeDown('KeyW'));
    return out.set(horizontal, vertical);
  }

  hasMovementInput(): boolean {
    return this.isCodeDown('KeyW') || this.isCodeDown('KeyA') ||
      this.isCodeDown('KeyS') || this.isCodeDown('KeyD');
  }

  getDebugSnapshot(): {
    context: string;
    held: string[];
    buffered: number;
    keyboardListeners: number;
    pointerListeners: number;
  } {
    return {
      context: this.context,
      held: [...this.heldCodes],
      buffered: this.queue.length,
      keyboardListeners: this.scene.input.keyboard?.listenerCount('keydown') ?? 0,
      pointerListeners: this.scene.input.listenerCount('pointerdown') +
        this.scene.input.listenerCount('pointerup') +
        this.scene.input.listenerCount('pointermove'),
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown', this.onKeyDown);
    keyboard?.off('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur, true);
    document.removeEventListener('visibilitychange', this.onVisibilityChange, true);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.clearAll, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.clearAll();
    this.removeAllListeners();
    InputActionManager.instances.delete(this.scene);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    this.heldCodes.add(event.code);
    if (PREVENT_DEFAULT_CODES.has(event.code) && !this.isTextInputFocused()) event.preventDefault();
    const actions = ACTIONS_BY_CODE[event.code];
    if (!actions || event.repeat || this.blockedUntilRelease.has(event.code)) return;
    this.queue.push({ code: event.code, actions, at: performance.now(), sequence: ++this.sequence });
    if (this.queue.length > 32) this.queue.splice(0, this.queue.length - 32);
    this.emit('queued', actions, this.sequence);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.heldCodes.delete(event.code);
    this.blockedUntilRelease.delete(event.code);
  };

  private readonly onWindowBlur = (): void => this.clearAll();
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') this.clearAll();
  };

  private clearAll(): void {
    this.heldCodes.clear();
    this.blockedUntilRelease.clear();
    this.queue.length = 0;
  }

  private removeExpired(now: number, bufferMs: number): void {
    while (this.queue.length > 0 && now - this.queue[0].at > bufferMs) this.queue.shift();
  }

  private isTextInputFocused(): boolean {
    const element = document.activeElement;
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement || Boolean(element instanceof HTMLElement && element.isContentEditable);
  }
}
