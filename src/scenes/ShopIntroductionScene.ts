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
  createAntiqueShopInterior,
  type AntiqueShopInterior,
} from './shared/createAntiqueShopInterior';
import {
  createProceduralAtmosphere,
  type ProceduralAtmosphere,
} from '../visuals/createProceduralAtmosphere';
import { VISUAL_THEME } from '../visuals/visualTheme';

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
}

const OPENING_BEATS: DialogueBeat[] = [
  narrator(
    'You place the chipped brass tally on the counter.',
    '你把那块缺角的铜牌放在柜台上。',
  ),
  shopkeeper(
    '“Close the door. The damp gets into old wood.”',
    '“把门关上。潮气容易进木头。”',
  ),
  shopkeeper('“Where did you get this?”', '“这东西，你从哪儿弄来的？”'),
  you('“A street stall. Years ago.”', '“很多年前，在旧货摊上买的。”'),
  shopkeeper(
    '“And you waited until tonight to sell it.”',
    '“却一直等到今晚，才拿来卖。”',
  ),
  you('“Is it worth anything?”', '“它值钱吗？”'),
  shopkeeper('“The brass? No.”', '“这点铜？不值钱。”'),
  shopkeeper(
    '“The fact that it came back here? Perhaps.”',
    '“但它重新回到这里这件事……或许值钱。”',
  ),
  narrator(
    'The broken edge fits the shape recorded in the ledger.',
    '铜牌缺失的边缘，与账簿上的旧印记完全吻合。',
  ),
  shopkeeper(
    '“It was an inventory tally from this shop.”',
    '“这是这家店以前使用的货牌。”',
  ),
  shopkeeper(
    '“It disappeared with something that belonged to me.”',
    '“它和另一件属于我的东西一起失踪了。”',
  ),
  you('“Then take it back.”', '“那就还给你。”'),
  shopkeeper(
    '“I do not pay for what is already mine.”',
    '“本来就属于我的东西，我不会再花钱买一次。”',
  ),
  shopkeeper(
    '“But I do pay for retrieval.”',
    '“不过，我会花钱请人把东西取回来。”',
  ),
  you('“From where?”', '“去哪里取？”'),
  shopkeeper(
    '“An abandoned storehouse outside the city.”',
    '“城外的一处废弃仓房。”',
  ),
  shopkeeper(
    '“The entrance has partly collapsed. No one uses it now.”',
    '“入口塌了一部分，现在已经没人使用。”',
  ),
  you('“What am I bringing back?”', '“我要带回什么？”'),
  shopkeeper(
    '“A brass geomancer’s compass. About the width of your palm.”',
    '“一只黄铜风水罗盘，大概有手掌这么宽。”',
  ),
  shopkeeper(
    '“Do not clean it. Do not force the inner ring.”',
    '“不要擦洗，也不要强行转动里面的盘。”',
  ),
  you('“Why ask me?”', '“为什么找我？”'),
  shopkeeper(
    '“Because you came here for cash, not a story.”',
    '“因为你来这里是为了钱，不是为了听故事。”',
  ),
  shopkeeper(
    '“And because you did not polish the tally before bringing it in.”',
    '“也因为你没有在拿来之前，把这块铜牌擦得锃亮。”',
  ),
  you('“You think that makes me qualified?”', '“这就算有资格了？”'),
  shopkeeper(
    '“It makes you less likely to ruin what you touch.”',
    '“至少说明你不会随便毁掉碰过的东西。”',
  ),
];

const PAYMENT_BEATS: DialogueBeat[] = [
  you('“How much will you pay?”', '“你准备付多少钱？”'),
  shopkeeper(
    '“Enough to stop counting your rent for a while.”',
    '“至少能让你暂时不用每天算着房租过日子。”',
  ),
  shopkeeper(
    '“More, if you bring back the correct object.”',
    '“如果带回来的是我要的东西，还会更多。”',
  ),
  narrator('I had never mentioned the rent.', '我从没和他提过房租。'),
];

