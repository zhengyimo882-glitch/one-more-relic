import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_APPEARANCE_ID,
  isPlayerAppearanceId,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import { Player } from '../objects/Player';
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
import {
  getPlayerAvatarTint,
  PLAYER_PORTRAIT_FRAME,
  PLAYER_TEXTURE_KEY,
  preloadPlayerAvatarAssets,
} from '../visuals/createPlayerAvatarVisual';
import {
  inferShopkeeperGesture,
  preloadShopkeeperAssets,
  SHOPKEEPER_TEXTURE_KEY,
  shopkeeperFrameForGesture,
  type ShopkeeperGesture,
} from '../visuals/createShopkeeperVisual';
import {
  createParchmentPanel,
  preloadParchmentPanel,
} from '../visuals/createParchmentPanel';
import { ShopAudioSystem } from '../systems/ShopAudioSystem';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import {
  createStyleBoardPanel,
  createStyleBoardPrompt,
  UI_STYLE_BOARD,
} from '../ui/styleBoardUi';

const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;

interface ShopIntroductionSceneData {
  appearanceId?: PlayerAppearanceId;
}

type ShopIntroductionPhase =
  | 'arriving'
  | 'free-roam'
  | 'conversation'
  | 'response-choice'
  | 'job-confirmation'
  | 'departing';

type FirstMeetingResponse = 'asked-payment' | 'asked-why';
type ConversationDestination = 'response-choice' | 'job-confirmation' | 'departing';

interface DialogueBeat {
  speakerEn: string;
  speakerZh: string;
  textEn: string;
  textZh: string;
  shopkeeperGesture?: ShopkeeperGesture;
}

const OPENING_BEATS: DialogueBeat[] = [
  narrator(
    'You place the chipped brass tally on the counter.',
    '你把那块缺角的旧铜牌放上柜台。',
  ),
  shopkeeper(
    '“Close the door. The damp gets into old wood.”',
    '“门带上。夜里潮，木头受不住。”',
  ),
  shopkeeper('“Where did you get this?”', '“这东西……你从哪儿弄来的？”'),
  you('“A street stall. Years ago.”', '“很多年前，从旧货摊上买的。”'),
  shopkeeper(
    '“And you waited until tonight to sell it.”',
    '“买了这么多年，偏偏今晚才想起拿来卖。”',
  ),
  you('“Is it worth anything?”', '“它值多少钱？”'),
  shopkeeper('“The brass? No.”', '“就这点铜？不值几个钱。”'),
  shopkeeper(
    '“The fact that it came back here? Perhaps.”',
    '“不过，它还能回到这里……倒有点意思。”',
  ),
  narrator(
    'The broken edge fits the shape recorded in the ledger.',
    '铜牌缺损的边缘，正好嵌进账簿上的旧印记。',
  ),
  shopkeeper(
    '“It was an inventory tally from this shop.”',
    '“这是这家店以前用过的货牌。”',
  ),
  shopkeeper(
    '“It disappeared with something that belonged to me.”',
    '“当年，它和另一件东西一起丢了。那件东西，也是我的。”',
  ),
  you('“Then take it back.”', '“那还给你。”'),
  shopkeeper(
    '“I do not pay for what is already mine.”',
    '“本来就是我的东西，我不会再掏钱买一遍。”',
  ),
  shopkeeper(
    '“But I do pay for retrieval.”',
    '“不过，我可以花钱，请人替我把另一件东西取回来。”',
  ),
  you('“From where?”', '“去哪儿取？”'),
  shopkeeper(
    '“An abandoned storehouse outside the city.”',
    '“城外。有间废弃的仓房。”',
  ),
  shopkeeper(
    '“The entrance has partly collapsed. No one uses it now.”',
    '“入口塌了一半，早就没人用了。”',
  ),
  you('“What am I bringing back?”', '“我要找什么？”'),
  shopkeeper(
    '“A brass geomancer’s compass. About the width of your palm.”',
    '“一只黄铜风水罗盘。差不多巴掌大。”',
  ),
  shopkeeper(
    '“Do not clean it. Do not force the inner ring.”',
    '“别擦，也别硬转里面的盘。”',
  ),
  you('“Why ask me?”', '“为什么找我去？”'),
  shopkeeper(
    '“Because you came here for cash, not a story.”',
    '“因为你来这里是为了钱，不是为了听我讲故事。”',
  ),
  shopkeeper(
    '“And because you did not polish the tally before bringing it in.”',
    '“还有，你拿来之前，没有把这块牌子擦得锃亮。”',
  ),
  you('“You think that makes me qualified?”', '“这样就算合格？”'),
  shopkeeper(
    '“It makes you less likely to ruin what you touch.”',
    '“至少说明，你不会随手毁掉自己看不懂的东西。”',
  ),
];

