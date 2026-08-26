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
import { InputActionManager } from '../input/InputActionManager';
import type { ArtSceneGrade } from '../config/artTokens';

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

const DIRECTIONS: readonly PlayerDirection[] = [
  'north', 'north-east', 'east', 'south-east',
  'south', 'south-west', 'west', 'north-west',
];
const DIAGONAL = Math.SQRT1_2;
const DIRECTION_COMPONENTS: Readonly<Record<PlayerDirection, readonly [number, number]>> = {
  north: [0, -1],
  'north-east': [DIAGONAL, -DIAGONAL],
  east: [1, 0],
  'south-east': [DIAGONAL, DIAGONAL],
  south: [0, 1],
  'south-west': [-DIAGONAL, DIAGONAL],
  west: [-1, 0],
  'north-west': [-DIAGONAL, -DIAGONAL],
};

/** Input direction responds immediately while physical motion retains weight. */
export class Player extends Phaser.GameObjects.Container {
  private readonly avatarVisual: PlayerAvatarVisual;
  private readonly movementMode: PlayerMovementMode;
  private readonly inputActions: InputActionManager;
  private readonly rawInput = new Phaser.Math.Vector2();
  private readonly desiredVelocity = new Phaser.Math.Vector2();
  private readonly velocityDelta = new Phaser.Math.Vector2();
  private readonly movementDirection = new Phaser.Math.Vector2();
  private readonly visualVelocity = new Phaser.Math.Vector2();
  private readonly facingVector = new Phaser.Math.Vector2(0, -1);
  private facing: PlayerDirection = 'north';
  private visualFacing: PlayerDirection = 'north';
  private aimControlled = false;
  private movementEnabled = true;
  private autoMoveDirection?: Phaser.Math.Vector2;
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
    this.inputActions = InputActionManager.forScene(scene);

    this.avatarVisual = createPlayerAvatarVisual(scene, getPlayerAppearance(appearanceId));
    this.add(this.avatarVisual.container);
    this.avatarVisual.setFacing(this.facing);

    scene.physics.add.existing(this);
    const physicsBody = this.body as Phaser.Physics.Arcade.Body;
    physicsBody.setSize(22, 14);
    physicsBody.setOffset(13, 34);
    physicsBody.setCollideWorldBounds(true);

