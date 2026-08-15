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
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import {
  createTimedLocationTitle,
  type TimedLocationTitle,
} from '../ui/createTimedLocationTitle';
import {
  createStyleBoardPanel,
  createStyleBoardPrompt,
  drawStyleBoardPanel,
  UI_STYLE_BOARD,
} from '../ui/styleBoardUi';
import { ShopProgressSystem, type TombSettlement } from '../systems/ShopProgressSystem';
import {
  CEREMONIAL_GATE_TEXTURES,
  createCeremonialTombGate,
  type CeremonialTombGate,
} from '../visuals/createCeremonialTombGate';
import {
  CORRIDOR_MURAL_TEXTURES,
  createTombCorridorMurals,
  type TombCorridorMuralPanel,
  type TombCorridorMurals,
} from '../visuals/createTombCorridorMurals';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1664;
const PHYSICS_WORLD_WIDTH = 3200;
const REFINED_TOMB_ART_ROOT = 'assets/generated/tomb_refined_v1';
const REFINED_TOMB_TEXTURE = 'tomb-refined-fullmap';
const CELLAR_ART_ROOT = 'assets/generated/tomb_cellar_v1';
const CELLAR_ROOM_TEXTURE = 'hidden-cellar-room';
const CELLAR_PROPS_TEXTURE = 'hidden-cellar-props';
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
const CELLAR_HATCH_X = 914;
const CELLAR_HATCH_Y = 254;
const CELLAR_ROOM: TombRect = { x: 2040, y: 160, width: 760, height: 560 };
const CELLAR_CENTER_X = CELLAR_ROOM.x + CELLAR_ROOM.width / 2;
const CELLAR_LADDER_Y = CELLAR_ROOM.y + CELLAR_ROOM.height - 66;
const CELLAR_ATLAS_Y = CELLAR_ROOM.y + 132;
const ENTRANCE_X = ROOM_CENTER_X;
const ENTRANCE_Y = 944;
const CORRIDOR_LEFT = 608;
const CORRIDOR_RIGHT = 992;
const CORRIDOR_FLOOR_LEFT = 656;
const CORRIDOR_FLOOR_RIGHT = 944;
const CORRIDOR_BOTTOM = 1624;
const EVACUATION_X = ROOM_CENTER_X;
const EVACUATION_Y = 1552;
const GATE_FIRE_DISTANCE = 292;
const GATE_OPEN_DISTANCE = 232;
const GATE_REVEAL_Y = 916;
const EXIT_INTERACTION_RADIUS = 118;
const DISTANCE_TIE_EPSILON = 0.5;
const SERIF_FONT = VISUAL_THEME.fonts.serif;
const SANS_FONT = VISUAL_THEME.fonts.sans;
const TOMB_ASSET_ROOT = 'assets/imported/tomb_asset_pack';
const GENERATED_TOMB_ASSET_ROOT = 'assets/generated/tomb_vertical_slice';
const ORIGINAL_CORRIDOR_ASSET_ROOT = 'assets/generated/tomb_corridor_original';
const ORIGINAL_ARTIFACT_ASSET_ROOT = 'assets/generated/tomb_artifacts_original';
const ORIGINAL_ARTIFACT_TEXTURES = {
  burialVessel: 'original-burial-vessel',
  bronzeMirror: 'original-bronze-mirror',
  geomancersCompass: 'original-geomancers-compass',
} as const;
const CELLAR_PROP_FRAMES: TombTextureFrame[] = [
  { name: 'hatch-closed', x: 108, y: 148, width: 454, height: 420 },
  { name: 'hatch-open', x: 698, y: 64, width: 420, height: 506 },
  { name: 'ladder', x: 156, y: 730, width: 380, height: 408 },
  { name: 'atlas', x: 730, y: 714, width: 354, height: 444 },
];
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

type TombRoomId =
  | 'burial-chamber'
  | 'central-offering-chamber'
  | 'west-chamber'
  | 'east-offering-chamber'
  | 'south-chamber';

const TOMB_ROOM_COUNT = 5;

type RoomExplorationPoint = {
  roomId: TombRoomId;
  englishName: string;
  chineseName: string;
  worldX: number;
  worldY: number;
  interactionRadius: number;
  marker: Phaser.GameObjects.Graphics;
  promptObject: Phaser.GameObjects.Container;
};

interface TombSceneData {
  appearanceId?: PlayerAppearanceId;
}

