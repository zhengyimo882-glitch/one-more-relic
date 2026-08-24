import Phaser from 'phaser';
import {
  createStyleBoardButtonBackground,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
  UI_STYLE_BOARD,
  type StyleBoardButtonState,
} from '../ui/styleBoardUi';
import { InputActionManager } from '../input/InputActionManager';
import { SceneTransitionController, markSceneInteractive } from '../systems/SceneTransitionController';
import { polishSceneTypography, setTypographyRole } from '../ui/gameTypography';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const MAIN_MENU_BACKGROUND = 'main-menu-doorway-v1';
const MAIN_MENU_GLOW = 'main-menu-soft-glow';

export class MainMenuScene extends Phaser.Scene {
  private isStarting = false;
  private inputActions?: InputActionManager;
  private transitionController?: SceneTransitionController;
  private startAction?: () => void;

  constructor() {
    super('MainMenuScene');
  }

  preload(): void {
    if (!this.textures.exists(MAIN_MENU_BACKGROUND)) {
      this.load.image(
        MAIN_MENU_BACKGROUND,
        'assets/generated/main_menu_v1/main_menu_doorway.png',
      );
    }
  }

  create(): void {
    this.isStarting = false;
    this.inputActions = InputActionManager.forScene(this);
    this.inputActions.setContext('main-menu');
    this.transitionController = new SceneTransitionController(this, this.inputActions);

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#050605');
    const backdrop = this.add.image(width / 2, height / 2, MAIN_MENU_BACKGROUND);
    const coverScale = Math.max(width / backdrop.width, height / backdrop.height);
    backdrop.setScale(coverScale);
    this.createSoftGlowTexture();
    this.createLivingLights(width, height);

    const atmosphereShade = this.add.graphics();
    atmosphereShade.fillGradientStyle(
      0x030403,
      0x030403,
      0x030403,
      0x030403,
      0.62,
      0.62,
      0,
      0,
    );
    atmosphereShade.fillRect(0, 0, width, 270);
    atmosphereShade.fillGradientStyle(
      0x030403,
      0x030403,
      0x030403,
      0x030403,
      0,
      0,
      0.76,
      0.76,
    );
    atmosphereShade.fillRect(0, height - 230, width, 230);

    const titleGroup = this.add.container(width / 2, 92).setAlpha(0).setY(82);
    const title = this.createPatchworkTitle();

    const subtitle = this.add
      .text(0, 72, 'O N E   M O R E   R E L I C', {
        fontFamily: SERIF_FONT,
        fontSize: '14px',
        color: '#b59b70',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const divider = this.add.rectangle(0, 101, 112, 1, 0x9b7742, 0.72);
    titleGroup.add([title, subtitle, divider]);

    this.tweens.add({
      targets: titleGroup,
      alpha: 1,
      y: 92,
      duration: 720,
      ease: 'Sine.Out',
    });

    this.createStartButton(width / 2, height - 82);
    polishSceneTypography(this);
    markSceneInteractive(this);
  }

  private createSoftGlowTexture(): void {
    if (this.textures.exists(MAIN_MENU_GLOW)) return;
    const size = 192;
    const glow = this.add.graphics();
    for (let ring = 12; ring >= 1; ring -= 1) {
      const radius = (ring / 12) * (size / 2);
      const alpha = ((13 - ring) / 12) * 0.025;
      glow.fillStyle(0xffffff, alpha);
      glow.fillCircle(size / 2, size / 2, radius);
    }
    glow.generateTexture(MAIN_MENU_GLOW, size, size);
    glow.destroy();
  }

  private createLivingLights(width: number, height: number): void {
    const scaleX = width / 1280;
    const scaleY = height / 720;
    const lanterns = [
      { x: 102 * scaleX, delay: 0, duration: 1680 },
      { x: 1178 * scaleX, delay: 430, duration: 1930 },
    ];

    lanterns.forEach(({ x, delay, duration }, index) => {
      const glow = this.add
        .image(x, 180 * scaleY, MAIN_MENU_GLOW)
        .setName(`main-menu-lantern-glow-${index}`)
        .setDisplaySize(225 * scaleX, 260 * scaleY)
        .setTint(0xe9a34c)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.18);
      const core = this.add
        .image(x, 176 * scaleY, MAIN_MENU_GLOW)
        .setName(`main-menu-lantern-core-${index}`)
        .setDisplaySize(82 * scaleX, 118 * scaleY)
        .setTint(0xffc56a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.22);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.25 },
        scaleX: { from: glow.scaleX * 0.96, to: glow.scaleX * 1.04 },
        scaleY: { from: glow.scaleY * 0.98, to: glow.scaleY * 1.03 },
        duration,
        delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      this.tweens.add({
        targets: core,
        alpha: { from: 0.14, to: 0.29 },
        duration: duration * 0.56,
        delay: delay + 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    });

  }

  private createPatchworkTitle(): Phaser.GameObjects.Container {
    const group = this.add.container(0, 0);
    const pieces = [
      { character: '见', x: -132, y: 2, angle: -2.2, color: '#e7d2a4', backing: 0x3b3023 },
      { character: '好', x: -44, y: -3, angle: 1.2, color: '#d4b373', backing: 0x29342f },
      { character: '不', x: 44, y: 1, angle: -1.1, color: '#eadbb9', backing: 0x453026 },
      { character: '收', x: 132, y: -2, angle: 1.8, color: '#cda777', backing: 0x313237 },
    ];

    pieces.forEach((piece, index) => {
      const patch = this.add.graphics();
      patch.fillStyle(piece.backing, 0.64);
      patch.lineStyle(1, index === 2 ? 0x7e3026 : 0x8c7045, 0.7);
      patch.fillPoints([
        new Phaser.Geom.Point(-37, -38 + (index % 2) * 2),
        new Phaser.Geom.Point(35, -36),
        new Phaser.Geom.Point(39 - index, 38),
        new Phaser.Geom.Point(-39, 35 - (index % 2) * 2),
      ], true);
      patch.strokePath();
      const shadow = this.add.text(3, 5, piece.character, {
        fontFamily: SERIF_FONT,
        fontSize: '65px',
        fontStyle: 'bold',
        color: '#090806',
      }).setOrigin(0.5).setAlpha(0.78);
      const glyph = this.add.text(0, 0, piece.character, {
        fontFamily: SERIF_FONT,
        fontSize: index === 1 ? '67px' : '65px',
        fontStyle: 'bold',
        color: piece.color,
        stroke: index === 2 ? '#5b1f1a' : '#18110a',
        strokeThickness: 2,
      }).setOrigin(0.5);
      setTypographyRole(glyph, 'display-title');
      const seam = this.add.rectangle(index % 2 === 0 ? 28 : -28, 0, 2, 54, 0xa34730, 0.42)
        .setAngle(index % 2 === 0 ? 5 : -5);
      const tile = this.add.container(piece.x, piece.y + 14, [patch, shadow, glyph, seam])
        .setAngle(piece.angle)
        .setAlpha(0)
        .setScale(0.94);
      group.add(tile);
      this.tweens.add({
        targets: tile,
        y: piece.y,
        alpha: 1,
        scale: 1,
        duration: 430,
        delay: 160 + index * 95,
        ease: 'Back.Out',
      });
    });
    return group;
  }

  update(): void {
    if (!this.isStarting && this.inputActions?.consume('confirm')) this.startAction?.();
  }

  private createStartButton(x: number, y: number): void {
    const buttonWidth = 190;
    const buttonHeight = 52;
    const background = createStyleBoardButtonBackground(
      this,
      buttonWidth,
      buttonHeight,
      'default',
      'primary',
    );
    const hoverGlow = this.add
      .image(0, 0, MAIN_MENU_GLOW)
      .setDisplaySize(buttonWidth + 64, buttonHeight + 44)
      .setTint(0xc18a43)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const shimmer = this.add.rectangle(-74, 0, 2, 32, 0xf2cf89, 0).setAngle(18);

    const label = this.add
      .text(0, 0, '开始', {
        fontFamily: SERIF_FONT,
        fontSize: '22px',
        color: styleBoardButtonTextColor('default'),
        align: 'center',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    const button = this.add
      .container(x, y, [hoverGlow, background, shimmer, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });

    const setState = (state: StyleBoardButtonState): void => {
      drawStyleBoardButton(background, buttonWidth, buttonHeight, state, 'primary');
      label.setColor(styleBoardButtonTextColor(state));
    };

    button.on('pointerover', () => {
      if (!this.isStarting) {
        setState('hover');
        this.tweens.killTweensOf([button, hoverGlow, shimmer]);
        this.tweens.add({
          targets: button,
          y: y - 4,
          scaleX: 1.035,
          scaleY: 1.035,
          duration: 150,
          ease: 'Sine.Out',
        });
        this.tweens.add({ targets: hoverGlow, alpha: 0.27, duration: 180 });
        shimmer.setX(-74).setAlpha(0.7);
        this.tweens.add({
          targets: shimmer,
          x: 74,
          alpha: 0,
          duration: 430,
          ease: 'Sine.InOut',
        });
      }
    });

    button.on('pointerout', () => {
      if (!this.isStarting) {
        setState('default');
        this.tweens.killTweensOf([button, hoverGlow, shimmer]);
        this.tweens.add({
          targets: button,
          y,
          scaleX: 1,
          scaleY: 1,
          duration: 160,
          ease: 'Sine.Out',
        });
        this.tweens.add({ targets: hoverGlow, alpha: 0, duration: 120 });
        shimmer.setAlpha(0);
      }
    });

    button.on('pointerdown', () => {
      if (!this.isStarting) {
        setState('pressed');
        this.tweens.killTweensOf(button);
        this.tweens.add({
          targets: button,
          y: y + 1,
          scaleX: 0.975,
          scaleY: 0.975,
          duration: 65,
        });
      }
    });

    const start = (): void => {
      if (this.isStarting) {
        return;
      }

      this.isStarting = true;
      button.disableInteractive();
      setState('loading');
      label.setText('开启中…').setLetterSpacing(2);
      this.tweens.add({
        targets: button,
        scaleX: 1.01,
        scaleY: 1.01,
        duration: 70,
        yoyo: true,
        onComplete: () => this.transitionController?.start(
          'StoryIntroScene',
          undefined,
          { durationMs: 200, label: '拓片显影 · 故事开始' },
        ),
      });
    };
    this.startAction = start;
    button.on('pointerup', start);
  }
}
