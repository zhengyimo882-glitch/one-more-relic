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
import { TombDynamicShadowSystem } from '../systems/TombDynamicShadowSystem';
import { ClickMoveController } from '../systems/ClickMoveController';
import { preloadClickMoveVisuals } from '../visuals/clickMoveVisuals';
import type { TombPointLight, TombShadowCaster } from '../types/TombLighting';
import {
  FootstepRippleSystem,
  type RippleAllowedArea,
} from '../systems/FootstepRippleSystem';
import { preloadPlayerAvatarAssets } from '../visuals/createPlayerAvatarVisual';
import {
  createRitualCandle,
  RITUAL_CANDLE_TEXTURES,
  type RitualCandleVisual,
} from '../visuals/createRitualCandle';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import {
  createTimedLocationTitle,
  type TimedLocationTitle,
} from '../ui/createTimedLocationTitle';
import {
  createStyleBoardPanel,
  createStyleBoardPrompt,
  createStyleBoardKeycap,
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
  MURAL_DISCOVERY_UI_TEXTURES,
  createTombCorridorMurals,
  type TombCorridorMuralPanel,
  type TombCorridorMurals,
} from '../visuals/createTombCorridorMurals';
import { InputActionManager } from '../input/InputActionManager';
import { localize } from '../i18n/gameLanguage';
import { InteractionController } from '../systems/InteractionController';
import {
  SceneTransitionController,
  installSceneLoadingOverlay,
  markSceneInteractive,
} from '../systems/SceneTransitionController';
import { InteractionDebugOverlay } from '../systems/InteractionDebugOverlay';
import {
  BilingualTextReveal,
  polishSceneTypography,
  revealPanel,
  setTypographyRole,
} from '../ui/gameTypography';
import {
  ARTIFACT_VISUALS,
  getArtifactVisual,
  preloadArtifactVisuals,
} from '../data/artifactVisualManifest';
import { createArtPanel, preloadArtPanels } from '../ui/artPanel';
import { UI_TOKENS } from '../config/uiTokens';
import { ActionHintPanel, type ActionHint } from '../ui/ActionHintPanel';
import { createSettingsButton } from '../ui/SettingsButton';
import {
  createCellarPortalVisual,
  preloadCellarPortalVisual,
  registerCellarPortalAnimations,
  type CellarPortalVisual,
} from '../visuals/createCellarPortalVisual';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1664;
const PHYSICS_WORLD_WIDTH = 3200;
const REFINED_TOMB_ART_ROOT = 'assets/generated/tomb_refined_v1';
const REFINED_TOMB_TEXTURE = 'tomb-refined-fullmap';
const CELLAR_ROOM_TEXTURE = 'hidden-cellar-room';
const CELLAR_ROOM_V2_PATH = 'assets/art-v2/scenes/hidden-cellar-room-v2.png';
const GRID_SIZE = 32;
const PIXEL_SCALE = 2;
const WALL_THICKNESS = GRID_SIZE;
const ENTRANCE_WIDTH = GRID_SIZE * 3;
const ROOM_CENTER_X = WORLD_WIDTH / 2;
const COFFIN_X = ROOM_CENTER_X;
const COFFIN_Y = 145;
const PROP_Y = 514;
const RIGHT_PROP_X = 1430;
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
const MAIN_CELLAR_PORTAL_INTERACTION_X = 914;
const MAIN_CELLAR_PORTAL_INTERACTION_Y = 254;
const MAIN_CELLAR_PORTAL_FLOOR_Y = 306;
const CELLAR_ROOM: TombRect = { x: 2040, y: 160, width: 760, height: 560 };
const CELLAR_CENTER_X = CELLAR_ROOM.x + CELLAR_ROOM.width / 2;
const CELLAR_RETURN_PORTAL_INTERACTION_Y = CELLAR_ROOM.y + CELLAR_ROOM.height - 66;
const CELLAR_RETURN_PORTAL_FLOOR_Y = CELLAR_ROOM.y + CELLAR_ROOM.height - 38;
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
const TOMB_RITUAL_ART_ROOT = 'assets/generated/tomb_ritual_v2';
const TOMB_MURAL_ART_ROOT = 'assets/tomb_murals';
const MURAL_DISCOVERY_UI_ROOT = 'assets/generated/mural_discovery_ui_v1';
const ORIGINAL_ARTIFACT_ASSET_ROOT = 'assets/generated/tomb_artifacts_original';
const ORIGINAL_ARTIFACT_TEXTURES = {
  burialVessel: 'original-burial-vessel',
  bronzeMirror: 'original-bronze-mirror',
  geomancersCompass: 'original-geomancers-compass',
} as const;
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

// Every secondary room has exactly 1.5x its former floor area. The expansion
// runs away from the unchanged central chamber so every existing doorway and
// route remains stable.
const BURIAL_CHAMBER: TombRect = { x: 515, y: 20, width: 570, height: 300 };
const CENTRAL_CHAMBER: TombRect = { x: 520, y: 350, width: 560, height: 280 };
const WEST_CHAMBER: TombRect = { x: 25, y: 410, width: 495, height: 210 };
const EAST_CHAMBER: TombRect = { x: 1080, y: 410, width: 495, height: 210 };
const SOUTH_CHAMBER: TombRect = { x: 560, y: 620, width: 480, height: 180 };

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
  candle: RitualCandleVisual;
  promptObject: Phaser.GameObjects.Container;
};