const PAYMENT_BEATS: DialogueBeat[] = [
  you('“How much will you pay?”', '“你打算付多少？”'),
  shopkeeper(
    '“Enough to stop counting your rent for a while.”',
    '“够你先把眼前的房租付了。”',
  ),
  shopkeeper(
    '“More, if you bring back the correct object.”',
    '“带回来的要真是我要的东西，还会更多。”',
  ),
  narrator('I had never mentioned the rent.', '我没跟他提过房租。'),
];

const WHY_BEATS: DialogueBeat[] = [
  you(
    '“Why don’t you retrieve it yourself?”',
    '“你为什么不自己去？”',
  ),
  shopkeeper('“Old injuries. Narrow steps.”', '“腿上有旧伤。那条路，也太窄。”'),
  shopkeeper(
    '“Choose whichever part of that answer lets you sleep.”',
    '“你愿意信哪一句，就信哪一句。”',
  ),
];

const TOOL_BEATS: DialogueBeat[] = [
  narrator(
    'He places a canvas bag and a hand-drawn route on the counter.',
    '老板把一只帆布包和一张手绘路线推到柜台前。',
  ),
  you('“This is the address?”', '“这也算地址？”'),
  shopkeeper(
    '“It is enough, if you follow my marks.”',
    '“沿着我留下的标记走。找得到的。”',
  ),
  you(
    '“And if I find something else inside?”',
    '“要是里面还有别的东西呢？”',
  ),
  shopkeeper(
    '“I asked you to retrieve one object.”',
    '“我只让你带回一件东西。”',
  ),
  shopkeeper(
    '“What you choose to touch after that is your concern.”',
    '“至于你还要碰什么……那是你自己的事。”',
  ),
  shopkeeper('“One rule.”', '“记住一条规矩。”'),
  shopkeeper(
    '“If you decide to leave, leave.”',
    '“真决定走了，就一直往外走。”',
  ),
  shopkeeper(
    '“Do not turn back for one more thing.”',
    '“别走到一半，又为了多拿一件东西回头。”',
  ),
];

const ROUTE_REVIEW_BEATS: DialogueBeat[] = [
  narrator(
    'The hand-drawn route names no street. It marks only turns beyond the city and a partly collapsed entrance.',
    '路线上没有地名，只有几个城外的转弯，以及一处塌了一半的入口。',
  ),
  shopkeeper(
    '“Follow the marks. Bring back the brass geomancer’s compass.”',
    '“沿着标记走，把那只黄铜罗盘带回来。”',
  ),
];

const ACCEPT_BEATS: DialogueBeat[] = [
  you(
    '“All right. I’ll retrieve your compass.”',
    '“好。我把罗盘带回来。”',
  ),
  shopkeeper('“Bring the bag back as well.”', '“包也别丢了。”'),
  shopkeeper(
    '“Tools have a habit of finding new owners.”',
    '“工具这东西，一不留神，就会换主人。”',
  ),
];

function narrator(textEn: string, textZh: string): DialogueBeat {
  return { speakerEn: 'NARRATION', speakerZh: '旁白', textEn, textZh };
}

function shopkeeper(textEn: string, textZh: string): DialogueBeat {
  return {
    speakerEn: 'SHOPKEEPER',
    speakerZh: '古玩店老板',
    textEn,
    textZh,
    shopkeeperGesture: inferShopkeeperGesture(textEn),
  };
}

function you(textEn: string, textZh: string): DialogueBeat {
  return { speakerEn: 'YOU', speakerZh: '你', textEn, textZh };
}

export class ShopIntroductionScene extends Phaser.Scene {
  private appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID;
  private phase: ShopIntroductionPhase = 'arriving';
  private player?: Player;
  private interior?: AntiqueShopInterior;
  private dialogueBeats: DialogueBeat[] = [];
  private dialogueIndex = 0;
  private conversationDestination: ConversationDestination = 'response-choice';
  private selectedChoice = 0;
  private firstMeetingResponse?: FirstMeetingResponse;
  private arrivalTimer?: Phaser.Time.TimerEvent;
  private transitionTimer?: Phaser.Time.TimerEvent;
  private collider?: Phaser.Physics.Arcade.Collider;
  private atmosphere?: ProceduralAtmosphere;
  private shopAudio?: ShopAudioSystem;

