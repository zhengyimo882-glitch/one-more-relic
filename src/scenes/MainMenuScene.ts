import Phaser from 'phaser';
import {
  createStyleBoardButtonBackground,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
  UI_STYLE_BOARD,
  type StyleBoardButtonState,
} from '../ui/styleBoardUi';

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

    this.cameras.main.setBackgroundColor('#090b09');

    const titleGroup = this.add.container(width / 2, height / 2 - 120).setAlpha(0);

    const title = this.add
      .text(0, 0, 'ONE MORE RELIC', {
        fontFamily: SERIF_FONT,
        fontSize: '76px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(0, 72, '见好不收', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        color: UI_STYLE_BOARD.colors.text,
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
    const buttonWidth = 240;
    const buttonHeight = 64;
    const background = createStyleBoardButtonBackground(
      this,
      buttonWidth,
      buttonHeight,
      'default',
      'primary',
    );

    const label = this.add
      .text(0, 0, 'START\n开始游戏', {
        fontFamily: SANS_FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: styleBoardButtonTextColor('default'),
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    const button = this.add
      .container(x, y, [background, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });

    const setState = (state: StyleBoardButtonState): void => {
      drawStyleBoardButton(background, buttonWidth, buttonHeight, state, 'primary');
      label.setColor(styleBoardButtonTextColor(state));
    };

    button.on('pointerover', () => {
      if (!this.isStarting) {
        setState('hover');
      }
    });

    button.on('pointerout', () => {
      if (!this.isStarting) {
        setState('default');
      }
    });

    button.on('pointerdown', () => {
      if (!this.isStarting) {
        setState('pressed');
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
