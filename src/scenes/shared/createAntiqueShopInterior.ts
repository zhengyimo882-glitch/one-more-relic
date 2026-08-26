import Phaser from 'phaser';
import {
  createShopkeeperVisual,
  type ShopkeeperVisual,
} from '../../visuals/createShopkeeperVisual';
import { createShopWorldCue } from '../../ui/createShopWorldCue';
import { ART_TOKENS } from '../../config/artTokens';

export const ANTIQUE_SHOP_WIDTH = 1280;
export const ANTIQUE_SHOP_HEIGHT = 720;

const SHOP_ART_ROOT = 'assets/generated/antique_shop_original_v2';
const SHOP_TOPDOWN_ART_ROOT = 'assets/generated/antique_shop_topdown_v1';
const TOMB_ART_ROOT = 'assets/art-v2/artifacts/world';

export const SHOP_INTERIOR_TEXTURES = {
  background: 'shop-topdown-v1-background',
  brassTally: 'shop-original-v2-brass-tally',
  commissionTools: 'shop-original-v2-commission-tools',
  displayCabinet: 'shop-topdown-v1-display-cabinet',
  displayCloth: 'shop-topdown-v1-display-cloth',
  burialVessel: 'shop-original-v2-burial-vessel',
  bronzeMirror: 'shop-original-v2-bronze-mirror',
  geomancersCompass: 'shop-original-v2-geomancers-compass',
} as const;

export const SHOP_LAYOUT = {
  playerSpawn: { x: 640, y: 660 },
  counter: {
    x: 640,
    y: 154,
    interactionX: 640,
    interactionY: 260,
    interactionRadius: 104,
    promptX: 790,
    promptY: 238,
    artifactX: 705,
    artifactY: 155,
  },
  stations: {
    incoming: { x: 250, y: 585, radius: 94 },
    workbench: { x: 640, y: 485, radius: 100 },
    sell: { x: 1015, y: 585, radius: 92 },
    collect: { x: 1080, y: 360, radius: 84 },
    research: { x: 190, y: 370, radius: 84 },
    pledge: { x: 190, y: 225, radius: 82 },
    atlas: { x: 1040, y: 220, radius: 84 },
    display: { x: 970, y: 455, radius: 88 },
  },
} as const;

export interface AntiqueShopInterior {
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  shopkeeper: Phaser.GameObjects.Container;
  shopkeeperVisual: ShopkeeperVisual;
  interactionHighlight: Phaser.GameObjects.Container;
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

export function preloadAntiqueShopInteriorAssets(scene: Phaser.Scene): void {
  const loadImage = (key: string, path: string): void => {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, path);
    }
  };

  loadImage(
    SHOP_INTERIOR_TEXTURES.background,
    `${SHOP_TOPDOWN_ART_ROOT}/shop_topdown_background.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.brassTally,
    `${SHOP_ART_ROOT}/brass_tally.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.commissionTools,
    `${SHOP_ART_ROOT}/commission_tools.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.displayCabinet,
    `${SHOP_TOPDOWN_ART_ROOT}/display_cabinet.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.displayCloth,
    `${SHOP_TOPDOWN_ART_ROOT}/display_cloth.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.burialVessel,
    `${TOMB_ART_ROOT}/burial-vessel-v2-world.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.bronzeMirror,
    `${TOMB_ART_ROOT}/bronze-mirror-v2-world.png`,
  );
  loadImage(
    SHOP_INTERIOR_TEXTURES.geomancersCompass,
    `${TOMB_ART_ROOT}/geomancers-compass-v2-world.png`,
  );
}

export function antiqueShopDepthFromGround(
  groundAnchorWorldY: number,
  depthOffset = 0,
): number {
  return ART_TOKENS.depth.fromFootY(groundAnchorWorldY, depthOffset);
}

export function createAntiqueShopInterior(
  scene: Phaser.Scene,
): AntiqueShopInterior {
  const counterX = SHOP_LAYOUT.counter.x;
  const counterGroundY = SHOP_LAYOUT.counter.y;
  const obstacles = scene.physics.add.staticGroup();

  setShopTextureFiltering(scene);
  scene.add
    .image(ANTIQUE_SHOP_WIDTH / 2, ANTIQUE_SHOP_HEIGHT / 2, SHOP_INTERIOR_TEXTURES.background)
    .setDisplaySize(ANTIQUE_SHOP_WIDTH, ANTIQUE_SHOP_HEIGHT)
    .setDepth(-2);

  const shopkeeperVisual = createShopkeeperVisual(scene, counterX, 112);
  const shopkeeper = shopkeeperVisual.container.setDepth(
    antiqueShopDepthFromGround(112),
  );
  const interactionHighlight = createInteractionHighlight(scene);

  // Collision footprints match the furniture painted into the orthographic
  // background. The south door remains a clear 240 px entrance corridor.
  addObstacle(scene, obstacles, 640, 24, 1160, 48);
  addObstacle(scene, obstacles, 28, 360, 56, 720);
  addObstacle(scene, obstacles, 1252, 360, 56, 720);
  addObstacle(scene, obstacles, 250, 704, 500, 32);
  addObstacle(scene, obstacles, 1030, 704, 500, 32);
  addObstacle(scene, obstacles, 640, 145, 570, 166);
  addObstacle(scene, obstacles, 640, 385, 300, 150);
  addObstacle(scene, obstacles, 250, 600, 190, 112);
  addObstacle(scene, obstacles, 1015, 600, 205, 112);
  addObstacle(scene, obstacles, 1180, 365, 88, 390);
  addObstacle(scene, obstacles, 100, 380, 82, 330);
  addObstacle(scene, obstacles, 185, 137, 145, 120);
  addObstacle(scene, obstacles, 1050, 130, 160, 112);

  return {
    obstacles,
    shopkeeper,
    shopkeeperVisual,
    interactionHighlight,
    counterX,
    counterY: counterGroundY,
    interactionX: SHOP_LAYOUT.counter.interactionX,
    interactionY: SHOP_LAYOUT.counter.interactionY,
    interactionRadius: SHOP_LAYOUT.counter.interactionRadius,
    promptX: SHOP_LAYOUT.counter.promptX,
    promptY: SHOP_LAYOUT.counter.promptY,
    artifactX: SHOP_LAYOUT.counter.artifactX,
    artifactY: SHOP_LAYOUT.counter.artifactY,
  };
}

function setShopTextureFiltering(scene: Phaser.Scene): void {
  Object.values(SHOP_INTERIOR_TEXTURES).forEach((key) => {
    const texture = scene.textures.get(key);
    if (texture.key !== '__MISSING') {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  });
}

function createInteractionHighlight(
  scene: Phaser.Scene,
): Phaser.GameObjects.Container {
  return createShopWorldCue(scene, 220, 70)
    .setPosition(
      SHOP_LAYOUT.counter.interactionX,
      SHOP_LAYOUT.counter.interactionY,
    )
    .setVisible(false);
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
