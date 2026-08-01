import Phaser from 'phaser';
import type {
  PlayerAppearanceDefinition,
  PlayerHairStyle,
} from '../data/playerAppearances';
import type { PlayerDirection } from '../objects/Player';

export interface PlayerAvatarVisual {
  container: Phaser.GameObjects.Container;
  setFacing(direction: PlayerDirection): void;
  setMovement(moving: boolean, time: number): void;
}

export function createPlayerAvatarVisual(
  scene: Phaser.Scene,
  appearance: PlayerAppearanceDefinition,
): PlayerAvatarVisual {
  const shadow = scene.add.ellipse(0, 14, 38, 19, 0x050605, 0.38);
  const legs = scene.add.graphics();
  const body = scene.add.graphics();
  const head = scene.add.ellipse(0, -9, 24, 23, appearance.skinColor);
  head.setStrokeStyle(2, 0x8f8878, 0.82);
  const hair = scene.add.graphics();
  const accent = scene.add.graphics();
  const directionMarker = scene.add.graphics();

  legs.fillStyle(appearance.trousersColor, 1);
  legs.fillRoundedRect(-12, 8, 10, 19, 4);
  legs.fillRoundedRect(2, 8, 10, 19, 4);
  legs.fillStyle(appearance.shoeColor, 1);
  legs.fillRoundedRect(-13, 21, 11, 7, 3);
  legs.fillRoundedRect(2, 21, 11, 7, 3);

  body.fillStyle(appearance.coatColor, 1);
  body.fillRoundedRect(-18, -1, 36, 29, 10);
  body.lineStyle(2, 0xe0d5bd, 0.68);
  body.strokeRoundedRect(-18, -1, 36, 29, 10);
  body.fillStyle(appearance.innerColor, 1);
  body.fillTriangle(-5, 0, 5, 0, 0, 17);

  accent.fillStyle(appearance.accentColor, 0.95);
  accent.fillRoundedRect(-17, 5, 5, 18, 2);
  accent.fillRoundedRect(12, 5, 5, 18, 2);
  if (appearance.id === 'ash') {
    accent.fillTriangle(-10, -1, 10, -1, 0, 10);
  }

  drawHair(hair, appearance.hairStyle, appearance.hairColor);

  const container = scene.add.container(0, 0, [
    shadow,
    legs,
    body,
    accent,
    head,
    hair,
    directionMarker,
  ]);

  let facing: PlayerDirection = 'up';
  const drawDirectionMarker = (): void => {
    const points: Record<PlayerDirection, Phaser.Geom.Point[]> = {
      up: [
        new Phaser.Geom.Point(0, -24),
        new Phaser.Geom.Point(-5, -17),
        new Phaser.Geom.Point(5, -17),
      ],
      down: [
        new Phaser.Geom.Point(0, 32),
        new Phaser.Geom.Point(-5, 25),
        new Phaser.Geom.Point(5, 25),
      ],
      left: [
        new Phaser.Geom.Point(-23, 7),
        new Phaser.Geom.Point(-16, 2),
        new Phaser.Geom.Point(-16, 12),
      ],
      right: [
        new Phaser.Geom.Point(23, 7),
        new Phaser.Geom.Point(16, 2),
        new Phaser.Geom.Point(16, 12),
      ],
    };
    directionMarker.clear();
    directionMarker.fillStyle(appearance.accentColor, 1);
    directionMarker.fillPoints(points[facing], true);
    directionMarker.lineStyle(1.5, 0xf0e5cb, 0.94);
    directionMarker.strokePoints(points[facing], true);
  };

  drawDirectionMarker();

  return {
    container,
    setFacing(direction: PlayerDirection): void {
      facing = direction;
      body.setScale(direction === 'left' ? -1 : 1, 1);
      accent.setScale(direction === 'left' ? -1 : 1, 1);
      hair.setScale(direction === 'left' ? -1 : 1, 1);
      drawDirectionMarker();
    },
    setMovement(moving: boolean, time: number): void {
      if (!moving) {
        container.y = 0;
        legs.setRotation(0);
        return;
      }
      container.y = Math.sin(time / 85) * 1.4;
      legs.setRotation(Math.sin(time / 90) * 0.035);
    },
  };
}

function drawHair(
  graphics: Phaser.GameObjects.Graphics,
  style: PlayerHairStyle,
  color: number,
): void {
  graphics.fillStyle(color, 1);
  if (style === 'short') {
    graphics.fillEllipse(0, -16, 25, 16);
    graphics.fillTriangle(-12, -16, -7, -4, -2, -13);
  } else if (style === 'tied') {
    graphics.fillEllipse(0, -16, 24, 15);
    graphics.fillCircle(12, -14, 7);
    graphics.fillRoundedRect(10, -12, 5, 13, 2);
  } else if (style === 'wavy') {
    graphics.fillCircle(-8, -16, 7);
    graphics.fillCircle(0, -18, 8);
    graphics.fillCircle(8, -16, 7);
    graphics.fillCircle(-11, -9, 5);
    graphics.fillCircle(11, -9, 5);
  } else {
    graphics.fillEllipse(0, -16, 23, 12);
    graphics.fillRect(-11, -16, 22, 5);
  }
}
