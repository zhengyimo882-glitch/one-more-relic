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

export type PlayerDirection = 'up' | 'down' | 'left' | 'right';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

const MOVE_SPEED = 180;

export class Player extends Phaser.GameObjects.Container {
  private readonly movementKeys: MovementKeys;
  private readonly avatarVisual: PlayerAvatarVisual;
  private facing: PlayerDirection = 'up';
  private movementEnabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID,
  ) {
    super(scene, x, y);

    scene.add.existing(this);
    this.setSize(48, 48);
    this.setDepth(3);

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
    const velocity = new Phaser.Math.Vector2(horizontal, vertical);
    const physicsBody = this.body as Phaser.Physics.Arcade.Body;

    if (velocity.lengthSq() === 0) {
      physicsBody.setVelocity(0, 0);
      this.avatarVisual.setMovement(false, this.scene.time.now);
      return;
    }

    velocity.normalize().scale(MOVE_SPEED);
    physicsBody.setVelocity(velocity.x, velocity.y);
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
    this.avatarVisual.setMovement(false, this.scene.time.now);
  }
}
