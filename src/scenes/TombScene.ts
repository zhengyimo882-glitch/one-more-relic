import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_APPEARANCE_ID,
  isPlayerAppearanceId,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import {
  InvestigableObject,
  type OmenTier,
} from '../objects/InvestigableObject';
import { Player } from '../objects/Player';
import { CarrySystem } from '../systems/CarrySystem';
import {
  TombDisturbanceSystem,
  type CoffinState,
  type OmenLevel,
} from '../systems/TombDisturbanceSystem';
import type {
  DepartureChoice,
  TutorialTombPhase,
} from '../types/TombProgress';
import {
  createProceduralAtmosphere,
  type ProceduralAtmosphere,
} from '../visuals/createProceduralAtmosphere';
import { VISUAL_THEME } from '../visuals/visualTheme';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 960;
const GRID_SIZE = 64;
const ROOM_X = 256;
const ROOM_Y = 288;
const ROOM_WIDTH = 1088;
const ROOM_HEIGHT = 576;
const WALL_THICKNESS = GRID_SIZE;
const ENTRANCE_WIDTH = GRID_SIZE * 3;
const ROOM_CENTER_X = ROOM_X + ROOM_WIDTH / 2;
const PROP_Y = ROOM_Y + GRID_SIZE * 4;
const LEFT_PROP_X = ROOM_CENTER_X - GRID_SIZE * 3.5;
const RIGHT_PROP_X = ROOM_CENTER_X + GRID_SIZE * 3.5;
const COMPASS_X = ROOM_CENTER_X;
const COMPASS_Y = PROP_Y - GRID_SIZE;
const ENTRANCE_X = ROOM_CENTER_X;
const ENTRANCE_Y = ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS / 2;
const EXIT_INTERACTION_RADIUS = 118;
const DISTANCE_TIE_EPSILON = 0.5;
const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;

interface TombSceneData {
  appearanceId?: PlayerAppearanceId;
}

type PortableArtifactId = 'burial-vessel' | 'bronze-mirror' | 'geomancers-compass';

type PortableArtifactDefinition = {
  id: PortableArtifactId;
  englishName: string;
  chineseName: string;
  description: string;
  chineseDescription: string;
  hiddenValue: number;
  appraisalText: string;
  chineseAppraisalText: string;
  omenTier: OmenTier;
  originalSpotId: string;
};

const ARTIFACT_DEFINITIONS: Record<PortableArtifactId, PortableArtifactDefinition> = {
  'burial-vessel': {
    id: 'burial-vessel',
    englishName: 'Burial Vessel',
    chineseName: '随葬器皿',
    description: 'Old dust covers the vessel. Something has disturbed the floor beside it.',
    chineseDescription: '陈年灰尘覆盖着器皿，旁边的地面却像被什么扰动过。',
    hiddenValue: 420,
    appraisalText:
      'The clay body appears old, but the painted surface may have been restored. Its worth is difficult to judge underground.',
    chineseAppraisalText:
      '陶胎看起来年代久远，但彩绘表面可能经过修复。在墓中很难判断它的价值。',
    omenTier: 0,
    originalSpotId: 'left-display-spot',
  },
  'bronze-mirror': {
    id: 'bronze-mirror',
    englishName: 'Bronze Mirror',
    chineseName: '铜镜',
    description:
      'Its surface is dark with age. From this angle, it reflects no recognizable face.',
    chineseDescription:
      '镜面因年代久远而黯淡。从这个角度看，它映不出任何可以辨认的面孔。',
    hiddenValue: 900,
    appraisalText:
      'The inscription may be older than the tomb itself. Corrosion hides whether it is genuine or merely convincing.',
    chineseAppraisalText:
      '铭文可能比墓葬本身更加古老。锈蚀遮住了它究竟是真品，还是仅仅足以乱真。',
    omenTier: 1,
    originalSpotId: 'right-display-spot',
  },
  'geomancers-compass': {
    id: 'geomancers-compass',
    englishName: 'Geomancer’s Compass',
    chineseName: '风水罗盘',
    description:
      'A compact compass rests beneath the displaced lid. Its markings do not match the orientation of the tomb.',
    chineseDescription:
      '一枚小巧的罗盘放在移开的棺盖下。它的刻度与墓室的朝向并不一致。',
    hiddenValue: 1800,
    appraisalText:
      'The needle still turns without being touched. If the maker’s seal is genuine, this may be the most important object in the room.',
    chineseAppraisalText:
      '指针在无人触碰时仍会转动。如果制作者的印记为真，它或许是这间墓室里最重要的器物。',
    omenTier: 2,
    originalSpotId: 'coffin-interior',
  },
};

type ArtifactSpot = {
  spotId: string;
  worldX: number;
  worldY: number;
  interactionRadius: number;
  artifactId: string | null;
  isEmpty: boolean;
  isEnabled: boolean;
  promptObject: Phaser.GameObjects.Container;
};

type InteractionTarget =
  | {
      kind: 'artifact';
      stableId: string;
      distance: number;
      artifact: InvestigableObject;
    }
  | {
      kind: 'empty-spot';
      stableId: string;
      distance: number;
      spot: ArtifactSpot;
    }
  | {
      kind: 'exit';
      stableId: 'tomb-exit';
      distance: number;
    };

type DepartureResult = {
  englishName: string;
  chineseName: string;
};

const DEPARTURE_RESULTS: Record<DepartureChoice, DepartureResult> = {
  empty: {
    englishName: 'Nothing',
    chineseName: '空手而归',
  },
  'burial-vessel': {
    englishName: 'Burial Vessel',
    chineseName: '随葬器皿',
  },
  'bronze-mirror': {
    englishName: 'Bronze Mirror',
    chineseName: '铜镜',
  },
  'geomancers-compass': {
    englishName: 'Geomancer’s Compass',
    chineseName: '风水罗盘',
  },
};

export class TombScene extends Phaser.Scene {
  private incomingAppearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID;
  private appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID;
  private player?: Player;
  private investigableObjects: InvestigableObject[] = [];
  private artifactSpots: ArtifactSpot[] = [];
  private nearbyInteraction?: InteractionTarget;
  private activeInvestigation?: InvestigableObject;
  private carrySystem = new CarrySystem();
  private disturbanceSystem = new TombDisturbanceSystem();
  private tutorialPhase: TutorialTombPhase = 'entering';
  private compassHasBeenRetrieved = false;
  private departureChoice?: DepartureChoice;
  private coffinState: CoffinState = 'sealed';
  private carriedExposureSeconds = 0;
  private exposureArtifactId: string | null = null;
  private currentOmenLevel: OmenLevel = 0;
  private levelThreeShakeElapsed = 0;
  private compassFeedbackSeconds = 0;
  private artifactCollisions = new Map<string, Phaser.GameObjects.Rectangle>();
  private entranceGateVisual?: Phaser.GameObjects.Graphics;
  private entranceGateCollision?: Phaser.GameObjects.Rectangle;
  private entranceSealTimer?: Phaser.Time.TimerEvent;
  private entranceGateTween?: Phaser.Tweens.Tween;
  private exitPrompt?: Phaser.GameObjects.Container;
  private coffinClosedLid?: Phaser.GameObjects.Graphics;
  private coffinOpenedLid?: Phaser.GameObjects.Graphics;
  private ambientOverlay?: Phaser.GameObjects.Graphics;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private carryActionKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private instructionText?: Phaser.GameObjects.Text;
  private escapeHintText?: Phaser.GameObjects.Text;
  private locationTitleEnglish?: Phaser.GameObjects.Text;
  private locationTitleChinese?: Phaser.GameObjects.Text;
  private objectiveUI?: Phaser.GameObjects.Container;
  private objectiveText?: Phaser.GameObjects.Text;
  private objectiveChineseText?: Phaser.GameObjects.Text;
  private shopkeeperMessage?: Phaser.GameObjects.Container;
  private shopkeeperMessageText?: Phaser.GameObjects.Text;
  private shopkeeperChineseMessageText?: Phaser.GameObjects.Text;
  private shopkeeperHideTimer?: Phaser.Time.TimerEvent;
  private shopkeeperFadeTween?: Phaser.Tweens.Tween;
  private readonly shownShopkeeperMessages = new Set<'sealed' | 'released'>();
  private investigationPanel?: Phaser.GameObjects.Container;
  private panelEnglishName?: Phaser.GameObjects.Text;
  private panelChineseName?: Phaser.GameObjects.Text;
  private panelDescription?: Phaser.GameObjects.Text;
  private panelChineseDescription?: Phaser.GameObjects.Text;
  private panelAppraisalTitle?: Phaser.GameObjects.Text;
  private panelAppraisalText?: Phaser.GameObjects.Text;
  private panelChineseAppraisalText?: Phaser.GameObjects.Text;
  private panelCarryAction?: Phaser.GameObjects.Text;
  private panelSwapDescription?: Phaser.GameObjects.Text;
  private panelSwapChineseDescription?: Phaser.GameObjects.Text;
  private carryCountText?: Phaser.GameObjects.Text;
  private carriedEnglishName?: Phaser.GameObjects.Text;
  private carriedChineseName?: Phaser.GameObjects.Text;
  private carryUI?: Phaser.GameObjects.Container;
  private departurePanel?: Phaser.GameObjects.Container;
  private departureCarriedEnglish?: Phaser.GameObjects.Text;
  private departureCarriedChinese?: Phaser.GameObjects.Text;
  private resultPanel?: Phaser.GameObjects.Container;
  private resultEnglishName?: Phaser.GameObjects.Text;
  private resultChineseName?: Phaser.GameObjects.Text;
  private arrivalIntroductionActive = true;
  private arrivalIntroductionIndex = 0;
  private arrivalPanel?: Phaser.GameObjects.Container;
  private arrivalEnglishText?: Phaser.GameObjects.Text;
  private arrivalChineseText?: Phaser.GameObjects.Text;
  private arrivalBag?: Phaser.GameObjects.Container;
  private atmosphere?: ProceduralAtmosphere;