const WHY_BEATS: DialogueBeat[] = [
  you(
    '“Why don’t you retrieve it yourself?”',
    '“你为什么不自己去取？”',
  ),
  shopkeeper('“Old injuries. Narrow steps.”', '“旧伤。路也窄。”'),
  shopkeeper(
    '“Choose whichever part of that answer lets you sleep.”',
    '“你愿意相信哪一部分，就相信哪一部分。”',
  ),
];

const TOOL_BEATS: DialogueBeat[] = [
  narrator(
    'He places a canvas bag and a hand-drawn route on the counter.',
    '老板把一只帆布包和一张手绘路线放在柜台上。',
  ),
  you('“This is the address?”', '“这就是地址？”'),
  shopkeeper(
    '“It is enough, if you follow my marks.”',
    '“沿着我留下的标记走，这些就够了。”',
  ),
  you(
    '“And if I find something else inside?”',
    '“如果我在里面发现了别的东西呢？”',
  ),
  shopkeeper(
    '“I asked you to retrieve one object.”',
    '“我只让你取回一件东西。”',
  ),
  shopkeeper(
    '“What you choose to touch after that is your concern.”',
    '“至于之后还要碰什么，那是你自己的事。”',
  ),
  shopkeeper('“One rule.”', '“一条规矩。”'),
  shopkeeper(
    '“If you decide to leave, leave.”',
    '“如果你已经决定离开，就直接离开。”',
  ),
  shopkeeper(
    '“Do not turn back for one more thing.”',
    '“不要为了再拿一件东西回头。”',
  ),
];

const ROUTE_REVIEW_BEATS: DialogueBeat[] = [
  narrator(
    'The hand-drawn route names no street. It marks only turns beyond the city and a partly collapsed entrance.',
    '手绘路线没有写街名，只标出了城外的转弯和一处部分坍塌的入口。',
  ),
  shopkeeper(
    '“Follow the marks. Bring back the brass geomancer’s compass.”',
    '“沿着标记走。把黄铜风水罗盘带回来。”',
  ),
];