type PortableArtifactId =
  | 'burial-vessel'
  | 'bronze-mirror'
  | 'geomancers-compass'
  | 'myriad-character-atlas';

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
  'myriad-character-atlas': {
    id: 'myriad-character-atlas',
    englishName: 'Myriad Character Atlas',
    chineseName: '万字藏图',
    description:
      'The folded chart is dry despite the wet cellar. Its ink shifts whenever the lantern moves away.',
    chineseDescription: '地窖如此潮湿，藏图却完全干燥。灯光移开时，墨迹似乎会自行改变。',
    hiddenValue: 0,
    appraisalText:
      'This is not ordinary loot. Its seals and routes connect the geomancer’s compass to places beyond this tomb.',
    chineseAppraisalText: '这不是普通战利品。图中的印记与路线，将风水罗盘指向了墓穴之外。',
    omenTier: 2,
    originalSpotId: 'hidden-cellar-pedestal',
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
  originMarker?: Phaser.GameObjects.Container;
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
      kind: 'room-exploration';
      stableId: TombRoomId;
      distance: number;
      point: RoomExplorationPoint;
    }
  | {
      kind: 'locked-exit';
      stableId: 'locked-tomb-exit';
      distance: number;
    }
  | {
      kind: 'exit';
      stableId: 'tomb-exit';
      distance: number;
    }
  | {
      kind: 'cellar-hatch';
      stableId: 'hidden-cellar-hatch';
      distance: number;
    }
  | {
      kind: 'cellar-ladder';
      stableId: 'hidden-cellar-ladder';
      distance: number;
    }
  | {
      kind: 'cellar-atlas';
      stableId: 'myriad-character-atlas';
      distance: number;
    }
  | {
      kind: 'corridor-mural';
      stableId: string;
      distance: number;
      mural: TombCorridorMuralPanel;
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
  private roomExplorationPoints: RoomExplorationPoint[] = [];
  private readonly exploredRoomIds = new Set<TombRoomId>();
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
  private tombSettlement?: TombSettlement;
  private completionTransitionLocked = false;
  private coffinState: CoffinState = 'sealed';
  private carriedExposureSeconds = 0;
  private exposureArtifactId: string | null = null;
  private currentOmenLevel: OmenLevel = 0;
  private levelThreeShakeElapsed = 0;
  private compassFeedbackSeconds = 0;
  private artifactCollisions = new Map<string, Phaser.GameObjects.Rectangle>();
  private entranceGateVisual?: Phaser.GameObjects.Container;
  private entranceGateCollision?: Phaser.GameObjects.Rectangle;
  private entranceSealTimer?: Phaser.Time.TimerEvent;
  private ceremonialGate?: CeremonialTombGate;
  private corridorMurals?: TombCorridorMurals;
  private corridorMuralPrompts = new Map<string, Phaser.GameObjects.Container>();
  private muralDiscoveryPanel?: Phaser.GameObjects.Container;
  private muralDiscoveryPreview?: Phaser.GameObjects.Image;
  private muralDiscoveryEnglishTitle?: Phaser.GameObjects.Text;
  private muralDiscoveryChineseTitle?: Phaser.GameObjects.Text;
  private muralDiscoveryEnglishBody?: Phaser.GameObjects.Text;
  private muralDiscoveryChineseBody?: Phaser.GameObjects.Text;
  private muralDiscoveryActive = false;
  private tombMapVeil?: Phaser.GameObjects.Rectangle;
  private tombMapRevealed = false;
  private entranceCrossed = false;
  private exitPrompt?: Phaser.GameObjects.Container;
  private lockedExitPrompt?: Phaser.GameObjects.Container;
  private coffinClosedLid?: Phaser.GameObjects.Image;
  private coffinOpenedLid?: Phaser.GameObjects.Image;
  private currentTombMap: 'main' | 'cellar' = 'main';
  private cellarHatchOpened = false;
  private cellarTransitionActive = false;
  private cellarAtlasDiscovered = false;
  private cellarAtlasCollected = false;
  private cellarHatchClosed?: Phaser.GameObjects.Image;
  private cellarHatchOpen?: Phaser.GameObjects.Image;
  private cellarHatchPrompt?: Phaser.GameObjects.Container;
  private cellarLadderPrompt?: Phaser.GameObjects.Container;
  private cellarAtlasPrompt?: Phaser.GameObjects.Container;
  private cellarAtmosphere?: Phaser.GameObjects.Graphics;
  private cellarAtlasArtifact?: InvestigableObject;
  private cellarDiscoveryPanel?: Phaser.GameObjects.Container;
  private cellarDiscoveryActive = false;
  private cellarDiscoveryAction?: Phaser.GameObjects.Text;
  private cellarEntryNotice?: Phaser.GameObjects.Container;
  private mainMapVeilWasVisible = false;
  private ambientOverlay?: Phaser.GameObjects.Graphics;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private backpackKey?: Phaser.Input.Keyboard.Key;
  private backpackUpKey?: Phaser.Input.Keyboard.Key;
  private backpackDownKey?: Phaser.Input.Keyboard.Key;
  private backpackSlotOneKey?: Phaser.Input.Keyboard.Key;
  private backpackSlotTwoKey?: Phaser.Input.Keyboard.Key;
  private instructionText?: Phaser.GameObjects.Text;
  private escapeHintText?: Phaser.GameObjects.Text;
  private locationTitleEnglish?: Phaser.GameObjects.Text;
  private locationTitleChinese?: Phaser.GameObjects.Text;
  private activeLocationTitle?: TimedLocationTitle;
  private objectiveUI?: Phaser.GameObjects.Container;
  private objectiveBackground?: Phaser.GameObjects.Graphics;
  private objectiveText?: Phaser.GameObjects.Text;
  private objectiveChineseText?: Phaser.GameObjects.Text;
  private restoreProgressText?: Phaser.GameObjects.Text;
  private restoreHintElapsedSeconds = 0;
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
  private carriedSlotTexts: Phaser.GameObjects.Text[] = [];
  private carryUI?: Phaser.GameObjects.Container;
  private backpackMenu?: Phaser.GameObjects.Container;
  private backpackMenuActive = false;
  private backpackSelectionIndex = 0;
  private backpackMenuCountText?: Phaser.GameObjects.Text;
  private backpackMenuSlotPanels: Phaser.GameObjects.Graphics[] = [];
  private backpackMenuSlotTexts: Phaser.GameObjects.Text[] = [];
  private backpackMenuDetailName?: Phaser.GameObjects.Text;
  private backpackMenuDetailChineseName?: Phaser.GameObjects.Text;
  private backpackMenuDetailState?: Phaser.GameObjects.Text;
  private backpackMenuActionText?: Phaser.GameObjects.Text;
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
    this.load.image(
      REFINED_TOMB_TEXTURE,
      `${REFINED_TOMB_ART_ROOT}/tomb_refined_fullmap.png`,
    );
    this.load.image(CELLAR_ROOM_TEXTURE, `${CELLAR_ART_ROOT}/hidden_cellar_room.png`);
    this.load.image(CELLAR_PROPS_TEXTURE, `${CELLAR_ART_ROOT}/cellar_props.png`);
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
    this.load.image(
      CEREMONIAL_GATE_TEXTURES.closed,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/gate_closed.png`,
    );
    this.load.image(
      CEREMONIAL_GATE_TEXTURES.open,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/gate_open.png`,
    );
    this.load.image(
      CEREMONIAL_GATE_TEXTURES.ghostFire,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/ghost_fire.png`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.leftUpper,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/mural_left_upper.png`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.leftLower,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/mural_left_lower.png`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.rightUpper,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/mural_right_upper.png`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.rightLower,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/mural_right_lower.png`,
    );
    this.load.image(
      ORIGINAL_ARTIFACT_TEXTURES.burialVessel,
      `${ORIGINAL_ARTIFACT_ASSET_ROOT}/burial_vessel.png`,
    );
    this.load.image(
      ORIGINAL_ARTIFACT_TEXTURES.bronzeMirror,
      `${ORIGINAL_ARTIFACT_ASSET_ROOT}/bronze_mirror.png`,
    );
    this.load.image(
      ORIGINAL_ARTIFACT_TEXTURES.geomancersCompass,
      `${ORIGINAL_ARTIFACT_ASSET_ROOT}/geomancers_compass.png`,
    );

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
    this.addTextureFrames(CELLAR_PROPS_TEXTURE, CELLAR_PROP_FRAMES);

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
    this.textures
      .get(REFINED_TOMB_TEXTURE)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(CELLAR_ROOM_TEXTURE).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(CELLAR_PROPS_TEXTURE).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const textureKey of [
      ...Object.values(CEREMONIAL_GATE_TEXTURES),
      ...Object.values(CORRIDOR_MURAL_TEXTURES),
      ...Object.values(ORIGINAL_ARTIFACT_TEXTURES),
    ]) {
      this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
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
    this.physics.world.setBounds(0, 0, PHYSICS_WORLD_WIDTH, WORLD_HEIGHT);

    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'tomb',
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      playerLightEnabled: false,
    });
    this.drawTombGreybox();
    this.corridorMurals = createTombCorridorMurals(this);
    this.createCorridorMuralInteractions();
    this.artifactSpots = this.createArtifactSpots();
    this.investigableObjects = this.createInvestigableObjects();
    this.cellarAtlasArtifact = this.investigableObjects.find(
      (artifact) => artifact.id === 'myriad-character-atlas',
    );
    this.roomExplorationPoints = this.createRoomExplorationPoints();
    const obstacles = this.createCollisionObstacles();
    this.createHiddenCellar(obstacles);
    this.createEntranceGate(obstacles);
    this.player = this.createPlayer();
    this.physics.add.collider(this.player, obstacles);

    this.configureCamera();
    this.proceduralAudio = new ProceduralTombAudioSystem();
    this.directionalLamp = new DirectionalLampSystem(
      this,
      this.getTombWallSegments(),
    );
    this.createTombMapVeil();
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
    this.createCellarDiscoveryPanel();
    this.createMuralDiscoveryPanel();
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
      !this.enterKey ||
      !this.backpackKey ||
      !this.backpackUpKey ||
      !this.backpackDownKey ||
      !this.backpackSlotOneKey ||
      !this.backpackSlotTwoKey
    ) {
      return;
    }

    const interactionPressed = Phaser.Input.Keyboard.JustDown(this.interactionKey);
    const escapePressed = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    const pausePressed = escapePressed || isPauseButtonPressed(this);
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey);
    const backpackPressed = Phaser.Input.Keyboard.JustDown(this.backpackKey);
    const backpackUpPressed = Phaser.Input.Keyboard.JustDown(this.backpackUpKey);
    const backpackDownPressed = Phaser.Input.Keyboard.JustDown(this.backpackDownKey);
    const backpackSlotOnePressed = Phaser.Input.Keyboard.JustDown(this.backpackSlotOneKey);
    const backpackSlotTwoPressed = Phaser.Input.Keyboard.JustDown(this.backpackSlotTwoKey);
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
    const lampAimAngle = this.directionalLamp?.getAimAngleRadians() ?? -Math.PI / 2;
    this.player.setAimAngle(lampAimAngle);
    this.updateCorridorEntrance(time);
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
      if (interactionPressed || enterPressed || escapePressed) {
        this.transitionToShopReturn();
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

    if (this.cellarTransitionActive) {
      return;
    }

    if (this.cellarDiscoveryActive) {
      if (backpackPressed) {
        this.closeCellarDiscovery();
        this.openBackpackMenu();
      } else if (escapePressed) {
        this.closeCellarDiscovery();
      } else if (interactionPressed || enterPressed) {
        this.collectCellarAtlas();
      }
      return;
    }

    if (this.muralDiscoveryActive) {
      if (escapePressed || interactionPressed || enterPressed) {
        this.closeMuralDiscovery();
      }
      return;
    }

    if (this.backpackMenuActive) {
      if (escapePressed || backpackPressed) {
        this.closeBackpackMenu();
      } else if (backpackSlotOnePressed) {
        this.backpackSelectionIndex = 0;
        this.updateBackpackMenu();
      } else if (backpackSlotTwoPressed) {
        this.backpackSelectionIndex = 1;
        this.updateBackpackMenu();
      } else if (backpackUpPressed) {
        this.backpackSelectionIndex = Math.max(0, this.backpackSelectionIndex - 1);
        this.updateBackpackMenu();
      } else if (backpackDownPressed) {
        this.backpackSelectionIndex = Math.min(
          this.carrySystem.capacity - 1,
          this.backpackSelectionIndex + 1,
        );
        this.updateBackpackMenu();
      } else if (interactionPressed || enterPressed) {
        this.confirmBackpackSelection();
      }
      return;
    }

    this.updateCarriedExposure(deltaSeconds);
    if (this.getTrackedMovedArtifacts().some((artifact) => !this.isArtifactRestored(artifact))) {
      this.restoreHintElapsedSeconds += deltaSeconds;
      this.updateOriginMarkers();
    }
    this.updateAmbientFeedback(time, deltaSeconds);
    this.updateEncounterSystems(time, delta);
    this.updateDebugTools();

    if (this.activeInvestigation) {
      if (backpackPressed) {
        this.closeInvestigation();
        this.openBackpackMenu();
        return;
      }
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

    if (backpackPressed) {
      this.openBackpackMenu();
      return;
    }

    if (pausePressed) {
      openPauseMenu(this);
      return;
    }

    this.player.update();
    this.player.setAimAngle(lampAimAngle);
    this.player.setDepth(PLAYER_DEPTH_BASE + this.player.y / 1000);
    this.encounterSystem.updatePlayerPosition(this.player.x, this.player.y);
    this.updateNearestInteraction();

    if (escapePressed && this.shopkeeperMessage?.visible) {
      this.hideShopkeeperMessage();
      this.instructionText?.setVisible(true);
      this.escapeHintText?.setVisible(true);
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
      if (this.nearbyInteraction.kind === 'room-exploration') {
        this.exploreRoom(this.nearbyInteraction.point);
        return;
      }
      if (this.nearbyInteraction.kind === 'locked-exit') {
        this.inspectLockedExit();
        return;
      }
      if (this.nearbyInteraction.kind === 'cellar-hatch') {
        this.interactWithCellarHatch();
        return;
      }
      if (this.nearbyInteraction.kind === 'cellar-ladder') {
        this.switchTombMap('main');
        return;
      }
      if (this.nearbyInteraction.kind === 'cellar-atlas') {
        this.openCellarDiscovery();
        return;
      }
      if (this.nearbyInteraction.kind === 'corridor-mural') {
        this.openMuralDiscovery(this.nearbyInteraction.mural);
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
    this.tombSettlement = undefined;
    this.completionTransitionLocked = false;
    this.coffinState = 'sealed';
    this.carriedExposureSeconds = 0;
    this.exposureArtifactId = null;
    this.currentOmenLevel = 0;
    this.levelThreeShakeElapsed = 0;
    this.compassFeedbackSeconds = 0;
    this.currentTombMap = 'main';
    this.cellarHatchOpened = false;
    this.cellarTransitionActive = false;
    this.cellarAtlasDiscovered = false;
    this.cellarAtlasCollected = false;
    this.cellarDiscoveryActive = false;
    this.mainMapVeilWasVisible = false;
    this.carriedSlotTexts = [];
    this.restoreHintElapsedSeconds = 0;
    this.entranceSealTimer = undefined;
    this.ceremonialGate = undefined;
    this.corridorMurals = undefined;
    this.corridorMuralPrompts.clear();
    this.muralDiscoveryActive = false;
    this.backpackMenuActive = false;
    this.backpackSelectionIndex = 0;
    this.tombMapVeil = undefined;
    this.tombMapRevealed = false;
    this.entranceCrossed = false;
    this.roomExplorationPoints = [];
    this.exploredRoomIds.clear();
    this.lockedExitPrompt = undefined;
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
    // The player begins at the far end of the mural-lined burial passage.
    return new Player(
      this,
      EVACUATION_X,
      EVACUATION_Y,
      this.appearanceId,
    );
  }

  private createEntranceGate(obstacles: Phaser.Physics.Arcade.StaticGroup): void {
    this.ceremonialGate = createCeremonialTombGate(
      this,
      ENTRANCE_X,
      ENTRANCE_Y,
    );
    this.entranceGateVisual = this.ceremonialGate.container;

    this.entranceGateCollision = this.add.rectangle(
      ENTRANCE_X,
      ENTRANCE_Y,
      ENTRANCE_WIDTH * 2,
      34,
      0x000000,
      0,
    );
    obstacles.add(this.entranceGateCollision);

    this.exitPrompt = createStyleBoardPrompt(
      this,
      'E',
      'Leave Tomb / 离开墓穴',
      238,
      42,
    )
      .setPosition(EVACUATION_X, EVACUATION_Y - 62)
      .setDepth(8)
      .setVisible(false);

    this.lockedExitPrompt = createStyleBoardPrompt(
      this,
      'E',
      'Check Sealed Door / 检查封门',
      254,
      42,
    )
      .setPosition(ENTRANCE_X, ENTRANCE_Y - 76)
      .setDepth(8)
      .setVisible(false);
  }

  private createRoomExplorationPoints(): RoomExplorationPoint[] {
    const definitions: Array<Omit<RoomExplorationPoint, 'marker' | 'promptObject'>> = [
      {
        roomId: 'burial-chamber',
        englishName: 'Burial Chamber',
        chineseName: '主墓室',
        worldX: 914,
        worldY: 254,
        interactionRadius: 86,
      },
      {
        roomId: 'west-chamber',
        englishName: 'West Chamber',
        chineseName: '西耳室',
        worldX: 350,
        worldY: 520,
        interactionRadius: 86,
      },
      {
        roomId: 'south-chamber',
        englishName: 'South Chamber',
        chineseName: '南室',
        worldX: 800,
        worldY: 718,
        interactionRadius: 86,
      },
    ];

    return definitions
      .filter((definition) => definition.roomId !== 'burial-chamber')
      .map((definition) => {
      const marker = this.add.graphics().setDepth(2.18);
      this.drawRoomExplorationMarker(marker, definition.worldX, definition.worldY, false);
      const promptObject = createStyleBoardPrompt(
        this,
        'E',
        `Inspect ${definition.englishName} / 查看${definition.chineseName}`,
        276,
        42,
      )
        .setPosition(definition.worldX, definition.worldY - 58)
        .setDepth(8)
        .setVisible(false);
        return { ...definition, marker, promptObject };
      });
  }

  private drawRoomExplorationMarker(
    marker: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    completed: boolean,
  ): void {
    marker.clear();
    const color = completed ? 0x6f8764 : 0xb6894f;
    marker.fillStyle(0x17140f, completed ? 0.52 : 0.7);
    marker.fillCircle(x, y, 18);
    marker.lineStyle(2, color, completed ? 0.72 : 0.9);
    marker.strokeCircle(x, y, 18);
    marker.strokeCircle(x, y, 12);
    if (completed) {
      marker.lineBetween(x - 7, y, x - 2, y + 5);
      marker.lineBetween(x - 2, y + 5, x + 8, y - 7);
    } else {
      marker.lineBetween(x - 6, y, x + 6, y);
      marker.lineBetween(x, y - 6, x, y + 6);
    }
  }

  private exploreRoom(point: RoomExplorationPoint): void {
    this.completeRoomExploration(point.roomId);
  }

  private markOfferingRoomExplored(artifactId: string): void {
    if (artifactId === 'burial-vessel') {
      this.completeRoomExploration('central-offering-chamber');
    } else if (artifactId === 'bronze-mirror') {
      this.completeRoomExploration('east-offering-chamber');
    }
  }

  private completeRoomExploration(roomId: TombRoomId): void {
    if (this.exploredRoomIds.has(roomId)) {
      return;
    }
    this.exploredRoomIds.add(roomId);
    const point = this.roomExplorationPoints.find((candidate) => candidate.roomId === roomId);
    if (point) {
      point.promptObject.setVisible(false);
      this.drawRoomExplorationMarker(point.marker, point.worldX, point.worldY, true);
      this.tweens.add({
        targets: point.marker,
        alpha: { from: 0.35, to: 1 },
        duration: 320,
        ease: 'Sine.Out',
      });
    }
    this.proceduralAudio?.playCue('correct');
    this.updateRestoreProgressUI();
    const remaining = this.getRemainingRoomCount();
    if (remaining > 0) {
      this.updateObjectiveUI(
        `Chamber explored. ${remaining} ${remaining === 1 ? 'chamber remains' : 'chambers remain'}.`,
        `已完成一间墓室的探索，还需探索 ${remaining} 间。`,
      );
    }
    this.nearbyInteraction = undefined;
    this.evaluateDepartureReadiness();
  }

  private getRemainingRoomCount(): number {
    return Math.max(0, TOMB_ROOM_COUNT - this.exploredRoomIds.size);
  }

  private getUnrestoredMovedArtifactCount(): number {
    return this.getTrackedMovedArtifacts().filter(
      (artifact) => !this.isArtifactRestored(artifact),
    ).length;
  }

  private inspectLockedExit(): void {
    const remainingRooms = this.getRemainingRoomCount();
    const unrestoredObjects = this.getUnrestoredMovedArtifactCount();
    const missingCoreLoot = this.getMissingCoreLoot();
    const englishParts: string[] = [];
    const chineseParts: string[] = [];
    if (missingCoreLoot.length > 0) {
      englishParts.push(`recover ${missingCoreLoot.join(' and ')}`);
      chineseParts.push('取得风水罗盘与《万字藏图》');
    }
    if (remainingRooms > 0) {
      englishParts.push(
        `Explore ${remainingRooms} more ${remainingRooms === 1 ? 'chamber' : 'chambers'}`,
      );
      chineseParts.push(`还需探索并交互 ${remainingRooms} 间墓室`);
    }
    if (unrestoredObjects > 0) {
      englishParts.push(
        `restore ${unrestoredObjects} moved ${unrestoredObjects === 1 ? 'object' : 'objects'}`,
      );
      chineseParts.push(`还需归位 ${unrestoredObjects} 件被移动的器物`);
    }
    this.updateObjectiveUI(
      englishParts.length > 0
        ? `The sealed door will not open: ${englishParts.join(' and ')}.`
        : 'The door mechanism is responding. Step back and try again.',
      chineseParts.length > 0
        ? `封门尚未开启：${chineseParts.join('，并且')}。`
        : '封门机关正在响应，请退后再试。',
    );
    this.proceduralAudio?.playCue('door-reject');
    this.cameras.main.shake(90, 0.0012);
    this.ceremonialGate?.close(120);
  }

  private startEntranceSequence(): void {
    this.entranceSealTimer?.remove(false);
    this.entranceSealTimer = this.time.delayedCall(650, () => this.sealEntrance());
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
    this.activeLocationTitle?.container.destroy(true);
    this.activeLocationTitle = createTimedLocationTitle(this, {
      english: 'FENG SHUI MASTER\'S TOMB',
      chinese: '风水师墓',
    });
    this.activeLocationTitle.play();
    this.updateObjectiveUI(
      'Follow the mural passage. Approach the red gate at its far end.',
      '沿着壁画墓道前进，靠近尽头的朱漆墓门。',
    );
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.carryUI?.setVisible(true);
    this.locationTitleEnglish?.setVisible(true);
    this.locationTitleChinese?.setVisible(true);
    this.player?.setMovementEnabled(true);
  }

  private sealEntrance(): void {
    if (this.tutorialPhase !== 'entering' || !this.ceremonialGate) {
      return;
    }

    this.tutorialPhase = 'sealed';
    this.setEntranceCollisionEnabled(true);
    this.ceremonialGate.close(360, () => this.cameras.main.shake(90, 0.001));
    this.updateObjectiveUI(
      'Explore every burial chamber. Examine offerings where they stand; moved objects must be restored.',
      '探索全部墓室。有供物的墓室查看供物即可；若移动器物，必须将其归位。',
    );
    this.showShopkeeperMessage(
      'sealed',
      'The entrance is sealed. Search every chamber before you leave. Look before you touch.',
      '入口已经封上了。离开前要查看每一间墓室。动手之前，先看清楚。',
    );
  }

  private releaseEntrance(): void {
    this.setEntranceCollisionEnabled(false);
    this.lockedExitPrompt?.setVisible(false);
    this.ceremonialGate?.open(420);
  }

  private createTombMapVeil(): void {
    // This sits above the flashlight's additive cone. Until the threshold is
    // crossed, the chambers behind the gate remain absolute black rather than
    // becoming faintly visible through the beam.
    this.tombMapVeil = this.add
      .rectangle(800, (ENTRANCE_Y - 44) / 2, 1280, ENTRANCE_Y - 44, 0x000000, 1)
      .setDepth(7.02);
  }

  private updateCorridorEntrance(time: number): void {
    if (!this.player) {
      return;
    }
    this.ceremonialGate?.update(time);
    this.corridorMurals?.update(
      this.rippleVisibilityResolver,
      this.directionalLamp?.getBrightness() ?? 0,
    );

    const gateDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      ENTRANCE_X,
      ENTRANCE_Y,
    );
    const isNearGate = gateDistance <= GATE_FIRE_DISTANCE;
    this.ceremonialGate?.setGhostFireLit(isNearGate);
    if (!this.arrivalIntroductionActive && gateDistance <= 430) {
      this.locationTitleEnglish?.setVisible(false);
      this.locationTitleChinese?.setVisible(false);
    }

    if (
      this.tutorialPhase === 'entering' &&
      !this.entranceCrossed &&
      gateDistance <= GATE_OPEN_DISTANCE &&
      this.ceremonialGate?.getState() === 'closed'
    ) {
      this.ceremonialGate.open(430, () => this.setEntranceCollisionEnabled(false));
      this.proceduralAudio?.playCue('door-unlock');
    }

    if (
      this.tutorialPhase === 'entering' &&
      !this.entranceCrossed &&
      this.ceremonialGate?.getState() === 'open' &&
      this.player.y <= GATE_REVEAL_Y
    ) {
      this.entranceCrossed = true;
      this.revealTombMap();
      this.startEntranceSequence();
    }
  }

  private revealTombMap(): void {
    if (this.tombMapRevealed) {
      return;
    }
    this.tombMapRevealed = true;
    if (this.tombMapVeil) {
      const veil = this.tombMapVeil;
      this.tweens.add({
        targets: veil,
        alpha: 0,
        duration: 380,
        ease: 'Sine.Out',
        onComplete: () => {
          veil.destroy();
          if (this.tombMapVeil === veil) {
            this.tombMapVeil = undefined;
          }
        },
      });
    }
    this.updateObjectiveUI(
      'Explore every burial chamber. Chambers with offerings are counted when you examine the offering.',
      '探索全部墓室。有供物的墓室，需要查看供物才算完成探索。',
    );
  }

  private setEntranceCollisionEnabled(enabled: boolean): void {
    const gateBody = this.entranceGateCollision?.body as
      | Phaser.Physics.Arcade.StaticBody
      | undefined;
    if (!gateBody) {
      return;
    }
    gateBody.enable = enabled;
    if (enabled) {
      gateBody.updateFromGameObject();
    }
  }

  private cleanupTombScene(): void {
    this.entranceSealTimer?.remove(false);
    this.shopkeeperHideTimer?.remove(false);
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
    this.corridorMurals?.destroy();
    this.ceremonialGate?.destroy();
    this.tombMapVeil?.destroy();
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

    this.instructionText = this.add
      .text(
        width / 2,
        height - 44,
        'WASD  Move / 移动     E  Interact / 互动     TAB  Backpack / 背包',
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
      .text(32, height - 44, 'ESC  Pause / 暂停', {
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
    this.createBackpackMenu();
    this.createInvestigationPanel();
    this.createDepartureConfirmation();
    this.createDepartureResult();
  }

  private createObjectiveUI(): void {
    const contentLeft = -143;
    this.objectiveBackground = createStyleBoardPanel(this, 326, 92, 'thin', 0.88);
    const title = this.add
      .text(contentLeft, -34, 'OBJECTIVE  /  当前目标', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
         color: UI_STYLE_BOARD.colors.muted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.objectiveText = this.add
      .text(contentLeft, -14, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
         color: UI_STYLE_BOARD.colors.textBright,
        lineSpacing: -2,
        wordWrap: { width: 286 },
      })
      .setOrigin(0, 0);
    this.objectiveChineseText = this.add
      .text(contentLeft, 10, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
         color: UI_STYLE_BOARD.colors.text,
        wordWrap: { width: 286 },
      })
      .setOrigin(0, 0);

    this.restoreProgressText = this.add
      .text(contentLeft, 32, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
         color: '#d39a42',
        wordWrap: { width: 286 },
      })
      .setOrigin(0, 0);

    this.objectiveUI = this.add
      .container(181, 136, [
        this.objectiveBackground,
        title,
        this.objectiveText,
        this.objectiveChineseText,
        this.restoreProgressText,
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
        this.objectiveText.y + this.objectiveText.displayHeight + 3,
      );
      this.restoreProgressText?.setY(
        this.objectiveChineseText.y + this.objectiveChineseText.displayHeight + 5,
      );
    }
    this.updateRestoreProgressUI();
    this.resizeObjectivePanel();
    this.objectiveUI?.setVisible(true);
  }

  private resizeObjectivePanel(): void {
    if (!this.objectiveBackground || !this.objectiveUI || !this.objectiveText ||
        !this.objectiveChineseText || !this.restoreProgressText) {
      return;
    }
    const contentBottom = Math.max(
      this.objectiveChineseText.y + this.objectiveChineseText.displayHeight,
      this.restoreProgressText.visible
        ? this.restoreProgressText.y + this.restoreProgressText.displayHeight
        : 0,
    );
    const panelHeight = Math.max(92, (contentBottom + 12) * 2);
    drawStyleBoardPanel(this.objectiveBackground, 326, panelHeight, 'thin', 0.88);
    this.objectiveUI.setY(30 + panelHeight / 2);
  }

  private getTrackedMovedArtifacts(): InvestigableObject[] {
    return this.investigableObjects.filter(
      (artifact) =>
        artifact.portable &&
        artifact.id !== 'geomancers-compass' &&
        artifact.originalSpotId !== null &&
        artifact.hasBeenDisturbed,
    );
  }

  private isArtifactRestored(artifact: InvestigableObject): boolean {
    return artifact.locationState === 'world' &&
      artifact.displaySpotId === artifact.originalSpotId;
  }

  private updateRestoreProgressUI(): void {
    if (!this.restoreProgressText) {
      return;
    }
    const moved = this.getTrackedMovedArtifacts();
    const restored = moved.filter((artifact) => this.isArtifactRestored(artifact)).length;
    const explored = this.exploredRoomIds.size;
    const lines = [
      `EXPLORE CHAMBERS  ${explored}/${TOMB_ROOM_COUNT}  /  墓室 ${explored}/${TOMB_ROOM_COUNT}`,
    ];
    lines.push(
      `CORE RELICS  ${2 - this.getMissingCoreLoot().length}/2  /  核心物品 ${2 - this.getMissingCoreLoot().length}/2`,
    );
    if (moved.length > 0) {
      lines.push(
        `RESTORE MOVED OBJECTS  ${restored}/${moved.length}  /  归位 ${restored}/${moved.length}`,
      );
    }
    this.restoreProgressText
      .setVisible(true)
      .setText(lines.join('\n'));
    this.resizeObjectivePanel();
    this.updateOriginMarkers();
  }

  private updateOriginMarkers(): void {
    const carriedArtifacts = this.carrySystem.getCarriedArtifacts();
    const elapsed = this.restoreHintElapsedSeconds;
    for (const spot of this.artifactSpots) {
      const artifact = this.investigableObjects.find(
        (candidate) => candidate.originalSpotId === spot.spotId && candidate.hasBeenDisturbed,
      );
      const waiting = Boolean(artifact && !this.isArtifactRestored(artifact));
      const correspondingCarried = carriedArtifacts.some(
        (carried) => carried.originalSpotId === spot.spotId,
      );
      const alpha = correspondingCarried ? 0.82 : elapsed >= 35 ? 0.55 : 0.28;
      spot.originMarker?.setVisible(waiting).setAlpha(alpha).setScale(correspondingCarried ? 1.12 : 1);
    }
    for (const artifact of this.getTrackedMovedArtifacts()) {
      artifact.setTaskHighlight(
        !this.isArtifactRestored(artifact),
        elapsed >= 35 ? 0.62 : 0.32,
      );
    }
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
    const panelWidth = 292;
    const panelHeight = 126;
    const panelX = width - panelWidth / 2 - 28;
    const panelY = 168;

    const background = createStyleBoardPanel(this, panelWidth, panelHeight, 'standard', 0.96);

    this.carryCountText = this.add
      .text(-126, -46, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0, 0.5);

    this.carriedEnglishName = this.add
      .text(-96, 0, '', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0, 0.5);

    this.carriedChineseName = this.add
      .text(-96, 25, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: UI_STYLE_BOARD.colors.text,
      })
      .setOrigin(0, 0.5);

    const slotOne = createStyleBoardPanel(this, 252, 34, 'thin', 0.74).setY(-13);
    const slotTwo = createStyleBoardPanel(this, 252, 34, 'thin', 0.74).setY(31);
    this.carriedSlotTexts = [-13, 31].map((y, index) =>
      this.add
        .text(-116, y, `${index + 1}  EMPTY / 空`, {
          fontFamily: SANS_FONT,
          fontSize: '14px',
          color: UI_STYLE_BOARD.colors.muted,
        })
        .setOrigin(0, 0.5),
    );
    this.carriedEnglishName.setVisible(false);
    this.carriedChineseName.setVisible(false);

    this.carryUI = this.add
      .container(panelX, panelY, [
        background,
        this.carryCountText,
        slotOne,
        slotTwo,
        ...this.carriedSlotTexts,
      ])
      .setScrollFactor(0)
      .setDepth(15);

    this.updateCarryUI();
  }

  private updateCarryUI(): void {
    const carriedArtifacts = this.carrySystem.getCarriedArtifacts();
    this.carryCountText?.setText(
      `BACKPACK / 背包  ${carriedArtifacts.length} / ${this.carrySystem.capacity}   TAB`,
    );
    this.carriedSlotTexts.forEach((text, index) => {
      const artifact = carriedArtifacts[index];
      const inHand = artifact?.id === this.carrySystem.getActiveArtifactId();
      text.setText(
        artifact
          ? `${index + 1}  ${inHand ? '[HAND] ' : ''}${artifact.englishName} / ${artifact.chineseName}`
          : `${index + 1}  EMPTY / 空`,
      );
      text.setColor(inHand ? '#d4ad63' : artifact ? UI_STYLE_BOARD.colors.textBright : UI_STYLE_BOARD.colors.muted);
    });
    this.player?.setCarrying(Boolean(this.carrySystem.getCarriedArtifact()));
    if (this.backpackMenuActive) {
      this.updateBackpackMenu();
    }
  }

  private createBackpackMenu(): void {
    const { width, height } = this.scale;
    const scrim = this.add.rectangle(-width / 2, -height / 2, width, height, 0x070604, 0.82)
      .setOrigin(0);
    const background = createStyleBoardPanel(this, 820, 480, 'carved', 0.995);
    const title = this.add.text(-360, -196, 'BACKPACK', {
      fontFamily: SERIF_FONT, fontSize: '30px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.textBright,
    }).setOrigin(0, 0.5);
    const chineseTitle = this.add.text(-118, -194, '背包', {
      fontFamily: SERIF_FONT, fontSize: '22px', color: '#d4ad63',
    }).setOrigin(0, 0.5);
    this.backpackMenuCountText = this.add.text(354, -194, '', {
      fontFamily: SANS_FONT, fontSize: '15px', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(1, 0.5);

    const children: Phaser.GameObjects.GameObject[] = [scrim, background, title, chineseTitle, this.backpackMenuCountText];
    this.backpackMenuSlotPanels = [];
    this.backpackMenuSlotTexts = [];
    for (let index = 0; index < this.carrySystem.capacity; index += 1) {
      const y = -96 + index * 92;
      const panel = this.add.graphics().setPosition(-170, y);
      const text = this.add.text(-330, y, '', {
        fontFamily: SANS_FONT, fontSize: '17px', color: UI_STYLE_BOARD.colors.textBright,
      }).setOrigin(0, 0.5);
      panel
        .setInteractive(
          new Phaser.Geom.Rectangle(-178, -34, 356, 68),
          Phaser.Geom.Rectangle.Contains,
        )
        .on('pointerover', () => {
          if (!this.backpackMenuActive) return;
          this.backpackSelectionIndex = index;
          this.updateBackpackMenu();
        })
        .on('pointerdown', () => {
          if (!this.backpackMenuActive) return;
          this.backpackSelectionIndex = index;
          this.confirmBackpackSelection();
        });
      this.backpackMenuSlotPanels.push(panel);
      this.backpackMenuSlotTexts.push(text);
      children.push(panel, text);
    }

    const divider = this.add.rectangle(42, 18, 2, 310, 0x6f5736, 0.65);
    const detailLabel = this.add.text(76, -120, 'SELECTED ITEM / 当前器物', {
      fontFamily: SANS_FONT, fontSize: '13px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(0, 0.5);
    this.backpackMenuDetailName = this.add.text(76, -75, '', {
      fontFamily: SERIF_FONT, fontSize: '23px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.textBright,
      wordWrap: { width: 280 },
    }).setOrigin(0, 0.5);
    this.backpackMenuDetailChineseName = this.add.text(76, -36, '', {
      fontFamily: SERIF_FONT, fontSize: '18px', color: UI_STYLE_BOARD.colors.text,
    }).setOrigin(0, 0.5);
    this.backpackMenuDetailState = this.add.text(76, 10, '', {
      fontFamily: SANS_FONT, fontSize: '14px', fontStyle: 'bold', color: '#829879',
    }).setOrigin(0, 0.5);
    this.backpackMenuActionText = this.add.text(76, 78, '', {
      fontFamily: SANS_FONT, fontSize: '16px', fontStyle: 'bold', color: '#d4ad63',
      wordWrap: { width: 280 },
    }).setOrigin(0, 0.5);
    const navigation = this.add.text(-348, 192, 'W / S 或 1 / 2  选择     E  确认     TAB / ESC  关闭', {
      fontFamily: SANS_FONT, fontSize: '14px', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(0, 0.5);
    children.push(divider, detailLabel, this.backpackMenuDetailName, this.backpackMenuDetailChineseName,
      this.backpackMenuDetailState, this.backpackMenuActionText, navigation);
    this.backpackMenu = this.add.container(width / 2, height / 2, children)
      .setScrollFactor(0).setDepth(39).setVisible(false);
  }

  private updateBackpackMenu(): void {
    const artifacts = this.carrySystem.getCarriedArtifacts();
    this.backpackSelectionIndex = Phaser.Math.Clamp(this.backpackSelectionIndex, 0, this.carrySystem.capacity - 1);
    this.backpackMenuCountText?.setText(`${artifacts.length} / ${this.carrySystem.capacity}`);
    this.backpackMenuSlotPanels.forEach((panel, index) => {
      const selected = index === this.backpackSelectionIndex;
      drawStyleBoardPanel(panel, 356, 68, selected ? 'standard' : 'thin', selected ? 0.98 : 0.72);
      const artifact = artifacts[index];
      const inHand = artifact?.id === this.carrySystem.getActiveArtifactId();
      this.backpackMenuSlotTexts[index]?.setText(artifact
        ? `${index + 1}   ${artifact.englishName}\n     ${artifact.chineseName}${inHand ? '   [手持]' : ''}`
        : `${index + 1}   EMPTY / 空`)
        .setColor(selected ? '#f0d8a2' : artifact ? UI_STYLE_BOARD.colors.text : UI_STYLE_BOARD.colors.muted);
    });
    const selected = artifacts[this.backpackSelectionIndex];
    const inHand = selected?.id === this.carrySystem.getActiveArtifactId();
    const storedOnly = selected?.id === 'myriad-character-atlas';
    this.backpackMenuDetailName?.setText(selected?.englishName ?? 'EMPTY SLOT');
    this.backpackMenuDetailChineseName?.setText(selected?.chineseName ?? '空栏位');
    this.backpackMenuDetailState?.setText(
      selected ? storedOnly ? 'CORE RELIC / 核心物品' : inHand ? 'IN HAND / 当前手持' : 'STORED / 已收纳' : 'NO ITEM / 无物品',
    ).setColor(storedOnly ? '#8da58a' : inHand ? '#d4ad63' : '#829879');
    this.backpackMenuActionText?.setText(!selected ? '此栏位没有物品' : inHand
      ? 'E  STORE IN BACKPACK / 收回背包'
      : storedOnly ? 'PROTECTED — CANNOT BE LEFT HERE / 目标物品不可遗留'
      : 'E  HOLD THIS ITEM / 取出手持');
  }

  private openBackpackMenu(): void {
    if (!this.player || this.backpackMenuActive || !this.backpackMenu) return;
    this.backpackMenuActive = true;
    this.player.setMovementEnabled(false);
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    const activeIndex = this.carrySystem.getCarriedArtifacts()
      .findIndex((artifact) => artifact.id === this.carrySystem.getActiveArtifactId());
    this.backpackSelectionIndex = activeIndex >= 0 ? activeIndex : 0;
    this.updateBackpackMenu();
    this.backpackMenu.setVisible(true).setAlpha(0).setScale(0.97);
    this.tweens.add({
      targets: this.backpackMenu, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 180, ease: 'Cubic.Out',
    });
  }

  private closeBackpackMenu(): void {
    this.backpackMenuActive = false;
    this.backpackMenu?.setVisible(false);
    this.player?.setMovementEnabled(true);
    this.updateNearestInteraction();
  }

  private confirmBackpackSelection(): void {
    const artifact = this.carrySystem.getCarriedArtifacts()[this.backpackSelectionIndex];
    if (!artifact) {
      this.cameras.main.shake(80, 0.001);
      return;
    }
    if (artifact.id === 'myriad-character-atlas' && artifact.id !== this.carrySystem.getActiveArtifactId()) {
      this.cameras.main.shake(80, 0.001);
      return;
    }
    if (artifact.id === this.carrySystem.getActiveArtifactId()) {
      this.carrySystem.storeActiveArtifact();
    } else {
      this.carrySystem.selectArtifact(artifact.id);
    }
    this.player?.playCarryAction('pickup');
    this.updateCarryUI();
    this.closeBackpackMenu();
  }

  private createDepartureConfirmation(): void {
    const { width, height } = this.scale;
    const background = createStyleBoardPanel(this, 780, 400, 'carved', 0.99);
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
    const settlementNote = this.add
      .text(0, 28, 'The compass cloth also held a blank thread-bound book.\nThe shopkeeper may be able to read the coin-shaped trace in its dust.', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#b9ae95',
        align: 'center',
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5);
    const settlementNoteChinese = this.add
      .text(0, 88, '罗盘下的包布中还夹着一本空白线装册。\n归还供物时留下的圆形尘印，也许能让老板辨认出什么。', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#9da38b',
        align: 'center',
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5);
    const returnHint = this.add
      .text(0, 270, 'E / ESC  RETURN TO THE ANTIQUE SHOP / 返回古玩店', {
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
        settlementNote,
        settlementNoteChinese,
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
    this.backpackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.backpackUpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.backpackDownKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.backpackSlotOneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.backpackSlotTwoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    keyboard.on('keydown', this.ensureAudioStarted, this);
  }

  private drawTombGreybox(): void {
    this.createRefinedTombEnvironment();
    this.createChamberProps();
  }

  /**
   * Applies the authored art pass room-by-room so the visible architecture stays
   * locked to the original collision rectangles and doorway coordinates. The
   * underlying image is deliberately sliced instead of stretching the entire
   * concept map, which would move the side-room thresholds and escape route.
   */
  private createRefinedTombEnvironment(): void {
    this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x0b0a08,
      1,
    ).setDepth(0);

    const sourceTexture = this.textures.get(REFINED_TOMB_TEXTURE);
    const slices = [
      { key: 'north', source: [422, 28, 334, 262], target: [610, 20, 380, 300] },
      { key: 'north-link', source: [548, 278, 84, 60], target: [752, 288, 96, 94] },
      { key: 'west', source: [72, 335, 292, 223], target: [190, 410, 330, 210] },
      { key: 'central', source: [337, 291, 510, 287], target: [520, 350, 560, 280] },
      { key: 'east', source: [844, 335, 326, 223], target: [1080, 410, 330, 210] },
      { key: 'south', source: [455, 566, 276, 158], target: [640, 620, 320, 180] },
      { key: 'corridor', source: [422, 702, 314, 512], target: [640, 768, 320, 856] },
    ] as const;

    for (const slice of slices) {
      const frameName = `refined-${slice.key}`;
      if (!sourceTexture.has(frameName)) {
        sourceTexture.add(
          frameName,
          0,
          slice.source[0],
          slice.source[1],
          slice.source[2],
          slice.source[3],
        );
      }
      const [x, y, width, height] = slice.target;
      this.add
        .image(x, y, REFINED_TOMB_TEXTURE, frameName)
        .setOrigin(0, 0)
        .setDisplaySize(width, height)
        .setDepth(0.1);
    }

    // A restrained exact-coordinate line pass keeps door lips and walkable
    // transitions readable under the dynamic lantern without reviving the old
    // greybox grid.
    const thresholds = this.add.graphics().setDepth(0.22);
    thresholds.lineStyle(2, 0x8d6f43, 0.42);
    thresholds.lineBetween(752, 320, 848, 320);
    thresholds.lineBetween(520, 464, 520, 544);
    thresholds.lineBetween(1080, 464, 1080, 544);
    thresholds.lineBetween(752, 630, 848, 630);
    thresholds.lineBetween(752, 768, 848, 768);
    thresholds.lineBetween(752, 960, 848, 960);
  }

  private createHiddenCellar(obstacles: Phaser.Physics.Arcade.StaticGroup): void {
    const roomTexture = this.textures.get(CELLAR_ROOM_TEXTURE);
    if (!roomTexture.has('cellar-room-crop')) {
      roomTexture.add('cellar-room-crop', 0, 145, 90, 960, 1065);
    }
    this.add
      .image(CELLAR_ROOM.x, CELLAR_ROOM.y, CELLAR_ROOM_TEXTURE, 'cellar-room-crop')
      .setOrigin(0, 0)
      .setDisplaySize(CELLAR_ROOM.width, CELLAR_ROOM.height)
      .setDepth(0.12);

    this.cellarAtmosphere = this.add.graphics().setDepth(0.24);
    this.cellarAtmosphere.fillStyle(0x2c817b, 0.055);
    this.cellarAtmosphere.fillEllipse(CELLAR_CENTER_X, CELLAR_ROOM.y + 270, 620, 420);
    this.cellarAtmosphere.lineStyle(1, 0x75b9ac, 0.14);
    for (let index = 0; index < 7; index += 1) {
      const inset = 42 + index * 18;
      this.cellarAtmosphere.strokeRoundedRect(
        CELLAR_ROOM.x + inset,
        CELLAR_ROOM.y + inset * 0.7,
        CELLAR_ROOM.width - inset * 2,
        CELLAR_ROOM.height - inset * 1.35,
        18,
      );
    }

    const wall = 36;
    this.addStaticObstacle(
      obstacles,
      CELLAR_CENTER_X,
      CELLAR_ROOM.y + wall / 2,
      CELLAR_ROOM.width,
      wall,
    );
    this.addStaticObstacle(
      obstacles,
      CELLAR_CENTER_X,
      CELLAR_ROOM.y + CELLAR_ROOM.height - wall / 2,
      CELLAR_ROOM.width,
      wall,
    );
    this.addStaticObstacle(
      obstacles,
      CELLAR_ROOM.x + wall / 2,
      CELLAR_ROOM.y + CELLAR_ROOM.height / 2,
      wall,
      CELLAR_ROOM.height,
    );
    this.addStaticObstacle(
      obstacles,
      CELLAR_ROOM.x + CELLAR_ROOM.width - wall / 2,
      CELLAR_ROOM.y + CELLAR_ROOM.height / 2,
      wall,
      CELLAR_ROOM.height,
    );

    this.cellarHatchClosed = this.add
      .image(CELLAR_HATCH_X, CELLAR_HATCH_Y, CELLAR_PROPS_TEXTURE, 'hatch-closed')
      .setDisplaySize(104, 92)
      .setDepth(1.74);
    this.cellarHatchOpen = this.add
      .image(CELLAR_HATCH_X, CELLAR_HATCH_Y - 4, CELLAR_PROPS_TEXTURE, 'hatch-open')
      .setDisplaySize(116, 108)
      .setDepth(1.75)
      .setVisible(false);
    this.cellarHatchPrompt = createStyleBoardPrompt(
      this,
      'E',
      'Open Cellar Hatch / 打开地窖门',
      300,
      44,
    )
      .setPosition(CELLAR_HATCH_X, CELLAR_HATCH_Y - 82)
      .setDepth(8)
      .setVisible(false);

    this.add
      .image(CELLAR_CENTER_X, CELLAR_LADDER_Y, CELLAR_PROPS_TEXTURE, 'ladder')
      .setDisplaySize(102, 106)
      .setDepth(this.getSceneryDepth(CELLAR_LADDER_Y));
    this.cellarLadderPrompt = createStyleBoardPrompt(
      this,
      'E',
      'Climb to Burial Chamber / 爬回主墓室',
      318,
      44,
    )
      .setPosition(CELLAR_CENTER_X, CELLAR_LADDER_Y - 84)
      .setDepth(8)
      .setVisible(false);

    this.cellarAtlasPrompt = createStyleBoardPrompt(
      this,
      'E',
      'Examine the Atlas / 查看万字藏图',
      292,
      44,
    )
      .setPosition(CELLAR_CENTER_X, CELLAR_ATLAS_Y - 104)
      .setDepth(8)
      .setVisible(false);

    const noticeBackground = createStyleBoardPanel(this, 660, 112, 'carved', 0.98);
    const noticeTitle = this.add
      .text(-288, -32, 'A HOLLOW SPACE ANSWERS', {
        fontFamily: SERIF_FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0, 0.5);
    const noticeBody = this.add
      .text(-288, 8, 'Cold air rises between the boards. The ladder descends beyond the drawn tomb plan.\n木板下涌出冷气。梯子通向墓图上不存在的空间。', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: UI_STYLE_BOARD.colors.text,
        lineSpacing: 5,
      })
      .setOrigin(0, 0.5);
    this.cellarEntryNotice = this.add
      .container(this.scale.width / 2, this.scale.height - 112, [
        noticeBackground,
        noticeTitle,
        noticeBody,
      ])
      .setScrollFactor(0)
      .setDepth(32)
      .setVisible(false);
  }

  private createCellarDiscoveryPanel(): void {
    const { width, height } = this.scale;
    const background = createStyleBoardPanel(this, 880, 450, 'carved', 0.995);
    const anomalyBand = this.add.rectangle(-382, 0, 5, 390, 0x486d55, 0.95);
    const previewFrame = createStyleBoardPanel(this, 230, 280, 'standard', 0.88).setX(-248);
    const preview = this.add
      .image(-248, 2, CELLAR_PROPS_TEXTURE, 'atlas')
      .setDisplaySize(150, 190);
    const title = this.add
      .text(-90, -176, 'MYRIAD CHARACTER ATLAS', {
        fontFamily: SERIF_FONT,
        fontSize: '27px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-90, -137, '万字藏图', {
        fontFamily: SERIF_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#a9c5ae',
      })
      .setOrigin(0, 0.5);
    const body = this.add
      .text(
        -90,
        -84,
        'The paper is dry. The cellar is not.\nRoutes appear only when the compass needle turns away.\n\n纸页干燥，地窖却潮湿。\n当罗盘指针偏离时，图上的路线才会浮现。',
        {
          fontFamily: SANS_FONT,
          fontSize: '16px',
          color: UI_STYLE_BOARD.colors.text,
          lineSpacing: 8,
          wordWrap: { width: 430 },
        },
      )
      .setOrigin(0, 0);
    this.cellarDiscoveryAction = this.add
      .text(-90, 164, 'E  STORE IN BACKPACK  /  收入背包', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#d4ad63',
      })
      .setOrigin(0, 0.5);
    const close = this.add
      .text(390, 194, 'ESC  Close / 关闭', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(1, 0.5);
    this.cellarDiscoveryPanel = this.add
      .container(width / 2, height / 2, [
        background,
        anomalyBand,
        previewFrame,
        preview,
        title,
        chineseTitle,
        body,
        this.cellarDiscoveryAction,
        close,
      ])
      .setScrollFactor(0)
      .setDepth(36)
      .setVisible(false);
  }

  private createCorridorMuralInteractions(): void {
    for (const mural of this.corridorMurals?.getPanels() ?? []) {
      const prompt = createStyleBoardPrompt(
        this,
        'E',
        `View Mural / 细看${mural.chineseName}`,
        260,
        42,
      )
        .setPosition(mural.worldX < ROOM_CENTER_X ? 704 : 896, mural.worldY - 74)
        .setDepth(8)
        .setVisible(false);
      this.corridorMuralPrompts.set(mural.id, prompt);
    }
  }

  private createMuralDiscoveryPanel(): void {
    const { width, height } = this.scale;
    const scrim = this.add.rectangle(-width / 2, -height / 2, width, height, 0x080706, 0.86)
      .setOrigin(0);
    const background = createStyleBoardPanel(this, 940, 620, 'carved', 0.995);
    const previewFrame = createStyleBoardPanel(this, 390, 520, 'standard', 0.92).setX(-242);
    this.muralDiscoveryPreview = this.add
      .image(-242, -8, CORRIDOR_MURAL_TEXTURES.leftUpper)
      .setDisplaySize(222, 472);
    this.muralDiscoveryEnglishTitle = this.add.text(0, -246, '', {
      fontFamily: SERIF_FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.textBright,
    }).setOrigin(0, 0.5);
    this.muralDiscoveryChineseTitle = this.add.text(0, -208, '', {
      fontFamily: SERIF_FONT,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#d4ad63',
    }).setOrigin(0, 0.5);
    const rule = this.add.rectangle(0, -178, 360, 2, 0x8b6a3d, 0.72).setOrigin(0, 0.5);
    this.muralDiscoveryEnglishBody = this.add.text(0, -148, '', {
      fontFamily: SANS_FONT,
      fontSize: '17px',
      color: UI_STYLE_BOARD.colors.text,
      lineSpacing: 7,
      wordWrap: { width: 360 },
    }).setOrigin(0, 0);
    this.muralDiscoveryChineseBody = this.add.text(0, 24, '', {
      fontFamily: SANS_FONT,
      fontSize: '17px',
      color: '#c8b99b',
      lineSpacing: 8,
      wordWrap: { width: 360 },
    }).setOrigin(0, 0);
    const hint = this.add.text(406, 274, 'E / ESC  收起壁画', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(1, 0.5);
    this.muralDiscoveryPanel = this.add.container(width / 2, height / 2, [
      scrim,
      background,
      previewFrame,
      this.muralDiscoveryPreview,
      this.muralDiscoveryEnglishTitle,
      this.muralDiscoveryChineseTitle,
      rule,
      this.muralDiscoveryEnglishBody,
      this.muralDiscoveryChineseBody,
      hint,
    ]).setScrollFactor(0).setDepth(37).setVisible(false);
  }

  private openMuralDiscovery(mural: TombCorridorMuralPanel): void {
    if (!this.player || !this.muralDiscoveryPanel || this.muralDiscoveryActive) {
      return;
    }
    this.muralDiscoveryActive = true;
    this.player.setMovementEnabled(false);
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    this.muralDiscoveryPreview?.setTexture(mural.textureKey);
    this.muralDiscoveryEnglishTitle?.setText(mural.englishName.toUpperCase());
    this.muralDiscoveryChineseTitle?.setText(mural.chineseName);
    this.muralDiscoveryEnglishBody?.setText(mural.description);
    this.muralDiscoveryChineseBody?.setText(mural.chineseDescription);
    this.muralDiscoveryPanel.setVisible(true).setAlpha(0).setScale(0.97);
    this.tweens.add({
      targets: this.muralDiscoveryPanel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Cubic.Out',
    });
    this.proceduralAudio?.playCue('correct');
  }

  private closeMuralDiscovery(): void {
    this.muralDiscoveryActive = false;
    this.muralDiscoveryPanel?.setVisible(false);
    this.player?.setMovementEnabled(true);
    this.updateNearestInteraction();
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
    floor.fillRect(
      CORRIDOR_FLOOR_LEFT,
      ENTRANCE_Y,
      CORRIDOR_FLOOR_RIGHT - CORRIDOR_FLOOR_LEFT,
      CORRIDOR_BOTTOM - ENTRANCE_Y,
    );
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
      {
        x: CORRIDOR_FLOOR_LEFT,
        y: ENTRANCE_Y,
        width: CORRIDOR_FLOOR_RIGHT - CORRIDOR_FLOOR_LEFT,
        height: CORRIDOR_BOTTOM - ENTRANCE_Y,
      },
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

    // Long processional burial passage: narrow stone courses draw the eye to
    // the ceremonial gate while keeping the central walking lane unobstructed.
    details.lineStyle(1, 0x879082, 0.25);
    for (let x = CORRIDOR_FLOOR_LEFT; x <= CORRIDOR_FLOOR_RIGHT; x += GRID_SIZE) {
      details.lineBetween(x, ENTRANCE_Y, x, CORRIDOR_BOTTOM);
    }
    for (let y = ENTRANCE_Y; y <= CORRIDOR_BOTTOM; y += GRID_SIZE) {
      details.lineBetween(CORRIDOR_FLOOR_LEFT, y, CORRIDOR_FLOOR_RIGHT, y);
    }
    details.lineStyle(2, 0x9a8666, 0.27);
    details.lineBetween(708, ENTRANCE_Y, 708, CORRIDOR_BOTTOM);
    details.lineBetween(892, ENTRANCE_Y, 892, CORRIDOR_BOTTOM);
    for (let y = 1016; y < CORRIDOR_BOTTOM; y += 112) {
      details.lineBetween(708, y, 892, y);
    }

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
      { x: CORRIDOR_LEFT, y: ENTRANCE_Y, width: 48, height: CORRIDOR_BOTTOM - ENTRANCE_Y },
      { x: CORRIDOR_FLOOR_RIGHT, y: ENTRANCE_Y, width: 48, height: CORRIDOR_BOTTOM - ENTRANCE_Y },
      { x: CORRIDOR_LEFT, y: CORRIDOR_BOTTOM - 32, width: 744 - CORRIDOR_LEFT, height: 32 },
      { x: 856, y: CORRIDOR_BOTTOM - 32, width: CORRIDOR_RIGHT - 856, height: 32 },
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
      {
        x: CORRIDOR_FLOOR_LEFT,
        y: ENTRANCE_Y,
        width: CORRIDOR_FLOOR_RIGHT - CORRIDOR_FLOOR_LEFT,
        height: CORRIDOR_BOTTOM - ENTRANCE_Y,
      },
    ];
  }

  private createChamberProps(): void {
    // Main coffin chamber: tall funerary columns and a restrained ring of grave goods.
    this.createTombProp(680, 154, 'pillar-a');
    this.createTombProp(920, 154, 'pillar-b');
    this.createTombProp(680, 258, 'urn-green');
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
      return createStyleBoardPrompt(this, 'E', 'Place / 放置', 176, 42)
        .setPosition(x, y + offsetY)
        .setDepth(8)
        .setVisible(false);
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

    const createOriginMarker = (
      x: number,
      y: number,
      shape: 'circle' | 'mirror',
    ): Phaser.GameObjects.Container => {
      const glow = this.add.graphics();
      glow.fillStyle(0xb9ad87, 0.08);
      glow.lineStyle(2, 0xc5b88f, 0.72);
      if (shape === 'mirror') {
        glow.fillRoundedRect(-43, -49, 86, 98, 8);
        glow.strokeRoundedRect(-43, -49, 86, 98, 8);
      } else {
        glow.fillCircle(0, 0, 38);
        glow.strokeCircle(0, 0, 38);
        glow.lineStyle(1, 0xd5caa6, 0.46);
        glow.strokeCircle(0, 0, 26);
      }
      const label = this.add
        .text(0, shape === 'mirror' ? 66 : 50, 'ORIGINAL PLACE / 原位', {
          fontFamily: SANS_FONT,
          fontSize: '11px',
          color: '#d2c59f',
          backgroundColor: '#11120ecc',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5);
      return this.add
        .container(x, y, [glow, label])
        .setDepth(3.7)
        .setVisible(false);
    };

    const vesselOriginMarker = createOriginMarker(
      OFFERING_CORRECT_X,
      OFFERING_CORRECT_Y,
      'circle',
    );
    const mirrorOriginMarker = createOriginMarker(
      RIGHT_PROP_X,
      PROP_Y,
      'mirror',
    );

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
        originMarker: vesselOriginMarker,
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
        originMarker: mirrorOriginMarker,
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
    const atlasObject = this.createCellarAtlasVisual(CELLAR_CENTER_X, CELLAR_ATLAS_Y);
    const vesselData = ARTIFACT_DEFINITIONS['burial-vessel'];
    const mirrorData = ARTIFACT_DEFINITIONS['bronze-mirror'];
    const compassData = ARTIFACT_DEFINITIONS['geomancers-compass'];
    const atlasData = ARTIFACT_DEFINITIONS['myriad-character-atlas'];

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
        promptOffsetY: -116,
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
        promptOffsetY: -128,
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
        promptOffsetY: -72,
        visualObject: compassObject.container,
        highlightObject: compassObject.highlight,
      }),
      new InvestigableObject(this, {
        id: atlasData.id,
        englishName: atlasData.englishName,
        chineseName: atlasData.chineseName,
        description: atlasData.description,
        chineseDescription: atlasData.chineseDescription,
        portable: true,
        hiddenValue: atlasData.hiddenValue,
        appraisalText: atlasData.appraisalText,
        chineseAppraisalText: atlasData.chineseAppraisalText,
        omenTier: atlasData.omenTier,
        originalSpotId: atlasData.originalSpotId,
        hasBeenDisturbed: false,
        worldX: CELLAR_CENTER_X,
        worldY: CELLAR_ATLAS_Y,
        interactionRadius: 110,
        locationState: 'world',
        displaySpotId: 'hidden-cellar-pedestal',
        promptOffsetY: -92,
        visualObject: atlasObject.container,
        highlightObject: atlasObject.highlight,
      }),
    ];
  }

  private createCellarAtlasVisual(
    x: number,
    y: number,
  ): { container: Phaser.GameObjects.Container; highlight: Phaser.GameObjects.Graphics } {
    const aura = this.add.graphics();
    aura.fillStyle(0x3c8f86, 0.12);
    aura.fillEllipse(0, 4, 128, 60);
    const atlas = this.add
      .image(0, 0, CELLAR_PROPS_TEXTURE, 'atlas')
      .setDisplaySize(48, 59)
      .setOrigin(0.5, 0.82);
    const highlight = this.add.graphics();
    highlight.lineStyle(2, 0x79b6a6, 0.88);
    highlight.strokeRoundedRect(-31, -53, 62, 61, 9);
    const container = this.add
      .container(x, y, [aura, atlas, highlight])
      .setDepth(this.getSceneryDepth(y) + 0.3);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.42, to: 1 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return { container, highlight };
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
    shadow.fillEllipse(0, 3, 58, 18);
    const vessel = this.add
      .image(0, 0, ORIGINAL_ARTIFACT_TEXTURES.burialVessel)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(65, 96);

    const highlight = this.add.graphics();
    highlight.lineStyle(2, 0xc2b58f, 0.76);
    highlight.strokeRoundedRect(-37, -95, 74, 101, 10);

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
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0b0d0b, 0.4);
    shadow.fillEllipse(0, 3, 72, 20);
    const mirror = this.add
      .image(0, 0, ORIGINAL_ARTIFACT_TEXTURES.bronzeMirror)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(82, 112);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xc2b58f, 0.7);
    highlight.strokeRoundedRect(-45, -111, 90, 118, 12);

    return {
      container: this.add
        .container(x, y, [shadow, mirror, highlight])
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
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0b0d0b, 0.36);
    shadow.fillEllipse(0, 7, 68, 18);
    const compass = this.add
      .image(0, 0, ORIGINAL_ARTIFACT_TEXTURES.geomancersCompass)
      .setOrigin(0.5, 0.84)
      .setDisplaySize(78, 68);

    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xc2b58f, 0.72);
    highlight.strokeRoundedRect(-43, -58, 86, 72, 8);

    const container = this.add
      .container(x, y, [shadow, compass, highlight])
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
      if (artifact.id === 'myriad-character-atlas') {
        continue;
      }
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

    if (
      Boolean(this.carrySystem.getCarriedArtifact()) &&
      this.carrySystem.getCarriedArtifact()?.id !== 'myriad-character-atlas'
    ) {
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

    for (const point of this.roomExplorationPoints) {
      if (this.exploredRoomIds.has(point.roomId)) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        point.worldX,
        point.worldY,
      );
      if (
        distance <= point.interactionRadius * TOMB_FEEL.interaction.radiusMultiplier &&
        this.isInteractionVisible(point.worldX, point.worldY)
      ) {
        candidates.push({
          kind: 'room-exploration',
          stableId: point.roomId,
          distance: this.getInteractionScore(
            point.worldX,
            point.worldY,
            distance,
          ),
          point,
        });
      }
    }

    if (
      this.tombMapRevealed &&
      this.tutorialPhase !== 'entering' &&
      this.tutorialPhase !== 'objective-complete'
    ) {
      const lockedExitDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        ENTRANCE_X,
        ENTRANCE_Y - 28,
      );
      if (lockedExitDistance <= EXIT_INTERACTION_RADIUS) {
        candidates.push({
          kind: 'locked-exit',
          stableId: 'locked-tomb-exit',
          distance: lockedExitDistance,
        });
      }
    }

    if (this.tutorialPhase === 'objective-complete') {
        const exitDistance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          EVACUATION_X,
          EVACUATION_Y,
        );
        if (
          exitDistance <=
            EXIT_INTERACTION_RADIUS * TOMB_FEEL.interaction.radiusMultiplier &&
          this.isInteractionVisible(EVACUATION_X, EVACUATION_Y)
      ) {
        candidates.push({
          kind: 'exit',
          stableId: 'tomb-exit',
          distance: exitDistance,
        });
      }
    }

    if (this.currentTombMap === 'main') {
      for (const mural of this.corridorMurals?.getPanels() ?? []) {
        const interactionX = mural.worldX < ROOM_CENTER_X ? 684 : 916;
        const muralDistance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          interactionX,
          mural.worldY,
        );
        if (muralDistance <= 104 * TOMB_FEEL.interaction.radiusMultiplier) {
          candidates.push({
            kind: 'corridor-mural',
            stableId: `corridor-mural-${mural.id}`,
            distance: muralDistance,
            mural,
          });
        }
      }
      const hatchDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        CELLAR_HATCH_X,
        CELLAR_HATCH_Y,
      );
      if (
        hatchDistance <= 112 * TOMB_FEEL.interaction.radiusMultiplier &&
        this.isInteractionVisible(CELLAR_HATCH_X, CELLAR_HATCH_Y)
      ) {
        candidates.push({
          kind: 'cellar-hatch',
          stableId: 'hidden-cellar-hatch',
          distance: this.getInteractionScore(CELLAR_HATCH_X, CELLAR_HATCH_Y, hatchDistance),
        });
      }
    } else {
      const ladderDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        CELLAR_CENTER_X,
        CELLAR_LADDER_Y,
      );
      if (ladderDistance <= 112 * TOMB_FEEL.interaction.radiusMultiplier) {
        candidates.push({
          kind: 'cellar-ladder',
          stableId: 'hidden-cellar-ladder',
          distance: ladderDistance,
        });
      }
      if (!this.cellarAtlasCollected) {
        const atlasDistance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          CELLAR_CENTER_X,
          CELLAR_ATLAS_Y,
        );
        if (
          atlasDistance <= 118 * TOMB_FEEL.interaction.radiusMultiplier &&
          this.isInteractionVisible(CELLAR_CENTER_X, CELLAR_ATLAS_Y)
        ) {
          candidates.push({
            kind: 'cellar-atlas',
            stableId: 'myriad-character-atlas',
            distance: this.getInteractionScore(CELLAR_CENTER_X, CELLAR_ATLAS_Y, atlasDistance),
          });
        }
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

    for (const point of this.roomExplorationPoints) {
      point.promptObject.setVisible(
        this.nearbyInteraction?.kind === 'room-exploration' &&
          this.nearbyInteraction.point === point &&
          !this.activeInvestigation,
      );
    }

    this.lockedExitPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'locked-exit' &&
        !this.activeInvestigation &&
        this.tutorialPhase !== 'objective-complete',
    );

    this.exitPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'exit' &&
        !this.activeInvestigation &&
        this.tutorialPhase === 'objective-complete',
    );
    this.cellarHatchPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'cellar-hatch' &&
        !this.activeInvestigation &&
        !this.cellarDiscoveryActive,
    );
    this.cellarLadderPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'cellar-ladder' && !this.cellarDiscoveryActive,
    );
    this.cellarAtlasPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'cellar-atlas' && !this.cellarDiscoveryActive,
    );
    for (const [muralId, prompt] of this.corridorMuralPrompts) {
      prompt.setVisible(
        this.nearbyInteraction?.kind === 'corridor-mural' &&
          this.nearbyInteraction.mural.id === muralId &&
          !this.muralDiscoveryActive &&
          !this.activeInvestigation,
      );
    }
  }

  private createInvestigationPanel(): void {
    const { width, height } = this.scale;
    const panelWidth = 940;
    const panelHeight = 480;

    const background = createStyleBoardPanel(this, panelWidth, panelHeight, 'carved', 0.98);

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
      .text(-430, 136, '', {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ded4b7',
      })
      .setOrigin(0, 0.5);

    this.panelSwapDescription = this.add
      .text(-430, 160, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#a9a089',
        wordWrap: { width: 860 },
      })
      .setOrigin(0, 0);
    this.panelSwapChineseDescription = this.add
      .text(-430, 187, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#877f70',
        wordWrap: { width: 860 },
      })
      .setOrigin(0, 0);

    const closeHint = this.add
      .text(430, 220, 'TAB  BACKPACK / 背包     ESC  CLOSE / 关闭', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#8f846e',
      })
      .setOrigin(1, 0.5);

    this.investigationPanel = this.add
      .container(width / 2, height - 250, [
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
    this.openInvestigation(artifact);
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
    this.markOfferingRoomExplored(investigableObject.id);
    this.nearbyInteraction = undefined;
    this.player.setMovementEnabled(false);

    for (const object of this.investigableObjects) {
      object.setNearby(false);
    }
    for (const spot of this.artifactSpots) {
      spot.promptObject.setVisible(false);
    }
    for (const point of this.roomExplorationPoints) {
      point.promptObject.setVisible(false);
    }
    this.lockedExitPrompt?.setVisible(false);
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
    if (this.carrySystem.isFull()) {
      this.panelCarryAction.setText('TAB  MANAGE BACKPACK / 整理背包');
      this.panelSwapDescription.setText(
        'The backpack is full. Select an optional relic, hold it, then restore it to a display spot.',
      );
      this.panelSwapChineseDescription.setText(
        `背包已满。按 TAB 选择要归还的器物，取出手持后放回对应位置。${carriedArtifact ? ` 当前手持：${carriedArtifact.chineseName}` : ''}`,
      );
      return;
    }
    if (!carriedArtifact || !this.carrySystem.isFull()) {
      this.panelCarryAction.setText('E  Take / 拿取');
      this.panelSwapDescription.setText('');
      this.panelSwapChineseDescription.setText('');
      return;
    }

    this.panelCarryAction.setText('E  Swap / 交换');
    if (
      carriedArtifact?.id === 'myriad-character-atlas' ||
      artifact.id === 'geomancers-compass' &&
        this.carrySystem.hasArtifact('myriad-character-atlas')
    ) {
      this.panelCarryAction.setText('BACKPACK FULL / 背包已满');
      this.panelSwapDescription.setText(
        'The Atlas cannot be left in the tomb. Restore an optional relic before taking this item.',
      );
      this.panelSwapChineseDescription.setText('请先归还一件非目标器物；《万字藏图》不能留在墓中。');
      return;
    }

    this.panelSwapDescription.setText(
      `Leave ${carriedArtifact?.englishName ?? 'the active relic'} here and take ${artifact.englishName}.`,
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

  private interactWithCellarHatch(): void {
    if (!this.player || this.cellarTransitionActive) {
      return;
    }
    if (this.cellarHatchOpened) {
      this.switchTombMap('cellar');
      return;
    }

    this.cellarHatchOpened = true;
    this.nearbyInteraction = undefined;
    this.player.setMovementEnabled(false);
    this.cellarHatchPrompt?.setVisible(false);
    this.cellarHatchClosed?.setVisible(false);
    this.cellarHatchOpen
      ?.setVisible(true)
      .setAlpha(0)
      .setAngle(-5);
    this.tweens.add({
      targets: this.cellarHatchOpen,
      alpha: 1,
      angle: 0,
      duration: 460,
      ease: 'Back.Out',
      onComplete: () => {
        this.player?.setMovementEnabled(true);
        const label = this.cellarHatchPrompt?.getData('label') as Phaser.GameObjects.Text | undefined;
        label?.setText('Descend / 下到隐藏墓室');
        this.updateNearestInteraction();
      },
    });
    this.cellarEntryNotice?.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.cellarEntryNotice,
      alpha: 1,
      duration: 240,
      yoyo: true,
      hold: 2300,
      onComplete: () => this.cellarEntryNotice?.setVisible(false),
    });
    this.completeRoomExploration('burial-chamber');
    this.proceduralAudio?.playCue('door-unlock');
    this.updateObjectiveUI(
      'A hidden cellar lies beneath the burial chamber. Descend and find what the geomancer concealed.',
      '主墓室下方出现了隐藏地窖。下去寻找风水师藏起来的东西。',
    );
  }

  private switchTombMap(destination: 'main' | 'cellar'): void {
    if (!this.player || this.cellarTransitionActive || destination === this.currentTombMap) {
      return;
    }
    this.cellarTransitionActive = true;
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    this.player.setMovementEnabled(false);
    this.cellarEntryNotice?.setVisible(false);
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.time.delayedCall(440, () => {
      if (!this.player) {
        return;
      }
      this.currentTombMap = destination;
      if (destination === 'cellar') {
        this.mainMapVeilWasVisible = Boolean(this.tombMapVeil?.visible);
        this.tombMapVeil?.setVisible(false);
        this.player.setPosition(CELLAR_CENTER_X, CELLAR_LADDER_Y - 72);
        (this.player.body as Phaser.Physics.Arcade.Body | null)?.reset(
          CELLAR_CENTER_X,
          CELLAR_LADDER_Y - 72,
        );
        this.cameras.main.setBounds(
          CELLAR_CENTER_X - this.scale.width / 2,
          CELLAR_ROOM.y + CELLAR_ROOM.height / 2 - this.scale.height / 2,
          this.scale.width,
          this.scale.height,
        );
        this.updateObjectiveUI(
          this.cellarAtlasCollected
            ? 'Return by the ladder with the Myriad Character Atlas.'
            : 'Search the hidden cellar. The northern pedestal is unnaturally dry.',
          this.cellarAtlasCollected
            ? '带着《万字藏图》从梯子返回主墓室。'
            : '搜索隐藏墓室。北侧石台干燥得不合常理。',
        );
        this.activeLocationTitle?.container.destroy(true);
        this.activeLocationTitle = createTimedLocationTitle(this, {
          english: 'THE HIDDEN CELLAR',
          chinese: '隐墓地窖',
          width: 520,
        });
        this.activeLocationTitle.play();
      } else {
        this.player.setPosition(CELLAR_HATCH_X - 64, CELLAR_HATCH_Y + 6);
        (this.player.body as Phaser.Physics.Arcade.Body | null)?.reset(
          CELLAR_HATCH_X - 64,
          CELLAR_HATCH_Y + 6,
        );
        this.configureCamera();
        this.tombMapVeil?.setVisible(this.mainMapVeilWasVisible);
        this.updateCoreLootObjective();
      }
      this.cameras.main.startFollow(
        this.player,
        true,
        TOMB_FEEL.camera.followLerpX,
        TOMB_FEEL.camera.followLerpY,
      );
      this.cameras.main.fadeIn(460, 0, 0, 0);
      this.time.delayedCall(480, () => {
        this.cellarTransitionActive = false;
        this.player?.setMovementEnabled(true);
        this.updateNearestInteraction();
      });
    });
  }

  private openCellarDiscovery(): void {
    if (!this.player || this.cellarAtlasCollected || !this.cellarDiscoveryPanel) {
      return;
    }
    this.cellarAtlasDiscovered = true;
    this.cellarDiscoveryActive = true;
    this.player.setMovementEnabled(false);
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    this.cellarDiscoveryAction?.setText(
      this.carrySystem.isFull()
        ? 'TAB  MANAGE BACKPACK — RESTORE AN OPTIONAL RELIC / 背包已满，先整理背包'
        : 'E  STORE IN BACKPACK  /  收入背包',
    );
    this.cellarDiscoveryPanel.setVisible(true).setAlpha(0).setScale(0.96);
    this.tweens.add({
      targets: this.cellarDiscoveryPanel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Cubic.Out',
    });
    this.proceduralAudio?.playCue('wrong');
  }

  private closeCellarDiscovery(): void {
    this.cellarDiscoveryActive = false;
    this.cellarDiscoveryPanel?.setVisible(false);
    this.player?.setMovementEnabled(true);
    this.updateNearestInteraction();
  }

  private collectCellarAtlas(): void {
    const atlas = this.cellarAtlasArtifact;
    if (!atlas || this.cellarAtlasCollected) {
      this.closeCellarDiscovery();
      return;
    }
    if (this.carrySystem.isFull() || !this.carrySystem.takeArtifact(atlas)) {
      this.cellarDiscoveryAction?.setText(
        'TAB  MANAGE BACKPACK / 背包已满，请先选择并归还其他器物',
      );
      this.cameras.main.shake(120, 0.0015);
      return;
    }
    this.cellarAtlasCollected = true;
    atlas.setCarried();
    this.carrySystem.storeActiveArtifact();
    this.player?.setCarrying(false);
    this.player?.playCarryAction('pickup');
    this.proceduralAudio?.playCue('correct');
    this.updateCarryUI();
    this.closeCellarDiscovery();
    this.updateObjectiveUI(
      this.carrySystem.hasArtifact('geomancers-compass')
        ? 'The compass and the Myriad Character Atlas are secured. Climb back and finish exploring.'
        : 'The Myriad Character Atlas is secured. Climb back and retrieve the Geomancer’s Compass.',
      this.carrySystem.hasArtifact('geomancers-compass')
        ? '风水罗盘与《万字藏图》均已收好。爬回去完成探索。'
        : '已取得《万字藏图》。爬回主墓室并取得风水罗盘。',
    );
    this.evaluateDepartureReadiness();
  }

  private updateCoreLootObjective(): void {
    const missing = this.getMissingCoreLoot();
    if (missing.length === 0) {
      this.updateObjectiveUI(
        'Both core relics are secured. Explore every chamber and restore anything else you moved.',
        '两个核心物品均已取得。继续探索全部墓室，并归位其他被移动的器物。',
      );
      return;
    }
    this.updateObjectiveUI(
      `Core relic still missing: ${missing.join(' and ')}.`,
      `仍缺少核心物品：${missing.includes('Myriad Character Atlas') ? '《万字藏图》' : ''}${missing.length > 1 ? '与' : ''}${missing.includes('Geomancer’s Compass') ? '风水罗盘' : ''}。`,
    );
  }

  private getMissingCoreLoot(): string[] {
    const missing: string[] = [];
    if (!this.carrySystem.hasArtifact('myriad-character-atlas')) {
      missing.push('Myriad Character Atlas');
    }
    if (!this.carrySystem.hasArtifact('geomancers-compass')) {
      missing.push('Geomancer’s Compass');
    }
    return missing;
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

    const carriedArtifacts = this.carrySystem.getCarriedArtifacts();
    const carriedArtifact = carriedArtifacts.at(-1);
    this.tutorialPhase = 'departure-confirmation';
    this.nearbyInteraction = undefined;
    this.player.setMovementEnabled(false);
    this.updateInteractionPrompt();
    this.departureCarriedEnglish.setText(
      carriedArtifacts.map((artifact) => artifact.englishName).join(' + ') || 'EMPTY',
    );
    this.departureCarriedChinese.setText(carriedArtifact?.chineseName ?? '空手');
    this.departureCarriedChinese.setText(
      carriedArtifacts.map((artifact) => artifact.chineseName).join(' + ') || '空手',
    );
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
    this.tombSettlement = ShopProgressSystem.createFirstTombSettlement(
      this.departureChoice === 'empty' ? null : this.departureChoice,
    );
    this.tutorialPhase = 'completed';
    this.stopWorldForCompletion();
    this.showDepartureResult(this.departureChoice);
  }

  private determineDepartureChoice(): DepartureChoice {
    for (const artifactId of ['geomancers-compass', 'bronze-mirror', 'burial-vessel'] as const) {
      if (this.carrySystem.hasArtifact(artifactId)) {
        return artifactId;
      }
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

  private transitionToShopReturn(): void {
    if (this.tutorialPhase !== 'completed' || this.completionTransitionLocked) {
      return;
    }
    this.completionTransitionLocked = true;
    this.tutorialPhase = 'transition-to-shop';
    const settlement = this.tombSettlement ?? ShopProgressSystem.createFirstTombSettlement(
      this.determineDepartureChoice() === 'empty' ? null : this.determineDepartureChoice(),
    );
    this.cameras.main.fadeOut(650, 8, 7, 5);
    this.time.delayedCall(700, () => {
      this.scene.start('AntiqueShopScene', {
        departureChoice: this.departureChoice ?? 'empty',
        settlement,
        appearanceId: this.appearanceId,
      });
    });
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

    if (!this.carrySystem.isFull()) {
      this.takeArtifact(artifact, spot);
      return;
    }

    this.cameras.main.shake(120, 0.0015);
  }

  private takeArtifact(artifact: InvestigableObject, spot: ArtifactSpot): void {
    if (!this.carrySystem.takeArtifact(artifact)) {
      return;
    }

    this.carrySystem.storeActiveArtifact();
    this.player?.setCarrying(false);
    this.player?.playCarryAction('pickup');
    this.playArtifactActionFeedback(artifact.worldX, artifact.worldY, 'pickup');
    this.registerArtifactDisturbance(artifact, spot);
    this.updateRestoreProgressUI();
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
    this.updateRestoreProgressUI();
    this.setArtifactCollisionEnabled(artifact, false);
    this.resetCarriedExposure(artifact.id);
    this.updateCarryUI();
    this.closeInvestigation();
    this.evaluateDepartureReadiness();
  }

  private swapArtifact(artifactAtSpot: InvestigableObject, spot: ArtifactSpot): void {
    const activeArtifact = this.carrySystem.getCarriedArtifact();
    const carriedArtifact = this.carrySystem.removeCarriedArtifact(activeArtifact?.id);
    if (!carriedArtifact) {
      return;
    }

    this.playArtifactActionFeedback(artifactAtSpot.worldX, artifactAtSpot.worldY, 'pickup');
    this.registerArtifactDisturbance(artifactAtSpot, spot);
    this.updateRestoreProgressUI();
    if (artifactAtSpot.id === 'burial-vessel') {
      this.encounterSystem.takeCritical(
        spot.spotId,
        artifactAtSpot.worldX,
        artifactAtSpot.worldY,
      );
    }
    this.registerCompassRetrieved(artifactAtSpot);
    artifactAtSpot.setCarried();
    this.updateRestoreProgressUI();
    this.setArtifactCollisionEnabled(artifactAtSpot, false);

    spot.artifactId = carriedArtifact.id;
    spot.isEmpty = false;
    carriedArtifact.moveToWorldSpot(spot.worldX, spot.worldY, spot.spotId);
    carriedArtifact.visualObject.setDepth(this.getSceneryDepth(spot.worldY));
    this.setArtifactCollisionEnabled(carriedArtifact, true);
    this.handleArtifactPlaced(carriedArtifact, spot);
    this.updateRestoreProgressUI();
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

    const activeArtifact = this.carrySystem.getCarriedArtifact();
    const carriedArtifact = this.carrySystem.removeCarriedArtifact(activeArtifact?.id);
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
    this.updateRestoreProgressUI();
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
      'The compass is optional loot. Continue exploring every chamber; restore any offering you moved.',
      '罗盘属于可选战利品。继续探索全部墓室，并归位所有被移动的供物。',
    );
    this.updateCoreLootObjective();
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
    this.restoreHintElapsedSeconds = 0;
    this.updateRestoreProgressUI();
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
    if (artifact.hasBeenDisturbed && artifact.originalSpotId === spot.spotId) {
      this.restoreHintElapsedSeconds = 0;
      this.proceduralAudio?.playCue('correct');
      const success = this.add.graphics().setDepth(4.4);
      success.lineStyle(3, 0xcabb8b, 0.9);
      success.strokeCircle(spot.worldX, spot.worldY, 34);
      this.tweens.add({
        targets: success,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 520,
        ease: 'Sine.Out',
        onComplete: () => success.destroy(),
      });
    }
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
    this.setEntranceCollisionEnabled(true);
    this.exitPrompt?.setVisible(false);
    this.lockedExitPrompt?.setVisible(false);
    this.nearbyInteraction = undefined;
    this.ceremonialGate?.close(210);
  }

  private isDepartureReady(): boolean {
    return this.getRemainingRoomCount() === 0 &&
      this.getUnrestoredMovedArtifactCount() === 0 &&
      this.getMissingCoreLoot().length === 0;
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
          'Every chamber has been explored. The sealed door is open; return to the far end of the burial passage.',
          '全部墓室均已探索，封门已经开启。返回墓道最远端撤离。',
        );
        this.showShopkeeperMessage(
          'released',
          'You have seen every chamber. Leave everything you moved where it belonged, then come back.',
          '每一间都看过了。动过的器物留在原位，现在回来。',
        );
      }
      return;
    }

    if (wasReady) {
      this.lockEntranceUntilRequirementsMet('sealed');
      this.proceduralAudio?.playCue('door-reject');
    }

    const remainingRooms = this.getRemainingRoomCount();
    const unrestoredObjects = this.getUnrestoredMovedArtifactCount();
    const missingCoreLoot = this.getMissingCoreLoot();
    if (unrestoredObjects > 0) {
      this.updateObjectiveUI(
        remainingRooms > 0
          ? `Explore ${remainingRooms} more ${remainingRooms === 1 ? 'chamber' : 'chambers'}, and restore every moved burial object.`
          : 'Every chamber has been explored, but the tomb still detects a displaced object. Restore every moved burial object.',
        remainingRooms > 0
          ? `还需探索并交互 ${remainingRooms} 间墓室，同时将所有被移动的器物归位。`
          : '全部墓室均已探索，但墓穴仍察觉到器物错位。请将所有被移动的器物归位。',
      );
      return;
    }

    if (missingCoreLoot.length > 0 && remainingRooms === 0) {
      this.updateObjectiveUI(
        `Before leaving, recover ${missingCoreLoot.join(' and ')}.`,
        `离开前必须取得${missingCoreLoot.includes('Myriad Character Atlas') ? '《万字藏图》' : ''}${missingCoreLoot.length > 1 ? '与' : ''}${missingCoreLoot.includes('Geomancer’s Compass') ? '风水罗盘' : ''}。`,
      );
      return;
    }

    this.updateObjectiveUI(
      `Explore ${remainingRooms} more ${remainingRooms === 1 ? 'chamber' : 'chambers'} before leaving.`,
      `离开前还需探索并交互 ${remainingRooms} 间墓室。`,
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
    if (
      target.kind === 'empty-spot' ||
      target.kind === 'exit' ||
      target.kind === 'locked-exit' ||
      target.kind === 'room-exploration' ||
      target.kind === 'cellar-hatch' ||
      target.kind === 'cellar-ladder' ||
      target.kind === 'cellar-atlas' ||
      target.kind === 'corridor-mural'
    ) {
      return 0;
    }
    if (target.artifact.portable) {
      return this.carrySystem.isFull() ? 2 : 1;
    }
    return 3;
  }

  private getArtifactPromptText(artifact: InvestigableObject): string {
    return artifact.portable
      ? 'E  Examine / 查看'
      : 'E  Investigate / 调查';
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
