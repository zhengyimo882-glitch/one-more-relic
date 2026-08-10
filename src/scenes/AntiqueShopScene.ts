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
  antiqueShopDepthFromGround,
  createAntiqueShopInterior,
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

const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;

export interface AntiqueShopSceneData {
  departureChoice: DepartureChoice;
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
    chineseAppraisal: '晚清的随葬陶器。工艺普通，器口也经过修补。',
    appraisalQuote:
      '“There are buyers for objects like this, but not many.”',
    chineseAppraisalQuote: '“这种东西有人收，不过不会太多。”',
  },
  'bronze-mirror': {
    englishName: 'Bronze Mirror',
    chineseName: '铜镜',
    offer: 2400,
    offerLabel: '¥2,400',
    appraisal:
      'This was not made merely for dressing. The inscription matters more than the bronze.',
    chineseAppraisal:
      '这面镜子并不只是用来照人。背后的铭文，比铜料本身更重要。',
    appraisalQuote: '“Someone will pay for a complete inscription.”',
    chineseAppraisalQuote: '“铭文完整，就会有人愿意出价。”',
  },
  'geomancers-compass': {
    englishName: 'Geomancer’s Compass',
    chineseName: '风水罗盘',
    offer: 1200,
    offerLabel: '¥1,200',
    appraisal:
      'A geomancer’s working compass. Water damaged the face, but the inner mechanism still moves.',
    chineseAppraisal:
      '风水师真正使用过的罗盘。盘面受了潮，但里面的机关还能转动。',
    appraisalQuote:
      '“To most buyers, it is only a broken surveying tool.”',
    chineseAppraisalQuote:
      '“对大多数买家来说，它不过是件坏掉的测量工具。”',
  },
};

const REACTION_DATA: Record<DepartureChoice, ReactionData> = {
  empty: {
    reaction: 'The shopkeeper studies you longer than the empty bag.',
    chineseReaction: '老板盯着你的时间，比盯着那只空袋子更久。',
    quote: '“Careful—or afraid?”',
    chineseQuote: '“小心，还是害怕？”',
    slip:
      '“You carried the compass, then decided to leave it behind. Sensible.”',
    chineseSlip: '“你拿起过那只罗盘，最后却把它留在了墓里。很明智。”',
    thought: 'I never told him I had carried it.',
    chineseThought: '我从没告诉过他，我曾经拿起过罗盘。',
  },
  'burial-vessel': {
    reaction: 'The shopkeeper taps the clay once and sets it aside.',
    chineseReaction: '老板在陶土上轻敲一下，便把它放到一旁。',
    quote: '“A cautious choice.”',
    chineseQuote: '“谨慎的选择。”',
    slip: '“The crack at the foot has spread since it was put below.”',
    chineseSlip: '“它被放进墓里以后，底足的裂痕又扩大了。”',
    thought: 'I never mentioned the crack at its foot.',
    chineseThought: '我从没提过底足的裂痕。',
  },
  'bronze-mirror': {
    reaction:
      'The shopkeeper covers the bronze face with a piece of cloth.',
    chineseReaction: '老板用一块布遮住铜镜的镜面。',
    quote: '“You noticed the inscription.”',
    chineseQuote: '“你注意到了那段铭文。”',
    slip:
      '“At least the final character on the reverse is still legible.”',
    chineseSlip: '“至少背面铭文的最后一个字还看得清。”',
    thought:
      'I never told him which part of the inscription survived.',
    chineseThought: '我从没告诉过他，铭文的哪一部分还看得清。',
  },
  'geomancers-compass': {
    reaction: 'He takes the compass before asking what else you saw.',
    chineseReaction: '他先拿过罗盘，才问你还在墓里看见了什么。',
    quote: '“So it was still there.”',
    chineseQuote: '“原来它还在那里。”',
    slip: '“Do not turn the seventh mark toward the door again.”',
    chineseSlip: '“别再把第七格转向门口。”',
    thought: 'Again? I never told him what moved inside the tomb.',
    chineseThought: '“再”？我从没告诉过他，墓里发生了什么。',
  },
};

