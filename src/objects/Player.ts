import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_APPEARANCE_ID,
  getPlayerAppearance,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import {
  createPlayerAvatarVisual,
  type PlayerAvatarVisual,
} from '../visuals/createPlayerAvatarVisual';
import { TOMB_FEEL } from '../config/tombFeelConfig';

export type PlayerDirection =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';
export type PlayerLocomotion = 'forward' | 'backward';
export type PlayerMovementMode = 'cartesian' | 'isometric';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.GameObjects.Container {
  private readonly movementKeys: MovementKeys;
  private readonly domMovementState: Record<keyof MovementKeys, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private readonly avatarVisual: PlayerAvatarVisual;
  private readonly movementMode: PlayerMovementMode;
  private facing: PlayerDirection = 'north';
  private visualFacing: PlayerDirection = 'north';
  private aimControlled = false;
  private movementEnabled = true;
  private readonly smoothedVelocity = new Phaser.Math.Vector2();
  private lastUpdateTime = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID,
    movementMode: PlayerMovementMode = 'cartesian',
  ) {
    super(scene, x, y);

    scene.add.existing(this);
    this.setSize(48, 48);
    this.setDepth(3);
    this.movementMode = movementMode;

    this.avatarVisual = createPlayerAvatarVisual(
      scene,
      getPlayerAppearance(appearanceId),
    );
    this.add(this.avatarVisual.container);
    this.avatarVisual.setFacing(this.facing);

    scene.physics.add.existing(this);
    const physicsBody = this.body as Phaser.Physics.Arcade.Body;
    physicsBody.setSize(28, 28);
    physicsBody.setOffset(10, 12);
    physicsBody.setCollideWorldBounds(true);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for player movement.');
    }

    this.movementKeys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ]);

    // Phaser normally listens on window, but embedded browsers can move focus
    // away from the canvas without notifying its KeyboardPlugin. Keep a small
    // DOM-level fallback so movement remains responsive after clicking UI or
    // switching scenes, while still leaving all scene-specific controls intact.
    window.addEventListener('keydown', this.handleDomKeyDown, true);
    window.addEventListener('keyup', this.handleDomKeyUp, true);
    window.addEventListener('blur', this.clearDomMovementState, true);

    scene.game.events.on(Phaser.Core.Events.BLUR, this.stop, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.game.events.off(Phaser.Core.Events.BLUR, this.stop, this);
      window.removeEventListener('keydown', this.handleDomKeyDown, true);
      window.removeEventListener('keyup', this.handleDomKeyUp, true);
      window.removeEventListener('blur', this.clearDomMovementState, true);
    });
  }

  update(): void {
    if (!this.movementEnabled) {
      this.stop();
      return;
    }

    const horizontal = Number(this.isDirectionDown('right')) - Number(this.isDirectionDown('left'));
    const vertical = Number(this.isDirectionDown('down')) - Number(this.isDirectionDown('up'));
    const desiredVelocity = this.movementMode === 'isometric'
      ? new Phaser.Math.Vector2(horizontal - vertical, (horizontal + vertical) * 0.5)
      : new Phaser.Math.Vector2(horizontal, vertical);
    const physicsBody = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const deltaSeconds = this.lastUpdateTime === 0
      ? 1 / 60
      : Phaser.Math.Clamp((now - this.lastUpdateTime) / 1000, 0, 0.05);
    this.lastUpdateTime = now;

    if (desiredVelocity.lengthSq() === 0) {
      const remainingSpeed = Math.max(
        0,
        this.smoothedVelocity.length() -
          TOMB_FEEL.movement.deceleration * deltaSeconds,
      );
      if (remainingSpeed <= 0.5) {
        this.smoothedVelocity.set(0, 0);
      } else {
        this.smoothedVelocity.setLength(remainingSpeed);
      }
      physicsBody.setVelocity(this.smoothedVelocity.x, this.smoothedVelocity.y);
      if (this.aimControlled) {
        this.visualFacing = this.facing;
        this.avatarVisual.setFacing(this.visualFacing);
      }
      this.avatarVisual.setMovement(false, this.scene.time.now);
      return;
    }

    desiredVelocity.normalize().scale(TOMB_FEEL.movement.speed);
    const deltaVelocity = desiredVelocity.clone().subtract(this.smoothedVelocity);
    const maxVelocityChange = TOMB_FEEL.movement.acceleration * deltaSeconds;
    if (deltaVelocity.length() > maxVelocityChange) {
      deltaVelocity.setLength(maxVelocityChange);
    }
    this.smoothedVelocity.add(deltaVelocity);
    physicsBody.setVelocity(this.smoothedVelocity.x, this.smoothedVelocity.y);
    const movementDirection = this.directionFromVector(desiredVelocity.x, desiredVelocity.y);
    if (!this.aimControlled) {
      this.facing = movementDirection;
    }
    const movementVector = desiredVelocity.clone().normalize();
    const aimVector = this.directionVector(this.facing);
    const locomotion: PlayerLocomotion = movementVector.dot(aimVector) < -0.35
      ? 'backward'
      : 'forward';
    const nextVisualFacing = locomotion === 'backward' ? this.facing : movementDirection;
    if (nextVisualFacing !== this.visualFacing) {
      this.visualFacing = nextVisualFacing;
      this.avatarVisual.setFacing(this.visualFacing);
    }
    this.avatarVisual.setMovement(true, this.scene.time.now, locomotion);
  }

  setMovementEnabled(enabled: boolean): void {
    this.movementEnabled = enabled;

    if (!enabled) {
      this.stop();
    }
  }

  getFacingVector(): Phaser.Math.Vector2 {
    return this.directionVector(this.facing);
  }

  getFacing(): PlayerDirection {
    return this.facing;
  }

  getAnimationState(): string {
    return this.avatarVisual.getAnimationState();
  }

  setAimAngle(angleRadians: number): void {
    this.aimControlled = true;
    const nextFacing = this.directionFromVector(
      Math.cos(angleRadians),
      Math.sin(angleRadians),
    );
    if (nextFacing !== this.facing) {
      this.facing = nextFacing;
      if (this.smoothedVelocity.lengthSq() < 4) {
        this.visualFacing = nextFacing;
        this.avatarVisual.setFacing(nextFacing);
      }
    }
  }

  setCarrying(carrying: boolean): void {
    this.avatarVisual.setCarrying(carrying);
  }

  playCarryAction(action: 'pickup' | 'place'): void {
    this.avatarVisual.playAction(action);
  }

  getFlashlightMountWorld(angleRadians: number): Phaser.Math.Vector2 {
    const forward = TOMB_FEEL.player.flashlightForwardOffset;
    const lateral = TOMB_FEEL.player.flashlightMountOffsetX;
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angleRadians) * forward - Math.sin(angleRadians) * lateral,
      this.y + TOMB_FEEL.player.flashlightMountOffsetY +
        Math.sin(angleRadians) * forward * 0.35 + Math.cos(angleRadians) * lateral,
    );
  }

  getMovementVelocity(): Phaser.Math.Vector2 {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    return body ? body.velocity.clone() : new Phaser.Math.Vector2();
  }

  private directionFromVector(x: number, y: number): PlayerDirection {
    const directions: PlayerDirection[] = [
      'north',
      'north-east',
      'east',
      'south-east',
      'south',
      'south-west',
      'west',
      'north-west',
    ];
    const angle = Math.atan2(y, x);
    const index = Phaser.Math.Wrap(
      Math.round((angle + Math.PI / 2) / (Math.PI / 4)),
      0,
      directions.length,
    );
    return directions[index];
  }

  private directionVector(direction: PlayerDirection): Phaser.Math.Vector2 {
    const vectors: Record<PlayerDirection, Phaser.Math.Vector2> = {
      north: new Phaser.Math.Vector2(0, -1),
      'north-east': new Phaser.Math.Vector2(1, -1).normalize(),
      east: new Phaser.Math.Vector2(1, 0),
      'south-east': new Phaser.Math.Vector2(1, 1).normalize(),
      south: new Phaser.Math.Vector2(0, 1),
      'south-west': new Phaser.Math.Vector2(-1, 1).normalize(),
      west: new Phaser.Math.Vector2(-1, 0),
      'north-west': new Phaser.Math.Vector2(-1, -1).normalize(),
    };
    return vectors[direction].clone();
  }

  private isDirectionDown(direction: keyof MovementKeys): boolean {
    return this.movementKeys[direction].isDown || this.domMovementState[direction];
  }

  private readonly handleDomKeyDown = (event: KeyboardEvent): void => {
    const direction = this.getDirectionForEvent(event);
    if (!direction || this.isTextInputFocused()) {
      return;
    }
    this.domMovementState[direction] = true;
  };

  private readonly handleDomKeyUp = (event: KeyboardEvent): void => {
    const direction = this.getDirectionForEvent(event);
    if (!direction) {
      return;
    }
    this.domMovementState[direction] = false;
  };

  private readonly clearDomMovementState = (): void => {
    this.domMovementState.up = false;
    this.domMovementState.down = false;
    this.domMovementState.left = false;
    this.domMovementState.right = false;
    this.stop();
  };

  private getDirectionForEvent(event: KeyboardEvent): keyof MovementKeys | undefined {
    const key = event.key.toLowerCase();
    switch (event.code || key || String(event.keyCode)) {
      case 'KeyW':
      case 'w':
      case '87':
        return 'up';
      case 'KeyS':
      case 's':
      case '83':
        return 'down';
      case 'KeyA':
      case 'a':
      case '65':
        return 'left';
      case 'KeyD':
      case 'd':
      case '68':
        return 'right';
      default:
        return undefined;
    }
  }

  private isTextInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement instanceof HTMLElement && activeElement.isContentEditable;
  }

  private stop(): void {
    const physicsBody = this.body as Phaser.Physics.Arcade.Body | null;
    physicsBody?.setVelocity(0, 0);
    this.smoothedVelocity.set(0, 0);
    this.lastUpdateTime = this.scene.time.now;
    this.avatarVisual.setMovement(false, this.scene.time.now);
  }
}
