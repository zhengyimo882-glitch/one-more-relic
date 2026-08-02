import Phaser from 'phaser';
import { DEFAULT_PLAYER_APPEARANCE_ID } from '../data/playerAppearances';
import {
  TOMB_25D_ASSET_LIST,
  TOMB_25D_ASSETS,
  type Tomb25DAssetDefinition,
  type Tomb25DFootprint,
} from '../data/tomb25DAssetManifest';
import { Player } from '../objects/Player';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1050;
const WORLD_DEPTH_BASE = 1000;
const PLAYER_GROUND_OFFSET = 28;

const TOMB_MAIN_TEXTURE = 'tomb25d-existing-main-sheet';
const TOMB_DECOR_TEXTURE = 'tomb25d-existing-decor-sheet';
const TORCH_ANIMATION = 'tomb25d-existing-torch-loop';

type ManifestPlacement = {
  definition: Tomb25DAssetDefinition;
  x: number;
  y: number;
};

export class Tomb25DPrototypeScene extends Phaser.Scene {
  private player?: Player;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private collisionDebug?: Phaser.GameObjects.Graphics;
  private collisionDebugLabel?: Phaser.GameObjects.Text;
  private collisionDebugEnabled = false;
  private reachedNorthGoal = false;

  constructor() {
    super('Tomb25DPrototypeScene');
  }

  preload(): void {
    for (const asset of TOMB_25D_ASSET_LIST) {
      this.load.image(asset.key, asset.sourcePath);
    }

    this.load.image(TOMB_MAIN_TEXTURE, 'assets/imported/tomb_asset_pack/mainlevbuild.png');
    this.load.image(TOMB_DECOR_TEXTURE, 'assets/imported/tomb_asset_pack/decorative.png');
    for (let frame = 1; frame <= 4; frame += 1) {
      this.load.image(
        `tomb25d-existing-torch-${frame}`,
        `assets/imported/tomb_asset_pack/torch_${frame}.png`,
      );
    }
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.collisionDebugEnabled = new URLSearchParams(window.location.search)
      .get('collisionDebug') === '1';

    this.configureTextureFiltering();
    this.registerExistingTombFrames();
    this.registerTorchAnimation();

    this.createWorldBackdrop();
    this.createGroundLayout();
    this.obstacles = this.physics.add.staticGroup();
    this.collisionDebug = this.add.graphics().setDepth(9_800);

    this.createSpatialBoundaries();
    this.createTombPlaceholders();
    this.createPlayer();
    this.createCamera();
    this.createPrototypeUI();
    this.refreshCollisionDebug();

    this.input.keyboard?.on('keydown-F3', () => {
      this.collisionDebugEnabled = !this.collisionDebugEnabled;
      this.refreshCollisionDebug();
    });
  }

  update(): void {
    if (!this.player) {
      return;
    }

    this.player.update();
    this.player.setDepth(this.depthFromGround(this.player.y + PLAYER_GROUND_OFFSET));

    if (!this.reachedNorthGoal && Phaser.Math.Distance.Between(this.player.x, this.player.y, 800, 365) < 82) {
      this.reachedNorthGoal = true;
      this.showGoalReachedFeedback();
    }
  }