    scene.game.events.on(Phaser.Core.Events.BLUR, this.stop, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.game.events.off(Phaser.Core.Events.BLUR, this.stop, this);
    });
  }

  update(): void {
    if (!this.movementEnabled) {
      this.stop();
      return;
    }

    const physicsBody = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const deltaSeconds = this.lastUpdateTime === 0
      ? 1 / 60
      : Phaser.Math.Clamp((now - this.lastUpdateTime) / 1000, 0, 0.05);
    this.lastUpdateTime = now;

    this.inputActions.readMovement(this.rawInput);
    const manualMovement = this.rawInput.lengthSq() > 0;
    if (manualMovement) this.autoMoveDirection = undefined;

    if (manualMovement) {
      if (this.movementMode === 'isometric') {
        this.desiredVelocity.set(
          this.rawInput.x - this.rawInput.y,
          (this.rawInput.x + this.rawInput.y) * 0.5,
        );
      } else {
        this.desiredVelocity.copy(this.rawInput);
      }
    } else if (this.autoMoveDirection) {
      this.desiredVelocity.copy(this.autoMoveDirection);
    } else {
      this.desiredVelocity.set(0, 0);
    }

    if (this.desiredVelocity.lengthSq() > 0.0001) {
      this.desiredVelocity.normalize();
      const movementFacing = this.directionFromVector(
        this.desiredVelocity.x,
        this.desiredVelocity.y,
      );
      if (!this.aimControlled) {
        this.facing = movementFacing;
        this.updateFacingVector();
      }

      this.movementDirection.copy(this.desiredVelocity);
      this.desiredVelocity.scale(TOMB_FEEL.movement.speed);
      this.velocityDelta.copy(this.desiredVelocity).subtract(this.smoothedVelocity);
      const reversing = this.smoothedVelocity.lengthSq() > 25 &&
        this.smoothedVelocity.dot(this.desiredVelocity) < 0;
      const acceleration = reversing
        ? TOMB_FEEL.movement.reverseAcceleration
        : TOMB_FEEL.movement.acceleration;
      const maxChange = acceleration * deltaSeconds;
      if (this.velocityDelta.lengthSq() > maxChange * maxChange) {
        this.velocityDelta.setLength(maxChange);
      }
      this.smoothedVelocity.add(this.velocityDelta);

      const aimComponents = DIRECTION_COMPONENTS[this.facing];
      const locomotion: PlayerLocomotion =
        this.movementDirection.x * aimComponents[0] +
          this.movementDirection.y * aimComponents[1] < -0.35
          ? 'backward'
          : 'forward';
      const nextVisualFacing = locomotion === 'backward' ? this.facing : movementFacing;
      if (nextVisualFacing !== this.visualFacing) {
        this.visualFacing = nextVisualFacing;
        this.avatarVisual.setFacing(nextVisualFacing);
      }
    } else {
      const speed = this.smoothedVelocity.length();
      const remaining = Math.max(0, speed - TOMB_FEEL.movement.deceleration * deltaSeconds);
      if (remaining <= 0.5) this.smoothedVelocity.set(0, 0);
      else this.smoothedVelocity.setLength(remaining);
      if (this.aimControlled && this.visualFacing !== this.facing) {
        this.visualFacing = this.facing;
        this.avatarVisual.setFacing(this.facing);
      }
    }

    physicsBody.setVelocity(this.smoothedVelocity.x, this.smoothedVelocity.y);
    this.visualVelocity.set(
      physicsBody.blocked.left || physicsBody.blocked.right ? 0 : this.smoothedVelocity.x,
      physicsBody.blocked.up || physicsBody.blocked.down ? 0 : this.smoothedVelocity.y,
    );
    const visualSpeed = this.visualVelocity.length();
    const moving = visualSpeed > 6;
    const locomotion: PlayerLocomotion = moving && this.movementDirection.dot(this.facingVector) < -0.35
      ? 'backward'
      : 'forward';
    this.avatarVisual.setMovement(
      moving,
      now,
      locomotion,
      Phaser.Math.Clamp(visualSpeed / TOMB_FEEL.movement.speed, 0.35, 1),
    );
  }

  setMovementEnabled(enabled: boolean): void {
    this.movementEnabled = enabled;
    if (!enabled) {
      this.autoMoveDirection = undefined;
      this.stop();
    }
  }

  setAutoMoveDirection(direction?: Phaser.Math.Vector2): void {
    this.autoMoveDirection = direction && direction.lengthSq() > 0.0001
      ? direction.clone().normalize()
      : undefined;
  }

  hasManualMovementInput(): boolean { return this.inputActions.hasMovementInput(); }
  isMovementEnabled(): boolean { return this.movementEnabled; }
  getFacingVector(): Phaser.Math.Vector2 { return this.facingVector; }
  getFacing(): PlayerDirection { return this.facing; }
  getAnimationState(): string { return this.avatarVisual.getAnimationState(); }

  setAimAngle(angleRadians: number): void {
    this.aimControlled = true;
    const nextFacing = this.directionFromVector(Math.cos(angleRadians), Math.sin(angleRadians));
    if (nextFacing !== this.facing) {
      this.facing = nextFacing;
      this.updateFacingVector();
      if (this.smoothedVelocity.lengthSq() < 4) {
        this.visualFacing = nextFacing;
        this.avatarVisual.setFacing(nextFacing);
      }
    }
  }

  setCarrying(carrying: boolean): void { this.avatarVisual.setCarrying(carrying); }
  playCarryAction(action: 'pickup' | 'place'): void { this.avatarVisual.playAction(action); }
  playCandleLightingAction(): void { this.avatarVisual.playAction('light-candle'); }
  setEnvironmentGrade(grade: ArtSceneGrade): void { this.avatarVisual.setEnvironmentGrade(grade); }

  getFlashlightMountWorld(angleRadians: number): Phaser.Math.Vector2 {
    const forward = TOMB_FEEL.player.flashlightForwardOffset;
    const lateral = TOMB_FEEL.player.flashlightMountOffsetX;
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angleRadians) * forward - Math.sin(angleRadians) * lateral,
      this.y + TOMB_FEEL.player.flashlightMountOffsetY +
        Math.sin(angleRadians) * forward * 0.35 + Math.cos(angleRadians) * lateral,
    );
  }

  /** Read-only by convention; returned directly to avoid one allocation per frame. */
  getMovementVelocity(): Phaser.Math.Vector2 {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    return body?.velocity ?? this.smoothedVelocity;
  }

  private updateFacingVector(): void {
    const components = DIRECTION_COMPONENTS[this.facing];
    this.facingVector.set(components[0], components[1]);
  }

  private directionFromVector(x: number, y: number): PlayerDirection {
    const angle = Math.atan2(y, x);
    const index = Phaser.Math.Wrap(
      Math.round((angle + Math.PI / 2) / (Math.PI / 4)),
      0,
      DIRECTIONS.length,
    );
    return DIRECTIONS[index];
  }

  private stop(): void {
    const physicsBody = this.body as Phaser.Physics.Arcade.Body | null;
    physicsBody?.setVelocity(0, 0);
    this.smoothedVelocity.set(0, 0);
    this.lastUpdateTime = this.scene.time.now;
    this.avatarVisual.setMovement(false, this.scene.time.now, 'forward', 0);
  }
}
