import Phaser from 'phaser';
import { VISUAL_THEME } from '../../visuals/visualTheme';
import {
  createShopkeeperVisual,
  type ShopkeeperVisual,
} from '../../visuals/createShopkeeperVisual';

export const ANTIQUE_SHOP_WIDTH = 1280;
export const ANTIQUE_SHOP_HEIGHT = 720;

export interface AntiqueShopInterior {
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  shopkeeper: Phaser.GameObjects.Container;
  shopkeeperVisual: ShopkeeperVisual;
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

export function antiqueShopDepthFromGround(
  groundAnchorWorldY: number,
  depthOffset = 0,
): number {
  return 2 + groundAnchorWorldY / 1000 + depthOffset;
}

export function createAntiqueShopInterior(
  scene: Phaser.Scene,
): AntiqueShopInterior {
  const counterX = 640;
  const counterGroundY = 318;
  const obstacles = scene.physics.add.staticGroup();

  createArchitecturalShell(scene);
  createBackWallDisplays(scene);
  createTallCabinet(scene, obstacles, 180, 500, false);
  createTallCabinet(scene, obstacles, 1100, 500, true);
  createDisplayTable(scene, obstacles, 345, 512, 'vessel');
  createDisplayTable(scene, obstacles, 935, 512, 'mirror');
  createCounter(scene, obstacles, counterX, counterGroundY);
  createBackDoor(scene);
  createHangingLanterns(scene);
  const shopkeeperVisual = createShopkeeperVisual(scene, counterX, 250);
  const shopkeeper = shopkeeperVisual.container.setDepth(
    antiqueShopDepthFromGround(250),
  );
  const interactionHighlight = createInteractionHighlight(scene);

  addObstacle(scene, obstacles, 640, 67, 1120, 54);
  addObstacle(scene, obstacles, 62, 375, 44, 650);
  addObstacle(scene, obstacles, 1218, 375, 44, 650);
  addObstacle(scene, obstacles, 285, 702, 490, 36);
  addObstacle(scene, obstacles, 995, 702, 490, 36);

  return {
    obstacles,
    shopkeeper,
    shopkeeperVisual,
    interactionHighlight,
    counterX,
    counterY: counterGroundY,
    interactionX: 640,
    interactionY: 382,
    interactionRadius: 116,
    promptX: 795,
    promptY: 356,
    artifactX: 720,
    artifactY: 248,
  };
}

function createArchitecturalShell(scene: Phaser.Scene): void {
  scene.add.rectangle(640, 360, 1280, 720, 0x100e0c).setDepth(-3);

  const floor = scene.add.graphics().setDepth(0);
  floor.fillStyle(0x46362a, 1);
  floor.fillRect(82, 112, 1116, 578);
  floor.fillStyle(0x332820, 1);
  floor.fillTriangle(82, 112, 124, 144, 82, 690);
  floor.fillTriangle(1198, 112, 1156, 144, 1198, 690);

  floor.lineStyle(1, 0x9b7957, 0.2);
  for (let y = 142; y < 690; y += 44) {
    floor.lineBetween(82, y, 1198, y);
  }
  for (let row = 0, y = 142; y < 690; row += 1, y += 44) {
    const offset = row % 2 === 0 ? 0 : 52;
    for (let x = 110 + offset; x < 1198; x += 104) {
      floor.lineBetween(x, y, x, Math.min(y + 44, 690));
    }
  }
  floor.lineStyle(1, 0x1b1713, 0.18);
  for (let index = 0; index < 28; index += 1) {
    const x = 120 + ((index * 173) % 1020);
    const y = 170 + ((index * 97) % 470);
    floor.lineBetween(x, y, x + 18 + (index % 4) * 8, y + (index % 3) - 1);
  }

  const centralRug = scene.add.graphics().setDepth(0.18);
  centralRug.fillStyle(0x56302d, 0.86);
  centralRug.fillRoundedRect(442, 352, 396, 250, 10);
  centralRug.lineStyle(3, 0xa47750, 0.72);
  centralRug.strokeRoundedRect(442, 352, 396, 250, 10);
  centralRug.lineStyle(1, 0xc1a16e, 0.35);
  centralRug.strokeRoundedRect(458, 368, 364, 218, 6);
  strokeDiamond(centralRug, 640, 477, 210, 116);

  const entranceRunner = scene.add.graphics().setDepth(0.2);
  entranceRunner.fillStyle(0x25342f, 0.9);
  entranceRunner.fillRect(555, 566, 170, 124);
  entranceRunner.lineStyle(2, 0x839079, 0.6);
  entranceRunner.strokeRect(555, 566, 170, 124);
  entranceRunner.lineStyle(1, 0xb09d76, 0.28);
  for (let y = 580; y < 684; y += 18) {
    entranceRunner.lineBetween(565, y, 715, y);
  }

  const backWall = scene.add.graphics().setDepth(1.05);
  backWall.fillStyle(0x2b211b, 1);
  backWall.fillRect(82, 44, 1116, 112);
  backWall.fillStyle(0x3d2d22, 1);
  backWall.fillPoints([
    new Phaser.Geom.Point(82, 44),
    new Phaser.Geom.Point(1198, 44),
    new Phaser.Geom.Point(1166, 72),
    new Phaser.Geom.Point(114, 72),
  ], true);
  backWall.lineStyle(2, 0x98734e, 0.72);
  backWall.lineBetween(114, 72, 1166, 72);
  backWall.lineBetween(82, 156, 1198, 156);
  for (let x = 142; x < 1190; x += 116) {
    backWall.lineStyle(1, 0x8c6948, 0.35);
    backWall.strokeRect(x, 82, 84, 56);
  }

  const sideWalls = scene.add.graphics().setDepth(1.08);
  sideWalls.fillStyle(0x251d18, 1);
  sideWalls.fillRect(38, 44, 44, 646);
  sideWalls.fillRect(1198, 44, 44, 646);
  sideWalls.fillStyle(0x463326, 1);
  sideWalls.fillPoints([
    new Phaser.Geom.Point(38, 44),
    new Phaser.Geom.Point(82, 44),
    new Phaser.Geom.Point(114, 72),
    new Phaser.Geom.Point(70, 72),
  ], true);
  sideWalls.fillPoints([
    new Phaser.Geom.Point(1198, 44),
    new Phaser.Geom.Point(1242, 44),
    new Phaser.Geom.Point(1210, 72),
    new Phaser.Geom.Point(1166, 72),
  ], true);

  const lightPools = scene.add.graphics().setDepth(0.42);
  lightPools.fillStyle(0xd49355, 0.07);
  lightPools.fillEllipse(415, 350, 330, 330);
  lightPools.fillEllipse(865, 350, 330, 330);
  lightPools.fillStyle(0xf0c777, 0.035);
  lightPools.fillEllipse(640, 430, 450, 360);

  const threshold = scene.add.graphics().setDepth(2.73);
  threshold.fillStyle(0x251b16, 1);
  threshold.fillRect(520, 684, 240, 18);
  threshold.lineStyle(2, 0xa47b52, 0.75);
  threshold.lineBetween(520, 684, 760, 684);
}

function createBackWallDisplays(scene: Phaser.Scene): void {
  const display = scene.add.graphics().setDepth(1.25);
  for (const centerX of [285, 995]) {
    display.fillStyle(0x171411, 0.96);
    display.fillRoundedRect(centerX - 112, 84, 224, 58, 4);
    display.lineStyle(2, 0x8f714d, 0.72);
    display.strokeRoundedRect(centerX - 112, 84, 224, 58, 4);
    display.lineStyle(1, 0xc0a66e, 0.28);
    display.lineBetween(centerX - 92, 125, centerX + 92, 125);

    display.fillStyle(0x6f654c, 0.9);
    display.fillEllipse(centerX - 58, 108, 31, 36);
    display.fillStyle(0x485a52, 0.92);
    display.fillCircle(centerX, 108, 18);
    display.lineStyle(3, 0x809084, 0.8);
    display.strokeCircle(centerX, 108, 18);
    display.fillStyle(0x806044, 0.92);
    display.fillRoundedRect(centerX + 48, 91, 30, 34, 5);
  }

  const scrolls = scene.add.graphics().setDepth(1.28);
  for (const x of [450, 830]) {
    scrolls.fillStyle(0x9e8a66, 0.78);
    scrolls.fillRect(x - 28, 82, 56, 60);
    scrolls.lineStyle(2, 0x3d3026, 0.7);
    scrolls.lineBetween(x - 23, 82, x - 23, 142);
    scrolls.lineStyle(1, 0x574538, 0.48);
    scrolls.lineBetween(x - 12, 101, x + 16, 101);
    scrolls.lineBetween(x - 8, 113, x + 12, 113);
  }
}

function createTallCabinet(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  groundY: number,
  mirror: boolean,
): void {
  const shadow = scene.add.ellipse(0, -4, 158, 42, 0x090706, 0.45);
  const cabinet = scene.add.graphics();
  cabinet.fillStyle(0x3b291e, 1);
  cabinet.fillRoundedRect(-68, -282, 136, 276, 4);
  cabinet.fillStyle(0x563a28, 1);
  cabinet.fillPoints([
    new Phaser.Geom.Point(-68, -282),
    new Phaser.Geom.Point(-38, -302),
    new Phaser.Geom.Point(83, -302),
    new Phaser.Geom.Point(68, -282),
  ], true);
  cabinet.fillStyle(0x2c211b, 1);
  cabinet.fillPoints([
    new Phaser.Geom.Point(68, -282),
    new Phaser.Geom.Point(83, -302),
    new Phaser.Geom.Point(83, -32),
    new Phaser.Geom.Point(68, -6),
  ], true);
  cabinet.lineStyle(3, 0x936b45, 0.86);
  cabinet.strokeRoundedRect(-68, -282, 136, 276, 4);
  cabinet.lineStyle(2, 0x8b6747, 0.68);
  for (const shelfY of [-225, -166, -107, -48]) {
    cabinet.lineBetween(-58, shelfY, 58, shelfY);
  }

  const itemColors = [0x7a6c50, 0x40564e, 0x8b5b3f, 0x9a8b6b];
  for (let shelf = 0; shelf < 4; shelf += 1) {
    const shelfY = -247 + shelf * 59;
    cabinet.fillStyle(itemColors[shelf], 0.95);
    cabinet.fillEllipse(-31, shelfY, 28 + shelf * 2, 34);
    cabinet.fillStyle(itemColors[(shelf + 1) % itemColors.length], 0.9);
    cabinet.fillRoundedRect(15, shelfY - 18, 32, 35, 5);
    cabinet.lineStyle(1, 0xc5ab79, 0.42);
    cabinet.strokeCircle(-31, shelfY, 10 + (shelf % 2) * 4);
  }

  const container = scene.add.container(x, groundY, [shadow, cabinet])
    .setDepth(antiqueShopDepthFromGround(groundY));
  if (mirror) {
    container.setScale(-1, 1);
  }
  addObstacle(scene, obstacles, x, groundY - 18, 140, 38);
}

function createDisplayTable(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  groundY: number,
  artifact: 'vessel' | 'mirror',
): void {
  const shadow = scene.add.ellipse(0, -2, 176, 46, 0x080706, 0.42);
  const table = scene.add.graphics();
  table.fillStyle(0x513725, 1);
  table.fillPoints([
    new Phaser.Geom.Point(-82, -72),
    new Phaser.Geom.Point(55, -72),
    new Phaser.Geom.Point(82, -52),
    new Phaser.Geom.Point(-55, -52),
  ], true);
  table.fillStyle(0x37261d, 1);
  table.fillRect(-55, -52, 137, 45);
  table.fillStyle(0x2c211b, 1);
  table.fillPoints([
    new Phaser.Geom.Point(-82, -72),
    new Phaser.Geom.Point(-55, -52),
    new Phaser.Geom.Point(-55, -7),
    new Phaser.Geom.Point(-82, -28),
  ], true);
  table.lineStyle(2, 0x9c744d, 0.82);
  table.lineBetween(-82, -72, 55, -72);
  table.lineBetween(55, -72, 82, -52);
  table.lineBetween(82, -52, -55, -52);
  table.lineBetween(-55, -52, -82, -72);

  const displayObject = scene.add.graphics();
  if (artifact === 'vessel') {
    displayObject.fillStyle(0x897557, 1);
    displayObject.fillEllipse(0, -94, 50, 62);
    displayObject.fillRect(-14, -129, 28, 16);
    displayObject.lineStyle(2, 0xc0a879, 0.68);
    displayObject.strokeEllipse(0, -94, 50, 62);
    displayObject.lineBetween(-18, -100, 18, -100);
  } else {
    displayObject.lineStyle(6, 0x758980, 0.95);
    displayObject.strokeCircle(0, -102, 31);
    displayObject.lineStyle(2, 0xb3c2af, 0.52);
    displayObject.strokeCircle(0, -102, 24);
    displayObject.fillStyle(0x5d4932, 1);
    displayObject.fillRoundedRect(-6, -72, 12, 26, 4);
  }

  scene.add.container(x, groundY, [shadow, table, displayObject])
    .setDepth(antiqueShopDepthFromGround(groundY));
  addObstacle(scene, obstacles, x, groundY - 25, 150, 50);
}

function createCounter(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  groundY: number,
): void {
  const shadow = scene.add.ellipse(0, -2, 610, 78, 0x080605, 0.4);
  const counter = scene.add.graphics();
  counter.fillStyle(0x684833, 1);
  counter.fillPoints([
    new Phaser.Geom.Point(-280, -92),
    new Phaser.Geom.Point(230, -92),
    new Phaser.Geom.Point(280, -55),
    new Phaser.Geom.Point(-230, -55),
  ], true);
  counter.fillStyle(0x4a3125, 1);
  counter.fillRect(-230, -55, 510, 55);
  counter.fillStyle(0x38261e, 1);
  counter.fillPoints([
    new Phaser.Geom.Point(-280, -92),
    new Phaser.Geom.Point(-230, -55),
    new Phaser.Geom.Point(-230, 0),
    new Phaser.Geom.Point(-280, -36),
  ], true);
  counter.lineStyle(3, 0xb48658, 0.92);
  counter.lineBetween(-280, -92, 230, -92);
  counter.lineBetween(230, -92, 280, -55);
  counter.lineBetween(280, -55, -230, -55);
  counter.lineBetween(-230, -55, -280, -92);
  counter.lineBetween(-230, 0, 280, 0);
  counter.lineStyle(1, 0x9b744e, 0.56);
  for (const panelX of [-145, 0, 145]) {
    counter.strokeRect(panelX - 56, -43, 112, 32);
  }

  const ledger = scene.add.graphics();
  ledger.fillStyle(0x28251f, 1);
  ledger.fillPoints([
    new Phaser.Geom.Point(-58, -84),
    new Phaser.Geom.Point(4, -86),
    new Phaser.Geom.Point(42, -72),
    new Phaser.Geom.Point(-20, -69),
  ], true);
  ledger.lineStyle(1, 0xc0a978, 0.58);
  ledger.strokePoints([
    new Phaser.Geom.Point(-58, -84),
    new Phaser.Geom.Point(4, -86),
    new Phaser.Geom.Point(42, -72),
    new Phaser.Geom.Point(-20, -69),
  ], true);

  scene.add.container(x, groundY, [shadow, counter, ledger])
    .setDepth(antiqueShopDepthFromGround(groundY));
  addObstacle(scene, obstacles, x, groundY - 29, 550, 58);
}

function createBackDoor(scene: Phaser.Scene): void {
  const door = scene.add.graphics().setDepth(1.4);
  door.fillStyle(0x171411, 1);
  door.fillRoundedRect(565, 68, 150, 128, 3);
  door.lineStyle(3, 0x9d754d, 0.9);
  door.strokeRoundedRect(565, 68, 150, 128, 3);
  door.lineBetween(640, 70, 640, 195);
  door.lineStyle(1, 0x8a6b4c, 0.62);
  door.strokeRect(580, 84, 48, 92);
  door.strokeRect(652, 84, 48, 92);
  door.fillStyle(0xc19c62, 0.75);
  door.fillCircle(664, 135, 4);

  scene.add.text(640, 51, '藏 / PRIVATE', {
    fontFamily: VISUAL_THEME.fonts.serif,
    fontSize: '12px',
    color: '#c7b58f',
  }).setOrigin(0.5).setDepth(1.45);
}

function createHangingLanterns(scene: Phaser.Scene): void {
  for (const [index, x] of [420, 860].entries()) {
    const glow = scene.add.ellipse(x, 205, 190, 170, 0xd98a45, 0.055)
      .setDepth(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.035, to: 0.075 },
      scaleX: { from: 0.96, to: 1.04 },
      duration: 1300 + index * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const lantern = scene.add.graphics().setDepth(1.7);
    lantern.lineStyle(2, 0x574333, 0.95);
    lantern.lineBetween(x, 44, x, 93);
    lantern.fillStyle(0x3b2b22, 1);
    lantern.fillRect(x - 24, 93, 48, 10);
    lantern.fillStyle(0x8e4634, 0.96);
    lantern.fillRoundedRect(x - 20, 103, 40, 49, 8);
    lantern.lineStyle(2, 0xc99158, 0.82);
    lantern.strokeRoundedRect(x - 20, 103, 40, 49, 8);
    lantern.lineBetween(x - 20, 122, x + 20, 122);
    lantern.lineBetween(x, 103, x, 152);
    lantern.fillStyle(0xf1b45f, 0.86);
    lantern.fillCircle(x, 127, 6);
    lantern.lineStyle(2, 0x574333, 0.95);
    lantern.lineBetween(x, 152, x, 166);
  }
}

function createInteractionHighlight(
  scene: Phaser.Scene,
): Phaser.GameObjects.Graphics {
  const highlight = scene.add.graphics().setDepth(3.4).setVisible(false);
  highlight.lineStyle(2, VISUAL_THEME.colors.antiqueGold, 0.68);
  highlight.strokeRoundedRect(354, 214, 572, 112, 7);
  highlight.strokeEllipse(640, 207, 76, 96);
  return highlight;
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

function strokeDiamond(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  graphics.strokePoints([
    new Phaser.Geom.Point(x, y - height / 2),
    new Phaser.Geom.Point(x + width / 2, y),
    new Phaser.Geom.Point(x, y + height / 2),
    new Phaser.Geom.Point(x - width / 2, y),
  ], true);
}