export class AntiqueShopScene extends Phaser.Scene {
  private incomingDepartureChoice: DepartureChoice = 'empty';
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

  private interactionKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private leftChoiceKey?: Phaser.Input.Keyboard.Key;
  private rightChoiceKey?: Phaser.Input.Keyboard.Key;

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
    preloadPlayerAvatarAssets(this);
    preloadShopkeeperAssets(this);
    preloadParchmentPanel(this);
  }

  init(data?: Partial<AntiqueShopSceneData>): void {
    this.incomingDepartureChoice = this.isDepartureChoice(data?.departureChoice)
      ? data.departureChoice
      : 'empty';
    this.incomingAppearanceId = isPlayerAppearanceId(data?.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  create(): void {
    this.resetAntiqueShopState();
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
      ANTIQUE_SHOP_WIDTH / 2,
      620,
      this.appearanceId,
    );
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.physics.add.collider(this.player, this.shopInterior.obstacles);

    this.createInterface();
    this.registerInput();
    this.showArrivalLocation();
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupAntiqueShopScene,
      this,
    );
  }

  update(): void {
    if (
      !this.player ||
      !this.interactionKey ||
      !this.enterKey ||
      !this.escapeKey ||
      !this.leftChoiceKey ||
      !this.rightChoiceKey
    ) {
      return;
    }

    const interactionPressed = Phaser.Input.Keyboard.JustDown(
      this.interactionKey,
    );
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey);
    const escapePressed = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    const leftPressed = Phaser.Input.Keyboard.JustDown(this.leftChoiceKey);
    const rightPressed = Phaser.Input.Keyboard.JustDown(this.rightChoiceKey);
    this.atmosphere?.update(this.player.x, this.player.y, this.time.now);

    if (this.phase === 'resolved') {
      if (interactionPressed || enterPressed) {
        this.scene.start('MainMenuScene');
      }
      return;
    }

    if (this.phase === 'response-choice' || this.phase === 'sale-choice') {
      if (leftPressed) {
        this.choiceIndex = 0;
        this.updateChoiceHighlight();
        return;
      }

      if (rightPressed) {
        this.choiceIndex = 1;
        this.updateChoiceHighlight();
        return;
      }

      if (interactionPressed) {
        if (this.phase === 'response-choice') {
          this.confirmShopkeeperResponse();
        } else {
          this.confirmSaleChoice();
        }
      }
      return;
    }

    if (this.phase === 'conversation') {
      if (interactionPressed) {
        this.showNextConversationBeat();
      }
      return;
    }

    this.player.update();
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.turnShopkeeperTowardPlayer();

    if (this.phase === 'arriving') {
      if (escapePressed) {
        this.scene.start('MainMenuScene');
      }
      return;
    }

    this.updateNearestInteraction();

    if (escapePressed) {
      this.scene.start('MainMenuScene');
      return;
    }

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
    const background = this.add
      .rectangle(0, 0, 172, 32, 0x15110e, 0.92)
      .setStrokeStyle(1, 0xa58e68, 0.78);
    const label = this.add
      .text(0, 0, 'E  Speak / 交谈', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#ded4b7',
      })
      .setOrigin(0.5);
    this.worldPrompt = this.add
      .container(
        this.shopInterior?.promptX ?? 810,
        this.shopInterior?.promptY ?? 318,
        [background, label],
      )
      .setDepth(6)
      .setVisible(false);
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
    const background = this.add
      .rectangle(0, 0, 430, 96, 0x15120f, 0.84)
      .setStrokeStyle(1, 0x8d7858, 0.65);
    const english = this.add
      .text(0, -17, 'ANTIQUE SHOP', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#e6dcc4',
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const chinese = this.add
      .text(0, 22, '古玩店', {
        fontFamily: SERIF_FONT,
        fontSize: '19px',
        color: '#bbb3a1',
      })
      .setOrigin(0.5);
    this.locationUI = this.add
      .container(640, 88, [background, english, chinese])
      .setScrollFactor(0)
      .setDepth(12);
  }

  private createObjectiveUI(): void {
    const background = this.add
      .rectangle(0, 0, 310, 112, 0x1b1814, 0.92)
      .setStrokeStyle(1, 0xb09a75, 0.86);
    const englishTitle = this.add
      .text(-137, -42, 'OBJECTIVE', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#b29f79',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-137, -23, '当前目标', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#aaa18f',
      })
      .setOrigin(0, 0.5);
    const english = this.add
      .text(-137, 0, 'Speak with the shopkeeper.', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#e1d7bc',
      })
      .setOrigin(0, 0);
    const chinese = this.add
      .text(-137, 28, '与古玩店老板交谈。', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#bbb3a1',
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
      .text(640, 678, 'WASD  Move / 移动     E  Speak / 交谈', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#b0a187',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.escapeHint = this.add
      .text(28, 678, 'ESC  Menu / 返回', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#969e92',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10);
  }

  private createConversationPanel(): void {
    const background = createParchmentPanel(this, 1100, 206);
    this.conversationEnglishTitle = this.add
      .text(-510, -76, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#4f2415',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.conversationChineseTitle = this.add
      .text(-510, -54, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#332016',
      })
      .setOrigin(0, 0.5);
    this.conversationEnglishText = this.add
      .text(-510, -27, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#1e1109',
        wordWrap: { width: 1020 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.conversationChineseText = this.add
      .text(-510, 31, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#24140b',
        wordWrap: { width: 1020 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.conversationContinueHint = this.add
      .text(0, 78, 'E  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#2f1d11',
      })
      .setOrigin(0.5);
    this.conversationPanel = this.add
      .container(
        this.scale.width / 2,
        596,
        [
        background,
        this.conversationEnglishTitle,
        this.conversationChineseTitle,
        this.conversationEnglishText,
        this.conversationChineseText,
        this.conversationContinueHint,
        ],
      )
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
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
    this.choiceChineseTitle = this.add
      .text(0, -45, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#2e1b12',
      })
      .setOrigin(0.5);
    this.leftChoiceBox = this.add
      .rectangle(-230, 15, 410, 72, 0x302a22, 1)
      .setStrokeStyle(2, 0x716650, 0.75);
    this.rightChoiceBox = this.add
      .rectangle(230, 15, 410, 72, 0x302a22, 1)
      .setStrokeStyle(2, 0x716650, 0.75);
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
    const hint = this.add
      .text(0, 76, 'A / D  SELECT / 选择     E  CONFIRM / 确认', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#2f1d11',
      })
      .setOrigin(0.5);
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
        hint,
      ])
      .setScrollFactor(0)
      .setDepth(25)
      .setVisible(false);
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
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for the antique shop.');
    }
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.leftChoiceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightChoiceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  private showArrivalLocation(): void {
    this.arrivalTimer = this.time.delayedCall(1500, () => {
      if (this.phase !== 'arriving') {
        return;
      }
      this.phase = 'free-roam';
      this.locationTween = this.tweens.add({
        targets: this.locationUI,
        alpha: 0,
        duration: 450,
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
    this.createCounterArtifact();
    this.conversationBeats = this.buildConversationForDeparture();
    this.conversationIndex = 0;
    this.conversationCompletion = 'response-choice';
    this.showConversationBeat(this.conversationBeats[0]);
    this.conversationPanel?.setVisible(true);
  }

  private buildConversationForDeparture(): ConversationBeat[] {
    const reaction = REACTION_DATA[this.departureChoice];
    const beats: ConversationBeat[] = [
      this.shopkeeperBeat(reaction.reaction, reaction.chineseReaction),
      this.shopkeeperBeat(reaction.quote, reaction.chineseQuote),
    ];

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
      .setText(beat.englishText)
      .setColor(isThought ? '#354641' : '#1e1109')
      .setFontStyle(isThought ? 'italic' : 'normal');
    this.conversationChineseText
      .setText(beat.chineseText)
      .setColor(isThought ? '#3b4d48' : '#24140b');
  }

  private openResponseChoice(): void {
    this.phase = 'response-choice';
    this.choiceIndex = 0;
    this.conversationPanel?.setVisible(false);
    this.configureChoicePanel(
      'HOW DO YOU RESPOND?',
      '你准备怎么回应？',
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
              chineseText: '“你怎么会知道这些？”',
            },
            this.shopkeeperBeat(
              '“If you need every answer before the second job, you are not ready for it.”',
              '“如果第二趟之前，你就需要知道所有答案，那你还没准备好。”',
            ),
          ]
        : [
            this.shopkeeperBeat(
              '“Good. Knowing when not to ask is useful in this trade.”',
              '“很好。做这一行，知道什么时候不该问，也是一种本事。”',
            ),
          ];

    if (this.departureChoice !== 'empty') {
      const artifact = ARTIFACT_DATA[this.departureChoice];
      followup.push({
        voice: 'offer',
        englishTitle: 'SHOPKEEPER’S OFFER',
        chineseTitle: '老板报价',
        englishText: `${artifact.englishName}   ${artifact.offerLabel}\nThis is his offer—not its confirmed value.`,
        chineseText: `${artifact.chineseName}   ${artifact.offerLabel}\n这只是老板的报价，不代表器物已经被确认的真实价值。`,
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
  }

  private openSaleChoice(): void {
    this.phase = 'sale-choice';
    this.choiceIndex = 0;
    this.conversationPanel?.setVisible(false);
    this.configureChoicePanel(
      'WHAT WILL YOU DO?',
      '你准备怎么处理？',
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
  }

  private confirmSaleChoice(): void {
    if (this.phase !== 'sale-choice' || this.departureChoice === 'empty') {
      return;
    }
    const sold = this.choiceIndex === 0;
    this.outcome = this.determineShopOutcome(this.departureChoice, sold);
    this.choicePanel?.setVisible(false);
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
            chinese: '“等你想好该问什么，再回来。”',
          }
        : {
            english: '“You learn quickly.”',
            chinese: '“你学得很快。”',
          };
    this.resultAttitudeEnglish?.setText(attitude.english);
    this.resultAttitudeChinese?.setText(attitude.chinese);

    if (this.outcome === 'returned-empty') {
      this.setResultText(
        'NOTHING TO APPRAISE',
        '没有可以鉴定的器物',
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
    const shadow = this.add.ellipse(0, 11, 62, 22, 0x080706, 0.4);
    const artifact = this.add.graphics();
    if (this.departureChoice === 'burial-vessel') {
      artifact.fillStyle(0x82745b, 1);
      artifact.fillEllipse(0, 2, 46, 50);
      artifact.fillRect(-13, -24, 26, 13);
      artifact.lineStyle(2, 0xb3a27c, 0.7);
      artifact.strokeEllipse(0, 2, 46, 50);
    } else if (this.departureChoice === 'bronze-mirror') {
      artifact.fillStyle(0x42514c, 1);
      artifact.fillCircle(0, -4, 25);
      artifact.lineStyle(4, 0x819188, 0.82);
      artifact.strokeCircle(0, -4, 25);
      artifact.fillStyle(0x647168, 1);
      artifact.fillRoundedRect(-7, 20, 14, 24, 4);
    } else {
      artifact.fillStyle(0x9b906e, 1);
      artifact.fillCircle(0, 0, 27);
      artifact.lineStyle(2, 0xd0c39b, 0.85);
      artifact.strokeCircle(0, 0, 27);
      artifact.lineBetween(-20, 0, 20, 0);
      artifact.lineBetween(0, -20, 0, 20);
      artifact.fillStyle(0x526158, 1);
      artifact.fillTriangle(0, -18, -5, 8, 6, 5);
    }
    this.counterArtifact = this.add
      .container(
        this.shopInterior?.artifactX ?? 720,
        this.shopInterior?.artifactY ?? 237,
        [shadow, artifact],
      )
      .setDepth(4);
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
    this.player?.setMovementEnabled(false);
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