  constructor() {
    super('TombScene');
  }

  init(data?: TombSceneData): void {
    this.incomingAppearanceId = isPlayerAppearanceId(data?.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  create(): void {
    this.resetTombState();
    this.investigableObjects = [];
    this.artifactSpots = [];
    this.nearbyInteraction = undefined;
    this.activeInvestigation = undefined;
    this.carrySystem = new CarrySystem();
    this.disturbanceSystem = new TombDisturbanceSystem();
    this.artifactCollisions = new Map<string, Phaser.GameObjects.Rectangle>();

    this.cameras.main.setBackgroundColor('#151915');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'tomb',
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    });
    this.drawTombGreybox();
    this.artifactSpots = this.createArtifactSpots();
    this.investigableObjects = this.createInvestigableObjects();
    const obstacles = this.createCollisionObstacles();
    this.createEntranceGate(obstacles);
    this.player = this.createPlayer();
    this.physics.add.collider(this.player, obstacles);

    this.configureCamera();
    this.createAmbientFeedback();
    this.createInterface();
    this.registerInput();
    this.startArrivalIntroduction();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupTombScene, this);
  }

  update(time: number, delta: number): void {
    if (
      !this.player ||
      !this.interactionKey ||
      !this.carryActionKey ||
      !this.escapeKey ||
      !this.enterKey
    ) {
      return;
    }

    const interactionPressed = Phaser.Input.Keyboard.JustDown(this.interactionKey);
    const carryActionPressed = Phaser.Input.Keyboard.JustDown(this.carryActionKey);
    const escapePressed = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey);
    this.atmosphere?.update(this.player.x, this.player.y, time);

    if (this.arrivalIntroductionActive) {
      if (interactionPressed || enterPressed) {
        this.advanceArrivalIntroduction();
      }
      return;
    }

    if (this.tutorialPhase === 'completed') {
      if (interactionPressed || enterPressed) {
        this.scene.start('AntiqueShopScene', {
          departureChoice: this.departureChoice ?? 'empty',
          appearanceId: this.appearanceId,
        });
      }
      return;
    }

    if (this.tutorialPhase === 'departure-confirmation') {
      if (carryActionPressed) {
        this.confirmDeparture();
        return;
      }

      if (interactionPressed || escapePressed) {
        this.closeDepartureConfirmation();
      }
      return;
    }

    this.updateCarriedExposure(delta / 1000);
    this.updateAmbientFeedback(time, delta / 1000);

    if (this.activeInvestigation) {
      if (interactionPressed || escapePressed) {
        this.closeInvestigation();
        return;
      }

      if (carryActionPressed) {
        if (this.isSealedCoffin(this.activeInvestigation)) {
          this.openCoffin();
          return;
        }

        if (this.activeInvestigation.portable) {
          this.takeOrSwapActiveArtifact();
          return;
        }
      }
      return;
    }

    this.player.update();
    this.updateNearestInteraction();

    if (escapePressed) {
      this.scene.start('MainMenuScene');
      return;
    }

    if (interactionPressed && this.nearbyInteraction?.kind === 'artifact') {
      this.openInvestigation(this.nearbyInteraction.artifact);
      return;
    }

    if (interactionPressed && this.nearbyInteraction?.kind === 'exit') {
      this.openDepartureConfirmation();
      return;
    }

    if (carryActionPressed && this.nearbyInteraction?.kind === 'empty-spot') {
      this.placeCarriedArtifact(this.nearbyInteraction.spot);
      return;
    }
  }

  private resetTombState(): void {
    this.appearanceId = this.incomingAppearanceId;
    this.arrivalIntroductionActive = true;
    this.arrivalIntroductionIndex = 0;
    this.arrivalPanel = undefined;
    this.arrivalEnglishText = undefined;
    this.arrivalChineseText = undefined;
    this.arrivalBag = undefined;
    this.tutorialPhase = 'entering';
    this.compassHasBeenRetrieved = false;
    this.departureChoice = undefined;
    this.coffinState = 'sealed';
    this.carriedExposureSeconds = 0;
    this.exposureArtifactId = null;
    this.currentOmenLevel = 0;
    this.levelThreeShakeElapsed = 0;
    this.compassFeedbackSeconds = 0;
    this.entranceSealTimer = undefined;
    this.entranceGateTween = undefined;
    this.shopkeeperHideTimer = undefined;
    this.shopkeeperFadeTween = undefined;
    this.atmosphere = undefined;
    this.shownShopkeeperMessages.clear();
    this.disturbanceSystem.reset();
    this.cameras.main.resetFX();
  }

  private createPlayer(): Player {
    // The player begins inside the south entrance and initially faces north.
    return new Player(
      this,
      ROOM_CENTER_X,
      ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS - GRID_SIZE,
      this.appearanceId,
    );
  }

  private createEntranceGate(obstacles: Phaser.Physics.Arcade.StaticGroup): void {
    this.entranceGateVisual = this.add.graphics().setDepth(2.5);
    this.entranceGateVisual.fillStyle(0x464b43, 1);
    this.entranceGateVisual.fillRect(
      -ENTRANCE_WIDTH / 2,
      -WALL_THICKNESS / 2,
      ENTRANCE_WIDTH,
      WALL_THICKNESS,
    );
    this.entranceGateVisual.lineStyle(2, 0x9da18e, 0.92);
    this.entranceGateVisual.strokeRect(
      -ENTRANCE_WIDTH / 2,
      -WALL_THICKNESS / 2,
      ENTRANCE_WIDTH,
      WALL_THICKNESS,
    );
    this.entranceGateVisual.lineBetween(
      -ENTRANCE_WIDTH / 6,
      -WALL_THICKNESS / 2,
      -ENTRANCE_WIDTH / 6,
      WALL_THICKNESS / 2,
    );
    this.entranceGateVisual.lineBetween(
      ENTRANCE_WIDTH / 6,
      -WALL_THICKNESS / 2,
      ENTRANCE_WIDTH / 6,
      WALL_THICKNESS / 2,
    );
    this.entranceGateVisual
      .setPosition(ENTRANCE_X, ENTRANCE_Y + WALL_THICKNESS)
      .setVisible(true);

    this.entranceGateCollision = this.add.rectangle(
      ENTRANCE_X,
      ENTRANCE_Y,
      ENTRANCE_WIDTH,
      WALL_THICKNESS,
      0x000000,
      0,
    );
    obstacles.add(this.entranceGateCollision);

    const promptBackground = this.add
      .rectangle(0, 0, 224, 32, 0x12100d, 0.9)
      .setStrokeStyle(1, 0x94886d, 0.75);
    const promptText = this.add
      .text(0, 0, 'E  Leave Tomb / 离开墓穴', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#ded4b7',
      })
      .setOrigin(0.5);
    this.exitPrompt = this.add
      .container(ENTRANCE_X, ENTRANCE_Y - 72, [promptBackground, promptText])
      .setDepth(6)
      .setVisible(false);
  }

  private startEntranceSequence(): void {
    this.entranceSealTimer = this.time.delayedCall(550, () => this.sealEntrance());
  }

  private startArrivalIntroduction(): void {
    if (!this.player) {
      return;
    }
    this.arrivalIntroductionActive = true;
    this.arrivalIntroductionIndex = 0;
    this.player.setMovementEnabled(false);
    this.instructionText?.setVisible(false);
    this.escapeHintText?.setVisible(false);
    this.objectiveUI?.setVisible(false);
    this.carryUI?.setVisible(false);
    this.locationTitleEnglish?.setVisible(false);
    this.locationTitleChinese?.setVisible(false);
    this.createArrivalBag();
    this.createArrivalPanel();
    this.showArrivalIntroductionBeat();
  }

  private createArrivalBag(): void {
    if (!this.player || this.arrivalBag) {
      return;
    }
    const bag = this.add.graphics();
    bag.fillStyle(0x75664d, 1);
    bag.fillRoundedRect(-21, -13, 42, 31, 7);
    bag.lineStyle(2, 0xc0a477, 0.92);
    bag.strokeRoundedRect(-21, -13, 42, 31, 7);
    bag.lineBetween(-12, -13, -7, -24);
    bag.lineBetween(12, -13, 7, -24);
    bag.lineBetween(-11, 2, 11, 2);
    this.arrivalBag = this.add
      .container(this.player.x + 48, this.player.y + 8, [bag])
      .setDepth(3.2);
  }

  private createArrivalPanel(): void {
    const background = this.add
      .rectangle(0, 0, 1120, 128, 0x191713, 0.95)
      .setStrokeStyle(1, 0xb29f7b, 0.9);
    const title = this.add.text(-520, -51, 'ARRIVAL', {
      fontFamily: SANS_FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#aa9a78',
      letterSpacing: 1,
    });
    const chineseTitle = this.add.text(-520, -34, '抵达', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#807866',
    });
    this.arrivalEnglishText = this.add.text(-520, -10, '', {
      fontFamily: SERIF_FONT,
      fontSize: '16px',
      color: '#e7ddc8',
      lineSpacing: 2,
      wordWrap: { width: 850 },
    });
    this.arrivalChineseText = this.add.text(-520, 31, '', {
      fontFamily: SERIF_FONT,
      fontSize: '13px',
      color: '#beb5a3',
      lineSpacing: 2,
      wordWrap: { width: 820 },
    });
    const continueText = this.add
      .text(520, 52, 'E / ENTER  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#b0a38b',
      })
      .setOrigin(1, 0.5);
    this.arrivalPanel = this.add
      .container(this.scale.width / 2, 144, [
        background,
        title,
        chineseTitle,
        this.arrivalEnglishText,
        this.arrivalChineseText,
        continueText,
      ])
      .setScrollFactor(0)
      .setDepth(30);
  }

  private showArrivalIntroductionBeat(): void {
    const beats = [
      {
        english:
          'The route ended at a sealed burial passage.\nNot a storehouse.',
        chinese:
          '老板画出的路线，最终通向一条被封住的墓道。\n这里根本不是什么仓房。',
      },
      {
        english: 'Every turn on his hand-drawn route had been correct.',
        chinese: '但他画出的每一个转弯，都准确无误。',
      },
      {
        english:
          'He lied about the place.\nHe did not lie about knowing the way.',
        chinese:
          '他隐瞒了这是什么地方。\n但他确实知道该怎么走。',
      },
    ];
    const beat = beats[this.arrivalIntroductionIndex];
    this.arrivalEnglishText?.setText(beat.english);
    this.arrivalChineseText?.setText(beat.chinese);
  }

  private advanceArrivalIntroduction(): void {
    this.arrivalIntroductionIndex += 1;
    if (this.arrivalIntroductionIndex < 3) {
      this.showArrivalIntroductionBeat();
      return;
    }
    this.arrivalIntroductionActive = false;
    this.arrivalPanel?.destroy(true);
    this.arrivalPanel = undefined;
    this.arrivalBag?.destroy(true);
    this.arrivalBag = undefined;
    this.updateObjectiveUI(
      'Retrieve the shopkeeper’s compass.',
      '取回老板所说的风水罗盘。',
    );
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.carryUI?.setVisible(true);
    this.locationTitleEnglish?.setVisible(true);
    this.locationTitleChinese?.setVisible(true);
    this.player?.setMovementEnabled(true);
    this.startEntranceSequence();
  }

  private sealEntrance(): void {
    if (this.tutorialPhase !== 'entering' || !this.entranceGateVisual) {
      return;
    }

    this.tutorialPhase = 'sealed';
    this.entranceGateTween = this.tweens.add({
      targets: this.entranceGateVisual,
      y: ENTRANCE_Y,
      duration: 300,
      ease: 'Sine.Out',
      onComplete: () => this.cameras.main.shake(90, 0.001),
    });
    this.updateObjectiveUI('Open the sealed coffin.', '打开封闭的棺椁。');
    this.showShopkeeperMessage(
      'sealed',
      'The entrance is sealed. Open the coffin. When you find what I sent you for, I will release the lock.',
      '入口已经封上了。打开棺椁。等你找到我要你取回的东西，我会解开机关。',
    );
  }

  private releaseEntrance(): void {
    const gateBody = this.entranceGateCollision?.body as
      | Phaser.Physics.Arcade.StaticBody
      | undefined;
    if (gateBody) {
      gateBody.enable = false;
    }

    if (this.entranceGateVisual) {
      this.entranceGateTween?.stop();
      this.entranceGateTween = this.tweens.add({
        targets: this.entranceGateVisual,
        y: ENTRANCE_Y + WALL_THICKNESS,
        alpha: 0.35,
        duration: 300,
        ease: 'Sine.In',
      });
    }
  }

  private cleanupTombScene(): void {
    this.entranceSealTimer?.remove(false);
    this.shopkeeperHideTimer?.remove(false);
    this.entranceGateTween?.stop();
    this.shopkeeperFadeTween?.stop();
    this.cameras.main?.resetFX();
  }

  private configureCamera(): void {
    if (!this.player) {
      return;
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private createAmbientFeedback(): void {
    this.ambientOverlay = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(8)
      .setVisible(false);
  }

  private updateCarriedExposure(deltaSeconds: number): void {
    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    if (!carriedArtifact) {
      this.carriedExposureSeconds = 0;
      this.exposureArtifactId = null;
      return;
    }

    if (this.exposureArtifactId !== carriedArtifact.id) {
      this.exposureArtifactId = carriedArtifact.id;
      this.carriedExposureSeconds = 0;
      return;
    }

    this.carriedExposureSeconds += deltaSeconds;
  }

  private updateAmbientFeedback(time: number, deltaSeconds: number): void {
    if (!this.ambientOverlay) {
      return;
    }

    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    this.currentOmenLevel = this.disturbanceSystem.calculateOmenLevel(
      carriedArtifact?.omenTier ?? 0,
      this.carriedExposureSeconds,
      this.coffinState,
    );

    this.ambientOverlay.clear();
    if (this.currentOmenLevel === 0) {
      this.ambientOverlay.setVisible(false);
      return;
    }

    const pulse =
      this.currentOmenLevel >= 2 ? (Math.sin(time / 2200) + 1) * 0.012 : 0;
    const baseAlpha =
      this.currentOmenLevel === 1 ? 0.055 : this.currentOmenLevel === 2 ? 0.085 : 0.105;
    let vignetteAlpha = baseAlpha + pulse;

    if (this.compassFeedbackSeconds > 0) {
      this.compassFeedbackSeconds = Math.max(0, this.compassFeedbackSeconds - deltaSeconds);
      const rampProgress = 1 - this.compassFeedbackSeconds;
      vignetteAlpha *= 0.75 + rampProgress * 0.25;
    }

    const { width, height } = this.scale;
    const edgeSize = 104;
    this.ambientOverlay.setVisible(true);
    this.ambientOverlay.fillStyle(0x050605, vignetteAlpha);
    this.ambientOverlay.fillRect(0, 0, width, edgeSize);
    this.ambientOverlay.fillRect(0, height - edgeSize, width, edgeSize);
    this.ambientOverlay.fillRect(0, edgeSize, edgeSize, height - edgeSize * 2);
    this.ambientOverlay.fillRect(
      width - edgeSize,
      edgeSize,
      edgeSize,
      height - edgeSize * 2,
    );

    if (this.currentOmenLevel === 3) {
      this.levelThreeShakeElapsed += deltaSeconds;
      if (this.levelThreeShakeElapsed >= 10) {
        this.levelThreeShakeElapsed = 0;
        this.cameras.main.shake(100, 0.0015);
      }
    } else {
      this.levelThreeShakeElapsed = 0;
    }
  }

  private createInterface(): void {
    const { width, height } = this.scale;

    this.locationTitleEnglish = this.add
      .text(width / 2, 38, 'Feng Shui Master’s Tomb', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ded5c3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.locationTitleChinese = this.add
      .text(width / 2, 76, '风水师墓', {
        fontFamily: SERIF_FONT,
        fontSize: '19px',
        color: '#b2bca8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.instructionText = this.add
      .text(width / 2, height - 44, 'WASD  Move / 移动     E  Investigate / 调查', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#b0a187',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.escapeHintText = this.add
      .text(32, height - 44, 'ESC  Menu / 返回', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#969f92',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.createObjectiveUI();
    this.createShopkeeperMessage();
    this.createCarryUI();
    this.createInvestigationPanel();
    this.createDepartureConfirmation();
    this.createDepartureResult();
  }

  private createObjectiveUI(): void {
    const background = this.add
      .rectangle(0, 0, 310, 112, 0x1b1814, 0.92)
      .setStrokeStyle(1, 0xb29f7b, 0.88);
    const title = this.add
      .text(-137, -45, 'OBJECTIVE', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a99d7e',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-137, -27, '当前目标', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#aaa18f',
      })
      .setOrigin(0, 0.5);
    this.objectiveText = this.add
      .text(-137, -6, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#e1d7bc',
        wordWrap: { width: 274 },
      })
      .setOrigin(0, 0);
    this.objectiveChineseText = this.add
      .text(-137, 29, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#bbb3a1',
        wordWrap: { width: 274 },
      })
      .setOrigin(0, 0);

    this.objectiveUI = this.add
      .container(175, 162, [
        background,
        title,
        chineseTitle,
        this.objectiveText,
        this.objectiveChineseText,
      ])
      .setScrollFactor(0)
      .setDepth(15)
      .setVisible(false);
  }

  private updateObjectiveUI(englishText: string, chineseText: string): void {
    this.objectiveText?.setText(englishText);
    this.objectiveChineseText?.setText(chineseText);
    this.objectiveUI?.setVisible(true);
  }

  private createShopkeeperMessage(): void {
    const { width, height } = this.scale;
    const background = this.add
      .rectangle(0, 0, 920, 124, 0x191713, 0.95)
      .setStrokeStyle(1, 0xb29f7b, 0.88);
    const title = this.add
      .text(-424, -45, 'SHOPKEEPER', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a99d7e',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-326, -45, '古玩店老板', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#aaa18f',
      })
      .setOrigin(0, 0.5);
    this.shopkeeperMessageText = this.add
      .text(-424, -25, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#e1d7bc',
        wordWrap: { width: 848 },
      })
      .setOrigin(0, 0);
    this.shopkeeperChineseMessageText = this.add
      .text(-424, 18, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#bbb3a1',
        wordWrap: { width: 848 },
      })
      .setOrigin(0, 0);

    this.shopkeeperMessage = this.add
      .container(width / 2, height - 134, [
        background,
        title,
        chineseTitle,
        this.shopkeeperMessageText,
        this.shopkeeperChineseMessageText,
      ])
      .setScrollFactor(0)
      .setDepth(12)
      .setVisible(false);
  }

  private showShopkeeperMessage(
    messageId: 'sealed' | 'released',
    englishText: string,
    chineseText: string,
  ): void {
    if (
      this.shownShopkeeperMessages.has(messageId) ||
      !this.shopkeeperMessage ||
      !this.shopkeeperMessageText ||
      !this.shopkeeperChineseMessageText
    ) {
      return;
    }

    this.shownShopkeeperMessages.add(messageId);
    this.shopkeeperHideTimer?.remove(false);
    this.shopkeeperFadeTween?.stop();
    this.shopkeeperMessageText.setText(englishText);
    this.shopkeeperChineseMessageText.setText(chineseText);
    this.shopkeeperMessage.setAlpha(1).setVisible(true);
    this.instructionText?.setVisible(false);
    this.escapeHintText?.setVisible(false);
    this.shopkeeperHideTimer = this.time.delayedCall(3600, () => {
      if (!this.shopkeeperMessage) {
        return;
      }

      this.shopkeeperFadeTween = this.tweens.add({
        targets: this.shopkeeperMessage,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          this.shopkeeperMessage?.setVisible(false);
          if (
            !this.activeInvestigation &&
            this.tutorialPhase !== 'departure-confirmation' &&
            this.tutorialPhase !== 'completed'
          ) {
            this.instructionText?.setVisible(true);
            this.escapeHintText?.setVisible(true);
          }
        },
      });
    });
  }

  private hideShopkeeperMessage(): void {
    this.shopkeeperHideTimer?.remove(false);
    this.shopkeeperFadeTween?.stop();
    this.shopkeeperMessage?.setVisible(false);
  }

  private createCarryUI(): void {
    const { width } = this.scale;
    const panelWidth = 230;
    const panelHeight = 84;
    const panelX = width - panelWidth / 2 - 28;
    const panelY = 146;

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x1b1814, 0.92)
      .setStrokeStyle(1, 0xb29f7b, 0.88);

    this.carryCountText = this.add
      .text(-96, -28, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#b8ad8f',
      })
      .setOrigin(0, 0.5);

    this.carriedEnglishName = this.add
      .text(-96, 0, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#eee4c9',
      })
      .setOrigin(0, 0.5);

    this.carriedChineseName = this.add
      .text(-96, 25, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#bbb3a1',
      })
      .setOrigin(0, 0.5);

    this.carryUI = this.add
      .container(panelX, panelY, [
        background,
        this.carryCountText,
        this.carriedEnglishName,
        this.carriedChineseName,
      ])
      .setScrollFactor(0)
      .setDepth(15);

    this.updateCarryUI();
  }

  private updateCarryUI(): void {
    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    this.carryCountText?.setText(`CARRYING / 携带  ${carriedArtifact ? 1 : 0} / 1`);
    this.carriedEnglishName?.setText(carriedArtifact?.englishName ?? 'EMPTY');
    this.carriedChineseName?.setText(carriedArtifact?.chineseName ?? '空手');
  }

  private createDepartureConfirmation(): void {
    const { width, height } = this.scale;
    const background = this.add
      .rectangle(0, 0, 780, 400, 0x15120f, 0.98)
      .setStrokeStyle(2, 0xb1a47f, 0.9);
    const title = this.add
      .text(0, -165, 'LEAVE THE TOMB?', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#eee4c9',
      })
      .setOrigin(0.5);
    const chineseTitle = this.add
      .text(0, -130, '确定离开墓穴？', {
        fontFamily: SERIF_FONT,
        fontSize: '21px',
        color: '#b9ae95',
      })
      .setOrigin(0.5);
    const warning = this.add
      .text(0, -92, 'You cannot return after leaving.', {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        color: '#b8ad91',
      })
      .setOrigin(0.5);
    const chineseWarning = this.add
      .text(0, -65, '离开后将无法返回。', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#938a76',
      })
      .setOrigin(0.5);
    const carryingLabel = this.add
      .text(0, -24, 'CURRENTLY CARRYING', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#998e74',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    const chineseCarryingLabel = this.add
      .text(0, -3, '当前携带', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#877e69',
      })
      .setOrigin(0.5);
    this.departureCarriedEnglish = this.add
      .text(0, 36, '', {
        fontFamily: SERIF_FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#e1d7bc',
      })
      .setOrigin(0.5);
    this.departureCarriedChinese = this.add
      .text(0, 70, '', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#9da38b',
      })
      .setOrigin(0.5);
    const confirmHint = this.add
      .text(-336, 162, 'F  LEAVE / 确认离开', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ded4b7',
      })
      .setOrigin(0, 0.5);
    const cancelHint = this.add
      .text(336, 162, 'E / ESC  STAY / 暂不离开', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#8f846e',
      })
      .setOrigin(1, 0.5);

    this.departurePanel = this.add
      .container(width / 2, height / 2, [
        background,
        title,
        chineseTitle,
        warning,
        chineseWarning,
        carryingLabel,
        chineseCarryingLabel,
        this.departureCarriedEnglish,
        this.departureCarriedChinese,
        confirmHint,
        cancelHint,
      ])
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);
  }

  private createDepartureResult(): void {
    const { width, height } = this.scale;
    const background = this.add.rectangle(0, 0, width, height, 0x0d0f0c, 0.985);
    const title = this.add
      .text(0, -260, 'THE FIRST RETRIEVAL', {
        fontFamily: SERIF_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#eee4c9',
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const chineseTitle = this.add
      .text(0, -218, '第一次取回', {
        fontFamily: SERIF_FONT,
        fontSize: '25px',
        color: '#b9ae95',
      })
      .setOrigin(0.5);
    const returnedLabel = this.add
      .text(0, -172, 'RETURNED WITH', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#998e74',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    const chineseReturnedLabel = this.add
      .text(0, -149, '最终带回', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#877e69',
      })
      .setOrigin(0.5);
    this.resultEnglishName = this.add
      .text(0, -112, '', {
        fontFamily: SERIF_FONT,
        fontSize: '31px',
        fontStyle: 'bold',
        color: '#e1d7bc',
      })
      .setOrigin(0.5);
    this.resultChineseName = this.add
      .text(0, -72, '', {
        fontFamily: SERIF_FONT,
        fontSize: '19px',
        color: '#9da38b',
      })
      .setOrigin(0.5);
    const returnHint = this.add
      .text(0, 270, 'E / ENTER  RETURN TO THE ANTIQUE SHOP / 返回古玩店', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#8f846e',
      })
      .setOrigin(0.5);

    this.resultPanel = this.add
      .container(width / 2, height / 2, [
        background,
        title,
        chineseTitle,
        returnedLabel,
        chineseReturnedLabel,
        this.resultEnglishName,
        this.resultChineseName,
        returnHint,
      ])
      .setScrollFactor(0)
      .setDepth(40)
      .setVisible(false);
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for tomb interactions.');
    }

    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.carryActionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  private drawTombGreybox(): void {
    this.createFloor();
    this.createFloorDetails();
    this.createWalls();
  }

  private createFloor(): void {
    const interiorX = ROOM_X + WALL_THICKNESS;
    const interiorY = ROOM_Y + WALL_THICKNESS;
    const interiorWidth = ROOM_WIDTH - WALL_THICKNESS * 2;
    const interiorHeight = ROOM_HEIGHT - WALL_THICKNESS * 2;
    const entranceX = ROOM_CENTER_X - ENTRANCE_WIDTH / 2;

    const floor = this.add.graphics().setDepth(0);
    floor.fillStyle(0x50564d, 1);
    floor.fillRect(interiorX, interiorY, interiorWidth, interiorHeight);
    floor.fillRect(entranceX, ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS, ENTRANCE_WIDTH, GRID_SIZE * 2);
  }

  private createFloorDetails(): void {
    const interiorX = ROOM_X + WALL_THICKNESS;
    const interiorY = ROOM_Y + WALL_THICKNESS;
    const interiorRight = ROOM_X + ROOM_WIDTH - WALL_THICKNESS;
    const interiorBottom = ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS;
    const entranceX = ROOM_CENTER_X - ENTRANCE_WIDTH / 2;
    const details = this.add.graphics().setDepth(0.5);

    details.lineStyle(1, 0x92988a, 0.22);
    for (let x = interiorX; x <= interiorRight; x += GRID_SIZE) {
      details.lineBetween(x, interiorY, x, interiorBottom);
    }
    for (let y = interiorY; y <= interiorBottom; y += GRID_SIZE) {
      details.lineBetween(interiorX, y, interiorRight, y);
    }
    for (let x = entranceX; x <= entranceX + ENTRANCE_WIDTH; x += GRID_SIZE) {
      details.lineBetween(x, interiorBottom, x, interiorBottom + GRID_SIZE * 2);
    }
    details.lineBetween(
      entranceX,
      interiorBottom + GRID_SIZE,
      entranceX + ENTRANCE_WIDTH,
      interiorBottom + GRID_SIZE,
    );

    details.lineStyle(2, 0x262a25, 0.35);
    details.lineBetween(448, 416, 466, 430);
    details.lineBetween(466, 430, 454, 446);
    details.lineBetween(1120, 672, 1102, 686);
    details.lineBetween(1102, 686, 1114, 702);
    details.lineBetween(672, 704, 688, 692);

    details.fillStyle(0x242820, 0.16);
    details.fillEllipse(416, 640, 92, 46);
    details.fillEllipse(1184, 416, 72, 38);
    details.fillStyle(0x242820, 0.12);
    details.fillRect(960, 704, GRID_SIZE, GRID_SIZE);

    details.lineStyle(1, VISUAL_THEME.colors.corpseGreen, 0.18);
    for (let index = 0; index < 16; index += 1) {
      const x = interiorX + 34 + ((index * 173) % (interiorRight - interiorX - 68));
      const y = interiorY + 28 + ((index * 97) % (interiorBottom - interiorY - 56));
      details.lineBetween(x, y, x + 18 + (index % 3) * 8, y + (index % 2) * 3);
    }

    details.fillStyle(VISUAL_THEME.colors.tombBlue, 0.1);
    details.fillEllipse(354, 372, 74, 30);
    details.fillEllipse(1240, 508, 54, 96);
    details.fillEllipse(594, 804, 92, 26);
  }

  private createWalls(): void {
    const entranceX = ROOM_CENTER_X - ENTRANCE_WIDTH / 2;
    const southWallY = ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS;
    const wall = this.add.graphics().setDepth(1);

    wall.fillStyle(0x323731, 1);
    wall.fillRect(ROOM_X, ROOM_Y, ROOM_WIDTH, WALL_THICKNESS);
    wall.fillRect(
      ROOM_X,
      ROOM_Y + WALL_THICKNESS,
      WALL_THICKNESS,
      ROOM_HEIGHT - WALL_THICKNESS * 2,
    );
    wall.fillRect(
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS,
      ROOM_Y + WALL_THICKNESS,
      WALL_THICKNESS,
      ROOM_HEIGHT - WALL_THICKNESS * 2,
    );
    wall.fillRect(ROOM_X, southWallY, entranceX - ROOM_X, WALL_THICKNESS);
    wall.fillRect(
      entranceX + ENTRANCE_WIDTH,
      southWallY,
      ROOM_X + ROOM_WIDTH - entranceX - ENTRANCE_WIDTH,
      WALL_THICKNESS,
    );

    wall.lineStyle(3, 0x8f9989, 0.92);
    wall.lineBetween(
      ROOM_X + WALL_THICKNESS,
      ROOM_Y + WALL_THICKNESS,
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS,
      ROOM_Y + WALL_THICKNESS,
    );
    wall.lineBetween(
      ROOM_X + WALL_THICKNESS,
      ROOM_Y + WALL_THICKNESS,
      ROOM_X + WALL_THICKNESS,
      southWallY,
    );
    wall.lineBetween(
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS,
      ROOM_Y + WALL_THICKNESS,
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS,
      southWallY,
    );
    wall.lineBetween(ROOM_X + WALL_THICKNESS, southWallY, entranceX, southWallY);
    wall.lineBetween(
      entranceX + ENTRANCE_WIDTH,
      southWallY,
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS,
      southWallY,
    );

    wall.lineStyle(1, VISUAL_THEME.colors.coldStone, 0.78);
    for (let x = ROOM_X + 96; x < ROOM_X + ROOM_WIDTH - 64; x += 128) {
      wall.lineBetween(x, ROOM_Y + 12, x + 48, ROOM_Y + 12);
      wall.lineBetween(x + 42, ROOM_Y + 42, x + 104, ROOM_Y + 42);
    }
    for (let y = ROOM_Y + 112; y < southWallY - 32; y += 96) {
      wall.lineBetween(ROOM_X + 12, y, ROOM_X + 52, y + 12);
      wall.lineBetween(
        ROOM_X + ROOM_WIDTH - 52,
        y + 18,
        ROOM_X + ROOM_WIDTH - 12,
        y + 6,
      );
    }

    wall.fillStyle(VISUAL_THEME.colors.corpseGreen, 0.13);
    wall.fillEllipse(420, ROOM_Y + 30, 156, 30);
    wall.fillEllipse(ROOM_X + 30, 548, 28, 148);
    wall.fillEllipse(ROOM_X + ROOM_WIDTH - 30, 642, 30, 122);
  }

  private createArtifactSpots(): ArtifactSpot[] {
    const createSpotPrompt = (
      x: number,
      y: number,
      offsetY = -72,
    ): Phaser.GameObjects.Container => {
      const background = this.add
        .rectangle(0, 0, 164, 32, 0x12100d, 0.88)
        .setStrokeStyle(1, 0x94886d, 0.75);
      const text = this.add
        .text(0, 0, 'F  Place / 放置', {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          color: '#ded4b7',
        })
        .setOrigin(0.5);

      return this.add.container(x, y + offsetY, [background, text]).setDepth(6).setVisible(false);
    };

    const emptyTraces = this.add.graphics().setDepth(1.5);
    emptyTraces.fillStyle(0x252923, 0.42);
    emptyTraces.fillCircle(LEFT_PROP_X, PROP_Y, 42);
    emptyTraces.lineStyle(2, 0x777765, 0.28);
    emptyTraces.strokeCircle(LEFT_PROP_X, PROP_Y, 42);
    emptyTraces.fillRoundedRect(RIGHT_PROP_X - 43, PROP_Y - 49, 86, 98, 8);
    emptyTraces.strokeRoundedRect(RIGHT_PROP_X - 43, PROP_Y - 49, 86, 98, 8);

    return [
      {
        spotId: 'left-display-spot',
        worldX: LEFT_PROP_X,
        worldY: PROP_Y,
        interactionRadius: 96,
        artifactId: 'burial-vessel',
        isEmpty: false,
        isEnabled: true,
        promptObject: createSpotPrompt(LEFT_PROP_X, PROP_Y),
      },
      {
        spotId: 'right-display-spot',
        worldX: RIGHT_PROP_X,
        worldY: PROP_Y,
        interactionRadius: 96,
        artifactId: 'bronze-mirror',
        isEmpty: false,
        isEnabled: true,
        promptObject: createSpotPrompt(RIGHT_PROP_X, PROP_Y),
      },
      {
        spotId: 'coffin-interior',
        worldX: COMPASS_X,
        worldY: COMPASS_Y,
        interactionRadius: 142,
        artifactId: 'geomancers-compass',
        isEmpty: false,
        isEnabled: false,
        promptObject: createSpotPrompt(COMPASS_X, COMPASS_Y, -56),
      },
    ];
  }

  private createInvestigableObjects(): InvestigableObject[] {
    const coffin = this.createCoffinVisual(ROOM_CENTER_X, PROP_Y);
    const leftObject = this.createBurialVesselVisual(LEFT_PROP_X, PROP_Y);
    const rightObject = this.createBronzeMirrorVisual(RIGHT_PROP_X, PROP_Y);
    const compassObject = this.createCompassVisual(COMPASS_X, COMPASS_Y);
    const vesselData = ARTIFACT_DEFINITIONS['burial-vessel'];
    const mirrorData = ARTIFACT_DEFINITIONS['bronze-mirror'];
    const compassData = ARTIFACT_DEFINITIONS['geomancers-compass'];

    return [
      new InvestigableObject(this, {
        id: 'sealed-coffin',
        englishName: 'Sealed Coffin',
        chineseName: '封闭的棺椁',
        description:
          'The lid has not been moved, but the dust around its edge is strangely thin.',
        chineseDescription: '棺盖没有移动过，但边缘的积灰薄得异常。',
        portable: false,
        hiddenValue: null,
        appraisalText: '',
        chineseAppraisalText: '',
        omenTier: 0,
        originalSpotId: null,
        hasBeenDisturbed: false,
        worldX: ROOM_CENTER_X,
        worldY: PROP_Y,
        interactionRadius: 110,
        locationState: 'world',
        displaySpotId: null,
        promptOffsetY: -142,
        visualObject: coffin.container,
        highlightObject: coffin.highlight,
      }),
      new InvestigableObject(this, {
        id: vesselData.id,
        englishName: vesselData.englishName,
        chineseName: vesselData.chineseName,
        description: vesselData.description,
        chineseDescription: vesselData.chineseDescription,
        portable: true,
        hiddenValue: vesselData.hiddenValue,
        appraisalText: vesselData.appraisalText,
        chineseAppraisalText: vesselData.chineseAppraisalText,
        omenTier: vesselData.omenTier,
        originalSpotId: vesselData.originalSpotId,
        hasBeenDisturbed: false,
        worldX: LEFT_PROP_X,
        worldY: PROP_Y,
        interactionRadius: 96,
        locationState: 'world',
        displaySpotId: 'left-display-spot',
        promptOffsetY: -72,
        visualObject: leftObject.container,
        highlightObject: leftObject.highlight,
      }),
      new InvestigableObject(this, {
        id: mirrorData.id,
        englishName: mirrorData.englishName,
        chineseName: mirrorData.chineseName,
        description: mirrorData.description,
        chineseDescription: mirrorData.chineseDescription,
        portable: true,
        hiddenValue: mirrorData.hiddenValue,
        appraisalText: mirrorData.appraisalText,
        chineseAppraisalText: mirrorData.chineseAppraisalText,
        omenTier: mirrorData.omenTier,
        originalSpotId: mirrorData.originalSpotId,
        hasBeenDisturbed: false,
        worldX: RIGHT_PROP_X,
        worldY: PROP_Y,
        interactionRadius: 96,
        locationState: 'world',
        displaySpotId: 'right-display-spot',
        promptOffsetY: -78,
        visualObject: rightObject.container,
        highlightObject: rightObject.highlight,
      }),
      new InvestigableObject(this, {
        id: compassData.id,
        englishName: compassData.englishName,
        chineseName: compassData.chineseName,
        description: compassData.description,
        chineseDescription: compassData.chineseDescription,
        portable: true,
        hiddenValue: compassData.hiddenValue,
        appraisalText: compassData.appraisalText,
        chineseAppraisalText: compassData.chineseAppraisalText,
        omenTier: compassData.omenTier,
        originalSpotId: compassData.originalSpotId,
        hasBeenDisturbed: false,
        worldX: COMPASS_X,
        worldY: COMPASS_Y,
        interactionRadius: 142,
        locationState: 'world',
        displaySpotId: 'coffin-interior',
        isAvailable: false,
        promptOffsetY: -56,
        visualObject: compassObject.container,
        highlightObject: compassObject.highlight,
      }),
    ];
  }

  private createCoffinVisual(
    x: number,
    y: number,
  ): {
    container: Phaser.GameObjects.Container;
    highlight: Phaser.GameObjects.Graphics;
  } {
    const base = this.add.graphics();
    base.fillStyle(0x725f4c, 1);
    base.fillRect(-64, -96, 128, 192);
    base.lineStyle(3, 0xb2916d, 1);
    base.strokeRect(-64, -96, 128, 192);
    base.fillStyle(0x312b25, 1);
    base.fillRect(-49, -81, 98, 162);
    base.lineStyle(2, 0xc1a078, 0.94);
    base.strokeRect(-48, -80, 96, 160);

    this.coffinClosedLid = this.add.graphics();
    this.coffinClosedLid.fillStyle(0x634f40, 1);
    this.coffinClosedLid.fillRect(-48, -80, 96, 160);
    this.coffinClosedLid.lineStyle(2, 0xc1a078, 0.95);
    this.coffinClosedLid.strokeRect(-48, -80, 96, 160);
    this.coffinClosedLid.lineBetween(-48, -48, 48, -48);
    this.coffinClosedLid.lineBetween(-48, 48, 48, 48);
    this.coffinClosedLid.lineBetween(0, -80, 0, 80);
    this.coffinClosedLid.strokePoints(
      [
        new Phaser.Geom.Point(0, -24),
        new Phaser.Geom.Point(18, 0),
        new Phaser.Geom.Point(0, 24),
        new Phaser.Geom.Point(-18, 0),
      ],
      true,
    );

    this.coffinOpenedLid = this.add.graphics();
    this.coffinOpenedLid.fillStyle(0x634f40, 1);
    this.coffinOpenedLid.fillRect(-46, -76, 92, 152);
    this.coffinOpenedLid.lineStyle(2, 0xc1a078, 0.92);
    this.coffinOpenedLid.strokeRect(-46, -76, 92, 152);
    this.coffinOpenedLid.lineBetween(-46, -40, 46, -40);
    this.coffinOpenedLid.lineBetween(-46, 40, 46, 40);
    this.coffinOpenedLid
      .setPosition(88, -8)
      .setAngle(4)
      .setVisible(false);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xd5c49b, 0.84);
    highlight.strokeRect(-68, -100, 136, 200);

    return {
      container: this.add
        .container(x, y, [
          base,
          this.coffinClosedLid,
          this.coffinOpenedLid,
          highlight,
        ])
        .setDepth(2),
      highlight,
    };
  }

  private createBurialVesselVisual(
    x: number,
    y: number,
  ): {
    container: Phaser.GameObjects.Container;
    highlight: Phaser.GameObjects.Graphics;
  } {
    const base = this.add.graphics();
    base.fillStyle(0x78856f, 1);
    base.fillCircle(0, 0, 36);
    base.lineStyle(2, 0xb9c3a4, 0.98);
    base.strokeCircle(0, 0, 36);
    base.fillStyle(0x596456, 1);
    base.fillCircle(0, 0, 23);
    base.lineStyle(2, 0xa4ab91, 0.7);
    base.strokeCircle(0, 0, 23);
    base.lineBetween(-25, 0, -10, 0);
    base.lineBetween(10, 0, 25, 0);
    base.lineBetween(0, -25, 0, -10);
    base.lineBetween(0, 10, 0, 25);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xc2b58f, 0.7);
    highlight.strokeCircle(0, 0, 40);

    return {
      container: this.add.container(x, y, [base, highlight]).setDepth(2),
      highlight,
    };
  }

  private createBronzeMirrorVisual(
    x: number,
    y: number,
  ): {
    container: Phaser.GameObjects.Container;
    highlight: Phaser.GameObjects.Graphics;
  } {
    const base = this.add.graphics();
    base.fillStyle(0x667b72, 1);
    base.fillCircle(0, -7, 34);
    base.lineStyle(3, 0xb0c0b0, 0.98);
    base.strokeCircle(0, -7, 34);
    base.fillStyle(0x34413d, 1);
    base.fillCircle(0, -7, 25);
    base.lineStyle(2, 0x748078, 0.65);
    base.strokeCircle(0, -7, 25);
    base.fillStyle(0x748074, 1);
    base.fillRoundedRect(-13, 26, 26, 20, 4);
    base.lineStyle(2, 0x89988a, 0.8);
    base.strokeRoundedRect(-13, 26, 26, 20, 4);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xc2b58f, 0.7);
    highlight.strokeCircle(0, -7, 39);
    highlight.strokeRoundedRect(-17, 22, 34, 28, 5);

    return {
      container: this.add.container(x, y, [base, highlight]).setDepth(2),
      highlight,
    };
  }

  private createCompassVisual(
    x: number,
    y: number,
  ): {
    container: Phaser.GameObjects.Container;
    highlight: Phaser.GameObjects.Graphics;
  } {
    const base = this.add.graphics();
    base.fillStyle(0x978463, 1);
    base.fillCircle(0, 0, 26);
    base.lineStyle(3, 0xd2bf91, 0.98);
    base.strokeCircle(0, 0, 26);
    base.fillStyle(0x414e44, 1);
    base.fillCircle(0, 0, 18);
    base.lineStyle(1, 0x918d72, 0.85);
    base.strokeCircle(0, 0, 18);
    base.lineBetween(-16, 0, 16, 0);
    base.lineBetween(0, -16, 0, 16);
    base.fillStyle(0xb9aa82, 1);
    base.fillTriangle(0, -15, -4, 4, 4, 4);
    base.fillStyle(0x59645b, 1);
    base.fillTriangle(0, 15, -4, -4, 4, -4);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xc2b58f, 0.72);
    highlight.strokeCircle(0, 0, 31);

    const container = this.add.container(x, y, [base, highlight]).setDepth(2);
    container.setVisible(false);

    return { container, highlight };
  }

  private updateNearestInteraction(): void {
    if (!this.player) {
      return;
    }

    const candidates: InteractionTarget[] = [];

    for (const artifact of this.investigableObjects) {
      if (!artifact.isAvailable || artifact.locationState !== 'world') {
        continue;
      }

      const distance = artifact.distanceTo(this.player.x, this.player.y);
      if (distance <= artifact.interactionRadius) {
        candidates.push({
          kind: 'artifact',
          stableId: artifact.displaySpotId ?? artifact.id,
          distance,
          artifact,
        });
      }
    }

    if (!this.carrySystem.isEmpty()) {
      for (const spot of this.artifactSpots) {
        if (!spot.isEnabled || !spot.isEmpty) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          spot.worldX,
          spot.worldY,
        );
        if (distance <= spot.interactionRadius) {
          candidates.push({
            kind: 'empty-spot',
            stableId: spot.spotId,
            distance,
            spot,
          });
        }
      }
    }

    if (this.tutorialPhase === 'objective-complete') {
      const exitDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        ENTRANCE_X,
        ENTRANCE_Y,
      );
      if (exitDistance <= EXIT_INTERACTION_RADIUS) {
        candidates.push({
          kind: 'exit',
          stableId: 'tomb-exit',
          distance: exitDistance,
        });
      }
    }

    candidates.sort((left, right) => {
      if (left.kind === 'artifact' && right.kind === 'artifact') {
        const leftIsCoffin = left.artifact.id === 'sealed-coffin';
        const rightIsCoffin = right.artifact.id === 'sealed-coffin';
        if (leftIsCoffin !== rightIsCoffin) {
          return leftIsCoffin ? 1 : -1;
        }
      }

      const distanceDifference = left.distance - right.distance;
      if (Math.abs(distanceDifference) > DISTANCE_TIE_EPSILON) {
        return distanceDifference;
      }

      return left.stableId.localeCompare(right.stableId);
    });

    this.nearbyInteraction = candidates[0];
    this.updateInteractionPrompt();
  }

  private updateInteractionPrompt(): void {
    for (const artifact of this.investigableObjects) {
      artifact.setNearby(
        this.nearbyInteraction?.kind === 'artifact' &&
          this.nearbyInteraction.artifact === artifact,
      );
    }

    for (const spot of this.artifactSpots) {
      spot.promptObject.setVisible(
        this.nearbyInteraction?.kind === 'empty-spot' &&
          this.nearbyInteraction.spot === spot &&
          !this.activeInvestigation,
      );
    }

    this.exitPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'exit' &&
        !this.activeInvestigation &&
        this.tutorialPhase === 'objective-complete',
    );
  }

  private createInvestigationPanel(): void {
    const { width, height } = this.scale;
    const panelWidth = 940;
    const panelHeight = 430;

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x17130f, 0.96)
      .setStrokeStyle(2, 0xb1a47f, 0.9);

    this.panelEnglishName = this.add
      .text(-430, -184, '', {
        fontFamily: SERIF_FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#eee4c9',
      })
      .setOrigin(0, 0.5);

    this.panelChineseName = this.add
      .text(-430, -150, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#9da38b',
      })
      .setOrigin(0, 0.5);

    this.panelDescription = this.add
      .text(-430, -124, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#d1c8b3',
        wordWrap: { width: 860 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.panelChineseDescription = this.add
      .text(-430, -78, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#9d9481',
        wordWrap: { width: 860 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);

    this.panelAppraisalTitle = this.add
      .text(-430, -34, 'APPRAISAL / 鉴定线索', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#998e74',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);

    this.panelAppraisalText = this.add
      .text(-430, -13, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#c8bea6',
        wordWrap: { width: 860 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.panelChineseAppraisalText = this.add
      .text(-430, 52, '', {
        fontFamily: SERIF_FONT,
        fontSize: '14px',
        color: '#928a79',
        wordWrap: { width: 860 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);

    this.panelCarryAction = this.add
      .text(-430, 142, '', {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ded4b7',
      })
      .setOrigin(0, 0.5);

    this.panelSwapDescription = this.add
      .text(-242, 132, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#a9a089',
        wordWrap: { width: 630 },
      })
      .setOrigin(0, 0);
    this.panelSwapChineseDescription = this.add
      .text(-242, 158, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#877f70',
        wordWrap: { width: 630 },
      })
      .setOrigin(0, 0);

    const closeHint = this.add
      .text(430, 195, 'E / ESC  CLOSE / 关闭', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#8f846e',
      })
      .setOrigin(1, 0.5);

    this.investigationPanel = this.add
      .container(width / 2, height - 225, [
        background,
        this.panelEnglishName,
        this.panelChineseName,
        this.panelDescription,
        this.panelChineseDescription,
        this.panelAppraisalTitle,
        this.panelAppraisalText,
        this.panelChineseAppraisalText,
        this.panelCarryAction,
        this.panelSwapDescription,
        this.panelSwapChineseDescription,
        closeHint,
      ])
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
  }

  private openInvestigation(investigableObject: InvestigableObject): void {
    if (
      this.activeInvestigation ||
      !this.player ||
      !this.investigationPanel ||
      !this.panelEnglishName ||
      !this.panelChineseName ||
      !this.panelDescription ||
      !this.panelChineseDescription ||
      !this.panelAppraisalTitle ||
      !this.panelAppraisalText ||
      !this.panelChineseAppraisalText ||
      !this.panelCarryAction ||
      !this.panelSwapDescription ||
      !this.panelSwapChineseDescription
    ) {
      return;
    }

    this.activeInvestigation = investigableObject;
    this.nearbyInteraction = undefined;
    this.player.setMovementEnabled(false);

    for (const object of this.investigableObjects) {
      object.setNearby(false);
    }
    for (const spot of this.artifactSpots) {
      spot.promptObject.setVisible(false);
    }
    investigableObject.beginInvestigation();

    this.panelEnglishName.setText(investigableObject.englishName);
    this.panelChineseName.setText(investigableObject.chineseName);
    this.panelDescription.setText(investigableObject.description);
    this.panelChineseDescription.setText(investigableObject.chineseDescription);
    this.updateAppraisalPanel(investigableObject);
    this.updatePanelCarryAction(investigableObject);
    this.investigationPanel.setVisible(true);
    this.instructionText?.setVisible(false);
    this.escapeHintText?.setVisible(false);
  }

  private updateAppraisalPanel(artifact: InvestigableObject): void {
    if (
      !this.panelAppraisalTitle ||
      !this.panelAppraisalText ||
      !this.panelChineseAppraisalText
    ) {
      return;
    }

    this.panelAppraisalTitle.setVisible(artifact.portable);
    this.panelAppraisalText
      .setText(artifact.portable ? artifact.appraisalText : '')
      .setVisible(artifact.portable);
    this.panelChineseAppraisalText
      .setText(artifact.portable ? artifact.chineseAppraisalText : '')
      .setVisible(artifact.portable);
  }

  private updatePanelCarryAction(artifact: InvestigableObject): void {
    if (
      !this.panelCarryAction ||
      !this.panelSwapDescription ||
      !this.panelSwapChineseDescription
    ) {
      return;
    }

    if (this.isSealedCoffin(artifact)) {
      this.panelCarryAction.setText('F  Open Coffin / 打开棺椁');
      this.panelSwapDescription.setText(
        'The seal is intact. Opening it cannot be undone.',
      );
      this.panelSwapChineseDescription.setText(
        '封印仍然完整。打开后无法复原。',
      );
      return;
    }

    if (!artifact.portable) {
      this.panelCarryAction.setText('');
      this.panelSwapDescription.setText('');
      this.panelSwapChineseDescription.setText('');
      return;
    }

    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    if (!carriedArtifact) {
      this.panelCarryAction.setText('F  Take / 拿取');
      this.panelSwapDescription.setText('');
      this.panelSwapChineseDescription.setText('');
      return;
    }

    this.panelCarryAction.setText('F  Swap / 交换');
    this.panelSwapDescription.setText(
      `Leave ${carriedArtifact.englishName} here and take ${artifact.englishName}.`,
    );
    this.panelSwapChineseDescription.setText(
      `把${carriedArtifact.chineseName}留在这里，拿走${artifact.chineseName}。`,
    );
  }

  private closeInvestigation(): void {
    if (!this.activeInvestigation || !this.player || !this.investigationPanel) {
      return;
    }

    this.activeInvestigation.endInvestigation();
    this.activeInvestigation = undefined;
    this.player.setMovementEnabled(true);
    this.investigationPanel.setVisible(false);
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.updateNearestInteraction();
  }

  private openDepartureConfirmation(): void {
    if (
      this.tutorialPhase !== 'objective-complete' ||
      !this.player ||
      !this.departurePanel ||
      !this.departureCarriedEnglish ||
      !this.departureCarriedChinese
    ) {
      return;
    }

    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    this.tutorialPhase = 'departure-confirmation';
    this.nearbyInteraction = undefined;
    this.player.setMovementEnabled(false);
    this.updateInteractionPrompt();
    this.departureCarriedEnglish.setText(carriedArtifact?.englishName ?? 'EMPTY');
    this.departureCarriedChinese.setText(carriedArtifact?.chineseName ?? '空手');
    this.departurePanel.setVisible(true);
    this.instructionText?.setVisible(false);
    this.escapeHintText?.setVisible(false);
    this.hideShopkeeperMessage();
    this.cameras.main.resetFX();
  }

  private closeDepartureConfirmation(): void {
    if (this.tutorialPhase !== 'departure-confirmation' || !this.player) {
      return;
    }

    this.tutorialPhase = 'objective-complete';
    this.departurePanel?.setVisible(false);
    this.player.setMovementEnabled(true);
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.updateNearestInteraction();
  }

  private confirmDeparture(): void {
    if (this.tutorialPhase !== 'departure-confirmation') {
      return;
    }

    this.departureChoice = this.determineDepartureChoice();
    this.tutorialPhase = 'completed';
    this.stopWorldForCompletion();
    this.showDepartureResult(this.departureChoice);
  }

  private determineDepartureChoice(): DepartureChoice {
    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    if (
      carriedArtifact?.id === 'burial-vessel' ||
      carriedArtifact?.id === 'bronze-mirror' ||
      carriedArtifact?.id === 'geomancers-compass'
    ) {
      return carriedArtifact.id;
    }

    return 'empty';
  }

  private stopWorldForCompletion(): void {
    this.player?.setMovementEnabled(false);
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    this.departurePanel?.setVisible(false);
    this.investigationPanel?.setVisible(false);
    this.objectiveUI?.setVisible(false);
    this.carryUI?.setVisible(false);
    this.instructionText?.setVisible(false);
    this.escapeHintText?.setVisible(false);
    this.hideShopkeeperMessage();
    this.ambientOverlay?.setVisible(false);
    this.levelThreeShakeElapsed = 0;
    this.cameras.main.resetFX();
  }

  private showDepartureResult(choice: DepartureChoice): void {
    const result = DEPARTURE_RESULTS[choice];
    this.resultEnglishName?.setText(result.englishName);
    this.resultChineseName?.setText(result.chineseName);
    this.resultPanel?.setVisible(true);
  }

  private isSealedCoffin(artifact: InvestigableObject): boolean {
    return artifact.id === 'sealed-coffin' && this.coffinState === 'sealed';
  }

  private openCoffin(): void {
    if (
      this.coffinState !== 'sealed' ||
      this.activeInvestigation?.id !== 'sealed-coffin'
    ) {
      return;
    }

    this.coffinState = 'opened';
    this.tutorialPhase = 'coffin-opened';
    this.disturbanceSystem.registerAction('open-coffin', 2);
    this.coffinClosedLid?.setVisible(false);
    this.coffinOpenedLid?.setVisible(true);

    const coffin = this.investigableObjects.find(
      (artifact) => artifact.id === 'sealed-coffin',
    );
    if (coffin) {
      coffin.description =
        'The seal has been broken. Dust continues to fall from somewhere beneath the lid.';
      coffin.chineseDescription =
        '封印已经破损。棺盖下方某处仍不断落下灰尘。';
    }

    const compass = this.investigableObjects.find(
      (artifact) => artifact.id === 'geomancers-compass',
    );
    const coffinSpot = this.getArtifactSpot('coffin-interior');
    compass?.setAvailable(true);
    if (coffinSpot) {
      coffinSpot.isEnabled = true;
    }

    this.updateObjectiveUI(
      'Pick up the Geomancer’s Compass.',
      '拿起风水罗盘。',
    );
    this.playCoffinOpeningFeedback();
    this.closeInvestigation();
  }

  private playCoffinOpeningFeedback(): void {
    this.cameras.main.shake(100, 0.0015);

    const dust = this.add.graphics().setDepth(4);
    dust.fillStyle(0xaaa28c, 0.28);
    dust.fillCircle(ROOM_CENTER_X - 42, PROP_Y - 78, 5);
    dust.fillCircle(ROOM_CENTER_X - 16, PROP_Y - 104, 3);
    dust.fillCircle(ROOM_CENTER_X + 18, PROP_Y - 92, 4);
    dust.fillCircle(ROOM_CENTER_X + 46, PROP_Y - 64, 3);
    dust.fillCircle(ROOM_CENTER_X + 4, PROP_Y - 50, 2);

    this.tweens.add({
      targets: dust,
      alpha: 0,
      y: -8,
      duration: 650,
      ease: 'Sine.Out',
      onComplete: () => dust.destroy(),
    });
  }

  private takeOrSwapActiveArtifact(): void {
    const artifact = this.activeInvestigation;
    if (!artifact?.portable || !artifact.displaySpotId) {
      return;
    }

    const spot = this.getArtifactSpot(artifact.displaySpotId);
    if (!spot || spot.artifactId !== artifact.id) {
      return;
    }

    if (this.carrySystem.isEmpty()) {
      this.takeArtifact(artifact, spot);
      return;
    }

    this.swapArtifact(artifact, spot);
  }

  private takeArtifact(artifact: InvestigableObject, spot: ArtifactSpot): void {
    if (!this.carrySystem.takeArtifact(artifact)) {
      return;
    }

    this.registerArtifactDisturbance(artifact, spot);
    this.registerCompassRetrieved(artifact);
    spot.artifactId = null;
    spot.isEmpty = true;
    artifact.setCarried();
    this.setArtifactCollisionEnabled(artifact, false);
    this.resetCarriedExposure(artifact.id);
    this.updateCarryUI();
    this.closeInvestigation();
  }

  private swapArtifact(artifactAtSpot: InvestigableObject, spot: ArtifactSpot): void {
    const carriedArtifact = this.carrySystem.removeCarriedArtifact();
    if (!carriedArtifact) {
      return;
    }

    this.registerArtifactDisturbance(artifactAtSpot, spot);
    this.registerCompassRetrieved(artifactAtSpot);
    artifactAtSpot.setCarried();
    this.setArtifactCollisionEnabled(artifactAtSpot, false);

    spot.artifactId = carriedArtifact.id;
    spot.isEmpty = false;
    carriedArtifact.moveToWorldSpot(spot.worldX, spot.worldY, spot.spotId);
    this.setArtifactCollisionEnabled(carriedArtifact, true);
    this.carrySystem.takeArtifact(artifactAtSpot);

    this.resetCarriedExposure(artifactAtSpot.id);
    this.updateCarryUI();
    this.closeInvestigation();
  }

  private placeCarriedArtifact(spot: ArtifactSpot): void {
    if (!spot.isEnabled || !spot.isEmpty || spot.artifactId !== null) {
      return;
    }

    const carriedArtifact = this.carrySystem.removeCarriedArtifact();
    if (!carriedArtifact) {
      return;
    }

    spot.artifactId = carriedArtifact.id;
    spot.isEmpty = false;
    carriedArtifact.moveToWorldSpot(spot.worldX, spot.worldY, spot.spotId);
    this.setArtifactCollisionEnabled(carriedArtifact, true);
    this.resetCarriedExposure(null);
    this.updateCarryUI();
    this.nearbyInteraction = undefined;
    this.updateNearestInteraction();
  }

  private registerCompassRetrieved(artifact: InvestigableObject): void {
    if (artifact.id !== 'geomancers-compass' || this.compassHasBeenRetrieved) {
      return;
    }

    this.compassHasBeenRetrieved = true;
    this.tutorialPhase = 'objective-complete';
    this.updateObjectiveUI('Return to the entrance.', '返回入口。');
    this.releaseEntrance();
    this.showShopkeeperMessage(
      'released',
      'There it is. The passage is open. What you bring back is your choice.',
      '就是它。通道已经打开。最后带什么回来，由你自己选择。',
    );
  }

  private registerArtifactDisturbance(
    artifact: InvestigableObject,
    spot: ArtifactSpot,
  ): void {
    if (
      artifact.hasBeenDisturbed ||
      artifact.originalSpotId === null ||
      spot.spotId !== artifact.originalSpotId
    ) {
      return;
    }

    const registered = this.disturbanceSystem.registerArtifact(artifact.id, 1);
    if (!registered) {
      return;
    }

    artifact.hasBeenDisturbed = true;
    if (artifact.id === 'geomancers-compass') {
      this.compassFeedbackSeconds = 1;
    }
  }

  private resetCarriedExposure(artifactId: string | null): void {
    this.exposureArtifactId = artifactId;
    this.carriedExposureSeconds = 0;
    this.levelThreeShakeElapsed = 0;
  }

  private getArtifactSpot(spotId: string): ArtifactSpot | undefined {
    return this.artifactSpots.find((spot) => spot.spotId === spotId);
  }

  private setArtifactCollisionEnabled(
    artifact: InvestigableObject,
    enabled: boolean,
  ): void {
    const collisionObject = this.artifactCollisions.get(artifact.id);
    const physicsBody = collisionObject?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (!collisionObject || !physicsBody) {
      return;
    }

    const shouldEnable = enabled && artifact.displaySpotId !== 'coffin-interior';
    if (!shouldEnable) {
      physicsBody.enable = false;
      return;
    }

    collisionObject.setPosition(artifact.worldX, artifact.worldY);
    physicsBody.enable = true;
    physicsBody.updateFromGameObject();
  }

  private createCollisionObstacles(): Phaser.Physics.Arcade.StaticGroup {
    const obstacles = this.physics.add.staticGroup();
    const entranceX = ROOM_CENTER_X - ENTRANCE_WIDTH / 2;
    const interiorWallHeight = ROOM_HEIGHT - WALL_THICKNESS * 2;
    const southWallY = ROOM_Y + ROOM_HEIGHT - WALL_THICKNESS;
    const leftSouthWallWidth = entranceX - ROOM_X;
    const rightSouthWallWidth = ROOM_X + ROOM_WIDTH - entranceX - ENTRANCE_WIDTH;

    this.addStaticObstacle(
      obstacles,
      ROOM_CENTER_X,
      ROOM_Y + WALL_THICKNESS / 2,
      ROOM_WIDTH,
      WALL_THICKNESS,
    );
    this.addStaticObstacle(
      obstacles,
      ROOM_X + WALL_THICKNESS / 2,
      ROOM_Y + WALL_THICKNESS + interiorWallHeight / 2,
      WALL_THICKNESS,
      interiorWallHeight,
    );
    this.addStaticObstacle(
      obstacles,
      ROOM_X + ROOM_WIDTH - WALL_THICKNESS / 2,
      ROOM_Y + WALL_THICKNESS + interiorWallHeight / 2,
      WALL_THICKNESS,
      interiorWallHeight,
    );
    this.addStaticObstacle(
      obstacles,
      ROOM_X + leftSouthWallWidth / 2,
      southWallY + WALL_THICKNESS / 2,
      leftSouthWallWidth,
      WALL_THICKNESS,
    );
    this.addStaticObstacle(
      obstacles,
      entranceX + ENTRANCE_WIDTH + rightSouthWallWidth / 2,
      southWallY + WALL_THICKNESS / 2,
      rightSouthWallWidth,
      WALL_THICKNESS,
    );

    this.addStaticObstacle(obstacles, ROOM_CENTER_X, PROP_Y, 128, 192);
    this.artifactCollisions.set(
      'burial-vessel',
      this.addStaticObstacle(obstacles, LEFT_PROP_X, PROP_Y, 76, 76),
    );
    this.artifactCollisions.set(
      'bronze-mirror',
      this.addStaticObstacle(obstacles, RIGHT_PROP_X, PROP_Y, 72, 88),
    );
    const compassCollision = this.addStaticObstacle(
      obstacles,
      COMPASS_X,
      COMPASS_Y,
      48,
      48,
    );
    this.artifactCollisions.set('geomancers-compass', compassCollision);
    const compassBody = compassCollision.body as Phaser.Physics.Arcade.StaticBody;
    compassBody.enable = false;

    return obstacles;
  }

  private addStaticObstacle(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    const obstacle = this.add.rectangle(x, y, width, height, 0x000000, 0);
    group.add(obstacle);
    return obstacle;
  }
}
