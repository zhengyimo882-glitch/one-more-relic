import { localize } from '../i18n/gameLanguage';
import type { TombLootRecord } from '../systems/ShopProgressSystem';

export type RestorationToolId = 'soft-brush' | 'bamboo-pick' | 'dry-cloth';
export type RelicFaceId = 'front' | 'back' | 'edge' | 'spine' | 'open';
export type DirtType = 'loose-dust' | 'hard-corrosion' | 'surface-film' | 'mold';

export const RESTORATION_ASSET_ROOT = 'assets/generated/relic_restoration_v1';

export const RESTORATION_TEXTURES = {
  workbench: 'restoration-workbench',
  notebookClosed: 'restoration-notebook-closed',
  notebookOpen: 'restoration-notebook-open',
  lamp: 'restoration-work-lamp',
  tools: {
    'soft-brush': 'restoration-tool-soft-brush',
    'bamboo-pick': 'restoration-tool-bamboo-pick',
    'dry-cloth': 'restoration-tool-dry-cloth',
  },
} as const;

export type ToolDefinition = {
  id: RestorationToolId;
  name: string;
  shortHint: string;
  texture: string;
  radius: number;
  safeSpeed: number;
  dwellRiskMs: number;
  rates: Record<DirtType, number>;
  damagePerSecond: number;
  feedbackColor: number;
};

// Read localized labels lazily: these definitions load before language selection.
export const RESTORATION_TOOLS: Record<RestorationToolId, ToolDefinition> = {
  'soft-brush': {
    id: 'soft-brush', get name() { return localize('Soft brush', '软毛刷'); }, get shortHint() { return localize('Safe on dust', '中等范围，浮尘最安全'); },
    texture: RESTORATION_TEXTURES.tools['soft-brush'], radius: 34, safeSpeed: 980, dwellRiskMs: 1800,
    rates: { 'loose-dust': 1, 'hard-corrosion': 0.22, 'surface-film': 0.42, mold: 0.46 },
    damagePerSecond: 0.2, feedbackColor: 0xb99a70,
  },
  'bamboo-pick': {
    id: 'bamboo-pick', get name() { return localize('Bamboo pick', '竹签'); }, get shortHint() { return localize('Rust: keep moving', '硬锈快；久停会刮伤'); },
    texture: RESTORATION_TEXTURES.tools['bamboo-pick'], radius: 15, safeSpeed: 520, dwellRiskMs: 520,
    rates: { 'loose-dust': 0.28, 'hard-corrosion': 1.45, 'surface-film': 0.16, mold: 0.12 },
    damagePerSecond: 8.4, feedbackColor: 0x8a6c4b,
  },
  'dry-cloth': {
    id: 'dry-cloth', get name() { return localize('Dry cloth', '干棉布'); }, get shortHint() { return localize('Dust: rub gently', '浮灰快；急擦会磨损'); },
    texture: RESTORATION_TEXTURES.tools['dry-cloth'], radius: 52, safeSpeed: 430, dwellRiskMs: 1100,
    rates: { 'loose-dust': 1.3, 'hard-corrosion': 0.08, 'surface-film': 0.82, mold: 0.25 },
    damagePerSecond: 3.2, feedbackColor: 0xd5c39b,
  },
};

export type RelicFaceDefinition = {
  id: RelicFaceId;
  label: string;
  cleanTexture: string;
  dirtyTexture: string;
  damagedTexture: string;
  shadowTexture: string;
  displayWidth: number;
  displayHeight: number;
};

