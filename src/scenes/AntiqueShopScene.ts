import Phaser from 'phaser';
import { Player } from '../objects/Player';
import type { DepartureChoice } from '../types/TombProgress';
import {
  DEFAULT_PLAYER_APPEARANCE_ID,
  isPlayerAppearanceId,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import {
  ANTIQUE_SHOP_HEIGHT,
  ANTIQUE_SHOP_WIDTH,
  SHOP_LAYOUT,
  antiqueShopDepthFromGround,
  createAntiqueShopInterior,
  preloadAntiqueShopInteriorAssets,
  SHOP_INTERIOR_TEXTURES,
  type AntiqueShopInterior,
} from './shared/createAntiqueShopInterior';
import {
  createProceduralAtmosphere,
  type ProceduralAtmosphere,
} from '../visuals/createProceduralAtmosphere';
import { VISUAL_THEME } from '../visuals/visualTheme';
import { preloadPlayerAvatarAssets } from '../visuals/createPlayerAvatarVisual';
import {
  inferShopkeeperGesture,
  preloadShopkeeperAssets,
  type ShopkeeperGesture,
} from '../visuals/createShopkeeperVisual';
import {
  createParchmentPanel,
  preloadParchmentPanel,
} from '../visuals/createParchmentPanel';
import { ShopAudioSystem } from '../systems/ShopAudioSystem';
import { ClickMoveController } from '../systems/ClickMoveController';
import { preloadClickMoveVisuals } from '../visuals/clickMoveVisuals';
import type { TombSettlement } from '../systems/ShopProgressSystem';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import { createTimedLocationTitle } from '../ui/createTimedLocationTitle';
import {
  createStyleBoardPanel,
  createStyleBoardPrompt,
  UI_STYLE_BOARD,
} from '../ui/styleBoardUi';
import { InputActionManager } from '../input/InputActionManager';
import { InteractionController } from '../systems/InteractionController';
import {
  SceneTransitionController,
  installSceneLoadingOverlay,
  markSceneInteractive,
} from '../systems/SceneTransitionController';
import {
  BilingualTextReveal,
  polishSceneTypography,
  revealPanel,
  setTypographyRole,
} from '../ui/gameTypography';

const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;

export interface AntiqueShopSceneData {
  departureChoice: DepartureChoice;
  settlement?: TombSettlement;
  appearanceId?: PlayerAppearanceId;
}

type AntiqueShopPhase =
  | 'arriving'
  | 'free-roam'
  | 'conversation'
  | 'response-choice'
  | 'sale-choice'
  | 'resolved';

type ShopkeeperResponse = 'challenged' | 'silent';

type AntiqueShopOutcome =
  | 'returned-empty'
  | 'sold-burial-vessel'
  | 'kept-burial-vessel'
  | 'sold-bronze-mirror'
  | 'kept-bronze-mirror'
  | 'sold-geomancers-compass'
  | 'kept-geomancers-compass';

type PortableDepartureChoice = Exclude<DepartureChoice, 'empty'>;
type ConversationCompletion = 'response-choice' | 'sale-choice' | 'resolved';
type ConversationVoice = 'shopkeeper' | 'player' | 'thought' | 'appraisal' | 'offer';

type ConversationBeat = {
  voice: ConversationVoice;
  englishTitle: string;
  chineseTitle: string;
  englishText: string;
  chineseText: string;
  shopkeeperGesture?: ShopkeeperGesture;
};

type ArtifactShopData = {
  englishName: string;
  chineseName: string;
  offer: number;
  offerLabel: string;
  appraisal: string;
  chineseAppraisal: string;
  appraisalQuote: string;
  chineseAppraisalQuote: string;
};

type ReactionData = {
  reaction: string;
  chineseReaction: string;
  quote: string;
  chineseQuote: string;
  slip: string;
  chineseSlip: string;
  thought: string;
  chineseThought: string;
};

const ARTIFACT_DATA: Record<PortableDepartureChoice, ArtifactShopData> = {
  'burial-vessel': {
    englishName: 'Burial Vessel',
    chineseName: '随葬器皿',
    offer: 800,
    offerLabel: '¥800',
    appraisal:
      'Late-Qing burial clay. The workmanship is ordinary, and the rim has been repaired.',
    chineseAppraisal: '晚清的随葬陶器。做工普通，器口后来修补过。',
    appraisalQuote:
      '“There are buyers for objects like this, but not many.”',
    chineseAppraisalQuote: '“有人收。不过，价不会太高。”',
  },
  'bronze-mirror': {
    englishName: 'Bronze Mirror',
    chineseName: '铜镜',
    offer: 2400,
    offerLabel: '¥2,400',
    appraisal:
      'This was not made merely for dressing. The inscription matters more than the bronze.',
    chineseAppraisal:
      '这面镜子不只是用来照人的。背后的铭文，比这块铜更值钱。',
    appraisalQuote: '“Someone will pay for a complete inscription.”',
    chineseAppraisalQuote: '“铭文要是完整，自然有人肯出价。”',
  },
  'geomancers-compass': {
    englishName: 'Geomancer’s Compass',
    chineseName: '风水罗盘',
    offer: 1200,
    offerLabel: '¥1,200',
    appraisal:
      'A geomancer’s working compass. Water damaged the face, but the inner mechanism still moves.',
    chineseAppraisal:
      '风水师生前用过的罗盘。盘面受了潮，里面的机关却还能转。',
    appraisalQuote:
      '“To most buyers, it is only a broken surveying tool.”',
    chineseAppraisalQuote:
      '“在大多数人眼里，它只是一件坏掉的测量工具。”',
  },
};

const REACTION_DATA: Record<DepartureChoice, ReactionData> = {
  empty: {
    reaction: 'The shopkeeper studies you longer than the empty bag.',
    chineseReaction: '老板没有看那只空袋子，只是盯着你看了很久。',
    quote: '“Careful—or afraid?”',
    chineseQuote: '“谨慎……还是怕了？”',
    slip:
      '“You carried the compass, then decided to leave it behind. Sensible.”',
    chineseSlip: '“你碰过那只罗盘，最后还是把它留在了墓里。挺明智。”',
    thought: 'I never told him I had carried it.',
    chineseThought: '我没告诉过他，我碰过那只罗盘。',
  },
  'burial-vessel': {
    reaction: 'The shopkeeper taps the clay once and sets it aside.',
    chineseReaction: '老板用指节轻轻敲了敲陶器，又把它推到一旁。',
    quote: '“A cautious choice.”',
    chineseQuote: '“选得很稳妥。”',
    slip: '“The crack at the foot has spread since it was put below.”',
    chineseSlip: '“它下葬以后，底下这道裂痕又长开了。”',
    thought: 'I never mentioned the crack at its foot.',
    chineseThought: '我没跟他提过底下那道裂痕。',
  },
  'bronze-mirror': {
    reaction:
      'The shopkeeper covers the bronze face with a piece of cloth.',
    chineseReaction: '老板拿起一块布，先把铜镜的正面盖住了。',
    quote: '“You noticed the inscription.”',
    chineseQuote: '“你看到背后的铭文了。”',
    slip:
      '“At least the final character on the reverse is still legible.”',
    chineseSlip: '“还好，背后铭文的最后一个字还能看清。”',
    thought:
      'I never told him which part of the inscription survived.',
    chineseThought: '我没告诉过他，铭文究竟还剩哪一部分。',
  },
  'geomancers-compass': {
    reaction: 'He takes the compass before asking what else you saw.',
    chineseReaction: '他先把罗盘拿了过去，这才问你还在墓里看见了什么。',
    quote: '“So it was still there.”',
    chineseQuote: '“原来……它还在那里。”',
    slip: '“Do not turn the seventh mark toward the door again.”',
    chineseSlip: '“下次，别把第七格对着门。”',
    thought: 'Again? I never told him what moved inside the tomb.',
    chineseThought: '“下次”？我还没告诉他，墓里发生过什么。',
  },
};

export class AntiqueShopScene extends Phaser.Scene {
  private incomingDepartureChoice: DepartureChoice = 'empty';
  private incomingSettlement?: TombSettlement;
  private incomingAppearanceId: PlayerAppearanceId =
    DEFAULT_PLAYER_APPEARANCE_ID;
  private departureChoice: DepartureChoice = 'empty';
  private appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID;
  private phase: AntiqueShopPhase = 'arriving';
  private shopkeeperResponse?: ShopkeeperResponse;
  private outcome?: AntiqueShopOutcome;
  private conversationBeats: ConversationBeat[] = [];
  private conversationIndex = 0;
  private conversationCompletion: ConversationCompletion = 'response-choice';
  private choiceIndex = 0;
  private shopkeeperNearby = false;

  private player?: Player;
  private shopkeeper?: Phaser.GameObjects.Container;
  private shopInterior?: AntiqueShopInterior;
  private counterArtifact?: Phaser.GameObjects.Container;
  private counterArtifactTween?: Phaser.Tweens.Tween;
  private arrivalTimer?: Phaser.Time.TimerEvent;
  private locationTween?: Phaser.Tweens.Tween;
  private atmosphere?: ProceduralAtmosphere;
  private shopAudio?: ShopAudioSystem;
  private clickMove?: ClickMoveController;

  private inputActions?: InputActionManager;
  private interactionController?: InteractionController<'shopkeeper'>;
  private transitionController?: SceneTransitionController;

  private locationUI?: Phaser.GameObjects.Container;
  private objectiveUI?: Phaser.GameObjects.Container;
  private worldPrompt?: Phaser.GameObjects.Container;
  private controlHint?: Phaser.GameObjects.Text;
  private escapeHint?: Phaser.GameObjects.Text;

  private conversationPanel?: Phaser.GameObjects.Container;
  private conversationEnglishTitle?: Phaser.GameObjects.Text;
  private conversationChineseTitle?: Phaser.GameObjects.Text;
  private conversationEnglishText?: Phaser.GameObjects.Text;
  private conversationChineseText?: Phaser.GameObjects.Text;
  private conversationContinueHint?: Phaser.GameObjects.Text;
  private conversationReveal?: BilingualTextReveal;

  private choicePanel?: Phaser.GameObjects.Container;
  private choiceEnglishTitle?: Phaser.GameObjects.Text;
  private choiceChineseTitle?: Phaser.GameObjects.Text;
  private leftChoiceBox?: Phaser.GameObjects.Rectangle;
  private rightChoiceBox?: Phaser.GameObjects.Rectangle;
  private leftChoiceEnglish?: Phaser.GameObjects.Text;
  private leftChoiceChinese?: Phaser.GameObjects.Text;
  private rightChoiceEnglish?: Phaser.GameObjects.Text;
  private rightChoiceChinese?: Phaser.GameObjects.Text;

  private resultPanel?: Phaser.GameObjects.Container;
  private resultStatusEnglish?: Phaser.GameObjects.Text;
  private resultStatusChinese?: Phaser.GameObjects.Text;
  private resultArtifactEnglish?: Phaser.GameObjects.Text;
  private resultArtifactChinese?: Phaser.GameObjects.Text;
  private resultReceivedEnglish?: Phaser.GameObjects.Text;
  private resultReceivedChinese?: Phaser.GameObjects.Text;
  private resultAmount?: Phaser.GameObjects.Text;
  private resultBodyEnglish?: Phaser.GameObjects.Text;
  private resultBodyChinese?: Phaser.GameObjects.Text;
  private resultAttitudeEnglish?: Phaser.GameObjects.Text;
  private resultAttitudeChinese?: Phaser.GameObjects.Text;

  constructor() {
    super('AntiqueShopScene');
  }

  preload(): void {
    installSceneLoadingOverlay(this);
    preloadClickMoveVisuals(this);
    preloadPlayerAvatarAssets(this);
    preloadShopkeeperAssets(this);
    preloadParchmentPanel(this);
    preloadAntiqueShopInteriorAssets(this);
  }

  init(data?: Partial<AntiqueShopSceneData>): void {
    this.incomingDepartureChoice = this.isDepartureChoice(data?.departureChoice)
      ? data.departureChoice
      : 'empty';
    this.incomingSettlement = data?.settlement;
    this.incomingAppearanceId = isPlayerAppearanceId(data?.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  create(): void {
    this.resetAntiqueShopState();
    this.inputActions = InputActionManager.forScene(this);
    this.interactionController = new InteractionController(this);
    this.transitionController = new SceneTransitionController(this, this.inputActions);
    this.shopAudio = new ShopAudioSystem();
    this.cameras.main.setBackgroundColor('#17130f');
    this.physics.world.setBounds(
      0,
      0,
      ANTIQUE_SHOP_WIDTH,
      ANTIQUE_SHOP_HEIGHT,
    );

    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'antique-shop',
      worldWidth: ANTIQUE_SHOP_WIDTH,
      worldHeight: ANTIQUE_SHOP_HEIGHT,
      lightAnchors: [
        new Phaser.Math.Vector2(390, 360),
        new Phaser.Math.Vector2(890, 360),
      ],
    });
    this.shopInterior = createAntiqueShopInterior(this);
    this.shopkeeper = this.shopInterior.shopkeeper;
    this.createCounterInteraction();
    this.player = new Player(
      this,
      SHOP_LAYOUT.playerSpawn.x,
      SHOP_LAYOUT.playerSpawn.y,
      this.appearanceId,
    );
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.physics.add.collider(this.player, this.shopInterior.obstacles);
    this.clickMove = new ClickMoveController(this, this.player, {
      obstacles: () => this.shopInterior?.obstacles.getChildren() ?? [],
      isEnabled: () => this.phase === 'free-roam' && Boolean(this.player?.isMovementEnabled()),
      screenExclusions: [
        new Phaser.Geom.Rectangle(0, 0, 365, 225),
        new Phaser.Geom.Rectangle(420, 0, 440, 150),
        new Phaser.Geom.Rectangle(0, 655, 1280, 65),
      ],
      clearance: 19,
      depth: 18,
    });

    this.createInterface();
    polishSceneTypography(this);
    this.registerInput();
    this.showArrivalLocation();
    markSceneInteractive(this);
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupAntiqueShopScene,
      this,
    );
  }

  update(): void {
    if (!this.player || !this.inputActions) {
      return;
    }

    this.inputActions.setContext(`antique-shop:${this.phase}`);
    const interactionPressed = this.inputActions.consume('confirm');
    const enterPressed = false;
    const escapePressed = this.inputActions.consume('cancel');
    const pausePressed = escapePressed || isPauseButtonPressed(this);
    const leftPressed = this.inputActions.consume('nav-left', { cooldownMs: 120 });
    const rightPressed = this.inputActions.consume('nav-right', { cooldownMs: 120 });
    this.atmosphere?.update(this.player.x, this.player.y, this.time.now);
    this.clickMove?.update(this.time.now);

    if (pausePressed && this.phase !== 'resolved') {
      openPauseMenu(this);
      return;
    }

    if (this.phase === 'resolved') {
      if (interactionPressed || enterPressed) {
        this.continueFromReturnResult();
      }
      return;
    }

    if (this.phase === 'response-choice' || this.phase === 'sale-choice') {
      if (leftPressed) {
        this.choiceIndex = 0;
        this.shopAudio?.playSfx('choice-move');
        this.updateChoiceHighlight();
        return;
      }

      if (rightPressed) {
        this.choiceIndex = 1;
        this.shopAudio?.playSfx('choice-move');
        this.updateChoiceHighlight();
        return;
      }

      if (interactionPressed) this.confirmCurrentChoice();
      return;
    }

    if (this.phase === 'conversation') {
      if (interactionPressed) {
        this.shopAudio?.playSfx('dialogue');
        this.requestConversationAdvance();
      }
      return;
    }

    this.player.update();
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.turnShopkeeperTowardPlayer();

    if (this.phase === 'arriving') {
      return;
    }

    this.updateNearestInteraction();

    if (interactionPressed && this.shopkeeperNearby) {
      this.beginShopkeeperConversation();
    }
  }

  private resetAntiqueShopState(): void {
    this.departureChoice = this.incomingDepartureChoice;
    this.appearanceId = this.incomingAppearanceId;
    this.phase = 'arriving';
    this.shopkeeperResponse = undefined;
    this.outcome = undefined;
    this.conversationBeats = [];
    this.conversationIndex = 0;
    this.conversationCompletion = 'response-choice';
    this.choiceIndex = 0;
    this.shopkeeperNearby = false;
    this.counterArtifact = undefined;
    this.counterArtifactTween = undefined;
    this.arrivalTimer = undefined;
    this.locationTween = undefined;
    this.atmosphere = undefined;
  }

  private createCounterInteraction(): void {
    this.worldPrompt = createStyleBoardPrompt(this, 'E', 'Speak / 交谈', 184, 42)
      .setPosition(
        this.shopInterior?.promptX ?? 810,
        this.shopInterior?.promptY ?? 318,
      )
      .setDepth(6)
      .setVisible(false);
    this.shopkeeper
      ?.setSize(84, 118)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.phase !== 'free-roam') return;
        if (this.shopkeeperNearby) {
          this.interactionController?.acknowledge(this.shopkeeper!);
          this.beginShopkeeperConversation();
        } else {
          const interactionX = this.shopInterior?.interactionX ?? 640;
          const interactionY = this.shopInterior?.interactionY ?? 340;
          const radius = this.shopInterior?.interactionRadius ?? 112;
          const moving = this.clickMove?.moveNear(interactionX, interactionY, radius, () => {
            if (this.phase !== 'free-roam') return;
            this.updateNearestInteraction();
            if (this.shopkeeperNearby) this.beginShopkeeperConversation();
          });
          if (!moving) {
            this.interactionController?.rejectAt(interactionX, interactionY - 70, '柜台这边过不去，换个方向试试');
          }
        }
      });
  }

  private createInterface(): void {
    this.createLocationUI();
    this.createObjectiveUI();
    this.createControlHints();
    this.createConversationPanel();
    this.createChoicePanel();
    this.createResultPanel();
  }

  private createLocationUI(): void {
    this.locationUI = createTimedLocationTitle(this, {
      english: 'ANTIQUE SHOP',
      chinese: '古玩店',
    }).container;
  }

  private createObjectiveUI(): void {
    const background = createStyleBoardPanel(this, 310, 112, 'thin', 0.94);
    const englishTitle = this.add
      .text(-137, -42, 'OBJECTIVE', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.muted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-137, -23, '当前目标', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0, 0.5);
    const english = this.add
      .text(-137, 0, 'Speak with the shopkeeper.', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0, 0);
    const chinese = this.add
      .text(-137, 28, '去找老板，把墓里的事说清楚。', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: UI_STYLE_BOARD.colors.text,
      })
      .setOrigin(0, 0);
    this.objectiveUI = this.add
      .container(175, 142, [
        background,
        englishTitle,
        chineseTitle,
        english,
        chinese,
      ])
      .setScrollFactor(0)
      .setDepth(11);
  }

  private createControlHints(): void {
    this.controlHint = this.add
      .text(640, 678, 'WASD / 鼠标点击地面  移动     E  交谈', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#b0a187',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.escapeHint = this.add
      .text(28, 678, 'ESC  Pause / 暂停', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#969e92',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10);
  }

  private createConversationPanel(): void {
    const background = createParchmentPanel(this, 1100, 238);
    this.conversationEnglishTitle = this.add
      .text(-470, -78, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#4f2415',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    setTypographyRole(this.conversationEnglishTitle, 'dialogue-speaker-dark');
    this.conversationChineseTitle = this.add
      .text(-470, -53, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#332016',
      })
      .setOrigin(0, 0.5);
    setTypographyRole(this.conversationChineseTitle, 'meta-dark');
    this.conversationEnglishText = this.add
      .text(-470, -24, '', {
        fontFamily: SERIF_FONT,
        fontSize: '20px',
        color: '#1e1109',
        wordWrap: { width: 940 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    setTypographyRole(this.conversationEnglishText, 'dialogue-body-dark');
    this.conversationChineseText = this.add
      .text(-470, 35, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#24140b',
        wordWrap: { width: 940 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    setTypographyRole(this.conversationChineseText, 'dialogue-translation-dark');
    const continueBacking = this.add
      .rectangle(0, 96, 270, 30, 0x21150e, 0.92)
      .setStrokeStyle(1, 0x9c7140, 0.78);
    this.conversationContinueHint = this.add
      .text(0, 96, 'E / 鼠标点击  继续', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#ead9b9',
      })
      .setOrigin(0.5);
    setTypographyRole(this.conversationContinueHint, 'hint-light');
    this.conversationReveal = new BilingualTextReveal(
      this,
      this.conversationEnglishText,
      this.conversationChineseText,
      () => {
        if (this.conversationEnglishText && this.conversationChineseText) {
          this.conversationChineseText.setY(
            this.conversationEnglishText.y + this.conversationEnglishText.height + 8,
          );
        }
      },
    );
    this.conversationPanel = this.add
      .container(
        this.scale.width / 2,
        590,
        [
        background,
        this.conversationEnglishTitle,
        this.conversationChineseTitle,
        this.conversationEnglishText,
        this.conversationChineseText,
        continueBacking,
        this.conversationContinueHint,
        ],
      )
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false)
      .setSize(1100, 238)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.conversationContinueHint?.setColor('#fff0c9'))
      .on('pointerout', () => this.conversationContinueHint?.setColor('#aaa087'))
      .on(
        'pointerup',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          if (this.phase !== 'conversation') return;
          this.shopAudio?.playSfx('dialogue');
          this.requestConversationAdvance();
        },
      );
  }

  private createChoicePanel(): void {
    const background = createParchmentPanel(this, 1000, 216);
    this.choiceEnglishTitle = this.add
      .text(0, -73, '', {
        fontFamily: SERIF_FONT,
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#1e1109',
      })
      .setOrigin(0.5);
    setTypographyRole(this.choiceEnglishTitle, 'dialogue-body-dark');
    this.choiceChineseTitle = this.add
      .text(0, -45, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#2e1b12',
      })
      .setOrigin(0.5);
    setTypographyRole(this.choiceChineseTitle, 'dialogue-translation-dark');
    this.leftChoiceBox = this.add
      .rectangle(-230, 15, 410, 72, 0x302a22, 1)
      .setStrokeStyle(2, 0x716650, 0.75)
      .setInteractive({ useHandCursor: true });
    this.rightChoiceBox = this.add
      .rectangle(230, 15, 410, 72, 0x302a22, 1)
      .setStrokeStyle(2, 0x716650, 0.75)
      .setInteractive({ useHandCursor: true });
    this.leftChoiceEnglish = this.add
      .text(-230, 1, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#d8ceb4',
        align: 'center',
      })
      .setOrigin(0.5);
    this.leftChoiceChinese = this.add
      .text(-230, 28, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#bbb19e',
      })
      .setOrigin(0.5);
    this.rightChoiceEnglish = this.add
      .text(230, 1, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#d8ceb4',
        align: 'center',
      })
      .setOrigin(0.5);
    this.rightChoiceChinese = this.add
      .text(230, 28, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#bbb19e',
      })
      .setOrigin(0.5);
    const hintBacking = this.add
      .rectangle(0, 76, 480, 30, 0x21150e, 0.92)
      .setStrokeStyle(1, 0x9c7140, 0.78);
    const hint = this.add
      .text(0, 76, 'A / D 或鼠标悬停  选择     E / 鼠标点击  确认', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#ead9b9',
      })
      .setOrigin(0.5);
    setTypographyRole(hint, 'hint-light');
    this.choicePanel = this.add
      .container(this.scale.width / 2, 590, [
        background,
        this.choiceEnglishTitle,
        this.choiceChineseTitle,
        this.leftChoiceBox,
        this.rightChoiceBox,
        this.leftChoiceEnglish,
        this.leftChoiceChinese,
        this.rightChoiceEnglish,
        this.rightChoiceChinese,
        hintBacking,
        hint,
      ])
      .setScrollFactor(0)
      .setDepth(25)
      .setVisible(false);
    this.bindChoicePointer(this.leftChoiceBox, 0);
    this.bindChoicePointer(this.rightChoiceBox, 1);
  }

  private bindChoicePointer(box: Phaser.GameObjects.Rectangle, index: number): void {
    box
      .on('pointerover', () => {
        if (this.choiceIndex !== index) this.shopAudio?.playSfx('choice-move');
        this.choiceIndex = index;
        this.updateChoiceHighlight();
      })
      .on('pointerdown', () => box.setScale(0.985))
      .on('pointerout', () => {
        box.setScale(1);
        this.updateChoiceHighlight();
      })
      .on(
        'pointerup',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          box.setScale(1);
          this.choiceIndex = index;
          this.updateChoiceHighlight();
          this.confirmCurrentChoice();
        },
      );
  }

  private confirmCurrentChoice(): void {
    if (this.phase !== 'response-choice' && this.phase !== 'sale-choice') return;
    this.shopAudio?.playSfx('choice-confirm');
    if (this.phase === 'response-choice') this.confirmShopkeeperResponse();
    else this.confirmSaleChoice();
  }

  private createResultPanel(): void {
    const background = this.add.rectangle(
      0,
      0,
      ANTIQUE_SHOP_WIDTH,
      ANTIQUE_SHOP_HEIGHT,
      0x0d0f0c,
      0.988,
    );
    const title = this.add
      .text(0, -290, 'THE FIRST RETURN', {
        fontFamily: SERIF_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#eee4c9',
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const chineseTitle = this.add
      .text(0, -246, '第一次回店', {
        fontFamily: SERIF_FONT,
        fontSize: '25px',
        color: '#b9ae95',
      })
      .setOrigin(0.5);
    this.resultStatusEnglish = this.add
      .text(0, -188, '', {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#b6a37e',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.resultStatusChinese = this.add
      .text(0, -158, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#8f8674',
      })
      .setOrigin(0.5);
    this.resultArtifactEnglish = this.add
      .text(0, -105, '', {
        fontFamily: SERIF_FONT,
        fontSize: '29px',
        fontStyle: 'bold',
        color: '#e1d7bc',
      })
      .setOrigin(0.5);
    this.resultArtifactChinese = this.add
      .text(0, -66, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#9da38b',
      })
      .setOrigin(0.5);
    this.resultReceivedEnglish = this.add
      .text(0, -15, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#998e74',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.resultReceivedChinese = this.add
      .text(0, 8, '', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#877e69',
      })
      .setOrigin(0.5);
    this.resultAmount = this.add
      .text(0, 52, '', {
        fontFamily: SERIF_FONT,
        fontSize: '31px',
        color: '#ded4b7',
      })
      .setOrigin(0.5);
    this.resultBodyEnglish = this.add
      .text(0, 112, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#c8bea6',
        wordWrap: { width: 850 },
        align: 'center',
      })
      .setOrigin(0.5);
    this.resultBodyChinese = this.add
      .text(0, 145, '', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#9d9481',
        wordWrap: { width: 850 },
        align: 'center',
      })
      .setOrigin(0.5);
    this.resultAttitudeEnglish = this.add
      .text(0, 205, '', {
        fontFamily: SERIF_FONT,
        fontSize: '20px',
        fontStyle: 'italic',
        color: '#ded4b7',
      })
      .setOrigin(0.5);
    this.resultAttitudeChinese = this.add
      .text(0, 239, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#a79d88',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 310, 'E / ENTER  RETURN TO MENU / 返回主菜单', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#8f846e',
      })
      .setOrigin(0.5);
    this.resultPanel = this.add
      .container(640, 360, [
        background,
        title,
        chineseTitle,
        this.resultStatusEnglish,
        this.resultStatusChinese,
        this.resultArtifactEnglish,
        this.resultArtifactChinese,
        this.resultReceivedEnglish,
        this.resultReceivedChinese,
        this.resultAmount,
        this.resultBodyEnglish,
        this.resultBodyChinese,
        this.resultAttitudeEnglish,
        this.resultAttitudeChinese,
        hint,
      ])
      .setScrollFactor(0)
      .setDepth(40)
      .setVisible(false);
  }

  private registerInput(): void {
    this.inputActions = InputActionManager.forScene(this);
  }

  private showArrivalLocation(): void {
    this.locationUI?.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.locationUI, alpha: 1, duration: 400 });
    this.arrivalTimer = this.time.delayedCall(2600, () => {
      if (this.phase !== 'arriving') {
        return;
      }
      this.phase = 'free-roam';
      this.locationTween = this.tweens.add({
        targets: this.locationUI,
        alpha: 0,
        duration: 650,
        onComplete: () => this.locationUI?.setVisible(false),
      });
    });
  }

  private updateNearestInteraction(): void {
    if (!this.player || this.phase !== 'free-roam') {
      this.shopkeeperNearby = false;
      this.worldPrompt?.setVisible(false);
      this.shopInterior?.interactionHighlight.setVisible(false);
      return;
    }
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.shopInterior?.interactionX ?? 640,
      this.shopInterior?.interactionY ?? 340,
    );
    this.shopkeeperNearby =
      distance <= (this.shopInterior?.interactionRadius ?? 112);
    this.worldPrompt?.setVisible(this.shopkeeperNearby);
    this.shopInterior?.interactionHighlight.setVisible(this.shopkeeperNearby);
  }

  private turnShopkeeperTowardPlayer(): void {
    if (!this.player || !this.shopkeeper) {
      return;
    }
    const direction = this.player.x < this.shopkeeper.x ? -1 : 1;
    this.shopInterior?.shopkeeperVisual.setFacing(direction as -1 | 1);
  }

  private beginShopkeeperConversation(): void {
    if (this.phase !== 'free-roam' || !this.player) {
      return;
    }
    this.phase = 'conversation';
    this.player.setMovementEnabled(false);
    this.shopkeeperNearby = false;
    this.worldPrompt?.setVisible(false);
    this.shopInterior?.interactionHighlight.setVisible(false);
    this.objectiveUI?.setVisible(false);
    this.controlHint?.setVisible(false);
    this.escapeHint?.setVisible(false);
    this.shopAudio?.playSfx('interact');
    this.createCounterArtifact();
    this.conversationBeats = this.buildConversationForDeparture();
    this.conversationIndex = 0;
    this.conversationCompletion = 'response-choice';
    this.showConversationBeat(this.conversationBeats[0]);
    this.conversationPanel?.setVisible(true);
    if (this.conversationPanel) revealPanel(this, this.conversationPanel);
  }

  private buildConversationForDeparture(): ConversationBeat[] {
    const reaction = REACTION_DATA[this.departureChoice];
    const beats: ConversationBeat[] = [
      this.shopkeeperBeat(reaction.reaction, reaction.chineseReaction),
      this.shopkeeperBeat(reaction.quote, reaction.chineseQuote),
    ];

    if (this.incomingSettlement?.hasAtlas) {
      beats.push(
        {
          voice: 'player',
          englishTitle: 'YOU',
          chineseTitle: '你',
          englishText: '“There was a cellar below the coffin room. I found this chart inside.”',
          chineseText: '“棺室下面还藏着一层地窖。我在那里找到这本册子。”',
        },
        this.shopkeeperBeat(
          '“Put it on the counter. Do not unfold it toward the door.”',
          '“放柜台上。展开的那一面，别朝着门。”',
        ),
        {
          voice: 'appraisal',
          englishTitle: 'THE MYRIAD CHARACTER ATLAS',
          chineseTitle: '《万字藏图》',
          englishText: 'The shopkeeper recognizes the seals before the cloth is fully opened. His hand stops above the first route line.',
          chineseText: '包布才揭开一半，老板就认出了纸上的印记。他的手指停在第一条路线上，再没有往前。',
        },
        this.shopkeeperBeat(
          '“This is not a burial object. It is a route index—and this tomb was only its first mark.”',
          '“这不是陪葬品。它是一册路线索引。你刚去的那座墓，只是上面标出的第一处。”',
        ),
        {
          voice: 'thought',
          englishTitle: 'INNER THOUGHT',
          chineseTitle: '内心',
          englishText: 'He knew what it was before I said its name.',
          chineseText: '我连它叫什么都没说，他却已经认出来了。',
        },
      );
    }

    if (this.departureChoice !== 'empty') {
      const artifact = ARTIFACT_DATA[this.departureChoice];
      beats.push({
        voice: 'appraisal',
        englishTitle: 'INITIAL APPRAISAL',
        chineseTitle: '初步鉴定',
        englishText: artifact.appraisal,
        chineseText: artifact.chineseAppraisal,
      });
      beats.push(
        this.shopkeeperBeat(
          artifact.appraisalQuote,
          artifact.chineseAppraisalQuote,
        ),
      );
    }

    beats.push(
      this.shopkeeperBeat(reaction.slip, reaction.chineseSlip),
      {
        voice: 'thought',
        englishTitle: 'INNER THOUGHT',
        chineseTitle: '内心',
        englishText: reaction.thought,
        chineseText: reaction.chineseThought,
      },
    );
    return beats;
  }

  private shopkeeperBeat(
    englishText: string,
    chineseText: string,
  ): ConversationBeat {
    return {
      voice: 'shopkeeper',
      englishTitle: 'SHOPKEEPER',
      chineseTitle: '古玩店老板',
      englishText,
      chineseText,
      shopkeeperGesture: inferShopkeeperGesture(englishText),
    };
  }

  private showNextConversationBeat(): void {
    if (this.phase !== 'conversation') {
      return;
    }
    this.conversationIndex += 1;
    const nextBeat = this.conversationBeats[this.conversationIndex];
    if (nextBeat) {
      this.showConversationBeat(nextBeat);
      return;
    }

    this.conversationPanel?.setVisible(false);
    this.shopInterior?.shopkeeperVisual.playGesture('idle');
    if (this.conversationCompletion === 'response-choice') {
      this.openResponseChoice();
    } else if (this.conversationCompletion === 'sale-choice') {
      this.openSaleChoice();
    } else {
      this.resolveEmptyReturn();
    }
  }

  private requestConversationAdvance(): void {
    if (this.conversationReveal?.complete()) return;
    this.showNextConversationBeat();
  }

  private showConversationBeat(beat: ConversationBeat): void {
    if (
      !this.conversationEnglishTitle ||
      !this.conversationChineseTitle ||
      !this.conversationEnglishText ||
      !this.conversationChineseText
    ) {
      return;
    }
    const isThought = beat.voice === 'thought';
    this.shopInterior?.shopkeeperVisual.playGesture(
      beat.voice === 'shopkeeper' ? beat.shopkeeperGesture ?? 'nod' : 'idle',
    );
    this.conversationEnglishTitle.setText(beat.englishTitle);
    this.conversationChineseTitle.setText(beat.chineseTitle);
    this.conversationEnglishText
      .setColor(isThought ? '#354641' : '#21130b')
      .setFontStyle(isThought ? 'italic' : 'normal');
    this.conversationChineseText.setColor(isThought ? '#3b4d48' : '#21130b');
    this.conversationReveal?.show(beat.englishText, beat.chineseText);
    if (beat.voice === 'shopkeeper' || beat.voice === 'offer') {
      this.shopAudio?.speakEnglish(beat.englishText, 'shopkeeper');
    } else if (beat.voice === 'player') {
      this.shopAudio?.speakEnglish(beat.englishText, 'player');
    } else {
      this.shopAudio?.stopVoice();
    }
  }

  private openResponseChoice(): void {
    this.phase = 'response-choice';
    this.choiceIndex = 0;
    this.conversationPanel?.setVisible(false);
    this.configureChoicePanel(
      'HOW DO YOU RESPOND?',
      '要怎么回应？',
      'ASK HOW HE KNEW',
      '追问他怎么知道',
      'LET IT PASS',
      '装作没有察觉',
    );
  }

  private confirmShopkeeperResponse(): void {
    if (this.phase !== 'response-choice') {
      return;
    }
    this.shopkeeperResponse = this.choiceIndex === 0 ? 'challenged' : 'silent';
    this.choicePanel?.setVisible(false);

    const followup: ConversationBeat[] =
      this.shopkeeperResponse === 'challenged'
        ? [
            {
              voice: 'player',
              englishTitle: 'YOU',
              chineseTitle: '你',
              englishText: '“How did you know that?”',
              chineseText: '“你怎么会知道这些事？”',
            },
            this.shopkeeperBeat(
              '“If you need every answer before the second job, you are not ready for it.”',
              '“如果你非要在第二趟之前，把所有事情都问明白……那你还没准备好。”',
            ),
          ]
        : [
            this.shopkeeperBeat(
              '“Good. Knowing when not to ask is useful in this trade.”',
              '“很好。做这一行，知道什么时候不该问，也算一种本事。”',
            ),
          ];

    if (this.departureChoice !== 'empty') {
      const artifact = ARTIFACT_DATA[this.departureChoice];
      followup.push({
        voice: 'offer',
        englishTitle: 'SHOPKEEPER’S OFFER',
        chineseTitle: '老板报价',
        englishText: `${artifact.englishName}   ${artifact.offerLabel}\nThis is his offer—not its confirmed value.`,
        chineseText: `${artifact.chineseName}   ${artifact.offerLabel}\n这只是老板开的价，不代表器物真正的价值。`,
      });
      this.conversationCompletion = 'sale-choice';
    } else {
      this.conversationCompletion = 'resolved';
    }

    this.phase = 'conversation';
    this.conversationBeats = followup;
    this.conversationIndex = 0;
    this.showConversationBeat(followup[0]);
    this.conversationPanel?.setVisible(true);
    if (this.conversationPanel) revealPanel(this, this.conversationPanel);
  }

  private openSaleChoice(): void {
    this.phase = 'sale-choice';
    this.choiceIndex = 0;
    this.conversationPanel?.setVisible(false);
    this.configureChoicePanel(
      'WHAT WILL YOU DO?',
      '这件器物要怎么处理？',
      'SELL TO THE SHOPKEEPER',
      '卖给老板',
      'KEEP THE RELIC',
      '留下器物',
    );
  }

  private configureChoicePanel(
    englishTitle: string,
    chineseTitle: string,
    leftEnglish: string,
    leftChinese: string,
    rightEnglish: string,
    rightChinese: string,
  ): void {
    this.choiceEnglishTitle?.setText(englishTitle);
    this.choiceChineseTitle?.setText(chineseTitle);
    this.leftChoiceEnglish?.setText(leftEnglish);
    this.leftChoiceChinese?.setText(leftChinese);
    this.rightChoiceEnglish?.setText(rightEnglish);
    this.rightChoiceChinese?.setText(rightChinese);
    this.updateChoiceHighlight();
    this.choicePanel?.setVisible(true);
  }

  private updateChoiceHighlight(): void {
    const selectedStroke = 0xb19a72;
    const idleStroke = 0x716650;
    this.leftChoiceBox?.setStrokeStyle(
      2,
      this.choiceIndex === 0 ? selectedStroke : idleStroke,
      this.choiceIndex === 0 ? 1 : 0.75,
    );
    this.rightChoiceBox?.setStrokeStyle(
      2,
      this.choiceIndex === 1 ? selectedStroke : idleStroke,
      this.choiceIndex === 1 ? 1 : 0.75,
    );
    this.leftChoiceBox?.setFillStyle(this.choiceIndex === 0 ? 0x3c3024 : 0x302a22, 1);
    this.rightChoiceBox?.setFillStyle(this.choiceIndex === 1 ? 0x3c3024 : 0x302a22, 1);
    this.leftChoiceEnglish?.setColor(this.choiceIndex === 0 ? '#f0d9a8' : '#d8ceb4');
    this.rightChoiceEnglish?.setColor(this.choiceIndex === 1 ? '#f0d9a8' : '#d8ceb4');
  }

  private confirmSaleChoice(): void {
    if (this.phase !== 'sale-choice' || this.departureChoice === 'empty') {
      return;
    }
    const sold = this.choiceIndex === 0;
    this.outcome = this.determineShopOutcome(this.departureChoice, sold);
    this.choicePanel?.setVisible(false);
    this.shopAudio?.playSfx('place-relic');
    this.animateCounterArtifact(sold);
    this.showShopResult();
  }

  private determineShopOutcome(
    choice: PortableDepartureChoice,
    sold: boolean,
  ): AntiqueShopOutcome {
    return `${sold ? 'sold' : 'kept'}-${choice}` as AntiqueShopOutcome;
  }

  private resolveEmptyReturn(): void {
    this.outcome = 'returned-empty';
    this.showShopResult();
  }

  private showShopResult(): void {
    if (!this.outcome || !this.shopkeeperResponse) {
      return;
    }
    this.phase = 'resolved';
    this.player?.setMovementEnabled(false);
    this.conversationPanel?.setVisible(false);
    this.choicePanel?.setVisible(false);
    this.worldPrompt?.setVisible(false);
    this.objectiveUI?.setVisible(false);
    this.controlHint?.setVisible(false);
    this.escapeHint?.setVisible(false);

    const attitude =
      this.shopkeeperResponse === 'challenged'
        ? {
            english: '“Come back when you can ask a better question.”',
            chinese: '“等你想清楚该问什么，再回来。”',
          }
        : {
            english: '“You learn quickly.”',
            chinese: '“学得倒快。”',
          };
    this.resultAttitudeEnglish?.setText(attitude.english);
    this.resultAttitudeChinese?.setText(attitude.chinese);

    if (this.outcome === 'returned-empty') {
      this.setResultText(
        'NOTHING TO APPRAISE',
        '没有带回可供鉴定的器物',
        '',
        '',
        '',
        '',
        '',
        'The shopkeeper closes the ledger without writing anything down.',
        '老板合上账本，没有在上面留下任何记录。',
      );
    } else {
      const sold = this.outcome.startsWith('sold-');
      const artifact = ARTIFACT_DATA[this.departureChoice as PortableDepartureChoice];
      this.setResultText(
        sold ? 'SOLD TO THE SHOPKEEPER' : 'RELIC KEPT',
        sold ? '已出售给老板' : '已保留器物',
        artifact.englishName,
        artifact.chineseName,
        sold ? 'RECEIVED' : '',
        sold ? '获得' : '',
        sold ? artifact.offerLabel : '',
        sold ? '' : 'You leave without accepting the shopkeeper’s offer.',
        sold ? '' : '你没有接受老板的报价。',
      );
    }
    this.resultPanel?.setVisible(true);
  }

  private setResultText(
    statusEnglish: string,
    statusChinese: string,
    artifactEnglish: string,
    artifactChinese: string,
    receivedEnglish: string,
    receivedChinese: string,
    amount: string,
    bodyEnglish: string,
    bodyChinese: string,
  ): void {
    this.resultStatusEnglish?.setText(statusEnglish);
    this.resultStatusChinese?.setText(statusChinese);
    this.resultArtifactEnglish?.setText(artifactEnglish);
    this.resultArtifactChinese?.setText(artifactChinese);
    this.resultReceivedEnglish?.setText(receivedEnglish);
    this.resultReceivedChinese?.setText(receivedChinese);
    this.resultAmount?.setText(amount);
    this.resultBodyEnglish?.setText(bodyEnglish);
    this.resultBodyChinese?.setText(bodyChinese);
  }

  private createCounterArtifact(): void {
    if (this.departureChoice === 'empty' || this.counterArtifact) {
      return;
    }
    const textureKey = this.departureChoice === 'burial-vessel'
      ? SHOP_INTERIOR_TEXTURES.burialVessel
      : this.departureChoice === 'bronze-mirror'
        ? SHOP_INTERIOR_TEXTURES.bronzeMirror
        : SHOP_INTERIOR_TEXTURES.geomancersCompass;
    const artifact = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    if (this.departureChoice === 'geomancers-compass') {
      artifact.setDisplaySize(92, 80);
    } else {
      artifact.setDisplaySize(
        this.departureChoice === 'burial-vessel' ? 58 : 63,
        86,
      );
    }
    this.counterArtifact = this.add
      .container(
        this.shopInterior?.artifactX ?? 720,
        this.shopInterior?.artifactY ?? 237,
        [artifact],
      )
      .setDepth(4);
    this.shopAudio?.playSfx('place-relic');
  }

  private animateCounterArtifact(sold: boolean): void {
    if (!this.counterArtifact) {
      return;
    }
    this.counterArtifactTween?.stop();
    this.counterArtifactTween = this.tweens.add({
      targets: this.counterArtifact,
      y: sold ? 190 : 225,
      alpha: sold ? 0.55 : 0,
      duration: sold ? 650 : 500,
      ease: 'Sine.InOut',
    });
  }

  private cleanupAntiqueShopScene(): void {
    this.arrivalTimer?.remove(false);
    this.counterArtifactTween?.stop();
    this.locationTween?.stop();
    this.clickMove?.destroy();
    this.clickMove = undefined;
    this.conversationReveal?.destroy();
    this.conversationReveal = undefined;
    this.shopAudio?.destroy();
    this.shopAudio = undefined;
  }

  private continueFromReturnResult(): void {
    this.shopAudio?.playSfx('transition');
    if (this.incomingSettlement) {
      this.transitionController?.start(
        'ShopGrowthScene',
        { settlement: this.incomingSettlement, appearanceId: this.appearanceId },
        { durationMs: 220, label: '账页翻转 · 整理店务' },
      );
      return;
    }
    this.transitionController?.start('MainMenuScene', undefined, { durationMs: 220 });
  }

  private isDepartureChoice(
    value: DepartureChoice | undefined,
  ): value is DepartureChoice {
    return (
      value === 'empty' ||
      value === 'burial-vessel' ||
      value === 'bronze-mirror' ||
      value === 'geomancers-compass'
    );
  }
}
