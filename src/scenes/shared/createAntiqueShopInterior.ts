import Phaser from 'phaser';
import { VISUAL_THEME } from '../../visuals/visualTheme';

export const ANTIQUE_SHOP_WIDTH = 1280;
export const ANTIQUE_SHOP_HEIGHT = 720;

export interface AntiqueShopInterior {
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  shopkeeper: Phaser.GameObjects.Container;
  interactionHighlight: Phaser.GameObjects.Graphics;
  counterX: number;
  counterY: number;
  interactionX: number;
  interactionY: number;
  interactionRadius: number;
  promptX: number;
  promptY: number;
  artifactX: number;
  artifactY: number;
}

export function createAntiqueShopInterior(
  scene: Phaser.Scene,
): AntiqueShopInterior {
  const counterX = 640;
  const counterY = 248;
  const obstacles = scene.physics.add.staticGroup();

  const floor = scene.add.graphics().setDepth(0);
  floor.fillStyle(0x4a3d31, 1);
  floor.fillRect(80, 48, 1120, 624);
  floor.lineStyle(1, 0x917654, 0.2);
  for (let x = 112; x < 1200; x += 64) {
    floor.lineBetween(x, 48, x, 672);
  }
  for (let y = 80; y < 672; y += 64) {
    floor.lineBetween(80, y, 1200, y);
  }
  createFloorWear(scene);

  const warmPools = scene.add.graphics().setDepth(0.3);
  warmPools.fillStyle(0xc7a469, 0.12);
  warmPools.fillEllipse(390, 390, 300, 260);
  warmPools.fillEllipse(890, 390, 300, 260);
  warmPools.fillStyle(0x171a15, 0.16);
  warmPools.fillRect(80, 48, 1120, 90);
  warmPools.fillRect(80, 555, 1120, 117);

  const walls = scene.add.graphics().setDepth(1);
  walls.fillStyle(0x302720, 1);
  walls.fillRect(80, 48, 1120, 32);
  walls.fillRect(80, 48, 32, 624);
  walls.fillRect(1168, 48, 32, 624);
  walls.fillRect(80, 640, 480, 32);
  walls.fillRect(720, 640, 480, 32);
  walls.lineStyle(2, 0x9a8061, 0.84);
  walls.lineBetween(112, 80, 1168, 80);
  walls.lineBetween(112, 640, 560, 640);
  walls.lineBetween(720, 640, 1168, 640);

  addObstacle(scene, obstacles, 640, 64, 1120, 32);
  addObstacle(scene, obstacles, 96, 360, 32, 624);
  addObstacle(scene, obstacles, 1184, 360, 32, 624);
  addObstacle(scene, obstacles, 320, 656, 480, 32);
  addObstacle(scene, obstacles, 960, 656, 480, 32);

  createShelves(scene, obstacles);
  createCounter(scene, obstacles, counterX, counterY);
  createBackDoor(scene);
  createHangingLamps(scene);
  const shopkeeper = createShopkeeper(scene, counterX);
  const interactionHighlight = createInteractionHighlight(scene);

  return {
    obstacles,
    shopkeeper,
    interactionHighlight,
    counterX,
    counterY,
    interactionX: 640,
    interactionY: 340,
    interactionRadius: 112,
    promptX: 770,
    promptY: 310,
    artifactX: 720,
    artifactY: 237,
  };
}

function createFloorWear(scene: Phaser.Scene): void {
  const wear = scene.add.graphics().setDepth(0.2);
  wear.lineStyle(1, VISUAL_THEME.colors.inkBlack, 0.16);
  for (let index = 0; index < 22; index += 1) {
    const x = 132 + ((index * 157) % 980);
    const y = 112 + ((index * 83) % 492);
    const length = 22 + (index % 4) * 13;
    wear.lineBetween(x, y, x + length, y + (index % 3) - 1);
  }
  wear.fillStyle(VISUAL_THEME.colors.oldPaper, 0.055);
  wear.fillRect(450, 524, 74, 34);
  wear.fillRect(762, 118, 56, 28);
  wear.lineStyle(1, VISUAL_THEME.colors.antiqueGold, 0.16);
  wear.strokeRect(454, 528, 66, 26);
  wear.strokeRect(766, 122, 48, 20);
}

function createHangingLamps(scene: Phaser.Scene): void {
  const lamps = scene.add.graphics().setDepth(2.1);
  for (const x of [390, 890]) {
    lamps.lineStyle(2, VISUAL_THEME.colors.softInk, 0.95);
    lamps.lineBetween(x, 48, x, 100);
    lamps.fillStyle(VISUAL_THEME.colors.darkWood, 1);
    lamps.fillTriangle(x - 24, 102, x + 24, 102, x + 17, 132);
    lamps.lineStyle(2, VISUAL_THEME.colors.woodEdge, 0.72);
    lamps.strokeTriangle(x - 24, 102, x + 24, 102, x + 17, 132);
    lamps.fillStyle(VISUAL_THEME.colors.lanternOrange, 0.92);
    lamps.fillCircle(x, 118, 7);
  }
}

function createInteractionHighlight(
  scene: Phaser.Scene,
): Phaser.GameObjects.Graphics {
  const highlight = scene.add.graphics().setDepth(3.4).setVisible(false);
  highlight.lineStyle(2, VISUAL_THEME.colors.antiqueGold, 0.58);
  highlight.strokeRoundedRect(354, 206, 572, 90, 6);
  highlight.strokeEllipse(640, 164, 72, 104);
  return highlight;
}