  private interactKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  private locationUI?: Phaser.GameObjects.Container;
  private objectiveUI?: Phaser.GameObjects.Container;
  private interactionPrompt?: Phaser.GameObjects.Container;
  private dialoguePanel?: Phaser.GameObjects.Container;
  private dialogueSpeakerEn?: Phaser.GameObjects.Text;
  private dialogueSpeakerZh?: Phaser.GameObjects.Text;
  private dialogueTextEn?: Phaser.GameObjects.Text;
  private dialogueTextZh?: Phaser.GameObjects.Text;
  private dialogueContext?: Phaser.GameObjects.Text;
  private dialogueProgress?: Phaser.GameObjects.Text;
  private dialogueAccent?: Phaser.GameObjects.Rectangle;
  private dialoguePortrait?: Phaser.GameObjects.Graphics;
  private dialogueShopkeeperPortrait?: Phaser.GameObjects.Sprite;
  private dialoguePlayerPortrait?: Phaser.GameObjects.Sprite;
  private dialogueFocusOverlay?: Phaser.GameObjects.Graphics;
  private dialogueSpeakerFocus?: Phaser.GameObjects.Graphics;
  private choicePanel?: Phaser.GameObjects.Container;
  private choiceTitleEn?: Phaser.GameObjects.Text;
  private choiceTitleZh?: Phaser.GameObjects.Text;
  private choiceCards: Phaser.GameObjects.Container[] = [];
  private tallyVisual?: Phaser.GameObjects.Container;
  private toolsVisual?: Phaser.GameObjects.Container;

  constructor() {
    super('ShopIntroductionScene');
  }

  preload(): void {
    preloadPlayerAvatarAssets(this);
    preloadShopkeeperAssets(this);
    preloadParchmentPanel(this);
    preloadAntiqueShopInteriorAssets(this);
  }

  init(data: ShopIntroductionSceneData): void {
    this.appearanceId = isPlayerAppearanceId(data.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  create(): void {
    this.resetState();
    this.shopAudio = new ShopAudioSystem();
    this.physics.world.setBounds(0, 0, ANTIQUE_SHOP_WIDTH, ANTIQUE_SHOP_HEIGHT);
    this.cameras.main.setBackgroundColor('#111310');
    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'antique-shop',
      worldWidth: ANTIQUE_SHOP_WIDTH,
      worldHeight: ANTIQUE_SHOP_HEIGHT,
      lightAnchors: [
        new Phaser.Math.Vector2(390, 360),
        new Phaser.Math.Vector2(890, 360),
      ],
    });
    this.interior = createAntiqueShopInterior(this);
    this.player = new Player(
      this,
      SHOP_LAYOUT.playerSpawn.x,
      SHOP_LAYOUT.playerSpawn.y,
      this.appearanceId,
    );
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.collider = this.physics.add.collider(
      this.player,
      this.interior.obstacles,
    );
    this.createFixedUI();
    this.createInput();
    this.startArrival();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(): void {
    if (!this.player || !this.interactKey || !this.enterKey || !this.escapeKey) {
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey) || isPauseButtonPressed(this)) {
      openPauseMenu(this);
      return;
    }
    this.atmosphere?.update(this.player.x, this.player.y, this.time.now);

    if (this.phase === 'free-roam' || this.phase === 'arriving') {
      this.player.update();
      this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
      if (this.phase === 'free-roam') {
        this.updateCounterPrompt();
      }
    } else {
      this.player.setMovementEnabled(false);
    }

    const confirmPressed =
      Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey);