type RoomRevealVeil = {
  roomId: TombRoomId;
  bounds: TombRect;
  graphics: Phaser.GameObjects.Graphics;
  revealed: boolean;
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
    chineseDescription: '器皿上积着厚灰，旁边却有一道刚被蹭出的痕迹。',
    hiddenValue: 420,
    appraisalText:
      'The clay body appears old, but the painted surface may have been restored. Its worth is difficult to judge underground.',
    chineseAppraisalText:
      '陶胎看着很老，表面的彩绘却像是后来补过的。只在墓里看，很难判断它到底值不值钱。',
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
      '镜面早已发暗。从这个角度看，里面照不出一张完整的人脸。',
    hiddenValue: 900,
    appraisalText:
      'The inscription may be older than the tomb itself. Corrosion hides whether it is genuine or merely convincing.',
    chineseAppraisalText:
      '背后的铭文可能比这座墓还早。锈蚀太重，现在还分不清是真品，还是做得足够像的仿品。',
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
      '棺盖移开后，一枚巴掌大的罗盘露了出来。盘上的刻度，与墓室的朝向对不上。',
    hiddenValue: 1800,
    appraisalText:
      'The needle still turns without being touched. If the maker’s seal is genuine, this may be the most important object in the room.',
    chineseAppraisalText:
      '没有人碰它，指针却还在缓慢转动。如果底部的制作者印记是真的，它可能是这里最重要的东西。',
    omenTier: 2,
    originalSpotId: 'coffin-interior',
  },
  'myriad-character-atlas': {
    id: 'myriad-character-atlas',
    englishName: 'Myriad Character Atlas',
    chineseName: '万字藏图',
    description:
      'The folded chart is dry despite the wet cellar. Its ink shifts whenever the lantern moves away.',
    chineseDescription: '地窖湿得滴水，这本册子却干得反常。灯光一移开，纸上的墨痕似乎就在缓缓错位。',
    hiddenValue: 0,
    appraisalText:
      'This is not ordinary loot. Its seals and routes connect the geomancer’s compass to places beyond this tomb.',
    chineseAppraisalText: '这不是普通的陪葬品。纸上的印记和路线，正把风水罗盘指向这座墓之外。',
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
      kind: 'cellar-portal';
      stableId: 'burial-chamber-cellar-portal';
      distance: number;
    }
  | {
      kind: 'cellar-return-portal';
      stableId: 'hidden-cellar-return-portal';
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
  private dynamicShadowSystem?: TombDynamicShadowSystem;
  private clickMove?: ClickMoveController;
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
  private muralDiscoveryMeta?: Phaser.GameObjects.Text;
  private muralDiscoveryCounter?: Phaser.GameObjects.Text;
  private muralDiscoveryAccent?: Phaser.GameObjects.Rectangle;
  private muralDiscoveryTextGroup?: Phaser.GameObjects.Container;
  private muralDiscoveryCloseHitArea?: Phaser.GameObjects.Rectangle;
  private muralDiscoveryActive = false;
  private muralDiscoveryClosing = false;
  private tombMapVeil?: Phaser.GameObjects.Graphics;
  private roomRevealVeils: RoomRevealVeil[] = [];
  private revealedRoomIds = new Set<TombRoomId>();
  private tombMapRevealed = false;
  private entranceCrossed = false;
  private exitPrompt?: Phaser.GameObjects.Container;
  private lockedExitPrompt?: Phaser.GameObjects.Container;
  private coffinClosedLid?: Phaser.GameObjects.Image;
  private coffinOpenedLid?: Phaser.GameObjects.Image;
  private currentTombMap: 'main' | 'cellar' = 'main';
  private cellarPortalsActive = false;
  private cellarTransitionActive = false;
  private cellarAtlasDiscovered = false;
  private cellarAtlasCollected = false;
  private mainCellarPortal?: CellarPortalVisual;
  private cellarReturnPortal?: CellarPortalVisual;
  private mainCellarPortalPrompt?: Phaser.GameObjects.Container;
  private cellarReturnPortalPrompt?: Phaser.GameObjects.Container;
  private cellarAtlasPrompt?: Phaser.GameObjects.Container;
  private cellarAtmosphere?: Phaser.GameObjects.Graphics;
  private cellarAtlasArtifact?: InvestigableObject;
  private cellarDiscoveryPanel?: Phaser.GameObjects.Container;
  private cellarDiscoveryActive = false;
  private cellarDiscoveryAction?: Phaser.GameObjects.Text;
  private cellarEntryNotice?: Phaser.GameObjects.Container;
  private mainMapVeilWasVisible = false;
  private ambientOverlay?: Phaser.GameObjects.Graphics;
  private inputActions?: InputActionManager;
  private interactionController?: InteractionController<InteractionTarget>;
  private transitionController?: SceneTransitionController;
  private cameraLookAheadX = 0;
  private cameraLookAheadY = 0;
  private interactionDebug?: InteractionDebugOverlay;
  private instructionText?: Phaser.GameObjects.Text;
  private escapeHintText?: Phaser.GameObjects.Text;
  private actionHints?: ActionHintPanel;
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
  private investigationCloseHint?: Phaser.GameObjects.Text;
  private panelEnglishName?: Phaser.GameObjects.Text;
  private panelChineseName?: Phaser.GameObjects.Text;
  private panelDescription?: Phaser.GameObjects.Text;
  private panelChineseDescription?: Phaser.GameObjects.Text;
  private panelAppraisalTitle?: Phaser.GameObjects.Text;
  private panelAppraisalText?: Phaser.GameObjects.Text;
  private panelChineseAppraisalText?: Phaser.GameObjects.Text;
  private panelArtifactImage?: Phaser.GameObjects.Image;
  private panelCarryAction?: Phaser.GameObjects.Text;
  private panelSwapDescription?: Phaser.GameObjects.Text;
  private panelSwapChineseDescription?: Phaser.GameObjects.Text;
  private carryCountText?: Phaser.GameObjects.Text;
  private carriedEnglishName?: Phaser.GameObjects.Text;
  private carriedChineseName?: Phaser.GameObjects.Text;
  private carriedSlotTexts: Phaser.GameObjects.Text[] = [];
  private carriedSlotImages: Phaser.GameObjects.Image[] = [];
  private carryUI?: Phaser.GameObjects.Container;
  private backpackMenu?: Phaser.GameObjects.Container;
  private backpackMenuActive = false;
  private backpackSelectionIndex = 0;
  private backpackMenuCountText?: Phaser.GameObjects.Text;
  private backpackMenuSlotPanels: Phaser.GameObjects.Graphics[] = [];
  private backpackMenuSlotTexts: Phaser.GameObjects.Text[] = [];
  private backpackMenuSlotImages: Phaser.GameObjects.Image[] = [];
  private backpackMenuDetailImage?: Phaser.GameObjects.Image;
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
  private arrivalTextReveal?: BilingualTextReveal;
  private arrivalBag?: Phaser.GameObjects.Container;
  private atmosphere?: ProceduralAtmosphere;
  private previousCanvasImageRendering = '';
  private animatedFlames: Phaser.GameObjects.Sprite[] = [];
  private staticTombLights: Array<{
    sprite: Phaser.GameObjects.Sprite;
    radius: number;
    intensity: number;
    color: number;
    offsetY: number;
  }> = [];
  private candleLightingActive = false;
  private candleLightingProgress = 0;
  private candleIgnitionLight?: TombPointLight;
  private candleSkillUI?: Phaser.GameObjects.Container;
  private candleSkillBackground?: Phaser.GameObjects.Graphics;
  private candleSkillState?: Phaser.GameObjects.Text;
  private candleSkillProgressBar?: Phaser.GameObjects.Graphics;
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
    installSceneLoadingOverlay(this);
    preloadClickMoveVisuals(this);
    preloadPlayerAvatarAssets(this);
    preloadCellarPortalVisual(this);
    preloadArtifactVisuals(this);
    preloadArtPanels(this);
    this.load.image(
      REFINED_TOMB_TEXTURE,
      `${REFINED_TOMB_ART_ROOT}/tomb_refined_fullmap.png`,
    );
    this.load.image(CELLAR_ROOM_TEXTURE, CELLAR_ROOM_V2_PATH);
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
      `${TOMB_RITUAL_ART_ROOT}/tomb_gate_closed.png`,
    );
    this.load.image(
      CEREMONIAL_GATE_TEXTURES.open,
      `${TOMB_RITUAL_ART_ROOT}/tomb_gate_open.png`,
    );
    this.load.image(
      CEREMONIAL_GATE_TEXTURES.ghostFire,
      `${ORIGINAL_CORRIDOR_ASSET_ROOT}/ghost_fire.png`,
    );
    this.load.image(
      RITUAL_CANDLE_TEXTURES.unlit,
      `${TOMB_RITUAL_ART_ROOT}/ritual_candle_unlit.png`,
    );
    this.load.image(
      RITUAL_CANDLE_TEXTURES.litA,
      `${TOMB_RITUAL_ART_ROOT}/ritual_candle_lit_a.png`,
    );
    this.load.image(
      RITUAL_CANDLE_TEXTURES.litB,
      `${TOMB_RITUAL_ART_ROOT}/ritual_candle_lit_b.png`,
    );
    this.load.image(
      RITUAL_CANDLE_TEXTURES.litC,
      `${TOMB_RITUAL_ART_ROOT}/ritual_candle_lit_c.png`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.leftUpper,
      `${TOMB_MURAL_ART_ROOT}/mural_array.jpg`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.leftLower,
      `${TOMB_MURAL_ART_ROOT}/mural_alliance.jpg`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.rightUpper,
      `${TOMB_MURAL_ART_ROOT}/mural_awakening.jpg`,
    );
    this.load.image(
      CORRIDOR_MURAL_TEXTURES.rightLower,
      `${TOMB_MURAL_ART_ROOT}/mural_oath.jpg`,
    );
    this.load.image(
      MURAL_DISCOVERY_UI_TEXTURES.chrome,
      `${MURAL_DISCOVERY_UI_ROOT}/mural_discovery_chrome.png`,
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
    const muralChromeTexture = this.textures.get(MURAL_DISCOVERY_UI_TEXTURES.chrome);
    if (!muralChromeTexture.has(MURAL_DISCOVERY_UI_TEXTURES.wallMarkerFrame)) {
      muralChromeTexture.add(
        MURAL_DISCOVERY_UI_TEXTURES.wallMarkerFrame,
        0,
        120,
        0,
        390,
        255,
      );
    }

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
    for (const textureKey of Object.values(RITUAL_CANDLE_TEXTURES)) {
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
    this.textures.get('cellar-portal-animation-v1').setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    registerCellarPortalAnimations(this);
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
    this.inputActions = InputActionManager.forScene(this);
    this.interactionController = new InteractionController(this, {
      stickMs: 250,
      switchAdvantage: 16,
    });
    this.transitionController = new SceneTransitionController(this, this.inputActions);
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
    this.clickMove = new ClickMoveController(this, this.player, {
      obstacles: () => obstacles.getChildren(),
      isEnabled: () => this.canUseClickMovement(),
      screenExclusions: [
        new Phaser.Geom.Rectangle(0, 0, 390, 250),
        new Phaser.Geom.Rectangle(1000, 0, 280, 245),
        new Phaser.Geom.Rectangle(0, 625, 1280, 95),
      ],
      cellSize: 32,
      clearance: 20,
      depth: 62,
    });

    this.configureCamera();
    this.proceduralAudio = new ProceduralTombAudioSystem();
    this.directionalLamp = new DirectionalLampSystem(
      this,
      this.getTombWallSegments(),
    );
    this.dynamicShadowSystem = new TombDynamicShadowSystem(this);
    this.createTombMapVeil();
    this.createRoomRevealVeils();
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
    createSettingsButton(this, () => openPauseMenu(this), 35);
    this.createCellarDiscoveryPanel();
    this.createMuralDiscoveryPanel();
    this.input.on('pointerup', this.handleMuralPointerUp, this);
    this.registerInput();
    this.createDebugTools();
    this.interactionDebug = new InteractionDebugOverlay(this, {
      player: () => this.player,
      target: () => this.nearbyInteraction?.stableId ?? '',
      dragging: () => this.cellarTransitionActive ? 'map-transition' : '',
    });
    this.startArrivalIntroduction();
    polishSceneTypography(this);
    markSceneInteractive(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupTombScene, this);
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.inputActions) {
      return;
    }

    this.inputActions.setContext(this.getInputContext());
    this.updateActionHints();
    const interactionPressed = this.inputActions.consume('confirm');
    const escapePressed = this.inputActions.consume('cancel');
    const pausePressed = escapePressed || isPauseButtonPressed(this);
    const enterPressed = false;
    const backpackPressed = this.inputActions.consume('inventory');
    const backpackUpPressed = this.inputActions.consume('nav-up', { cooldownMs: 120 });
    const backpackDownPressed = this.inputActions.consume('nav-down', { cooldownMs: 120 });
    const backpackSlotOnePressed = this.inputActions.consume('slot-1');
    const backpackSlotTwoPressed = this.inputActions.consume('slot-2');
    this.atmosphere?.update(this.player.x, this.player.y, time);
    this.clickMove?.update(time);
    const deltaSeconds = delta / 1000;
    this.roomExplorationPoints.forEach((point) => point.candle.update(time));
    this.updateCorridorEntrance(time);
    const pointLights = this.getActivePointLights(time);
    const lampToggled = this.directionalLamp?.update(
      this.player.x,
      this.player.y,
      deltaSeconds,
      pointLights,
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
    this.updateDynamicShadows(pointLights);
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
        this.requestArrivalIntroductionAdvance();
      }
      return;
    }

    if (this.tutorialPhase === 'completed') {
      if (interactionPressed || enterPressed) {
        this.transitionToShopReturn();
      } else if (pausePressed) {
        openPauseMenu(this);
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

    if (this.candleLightingActive) {
      if (pausePressed) {
        openPauseMenu(this);
      }
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
    this.interactionDebug?.update(time);

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
    this.updateCameraFollow(deltaSeconds);
    this.player.setAimAngle(lampAimAngle);
    this.player.setDepth(PLAYER_DEPTH_BASE + this.player.y / 1000);
    this.updateRoomRevealState();
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
      if (this.nearbyInteraction.kind === 'cellar-portal') {
        this.switchTombMap('cellar');
        return;
      }
      if (this.nearbyInteraction.kind === 'cellar-return-portal') {
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
    this.cellarPortalsActive = false;
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
    this.muralDiscoveryClosing = false;
    this.backpackMenuActive = false;
    this.backpackSelectionIndex = 0;
    this.tombMapVeil = undefined;
    this.roomRevealVeils = [];
    this.revealedRoomIds.clear();
    this.tombMapRevealed = false;
    this.entranceCrossed = false;
    this.roomExplorationPoints = [];
    this.exploredRoomIds.clear();
    this.lockedExitPrompt = undefined;
    this.shopkeeperHideTimer = undefined;
    this.shopkeeperFadeTween = undefined;
    this.atmosphere = undefined;
    this.animatedFlames = [];
    this.staticTombLights = [];
    this.candleLightingActive = false;
    this.candleLightingProgress = 0;
    this.candleIgnitionLight = undefined;
    this.candleSkillUI = undefined;
    this.candleSkillBackground = undefined;
    this.candleSkillState = undefined;
    this.candleSkillProgressBar = undefined;
    this.dynamicShadowSystem = undefined;
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
    const definitions: Array<Omit<RoomExplorationPoint, 'candle' | 'promptObject'>> = [
      {
        roomId: 'burial-chamber',
        englishName: 'Burial Chamber',
        chineseName: '主墓室',
        worldX: 710,
        worldY: 284,
        interactionRadius: 86,
      },
      {
        roomId: 'central-offering-chamber',
        englishName: 'Offering Chamber',
        chineseName: '供奉前室',
        worldX: 800,
        worldY: 388,
        interactionRadius: 86,
      },
      {
        roomId: 'west-chamber',
        englishName: 'West Chamber',
        chineseName: '西耳室',
        worldX: 273,
        worldY: 515,
        interactionRadius: 86,
      },
      {
        roomId: 'east-offering-chamber',
        englishName: 'East Chamber',
        chineseName: '东耳室',
        worldX: 1328,
        worldY: 515,
        interactionRadius: 86,
      },
      {
        roomId: 'south-chamber',
        englishName: 'South Chamber',
        chineseName: '南室',
        worldX: 800,
        worldY: 710,
        interactionRadius: 86,
      },
    ];

    return definitions.map((definition) => {
      const candle = createRitualCandle(this, definition.worldX, definition.worldY);
      const promptObject = createStyleBoardPrompt(
        this,
        'E',
        `Light Candle / 点燃${definition.chineseName}定魂烛`,
        294,
        44,
      )
        .setPosition(definition.worldX, definition.worldY - 82)
        .setDepth(8)
        .setVisible(false);
      return { ...definition, candle, promptObject };
    });
  }

  private exploreRoom(point: RoomExplorationPoint): void {
    this.lightRoomCandle(point);
  }

  private lightRoomCandle(point: RoomExplorationPoint): void {
    if (!this.player || this.candleLightingActive || point.candle.isLit()) {
      return;
    }
    this.candleLightingActive = true;
    this.candleLightingProgress = 0;
    this.player.setMovementEnabled(false);
    this.player.playCandleLightingAction();
    this.playCandleIgnitionEffect(point);
    this.nearbyInteraction = undefined;
    point.promptObject.setVisible(false);
    point.candle.setNearby(false);
    this.updateCandleSkillUI();
    this.proceduralAudio?.ensureStarted();

    this.time.delayedCall(280, () => {
      point.candle.ignite();
      this.cameras.main.shake(70, 0.00045);
    });
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 760,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        this.candleLightingProgress = tween.getValue() ?? 0;
        this.updateCandleSkillUI();
      },
      onComplete: () => {
        this.candleLightingProgress = 1;
        this.candleLightingActive = false;
        this.completeRoomExploration(point.roomId);
        this.player?.setMovementEnabled(true);
        this.updateCandleSkillUI();
        this.updateNearestInteraction();
      },
    });
  }

  private playCandleIgnitionEffect(point: RoomExplorationPoint): void {
    if (!this.player) return;
    const startX = this.player.x;
    const startY = this.player.y - 18;
    const endX = point.worldX;
    const endY = point.worldY - 40;
    const trail = this.add.graphics().setDepth(5.82).setBlendMode(Phaser.BlendModes.ADD);
    const ember = this.add.graphics().setDepth(5.84).setBlendMode(Phaser.BlendModes.ADD);
    const trailPoints: Array<{ x: number; y: number }> = [];

    const drawEmber = (x: number, y: number, progress: number): void => {
      ember.clear();
      ember.fillStyle(0xff8b3e, 0.12);
      ember.fillCircle(x, y, 18 - progress * 5);
      ember.fillStyle(0xffc35f, 0.34);
      ember.fillCircle(x, y, 9 - progress * 2);
      ember.fillStyle(0xffedb0, 0.96);
      ember.fillCircle(x, y, 2.4);
    };

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 280,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        const x = Phaser.Math.Linear(startX, endX, progress);
        const y = Phaser.Math.Linear(startY, endY, progress) - Math.sin(progress * Math.PI) * 18;
        trailPoints.push({ x, y });
        if (trailPoints.length > 8) trailPoints.shift();
        trail.clear();
        trailPoints.forEach((trailPoint, index) => {
          const alpha = ((index + 1) / trailPoints.length) * 0.28;
          trail.fillStyle(0xe29a4b, alpha);
          trail.fillCircle(trailPoint.x, trailPoint.y, 1.2 + index * 0.12);
        });
        drawEmber(x, y, progress);
        this.candleIgnitionLight = {
          x,
          y,
          radius: 82,
          intensity: 0.38 + Math.sin(progress * Math.PI) * 0.2,
          color: 0xffa34f,
        };
      },
      onComplete: () => {
        this.candleIgnitionLight = undefined;
        trail.destroy();
        ember.destroy();
      },
    });
  }

  private completeRoomExploration(roomId: TombRoomId): void {
    if (this.exploredRoomIds.has(roomId)) {
      return;
    }
    this.exploredRoomIds.add(roomId);
    const point = this.roomExplorationPoints.find((candidate) => candidate.roomId === roomId);
    if (point) {
      point.promptObject.setVisible(false);
      point.candle.setNearby(false);
    }
    this.proceduralAudio?.playCue('correct');
    this.updateRestoreProgressUI();
    const remaining = this.getRemainingRoomCount();
    if (remaining > 0) {
      this.updateObjectiveUI(
        `Candle lit. ${remaining} ${remaining === 1 ? 'chamber candle remains' : 'chamber candles remain'}.`,
        `这里的定魂烛已经点亮。还要点燃 ${remaining} 间墓室的蜡烛。`,
      );
    }
    if (roomId === 'burial-chamber') {
      this.activateCellarPortals();
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
      chineseParts.push('拿到风水罗盘和《万字藏图》');
    }
    if (remainingRooms > 0) {
      englishParts.push(
        `light ${remainingRooms} more chamber ${remainingRooms === 1 ? 'candle' : 'candles'}`,
      );
      chineseParts.push(`还要点燃 ${remainingRooms} 间墓室的定魂烛`);
    }
    if (unrestoredObjects > 0) {
      englishParts.push(
        `restore ${unrestoredObjects} moved ${unrestoredObjects === 1 ? 'object' : 'objects'}`,
      );
      chineseParts.push(`还要放回 ${unrestoredObjects} 件被移动的器物`);
    }
    this.updateObjectiveUI(
      englishParts.length > 0
        ? `The sealed door will not open: ${englishParts.join(' and ')}.`
        : 'The door mechanism is responding. Step back and try again.',
      chineseParts.length > 0
        ? `封门还没有打开：${chineseParts.join('；')}。`
        : '门里的机关动了。退开一点，再试一次。',
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
    this.candleSkillUI?.setVisible(false);
    this.createArrivalBag();
    this.createArrivalPanel();
    this.showArrivalIntroductionBeat();
  }

  public isCurrentDialogueSkippable(): boolean {
    return this.arrivalIntroductionActive;
  }

  public skipCurrentDialogue(): boolean {
    if (!this.arrivalIntroductionActive) return false;
    this.arrivalTextReveal?.complete();
    this.arrivalIntroductionIndex = 2;
    this.advanceArrivalIntroduction();
    return true;
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
    const background = createStyleBoardPanel(this, 1120, 206, 'carved', 0.985);
    const title = this.add.text(-520, -80, 'ARRIVAL', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.textBright,
      letterSpacing: 1,
    });
    setTypographyRole(title, 'dialogue-speaker-light');
    const chineseTitle = this.add.text(-520, -58, '抵达', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      color: UI_STYLE_BOARD.colors.muted,
    });
    setTypographyRole(chineseTitle, 'meta-light');
    this.arrivalEnglishText = this.add.text(-520, -29, '', {
      fontFamily: SERIF_FONT,
      fontSize: '19px',
      color: UI_STYLE_BOARD.colors.textBright,
      lineSpacing: 2,
      wordWrap: { width: 850 },
    });
    setTypographyRole(this.arrivalEnglishText, 'dialogue-body-light');
    this.arrivalChineseText = this.add.text(-520, 27, '', {
      fontFamily: SERIF_FONT,
      fontSize: '16px',
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.text,
      lineSpacing: 2,
      wordWrap: { width: 820 },
    });
    setTypographyRole(this.arrivalChineseText, 'dialogue-translation-light');
    this.arrivalTextReveal = new BilingualTextReveal(
      this,
      this.arrivalEnglishText,
      this.arrivalChineseText,
      () => {
        if (this.arrivalEnglishText && this.arrivalChineseText) {
          this.arrivalChineseText.setY(
            this.arrivalEnglishText.y + this.arrivalEnglishText.height + 8,
          );
        }
      },
    );
    const continueText = this.add
      .text(500, 82, 'E / ENTER  CONTINUE / 继续', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#d4ad63',
      })
      .setOrigin(1, 0.5)
      .setVisible(false);
    setTypographyRole(continueText, 'hint-light');
    this.arrivalPanel = this.add
      .container(this.scale.width / 2, 154, [
        background,
        title,
        chineseTitle,
        this.arrivalEnglishText,
        this.arrivalChineseText,
        continueText,
      ])
      .setScrollFactor(0)
      .setDepth(30)
      .setSize(1120, 206)
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerup',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          if (this.arrivalIntroductionActive) {
            this.requestArrivalIntroductionAdvance();
          }
        },
      );
    revealPanel(this, this.arrivalPanel);
  }

  private showArrivalIntroductionBeat(): void {
    const beats = [
      {
        english:
          'The route ended at a sealed burial passage.\nNot a storehouse.',
        chinese:
          '老板给的路线，最后竟通向一条封死的墓道。\n这里根本不是仓房。',
      },
      {
        english: 'Every turn on his hand-drawn route had been correct.',
        chinese: '可一路上的每一个转弯，都和他画的一模一样。',
      },
      {
        english:
          'He lied about the place.\nHe did not lie about knowing the way.',
        chinese:
          '他骗了我这里是什么地方，\n却没骗我该怎么走。',
      },
    ];
    const beat = beats[this.arrivalIntroductionIndex];
    this.arrivalTextReveal?.show(beat.english, beat.chinese);
  }

  private requestArrivalIntroductionAdvance(): void {
    if (this.arrivalTextReveal?.complete()) return;
    this.advanceArrivalIntroduction();
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
    this.arrivalTextReveal?.destroy();
    this.arrivalTextReveal = undefined;
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
      '沿着壁画墓道前进，去看看尽头的朱漆墓门。',
    );
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.carryUI?.setVisible(true);
    this.candleSkillUI?.setVisible(true);
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
      'Light the fixed candle in every burial chamber. Moved objects must still be restored.',
      '点燃每间墓室固定位置的定魂烛。拿起过的东西，离开前必须放回原处。',
    );
    this.showShopkeeperMessage(
      'sealed',
      'The entrance is sealed. Light every chamber candle before you leave. Look before you touch.',
      '“入口封死了。别急着动东西。先点亮每间墓室的定魂烛，再想怎么出去。”',
    );
  }

  private releaseEntrance(): void {
    this.setEntranceCollisionEnabled(false);
    this.lockedExitPrompt?.setVisible(false);
    this.ceremonialGate?.open(420);
  }

  private createTombMapVeil(): void {
    // A long stack of narrow alpha bands replaces the old single hard-edged
    // black rectangle. The passage now falls gradually into darkness behind
    // the gate while its blue guide flames remain legible at the threshold.
    const veil = this.add.graphics().setDepth(7.12);
    const featherStartY = 680;
    const featherEndY = ENTRANCE_Y - 12;
    veil.fillStyle(0x000000, 0.985);
    veil.fillRect(0, 0, WORLD_WIDTH, featherStartY);
    const bands = 36;
    const bandHeight = (featherEndY - featherStartY) / bands;
    for (let index = 0; index < bands; index += 1) {
      const progress = index / (bands - 1);
      const alpha = 0.965 * Math.pow(1 - progress, 1.65);
      veil.fillStyle(0x000000, alpha);
      veil.fillRect(
        0,
        featherStartY + index * bandHeight,
        WORLD_WIDTH,
        bandHeight + 1,
      );
    }
    this.tombMapVeil = veil;
  }

  private createRoomRevealVeils(): void {
    const rooms: Array<{ roomId: TombRoomId; bounds: TombRect }> = [
      { roomId: 'burial-chamber', bounds: BURIAL_CHAMBER },
      { roomId: 'central-offering-chamber', bounds: CENTRAL_CHAMBER },
      { roomId: 'west-chamber', bounds: WEST_CHAMBER },
      { roomId: 'east-offering-chamber', bounds: EAST_CHAMBER },
      { roomId: 'south-chamber', bounds: SOUTH_CHAMBER },
    ];

    this.roomRevealVeils = rooms.map(({ roomId, bounds }) => {
      const graphics = this.add.graphics().setDepth(7.13);
      const bands = 32;
      const maximumInset = Math.min(bounds.width, bounds.height) / 2 - 4;
      for (let index = 0; index < bands; index += 1) {
        const progress = index / (bands - 1);
        const inset = maximumInset * progress;
        graphics.fillStyle(0x000000, 0.025 + progress * 0.03);
        graphics.fillRoundedRect(
          bounds.x + inset,
          bounds.y + inset,
          Math.max(1, bounds.width - inset * 2),
          Math.max(1, bounds.height - inset * 2),
          Math.max(2, 24 - progress * 20),
        );
      }
      return { roomId, bounds, graphics, revealed: false };
    });
  }

  private updateRoomRevealState(): void {
    if (!this.player || this.currentTombMap !== 'main' || !this.tombMapRevealed) {
      return;
    }
    for (const veil of this.roomRevealVeils) {
      if (veil.revealed) continue;
      const inset = WALL_THICKNESS + 6;
      const entered = Phaser.Geom.Rectangle.Contains(
        new Phaser.Geom.Rectangle(
          veil.bounds.x + inset,
          veil.bounds.y + inset,
          veil.bounds.width - inset * 2,
          veil.bounds.height - inset * 2,
        ),
        this.player.x,
        this.player.y,
      );
      if (!entered) continue;
      veil.revealed = true;
      this.revealedRoomIds.add(veil.roomId);
      this.tweens.add({
        targets: veil.graphics,
        alpha: 0,
        duration: 1150,
        ease: 'Sine.InOut',
        onComplete: () => veil.graphics.setVisible(false),
      });
    }
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
        duration: 1050,
        ease: 'Sine.InOut',
        onComplete: () => {
          veil.destroy();
          if (this.tombMapVeil === veil) {
            this.tombMapVeil = undefined;
          }
        },
      });
    }
    this.updateObjectiveUI(
      'Light the fixed candle in every burial chamber. Coffins, offerings, and the cellar are separate discoveries.',
      '点燃每间墓室固定位置的定魂烛；棺材、供物和地窖均为独立发现。',
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
    this.dynamicShadowSystem?.destroy();
    this.proceduralAudio?.destroy();
    this.wallShadow?.destroy();
    this.corridorMurals?.destroy();
    this.ceremonialGate?.destroy();
    this.clickMove?.destroy();
    this.clickMove = undefined;
    this.arrivalTextReveal?.destroy();
    this.arrivalTextReveal = undefined;
    this.tombMapVeil?.destroy();
    this.roomRevealVeils.forEach((veil) => veil.graphics.destroy());
    this.input.keyboard?.off('keydown', this.ensureAudioStarted, this);
    this.input.off('pointerup', this.handleMuralPointerUp, this);
  }

  private canUseClickMovement(): boolean {
    return Boolean(
      this.player?.isMovementEnabled() &&
      !this.arrivalIntroductionActive &&
      this.tutorialPhase !== 'completed' &&
      this.tutorialPhase !== 'departure-confirmation' &&
      !this.cellarTransitionActive &&
      !this.candleLightingActive &&
      !this.cellarDiscoveryActive &&
      !this.muralDiscoveryActive &&
      !this.backpackMenuActive &&
      !this.activeInvestigation,
    );
  }

  private configureCamera(): void {
    if (!this.player) {
      return;
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
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
    this.actionHints = new ActionHintPanel(this, 90);
    this.updateActionHints();

    this.createObjectiveUI();
    this.createCandleSkillUI();
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

  private createCandleSkillUI(): void {
    const { height } = this.scale;
    const width = 256;
    const panelHeight = 94;
    this.candleSkillBackground = createStyleBoardPanel(
      this,
      width,
      panelHeight,
      'thin',
      0.88,
    );
    const icon = this.add.graphics().setPosition(-98, -15);
    icon.fillStyle(0x4d3821, 1);
    icon.fillRoundedRect(-10, 7, 20, 7, 3);
    icon.lineStyle(1, 0xb18449, 0.9);
    icon.strokeRoundedRect(-10, 7, 20, 7, 3);
    icon.fillStyle(0xd3bd86, 1);
    icon.fillRoundedRect(-5, -14, 10, 22, 3);
    icon.fillStyle(0xe68c43, 0.95);
    icon.fillTriangle(0, -30, -6, -15, 6, -15);
    icon.fillStyle(0xffdda0, 0.95);
    icon.fillEllipse(0, -18, 5, 10);
    const title = this.add.text(-72, -31, 'CHAMBER RITE / 点燃定魂烛', {
      fontFamily: SANS_FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.textBright,
    }).setOrigin(0, 0.5);
    this.candleSkillState = this.add.text(-72, -7, '', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: UI_STYLE_BOARD.colors.muted,
      wordWrap: { width: 184 },
    }).setOrigin(0, 0.5);
    this.candleSkillProgressBar = this.add.graphics();
    this.candleSkillUI = this.add.container(154, height - 112, [
      this.candleSkillBackground,
      icon,
      title,
      this.candleSkillState,
      this.candleSkillProgressBar,
    ])
      .setScrollFactor(0)
      .setDepth(16)
      .setVisible(false);
    this.updateCandleSkillUI();
  }

  private updateCandleSkillUI(): void {
    if (
      !this.candleSkillUI ||
      !this.candleSkillBackground ||
      !this.candleSkillState ||
      !this.candleSkillProgressBar
    ) {
      return;
    }
    const candleSelected = this.nearbyInteraction?.kind === 'room-exploration';
    const remaining = this.getRemainingRoomCount();
    const active = this.candleLightingActive;
    drawStyleBoardPanel(
      this.candleSkillBackground,
      256,
      94,
      active || candleSelected ? 'standard' : 'thin',
      active || candleSelected ? 0.97 : 0.82,
    );
    this.candleSkillState
      .setText(
        active
          ? '引火中…保持仪式'
          : candleSelected
            ? '可施放 · 点亮当前墓室'
            : remaining === 0
              ? '五盏定魂烛已全部点亮'
              : `寻找固定烛台 · 剩余 ${remaining} 盏`,
      )
      .setColor(active || candleSelected ? '#d9b66b' : UI_STYLE_BOARD.colors.muted);
    this.candleSkillProgressBar.clear();
    this.candleSkillProgressBar.fillStyle(0x0a0907, 0.9);
    this.candleSkillProgressBar.fillRect(-72, 13, 174, 5);
    const progress = active ? this.candleLightingProgress : candleSelected ? 0.12 : 0;
    if (progress > 0) {
      this.candleSkillProgressBar.fillStyle(0xd49a43, 0.94);
      this.candleSkillProgressBar.fillRect(-72, 13, 174 * progress, 5);
    }
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

  private updateCameraFollow(deltaSeconds: number): void {
    if (!this.player || this.activeInvestigation || this.cellarTransitionActive) return;
    const velocity = this.player.getMovementVelocity();
    const targetX = Phaser.Math.Clamp(velocity.x * 0.13, -22, 22);
    const targetY = Phaser.Math.Clamp(velocity.y * 0.1, -16, 16);
    const response = 1 - Math.exp(-deltaSeconds * 8.5);
    this.cameraLookAheadX = Phaser.Math.Linear(this.cameraLookAheadX, targetX, response);
    this.cameraLookAheadY = Phaser.Math.Linear(this.cameraLookAheadY, targetY, response);
    if (Math.abs(this.cameraLookAheadX) < 0.05) this.cameraLookAheadX = 0;
    if (Math.abs(this.cameraLookAheadY) < 0.05) this.cameraLookAheadY = 0;
    this.cameras.main.setFollowOffset(-this.cameraLookAheadX, -this.cameraLookAheadY);
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
      `LIGHT CHAMBER CANDLES  ${explored}/${TOMB_ROOM_COUNT}  /  定魂烛 ${explored}/${TOMB_ROOM_COUNT}`,
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
    const background = createStyleBoardPanel(this, 720, 132, 'carved', 0.97);
    const title = this.add
      .text(-324, -44, 'SHOPKEEPER  /', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-206, -44, '古玩店老板', {
        fontFamily: SANS_FONT,
        fontSize: '12px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0, 0.5);
    this.shopkeeperMessageText = this.add
      .text(-324, -21, '', {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        color: UI_STYLE_BOARD.colors.textBright,
        wordWrap: { width: 648 },
      })
      .setOrigin(0, 0);
    this.shopkeeperChineseMessageText = this.add
      .text(-324, 16, '', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.text,
        wordWrap: { width: 648 },
      })
      .setOrigin(0, 0);

    this.shopkeeperMessage = this.add
      .container(width / 2, height - 112, [
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
    this.shopkeeperChineseMessageText.setY(
      this.shopkeeperMessageText.y + this.shopkeeperMessageText.displayHeight + 7,
    );
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
    this.carriedSlotImages = [-13, 31].map((y) =>
      this.add
        .image(-104, y, ARTIFACT_VISUALS['burial-vessel'].inventoryTexture)
        .setDisplaySize(30, 30)
        .setVisible(false),
    );
    this.carriedSlotTexts = [-13, 31].map((y, index) =>
      this.add
        .text(-84, y, `${index + 1}  EMPTY / 空`, {
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
        ...this.carriedSlotImages,
        ...this.carriedSlotTexts,
      ])
      .setScrollFactor(0)
      .setDepth(15);

    this.updateCarryUI();
  }

  private updateCarryUI(): void {
    const carriedArtifacts = this.carrySystem.getCarriedArtifacts();
    this.carryCountText?.setText(
      `${localize('BACKPACK', '背包')}  ${carriedArtifacts.length} / ${this.carrySystem.capacity}`,
    );
    this.carriedSlotTexts.forEach((text, index) => {
      const artifact = carriedArtifacts[index];
      const inHand = artifact?.id === this.carrySystem.getActiveArtifactId();
      const visual = artifact ? getArtifactVisual(artifact.id) : undefined;
      this.carriedSlotImages[index]
        ?.setVisible(Boolean(visual))
        .setTexture(visual?.inventoryTexture ?? ARTIFACT_VISUALS['burial-vessel'].inventoryTexture);
      text.setText(
        artifact
          ? `${index + 1}  ${inHand ? '[HAND] ' : ''}${artifact.englishName} / ${artifact.chineseName}`
          : `${index + 1}  EMPTY / 空`,
      );
      text.setFontSize(14);
      text.setFontSize(text.displayWidth > 226 ? 12 : 14);
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
    const background = createArtPanel(this, 860, 500, 'dark', 0.995);
    const title = this.add.text(-360, -196, 'BACKPACK', {
      fontFamily: SERIF_FONT, fontSize: '30px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.textBright,
    }).setOrigin(0, 0.5);
    const chineseTitle = this.add.text(-360, -196, '背包', {
      fontFamily: SERIF_FONT, fontSize: '30px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.textBright,
    }).setOrigin(0, 0.5);
    this.backpackMenuCountText = this.add.text(354, -194, '', {
      fontFamily: SANS_FONT, fontSize: '15px', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(1, 0.5);

    const children: Phaser.GameObjects.GameObject[] = [scrim, background, title, chineseTitle, this.backpackMenuCountText];
    this.backpackMenuSlotPanels = [];
    this.backpackMenuSlotTexts = [];
    this.backpackMenuSlotImages = [];
    for (let index = 0; index < this.carrySystem.capacity; index += 1) {
      const y = -86 + index * 112;
      const panel = this.add.graphics().setPosition(-170, y);
      const image = this.add
        .image(-302, y, ARTIFACT_VISUALS['burial-vessel'].inventoryTexture)
        .setDisplaySize(78, 78)
        .setVisible(false);
      const text = this.add.text(-248, y, '', {
        fontFamily: SANS_FONT, fontSize: '17px', color: UI_STYLE_BOARD.colors.textBright,
      }).setOrigin(0, 0.5);
      panel
        .setInteractive(
          new Phaser.Geom.Rectangle(-178, -47, 356, 94),
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
      this.backpackMenuSlotImages.push(image);
      children.push(panel, image, text);
    }

    const divider = this.add.rectangle(42, 18, 2, 310, 0x6f5736, 0.65);
    const detailLabel = this.add.text(76, -120, 'SELECTED ITEM / 当前器物', {
      fontFamily: SANS_FONT, fontSize: '13px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(0, 0.5);
    this.backpackMenuDetailImage = this.add
      .image(220, -54, ARTIFACT_VISUALS['burial-vessel'].inventoryTexture)
      .setDisplaySize(132, 132)
      .setVisible(false);
    this.backpackMenuDetailName = this.add.text(76, 28, '', {
      fontFamily: SERIF_FONT, fontSize: '23px', fontStyle: 'bold', color: UI_STYLE_BOARD.colors.textBright,
      wordWrap: { width: 280 },
    }).setOrigin(0, 0);
    this.backpackMenuDetailChineseName = this.add.text(76, 66, '', {
      fontFamily: SERIF_FONT, fontSize: '18px', color: UI_STYLE_BOARD.colors.text,
      wordWrap: { width: 280 },
    }).setOrigin(0, 0);
    this.backpackMenuDetailState = this.add.text(76, 104, '', {
      fontFamily: SANS_FONT, fontSize: '14px', fontStyle: 'bold', color: '#829879',
    }).setOrigin(0, 0);
    this.backpackMenuActionText = this.add.text(76, 142, '', {
      fontFamily: SANS_FONT, fontSize: '16px', fontStyle: 'bold', color: '#d4ad63',
      wordWrap: { width: 280 },
    }).setOrigin(0, 0).setVisible(false);
    const navigation = this.add.text(-348, 192, localize(
      'W / S OR 1 / 2  SELECT     E  CONFIRM     TAB / ESC  CLOSE',
      'W / S 或 1 / 2  选择     E  确认     TAB / ESC  关闭',
    ), {
      fontFamily: SANS_FONT, fontSize: '14px', color: UI_STYLE_BOARD.colors.muted,
    }).setOrigin(0, 0.5).setVisible(false);
    children.push(divider, detailLabel, this.backpackMenuDetailImage, this.backpackMenuDetailName, this.backpackMenuDetailChineseName,
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
      drawStyleBoardPanel(panel, 356, 94, selected ? 'standard' : 'thin', selected ? 0.98 : 0.72);
      const artifact = artifacts[index];
      const inHand = artifact?.id === this.carrySystem.getActiveArtifactId();
      const visual = artifact ? getArtifactVisual(artifact.id) : undefined;
      this.backpackMenuSlotImages[index]
        ?.setVisible(Boolean(visual))
        .setTexture(visual?.inventoryTexture ?? ARTIFACT_VISUALS['burial-vessel'].inventoryTexture)
        .setDisplaySize(visual?.inventorySlots === 2 ? 84 : 72, visual?.inventorySlots === 2 ? 84 : 72);
      this.backpackMenuSlotTexts[index]?.setText(artifact
        ? `${index + 1}  ${artifact.englishName}\n${artifact.chineseName}${inHand ? '   [手持]' : ''}`
        : `${index + 1}   EMPTY / 空`)
        .setColor(selected ? '#f0d8a2' : artifact ? UI_STYLE_BOARD.colors.text : UI_STYLE_BOARD.colors.muted);
    });
    const selected = artifacts[this.backpackSelectionIndex];
    const selectedVisual = selected ? getArtifactVisual(selected.id) : undefined;
    this.backpackMenuDetailImage
      ?.setVisible(Boolean(selectedVisual))
      .setTexture(selectedVisual?.inventoryTexture ?? ARTIFACT_VISUALS['burial-vessel'].inventoryTexture);
    const inHand = selected?.id === this.carrySystem.getActiveArtifactId();
    const storedOnly = selected?.id === 'myriad-character-atlas';
    this.backpackMenuDetailName?.setText(selected?.englishName ?? 'EMPTY SLOT');
    this.backpackMenuDetailChineseName?.setText(selected?.chineseName ?? '空栏位');
    this.backpackMenuDetailState?.setText(
      selected ? storedOnly ? 'CORE RELIC / 核心物品' : inHand ? 'IN HAND / 当前手持' : 'STORED / 已收纳' : 'NO ITEM / 无物品',
    ).setColor(storedOnly ? '#8da58a' : inHand ? '#d4ad63' : '#829879');
    this.backpackMenuActionText?.setText(!selected
      ? localize('THIS SLOT IS EMPTY', '这个栏位是空的')
      : inHand
        ? localize('E  STORE IN BACKPACK', 'E  收回背包')
        : storedOnly
          ? localize('PROTECTED — CANNOT BE LEFT HERE', '核心物品不能留在墓里')
          : localize('E  HOLD THIS ITEM', 'E  取出手持'));
    if (
      this.backpackMenuDetailName &&
      this.backpackMenuDetailChineseName &&
      this.backpackMenuDetailState &&
      this.backpackMenuActionText
    ) {
      this.backpackMenuDetailName.setY(28);
      this.backpackMenuDetailChineseName.setY(
        this.backpackMenuDetailName.y + this.backpackMenuDetailName.displayHeight + 7,
      );
      this.backpackMenuDetailState.setY(
        this.backpackMenuDetailChineseName.y +
          this.backpackMenuDetailChineseName.displayHeight +
          15,
      );
      this.backpackMenuActionText.setY(
        this.backpackMenuDetailState.y + this.backpackMenuDetailState.displayHeight + 28,
      );
    }
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
    this.setHudDimmed(true);
    this.backpackMenu.setVisible(true).setAlpha(0).setScale(0.97);
    this.tweens.add({
      targets: this.backpackMenu, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 180, ease: 'Cubic.Out',
    });
  }

  private closeBackpackMenu(): void {
    this.backpackMenuActive = false;
    this.backpackMenu?.setVisible(false);
    this.setHudDimmed(false);
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

  private setHudDimmed(dimmed: boolean): void {
    const alpha = dimmed ? UI_TOKENS.motion.hudDimAlpha : 1;
    this.objectiveUI?.setAlpha(alpha);
    this.carryUI?.setAlpha(alpha);
    this.candleSkillUI?.setAlpha(alpha);
    this.shopkeeperMessage?.setAlpha(alpha);
    this.lampHintText?.setAlpha(alpha);
  }

  private createDepartureConfirmation(): void {
    const { width, height } = this.scale;
    const background = createArtPanel(this, 800, 420, 'dark', 0.99);
    const title = this.add
      .text(0, -165, 'LEAVE THE TOMB?', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#eee4c9',
      })
      .setOrigin(0.5);
    const chineseTitle = this.add
      .text(0, -130, '现在离开墓穴吗？', {
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
      .text(0, -65, '离开后，本次探索将直接结束。', {
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
        align: 'center',
        wordWrap: { width: 660 },
      })
      .setOrigin(0.5);
    this.departureCarriedChinese = this.add
      .text(0, 70, '', {
        fontFamily: SERIF_FONT,
        fontSize: '16px',
        color: '#9da38b',
        align: 'center',
        wordWrap: { width: 660 },
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
    const resultFrame = createArtPanel(this, 1040, 650, 'dark', 0.98);
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
      .text(0, 88, '罗盘下的包布里，还夹着一本空白线装册。\n供物归位后留下的圆形尘印，也许能帮助老板辨认它们。', {
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
      .setOrigin(0.5)
      .setVisible(false);

    this.resultPanel = this.add
      .container(width / 2, height / 2, [
        background,
        resultFrame,
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
    this.inputActions = InputActionManager.forScene(this);
    this.input.keyboard?.on('keydown', this.ensureAudioStarted, this);
  }

  private getInputContext(): string {
    if (this.tutorialPhase === 'transition-to-shop' || this.cellarTransitionActive) return 'transition';
    if (this.arrivalIntroductionActive) return 'tomb-arrival-dialogue';
    if (this.tutorialPhase === 'completed') return 'tomb-completed';
    if (this.tutorialPhase === 'departure-confirmation') return 'tomb-departure-confirm';
    if (this.cellarDiscoveryActive) return 'tomb-cellar-discovery';
    if (this.muralDiscoveryActive) return 'tomb-mural-discovery';
    if (this.backpackMenuActive) return 'tomb-backpack';
    if (this.activeInvestigation) return `tomb-investigation:${this.activeInvestigation.id}`;
    if (this.candleLightingActive) return 'tomb-candle-action';
    return 'tomb-world';
  }

  private updateActionHints(): void {
    if (!this.actionHints) return;
    const actions: ActionHint[] = [];
    const add = (key: string, english: string, chinese: string, primary = false) =>
      actions.push({ key, label: localize(english, chinese), primary });

    if (this.cellarTransitionActive || this.candleLightingActive) {
      this.actionHints.setActions([]);
      return;
    }
    if (this.arrivalIntroductionActive) {
      add('E', 'Continue', '继续', true);
    } else if (this.tutorialPhase === 'completed') {
      add('E', 'Return to shop', '返回店铺', true);
      add('ESC', 'Pause', '暂停');
    } else if (this.tutorialPhase === 'departure-confirmation') {
      add('E', 'Leave the tomb', '离开墓穴', true);
      add('ESC', 'Stay', '留下');
    } else if (this.cellarDiscoveryActive) {
      add('E', 'Take the Atlas', '收好《万字藏图》', true);
      add('TAB', 'Manage backpack', '整理背包');
      add('ESC', 'Close', '关闭');
    } else if (this.muralDiscoveryActive) {
      add('E', 'Close', '关闭', true);
      add('ESC', 'Close', '关闭');
    } else if (this.backpackMenuActive) {
      add('E', 'Hold / store selected relic', '手持 / 收好所选物品', true);
      add('W/S', 'Select slot', '选择槽位');
      add('TAB', 'Close backpack', '关闭背包');
      add('ESC', 'Close', '关闭');
    } else if (this.activeInvestigation) {
      add('E', this.isSealedCoffin(this.activeInvestigation) ? 'Open coffin' : 'Continue', this.isSealedCoffin(this.activeInvestigation) ? '打开棺椁' : '继续', true);
      add('TAB', 'Backpack', '背包');
      add('ESC', 'Close', '关闭');
    } else {
      const target = this.nearbyInteraction;
      if (target?.kind === 'artifact') {
        const artifact = target.artifact;
        if (!artifact.portable) {
          add('E', 'Investigate', '调查', true);
        } else if (!this.carrySystem.isFull()) {
          add('E', `Take ${artifact.englishName}`, `拿取${artifact.chineseName}`, true);
        } else {
          const swap = this.getDirectSwapCandidate();
          add(
            'E',
            swap ? `Swap for ${artifact.englishName}` : 'Backpack full',
            swap ? `互换${artifact.chineseName}` : '背包已满',
            true,
          );
        }
      } else if (target?.kind === 'empty-spot') {
        const held = this.carrySystem.getCarriedArtifact();
        add('E', `Place ${held?.englishName ?? 'relic'}`, `放下${held?.chineseName ?? '物品'}`, true);
      } else if (target?.kind === 'room-exploration') {
        add('E', `Light ${target.point.englishName}`, `点燃${target.point.chineseName}`, true);
      } else if (target?.kind === 'locked-exit') {
        add('E', 'Inspect sealed exit', '查看封闭出口', true);
      } else if (target?.kind === 'exit') {
        add('E', 'Leave the tomb', '离开墓穴', true);
      } else if (target?.kind === 'cellar-portal') {
        add('E', 'Enter portal', '进入传送门', true);
      } else if (target?.kind === 'cellar-return-portal') {
        add('E', 'Return through portal', '通过传送门返回', true);
      } else if (target?.kind === 'cellar-atlas') {
        add('E', 'Investigate the Atlas', '查看《万字藏图》', true);
      } else if (target?.kind === 'corridor-mural') {
        add('E', 'Inspect mural', '查看壁画', true);
      }
      add('WASD', 'Move', '移动');
      add('TAB', 'Backpack', '背包');
      add('F', this.directionalLamp?.isOn() ? 'Extinguish lamp' : 'Light lamp', this.directionalLamp?.isOn() ? '熄灯' : '点灯');
      add('ESC', 'Pause', '暂停');
    }
    this.actionHints.setActions(actions);
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
      { key: 'north', source: [422, 28, 334, 262], target: [515, 20, 570, 300] },
      { key: 'north-link', source: [548, 278, 84, 60], target: [752, 288, 96, 94] },
      { key: 'west', source: [72, 335, 292, 223], target: [25, 410, 495, 210] },
      { key: 'central', source: [337, 291, 510, 287], target: [520, 350, 560, 280] },
      { key: 'east', source: [844, 335, 326, 223], target: [1080, 410, 495, 210] },
      { key: 'south', source: [455, 566, 276, 158], target: [560, 620, 480, 180] },
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

    this.mainCellarPortal = createCellarPortalVisual(
      this,
      MAIN_CELLAR_PORTAL_INTERACTION_X,
      MAIN_CELLAR_PORTAL_FLOOR_Y,
      this.getSceneryDepth(MAIN_CELLAR_PORTAL_FLOOR_Y) - 0.2,
    );
    this.mainCellarPortalPrompt = createStyleBoardPrompt(
      this,
      'E',
      localize('Enter Portal', '进入传送门'),
      278,
      44,
    )
      .setPosition(MAIN_CELLAR_PORTAL_INTERACTION_X, MAIN_CELLAR_PORTAL_FLOOR_Y - 166)
      .setDepth(8)
      .setVisible(false);

    this.cellarReturnPortal = createCellarPortalVisual(
      this,
      CELLAR_CENTER_X,
      CELLAR_RETURN_PORTAL_FLOOR_Y,
      this.getSceneryDepth(CELLAR_RETURN_PORTAL_FLOOR_Y) - 0.2,
    );
    this.cellarReturnPortalPrompt = createStyleBoardPrompt(
      this,
      'E',
      localize('Return to Burial Chamber', '返回主墓室'),
      310,
      44,
    )
      .setPosition(CELLAR_CENTER_X, CELLAR_RETURN_PORTAL_FLOOR_Y - 166)
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

    const noticeBackground = createStyleBoardPanel(this, 660, 132, 'carved', 0.98);
    const noticeTitle = this.add
      .text(-288, -42, 'A HOLLOW SPACE ANSWERS', {
        fontFamily: SERIF_FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0, 0.5)
      .setVisible(false);
    const noticeBody = this.add
      .text(-288, -12, localize(
        'Blue-violet light folds inward, opening a passage beyond the drawn tomb plan.',
        '蓝紫色的光向内折叠，打开了一条通往墓图之外的通道。',
      ), {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: UI_STYLE_BOARD.colors.text,
        lineSpacing: 5,
        wordWrap: { width: 576 },
      })
      .setOrigin(0, 0);
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

  private getActivePointLights(time: number): TombPointLight[] {
    const lights: TombPointLight[] = [];
    if (this.candleIgnitionLight) lights.push(this.candleIgnitionLight);
    for (const source of this.staticTombLights) {
      if (!source.sprite.visible || source.sprite.alpha <= 0.02) continue;
      const pulse = 0.94 + Math.sin(time / 126 + source.sprite.x * 0.01) * 0.06;
      lights.push({
        x: source.sprite.x,
        y: source.sprite.y + source.offsetY,
        radius: source.radius,
        intensity: source.intensity * source.sprite.alpha * pulse,
        color: source.color,
      });
    }
    for (const point of this.roomExplorationPoints) {
      const light = point.candle.getLightSource();
      if (light) lights.push(light);
    }
    const mainPortalLight = this.mainCellarPortal?.getLightSource();
    const returnPortalLight = this.cellarReturnPortal?.getLightSource();
    if (mainPortalLight) lights.push(mainPortalLight);
    if (returnPortalLight) lights.push(returnPortalLight);
    lights.push(...(this.ceremonialGate?.getPointLights() ?? []));
    return lights;
  }

  private updateDynamicShadows(pointLights: readonly TombPointLight[]): void {
    if (!this.player || !this.dynamicShadowSystem) return;
    const lamp = this.directionalLamp?.getDebugInfo();
    const flashlight = lamp && lamp.isOn && lamp.brightness > 0.01
      ? {
          x: lamp.originX,
          y: lamp.originY,
          angle: lamp.angleRadians,
          distance: TOMB_FEEL.lamp.effectiveDistance,
          halfAngle: TOMB_FEEL.lamp.coneHalfAngle,
          intensity: lamp.brightness,
        }
      : null;
    const casters: TombShadowCaster[] = [
      {
        x: this.player.x,
        y: this.player.y + 8,
        radius: 12,
        height: 48,
        visible: this.player.visible,
      },
      ...this.investigableObjects.map((artifact) => ({
        x: artifact.worldX,
        y: artifact.worldY + 3,
        radius: artifact.id === 'sealed-coffin' ? 30 : 13,
        height: artifact.id === 'sealed-coffin' ? 38 : 42,
        visible:
          artifact.isAvailable &&
          artifact.locationState === 'world' &&
          artifact.visualObject.visible,
      })),
    ];
    this.dynamicShadowSystem.update(flashlight, pointLights, casters);
  }

  private createCellarDiscoveryPanel(): void {
    const { width, height } = this.scale;
    const background = createArtPanel(this, 900, 480, 'paper', 0.995);
    const anomalyBand = this.add.rectangle(-382, 0, 5, 390, 0x486d55, 0.95);
    const previewFrame = createStyleBoardPanel(this, 230, 280, 'standard', 0.88).setX(-248);
    const preview = this.add
      .image(-248, 2, ARTIFACT_VISUALS['myriad-character-atlas'].inspectionTexture)
      .setDisplaySize(244, 183);
    const title = this.add
      .text(-90, -176, 'MYRIAD CHARACTER ATLAS', {
        fontFamily: SERIF_FONT,
        fontSize: '27px',
        fontStyle: 'bold',
        color: UI_TOKENS.theme.paper.text,
      })
      .setOrigin(0, 0.5);
    const chineseTitle = this.add
      .text(-90, -137, '万字藏图', {
        fontFamily: SERIF_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#55766c',
      })
      .setOrigin(0, 0.5);
    const body = this.add
      .text(
        -90,
        -84,
        'The paper is dry. The cellar is not.\nRoutes appear only when the compass needle turns away.\n\n地窖这么潮，纸页却是干的。\n只有当罗盘指针偏离方位时，纸上的路线才会显出来。',
        {
          fontFamily: SANS_FONT,
          fontSize: '16px',
          color: '#3d2a1d',
          lineSpacing: 8,
          wordWrap: { width: 430 },
        },
      )
      .setOrigin(0, 0);
    this.cellarDiscoveryAction = this.add
      .text(-90, 146, 'E  STORE IN BACKPACK  /  收入背包', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#6c351f',
        wordWrap: { width: 430 },
        maxLines: 3,
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setVisible(false);
    this.cellarDiscoveryAction.setY(
      Math.min(146, body.y + body.displayHeight + 20),
    );
    const close = this.add
      .text(390, 194, 'ESC  Close / 关闭', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#684a2f',
      })
      .setOrigin(1, 0.5)
      .setVisible(false);
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
        '揭开残画 / Examine',
        190,
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
    const scrim = this.add.rectangle(-width / 2, -height / 2, width, height, 0x050605, 0.94)
      .setOrigin(0);
    const shell = this.add.graphics();
    shell.fillStyle(0x11120f, 0.985);
    shell.fillRoundedRect(-592, -320, 1184, 640, 8);
    shell.lineStyle(1, 0x927b55, 0.78);
    shell.strokeRoundedRect(-592, -320, 1184, 640, 8);
    shell.lineStyle(1, 0x35352f, 0.9);
    shell.strokeRoundedRect(-584, -312, 1168, 624, 5);

    const headerRule = this.add.rectangle(0, -256, 1104, 1, 0x6f6048, 0.58);
    const previewBacking = this.add
      .rectangle(-171, 18, 778, 516, 0x080908, 1)
      .setStrokeStyle(1, 0x635742, 0.72);
    const notesBacking = this.add
      .rectangle(402, 18, 318, 516, 0x171713, 0.94)
      .setStrokeStyle(1, 0x3f3d34, 0.86);
    this.muralDiscoveryPreview = this.add
      .image(-171, 18, CORRIDOR_MURAL_TEXTURES.leftUpper)
      .setDisplaySize(754, 492);
    const pigmentShade = this.add
      .rectangle(-171, 18, 754, 492, 0x17120d, 0.035);

    this.muralDiscoveryMeta = this.add.text(-548, -286, localize('MURAL ARCHIVE', '壁画记录'), {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#b7a27c',
      letterSpacing: 1.2,
    }).setOrigin(0, 0.5);
    setTypographyRole(this.muralDiscoveryMeta, 'meta-light');
    this.muralDiscoveryCounter = this.add.text(500, -286, '01 / 04', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#93856c',
      letterSpacing: 1,
    }).setOrigin(1, 0.5);
    setTypographyRole(this.muralDiscoveryCounter, 'meta-light');
    this.muralDiscoveryAccent = this.add.rectangle(258, -210, 54, 2, 0xa84b36, 0.9)
      .setOrigin(0, 0.5);
    this.muralDiscoveryChineseTitle = this.add.text(258, -188, '', {
      fontFamily: SERIF_FONT,
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#dfcfad',
      wordWrap: { width: 284, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    setTypographyRole(this.muralDiscoveryChineseTitle, 'dialogue-body-light');
    this.muralDiscoveryEnglishTitle = this.add.text(258, -146, '', {
      fontFamily: SANS_FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#9f957f',
      letterSpacing: 0.6,
      wordWrap: { width: 284, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    setTypographyRole(this.muralDiscoveryEnglishTitle, 'meta-light');
    const bodyRule = this.add.rectangle(258, -112, 284, 1, 0x5a5548, 0.48)
      .setOrigin(0, 0.5);
    this.muralDiscoveryChineseBody = this.add.text(258, -88, '', {
      fontFamily: SANS_FONT,
      fontSize: '16px',
      color: '#d7cfbd',
      lineSpacing: 9,
      wordWrap: { width: 284, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    setTypographyRole(this.muralDiscoveryChineseBody, 'dialogue-translation-light');
    this.muralDiscoveryEnglishBody = this.add.text(258, 76, '', {
      fontFamily: SANS_FONT,
      fontSize: '12px',
      color: '#8f897b',
      lineSpacing: 5,
      wordWrap: { width: 284, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    setTypographyRole(this.muralDiscoveryEnglishBody, 'meta-light');
    const hint = this.add.text(548, -286, '×', {
      fontFamily: SANS_FONT,
      fontSize: '27px',
      color: '#9f9278',
    }).setOrigin(0.5);
    setTypographyRole(hint, 'hint-light');
    const closeZone = this.add.rectangle(548, -286, 50, 46, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => hint.setColor('#e3c580'))
      .on('pointerout', () => hint.setColor('#9f9278'))
      .on('pointerup', () => this.closeMuralDiscovery());
    this.muralDiscoveryCloseHitArea = closeZone;
    this.muralDiscoveryTextGroup = this.add.container(0, 0, [
      this.muralDiscoveryMeta,
      this.muralDiscoveryCounter,
      this.muralDiscoveryAccent,
      this.muralDiscoveryChineseTitle,
      this.muralDiscoveryEnglishTitle,
      bodyRule,
      this.muralDiscoveryChineseBody,
      this.muralDiscoveryEnglishBody,
      hint,
    ]);
    this.muralDiscoveryPanel = this.add.container(width / 2, height / 2, [
      scrim,
      shell,
      headerRule,
      previewBacking,
      notesBacking,
      this.muralDiscoveryPreview,
      pigmentShade,
      this.muralDiscoveryTextGroup,
      closeZone,
    ]).setScrollFactor(0).setDepth(37).setVisible(false);
  }

  private openMuralDiscovery(mural: TombCorridorMuralPanel): void {
    if (!this.player || !this.muralDiscoveryPanel || this.muralDiscoveryActive) {
      return;
    }
    this.muralDiscoveryActive = true;
    this.muralDiscoveryClosing = false;
    this.player.setMovementEnabled(false);
    this.nearbyInteraction = undefined;
    this.updateInteractionPrompt();
    this.muralDiscoveryPreview?.setTexture(mural.textureKey);
    if (this.muralDiscoveryPreview) {
      const source = this.textures.get(mural.textureKey).getSourceImage() as
        | HTMLImageElement
        | HTMLCanvasElement;
      const fit = Math.min(754 / source.width, 492 / source.height);
      this.muralDiscoveryPreview.setDisplaySize(source.width * fit, source.height * fit);
      this.muralDiscoveryPreview.setData('revealScaleX', this.muralDiscoveryPreview.scaleX);
      this.muralDiscoveryPreview.setData('revealScaleY', this.muralDiscoveryPreview.scaleY);
    }
    this.muralDiscoveryEnglishTitle?.setText(mural.englishName.toUpperCase());
    this.muralDiscoveryChineseTitle?.setText(mural.chineseName);
    this.muralDiscoveryEnglishBody?.setText(mural.description);
    this.muralDiscoveryChineseBody?.setText(mural.chineseDescription);
    const muralIndex = Math.max(
      0,
      (this.corridorMurals?.getPanels() ?? []).findIndex((panel) => panel.id === mural.id),
    );
    const accentColors: Record<TombCorridorMuralPanel['id'], number> = {
      'soul-guide': 0xb24f38,
      'tomb-guardian': 0x58725b,
      'crane-crossing': 0xb28d4f,
      'underworld-court': 0x627780,
    };
    this.muralDiscoveryCounter?.setText(
      `${String(muralIndex + 1).padStart(2, '0')} / 04`,
    );
    this.muralDiscoveryAccent?.setFillStyle(accentColors[mural.id], 0.95);

    this.tweens.killTweensOf([
      this.muralDiscoveryPanel,
      this.muralDiscoveryPreview,
      this.muralDiscoveryTextGroup,
    ]);
    this.muralDiscoveryPanel.setVisible(true).setAlpha(0).setScale(1);
    const previewScaleX = this.muralDiscoveryPreview?.getData('revealScaleX') as number | undefined;
    const previewScaleY = this.muralDiscoveryPreview?.getData('revealScaleY') as number | undefined;
    if (this.muralDiscoveryPreview && previewScaleX && previewScaleY) {
      this.muralDiscoveryPreview
        .setAlpha(0.45)
        .setScale(previewScaleX * 1.008, previewScaleY * 1.008);
    }
    this.muralDiscoveryTextGroup?.setAlpha(0).setX(12);
    this.tweens.add({
      targets: this.muralDiscoveryPanel,
      alpha: 1,
      duration: 150,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: this.muralDiscoveryPreview,
      alpha: 1,
      scaleX: previewScaleX,
      scaleY: previewScaleY,
      duration: 320,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: this.muralDiscoveryTextGroup,
      alpha: 1,
      x: 0,
      delay: 60,
      duration: 220,
      ease: 'Cubic.Out',
    });
    this.proceduralAudio?.playCue('correct');
  }

  private closeMuralDiscovery(): void {
    if (!this.muralDiscoveryActive || this.muralDiscoveryClosing) return;
    this.muralDiscoveryClosing = true;
    this.tweens.add({
      targets: this.muralDiscoveryPanel,
      alpha: 0,
      duration: 160,
      ease: 'Sine.In',
      onComplete: () => {
        this.muralDiscoveryActive = false;
        this.muralDiscoveryClosing = false;
        this.muralDiscoveryPanel?.setVisible(false).setAlpha(1);
        this.player?.setMovementEnabled(true);
        this.updateNearestInteraction();
      },
    });
  }

  private handleMuralPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.muralDiscoveryActive || !this.muralDiscoveryCloseHitArea) return;
    const bounds = this.muralDiscoveryCloseHitArea.getBounds();
    if (bounds.contains(pointer.x, pointer.y)) {
      this.closeMuralDiscovery();
    }
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
      { x: 515, y: 20, width: 570, height: 32 },
      { x: 515, y: 20, width: 32, height: 300 },
      { x: 1053, y: 20, width: 32, height: 300 },
      { x: 515, y: 288, width: 229, height: 32 },
      { x: 856, y: 288, width: 229, height: 32 },
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
      { x: 25, y: 410, width: 495, height: 32 },
      { x: 25, y: 410, width: 32, height: 210 },
      { x: 25, y: 588, width: 495, height: 32 },
      { x: 488, y: 410, width: 32, height: 54 },
      { x: 488, y: 544, width: 32, height: 76 },
      { x: 1080, y: 410, width: 495, height: 32 },
      { x: 1543, y: 410, width: 32, height: 210 },
      { x: 1080, y: 588, width: 495, height: 32 },
      { x: 1080, y: 410, width: 32, height: 54 },
      { x: 1080, y: 544, width: 32, height: 76 },
      { x: 560, y: 620, width: 184, height: 32 },
      { x: 856, y: 620, width: 184, height: 32 },
      { x: 560, y: 620, width: 32, height: 180 },
      { x: 1008, y: 620, width: 32, height: 180 },
      { x: 560, y: 768, width: 192, height: 32 },
      { x: 848, y: 768, width: 192, height: 32 },
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
      { x: 547, y: 52, width: 506, height: 236 },
      { x: 752, y: 288, width: 96, height: 94 },
      { x: 552, y: 382, width: 496, height: 216 },
      { x: 57, y: 442, width: 431, height: 146 },
      { x: 488, y: 464, width: 64, height: 80 },
      { x: 1080, y: 464, width: 32, height: 80 },
      { x: 1112, y: 442, width: 431, height: 146 },
      { x: 592, y: 652, width: 416, height: 116 },
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
    this.createTombProp(600, 154, 'pillar-a');
    this.createTombProp(1000, 154, 'pillar-b');
    this.createTombProp(620, 258, 'urn-green');
    this.createTombProp(700, 98, 'stone-slab');
    this.createTombProp(900, 98, 'stone-slab');

    // Central antechamber: four stable offering slots surround a low ritual chest.
    this.createTombProp(800, 514, 'coffin-plain');
    this.createTombProp(OFFERING_NORTH_X, OFFERING_NORTH_Y, 'urn-green');
    this.createTombProp(OFFERING_SOUTH_X, OFFERING_SOUTH_Y, 'ritual-idol');
    this.createTombProp(600, 574, 'stone-slab');
    this.createTombProp(1000, 574, 'stone-slab');

    // West ear chamber: pottery store and burial rack around the low-value vessel.
    this.createTombProp(120, 570, 'burial-rack');
    this.createTombProp(198, 564, 'urn-purple');
    this.createTombProp(374, 564, 'urn-purple');
    this.createTombProp(468, 478, 'ritual-idol');

    // East ear chamber: green-glazed offerings and columns frame the mirror display.
    this.createTombProp(1130, 566, 'pillar-a');
    this.createTombProp(1500, 566, 'pillar-b');
    this.createTombProp(1160, 474, 'urn-green');
    this.createTombProp(1395, 562, 'urn-green');
    this.createTombProp(1510, 500, 'burial-rack');

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
      const sprite = this.createAnimatedScenery(animatedProp);
      this.animatedFlames.push(sprite);
      const isCandle = animatedProp.animation.includes('candle');
      this.staticTombLights.push({
        sprite,
        radius: isCandle ? 132 : 176,
        intensity: isCandle ? 0.42 : 0.58,
        color: isCandle ? 0xffb55f : 0xff9f4f,
        offsetY: isCandle ? -34 : -48,
      });
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
        chineseDescription: '棺盖没有动过，边缘的灰却薄得不正常。',
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
      .image(0, 0, ARTIFACT_VISUALS['myriad-character-atlas'].worldTexture)
      .setDisplaySize(58, 58)
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
      .image(0, 0, ARTIFACT_VISUALS['burial-vessel'].worldTexture)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(58, 58);

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
      .image(0, 0, ARTIFACT_VISUALS['bronze-mirror'].worldTexture)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(62, 62);

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
      .image(0, 0, ARTIFACT_VISUALS['geomancers-compass'].worldTexture)
      .setOrigin(0.5, 0.84)
      .setDisplaySize(62, 62);

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
      if (this.cellarPortalsActive) {
        const portalDistance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          MAIN_CELLAR_PORTAL_INTERACTION_X,
          MAIN_CELLAR_PORTAL_INTERACTION_Y,
        );
        if (
          portalDistance <= 112 * TOMB_FEEL.interaction.radiusMultiplier &&
          this.isInteractionVisible(
            MAIN_CELLAR_PORTAL_INTERACTION_X,
            MAIN_CELLAR_PORTAL_INTERACTION_Y,
          )
        ) {
          candidates.push({
            kind: 'cellar-portal',
            stableId: 'burial-chamber-cellar-portal',
            distance: this.getInteractionScore(
              MAIN_CELLAR_PORTAL_INTERACTION_X,
              MAIN_CELLAR_PORTAL_INTERACTION_Y,
              portalDistance,
            ),
          });
        }
      }
    } else {
      const portalDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        CELLAR_CENTER_X,
        CELLAR_RETURN_PORTAL_INTERACTION_Y,
      );
      if (this.cellarPortalsActive && portalDistance <= 112 * TOMB_FEEL.interaction.radiusMultiplier) {
        candidates.push({
          kind: 'cellar-return-portal',
          stableId: 'hidden-cellar-return-portal',
          distance: portalDistance,
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

    this.nearbyInteraction = this.interactionController?.select(
      candidates.map((candidate, index) => ({
        id: candidate.stableId,
        value: candidate,
        score: index * 100 + candidate.distance * 0.001,
      })),
    ) ?? candidates[0];
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
      artifact.setNearby(selected);
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
      point.candle.setNearby(
        this.nearbyInteraction?.kind === 'room-exploration' &&
          this.nearbyInteraction.point === point &&
          !this.activeInvestigation &&
          !this.candleLightingActive,
      );
    }
    this.updateCandleSkillUI();

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
    this.mainCellarPortalPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'cellar-portal' &&
        !this.activeInvestigation &&
        !this.cellarDiscoveryActive,
    );
    this.cellarReturnPortalPrompt?.setVisible(
      this.nearbyInteraction?.kind === 'cellar-return-portal' && !this.cellarDiscoveryActive,
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
    const panelWidth = 960;
    const panelHeight = 560;

    const background = createArtPanel(this, panelWidth, panelHeight, 'paper', 0.99);
    this.panelArtifactImage = this.add
      .image(244, -12, ARTIFACT_VISUALS['burial-vessel'].inspectionTexture)
      .setDisplaySize(430, 322)
      .setVisible(false);

    this.panelEnglishName = this.add
      .text(-440, -244, '', {
        fontFamily: SERIF_FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: UI_TOKENS.theme.paper.text,
      })
      .setOrigin(0, 0);

    this.panelChineseName = this.add
      .text(-440, -206, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#684a2f',
      })
      .setOrigin(0, 0);

    this.panelDescription = this.add
      .text(-440, -174, '', {
        fontFamily: SERIF_FONT,
        fontSize: '17px',
        color: '#3d2a1d',
        wordWrap: { width: 430 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.panelChineseDescription = this.add
      .text(-440, -112, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#5b422d',
        wordWrap: { width: 430 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);

    this.panelAppraisalTitle = this.add
      .text(-440, -48, 'APPRAISAL / 鉴定线索', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#76572f',
        letterSpacing: 1,
      })
      .setOrigin(0, 0);

    this.panelAppraisalText = this.add
      .text(-440, -18, '', {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: '#3d2a1d',
        wordWrap: { width: 430 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.panelChineseAppraisalText = this.add
      .text(-440, 48, '', {
        fontFamily: SERIF_FONT,
        fontSize: '14px',
        color: '#5b422d',
        wordWrap: { width: 430 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);

    this.panelCarryAction = this.add
      .text(-440, 146, '', {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#6c351f',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.panelSwapDescription = this.add
      .text(-440, 176, '', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#4d3828',
        wordWrap: { width: 430 },
      })
      .setOrigin(0, 0);
    this.panelSwapChineseDescription = this.add
      .text(-440, 208, '', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#5b422d',
        wordWrap: { width: 430 },
      })
      .setOrigin(0, 0);

    const closeHint = this.add
      .text(440, 252, 'TAB  BACKPACK / 背包     ESC  CLOSE / 关闭', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#684a2f',
      })
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.investigationCloseHint = closeHint;
    closeHint.setVisible(false);

    this.investigationPanel = this.add
      .container(width / 2, height - panelHeight / 2 - 18, [
        background,
        this.panelArtifactImage,
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
    if (!artifact.portable) {
      this.openInvestigation(artifact);
      return;
    }
    this.takeOrSwapArtifact(artifact);
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
    for (const point of this.roomExplorationPoints) {
      point.promptObject.setVisible(false);
    }
    this.lockedExitPrompt?.setVisible(false);
    investigableObject.beginInvestigation();

    this.panelEnglishName.setText(investigableObject.englishName);
    this.panelChineseName.setText(investigableObject.chineseName);
    this.panelDescription.setText(investigableObject.description);
    this.panelChineseDescription.setText(investigableObject.chineseDescription);
    const visual = getArtifactVisual(investigableObject.id);
    this.panelArtifactImage
      ?.setVisible(Boolean(visual))
      .setTexture(visual?.inspectionTexture ?? ARTIFACT_VISUALS['burial-vessel'].inspectionTexture);
    this.updateAppraisalPanel(investigableObject);
    this.updatePanelCarryAction(investigableObject);
    this.layoutInvestigationPanel();
    this.investigationPanel.setVisible(true);
    this.setHudDimmed(true);
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
        `背包满了。按 TAB 取出一件器物，再把它放回对应位置。${carriedArtifact ? ` 当前手持：${carriedArtifact.chineseName}` : ''}`,
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
      this.panelSwapChineseDescription.setText('请先归还一件非核心器物；《万字藏图》不能留在墓中。');
      return;
    }

    this.panelSwapDescription.setText(
      `Leave ${carriedArtifact?.englishName ?? 'the active relic'} here and take ${artifact.englishName}.`,
    );
    this.panelSwapChineseDescription.setText(
      `把${carriedArtifact.chineseName}留在这里，拿走${artifact.chineseName}。`,
    );
  }

  private layoutInvestigationPanel(): void {
    if (
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

    let cursor = -246;
    this.panelEnglishName.setY(cursor);
    cursor += this.panelEnglishName.displayHeight + 1;
    this.panelChineseName.setY(cursor);
    cursor += this.panelChineseName.displayHeight + 15;
    this.panelDescription.setY(cursor);
    cursor += this.panelDescription.displayHeight + 8;
    this.panelChineseDescription.setY(cursor);
    cursor += this.panelChineseDescription.displayHeight + 17;

    if (this.panelAppraisalTitle.visible) {
      this.panelAppraisalTitle.setY(cursor);
      cursor += this.panelAppraisalTitle.displayHeight + 7;
      this.panelAppraisalText.setY(cursor);
      cursor += this.panelAppraisalText.displayHeight + 8;
      this.panelChineseAppraisalText.setY(cursor);
      cursor += this.panelChineseAppraisalText.displayHeight + 18;
    }

    this.panelCarryAction.setY(cursor);
    cursor += this.panelCarryAction.displayHeight + 9;
    this.panelSwapDescription.setY(cursor);
    if (this.panelSwapDescription.text) {
      cursor += this.panelSwapDescription.displayHeight + 5;
    }
    this.panelSwapChineseDescription.setY(cursor);
    this.investigationCloseHint?.setY(252);
  }

  private closeInvestigation(): void {
    if (!this.activeInvestigation || !this.player || !this.investigationPanel) {
      return;
    }

    this.activeInvestigation.endInvestigation();
    this.activeInvestigation = undefined;
    this.player.setMovementEnabled(true);
    this.investigationPanel.setVisible(false);
    this.panelArtifactImage?.setVisible(false);
    this.setHudDimmed(false);
    this.instructionText?.setVisible(true);
    this.escapeHintText?.setVisible(true);
    this.updateNearestInteraction();
  }

  private activateCellarPortals(): void {
    if (this.cellarPortalsActive) return;
    this.cellarPortalsActive = true;
    // The authored candle at (910, 244) sits directly behind the portal opening.
    // Hide only that decorative flame so it cannot read as part of the vortex.
    this.staticTombLights
      .find(({ sprite }) => Phaser.Math.Distance.Between(
        sprite.x,
        sprite.y,
        MAIN_CELLAR_PORTAL_INTERACTION_X,
        MAIN_CELLAR_PORTAL_INTERACTION_Y,
      ) < 16)
      ?.sprite.setVisible(false);
    this.nearbyInteraction = undefined;
    this.mainCellarPortalPrompt?.setVisible(false);
    this.mainCellarPortal?.activate(true);
    this.cellarReturnPortal?.activate(true);
    this.cellarEntryNotice?.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.cellarEntryNotice,
      alpha: 1,
      duration: 240,
      yoyo: true,
      hold: 2300,
      onComplete: () => this.cellarEntryNotice?.setVisible(false),
    });
    this.proceduralAudio?.playCue('door-unlock');
    this.updateObjectiveUI(
      'A portal has formed in the burial chamber. Enter it and find what the geomancer concealed.',
      '主墓室中生成了一道传送门。进去看看风水师把什么藏在了里面。',
    );
    this.updateNearestInteraction();
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
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(310, () => {
      if (!this.player) {
        return;
      }
      this.currentTombMap = destination;
      this.player.setEnvironmentGrade(destination === 'cellar' ? 'cellar' : 'tomb');
      if (destination === 'cellar') {
        this.mainMapVeilWasVisible = Boolean(this.tombMapVeil?.visible);
        this.tombMapVeil?.setVisible(false);
        this.player.setPosition(CELLAR_CENTER_X, CELLAR_RETURN_PORTAL_INTERACTION_Y - 72);
        (this.player.body as Phaser.Physics.Arcade.Body | null)?.reset(
          CELLAR_CENTER_X,
          CELLAR_RETURN_PORTAL_INTERACTION_Y - 72,
        );
        this.cameras.main.setBounds(
          CELLAR_CENTER_X - this.scale.width / 2,
          CELLAR_ROOM.y + CELLAR_ROOM.height / 2 - this.scale.height / 2,
          this.scale.width,
          this.scale.height,
        );
        this.updateObjectiveUI(
          this.cellarAtlasCollected
            ? 'Return through the portal with the Myriad Character Atlas.'
            : 'Search the hidden cellar. The northern pedestal is unnaturally dry.',
          this.cellarAtlasCollected
            ? '收好《万字藏图》，通过传送门返回主墓室。'
            : '搜索隐藏地窖。北侧石台异常干燥，先去那里看看。',
        );
        this.activeLocationTitle?.container.destroy(true);
        this.activeLocationTitle = createTimedLocationTitle(this, {
          english: 'THE HIDDEN CELLAR',
          chinese: '隐墓地窖',
          width: 520,
        });
        this.activeLocationTitle.play();
      } else {
        this.player.setPosition(
          MAIN_CELLAR_PORTAL_INTERACTION_X - 64,
          MAIN_CELLAR_PORTAL_INTERACTION_Y + 6,
        );
        (this.player.body as Phaser.Physics.Arcade.Body | null)?.reset(
          MAIN_CELLAR_PORTAL_INTERACTION_X - 64,
          MAIN_CELLAR_PORTAL_INTERACTION_Y + 6,
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
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.time.delayedCall(310, () => {
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
        ? 'TAB  MANAGE BACKPACK / 背包已满，先归还一件非核心器物'
        : 'E  STORE IN BACKPACK  /  收入背包',
    );
    this.cellarDiscoveryPanel.setVisible(true).setAlpha(0).setScale(0.96);
    this.setHudDimmed(true);
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
    this.setHudDimmed(false);
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
        'TAB  MANAGE BACKPACK / 背包已满，先归还一件其他器物',
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
        ? 'The compass and the Myriad Character Atlas are secured. Return through the portal and finish exploring.'
        : 'The Myriad Character Atlas is secured. Return through the portal and retrieve the Geomancer’s Compass.',
      this.carrySystem.hasArtifact('geomancers-compass')
        ? '罗盘和《万字藏图》都已收好。通过传送门返回主墓室，完成剩下的调查。'
        : '《万字藏图》已经收好。通过传送门返回主墓室，再去取风水罗盘。',
    );
    this.evaluateDepartureReadiness();
  }

  private updateCoreLootObjective(): void {
    const missing = this.getMissingCoreLoot();
    if (missing.length === 0) {
      this.updateObjectiveUI(
        'Both core relics are secured. Light every chamber candle and restore anything else you moved.',
        '两件核心物品都已收好。点燃剩下的定魂烛，并放回所有移动过的器物。',
      );
      return;
    }
    this.updateObjectiveUI(
      `Core relic still missing: ${missing.join(' and ')}.`,
      `还没有拿到：${missing.includes('Myriad Character Atlas') ? '《万字藏图》' : ''}${missing.length > 1 ? '和' : ''}${missing.includes('Geomancer’s Compass') ? '风水罗盘' : ''}。`,
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
    this.transitionController?.start(
      'AntiqueShopScene',
      {
        departureChoice: this.departureChoice ?? 'empty',
        settlement,
        appearanceId: this.appearanceId,
      },
      { durationMs: 220, label: '拓片显影 · 返回古玩店' },
    );
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
        '封印已经断了。棺盖下面，还在不断往下掉灰。';
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
      '查看并收好风水罗盘。',
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
    if (artifact?.portable) this.takeOrSwapArtifact(artifact);
  }

  private takeOrSwapArtifact(artifact: InvestigableObject): void {
    if (!artifact.displaySpotId) return;
    const spot = this.getArtifactSpot(artifact.displaySpotId);
    if (!spot || spot.artifactId !== artifact.id) return;
    if (!this.carrySystem.isFull()) {
      this.takeArtifact(artifact, spot);
      return;
    }
    const carriedArtifact = this.getDirectSwapCandidate();
    if (!carriedArtifact) {
      this.cameras.main.shake(120, 0.0015);
      return;
    }
    this.swapArtifact(artifact, spot, carriedArtifact);
  }

  private getDirectSwapCandidate(): InvestigableObject | undefined {
    const active = this.carrySystem.getCarriedArtifact();
    if (active instanceof InvestigableObject && active.id !== 'myriad-character-atlas') {
      return active;
    }
    return this.carrySystem
      .getCarriedArtifacts()
      .find((artifact): artifact is InvestigableObject =>
        artifact instanceof InvestigableObject && artifact.id !== 'myriad-character-atlas',
      );
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
    if (this.activeInvestigation) this.closeInvestigation();
    else {
      this.nearbyInteraction = undefined;
      this.updateNearestInteraction();
    }
    this.evaluateDepartureReadiness();
  }

  private swapArtifact(
    artifactAtSpot: InvestigableObject,
    spot: ArtifactSpot,
    artifactToLeave: InvestigableObject,
  ): void {
    if (artifactToLeave.id === 'myriad-character-atlas') return;
    const carriedArtifact = this.carrySystem.removeCarriedArtifact(artifactToLeave.id);
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
    this.carrySystem.storeActiveArtifact();
    this.player?.setCarrying(false);
    this.player?.playCarryAction('pickup');

    this.resetCarriedExposure(artifactAtSpot.id);
    this.updateCarryUI();
    if (this.activeInvestigation) this.closeInvestigation();
    else {
      this.nearbyInteraction = undefined;
      this.updateNearestInteraction();
    }
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
      '罗盘已经收好。继续点燃其余墓室的定魂烛，并把移动过的供物放回原位。',
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
        '脚步停了。再把那件供物带出房间，看看它会不会跟来。',
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
        '把供物带出这间墓室。留意身后的脚步。',
      );
      this.showShopkeeperMessage(
        'remembering',
        'The room went quiet. It noticed the missing weight.',
        '“听见了吗？整间墓室都静了。它知道少了东西。”',
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
        '后面多了一组脚步。先往入口方向退。',
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
        '墙上的影子只会在灯光里靠近。熄灯，再把供物放回原位。',
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
        '它这次追得更快。立刻把供物放回原位。',
      );
      this.showShopkeeperMessage(
        'provoked',
        'You had a way out. You chose to touch it again.',
        '“门已经开过一次了。是你自己，又碰了那件东西。”',
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
      '这个位置不对。听最先出现的那组脚步，它会把你带回原位。',
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
          'Every chamber candle is lit. The sealed door is open; return to the far end of the burial passage.',
          '所有墓室的定魂烛都已点燃，封门打开了。沿墓道返回入口。',
        );
        this.showShopkeeperMessage(
          'released',
          'Every chamber candle is burning. Leave everything you moved where it belonged, then come back.',
          '“定魂烛都亮了。把动过的东西放回原位，然后回来。”',
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
          ? `Light ${remainingRooms} more chamber ${remainingRooms === 1 ? 'candle' : 'candles'}, and restore every moved burial object.`
          : 'Every chamber candle is lit, but the tomb still detects a displaced object. Restore every moved burial object.',
        remainingRooms > 0
          ? `还要点燃 ${remainingRooms} 间墓室的定魂烛，并放回所有移动过的器物。`
          : '定魂烛都已点燃，但还有器物不在原位。把移动过的东西全部放回去。',
      );
      return;
    }

    if (missingCoreLoot.length > 0 && remainingRooms === 0) {
      this.updateObjectiveUI(
        `Before leaving, recover ${missingCoreLoot.join(' and ')}.`,
        `离开前，还要拿到${missingCoreLoot.includes('Myriad Character Atlas') ? '《万字藏图》' : ''}${missingCoreLoot.length > 1 ? '和' : ''}${missingCoreLoot.includes('Geomancer’s Compass') ? '风水罗盘' : ''}。`,
      );
      return;
    }

    this.updateObjectiveUI(
      `Light ${remainingRooms} more chamber ${remainingRooms === 1 ? 'candle' : 'candles'} before leaving.`,
      `离开前，还要点燃 ${remainingRooms} 间墓室的定魂烛。`,
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
      target.kind === 'cellar-portal' ||
      target.kind === 'cellar-return-portal' ||
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
    if (!artifact.portable) return 'E  Investigate / 调查';
    return this.carrySystem.isFull()
      ? 'E  Swap / 互换'
      : 'E  Take / 拿取';
  }

  private createDebugTools(): void {
    if (!import.meta.env.DEV || !this.input.keyboard) {
      return;
    }
    this.debugKeys = {
      toggle: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3),
      reset: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F6),
      offeringRoom: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F7),
      corridor: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9),
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
      'F6 reset  F7 offering room  F9 corridor  F8 interaction overlay',
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
    this.addStaticObstacle(obstacles, 600, 148, 24, 18);
    this.addStaticObstacle(obstacles, 1000, 148, 24, 18);
    this.addStaticObstacle(obstacles, 800, 502, 84, 24);
    this.addStaticObstacle(obstacles, 600, 566, 36, 16);
    this.addStaticObstacle(obstacles, 1000, 566, 36, 16);
    this.addStaticObstacle(obstacles, 120, 561, 54, 18);
    this.addStaticObstacle(obstacles, 1130, 558, 24, 18);
    this.addStaticObstacle(obstacles, 1500, 558, 24, 18);
    this.addStaticObstacle(obstacles, 1510, 491, 54, 18);
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
