import Phaser from 'phaser';
import { SHOP_UI } from './shopUiTheme';

export function createShopWorldCue(
  scene: Phaser.Scene,
  width = 118,
  height = 58,
): Phaser.GameObjects.Container {
  const brackets = scene.add.graphics();
  const halfW = width / 2;
  const halfH = height / 2;
  const corner = 18;
  brackets.lineStyle(3, SHOP_UI.colors.gold, 0.96);
  brackets.lineBetween(-halfW, -halfH + corner, -halfW, -halfH);
  brackets.lineBetween(-halfW, -halfH, -halfW + corner, -halfH);
  brackets.lineBetween(halfW - corner, -halfH, halfW, -halfH);
  brackets.lineBetween(halfW, -halfH, halfW, -halfH + corner);
  brackets.lineBetween(-halfW, halfH - corner, -halfW, halfH);
  brackets.lineBetween(-halfW, halfH, -halfW + corner, halfH);
  brackets.lineBetween(halfW - corner, halfH, halfW, halfH);
  brackets.lineBetween(halfW, halfH, halfW, halfH - corner);

  const guide = scene.add.graphics();
  guide.lineStyle(1, SHOP_UI.colors.gold, 0.7);
  guide.lineBetween(-halfW + 28, 0, -14, 0);
  guide.lineBetween(14, 0, halfW - 28, 0);
  guide.lineBetween(0, -halfH + 12, 0, -10);
  guide.lineBetween(0, 10, 0, halfH - 12);
  guide.strokeCircle(0, 0, 11);

  const seal = scene.add
    .rectangle(0, 0, 10, 10, SHOP_UI.colors.cinnabar, 0.92)
    .setRotation(Math.PI / 4)
    .setStrokeStyle(1, 0xe2b875, 0.9);
  const pin = scene.add.graphics();
  pin.fillStyle(SHOP_UI.colors.gold, 0.95);
  pin.fillTriangle(-7, -halfH - 10, 7, -halfH - 10, 0, -halfH - 2);

  const cue = scene.add
    .container(0, 0, [brackets, guide, seal, pin])
    .setDepth(3.95)
    .setVisible(false);
  scene.tweens.add({
    targets: seal,
    scale: { from: 0.78, to: 1.18 },
    alpha: { from: 0.58, to: 1 },
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
  scene.tweens.add({
    targets: pin,
    y: { from: -2, to: 3 },
    duration: 620,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
  return cue;
}