    if (this.phase === 'job-confirmation') {
      this.updateChoiceInput(confirmPressed, true);
      return;
    }
    if (this.phase === 'response-choice') {
      this.updateChoiceInput(confirmPressed, false);
      return;
    }
    if (this.phase === 'conversation') {
      if (confirmPressed) {
        this.advanceConversation();
      }
      return;
    }
    if (this.phase === 'free-roam') {
      if (confirmPressed && this.isPlayerNearCounter()) {
        this.beginFirstConversation();
      }
      return;
    }
  }

  private resetState(): void {
    this.phase = 'arriving';
    this.dialogueBeats = [];
    this.dialogueIndex = 0;
    this.conversationDestination = 'response-choice';
    this.selectedChoice = 0;
    this.firstMeetingResponse = undefined;
    this.choiceCards = [];
    this.arrivalTimer = undefined;
    this.transitionTimer = undefined;
    this.atmosphere = undefined;
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for the shop introduction.');
    }
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private createFixedUI(): void {
    const locationBackground = this.add
      .rectangle(0, 0, 410, 96, 0x17130f, 0.9)
      .setOrigin(0)
      .setStrokeStyle(1, 0xa98d61, 0.78);
    const locationRule = this.add.rectangle(0, 0, 6, 96, 0xb07b49, 0.95)
      .setOrigin(0);
    this.locationUI = this.add
      .container(38, 34, [
        locationBackground,
        locationRule,
        this.add.text(24, 14, 'FIRST COMMISSION', {
          fontFamily: SANS_FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#b79b6e',
          letterSpacing: 2,
        }),
        this.add.text(24, 32, 'ANTIQUE SHOP', {
          fontFamily: SERIF_FONT,
          fontSize: '27px',
          fontStyle: 'bold',
          color: '#e0d4bc',
          letterSpacing: 1,
        }),
        this.add.text(24, 65, '古玩店 · 城南旧街 · 夜', {
          fontFamily: SERIF_FONT,
          fontSize: '15px',
          color: '#bcb29e',
        }),
      ])
      .setDepth(100)
      .setScrollFactor(0);

    const objectiveBg = createStyleBoardPanel(this, 300, 96, 'thin', 0.94);
    this.objectiveUI = this.add
      .container(this.scale.width - 174, 78, [
        objectiveBg,
        this.add
          .text(-132, -39, 'OBJECTIVE', {
            fontFamily: SANS_FONT,
            fontSize: '12px',
            fontStyle: 'bold',
            color: UI_STYLE_BOARD.colors.muted,
          }),
        this.add.text(-132, -22, '当前目标', {
          fontFamily: SANS_FONT,
          fontSize: '11px',
          color: UI_STYLE_BOARD.colors.muted,
        }),
        this.add.text(-132, -1, 'Show the brass tally to the shopkeeper.', {
          fontFamily: SERIF_FONT,
          fontSize: '15px',
          color: UI_STYLE_BOARD.colors.textBright,
          wordWrap: { width: 264 },
        }),
        this.add.text(-132, 27, '把铜牌交给老板。', {
          fontFamily: SERIF_FONT,
          fontSize: '13px',
          color: UI_STYLE_BOARD.colors.text,
        }),
      ])
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    this.interactionPrompt = createStyleBoardPrompt(
      this,
      'E',
      'SHOW THE TALLY / 出示铜牌',
      258,
      42,
    )
      .setPosition(this.interior?.promptX ?? 810, this.interior?.promptY ?? 318)
      .setDepth(20)
      .setVisible(false);

    this.createDialogueFocus();
    this.createDialoguePanel();
    this.createChoicePanel();
  }

  private createDialogueFocus(): void {
    this.dialogueFocusOverlay = this.add.graphics()
      .setDepth(90)
      .setScrollFactor(0)
      .setVisible(false);
    this.dialogueFocusOverlay.fillStyle(0x080706, 0.48);
    this.dialogueFocusOverlay.fillRect(0, 0, 1280, 92);
    this.dialogueFocusOverlay.fillRect(0, 92, 280, 354);
    this.dialogueFocusOverlay.fillRect(1000, 92, 280, 354);
    this.dialogueFocusOverlay.fillRect(0, 446, 1280, 62);
    this.dialogueFocusOverlay.lineStyle(1, 0xb28e5d, 0.25);
    this.dialogueFocusOverlay.strokeRoundedRect(280, 92, 720, 354, 8);

    this.dialogueSpeakerFocus = this.add.graphics()
      .setDepth(95)
      .setVisible(false);
  }

  private createDialoguePanel(): void {
    const background = createParchmentPanel(this, 1120, 220);
    const innerBorder = this.add.rectangle(0, 0, 1094, 194, 0x000000, 0)
      .setStrokeStyle(1, 0x5c3b22, 0.5);
    const portraitFrame = this.add.rectangle(-472, 0, 142, 154, 0x211b16, 0.96)
      .setStrokeStyle(1, 0x806b4d, 0.72);
    this.dialogueAccent = this.add.rectangle(-557, 0, 6, 220, 0x7b4226, 1);
    this.dialoguePortrait = this.add.graphics();
    this.dialogueShopkeeperPortrait = this.add
      .sprite(-472, 20, SHOPKEEPER_TEXTURE_KEY, 0)
      .setOrigin(0.5, 0.78)
      .setScale(0.5)
      .setVisible(false);
    this.dialoguePlayerPortrait = this.add
      .sprite(-472, 10, PLAYER_TEXTURE_KEY, PLAYER_PORTRAIT_FRAME)
      .setOrigin(0.5)
      .setScale(0.62)
      .setTint(getPlayerAvatarTint(this.appearanceId))
      .setVisible(false);
    this.dialogueContext = this.add.text(-382, -84, 'FIRST COMMISSION / 第一次委托', {
      fontFamily: SANS_FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#3b2415',
      letterSpacing: 1,
    });
    this.dialogueSpeakerEn = this.add.text(-382, -63, '', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#4f1f12',
      letterSpacing: 1,
    });
    this.dialogueSpeakerZh = this.add.text(-382, -42, '', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#332016',
    });
    this.dialogueTextEn = this.add.text(-382, -13, '', {
      fontFamily: SERIF_FONT,
      fontSize: '19px',
      color: '#1e1109',
      lineSpacing: 4,
      wordWrap: { width: 838 },
    });
    this.dialogueTextZh = this.add.text(-382, 47, '', {
      fontFamily: SERIF_FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#24140b',
      lineSpacing: 3,
      wordWrap: { width: 838 },
    });
    this.dialogueProgress = this.add
      .text(480, -84, '', {
        fontFamily: SANS_FONT,
        fontSize: '11px',
        color: '#3a2516',
      })
      .setOrigin(1, 0);
    const continueText = this.add
      .text(0, 84, 'E / ENTER  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#2f1d11',
      })
      .setOrigin(0.5);
    this.dialoguePanel = this.add
      .container(this.scale.width / 2, 594, [
        background,
        innerBorder,
        portraitFrame,
        this.dialogueAccent,
        this.dialoguePortrait,
        this.dialogueShopkeeperPortrait,
        this.dialoguePlayerPortrait,
        this.dialogueContext,
        this.dialogueSpeakerEn,
        this.dialogueSpeakerZh,
        this.dialogueTextEn,
        this.dialogueTextZh,
        this.dialogueProgress,
        continueText,
      ])
      .setDepth(110)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private createChoicePanel(): void {
    const background = createParchmentPanel(this, 1120, 228);
    const innerBorder = this.add.rectangle(0, 0, 1094, 202, 0x000000, 0)
      .setStrokeStyle(1, 0x5c3b22, 0.5);
    const context = this.add.text(-516, -91, 'YOUR RESPONSE / 你的回应', {
      fontFamily: SANS_FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#3b2415',
      letterSpacing: 1,
    });
    this.choiceTitleEn = this.add
      .text(0, -70, '', {
        fontFamily: SERIF_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#1e1109',
      })
      .setOrigin(0.5);
    this.choiceTitleZh = this.add
      .text(0, -42, '', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#2e1b12',
      })
      .setOrigin(0.5);
    const controls = this.add
      .text(0, 86, 'A / D  SELECT / 选择     E  CONFIRM / 确认', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#2f1d11',
      })
      .setOrigin(0.5);
    this.choicePanel = this.add
      .container(this.scale.width / 2, 586, [
        background,
        innerBorder,
        context,
        this.choiceTitleEn,
        this.choiceTitleZh,
        controls,
      ])
      .setDepth(115)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private startArrival(): void {
    this.phase = 'arriving';
    this.locationUI?.setAlpha(0);
    this.tweens.add({
      targets: this.locationUI,
      alpha: 1,
      duration: 350,
    });
    this.arrivalTimer = this.time.delayedCall(1600, () => {
      this.phase = 'free-roam';
      this.player?.setMovementEnabled(true);
      this.objectiveUI?.setVisible(true);
      this.tweens.add({
        targets: this.locationUI,
        alpha: 0,
        delay: 700,
        duration: 450,
        onComplete: () => this.locationUI?.setVisible(false),
      });
    });
  }

  private updateCounterPrompt(): void {
    const isNear = this.isPlayerNearCounter();
    this.interactionPrompt?.setVisible(isNear);
    this.interior?.interactionHighlight.setVisible(isNear);
  }

  private isPlayerNearCounter(): boolean {
    if (!this.player || !this.interior) {
      return false;
    }
    return (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.interior.interactionX,
        this.interior.interactionY,
      ) <= this.interior.interactionRadius
    );
  }

  private beginFirstConversation(): void {
    if (!this.interior) {
      return;
    }
    this.player?.setMovementEnabled(false);
    this.locationUI?.setVisible(false);
    this.objectiveUI?.setVisible(false);
    this.interactionPrompt?.setVisible(false);
    this.interior.interactionHighlight.setVisible(false);
    this.shopAudio?.playSfx('interact');
    this.createTallyVisual();
    this.startConversation(OPENING_BEATS, 'response-choice');
  }

  private startConversation(
    beats: DialogueBeat[],
    destination: ConversationDestination,
  ): void {
    this.phase = 'conversation';
    this.dialogueBeats = beats;
    this.dialogueIndex = 0;
    this.conversationDestination = destination;
    this.choicePanel?.setVisible(false);
    this.dialogueFocusOverlay?.setVisible(true);
    this.dialoguePanel?.setVisible(true);
    this.showDialogueBeat();
  }

  private showDialogueBeat(): void {
    const beat = this.dialogueBeats[this.dialogueIndex];
    if (!beat) {
      return;
    }
    this.dialogueSpeakerEn?.setText(beat.speakerEn);
    this.dialogueSpeakerZh?.setText(beat.speakerZh);
    this.dialogueTextEn?.setText(beat.textEn);
    this.dialogueTextZh?.setText(beat.textZh);
    this.dialogueProgress?.setText(
      `${String(this.dialogueIndex + 1).padStart(2, '0')} / ${String(this.dialogueBeats.length).padStart(2, '0')}`,
    );
    this.updateDialoguePresentation(beat);
    if (beat.speakerEn === 'SHOPKEEPER') {
      this.shopAudio?.speakEnglish(beat.textEn, 'shopkeeper');
    } else if (beat.speakerEn === 'YOU') {
      this.shopAudio?.speakEnglish(beat.textEn, 'player');
    } else {
      this.shopAudio?.stopVoice();
    }

    const textTargets = [
      this.dialogueSpeakerEn,
      this.dialogueSpeakerZh,
      this.dialogueTextEn,
      this.dialogueTextZh,
    ].filter((target): target is Phaser.GameObjects.Text => Boolean(target));
    this.tweens.killTweensOf(textTargets);
    textTargets.forEach((target) => target.setAlpha(0));
    this.tweens.add({
      targets: textTargets,
      alpha: 1,
      duration: 150,
      ease: 'Sine.Out',
    });
  }

  private updateDialoguePresentation(beat: DialogueBeat): void {
    const isShopkeeper = beat.speakerEn === 'SHOPKEEPER';
    const isPlayer = beat.speakerEn === 'YOU';
    const accentColor = isShopkeeper ? 0xb07b49 : isPlayer ? 0x668c86 : 0x8e8068;
    this.dialogueAccent?.setFillStyle(accentColor, 1);
    this.dialogueSpeakerEn?.setColor(
      isShopkeeper ? '#5a2113' : isPlayer ? '#174b43' : '#3e2718',
    );
    this.dialogueContext?.setText(
      isShopkeeper
        ? 'THE SHOPKEEPER / 古玩店老板'
        : isPlayer
          ? 'YOUR RESPONSE / 你的回应'
          : 'SCENE / 情景',
    );
    this.interior?.shopkeeperVisual.playGesture(
      isShopkeeper ? beat.shopkeeperGesture ?? 'nod' : 'idle',
    );
    this.drawDialoguePortrait(beat);
    this.drawSpeakerFocus(beat.speakerEn);
  }

  private drawDialoguePortrait(beat: DialogueBeat): void {
    const portrait = this.dialoguePortrait;
    if (!portrait) {
      return;
    }
    portrait.clear();
    const shopkeeperPortrait = this.dialogueShopkeeperPortrait;
    const playerPortrait = this.dialoguePlayerPortrait;
    const shopkeeper = beat.speakerEn === 'SHOPKEEPER';
    const player = beat.speakerEn === 'YOU';
    shopkeeperPortrait?.setVisible(shopkeeper);
    playerPortrait?.setVisible(player);
    if (shopkeeper) {
      shopkeeperPortrait?.setFrame(
        shopkeeperFrameForGesture(beat.shopkeeperGesture ?? 'nod'),
      );
      return;
    }
    if (player) {
      playerPortrait?.setFrame(PLAYER_PORTRAIT_FRAME);
      return;
    }

    const x = -472;
    const y = 2;
    if (beat.speakerEn === 'NARRATION') {
      portrait.fillStyle(0x8e8068, 0.9);
      portrait.fillRoundedRect(x - 40, y - 45, 80, 90, 6);
      portrait.fillStyle(0x211b16, 1);
      portrait.fillRect(x - 29, y - 31, 58, 62);
      portrait.lineStyle(2, 0xc2ad82, 0.7);
      portrait.lineBetween(x - 20, y - 17, x + 20, y - 17);
      portrait.lineBetween(x - 20, y - 3, x + 14, y - 3);
      portrait.lineBetween(x - 20, y + 11, x + 23, y + 11);
      return;
    }

  }

  private drawSpeakerFocus(speaker: string): void {
    const focus = this.dialogueSpeakerFocus;
    if (!focus) {
      return;
    }
    focus.clear();
    if (speaker === 'NARRATION') {
      focus.setVisible(false);
      return;
    }

    const isShopkeeper = speaker === 'SHOPKEEPER';
    const x = isShopkeeper ? (this.interior?.counterX ?? 640) : (this.player?.x ?? 640);
    const y = isShopkeeper ? 210 : (this.player?.y ?? 360);
    const color = isShopkeeper ? 0xc18c51 : 0x75a69c;
    focus.setVisible(true);
    const halfW = 48;
    const halfH = 58;
    const corner = 16;
    focus.lineStyle(3, color, 0.88);
    focus.lineBetween(x - halfW, y - halfH + corner, x - halfW, y - halfH);
    focus.lineBetween(x - halfW, y - halfH, x - halfW + corner, y - halfH);
    focus.lineBetween(x + halfW - corner, y - halfH, x + halfW, y - halfH);
    focus.lineBetween(x + halfW, y - halfH, x + halfW, y - halfH + corner);
    focus.lineBetween(x - halfW, y + halfH - corner, x - halfW, y + halfH);
    focus.lineBetween(x - halfW, y + halfH, x - halfW + corner, y + halfH);
    focus.lineBetween(x + halfW - corner, y + halfH, x + halfW, y + halfH);
    focus.lineBetween(x + halfW, y + halfH, x + halfW, y + halfH - corner);
    focus.fillStyle(color, 0.92);
    focus.fillTriangle(x, y + halfH + 2, x - 6, y + halfH + 8, x + 6, y + halfH + 8);
    focus.fillTriangle(x, y + halfH + 14, x - 6, y + halfH + 8, x + 6, y + halfH + 8);
  }

  private advanceConversation(): void {
    this.shopAudio?.playSfx('dialogue');
    this.dialogueIndex += 1;
    if (this.dialogueIndex < this.dialogueBeats.length) {
      this.showDialogueBeat();
      return;
    }

    this.dialoguePanel?.setVisible(false);
    this.interior?.shopkeeperVisual.playGesture('idle');
    if (this.conversationDestination === 'response-choice') {
      this.openResponseChoice();
      return;
    }
    if (this.conversationDestination === 'job-confirmation') {
      this.openJobConfirmation();
      return;
    }
    this.beginDeparture();
  }

  private openResponseChoice(): void {
    this.phase = 'response-choice';
    this.selectedChoice = 0;
    this.dialoguePanel?.setVisible(false);
    this.configureChoicePanel(
      'WHAT DO YOU ASK FIRST?',
      '先问哪件事？',
      [
        ['HOW MUCH WILL YOU PAY?', '价钱怎么算？'],
        ['WHY DON’T YOU GO YOURSELF?', '你为什么不自己去？'],
      ],
    );
  }

  private openJobConfirmation(): void {
    this.phase = 'job-confirmation';
    this.selectedChoice = 0;
    this.dialoguePanel?.setVisible(false);
    this.configureChoicePanel(
      'WILL YOU TAKE THE JOB?',
      '要接下这份差事吗？',
      [
        ['TAKE THE JOB', '接下差事'],
        ['ASK TO SEE THE ROUTE AGAIN', '再看看路线'],
      ],
    );
  }

  private configureChoicePanel(
    titleEn: string,
    titleZh: string,
    choices: [string, string][],
  ): void {
    this.choiceCards.forEach((card) => card.destroy(true));
    this.choiceCards = [];
    this.choiceTitleEn?.setText(titleEn);
    this.choiceTitleZh?.setText(titleZh);
    this.dialogueFocusOverlay?.setVisible(true);
    this.dialogueSpeakerFocus?.setVisible(false);
    choices.forEach(([english, chinese], index) => {
      const x = index === 0 ? -245 : 245;
      const card = this.add.container(x, 18);
      const bg = this.add
        .rectangle(0, 0, 440, 78, 0x302a22, 0.96)
        .setStrokeStyle(2, 0x76664c, 0.8);
      const en = this.add
        .text(0, -14, english, {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#dfd3ba',
          align: 'center',
          wordWrap: { width: 405 },
        })
        .setOrigin(0.5);
      const zh = this.add
        .text(0, 17, chinese, {
          fontFamily: SANS_FONT,
          fontSize: '13px',
          color: '#bbb19e',
        })
        .setOrigin(0.5);
      card.add([bg, en, zh]);
      this.choicePanel?.add(card);
      this.choiceCards.push(card);
    });
    this.choicePanel?.setVisible(true);
    this.updateChoiceAppearance();
  }

  private updateChoiceInput(confirmPressed: boolean, jobChoice: boolean): void {
    if (!this.leftKey || !this.rightKey) {
      return;
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.leftKey) ||
      Phaser.Input.Keyboard.JustDown(this.rightKey)
    ) {
      this.selectedChoice = this.selectedChoice === 0 ? 1 : 0;
      this.shopAudio?.playSfx('choice-move');
      this.updateChoiceAppearance();
      return;
    }
    if (!confirmPressed) {
      return;
    }
    this.shopAudio?.playSfx('choice-confirm');
    if (jobChoice) {
      this.confirmJobChoice();
    } else {
      this.confirmResponseChoice();
    }
  }

  private updateChoiceAppearance(): void {
    this.choiceCards.forEach((card, index) => {
      const bg = card.first as Phaser.GameObjects.Rectangle;
      const selected = index === this.selectedChoice;
      bg.setStrokeStyle(2, selected ? 0xc0a773 : 0x76664c, selected ? 1 : 0.65);
      bg.setFillStyle(selected ? 0x3c3024 : 0x29241e, selected ? 1 : 0.94);
      card.setAlpha(selected ? 1 : 0.72);
      card.setScale(selected ? 1.025 : 1);
    });
  }

  private confirmResponseChoice(): void {
    this.choicePanel?.setVisible(false);
    this.firstMeetingResponse =
      this.selectedChoice === 0 ? 'asked-payment' : 'asked-why';
    const responseBeats =
      this.firstMeetingResponse === 'asked-payment' ? PAYMENT_BEATS : WHY_BEATS;
    this.createToolsVisual();
    this.startConversation([...responseBeats, ...TOOL_BEATS], 'job-confirmation');
  }

  private confirmJobChoice(): void {
    this.choicePanel?.setVisible(false);
    if (this.selectedChoice === 1) {
      this.startConversation(ROUTE_REVIEW_BEATS, 'job-confirmation');
      return;
    }
    this.startConversation(ACCEPT_BEATS, 'departing');
  }

  private createTallyVisual(): void {
    if (!this.interior || this.tallyVisual) {
      return;
    }
    const tally = this.add
      .image(0, 0, SHOP_INTERIOR_TEXTURES.brassTally)
      .setDisplaySize(72, 75)
      .setRotation(-0.24);
    this.tallyVisual = this.add
      .container(this.interior.artifactX - 92, this.interior.artifactY + 4, [tally])
      .setDepth(5);
    this.shopAudio?.playSfx('place-tally');
  }

  private createToolsVisual(): void {
    if (!this.interior || this.toolsVisual) {
      return;
    }
    const tools = this.add
      .image(0, 0, SHOP_INTERIOR_TEXTURES.commissionTools)
      .setDisplaySize(235, 177);
    this.toolsVisual = this.add
      .container(this.interior.artifactX + 30, this.interior.artifactY - 8, [tools])
      .setDepth(5);
    this.shopAudio?.playSfx('place-tools');
  }

  private beginDeparture(): void {
    this.phase = 'departing';
    this.player?.setMovementEnabled(false);
    this.dialoguePanel?.setVisible(false);
    this.choicePanel?.setVisible(false);
    this.dialogueFocusOverlay?.setVisible(false);
    this.dialogueSpeakerFocus?.setVisible(false);
    this.shopAudio?.playSfx('transition');
    this.shopAudio?.stopVoice();
    this.transitionTimer = this.time.delayedCall(250, () => {
      this.cameras.main.fadeOut(650, 12, 12, 10);
      this.transitionTimer = this.time.delayedCall(700, () => {
        this.scene.start('TombScene', { appearanceId: this.appearanceId });
      });
    });
  }

  private handleShutdown(): void {
    this.arrivalTimer?.remove(false);
    this.transitionTimer?.remove(false);
    this.collider?.destroy();
    this.tweens.killAll();
    this.interactKey = undefined;
    this.enterKey = undefined;
    this.leftKey = undefined;
    this.rightKey = undefined;
    this.escapeKey = undefined;
    this.shopAudio?.destroy();
    this.shopAudio = undefined;
  }
}
