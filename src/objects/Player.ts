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

export type PlayerDirection = 'up' | 'down' | 'left' | 'right';
export type PlayerMovementMode = 'cartesian' | 'isometric';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.GameObjects.Container {
  private readonly movementKeys: MovementKeys;
  private readonly avatarVisual: PlayerAvatarVisual;
  private readonly movementMode: PlayerMovementMode;
  private facing: PlayerDirection = 'up';
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

    const horizontal = Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown);
    const vertical = Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown);
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
    this.avatarVisual.setMovement(true, this.scene.time.now);

    const nextFacing = this.getFacingFromInput(horizontal, vertical);
    if (nextFacing !== this.facing) {
      this.facing = nextFacing;
      this.avatarVisual.setFacing(this.facing);
    }
  }

  setMovementEnabled(enabled: boolean): void {
    this.movementEnabled = enabled;

    if (!enabled) {
      this.stop();
    }
  }

  getFacingVector(): Phaser.Math.Vector2 {
    const vectors: Record<PlayerDirection, Phaser.Math.Vector2> = {
      up: new Phaser.Math.Vector2(0, -1),
      down: new Phaser.Math.Vector2(0, 1),
      left: new Phaser.Math.Vector2(-1, 0),
      right: new Phaser.Math.Vector2(1, 0),
    };
    return vectors[this.facing].clone();
  }

  getFacing(): PlayerDirection {
    return this.facing;
  }

  getAnimationState(): string {
    return this.avatarVisual.getAnimationState();
  }

  setAimAngle(angleRadians: number): void {
    const horizontal = Math.cos(angleRadians);
    const vertical = Math.sin(angleRadians);
    const nextFacing: PlayerDirection = Math.abs(horizontal) > Math.abs(vertical)
      ? horizontal >= 0 ? 'right' : 'left'
      : vertical >= 0 ? 'down' : 'up';
    if (nextFacing !== this.facing) {
      this.facing = nextFacing;
      this.avatarVisual.setFacing(nextFacing);
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

  private getFacingFromInput(horizontal: number, vertical: number): PlayerDirection {
    if (horizontal !== 0 && vertical !== 0) {
      const horizontalKey = horizontal > 0 ? this.movementKeys.right : this.movementKeys.left;
      const verticalKey = vertical > 0 ? this.movementKeys.down : this.movementKeys.up;

      if (horizontalKey.timeDown > verticalKey.timeDown) {
        return horizontal > 0 ? 'right' : 'left';
      }
    }

    if (vertical !== 0) {
      return vertical > 0 ? 'down' : 'up';
    }

    return horizontal > 0 ? 'right' : 'left';
  }

  private stop(): void {
    const physicsBody = this.body as Phaser.Physics.Arcade.Body | null;
    physicsBody?.setVelocity(0, 0);
    this.smoothedVelocity.set(0, 0);
    this.lastUpdateTime = this.scene.time.now;
    this.avatarVisual.setMovement(false, this.scene.time.now);
  }
}