export type CleaningRegionDefinition = {
  id: string;
  dirtType: DirtType;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EvidenceRegionDefinition = {
  id: string;
  face: RelicFaceId;
  x: number;
  y: number;
  radius: number;
  minimumCleaning: number;
  maximumDamage: number;
  zoom: readonly [number, number];
  lightAngle: number;
  lightTolerance: number;
  holdMs: number;
  searchHint: string;
  observation: string;
  destroyedObservation: string;
};

export type RestorationDefinition = {
  relicId: string;
  cleaningFace: RelicFaceId;
  artifactShape: 'ellipse' | 'rect';
  cleaningLayers: readonly DirtType[];
  cleaningRegions: readonly CleaningRegionDefinition[];
  inspectionFaces: readonly RelicFaceDefinition[];
  evidenceRegions: readonly EvidenceRegionDefinition[];
  toolModifiers: Partial<Record<RestorationToolId, number>>;
  damageThresholds: { visible: number; evidenceRisk: number; severe: number };
  valueModifiers: { patinaBonus: number; fullEvidenceBonus: number; damageRate: number; wrongAppraisalPenalty: number };
  minimumEvidenceForAppraisal: number;
};

const coinFace = (id: RelicFaceId, label: () => string, width = 430, height = 430): RelicFaceDefinition => ({
  id, get label() { return label(); },
  cleanTexture: `restoration-coin-${id}-clean`, dirtyTexture: `restoration-coin-${id}-dirty`,
  damagedTexture: `restoration-coin-${id}-damaged`, shadowTexture: `restoration-coin-${id}-shadow`,
  displayWidth: width, displayHeight: height,
});

const bookFace = (id: RelicFaceId, label: () => string, width: number, height: number): RelicFaceDefinition => ({
  id, get label() { return label(); },
  cleanTexture: `restoration-book-${id}-clean`, dirtyTexture: `restoration-book-${id}-dirty`,
  damagedTexture: `restoration-book-${id}-damaged`, shadowTexture: `restoration-book-${id}-shadow`,
  displayWidth: width, displayHeight: height,
});

export const RELIC_RESTORATION: Record<string, RestorationDefinition> = {
  'first-tomb-ritual-coin': {
    relicId: 'first-tomb-ritual-coin', cleaningFace: 'front', artifactShape: 'ellipse',
    cleaningLayers: ['loose-dust', 'hard-corrosion', 'surface-film'],
    cleaningRegions: [
      { id: 'rim-dust', dirtType: 'loose-dust', x: 0.06, y: 0.06, width: 0.88, height: 0.88 },
      { id: 'lower-crust', dirtType: 'hard-corrosion', x: 0.08, y: 0.48, width: 0.52, height: 0.42 },
      { id: 'inscription-film', dirtType: 'surface-film', x: 0.35, y: 0.18, width: 0.55, height: 0.54 },
    ],
    inspectionFaces: [coinFace('front', () => localize("Front", '正面')), coinFace('edge', () => localize("Edge", '侧缘'), 150, 430), coinFace('back', () => localize("Back", '背面'))],
    evidenceRegions: [
      {
        id: 'offering-dust', face: 'front', x: 0.51, y: 0.49, radius: 0.19,
        minimumCleaning: 38, maximumDamage: 100, zoom: [0.88, 1.5], lightAngle: -28, lightTolerance: 62, holdMs: 460,
        get searchHint() { return localize("dust layers inside the square hole", '方孔内缘的积灰层次'); },
        get observation() { return localize("Dust layers inside the square hole match the clean ring on the offering table.", '方孔内的积灰留下清楚层差，与供桌净圈吻合。'); },
        get destroyedObservation() { return localize("The square hole is visible, but the dirt layers have been disturbed.", '方孔仍可辨认，但泥层已被抹乱。'); },
      },
      {
        id: 'ritual-facing', face: 'back', x: 0.31, y: 0.61, radius: 0.2,
        minimumCleaning: 58, maximumDamage: 19, zoom: [1.08, 1.78], lightAngle: 126, lightTolerance: 55, holdMs: 580,
        get searchHint() { return localize("directional wear on the lower left of the back", '背面左下的单向旧磨损'); },
        get observation() { return localize("Side lighting reveals directional wear from prolonged positioning.", '侧光掠过背面，单向磨损与长期朝向显了出来。'); },
        get destroyedObservation() { return localize("New scratches obscure the old wear. This clue cannot be confirmed.", '新刮痕盖住了旧磨损方向，这条依据无法确认。'); },
      },
    ],
    toolModifiers: { 'soft-brush': 1, 'bamboo-pick': 1.08, 'dry-cloth': 0.82 },
    damageThresholds: { visible: 4, evidenceRisk: 12, severe: 28 },
    valueModifiers: { patinaBonus: 24, fullEvidenceBonus: 22, damageRate: 3.2, wrongAppraisalPenalty: 48 },
    minimumEvidenceForAppraisal: 1,
  },
  'myriad-character-atlas': {
    relicId: 'myriad-character-atlas', cleaningFace: 'open', artifactShape: 'rect',
    cleaningLayers: ['loose-dust', 'surface-film', 'mold'],
    cleaningRegions: [
      { id: 'page-dust', dirtType: 'loose-dust', x: 0.06, y: 0.08, width: 0.88, height: 0.82 },
      { id: 'left-water-film', dirtType: 'surface-film', x: 0.08, y: 0.18, width: 0.42, height: 0.68 },
      { id: 'edge-mold', dirtType: 'mold', x: 0.52, y: 0.1, width: 0.42, height: 0.34 },
    ],
    inspectionFaces: [
      bookFace('front', () => localize("Cover", '封面'), 360, 430), bookFace('spine', () => localize("Spine", '书脊'), 490, 190),
      bookFace('open', () => localize("Pages", '内页'), 560, 405), bookFace('back', () => localize("Back cover", '封底'), 360, 430),
    ],
    evidenceRegions: [
      {
        id: 'blank-fibres', face: 'open', x: 0.70, y: 0.42, radius: 0.21,
        minimumCleaning: 34, maximumDamage: 24, zoom: [1.12, 1.8], lightAngle: -52, lightTolerance: 62, holdMs: 480,
        get searchHint() { return localize("paper fibres in the middle of the right page", '右页中段的纸纤维'); },
        get observation() { return localize("Oblique light reveals old paper fibres with no ink soaked into them.", '斜光穿过纸纤维：纸很旧，却没有墨迹渗入。'); },
        get destroyedObservation() { return localize("Abrasion has frayed the paper and obscured the original fibres.", '纸面被擦毛，纤维方向已经混在新伤里。'); },
      },
      {
        id: 'folded-map-seam', face: 'spine', x: 0.56, y: 0.48, radius: 0.23,
        minimumCleaning: 44, maximumDamage: 34, zoom: [0.96, 1.65], lightAngle: 138, lightTolerance: 62, holdMs: 560,
        get searchHint() { return localize("the continuous old fold along the spine", '书脊中央连续的旧折线'); },
        get observation() { return localize("Side lighting connects the spine folds into a route matching the tomb wrapping.", '书脊折痕在侧光下连成路线，与墓中包布的折线重合。'); },
        get destroyedObservation() { return localize("The fold remains, but scratches interrupt its continuity.", '折痕还在，但擦痕切断了连续走向。'); },
      },
    ],
    toolModifiers: { 'soft-brush': 1.05, 'bamboo-pick': 0.42, 'dry-cloth': 1 },
    damageThresholds: { visible: 3, evidenceRisk: 10, severe: 24 },
    valueModifiers: { patinaBonus: 34, fullEvidenceBonus: 40, damageRate: 4.1, wrongAppraisalPenalty: 60 },
    minimumEvidenceForAppraisal: 1,
  },
};

export function preloadRelicRestorationAssets(scene: Phaser.Scene): void {
  scene.load.image(RESTORATION_TEXTURES.workbench, `${RESTORATION_ASSET_ROOT}/workbench_mat.png`);
  scene.load.image(RESTORATION_TEXTURES.notebookClosed, `${RESTORATION_ASSET_ROOT}/notebook_closed.png`);
  scene.load.image(RESTORATION_TEXTURES.notebookOpen, `${RESTORATION_ASSET_ROOT}/notebook_open.png`);
  scene.load.image(RESTORATION_TEXTURES.lamp, `${RESTORATION_ASSET_ROOT}/work_lamp.png`);
  Object.entries(RESTORATION_TEXTURES.tools).forEach(([id, key]) => scene.load.image(key, `${RESTORATION_ASSET_ROOT}/tool_${id.replaceAll('-', '_')}.png`));
  Object.values(RELIC_RESTORATION).forEach((definition) => {
    definition.inspectionFaces.forEach((face) => {
      const prefix = definition.relicId === 'first-tomb-ritual-coin' ? 'coin' : 'book';
      scene.load.image(face.cleanTexture, `${RESTORATION_ASSET_ROOT}/${prefix}_${face.id}_clean.png`);
      scene.load.image(face.dirtyTexture, `${RESTORATION_ASSET_ROOT}/${prefix}_${face.id}_dirty.png`);
      scene.load.image(face.damagedTexture, `${RESTORATION_ASSET_ROOT}/${prefix}_${face.id}_damaged.png`);
      scene.load.image(face.shadowTexture, `${RESTORATION_ASSET_ROOT}/${prefix}_${face.id}_shadow.png`);
    });
  });
}

export function restorationDefinitionFor(loot: TombLootRecord): RestorationDefinition {
  const definition = RELIC_RESTORATION[loot.definitionId];
  if (!definition) throw new Error(`Missing restoration definition for ${loot.definitionId}`);
  return definition;
}

export function calculateRelicValue(loot: TombLootRecord, baseValue: number): number {
  const definition = restorationDefinitionFor(loot);
  const completeEvidence = loot.evidenceIds.length >= definition.evidenceRegions.length;
  const patinaBonus = loot.cleaningProgress >= 38 && loot.cleaningProgress <= 78 && loot.cleaningDamage < definition.damageThresholds.evidenceRisk
    ? definition.valueModifiers.patinaBonus : 0;
  const evidenceBonus = completeEvidence ? definition.valueModifiers.fullEvidenceBonus : 0;
  const damagePenalty = Math.round(loot.cleaningDamage * definition.valueModifiers.damageRate);
  const appraisalPenalty = loot.appraisalCorrect === false ? definition.valueModifiers.wrongAppraisalPenalty : 0;
  return Math.max(baseValue > 0 ? 40 : 0, baseValue + patinaBonus + evidenceBonus - damagePenalty - appraisalPenalty);
}
