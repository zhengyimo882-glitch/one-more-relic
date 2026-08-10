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
import { TOMB_FEEL } from '../config/tombFeelConfig';
import { DirectionalLampSystem } from '../systems/DirectionalLampSystem';
import {
  DelayedFootstepSystem,
  type FootstepEmission,
} from '../systems/DelayedFootstepSystem';
import { ProceduralTombAudioSystem } from '../systems/ProceduralTombAudioSystem';
import {
  TombEncounterSystem,
  type TombEncounterTransition,
} from '../systems/TombEncounterSystem';
import { WallShadowSystem } from '../systems/WallShadowSystem';
import {
  FootstepRippleSystem,
  type RippleAllowedArea,
} from '../systems/FootstepRippleSystem';
import { preloadPlayerAvatarAssets } from '../visuals/createPlayerAvatarVisual';
import {
  createParchmentPanel,
  preloadParchmentPanel,
} from '../visuals/createParchmentPanel';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 960;
const GRID_SIZE = 32;
const PIXEL_SCALE = 2;
const WALL_THICKNESS = GRID_SIZE;
const ENTRANCE_WIDTH = GRID_SIZE * 3;
const ROOM_CENTER_X = WORLD_WIDTH / 2;
const COFFIN_X = ROOM_CENTER_X;
const COFFIN_Y = 145;
const PROP_Y = 514;
const RIGHT_PROP_X = 1240;
const OFFERING_CORRECT_SLOT_ID = 'offering-correct-spot';
const OFFERING_EMPTY_SLOT_ID = 'offering-empty-spot';
const OFFERING_CORRECT_X = 684;
const OFFERING_CORRECT_Y = 514;
const OFFERING_EMPTY_X = 916;
const OFFERING_EMPTY_Y = 514;
const OFFERING_NORTH_X = 800;
const OFFERING_NORTH_Y = 424;
const OFFERING_SOUTH_X = 800;
const OFFERING_SOUTH_Y = 574;
const COMPASS_X = COFFIN_X;
const COMPASS_Y = COFFIN_Y;
const ENTRANCE_X = ROOM_CENTER_X;
const ENTRANCE_Y = 944;
const EXIT_INTERACTION_RADIUS = 118;
const DISTANCE_TIE_EPSILON = 0.5;
const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;
const TOMB_ASSET_ROOT = 'assets/imported/tomb_asset_pack';
const GENERATED_TOMB_ASSET_ROOT = 'assets/generated/tomb_vertical_slice';
const SCENERY_DEPTH_BASE = 2;
const PLAYER_DEPTH_BASE = 2;
const CANDLE_FRAME_RATE = 7;
const TORCH_FRAME_RATE = 9;
const SPIKE_FRAME_RATE = 6;

type TombRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TombTextureFrame = TombRect & {
  name: string;
};

const MAIN_TEXTURE_FRAMES: TombTextureFrame[] = [
  { name: 'floor-a', x: 736, y: 208, width: 16, height: 16 },
  { name: 'floor-b', x: 752, y: 208, width: 16, height: 16 },
  { name: 'floor-cracked', x: 784, y: 208, width: 16, height: 16 },
  { name: 'wall-brick-a', x: 288, y: 272, width: 16, height: 16 },
  { name: 'wall-brick-b', x: 304, y: 272, width: 16, height: 16 },
  { name: 'gate-bars', x: 496, y: 48, width: 128, height: 64 },
];

const DECORATIVE_TEXTURE_FRAMES: TombTextureFrame[] = [
  { name: 'coffin-closed', x: 0, y: 64, width: 48, height: 32 },
  { name: 'coffin-open', x: 0, y: 128, width: 48, height: 32 },
  { name: 'coffin-plain', x: 0, y: 96, width: 48, height: 32 },
  { name: 'pillar-a', x: 0, y: 16, width: 16, height: 48 },
  { name: 'pillar-b', x: 16, y: 16, width: 16, height: 48 },
  { name: 'ritual-idol', x: 32, y: 16, width: 16, height: 16 },
  { name: 'stone-slab', x: 80, y: 64, width: 24, height: 32 },
  { name: 'burial-rack', x: 128, y: 64, width: 32, height: 48 },
  { name: 'urn-purple', x: 144, y: 128, width: 16, height: 16 },
  { name: 'urn-green', x: 144, y: 176, width: 16, height: 16 },
];

