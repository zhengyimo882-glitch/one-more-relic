import Phaser from 'phaser';
import { DEFAULT_PLAYER_APPEARANCE_ID } from '../data/playerAppearances';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type StoryAct = {
  english: string;
  chinese: string;
};

const STORY_ACTS: readonly StoryAct[] = [
  {
    english:
      'The company let me go on Monday.\nBy Friday, I had begun putting prices on everything I could live without.',
    chinese:
      '周一，我被公司辞退了。\n到了周五，家里凡是还能卖的东西，我都标上了价。',
  },
  {
    english:
      'At the bottom of the last box was a chipped brass tally.\nThe stallholder had once called it worthless. Tonight, I needed him to have been wrong.',
    chinese:
      '翻到最后一个箱子时，我在箱底摸到一块缺角的旧铜牌。\n当年卖给我的摊主说，它不值钱。可今晚，我只能希望他看走了眼。',
  },
  {
    english:
      'Its faded mark matched a sign on a street waiting to be demolished.\nOnly one door was still lit.',
    chinese:
      '铜牌上的印记已经褪色，却和待拆老街上的那块招牌一模一样。\n整条街都黑着，只有那家店还亮着灯。',
  },
] as const;

export class StoryIntroScene extends Phaser.Scene {
  private actIndex = 0;
  private transitioning = false;
  private root?: Phaser.GameObjects.Container;
  private visual?: Phaser.GameObjects.Graphics;
  private englishText?: Phaser.GameObjects.Text;
  private chineseText?: Phaser.GameObjects.Text;
  private transitionTween?: Phaser.Tweens.Tween;
  private continueKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private skipKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('StoryIntroScene');
  }

  create(): void {
    this.actIndex = 0;
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#181b17');
    this.createStoryDisplay();
    this.registerInput();
    this.showAct(this.actIndex);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transitionTween?.stop();
    });
  }

  update(): void {
    if (
      this.transitioning ||
      !this.continueKey ||
      !this.enterKey ||
      !this.skipKey ||
      !this.escapeKey
    ) {
      return;
    }
    const continuePressed =
      Phaser.Input.Keyboard.JustDown(this.continueKey) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey);
    const skipPressed = Phaser.Input.Keyboard.JustDown(this.skipKey);
    const escapePressed =
      Phaser.Input.Keyboard.JustDown(this.escapeKey) || isPauseButtonPressed(this);

    if (continuePressed) {
      this.advanceAct();
      return;
    }
    if (skipPressed) {
      this.enterAntiqueShop();
      return;
    }
    if (escapePressed) {
      openPauseMenu(this);
    }
  }

  private createStoryDisplay(): void {
    this.visual = this.add.graphics();
    this.visual.setScale(1.16);
    const textPanel = this.add.graphics();
    textPanel.fillStyle(0x171612, 0.94);
    textPanel.fillRect(-520, 58, 1040, 158);
    textPanel.lineStyle(1, 0xb39c77, 0.86);
    textPanel.lineBetween(-520, 58, 520, 58);
    this.englishText = this.add
      .text(-478, 80, '', {
        fontFamily: SERIF_FONT,
        fontSize: '24px',
        color: '#e3d9c1',
        wordWrap: { width: 956 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    this.chineseText = this.add
      .text(-478, 146, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#bbb3a2',
        wordWrap: { width: 956 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.root = this.add.container(640, 360, [
      this.visual,
      textPanel,
      this.englishText,
      this.chineseText,
    ]);
    this.add
      .text(
        640,
        678,
        'E / ENTER  CONTINUE / 继续     S  SKIP INTRO / 跳过介绍',
        {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          color: '#b0a38b',
        },
      )
      .setOrigin(0.5);
    this.add
      .text(28, 678, 'ESC  PAUSE / 暂停', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#979f93',
      })
      .setOrigin(0, 0.5);
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for the story introduction.');
    }
    this.continueKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.skipKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private advanceAct(): void {
    if (this.actIndex >= STORY_ACTS.length - 1) {
      this.enterAntiqueShop();
      return;
    }
    if (!this.root) {
      return;
    }
    this.transitioning = true;
    this.transitionTween = this.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 160,
      ease: 'Sine.In',
      onComplete: () => {
        this.actIndex += 1;
        this.showAct(this.actIndex);
        this.transitionTween = this.tweens.add({
          targets: this.root,
          alpha: 1,
          duration: 190,
          ease: 'Sine.Out',
          onComplete: () => {
            this.transitioning = false;
          },
        });
      },
    });
  }

  private enterAntiqueShop(): void {
    this.scene.start('ShopIntroductionScene', {
      appearanceId: DEFAULT_PLAYER_APPEARANCE_ID,
    });
  }

  private showAct(index: number): void {
    const act = STORY_ACTS[index];
    this.englishText?.setText(act.english);
    this.chineseText?.setText(act.chinese);
    this.drawActVisual(index);
  }

  private drawActVisual(index: number): void {
    if (!this.visual) {
      return;
    }
    const g = this.visual;
    g.clear();
    g.fillStyle(0x20231f, 1);
    g.fillRect(-640, -360, 1280, 720);

    if (index === 0) {
      g.fillStyle(0x37332c, 1);
      g.fillRect(-440, -280, 880, 300);
      g.fillStyle(0x584a3b, 1);
      g.fillRoundedRect(-280, -140, 560, 160, 6);
      g.fillStyle(0x222628, 1);
      g.fillRoundedRect(-95, -126, 190, 98, 5);
      g.lineStyle(2, 0x69727a, 0.38);
      g.strokeRoundedRect(-95, -126, 190, 98, 5);
      g.fillStyle(0x607486, 0.34);
      g.fillRoundedRect(150, -102, 58, 98, 10);
      g.fillStyle(0x8a7152, 1);
      g.fillRect(-390, -112, 120, 110);
      g.lineStyle(1, 0x9b815c, 0.62);
      g.strokeRect(-390, -112, 120, 110);
      g.fillStyle(0x1b2224, 1);
      g.fillRect(300, -260, 118, 210);
      g.lineStyle(2, 0x738087, 0.28);
      for (let y = -245; y < -60; y += 24) {
        g.lineBetween(305, y, 412, y + 18);
      }
    } else if (index === 1) {
      g.fillStyle(0x514235, 1);
      g.fillRect(-420, -260, 840, 270);
      g.fillStyle(0x8a7153, 1);
      g.fillRect(-250, -178, 500, 176);
      g.lineStyle(3, 0x9c8059, 0.7);
      g.strokeRect(-250, -178, 500, 176);
      g.lineBetween(-250, -178, -195, -220);
      g.lineBetween(250, -178, 195, -220);
      g.fillStyle(0xaa8b59, 1);
      g.fillRoundedRect(-55, -123, 110, 70, 8);
      g.lineStyle(3, 0xb29a64, 0.8);
      g.strokeRoundedRect(-55, -123, 110, 70, 8);
      g.fillStyle(0x3c3025, 1);
      g.fillTriangle(31, -124, 56, -124, 56, -98);
      g.lineStyle(2, 0x453b2b, 0.8);
      g.strokeCircle(0, -88, 18);
      g.lineBetween(-18, -88, 18, -88);
      g.lineBetween(0, -106, 0, -70);
    } else {
      g.fillStyle(0x2b2d29, 1);
      g.fillRect(-500, -300, 1000, 305);
      g.fillStyle(0x464239, 1);
      for (let x = -450; x <= 350; x += 200) {
        g.fillRect(x, -245, 135, 210);
      }
      g.fillStyle(0x70563d, 0.8);
      g.fillRect(-360, -225, 110, 42);
      g.fillRect(240, -180, 120, 38);
      g.fillStyle(0x6f372f, 0.52);
      g.fillRect(-470, -85, 75, 14);
      g.fillRect(300, -115, 88, 14);
      g.fillStyle(0xc59e58, 0.14);
      g.fillEllipse(0, -80, 430, 300);
      g.fillStyle(0x3a2d22, 1);
      g.fillRect(-105, -225, 210, 225);
      g.fillStyle(0xcaa15f, 0.9);
      g.fillRect(-96, -216, 192, 208);
      g.fillStyle(0x503b2a, 1);
      g.fillRect(-78, -198, 156, 190);
      g.fillStyle(0xb59a61, 0.72);
      g.fillCircle(0, -255, 28);
      g.lineStyle(4, 0x4b3d2b, 0.9);
      g.strokeCircle(0, -255, 28);
      g.lineBetween(-20, -255, 20, -255);
      g.lineBetween(0, -275, 0, -235);
    }
  }
}