  private configureTextureFiltering(): void {
    for (const asset of TOMB_25D_ASSET_LIST) {
      this.textures.get(asset.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    const pixelTextureKeys = [
      TOMB_MAIN_TEXTURE,
      TOMB_DECOR_TEXTURE,
      ...Array.from({ length: 4 }, (_, index) => `tomb25d-existing-torch-${index + 1}`),
    ];
    for (const textureKey of pixelTextureKeys) {
      this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  private registerExistingTombFrames(): void {
    const mainTexture = this.textures.get(TOMB_MAIN_TEXTURE);
    if (!mainTexture.has('prototype-gate-bars')) {
      mainTexture.add('prototype-gate-bars', 0, 496, 48, 128, 64);
    }

    const decorTexture = this.textures.get(TOMB_DECOR_TEXTURE);
    if (!decorTexture.has('prototype-coffin')) {
      decorTexture.add('prototype-coffin', 0, 0, 64, 48, 32);
    }
  }

  private registerTorchAnimation(): void {
    if (!this.anims.exists(TORCH_ANIMATION)) {
      this.anims.create({
        key: TORCH_ANIMATION,
        frames: Array.from({ length: 4 }, (_, index) => ({
          key: `tomb25d-existing-torch-${index + 1}`,
        })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private createWorldBackdrop(): void {
    this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x101514,
    ).setDepth(-100);

    const atmosphere = this.add.graphics().setDepth(-90);
    atmosphere.fillStyle(0x27302e, 0.55);
    atmosphere.fillEllipse(800, 600, 1300, 900);
    atmosphere.lineStyle(2, 0x809082, 0.16);
    atmosphere.strokeRect(170, 80, 1260, 890);
  }

  private createGroundLayout(): void {
    this.placeManifestImage(TOMB_25D_ASSETS.earthPatch3x3, 800, 610);
    this.placeManifestImage(TOMB_25D_ASSETS.earthPatch3x3, 800, 920);
    this.placeManifestImage(TOMB_25D_ASSETS.transitwayJunction, 800, 720);
    this.placeManifestImage(TOMB_25D_ASSETS.transitwayDiagonal, 800, 950);

    const layoutGuide = this.add.graphics().setDepth(120);
    layoutGuide.lineStyle(2, 0xc6b58d, 0.2);
    this.strokeDiamond(layoutGuide, 800, 650, 640, 350);
    this.strokeDiamond(layoutGuide, 475, 675, 260, 155);
    this.strokeDiamond(layoutGuide, 1125, 675, 260, 155);
    this.strokeDiamond(layoutGuide, 800, 350, 320, 180);
  }

  private createSpatialBoundaries(): void {
    const placements: ManifestPlacement[] = [
      { definition: TOMB_25D_ASSETS.buildingS2A, x: 440, y: 650 },
      { definition: TOMB_25D_ASSETS.buildingS2B, x: 1160, y: 650 },
      { definition: TOMB_25D_ASSETS.buildingS2C, x: 800, y: 285 },
      { definition: TOMB_25D_ASSETS.rubbleA, x: 590, y: 720 },
      { definition: TOMB_25D_ASSETS.rubbleB, x: 1015, y: 720 },
      { definition: TOMB_25D_ASSETS.rubbleC, x: 920, y: 515 },
    ];

    for (const placement of placements) {
      this.createGroundFootprintShadow(placement);
      this.placeManifestImage(placement.definition, placement.x, placement.y);
      if (placement.definition.collides) {
        this.addFootprintCollision(
          placement.x,
          placement.y,
          placement.definition.footprint,
        );
      }
    }

    // Restrict wandering to the composed test space without making a maze.
    this.addStaticCollision(205, 530, 70, 880);
    this.addStaticCollision(1395, 530, 70, 880);
    this.addStaticCollision(800, 70, 1120, 50);
    this.addStaticCollision(530, 995, 580, 50);
    this.addStaticCollision(1070, 995, 580, 50);
  }

  private createTombPlaceholders(): void {
    const gateGroundY = 330;
    this.add.image(800, gateGroundY, TOMB_MAIN_TEXTURE, 'prototype-gate-bars')
      .setOrigin(0.5, 1)
      .setScale(1.15)
      .setDepth(this.depthFromGround(gateGroundY));
    this.addStaticCollision(800, gateGroundY - 10, 132, 26);

    const coffinGroundY = 610;
    this.add.ellipse(800, coffinGroundY - 6, 116, 42, 0x050606, 0.36)
      .setDepth(this.depthFromGround(coffinGroundY, -2));
    this.add.image(800, coffinGroundY, TOMB_DECOR_TEXTURE, 'prototype-coffin')
      .setOrigin(0.5, 1)
      .setScale(2.25)
      .setDepth(this.depthFromGround(coffinGroundY));
    this.addStaticCollision(800, coffinGroundY - 16, 92, 32);

    for (const [index, x] of [742, 858].entries()) {
      const torchGroundY = 360;
      const torch = this.add.sprite(x, torchGroundY, 'tomb25d-existing-torch-1')
        .setOrigin(0.5, 1)
        .setScale(2)
        .setDepth(this.depthFromGround(torchGroundY, 2));
      torch.play({ key: TORCH_ANIMATION, startFrame: index * 2 });
    }

    this.add.zone(800, 365, 140, 90).setName('north-goal-zone');
  }

  private createPlayer(): void {
    this.player = new Player(
      this,
      800,
      900,
      DEFAULT_PLAYER_APPEARANCE_ID,
      'isometric',
    );
    this.player.setDepth(this.depthFromGround(this.player.y + PLAYER_GROUND_OFFSET));

    if (this.obstacles) {
      this.physics.add.collider(this.player, this.obstacles);
    }
  }

  private createCamera(): void {
    if (!this.player) {
      return;
    }

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setBackgroundColor('#101514');

    if (new URLSearchParams(window.location.search).get('overview') === '1') {
      camera.setZoom(Math.min(1280 / WORLD_WIDTH, 720 / WORLD_HEIGHT));
      camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
      return;
    }

    camera.startFollow(this.player, true, 0.1, 0.1);
    camera.setDeadzone(150, 90);
  }

  private createPrototypeUI(): void {
    const panel = this.add.rectangle(18, 18, 430, 108, 0x101514, 0.86)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10_000)
      .setStrokeStyle(1, 0xb7a77e, 0.55);
    const title = this.add.text(36, 32, 'Tomb 2.5D Prototype / 伪2.5D技术样板', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#e5d8b9',
    }).setScrollFactor(0).setDepth(10_001);
    const instructions = this.add.text(
      36,
      61,
      'W/A/S/D：沿等距轴移动\nW+A：视觉正上方　F3：碰撞脚印',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineSpacing: 7,
        color: '#bfc9bd',
      },
    ).setScrollFactor(0).setDepth(10_001);

    this.collisionDebugLabel = this.add.text(36, 110, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ff8b6b',
    }).setScrollFactor(0).setDepth(10_001);

    panel.setData('prototype-ui', true);
    title.setData('prototype-ui', true);
    instructions.setData('prototype-ui', true);
  }

  private placeManifestImage(
    definition: Tomb25DAssetDefinition,
    groundAnchorWorldX: number,
    groundAnchorWorldY: number,
  ): Phaser.GameObjects.Image {
    return this.add.image(groundAnchorWorldX, groundAnchorWorldY, definition.key)
      .setOrigin(definition.originX, definition.originY)
      .setScale(definition.displayScale)
      .setDepth(this.depthFromGround(groundAnchorWorldY, definition.depthOffset))
      .setData('groundAnchorWorldX', groundAnchorWorldX)
      .setData('groundAnchorWorldY', groundAnchorWorldY)
      .setData('foregroundOccluder', definition.foregroundOccluder);
  }

  private createGroundFootprintShadow(placement: ManifestPlacement): void {
    const footprint = placement.definition.footprint;
    this.add.ellipse(
      placement.x + footprint.offsetX + footprint.width / 2,
      placement.y + footprint.offsetY + footprint.height / 2,
      footprint.width * 1.08,
      footprint.height * 1.15,
      0x030606,
      0.32,
    ).setDepth(this.depthFromGround(placement.y, -3));
  }

  private addFootprintCollision(
    groundAnchorWorldX: number,
    groundAnchorWorldY: number,
    footprint: Tomb25DFootprint,
  ): void {
    this.addStaticCollision(
      groundAnchorWorldX + footprint.offsetX + footprint.width / 2,
      groundAnchorWorldY + footprint.offsetY + footprint.height / 2,
      footprint.width,
      footprint.height,
    );
  }

  private addStaticCollision(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (!this.obstacles) {
      return;
    }

    const collision = this.add.rectangle(x, y, width, height, 0x000000, 0);
    collision.setData('collisionFootprint', { x, y, width, height });
    this.obstacles.add(collision);
  }

  private refreshCollisionDebug(): void {
    this.collisionDebug?.clear();
    this.collisionDebug?.setVisible(this.collisionDebugEnabled);
    this.collisionDebugLabel?.setText(
      this.collisionDebugEnabled ? 'COLLISION FOOTPRINTS: ON' : '',
    );

    if (!this.collisionDebugEnabled || !this.collisionDebug || !this.obstacles) {
      return;
    }

    this.collisionDebug.lineStyle(2, 0xff704d, 0.95);
    for (const child of this.obstacles.getChildren()) {
      const footprint = (child as Phaser.GameObjects.GameObject).getData('collisionFootprint') as
        | { x: number; y: number; width: number; height: number }
        | undefined;
      if (footprint) {
        this.collisionDebug.strokeRect(
          footprint.x - footprint.width / 2,
          footprint.y - footprint.height / 2,
          footprint.width,
          footprint.height,
        );
      }
    }
  }

  private showGoalReachedFeedback(): void {
    const message = this.add.text(800, 390, '终点已到达 / Prototype route complete', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#f2dfac',
      backgroundColor: '#17201dcc',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(9_500);

    this.tweens.add({
      targets: message,
      alpha: 0.45,
      duration: 650,
      yoyo: true,
      repeat: 1,
    });
  }

  private strokeDiamond(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
  ): void {
    graphics.strokePoints([
      new Phaser.Geom.Point(centerX, centerY - height / 2),
      new Phaser.Geom.Point(centerX + width / 2, centerY),
      new Phaser.Geom.Point(centerX, centerY + height / 2),
      new Phaser.Geom.Point(centerX - width / 2, centerY),
    ], true);
  }

  private depthFromGround(groundAnchorWorldY: number, depthOffset = 0): number {
    return WORLD_DEPTH_BASE + groundAnchorWorldY + depthOffset;
  }
}