const ACCEPT_BEATS: DialogueBeat[] = [
  you(
    '“All right. I’ll retrieve your compass.”',
    '“好。我去把你的罗盘带回来。”',
  ),
  shopkeeper('“Bring the bag back as well.”', '“包也要带回来。”'),
  shopkeeper(
    '“Tools have a habit of finding new owners.”',
    '“工具这种东西，很容易换主人。”',
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

  private interactKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;

  private locationUI?: Phaser.GameObjects.Container;
  private objectiveUI?: Phaser.GameObjects.Container;
  private interactionPrompt?: Phaser.GameObjects.Container;
  private dialoguePanel?: Phaser.GameObjects.Container;
  private dialogueSpeakerEn?: Phaser.GameObjects.Text;
  private dialogueSpeakerZh?: Phaser.GameObjects.Text;
  private dialogueTextEn?: Phaser.GameObjects.Text;
  private dialogueTextZh?: Phaser.GameObjects.Text;
  private choicePanel?: Phaser.GameObjects.Container;
  private choiceTitleEn?: Phaser.GameObjects.Text;
  private choiceTitleZh?: Phaser.GameObjects.Text;
  private choiceCards: Phaser.GameObjects.Container[] = [];
  private tallyVisual?: Phaser.GameObjects.Container;
  private toolsVisual?: Phaser.GameObjects.Container;

  constructor() {
    super('ShopIntroductionScene');
  }

  init(data: ShopIntroductionSceneData): void {
    this.appearanceId = isPlayerAppearanceId(data.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  create(): void {
    this.resetState();
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
    this.player = new Player(this, 640, 600, this.appearanceId);
    this.player.setMovementEnabled(false);
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
    if (!this.player || !this.interactKey || !this.enterKey) {
      return;
    }
    this.atmosphere?.update(this.player.x, this.player.y, this.time.now);

    if (this.phase === 'free-roam') {
      this.player.update();
      this.updateCounterPrompt();
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
  }

  private createFixedUI(): void {
    this.locationUI = this.add
      .container(58, 50, [
        this.add.text(0, 0, 'ANTIQUE SHOP', {
          fontFamily: SERIF_FONT,
          fontSize: '25px',
          fontStyle: 'bold',
          color: '#e0d4bc',
          letterSpacing: 1,
        }),
        this.add.text(0, 34, '古玩店', {
          fontFamily: SERIF_FONT,
          fontSize: '17px',
          color: '#bcb29e',
        }),
      ])
      .setDepth(100)
      .setScrollFactor(0);

    const objectiveBg = this.add
      .rectangle(0, 0, 300, 96, 0x1d1a16, 0.92)
      .setStrokeStyle(1, 0xa58d69, 0.84);
    this.objectiveUI = this.add
      .container(this.scale.width - 174, 78, [
        objectiveBg,
        this.add
          .text(-132, -39, 'OBJECTIVE', {
            fontFamily: SANS_FONT,
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#cbb68c',
          }),
        this.add.text(-132, -22, '当前目标', {
          fontFamily: SANS_FONT,
          fontSize: '11px',
          color: '#a9a08e',
        }),
        this.add.text(-132, -1, 'Show the brass tally to the shopkeeper.', {
          fontFamily: SERIF_FONT,
          fontSize: '15px',
          color: '#e2d8c2',
          wordWrap: { width: 264 },
        }),
        this.add.text(-132, 27, '把铜牌拿给古玩店老板看。', {
          fontFamily: SERIF_FONT,
          fontSize: '13px',
          color: '#b9af9c',
        }),
      ])
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    const promptBg = this.add
      .rectangle(0, 0, 212, 36, 0x1b1814, 0.94)
      .setStrokeStyle(1, 0xb49b73, 0.86);
    this.interactionPrompt = this.add
      .container(this.interior?.promptX ?? 810, this.interior?.promptY ?? 318, [
        promptBg,
        this.add
          .text(0, 0, 'E  SHOW THE TALLY / 出示铜牌', {
            fontFamily: SANS_FONT,
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#eadbb8',
          })
          .setOrigin(0.5),
      ])
      .setDepth(20)
      .setVisible(false);

    this.createDialoguePanel();
    this.createChoicePanel();
  }

  private createDialoguePanel(): void {
    const background = this.add
      .rectangle(0, 0, 1100, 180, 0x17130f, 0.94)
      .setStrokeStyle(1, 0xa18a62, 0.82);
    this.dialogueSpeakerEn = this.add.text(-510, -72, '', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#cbb68c',
      letterSpacing: 1,
    });
    this.dialogueSpeakerZh = this.add.text(-510, -51, '', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#877e6c',
    });
    this.dialogueTextEn = this.add.text(-510, -24, '', {
      fontFamily: SERIF_FONT,
      fontSize: '19px',
      color: '#e8deca',
      lineSpacing: 4,
      wordWrap: { width: 1020 },
    });
    this.dialogueTextZh = this.add.text(-510, 30, '', {
      fontFamily: SERIF_FONT,
      fontSize: '14px',
      color: '#aaa08d',
      lineSpacing: 3,
      wordWrap: { width: 1020 },
    });
    const continueText = this.add
      .text(510, 74, 'E / ENTER  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#897d69',
      })
      .setOrigin(1, 0.5);
    this.dialoguePanel = this.add
      .container(this.scale.width / 2, 600, [
        background,
        this.dialogueSpeakerEn,
        this.dialogueSpeakerZh,
        this.dialogueTextEn,
        this.dialogueTextZh,
        continueText,
      ])
      .setDepth(110)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private createChoicePanel(): void {
    const background = this.add
      .rectangle(0, 0, 1000, 186, 0x17130f, 0.97)
      .setStrokeStyle(2, 0xa18a62, 0.82);
    this.choiceTitleEn = this.add
      .text(0, -66, '', {
        fontFamily: SERIF_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#e5dac3',
      })
      .setOrigin(0.5);
    this.choiceTitleZh = this.add
      .text(0, -40, '', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#a69b87',
      })
      .setOrigin(0.5);
    const controls = this.add
      .text(0, 74, 'A / D  SELECT / 选择     E  CONFIRM / 确认', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#b0a38b',
      })
      .setOrigin(0.5);
    this.choicePanel = this.add
      .container(this.scale.width / 2, 596, [
        background,
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
    this.objectiveUI?.setVisible(false);
    this.interactionPrompt?.setVisible(false);
    this.interior.interactionHighlight.setVisible(false);
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
  }

  private advanceConversation(): void {
    this.dialogueIndex += 1;
    if (this.dialogueIndex < this.dialogueBeats.length) {
      this.showDialogueBeat();
      return;
    }

    this.dialoguePanel?.setVisible(false);
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
      '你准备先问什么？',
      [
        ['HOW MUCH WILL YOU PAY?', '你准备付多少钱？'],
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
      '你要接下这份差事吗？',
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
    choices.forEach(([english, chinese], index) => {
      const x = index === 0 ? -245 : 245;
      const card = this.add.container(x, 12);
      const bg = this.add
        .rectangle(0, 0, 430, 66, 0x302a22, 0.96)
        .setStrokeStyle(2, 0x76664c, 0.8);
      const en = this.add
        .text(0, -12, english, {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#dfd3ba',
          align: 'center',
          wordWrap: { width: 390 },
        })
        .setOrigin(0.5);
      const zh = this.add
        .text(0, 15, chinese, {
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
      this.updateChoiceAppearance();
      return;
    }
    if (!confirmPressed) {
      return;
    }
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
      card.setAlpha(selected ? 1 : 0.72);
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
    const tally = this.add.graphics();
    tally.fillStyle(0xa17f55, 1);
    tally.fillRoundedRect(-24, -11, 48, 22, 3);
    tally.fillStyle(0x3b3025, 1);
    tally.fillTriangle(17, -11, 25, -11, 25, -3);
    tally.lineStyle(2, 0xd0b27d, 0.9);
    tally.strokeRoundedRect(-24, -11, 48, 22, 3);
    tally.lineBetween(-5, -6, 5, 6);
    tally.lineBetween(5, -6, -5, 6);
    this.tallyVisual = this.add
      .container(this.interior.artifactX - 55, this.interior.artifactY, [tally])
      .setDepth(5);
  }

  private createToolsVisual(): void {
    if (!this.interior || this.toolsVisual) {
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(0x776b54, 1);
    g.fillRoundedRect(-104, -17, 50, 35, 8);
    g.lineStyle(2, 0xc6a878, 0.9);
    g.strokeRoundedRect(-104, -17, 50, 35, 8);
    g.lineBetween(-93, -18, -87, -29);
    g.lineBetween(-65, -18, -71, -29);
    g.fillStyle(0x62675a, 1);
    g.fillRect(-41, -15, 16, 30);
    g.fillStyle(0xd8b96c, 0.92);
    g.fillCircle(-33, -17, 6);
    g.lineStyle(3, 0xb99d6e, 1);
    g.strokeCircle(-4, 0, 13);
    g.lineStyle(4, 0x987c58, 1);
    g.lineBetween(19, 11, 41, -12);
    g.lineStyle(2, 0xa6987d, 0.9);
    g.lineBetween(43, -12, 57, 4);
    g.fillStyle(0x687065, 1);
    g.fillRoundedRect(51, 3, 12, 20, 5);
    g.fillRoundedRect(65, 0, 12, 20, 5);
    g.lineStyle(1, 0xb3b9a5, 0.88);
    g.lineBetween(54, 7, 54, -4);
    g.lineBetween(58, 6, 58, -6);
    g.lineBetween(68, 4, 68, -7);
    g.lineBetween(72, 4, 72, -6);
    g.fillStyle(0xd0bc91, 1);
    g.fillRect(88, -21, 82, 42);
    g.lineStyle(1, 0x887151, 0.9);
    g.lineBetween(96, 10, 116, -9);
    g.lineBetween(116, -9, 140, 7);
    g.lineBetween(140, 7, 161, -12);
    this.toolsVisual = this.add
      .container(this.interior.artifactX - 15, this.interior.artifactY, [g])
      .setDepth(5);
  }

  private beginDeparture(): void {
    this.phase = 'departing';
    this.player?.setMovementEnabled(false);
    this.dialoguePanel?.setVisible(false);
    this.choicePanel?.setVisible(false);
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
  }
}