const BURIAL_CHAMBER: TombRect = { x: 610, y: 20, width: 380, height: 300 };
const CENTRAL_CHAMBER: TombRect = { x: 520, y: 350, width: 560, height: 280 };
const WEST_CHAMBER: TombRect = { x: 190, y: 410, width: 330, height: 210 };
const EAST_CHAMBER: TombRect = { x: 1080, y: 410, width: 330, height: 210 };
const SOUTH_CHAMBER: TombRect = { x: 640, y: 620, width: 320, height: 180 };

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
    originalSpotId: OFFERING_CORRECT_SLOT_ID,
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
  private encounterSystem = new TombEncounterSystem(OFFERING_CORRECT_SLOT_ID);
  private directionalLamp?: DirectionalLampSystem;
  private delayedFootsteps?: DelayedFootstepSystem;
  private proceduralAudio?: ProceduralTombAudioSystem;
  private wallShadow?: WallShadowSystem;
  private footstepRipples?: FootstepRippleSystem;
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
  private entranceGateVisual?: Phaser.GameObjects.Image;
  private entranceGateCollision?: Phaser.GameObjects.Rectangle;
  private entranceSealTimer?: Phaser.Time.TimerEvent;
  private entranceGateTween?: Phaser.Tweens.Tween;
  private exitPrompt?: Phaser.GameObjects.Container;
  private coffinClosedLid?: Phaser.GameObjects.Image;
  private coffinOpenedLid?: Phaser.GameObjects.Image;
  private ambientOverlay?: Phaser.GameObjects.Graphics;
  private interactionKey?: Phaser.Input.Keyboard.Key;
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
  private readonly shownShopkeeperMessages = new Set<
    'sealed' | 'remembering' | 'released' | 'provoked'
  >();
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
  private previousCanvasImageRendering = '';
  private animatedFlames: Phaser.GameObjects.Sprite[] = [];
  private encounterTimers: Phaser.Time.TimerEvent[] = [];
  private flameTimers: Phaser.Time.TimerEvent[] = [];
  private lampHintText?: Phaser.GameObjects.Text;
  private debugEnabled = false;
  private debugText?: Phaser.GameObjects.Text;
  private debugPath?: Phaser.GameObjects.Graphics;
  private debugKeys?: {
    toggle: Phaser.Input.Keyboard.Key;
    reset: Phaser.Input.Keyboard.Key;
    offeringRoom: Phaser.Input.Keyboard.Key;
    corridor: Phaser.Input.Keyboard.Key;
  };
  private readonly encounterTransitionHandler = (
    transition: TombEncounterTransition,
  ): void => this.handleEncounterTransition(transition);
  private readonly rippleVisibilityResolver = (worldX: number, worldY: number): boolean =>
    this.directionalLamp?.isWorldPointVisible(worldX, worldY) ?? false;

  constructor() {
    super('TombScene');
  }

  preload(): void {
    preloadPlayerAvatarAssets(this);
    preloadParchmentPanel(this);
    this.load.spritesheet(
      'generated-tomb-ghost',
      `${GENERATED_TOMB_ASSET_ROOT}/tomb_ghost_sheet.png`,
      { frameWidth: 512, frameHeight: 512 },
    );
    this.load.spritesheet(
      'generated-wall-shadow',
      `${GENERATED_TOMB_ASSET_ROOT}/wall_shadow_sheet.png`,
      { frameWidth: 512, frameHeight: 512 },
    );
    this.load.image('tomb-main-sheet', `${TOMB_ASSET_ROOT}/mainlevbuild.png`);
    this.load.image('tomb-decorative-sheet', `${TOMB_ASSET_ROOT}/decorative.png`);

    for (let frame = 1; frame <= 4; frame += 1) {
      const paddedFrame = frame.toString().padStart(2, '0');
      this.load.image(
        `tomb-candle-a-${frame}`,
        `${TOMB_ASSET_ROOT}/candleA_${paddedFrame}.png`,
      );
      this.load.image(
        `tomb-candle-b-${frame}`,
        `${TOMB_ASSET_ROOT}/candleB_${paddedFrame}.png`,
      );
      this.load.image(`tomb-torch-${frame}`, `${TOMB_ASSET_ROOT}/torch_${frame}.png`);
    }

    for (let frame = 0; frame <= 4; frame += 1) {
      this.load.image(`tomb-spike-${frame}`, `${TOMB_ASSET_ROOT}/spike_${frame}.png`);
    }
  }

  init(data?: TombSceneData): void {
    this.incomingAppearanceId = isPlayerAppearanceId(data?.appearanceId)
      ? data.appearanceId
      : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  private registerTombTextures(): void {
    this.addTextureFrames('tomb-main-sheet', MAIN_TEXTURE_FRAMES);
    this.addTextureFrames('tomb-decorative-sheet', DECORATIVE_TEXTURE_FRAMES);

    const textureKeys = [
      'tomb-main-sheet',
      'tomb-decorative-sheet',
      ...Array.from({ length: 4 }, (_, index) => `tomb-candle-a-${index + 1}`),
      ...Array.from({ length: 4 }, (_, index) => `tomb-candle-b-${index + 1}`),
      ...Array.from({ length: 4 }, (_, index) => `tomb-torch-${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `tomb-spike-${index}`),
    ];

    for (const textureKey of textureKeys) {
      this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.textures
      .get('generated-tomb-ghost')
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures
      .get('generated-wall-shadow')
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  private addTextureFrames(textureKey: string, frames: TombTextureFrame[]): void {
    const texture = this.textures.get(textureKey);
    for (const frame of frames) {
      if (!texture.has(frame.name)) {
        texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
      }
    }
  }

  private registerTombAnimations(): void {
    const createLoop = (key: string, texturePrefix: string, firstFrame: number, lastFrame: number, frameRate: number): void => {
      if (this.anims.exists(key)) {
        return;
      }

      this.anims.create({
        key,
        frames: Array.from({ length: lastFrame - firstFrame + 1 }, (_, index) => ({
          key: `${texturePrefix}-${firstFrame + index}`,
        })),
        frameRate,
        repeat: -1,
      });
    };

    createLoop('tomb-candle-a-loop', 'tomb-candle-a', 1, 4, CANDLE_FRAME_RATE);
    createLoop('tomb-candle-b-loop', 'tomb-candle-b', 1, 4, CANDLE_FRAME_RATE);
    createLoop('tomb-torch-loop', 'tomb-torch', 1, 4, TORCH_FRAME_RATE);
    createLoop('tomb-spike-loop', 'tomb-spike', 0, 4, SPIKE_FRAME_RATE);
  }

  create(): void {
    this.registerTombTextures();
    this.registerTombAnimations();
    this.previousCanvasImageRendering = this.game.canvas.style.imageRendering;
    this.game.canvas.style.imageRendering = 'pixelated';
    this.resetTombState();
    this.investigableObjects = [];
    this.artifactSpots = [];
    this.nearbyInteraction = undefined;
    this.activeInvestigation = undefined;
    this.carrySystem = new CarrySystem();
    this.disturbanceSystem = new TombDisturbanceSystem();
    this.encounterSystem = new TombEncounterSystem(OFFERING_CORRECT_SLOT_ID);
    this.artifactCollisions = new Map<string, Phaser.GameObjects.Rectangle>();

    this.cameras.main.setBackgroundColor('#151915');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'tomb',
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      playerLightEnabled: false,
    });
    this.drawTombGreybox();
    this.artifactSpots = this.createArtifactSpots();
    this.investigableObjects = this.createInvestigableObjects();
    const obstacles = this.createCollisionObstacles();
    this.createEntranceGate(obstacles);
    this.player = this.createPlayer();
    this.physics.add.collider(this.player, obstacles);

    this.configureCamera();
    this.proceduralAudio = new ProceduralTombAudioSystem();
    this.directionalLamp = new DirectionalLampSystem(
      this,
      this.getTombWallSegments(),
    );
    this.wallShadow = new WallShadowSystem(this, 846, 806);
    this.footstepRipples = new FootstepRippleSystem(
      this,
      this.getRippleAllowedAreas(),
    );
    this.delayedFootsteps = new DelayedFootstepSystem((emission) => {
      this.emitFootstep(emission);
    });
    this.encounterSystem.reset(OFFERING_CORRECT_X, OFFERING_CORRECT_Y);
    this.encounterSystem.on('statechange', this.encounterTransitionHandler);
    this.createAmbientFeedback();
    this.createInterface();
    this.registerInput();
    this.createDebugTools();
    this.startArrivalIntroduction();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupTombScene, this);
  }

  update(time: number, delta: number): void {
    if (
      !this.player ||
      !this.interactionKey ||
      !this.escapeKey ||
      !this.enterKey
    ) {
      return;
    }

    const interactionPressed = Phaser.Input.Keyboard.JustDown(this.interactionKey);
    const escapePressed = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey);
    this.atmosphere?.update(this.player.x, this.player.y, time);
    const deltaSeconds = delta / 1000;
    const lampToggled = this.directionalLamp?.update(
      this.player.x,
      this.player.y,
      deltaSeconds,
    ) ?? false;
    if (lampToggled) {
      this.proceduralAudio?.ensureStarted();
      this.proceduralAudio?.playCue(
        this.directionalLamp?.isOn() ? 'lamp-on' : 'lamp-off',
      );
      this.updateLampHint();
    }
    const lampAngle = this.directionalLamp?.getAngleRadians() ?? -Math.PI / 2;
    this.player.setAimAngle(lampAngle);
    this.wallShadow?.setLightOn(this.directionalLamp?.isOn() ?? true);
    const apparitionPosition = this.wallShadow?.getWorldPosition();
    this.wallShadow?.update(
      deltaSeconds,
      apparitionPosition
        ? this.directionalLamp?.isWorldPointVisible(
            apparitionPosition.x,
            apparitionPosition.y,
          ) ?? false
        : false,
      this.player.x,
      this.player.y,
    );
    this.footstepRipples?.update(deltaSeconds, this.rippleVisibilityResolver);

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
      if (interactionPressed) {
        this.confirmDeparture();
        return;
      }

      if (escapePressed) {
        this.closeDepartureConfirmation();
      }
      return;
    }

    this.updateCarriedExposure(deltaSeconds);
    this.updateAmbientFeedback(time, deltaSeconds);
    this.updateEncounterSystems(time, delta);
    this.updateDebugTools();

    if (this.activeInvestigation) {
      if (escapePressed) {
        this.closeInvestigation();
        return;
      }

      if (interactionPressed) {
        if (this.isSealedCoffin(this.activeInvestigation)) {
          this.openCoffin();
          return;
        }

        if (this.activeInvestigation.portable) {
          this.takeOrSwapActiveArtifact();
          return;
        }

        this.closeInvestigation();
      }
      return;
    }

    this.player.update();
    this.player.setAimAngle(lampAngle);
    this.player.setDepth(PLAYER_DEPTH_BASE + this.player.y / 1000);
    this.encounterSystem.updatePlayerPosition(this.player.x, this.player.y);
    this.updateNearestInteraction();

    if (escapePressed && this.shopkeeperMessage?.visible) {
      this.hideShopkeeperMessage();
      this.instructionText?.setVisible(true);
      this.escapeHintText?.setVisible(true);
      return;
    }

    if (escapePressed) {
      this.scene.start('MainMenuScene');
      return;
    }

    if (interactionPressed && this.nearbyInteraction) {
      if (this.nearbyInteraction.kind === 'artifact') {
        this.interactWithArtifact(this.nearbyInteraction.artifact);
        return;
      }
      if (this.nearbyInteraction.kind === 'empty-spot') {
        this.placeCarriedArtifact(this.nearbyInteraction.spot);
        return;
      }
      this.openDepartureConfirmation();
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
    this.animatedFlames = [];
    this.encounterTimers = [];
    this.flameTimers = [];
    this.debugEnabled = false;
    this.shownShopkeeperMessages.clear();
    this.disturbanceSystem.reset();
    this.encounterSystem.reset(OFFERING_CORRECT_X, OFFERING_CORRECT_Y);
    this.cameras.main.resetFX();
  }

  private createPlayer(): Player {
    // The player begins inside the south entrance and initially faces north.
    return new Player(
      this,
      ROOM_CENTER_X,
      872,
      this.appearanceId,
    );
  }

  private createEntranceGate(obstacles: Phaser.Physics.Arcade.StaticGroup): void {
    this.entranceGateVisual = this.add
      .image(ENTRANCE_X, ENTRANCE_Y + WALL_THICKNESS, 'tomb-main-sheet', 'gate-bars')
      .setOrigin(0.5, 0.5)
      .setDepth(3.15)
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
      .setDepth(8)
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
    const background = createParchmentPanel(this, 1120, 144);
    const title = this.add.text(-520, -51, 'ARRIVAL', {
      fontFamily: SANS_FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#4f2415',
      letterSpacing: 1,
    });
    const chineseTitle = this.add.text(-520, -34, '抵达', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#332016',
    });
    this.arrivalEnglishText = this.add.text(-520, -10, '', {
      fontFamily: SERIF_FONT,
      fontSize: '16px',
      color: '#1e1109',
      lineSpacing: 2,
      wordWrap: { width: 850 },
    });
    this.arrivalChineseText = this.add.text(-520, 31, '', {
      fontFamily: SERIF_FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#24140b',
      lineSpacing: 2,
      wordWrap: { width: 820 },
    });
    const continueText = this.add
      .text(470, 52, 'E / ENTER  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#2f1d11',
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
      'Enter the offering chamber. Notice what breaks the pattern.',
      '进入供物室，观察阵列中不协调的位置。',
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
    this.updateObjectiveUI(
      'Disturb the offering that breaks the pattern.',
      '移动那件破坏供物阵列规律的器物。',
    );
    this.showShopkeeperMessage(
      'sealed',
      'The entrance is sealed. The old arrangement is the lock. Look before you touch.',
      '入口已经封上了。墓里的旧摆法就是锁。动手之前，先看清楚。',
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
    this.game.canvas.style.imageRendering = this.previousCanvasImageRendering;
    this.encounterTimers.forEach((timer) => timer.remove(false));
    this.encounterTimers = [];
    this.flameTimers.forEach((timer) => timer.remove(false));
    this.flameTimers = [];
    this.encounterSystem.off('statechange', this.encounterTransitionHandler);
    this.delayedFootsteps?.reset();
    this.footstepRipples?.destroy();
    this.directionalLamp?.destroy();
    this.proceduralAudio?.destroy();
    this.wallShadow?.destroy();
    this.input.keyboard?.off('keydown', this.ensureAudioStarted, this);
  }

  private configureCamera(): void {
    if (!this.player) {
      return;
    }

    this.cameras.main.setBounds(160, 0, 1280, WORLD_HEIGHT);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(
      this.player,
      true,
      TOMB_FEEL.camera.followLerpX,
      TOMB_FEEL.camera.followLerpY,
    );
    this.cameras.main.setDeadzone(
      TOMB_FEEL.camera.deadzoneWidth,
      TOMB_FEEL.camera.deadzoneHeight,
    );
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
    const encounterState = this.encounterSystem.getState();
    if (encounterState === 'Dormant' || encounterState === 'Appeased') {
      this.currentOmenLevel = 0;
      this.levelThreeShakeElapsed = 0;
      this.ambientOverlay.setVisible(false);
      return;
    }
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
      .text(
        width / 2,
        height - 44,
        'WASD  Move / 移动     MOUSE  Aim / 瞄准     E  Interact / 互动',
        {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#b0a187',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.lampHintText = this.add
      .text(width - 32, height - 44, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#d4ba84',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.updateLampHint();

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
      .rectangle(0, 0, 370, 150, 0x1b1814, 0.92)
      .setStrokeStyle(1, 0xb29f7b, 0.88);
    const title = this.add
      .text(-167, -64, 'OBJECTIVE', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a99d7e',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-167, -47, '当前目标', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#aaa18f',
      })
      .setOrigin(0, 0.5);
    this.objectiveText = this.add
      .text(-167, -25, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#e1d7bc',
        lineSpacing: -2,
        wordWrap: { width: 334 },
      })
      .setOrigin(0, 0);
    this.objectiveChineseText = this.add
      .text(-167, 32, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#bbb3a1',
        wordWrap: { width: 334 },
      })
      .setOrigin(0, 0);

    this.objectiveUI = this.add
      .container(205, 182, [
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
    if (this.objectiveText && this.objectiveChineseText) {
      this.objectiveChineseText.setY(
        Math.max(30, this.objectiveText.y + this.objectiveText.displayHeight + 5),
      );
    }
    this.objectiveUI?.setVisible(true);
  }

  private createShopkeeperMessage(): void {
    const { width, height } = this.scale;
    const background = createParchmentPanel(this, 920, 144);
    const title = this.add
      .text(-424, -45, 'SHOPKEEPER', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#4f2415',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-326, -45, '古玩店老板', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: '#332016',
      })
      .setOrigin(0, 0.5);
    this.shopkeeperMessageText = this.add
      .text(-424, -25, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: '#1e1109',
        wordWrap: { width: 848 },
      })
      .setOrigin(0, 0);
    this.shopkeeperChineseMessageText = this.add
      .text(-424, 18, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#24140b',
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
    messageId: 'sealed' | 'remembering' | 'released' | 'provoked',
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
      .text(-336, 162, 'E  LEAVE / 确认离开', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ded4b7',
      })
      .setOrigin(0, 0.5);
    const cancelHint = this.add
      .text(336, 162, 'ESC  STAY / 暂不离开', {
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
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    keyboard.on('keydown', this.ensureAudioStarted, this);
  }

  private drawTombGreybox(): void {
    this.createFloor();
    this.createTiledFloor();
    this.createFloorDetails();
    this.createWalls();
    this.createTiledWalls();
    this.createChamberProps();
  }

  private createFloor(): void {
    const floor = this.add.graphics().setDepth(0);
    floor.fillStyle(0x50564d, 1);

    for (const room of [
      BURIAL_CHAMBER,
      CENTRAL_CHAMBER,
      WEST_CHAMBER,
      EAST_CHAMBER,
      SOUTH_CHAMBER,
    ]) {
      floor.fillRect(
        room.x + WALL_THICKNESS,
        room.y + WALL_THICKNESS,
        room.width - WALL_THICKNESS * 2,
        room.height - WALL_THICKNESS * 2,
      );
    }

    // Doorways and passages join the five chambers into the cross-shaped tutorial route.
    floor.fillRect(744, 288, 112, 94);
    floor.fillRect(488, 464, 64, 80);
    floor.fillRect(1048, 464, 64, 80);
    floor.fillRect(744, 598, 112, 202);
    floor.fillRect(752, 768, 96, 176);
  }

  private createTiledFloor(): void {
    const floorAreas: TombRect[] = [
      ...[
        BURIAL_CHAMBER,
        CENTRAL_CHAMBER,
        WEST_CHAMBER,
        EAST_CHAMBER,
        SOUTH_CHAMBER,
      ].map((room) => ({
        x: room.x + WALL_THICKNESS,
        y: room.y + WALL_THICKNESS,
        width: room.width - WALL_THICKNESS * 2,
        height: room.height - WALL_THICKNESS * 2,
      })),
      { x: 744, y: 288, width: 112, height: 94 },
      { x: 488, y: 464, width: 64, height: 80 },
      { x: 1048, y: 464, width: 64, height: 80 },
      { x: 744, y: 598, width: 112, height: 202 },
      { x: 752, y: 768, width: 96, height: 176 },
    ];

    floorAreas.forEach((area, index) => {
      this.add
        .tileSprite(
          area.x,
          area.y,
          area.width,
          area.height,
          'tomb-main-sheet',
          index % 3 === 0 ? 'floor-b' : 'floor-a',
        )
        .setOrigin(0)
        .setTileScale(PIXEL_SCALE)
        .setTilePosition((index % 2) * 16, ((index + 1) % 2) * 16)
        .setDepth(0.2);
    });

    for (const [x, y] of [[666, 232], [934, 272], [574, 548], [1026, 408], [688, 730]]) {
      this.add
        .image(x, y, 'tomb-main-sheet', 'floor-cracked')
        .setScale(PIXEL_SCALE)
        .setDepth(0.28);
    }
  }

  private createFloorDetails(): void {
    const details = this.add.graphics().setDepth(0.5);

    details.lineStyle(1, 0x92988a, 0.22);
    for (const room of [
      BURIAL_CHAMBER,
      CENTRAL_CHAMBER,
      WEST_CHAMBER,
      EAST_CHAMBER,
      SOUTH_CHAMBER,
    ]) {
      const left = room.x + WALL_THICKNESS;
      const top = room.y + WALL_THICKNESS;
      const right = room.x + room.width - WALL_THICKNESS;
      const bottom = room.y + room.height - WALL_THICKNESS;
      for (let x = left; x <= right; x += GRID_SIZE) {
        details.lineBetween(x, top, x, bottom);
      }
      for (let y = top; y <= bottom; y += GRID_SIZE) {
        details.lineBetween(left, y, right, y);
      }
    }

    for (let y = 304; y <= ENTRANCE_Y; y += GRID_SIZE) {
      details.lineBetween(752, y, 848, y);
    }
    details.lineBetween(800, 288, 800, 382);
    details.lineBetween(800, 598, 800, ENTRANCE_Y);
    details.lineBetween(488, 504, 552, 504);
    details.lineBetween(1048, 504, 1112, 504);

    // Each chamber has its own floor language so its purpose reads at a glance.
    details.lineStyle(2, 0x9a8666, 0.34);
    details.strokeRoundedRect(706, 50, 188, 230, 6);
    details.strokeRoundedRect(716, 60, 168, 210, 4);
    details.strokeCircle(800, 492, 92);
    details.strokeCircle(800, 492, 68);
    details.lineBetween(732, 424, 868, 560);
    details.lineBetween(868, 424, 732, 560);
    details.strokeCircle(800, 704, 54);
    details.strokeCircle(800, 704, 30);

    details.lineStyle(2, 0x262a25, 0.35);
    details.lineBetween(274, 552, 296, 566);
    details.lineBetween(296, 566, 286, 584);
    details.lineBetween(1306, 456, 1288, 472);
    details.lineBetween(1288, 472, 1302, 486);
    details.lineBetween(690, 744, 708, 732);

    details.fillStyle(0x242820, 0.16);
    details.fillEllipse(286, 574, 82, 38);
    details.fillEllipse(1314, 468, 66, 34);
    details.fillStyle(0x242820, 0.12);
    details.fillRect(936, 556, GRID_SIZE, GRID_SIZE);

    details.lineStyle(1, VISUAL_THEME.colors.corpseGreen, 0.18);
    for (let index = 0; index < 24; index += 1) {
      const x = 224 + ((index * 173) % 1144);
      const y = 62 + ((index * 97) % 830);
      details.lineBetween(x, y, x + 18 + (index % 3) * 8, y + (index % 2) * 3);
    }

    details.fillStyle(VISUAL_THEME.colors.tombBlue, 0.1);
    details.fillEllipse(246, 470, 74, 30);
    details.fillEllipse(1360, 522, 54, 90);
    details.fillEllipse(686, 736, 82, 24);
    details.fillEllipse(940, 246, 58, 32);
  }

  private createWalls(): void {
    const wall = this.add.graphics().setDepth(1);
    const segments = this.getTombWallSegments();

    wall.fillStyle(0x323731, 1);
    for (const segment of segments) {
      wall.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    wall.lineStyle(2, 0x8f9989, 0.9);
    for (const segment of segments) {
      wall.strokeRect(segment.x + 1, segment.y + 1, segment.width - 2, segment.height - 2);
    }

    wall.lineStyle(1, VISUAL_THEME.colors.coldStone, 0.7);
    for (const segment of segments) {
      if (segment.width > segment.height) {
        for (let x = segment.x + 24; x < segment.x + segment.width - 18; x += 72) {
          wall.lineBetween(x, segment.y + 10, Math.min(x + 34, segment.x + segment.width - 8), segment.y + 10);
          wall.lineBetween(x + 18, segment.y + 23, Math.min(x + 52, segment.x + segment.width - 8), segment.y + 23);
        }
      } else {
        for (let y = segment.y + 24; y < segment.y + segment.height - 18; y += 64) {
          wall.lineBetween(segment.x + 9, y, segment.x + 23, Math.min(y + 22, segment.y + segment.height - 8));
        }
      }
    }

    wall.fillStyle(VISUAL_THEME.colors.corpseGreen, 0.13);
    wall.fillEllipse(676, 36, 118, 22);
    wall.fillEllipse(206, 526, 24, 112);
    wall.fillEllipse(1394, 486, 24, 92);
    wall.fillEllipse(924, 784, 66, 18);

    wall.lineStyle(3, 0xb19a72, 0.48);
    wall.lineBetween(744, 314, 856, 314);
    wall.lineBetween(498, 464, 498, 544);
    wall.lineBetween(1102, 464, 1102, 544);
    wall.lineBetween(744, 624, 856, 624);
    wall.lineBetween(752, 784, 848, 784);
  }

  private createTiledWalls(): void {
    this.getTombWallSegments().forEach((segment, index) => {
      this.add
        .tileSprite(
          segment.x,
          segment.y,
          segment.width,
          segment.height,
          'tomb-main-sheet',
          index % 2 === 0 ? 'wall-brick-a' : 'wall-brick-b',
        )
        .setOrigin(0)
        .setTileScale(PIXEL_SCALE)
        .setTilePosition((index % 3) * 8, 0)
        .setDepth(1.1);
    });
  }

  private getTombWallSegments(): TombRect[] {
    return [
      { x: 610, y: 20, width: 380, height: 32 },
      { x: 610, y: 20, width: 32, height: 300 },
      { x: 958, y: 20, width: 32, height: 300 },
      { x: 610, y: 288, width: 134, height: 32 },
      { x: 856, y: 288, width: 134, height: 32 },
      { x: 720, y: 288, width: 32, height: 94 },
      { x: 848, y: 288, width: 32, height: 94 },
      { x: 520, y: 350, width: 200, height: 32 },
      { x: 880, y: 350, width: 200, height: 32 },
      { x: 520, y: 350, width: 32, height: 114 },
      { x: 520, y: 544, width: 32, height: 86 },
      { x: 1048, y: 350, width: 32, height: 114 },
      { x: 1048, y: 544, width: 32, height: 86 },
      { x: 520, y: 598, width: 224, height: 32 },
      { x: 856, y: 598, width: 224, height: 32 },
      { x: 190, y: 410, width: 330, height: 32 },
      { x: 190, y: 410, width: 32, height: 210 },
      { x: 190, y: 588, width: 330, height: 32 },
      { x: 488, y: 410, width: 32, height: 54 },
      { x: 488, y: 544, width: 32, height: 76 },
      { x: 1080, y: 410, width: 330, height: 32 },
      { x: 1378, y: 410, width: 32, height: 210 },
      { x: 1080, y: 588, width: 330, height: 32 },
      { x: 1080, y: 410, width: 32, height: 54 },
      { x: 1080, y: 544, width: 32, height: 76 },
      { x: 640, y: 620, width: 104, height: 32 },
      { x: 856, y: 620, width: 104, height: 32 },
      { x: 640, y: 620, width: 32, height: 180 },
      { x: 928, y: 620, width: 32, height: 180 },
      { x: 640, y: 768, width: 112, height: 32 },
      { x: 848, y: 768, width: 112, height: 32 },
      { x: 720, y: 768, width: 32, height: 192 },
      { x: 848, y: 768, width: 32, height: 192 },
    ];
  }

  private getRippleAllowedAreas(): RippleAllowedArea[] {
    // Insets match the visible floor rather than the room's outer wall bounds.
    // Connecting strips keep a ripple continuous through open doorways while
    // preventing a complete ellipse from leaking into sealed rooms.
    return [
      { x: 642, y: 52, width: 316, height: 236 },
      { x: 752, y: 288, width: 96, height: 94 },
      { x: 552, y: 382, width: 496, height: 216 },
      { x: 222, y: 442, width: 266, height: 146 },
      { x: 488, y: 464, width: 64, height: 80 },
      { x: 1080, y: 464, width: 32, height: 80 },
      { x: 1112, y: 442, width: 266, height: 146 },
      { x: 672, y: 652, width: 256, height: 116 },
      { x: 752, y: 768, width: 96, height: 192 },
    ];
  }

  private createChamberProps(): void {
    // Main coffin chamber: tall funerary columns and a restrained ring of grave goods.
    this.createTombProp(680, 154, 'pillar-a');
    this.createTombProp(920, 154, 'pillar-b');
    this.createTombProp(680, 258, 'urn-green');
    this.createTombProp(920, 258, 'urn-purple');
    this.createTombProp(734, 98, 'stone-slab');
    this.createTombProp(866, 98, 'stone-slab');

    // Central antechamber: four stable offering slots surround a low ritual chest.
    this.createTombProp(800, 514, 'coffin-plain');
    this.createTombProp(OFFERING_NORTH_X, OFFERING_NORTH_Y, 'urn-green');
    this.createTombProp(OFFERING_SOUTH_X, OFFERING_SOUTH_Y, 'ritual-idol');
    this.createTombProp(600, 574, 'stone-slab');
    this.createTombProp(1000, 574, 'stone-slab');

    // West ear chamber: pottery store and burial rack around the low-value vessel.
    this.createTombProp(258, 570, 'burial-rack');
    this.createTombProp(310, 564, 'urn-purple');
    this.createTombProp(414, 564, 'urn-purple');
    this.createTombProp(452, 478, 'ritual-idol');

    // East ear chamber: green-glazed offerings and columns frame the mirror display.
    this.createTombProp(1152, 566, 'pillar-a');
    this.createTombProp(1352, 566, 'pillar-b');
    this.createTombProp(1128, 474, 'urn-green');
    this.createTombProp(1310, 562, 'urn-green');
    this.createTombProp(1298, 500, 'burial-rack');

    // South chamber keeps the central aisle open; the chest sits against the east wall.
    this.createTombProp(884, 736, 'coffin-plain');
    this.createTombProp(704, 720, 'ritual-idol');

    const animatedProps: Array<{
      x: number;
      y: number;
      animation: string;
      startFrame: number;
      timeScale: number;
    }> = [
      { x: 690, y: 244, animation: 'tomb-candle-a-loop', startFrame: 0, timeScale: 0.92 },
      { x: 910, y: 244, animation: 'tomb-candle-b-loop', startFrame: 2, timeScale: 1.08 },
      { x: 610, y: 570, animation: 'tomb-candle-b-loop', startFrame: 1, timeScale: 0.97 },
      { x: 990, y: 570, animation: 'tomb-candle-a-loop', startFrame: 3, timeScale: 1.04 },
      { x: 762, y: 888, animation: 'tomb-torch-loop', startFrame: 0, timeScale: 0.9 },
      { x: 838, y: 888, animation: 'tomb-torch-loop', startFrame: 2, timeScale: 1.05 },
      { x: 560, y: 458, animation: 'tomb-torch-loop', startFrame: 1, timeScale: 0.96 },
      { x: 1040, y: 458, animation: 'tomb-torch-loop', startFrame: 3, timeScale: 1.1 },
    ];

    for (const animatedProp of animatedProps) {
      this.animatedFlames.push(this.createAnimatedScenery(animatedProp));
    }

    this.createAnimatedScenery({
      x: 800,
      y: 584,
      animation: 'tomb-spike-loop',
      startFrame: 0,
      timeScale: 1,
      depth: 0.92,
    });
  }

  private createTombProp(
    x: number,
    y: number,
    frame: string,
    scale = PIXEL_SCALE,
  ): Phaser.GameObjects.Image {
    return this.add
      .image(x, y, 'tomb-decorative-sheet', frame)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(this.getSceneryDepth(y));
  }

  private createAnimatedScenery(config: {
    x: number;
    y: number;
    animation: string;
    startFrame: number;
    timeScale: number;
    depth?: number;
  }): Phaser.GameObjects.Sprite {
    const sprite = this.add
      .sprite(config.x, config.y, '__DEFAULT')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(config.depth ?? this.getSceneryDepth(config.y));
    sprite.play({ key: config.animation, startFrame: config.startFrame });
    sprite.anims.timeScale = config.timeScale;
    return sprite;
  }

  private getSceneryDepth(worldY: number): number {
    return SCENERY_DEPTH_BASE + worldY / 1000;
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
        .text(0, 0, 'E  Place / 放置', {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          color: '#ded4b7',
        })
        .setOrigin(0.5);

      return this.add.container(x, y + offsetY, [background, text]).setDepth(8).setVisible(false);
    };

    const emptyTraces = this.add.graphics().setDepth(1.5);
    emptyTraces.fillStyle(0x252923, 0.42);
    const slotPositions = [
      [OFFERING_CORRECT_X, OFFERING_CORRECT_Y],
      [OFFERING_NORTH_X, OFFERING_NORTH_Y],
      [OFFERING_EMPTY_X, OFFERING_EMPTY_Y],
      [OFFERING_SOUTH_X, OFFERING_SOUTH_Y],
    ] as const;
    for (const [x, y] of slotPositions) {
      emptyTraces.fillCircle(x, y, 38);
      emptyTraces.lineStyle(2, 0x8b8069, 0.26);
      emptyTraces.strokeCircle(x, y, 38);
      emptyTraces.lineStyle(1, 0x9a8666, 0.18);
      emptyTraces.strokeCircle(x, y, 25);
    }
    emptyTraces.lineStyle(2, 0x777765, 0.28);
    emptyTraces.fillRoundedRect(RIGHT_PROP_X - 43, PROP_Y - 49, 86, 98, 8);
    emptyTraces.strokeRoundedRect(RIGHT_PROP_X - 43, PROP_Y - 49, 86, 98, 8);

    return [
      {
        spotId: OFFERING_CORRECT_SLOT_ID,
        worldX: OFFERING_CORRECT_X,
        worldY: OFFERING_CORRECT_Y,
        interactionRadius: 96,
        artifactId: 'burial-vessel',
        isEmpty: false,
        isEnabled: true,
        promptObject: createSpotPrompt(OFFERING_CORRECT_X, OFFERING_CORRECT_Y),
      },
      {
        spotId: 'offering-north-fixed',
        worldX: OFFERING_NORTH_X,
        worldY: OFFERING_NORTH_Y,
        interactionRadius: 82,
        artifactId: 'fixed-offering-north',
        isEmpty: false,
        isEnabled: true,
        promptObject: createSpotPrompt(OFFERING_NORTH_X, OFFERING_NORTH_Y),
      },
      {
        spotId: OFFERING_EMPTY_SLOT_ID,
        worldX: OFFERING_EMPTY_X,
        worldY: OFFERING_EMPTY_Y,
        interactionRadius: 104,
        artifactId: null,
        isEmpty: true,
        isEnabled: true,
        promptObject: createSpotPrompt(OFFERING_EMPTY_X, OFFERING_EMPTY_Y),
      },
      {
        spotId: 'offering-south-fixed',
        worldX: OFFERING_SOUTH_X,
        worldY: OFFERING_SOUTH_Y,
        interactionRadius: 82,
        artifactId: 'fixed-offering-south',
        isEmpty: false,
        isEnabled: true,
        promptObject: createSpotPrompt(OFFERING_SOUTH_X, OFFERING_SOUTH_Y),
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
    const coffin = this.createCoffinVisual(COFFIN_X, COFFIN_Y);
    const leftObject = this.createBurialVesselVisual(
      OFFERING_CORRECT_X,
      OFFERING_CORRECT_Y,
    );
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
        worldX: COFFIN_X,
        worldY: COFFIN_Y,
        interactionRadius: 125,
        locationState: 'world',
        displaySpotId: null,
        promptOffsetY: -70,
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
        worldX: OFFERING_CORRECT_X,
        worldY: OFFERING_CORRECT_Y,
        interactionRadius: 96,
        locationState: 'world',
        displaySpotId: OFFERING_CORRECT_SLOT_ID,
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
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0b0d0b, 0.44);
    shadow.fillEllipse(0, 20, 104, 34);

    this.coffinClosedLid = this.add
      .image(0, 0, 'tomb-decorative-sheet', 'coffin-closed')
      .setScale(PIXEL_SCALE);
    this.coffinOpenedLid = this.add
      .image(0, 0, 'tomb-decorative-sheet', 'coffin-open')
      .setScale(PIXEL_SCALE)
      .setVisible(false);

    const highlight = this.add.graphics();
    highlight.lineStyle(2, 0xd5c49b, 0.84);
    highlight.strokeRoundedRect(-52, -37, 104, 74, 4);

    return {
      container: this.add
        .container(x, y, [shadow, this.coffinClosedLid, this.coffinOpenedLid, highlight])
        .setDepth(this.getSceneryDepth(y)),
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
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0b0d0b, 0.38);
    shadow.fillEllipse(0, 14, 42, 18);
    const vessel = this.add
      .image(0, 0, 'tomb-decorative-sheet', 'urn-purple')
      .setScale(PIXEL_SCALE)
      .setOrigin(0.5, 0.5);

    const highlight = this.add.graphics();
    highlight.lineStyle(2, 0xc2b58f, 0.76);
    highlight.strokeCircle(0, 0, 22);

    return {
      container: this.add
        .container(x, y, [shadow, vessel, highlight])
        .setDepth(this.getSceneryDepth(y)),
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
      container: this.add
        .container(x, y, [base, highlight])
        .setDepth(this.getSceneryDepth(y)),
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

    const container = this.add
      .container(x, y, [base, highlight])
      .setDepth(this.getSceneryDepth(y));
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
      if (
        distance <=
          artifact.interactionRadius * TOMB_FEEL.interaction.radiusMultiplier &&
        this.isInteractionVisible(artifact.worldX, artifact.worldY)
      ) {
        candidates.push({
          kind: 'artifact',
          stableId: artifact.displaySpotId ?? artifact.id,
          distance: this.getInteractionScore(
            artifact.worldX,
            artifact.worldY,
            distance,
          ),
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
        if (
          distance <=
            spot.interactionRadius * TOMB_FEEL.interaction.radiusMultiplier &&
          this.isInteractionVisible(spot.worldX, spot.worldY)
        ) {
          candidates.push({
            kind: 'empty-spot',
            stableId: spot.spotId,
            distance: this.getInteractionScore(
              spot.worldX,
              spot.worldY,
              distance,
            ),
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
      if (
        exitDistance <=
          EXIT_INTERACTION_RADIUS * TOMB_FEEL.interaction.radiusMultiplier &&
        this.isInteractionVisible(ENTRANCE_X, ENTRANCE_Y)
      ) {
        candidates.push({
          kind: 'exit',
          stableId: 'tomb-exit',
          distance: exitDistance,
        });
      }
    }

    candidates.sort((left, right) => {
      const priorityDifference =
        this.getInteractionPriority(left) - this.getInteractionPriority(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

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
      const selected =
        this.nearbyInteraction?.kind === 'artifact' &&
        this.nearbyInteraction.artifact === artifact;
      if (selected) {
        artifact.setPromptText(this.getArtifactPromptText(artifact));
      }
      artifact.setNearby(
        selected,
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
      .text(430, 195, 'ESC  CLOSE / 关闭', {
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

  private interactWithArtifact(artifact: InvestigableObject): void {
    if (!artifact.portable || !artifact.displaySpotId) {
      this.openInvestigation(artifact);
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
      this.panelCarryAction.setText('E  Open Coffin / 打开棺椁');
      this.panelSwapDescription.setText(
        'The seal is intact. Opening it cannot be undone.',
      );
      this.panelSwapChineseDescription.setText(
        '封印仍然完整。打开后无法复原。',
      );
      return;
    }

    if (!artifact.portable) {
      this.panelCarryAction.setText('E  Continue / 继续');
      this.panelSwapDescription.setText('');
      this.panelSwapChineseDescription.setText('');
      return;
    }

    const carriedArtifact = this.carrySystem.getCarriedArtifact();
    if (!carriedArtifact) {
      this.panelCarryAction.setText('E  Take / 拿取');
      this.panelSwapDescription.setText('');
      this.panelSwapChineseDescription.setText('');
      return;
    }

    this.panelCarryAction.setText('E  Swap / 交换');
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
      !this.isDepartureReady() ||
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
    this.debugEnabled = false;
    this.debugText?.setVisible(false);
    this.debugPath?.setVisible(false);
    this.directionalLamp?.setDebugVisible(false);
    this.footstepRipples?.setDebugVisible(false);
    this.footstepRipples?.clear();
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
    dust.fillCircle(COFFIN_X - 38, COFFIN_Y - 18, 5);
    dust.fillCircle(COFFIN_X - 14, COFFIN_Y - 30, 3);
    dust.fillCircle(COFFIN_X + 16, COFFIN_Y - 24, 4);
    dust.fillCircle(COFFIN_X + 40, COFFIN_Y - 10, 3);
    dust.fillCircle(COFFIN_X + 4, COFFIN_Y - 4, 2);

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

    this.player?.setCarrying(true);
    this.player?.playCarryAction('pickup');
    this.playArtifactActionFeedback(artifact.worldX, artifact.worldY, 'pickup');
    this.registerArtifactDisturbance(artifact, spot);
    if (artifact.id === 'burial-vessel') {
      this.encounterSystem.takeCritical(
        spot.spotId,
        artifact.worldX,
        artifact.worldY,
      );
    }
    this.registerCompassRetrieved(artifact);
    spot.artifactId = null;
    spot.isEmpty = true;
    artifact.setCarried();
    this.setArtifactCollisionEnabled(artifact, false);
    this.resetCarriedExposure(artifact.id);
    this.updateCarryUI();
    this.closeInvestigation();
    this.evaluateDepartureReadiness();
  }

  private swapArtifact(artifactAtSpot: InvestigableObject, spot: ArtifactSpot): void {
    const carriedArtifact = this.carrySystem.removeCarriedArtifact();
    if (!carriedArtifact) {
      return;
    }

    this.playArtifactActionFeedback(artifactAtSpot.worldX, artifactAtSpot.worldY, 'pickup');
    this.registerArtifactDisturbance(artifactAtSpot, spot);
    if (artifactAtSpot.id === 'burial-vessel') {
      this.encounterSystem.takeCritical(
        spot.spotId,
        artifactAtSpot.worldX,
        artifactAtSpot.worldY,
      );
    }
    this.registerCompassRetrieved(artifactAtSpot);
    artifactAtSpot.setCarried();
    this.setArtifactCollisionEnabled(artifactAtSpot, false);

    spot.artifactId = carriedArtifact.id;
    spot.isEmpty = false;
    carriedArtifact.moveToWorldSpot(spot.worldX, spot.worldY, spot.spotId);
    carriedArtifact.visualObject.setDepth(this.getSceneryDepth(spot.worldY));
    this.setArtifactCollisionEnabled(carriedArtifact, true);
    this.handleArtifactPlaced(carriedArtifact, spot);
    this.carrySystem.takeArtifact(artifactAtSpot);
    this.player?.setCarrying(true);
    this.player?.playCarryAction('pickup');

    this.resetCarriedExposure(artifactAtSpot.id);
    this.updateCarryUI();
    this.closeInvestigation();
    this.evaluateDepartureReadiness();
  }

  private placeCarriedArtifact(spot: ArtifactSpot): void {
    if (!spot.isEnabled || !spot.isEmpty || spot.artifactId !== null) {
      return;
    }

    const carriedArtifact = this.carrySystem.removeCarriedArtifact();
    if (!carriedArtifact) {
      return;
    }

    this.player?.setCarrying(false);
    this.player?.playCarryAction('place');
    spot.artifactId = carriedArtifact.id;
    spot.isEmpty = false;
    carriedArtifact.moveToWorldSpot(spot.worldX, spot.worldY, spot.spotId);
    carriedArtifact.visualObject.setDepth(this.getSceneryDepth(spot.worldY));
    this.setArtifactCollisionEnabled(carriedArtifact, true);
    this.handleArtifactPlaced(carriedArtifact, spot);
    this.resetCarriedExposure(null);
    this.updateCarryUI();
    this.nearbyInteraction = undefined;
    this.updateNearestInteraction();
    this.evaluateDepartureReadiness();
  }

  private registerCompassRetrieved(artifact: InvestigableObject): void {
    if (artifact.id !== 'geomancers-compass' || this.compassHasBeenRetrieved) {
      return;
    }

    this.compassHasBeenRetrieved = true;
    this.updateObjectiveUI(
      'Keep the compass with you. Restore every other moved burial object to its original place.',
      '把风水罗盘带在身上，并将其他被移动的随葬物全部放回原位。',
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

  private updateLampHint(): void {
    const lightOn = this.directionalLamp?.isOn() ?? true;
    this.lampHintText?.setText(
      `${TOMB_FEEL.lamp.toggleKey}  ${lightOn ? 'EXTINGUISH' : 'LIGHT'} / ${lightOn ? '熄灯' : '点灯'}`,
    );
  }

  private ensureAudioStarted(): void {
    this.proceduralAudio?.ensureStarted();
  }

  private updateEncounterSystems(time: number, deltaMs: number): void {
    if (!this.player) {
      return;
    }
    const velocity = this.player.getMovementVelocity();
    this.delayedFootsteps?.update(
      time,
      deltaMs,
      this.player.x,
      this.player.y,
      velocity.x,
      velocity.y,
      this.encounterSystem.getState(),
    );
  }

  private emitFootstep(emission: FootstepEmission): void {
    if (!this.player) {
      return;
    }
    const presentation = TOMB_FEEL.footsteps.presentation;
    if (presentation === 'audio' || presentation === 'both') {
      this.proceduralAudio?.playFootstep(
        emission.kind,
        emission.x,
        emission.y,
        this.player.x,
        this.player.y,
      );
    }
    if (presentation === 'visual' || presentation === 'both') {
      this.footstepRipples?.emit(emission);
    }
  }

  private handleEncounterTransition(transition: TombEncounterTransition): void {
    this.wallShadow?.setState(transition.current);
    if (transition.current === 'Dormant') {
      this.playFlamePattern('appeased');
      this.updateObjectiveUI(
        'The tomb went still. Take the disturbed offering beyond this room.',
        '墓穴重新安静下来。把那件供物带出房间。',
      );
      return;
    }
    if (transition.current === 'Remembering') {
      this.directionalLamp?.flicker(0.52, 0.55);
      this.proceduralAudio?.setAmbientMuted(true);
      this.cameras.main.shake(100, TOMB_FEEL.feedback.lightShake);
      this.playFlamePattern('remembering');
      this.updateObjectiveUI(
        'Carry the disturbed offering beyond this room. Listen behind you.',
        '把被移动的供物带出房间。听一听身后的动静。',
      );
      this.showShopkeeperMessage(
        'remembering',
        'The room went quiet. It noticed the missing weight.',
        '墓室忽然安静了。它察觉到了少掉的重量。',
      );
      this.encounterTimers.push(
        this.time.delayedCall(280, () => this.proceduralAudio?.setAmbientMuted(false)),
      );
      return;
    }

    if (transition.current === 'Following') {
      this.hideShopkeeperMessage();
      this.playFlamePattern('following');
      this.updateObjectiveUI(
        'The second footsteps are closing in. Return toward the entrance.',
        '第二组脚步正在靠近。返回入口方向。',
      );
      return;
    }

    if (transition.current === 'Manifesting') {
      this.hideShopkeeperMessage();
      this.playFlamePattern('manifesting');
      this.directionalLamp?.flicker(0.42, 0.42);
      this.cameras.main.shake(120, TOMB_FEEL.feedback.manifestationShake);
      this.updateObjectiveUI(
        'The wall shadow advances in the light. Extinguish the lamp, then restore the offering.',
        '墙影只在灯光中靠近。熄灯，然后把供物归位。',
      );
      return;
    }

    if (transition.current === 'Appeased') {
      this.playFlamePattern('appeased');
      this.proceduralAudio?.playCue('correct');
      this.evaluateDepartureReadiness();
      return;
    }

    if (transition.current === 'Provoked') {
      this.lockEntranceForProvocation();
      this.playFlamePattern('provoked');
      this.directionalLamp?.flicker(0.68, 0.72);
      this.proceduralAudio?.playCue('door-reject');
      this.updateObjectiveUI(
        'It remembers faster now. Put the offering back again.',
        '它这次记得更快。再次把供物放回原位。',
      );
      this.showShopkeeperMessage(
        'provoked',
        'You had a way out. You chose to touch it again.',
        '出口已经开过。是你选择再次碰它。',
      );
    }
  }

  private handleArtifactPlaced(
    artifact: InvestigableObject,
    spot: ArtifactSpot,
  ): void {
    this.playArtifactActionFeedback(spot.worldX, spot.worldY, 'place');
    if (artifact.id !== 'burial-vessel') {
      return;
    }
    const placement = this.encounterSystem.placeCritical(spot.spotId);
    if (placement === 'wrong') {
      this.playWrongPlacementFeedback();
    }
  }

  private playArtifactActionFeedback(
    x: number,
    y: number,
    action: 'pickup' | 'place',
  ): void {
    this.proceduralAudio?.playCue(action);
    const ring = this.add.graphics().setDepth(4.2);
    ring.lineStyle(2, action === 'pickup' ? 0xcab683 : 0x899f88, 0.82);
    ring.strokeCircle(x, y, 24);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.75,
      scaleY: 1.75,
      duration:
        action === 'pickup'
          ? TOMB_FEEL.feedback.pickupTweenMs
          : TOMB_FEEL.feedback.placeTweenMs,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(65, TOMB_FEEL.feedback.lightShake * 0.65);
  }

  private playWrongPlacementFeedback(): void {
    this.proceduralAudio?.playCue('wrong');
    this.proceduralAudio?.playCue('door-reject');
    this.directionalLamp?.flicker(0.48, 0.62);
    this.cameras.main.shake(130, TOMB_FEEL.feedback.rejectShake);
    this.updateObjectiveUI(
      'The door rejected this arrangement. Listen for the older rhythm.',
      '墓门拒绝了这个摆法。听清最早出现的那段节奏。',
    );
    if (this.entranceGateVisual) {
      this.tweens.killTweensOf(this.entranceGateVisual);
      this.tweens.add({
        targets: this.entranceGateVisual,
        x: { from: ENTRANCE_X - 4, to: ENTRANCE_X + 4 },
        duration: 48,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.entranceGateVisual?.setX(ENTRANCE_X),
      });
    }
  }

  private playFlamePattern(
    pattern: 'remembering' | 'following' | 'manifesting' | 'appeased' | 'provoked',
  ): void {
    this.tweens.killTweensOf(this.animatedFlames);
    this.flameTimers.forEach((timer) => timer.remove(false));
    this.flameTimers = [];
    if (pattern === 'appeased') {
      this.animatedFlames.forEach((flame, index) => {
        flame.setAlpha(0.08);
        const timer = this.time.delayedCall(index * 90, () => {
          flame.anims.timeScale = index % 2 === 0 ? 0.96 : 1.04;
          this.tweens.add({
            targets: flame,
            alpha: 1,
            duration: 220,
            ease: 'Sine.Out',
          });
        });
        this.flameTimers.push(timer);
      });
      return;
    }

    const targetAlpha = pattern === 'remembering'
      ? 0.5
      : pattern === 'following'
        ? 0.32
        : pattern === 'manifesting'
          ? 0.12
          : 0.06;
    this.animatedFlames.forEach((flame, index) => {
      flame.anims.timeScale = pattern === 'provoked' ? 1.8 : 1.35 + index * 0.025;
      this.tweens.add({
        targets: flame,
        alpha: index % 3 === 0 ? targetAlpha * 0.45 : targetAlpha,
        duration: 150 + index * 28,
        ease: 'Sine.InOut',
      });
    });
  }

  private lockEntranceForProvocation(): void {
    this.lockEntranceUntilRequirementsMet('sealed');
  }

  private lockEntranceUntilRequirementsMet(
    nextPhase: TutorialTombPhase = 'coffin-opened',
  ): void {
    this.tutorialPhase = nextPhase;
    const gateBody = this.entranceGateCollision?.body as
      | Phaser.Physics.Arcade.StaticBody
      | undefined;
    if (gateBody) {
      gateBody.enable = true;
      gateBody.updateFromGameObject();
    }
    this.exitPrompt?.setVisible(false);
    this.nearbyInteraction = undefined;
    this.entranceGateTween?.stop();
    if (this.entranceGateVisual) {
      this.entranceGateVisual.setVisible(true).setAlpha(1);
      this.entranceGateTween = this.tweens.add({
        targets: this.entranceGateVisual,
        y: ENTRANCE_Y,
        duration: 180,
        ease: 'Sine.Out',
      });
    }
  }

  private isOriginalArrangementRestored(): boolean {
    return this.investigableObjects
      .filter(
        (artifact) =>
          artifact.id !== 'geomancers-compass' &&
          artifact.originalSpotId !== null,
      )
      .every(
        (artifact) =>
          artifact.locationState === 'world' &&
          artifact.displaySpotId === artifact.originalSpotId,
      );
  }

  private isCompassCarried(): boolean {
    return this.carrySystem.getCarriedArtifact()?.id === 'geomancers-compass';
  }

  private isDepartureReady(): boolean {
    return (
      this.encounterSystem.isExitUnlocked() &&
      this.compassHasBeenRetrieved &&
      this.isCompassCarried() &&
      this.isOriginalArrangementRestored()
    );
  }

  private evaluateDepartureReadiness(): void {
    const ready = this.isDepartureReady();
    const wasReady = this.tutorialPhase === 'objective-complete';

    if (ready) {
      this.tutorialPhase = 'objective-complete';
      this.releaseEntrance();
      if (!wasReady) {
        this.proceduralAudio?.playCue('door-unlock');
        this.updateObjectiveUI(
          'Everything is back in its original place. Leave with the Geomancer’s Compass.',
          '墓中物件已全部归回原位。带着风水罗盘从入口离开。',
        );
        this.showShopkeeperMessage(
          'released',
          'That is the arrangement it remembers. Keep the compass and come back now.',
          '这才是它记得的摆法。罗盘带好，现在回来。',
        );
      }
      return;
    }

    if (wasReady) {
      this.lockEntranceUntilRequirementsMet('coffin-opened');
      this.proceduralAudio?.playCue('door-reject');
    }

    if (!this.encounterSystem.isExitUnlocked()) {
      return;
    }

    if (!this.isOriginalArrangementRestored()) {
      this.updateObjectiveUI(
        'The tomb still detects a displaced object. Restore every moved burial object to its original place.',
        '墓穴仍察觉到物件错位。将所有被移动的随葬物放回各自原位。',
      );
      return;
    }

    this.updateObjectiveUI(
      'The original arrangement is restored. Pick up and keep the Geomancer’s Compass.',
      '原有摆放已经恢复。拿起风水罗盘，并将它带在身上。',
    );
  }

  private getInteractionScore(
    targetX: number,
    targetY: number,
    distance: number,
  ): number {
    if (!this.player || distance <= 0.001) {
      return distance;
    }
    const toTarget = new Phaser.Math.Vector2(
      targetX - this.player.x,
      targetY - this.player.y,
    ).normalize();
    const facingDot = this.player.getFacingVector().dot(toTarget);
    return facingDot < TOMB_FEEL.interaction.rearToleranceDot
      ? distance + TOMB_FEEL.interaction.rearPenalty
      : distance;
  }

  private isInteractionVisible(worldX: number, worldY: number): boolean {
    return this.directionalLamp?.isWorldPointVisible(worldX, worldY) ?? true;
  }

  private getInteractionPriority(target: InteractionTarget): number {
    if (target.kind === 'empty-spot' || target.kind === 'exit') {
      return 0;
    }
    if (target.artifact.portable) {
      return this.carrySystem.isEmpty() ? 1 : 2;
    }
    return 3;
  }

  private getArtifactPromptText(artifact: InvestigableObject): string {
    if (!artifact.portable) {
      return 'E  Investigate / 调查';
    }
    return this.carrySystem.isEmpty()
      ? 'E  Take / 拿取'
      : 'E  Swap / 交换';
  }

  private createDebugTools(): void {
    if (!import.meta.env.DEV || !this.input.keyboard) {
      return;
    }
    this.debugKeys = {
      toggle: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3),
      reset: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F6),
      offeringRoom: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F7),
      corridor: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8),
    };
    this.debugText = this.add
      .text(430, 112, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffd18a',
        backgroundColor: '#0a0b09dd',
        padding: { x: 10, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(80)
      .setVisible(false);
    this.debugPath = this.add.graphics().setDepth(7.8).setVisible(false);
  }

  private updateDebugTools(): void {
    if (!this.debugKeys || !this.player) {
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.toggle)) {
      this.debugEnabled = !this.debugEnabled;
      this.debugText?.setVisible(this.debugEnabled);
      this.debugPath?.setVisible(this.debugEnabled);
      this.directionalLamp?.setDebugVisible(this.debugEnabled);
      this.footstepRipples?.setDebugVisible(this.debugEnabled);
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.reset)) {
      this.scene.restart({ appearanceId: this.appearanceId });
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.offeringRoom)) {
      this.player.setPosition(800, 560);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(800, 560);
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.corridor)) {
      this.player.setPosition(800, 790);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(800, 790);
    }
    if (!this.debugEnabled) {
      return;
    }
    const lampDebug = this.directionalLamp?.getDebugInfo();
    const wallDebug = this.wallShadow?.getDebugInfo();
    const rippleDebug = this.footstepRipples?.getDebugInfo();
    const lampMount = this.player.getFlashlightMountWorld(
      lampDebug?.angleRadians ?? -Math.PI / 2,
    );
    this.debugText?.setText([
      `STATE: ${this.encounterSystem.getState()}`,
      `OFFERING SLOT: ${this.encounterSystem.getCurrentSlotId() ?? 'carried'}`,
      `PLAYER: ${this.player.getAnimationState()}  FACING: ${this.player.getFacing()}`,
      `LAMP: ${lampDebug?.isOn ? 'ON' : 'OFF'}  BRIGHT: ${(lampDebug?.brightness ?? 0).toFixed(2)}`,
      `ANGLE: ${Phaser.Math.RadToDeg(lampDebug?.angleRadians ?? 0).toFixed(1)}°  RANGE: ${lampDebug?.effectiveDistance ?? 0}`,
      `LAMP MOUNT: ${lampMount.x.toFixed(0)}, ${lampMount.y.toFixed(0)}`,
      `SAFE: ${lampDebug?.safeRadius ?? 0}  TARGET VISIBLE: ${this.nearbyInteraction ? 'YES' : 'NO'}`,
      `GHOST: ${wallDebug?.state ?? 'none'}  ADV: ${(wallDebug?.advance ?? 0).toFixed(3)}  ALPHA: ${(wallDebug?.visibleAlpha ?? 0).toFixed(2)}  BEAM: ${wallDebug?.inBeam ? 'YES' : 'NO'}`,
      `ECHO: ${rippleDebug?.lastEchoX?.toFixed(0) ?? '-'},${rippleDebug?.lastEchoY?.toFixed(0) ?? '-'}  FOLLOWER: ${rippleDebug?.lastFollowerX?.toFixed(0) ?? '-'},${rippleDebug?.lastFollowerY?.toFixed(0) ?? '-'}`,
      `RIPPLES: ${rippleDebug?.activeFootsteps ?? 0}/${rippleDebug?.poolSize ?? 0} footsteps  ${rippleDebug?.activeRings ?? 0} rings`,
      `FOOTSTEPS: ${TOMB_FEEL.footsteps.presentation}`,
      'F6 reset  F7 offering room  F8 corridor',
    ]);
    this.debugPath?.clear();
    this.debugPath?.fillStyle(0x65c6ba, 0.48);
    const samples = this.delayedFootsteps?.getSamples() ?? [];
    for (let index = Math.max(0, samples.length - 48); index < samples.length; index += 1) {
      const sample = samples[index];
      this.debugPath?.fillCircle(sample.x, sample.y, sample.moving ? 3 : 1.5);
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
    for (const segment of this.getTombWallSegments()) {
      this.addStaticObstacle(
        obstacles,
        segment.x + segment.width / 2,
        segment.y + segment.height / 2,
        segment.width,
        segment.height,
      );
    }

    this.addStaticObstacle(obstacles, COFFIN_X, COFFIN_Y, 92, 48);
    this.addStaticObstacle(obstacles, 680, 148, 24, 18);
    this.addStaticObstacle(obstacles, 920, 148, 24, 18);
    this.addStaticObstacle(obstacles, 800, 502, 84, 24);
    this.addStaticObstacle(obstacles, 600, 566, 36, 16);
    this.addStaticObstacle(obstacles, 1000, 566, 36, 16);
    this.addStaticObstacle(obstacles, 258, 561, 54, 18);
    this.addStaticObstacle(obstacles, 1152, 558, 24, 18);
    this.addStaticObstacle(obstacles, 1352, 558, 24, 18);
    this.addStaticObstacle(obstacles, 1298, 491, 54, 18);
    this.addStaticObstacle(obstacles, 884, 724, 84, 24);
    this.artifactCollisions.set(
      'burial-vessel',
      this.addStaticObstacle(
        obstacles,
        OFFERING_CORRECT_X,
        OFFERING_CORRECT_Y,
        34,
        34,
      ),
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