function createShelves(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): void {
  const drawShelf = (x: number): void => {
    const shelf = scene.add.graphics().setDepth(1.5);
    shelf.fillStyle(0x3a2e25, 1);
    shelf.fillRoundedRect(x - 62, 150, 124, 360, 5);
    shelf.lineStyle(3, 0x916d4b, 0.92);
    shelf.strokeRoundedRect(x - 62, 150, 124, 360, 5);
    for (let y = 220; y <= 440; y += 74) {
      shelf.lineBetween(x - 52, y, x + 52, y);
    }
    shelf.lineStyle(1, VISUAL_THEME.colors.oldPaper, 0.24);
    shelf.lineBetween(x - 46, 164, x - 18, 158);
    shelf.lineBetween(x + 8, 236, x + 44, 229);
    shelf.strokeRect(x - 29, 418, 58, 24);
    shelf.fillStyle(0x6b7a6e, 0.88);
    shelf.fillCircle(x - 24, 195, 18);
    shelf.fillStyle(0x895c4c, 0.78);
    shelf.fillRoundedRect(x + 9, 178, 35, 34, 5);
    shelf.fillStyle(0xa18a68, 0.62);
    shelf.fillEllipse(x, 274, 58, 28);
    shelf.fillStyle(0x354641, 0.9);
    shelf.fillCircle(x + 18, 348, 25);
    shelf.fillStyle(0x746755, 0.92);
    shelf.fillRoundedRect(x - 42, 407, 84, 46, 4);
  };

  drawShelf(184);
  drawShelf(1096);
  addObstacle(scene, obstacles, 184, 330, 124, 360);
  addObstacle(scene, obstacles, 1096, 330, 124, 360);

  const covered = scene.add.graphics().setDepth(1.7);
  covered.fillStyle(0x53574b, 0.96);
  covered.fillRoundedRect(278, 474, 120, 82, 8);
  covered.lineStyle(2, 0x77705e, 0.45);
  covered.lineBetween(278, 500, 398, 500);
  covered.fillStyle(0x74423a, 0.72);
  covered.fillRoundedRect(882, 474, 120, 82, 8);
  covered.lineStyle(2, 0x7b5d4c, 0.42);
  covered.lineBetween(882, 500, 1002, 500);
  addObstacle(scene, obstacles, 338, 515, 120, 82);
  addObstacle(scene, obstacles, 942, 515, 120, 82);
}

function createCounter(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  counterX: number,
  counterY: number,
): void {
  const counter = scene.add.graphics().setDepth(2.5);
  counter.fillStyle(0x4b3424, 1);
  counter.fillRoundedRect(360, 212, 560, 82, 4);
  counter.lineStyle(3, 0xb1845b, 0.96);
  counter.strokeRoundedRect(360, 212, 560, 82, 4);
  counter.fillStyle(0x62452e, 1);
  counter.fillRect(374, 226, 532, 22);
  counter.lineStyle(1, 0xb18a57, 0.38);
  counter.lineBetween(374, 252, 906, 252);
  counter.lineBetween(478, 252, 478, 286);
  counter.lineBetween(802, 252, 802, 286);
  counter.lineStyle(1, VISUAL_THEME.colors.inkBlack, 0.36);
  counter.lineBetween(406, 236, 468, 232);
  counter.lineBetween(624, 274, 712, 269);
  counter.lineBetween(828, 237, 884, 241);

  const ledger = scene.add.graphics().setDepth(3.2);
  ledger.fillStyle(0x3a342d, 1);
  ledger.fillRoundedRect(500, 220, 94, 54, 3);
  ledger.lineStyle(1, 0x9b8260, 0.55);
  ledger.strokeRoundedRect(500, 220, 94, 54, 3);
  ledger.lineBetween(547, 222, 547, 271);

  addObstacle(scene, obstacles, counterX, counterY + 5, 560, 82);
}

function createBackDoor(scene: Phaser.Scene): void {
  const door = scene.add.graphics().setDepth(1.4);
  door.fillStyle(0x27221d, 1);
  door.fillRect(570, 80, 140, 112);
  door.lineStyle(3, 0x866b4e, 0.9);
  door.strokeRect(570, 80, 140, 112);
  door.lineBetween(640, 80, 640, 192);
  door.fillStyle(0x85704d, 0.65);
  door.fillCircle(624, 137, 4);
}

function createShopkeeper(
  scene: Phaser.Scene,
  counterX: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 18, 58, 26, 0x070706, 0.42);
  const robe = scene.add.graphics();
  robe.fillStyle(0x363b32, 1);
  robe.fillRoundedRect(-27, -20, 54, 72, 15);
  robe.lineStyle(2, 0x7f8974, 0.9);
  robe.strokeRoundedRect(-27, -20, 54, 72, 15);
  robe.lineBetween(0, -12, 0, 48);
  const head = scene.add.ellipse(0, -28, 30, 34, 0x8e826e, 0.92);
  head.setStrokeStyle(2, 0x8f927f, 0.92);
  const faceHint = scene.add.circle(6, -27, 2, 0xd2b783, 0.8);
  return scene.add
    .container(counterX, 164, [shadow, robe, head, faceHint])
    .setDepth(2.2);
}

function addObstacle(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  const obstacle = scene.add.rectangle(x, y, width, height, 0x000000, 0);
  group.add(obstacle);
  return obstacle;
}
