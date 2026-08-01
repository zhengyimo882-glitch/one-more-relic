import Phaser from 'phaser';

const BUTTON_COLORS = {
  normal: 0x596052,
  hover: 0x737b69,
  pressed: 0x3f453b,
};

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

export class MainMenuScene extends Phaser.Scene {
  private isStarting = false;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.isStarting = false;

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#181b17');

    const titleGroup = this.add.container(width / 2, height / 2 - 120).setAlpha(0);

    const title = this.add
      .text(0, 0, 'ONE MORE RELIC', {
        fontFamily: SERIF_FONT,
        fontSize: '76px',
        fontStyle: 'bold',
        color: '#e8e0cf',
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(0, 72, '见好不收', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        color: '#b2bba1',
      })
      .setOrigin(0.5);

    const tagline = this.add
      .text(0, 126, 'Some things are better left buried.', {
        fontFamily: SERIF_FONT,
        fontSize: '19px',
        fontStyle: 'italic',
        color: '#b09b7f',
      })
      .setOrigin(0.5);

    const chineseTagline = this.add
      .text(0, 154, '有些东西，最好永远埋着。', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#9d927e',
      })
      .setOrigin(0.5);

    titleGroup.add([title, subtitle, tagline, chineseTagline]);

    this.tweens.add({
      targets: titleGroup,
      alpha: 1,
      duration: 650,
      ease: 'Sine.Out',
    });

    this.createStartButton(width / 2, height / 2 + 135);
  }

  private createStartButton(x: number, y: number): void {
    const buttonWidth = 220;
    const buttonHeight = 74;
    const background = this.add.graphics();

    const drawButton = (color: number): void => {
      background.clear();
      background.fillStyle(color, 1);
      background.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        3,
      );
      background.lineStyle(2, 0xa89b7f, 0.75);
      background.strokeRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        3,
      );
    };

    drawButton(BUTTON_COLORS.normal);

    const label = this.add
      .text(0, 0, 'START\n开始游戏', {
        fontFamily: SANS_FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f0e8d7',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    const button = this.add
      .container(x, y, [background, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (!this.isStarting) {
        drawButton(BUTTON_COLORS.hover);
      }
    });

    button.on('pointerout', () => {
      if (!this.isStarting) {
        drawButton(BUTTON_COLORS.normal);
      }
    });

    button.on('pointerdown', () => {
      if (!this.isStarting) {
        drawButton(BUTTON_COLORS.pressed);
      }
    });

    button.on('pointerup', () => {
      if (this.isStarting) {
        return;
      }

      this.isStarting = true;
      button.disableInteractive();
      this.scene.start('StoryIntroScene');
    });
  }
}
