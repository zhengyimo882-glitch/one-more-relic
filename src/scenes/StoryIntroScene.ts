import Phaser from 'phaser';
import { DEFAULT_PLAYER_APPEARANCE_ID } from '../data/playerAppearances';
import {
  STORY_INTRO_TEXTURES,
  preloadNarrativeArt,
} from '../visuals/narrativeArt';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import { InputActionManager } from '../input/InputActionManager';
import {
  SceneTransitionController,
  installSceneLoadingOverlay,
  markSceneInteractive,
} from '../systems/SceneTransitionController';
import {
  BilingualTextReveal,
  polishSceneTypography,
  setTypographyRole,
} from '../ui/gameTypography';
import { localize } from '../i18n/gameLanguage';

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
  private visual?: Phaser.GameObjects.Image;
  private englishText?: Phaser.GameObjects.Text;
  private chineseText?: Phaser.GameObjects.Text;
  private transitionTween?: Phaser.Tweens.Tween;
  private inputActions?: InputActionManager;
  private transitionController?: SceneTransitionController;
  private textReveal?: BilingualTextReveal;

  constructor() {
    super('StoryIntroScene');
  }

  preload(): void {
    installSceneLoadingOverlay(this);
    preloadNarrativeArt(this);
  }

  create(): void {
    this.actIndex = 0;
    this.transitioning = false;
    this.inputActions = InputActionManager.forScene(this);
    this.inputActions.setContext('story-intro');
    this.transitionController = new SceneTransitionController(this, this.inputActions);
    this.cameras.main.setBackgroundColor('#181b17');
    this.createStoryDisplay();
    polishSceneTypography(this);
    this.registerInput();
    this.showAct(this.actIndex);
    markSceneInteractive(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transitionTween?.stop();
      this.textReveal?.destroy();
    });
  }

  update(): void {
    if (this.transitioning || !this.inputActions) {
      return;
    }
    const continuePressed = this.inputActions.consume('confirm');
    const skipPressed = this.inputActions.consume('skip');
    const escapePressed = this.inputActions.consume('cancel') || isPauseButtonPressed(this);

    if (continuePressed) {
      this.requestAdvance();
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
    this.visual = this.add
      .image(0, 0, STORY_INTRO_TEXTURES[0])
      .setDisplaySize(1280, 720);
    const lowerVignette = this.add.graphics();
    for (let index = 0; index < 8; index += 1) {
      lowerVignette.fillStyle(0x090806, 0.08 + index * 0.055);
      lowerVignette.fillRect(-640, 318 + index * 36, 1280, 40);
    }
    const textPanel = this.add.graphics();
    textPanel.fillStyle(0x12100d, 0.9);
    textPanel.fillRect(-520, 48, 1040, 184);
    textPanel.lineStyle(1, 0xb39c77, 0.86);
    textPanel.lineBetween(-520, 48, 520, 48);
    this.englishText = this.add
      .text(-478, 72, '', {
        fontFamily: SERIF_FONT,
        fontSize: '25px',
        color: '#e3d9c1',
        wordWrap: { width: 956 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    setTypographyRole(this.englishText, 'dialogue-body-light');
    this.chineseText = this.add
      .text(-478, 150, '', {
        fontFamily: SERIF_FONT,
        fontSize: '19px',
        color: '#bbb3a2',
        wordWrap: { width: 956 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    setTypographyRole(this.chineseText, 'dialogue-translation-light');
    this.textReveal = new BilingualTextReveal(
      this,
      this.englishText,
      this.chineseText,
      () => {
        if (this.englishText && this.chineseText) {
          this.chineseText.setY(this.englishText.y + this.englishText.height + 10);
        }
      },
      18,
    );
    this.root = this.add.container(640, 360, [
      this.visual,
      lowerVignette,
      textPanel,
      this.englishText,
      this.chineseText,
    ]);
    this.add
      .text(
        640,
        678,
        localize(
          'E / ENTER / MOUSE CLICK  CONTINUE     S  SKIP INTRO',
          'E / ENTER / 鼠标点击  继续     S  跳过介绍',
        ),
        {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          color: '#b0a38b',
        },
      )
      .setOrigin(0.5);
    this.add
      .text(28, 678, localize('ESC  PAUSE', 'ESC  暂停'), {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#979f93',
      })
      .setOrigin(0, 0.5);

    this.add
      .zone(640, 360, 1280, 720)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (!this.transitioning) this.requestAdvance();
      });
  }

  private registerInput(): void {
    this.inputActions = InputActionManager.forScene(this);
  }

  private requestAdvance(): void {
    if (this.textReveal?.complete()) return;
    this.advanceAct();
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
    this.transitioning = true;
    this.transitionController?.start(
      'ShopIntroductionScene',
      { appearanceId: DEFAULT_PLAYER_APPEARANCE_ID },
      { durationMs: 220, label: '拓片显影 · 古玩店' },
    );
  }

  private showAct(index: number): void {
    const act = STORY_ACTS[index];
    this.textReveal?.show(act.english, act.chinese);
    this.visual?.setTexture(STORY_INTRO_TEXTURES[index]);
  }
}
