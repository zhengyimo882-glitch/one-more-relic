export type ArtifactVisualId =
  | 'geomancers-compass'
  | 'myriad-character-atlas'
  | 'burial-vessel'
  | 'bronze-mirror';

export interface ArtifactVisualDefinition {
  id: ArtifactVisualId;
  nameEn: string;
  nameZh: string;
  worldTexture: string;
  worldPath: string;
  inventoryTexture: string;
  inventoryPath: string;
  inspectionTexture: string;
  inspectionPath: string;
  inventorySlots: 1 | 2;
  riskEn: string;
  riskZh: string;
  anchor: string;
}

const ROOT = 'assets/art-v2/artifacts';

function visual(
  id: ArtifactVisualId,
  nameEn: string,
  nameZh: string,
  inventorySlots: 1 | 2,
  riskEn: string,
  riskZh: string,
  anchor: string,
): ArtifactVisualDefinition {
  return {
    id,
    nameEn,
    nameZh,
    worldTexture: `art-v2-${id}-world`,
    worldPath: `${ROOT}/world/${id}-v2-world.png`,
    inventoryTexture: `art-v2-${id}-inventory`,
    inventoryPath: `${ROOT}/inventory/${id}-v2-inventory.png`,
    inspectionTexture: `art-v2-${id}-inspection`,
    inspectionPath: `${ROOT}/inspection/${id}-v2-inspection.png`,
    inventorySlots,
    riskEn,
    riskZh,
    anchor,
  };
}

export const ARTIFACT_VISUALS: Readonly<Record<ArtifactVisualId, ArtifactVisualDefinition>> = {
  'geomancers-compass': visual(
    'geomancers-compass', 'GEOMANCER\'S COMPASS', '风水师罗盘', 2,
    'CORE RELIC / DISTURBS THE FORMATION', '核心器物／扰动墓局',
    'square cinnabar case, dark-brass dial, verdigris north-east corner, split at six o’clock',
  ),
  'myriad-character-atlas': visual(
    'myriad-character-atlas', 'MYRIAD CHARACTER ATLAS', '万字藏图', 2,
    'ANOMALOUS / CANNOT BE APPRAISED', '异物／无法正常鉴定',
    'indigo-black folding book, cinnabar seal, pale character grid, torn lower-right binding',
  ),
  'burial-vessel': visual(
    'burial-vessel', 'BURIAL VESSEL', '随葬器皿', 1,
    'RITUAL OBJECT / FRAGILE', '礼制器／易损',
    'pear-shaped dark bronze, twin loop handles, pale vertical crack, verdigris under the rim',
  ),
  'bronze-mirror': visual(
    'bronze-mirror', 'BRONZE MIRROR', '铜镜', 1,
    'REFLECTIVE / UNSETTLING', '映照物／异样',
    'round dark-bronze disc, square central boss, four cloud beasts, chipped edge at two o’clock',
  ),
};

export function preloadArtifactVisuals(scene: Phaser.Scene): void {
  Object.values(ARTIFACT_VISUALS).forEach((entry) => {
    if (!scene.textures.exists(entry.worldTexture)) scene.load.image(entry.worldTexture, entry.worldPath);
    if (!scene.textures.exists(entry.inventoryTexture)) scene.load.image(entry.inventoryTexture, entry.inventoryPath);
    if (!scene.textures.exists(entry.inspectionTexture)) scene.load.image(entry.inspectionTexture, entry.inspectionPath);
  });
}

export function getArtifactVisual(id: string): ArtifactVisualDefinition | undefined {
  return ARTIFACT_VISUALS[id as ArtifactVisualId];
}

