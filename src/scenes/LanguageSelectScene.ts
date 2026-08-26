import Phaser from 'phaser';
import { InputActionManager } from '../input/InputActionManager';
import { setGameLanguage, type GameLanguage } from '../i18n/gameLanguage';
import {
  createStyleBoardButtonBackground,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
  type StyleBoardButtonState,
} from '../ui/styleBoardUi';
import { polishSceneTypography } from '../ui/gameTypography';
import { SceneTransitionController, markSceneInteractive } from '../systems/SceneTransitionController';

const SERIF_FONT = 'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT = 'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

export class LanguageSelectScene extends Phaser.Scene {
  private inputActions?: InputActionManager;
  private transitionController?: SceneTransitionController;
  private selectedIndex = 0;
  private locked = false;
  private buttons: Array<{
    root: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    language: GameLanguage;
  }> = [];

  constructor() {
    super('LanguageSelectScene');
  }

  create(): void {
    this.selectedIndex = 0;
    this.locked = false;
    this.buttons = [];
    this.inputActions = InputActionManager.forScene(this);
    this.inputActions.setContext('language-select');
    this.transitionController = new SceneTransitionController(this, this.inputActions);

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#090b09');

    const glow = this.add.graphics();
    glow.fillGradientStyle(0x2f2518, 0x2f2518, 0x090b09, 0x090b09, 0.78, 0.78, 0.12, 0.12);
    glow.fillRect(0, 0, width, height);

    const frame = this.add.graphics();
    frame.fillStyle(0x15130f, 0.97);
    frame.lineStyle(2, 0x8f7040, 0.9);
    frame.fillRoundedRect(width / 2 - 430, height / 2 - 214, 860, 428, 6);
    frame.strokeRoundedRect(width / 2 - 430, height / 2 - 214, 860, 428, 6);
    frame.lineStyle(1, 0x4b3b26, 0.9);
    frame.strokeRoundedRect(width / 2 - 416, height / 2 - 200, 832, 400, 4);

    this.add.text(width / 2, height / 2 - 132, '选择语言', {
      fontFamily: SERIF_FONT,
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#eadbb9',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 82, 'CHOOSE YOUR LANGUAGE', {
      fontFamily: SERIF_FONT,
      fontSize: '17px',
      color: '#a99574',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.createLanguageButton(width / 2 - 178, height / 2 + 34, '中文', 'zh-CN');
    this.createLanguageButton(width / 2 + 178, height / 2 + 34, 'ENGLISH', 'en');

    this.add.text(width / 2, height / 2 + 154, '← / →  选择 · Select     E / ENTER  确认 · Confirm', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      color: '#91856f',
    }).setOrigin(0.5);

    this.refreshButtons();
    polishSceneTypography(this);
    markSceneInteractive(this);
  }

  update(): void {
    if (this.locked || !this.inputActions) return;
    if (this.inputActions.consume('nav-left')) this.moveSelection(-1);
    if (this.inputActions.consume('nav-right')) this.moveSelection(1);
    if (this.inputActions.consume('confirm')) this.confirmSelection();
  }

  private createLanguageButton(x: number, y: number, labelText: string, language: GameLanguage): void {
    const width = 270;
    const height = 76;
    const background = createStyleBoardButtonBackground(this, width, height, 'default', 'primary');
    const label = this.add.text(0, 0, labelText, {
      fontFamily: SERIF_FONT,
      fontSize: '25px',
      fontStyle: 'bold',
      color: styleBoardButtonTextColor('default'),
      letterSpacing: language === 'en' ? 3 : 7,
    }).setOrigin(0.5);
    const root = this.add.container(x, y, [background, label])
      .setSize(width, height)
      .setInteractive({ useHandCursor: true });
    const index = this.buttons.length;
    root.on('pointerover', () => {
      if (this.locked) return;
      this.selectedIndex = index;
      this.refreshButtons();
    });
    root.on('pointerup', () => {
      if (this.locked) return;
      this.selectedIndex = index;
      this.confirmSelection();
    });
    this.buttons.push({ root, background, label, language });
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, this.buttons.length);
    this.refreshButtons();
  }

  private refreshButtons(): void {
    this.buttons.forEach((button, index) => {
      const state: StyleBoardButtonState = index === this.selectedIndex ? 'hover' : 'default';
      drawStyleBoardButton(button.background, 270, 76, state, 'primary');
      button.label.setColor(styleBoardButtonTextColor(state));
      button.root.setScale(index === this.selectedIndex ? 1.035 : 1);
    });
  }

  private confirmSelection(): void {
    const chosen = this.buttons[this.selectedIndex];
    if (!chosen || this.locked) return;
    this.locked = true;
    setGameLanguage(chosen.language);
    this.buttons.forEach((button) => button.root.disableInteractive());
    this.transitionController?.start(
      'StoryIntroScene',
      undefined,
      {
        durationMs: 220,
        label: chosen.language === 'zh-CN' ? '语言已选择 · 故事开始' : 'Language selected · Story begins',
      },
    );
  }
}

