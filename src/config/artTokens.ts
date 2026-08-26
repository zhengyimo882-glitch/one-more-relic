export const ART_VERSION = 'v2' as const;

export const ART_TOKENS = {
  canvas: { width: 1280, height: 720 },
  sampling: {
    world: 'nearest',
    portrait: 'nearest',
    inspection: 'linear',
    integerScaleOnly: true,
  },
  character: {
    sourceFrame: 128,
    heroWorldHeight: 82,
    shopkeeperWorldHeight: 88,
    outlineSourcePx: 1,
    footAnchorY: 104,
    collisionWidth: 22,
    collisionHeight: 14,
    shadowWidth: 28,
    shadowHeight: 11,
  },
  palette: {
    soilBlack: 0x111310,
    lacquerBlack: 0x171714,
    oldWood: 0x4b3022,
    warmOchre: 0xb07a3f,
    darkBrass: 0x8f6a32,
    brassHighlight: 0xd0a85a,
    verdigris: 0x55766c,
    cellarCyan: 0x42676a,
    cinnabar: 0x8e392e,
    oldPaper: 0xc8b184,
    paperInk: 0x24170f,
    boneText: 0xe8dcc0,
  },
  lighting: {
    shopTint: 0xf0c184,
    tombTint: 0xa6b0a4,
    cellarTint: 0x86a8a4,
    candleTint: 0xd98545,
    shopAlpha: 0.93,
    tombAlpha: 0.82,
    cellarAlpha: 0.75,
    candleRadius: 120,
    candleBlendMax: 0.28,
    shadowColor: 0x070907,
    shadowAlpha: 0.46,
  },
  depth: {
    background: 0,
    worldBase: 2,
    shadowOffset: -0.0002,
    foregroundOffset: 0.65,
    fromFootY: (y: number, offset = 0): number => 2 + y / 1000 + offset,
  },
  artifact: {
    worldSize: 64,
    inventorySize: 96,
    inspectionWidth: 640,
    inspectionHeight: 480,
  },
} as const;

export type ArtSceneGrade = 'shop' | 'tomb' | 'cellar';

export function tintForScene(grade: ArtSceneGrade): number {
  if (grade === 'shop') return ART_TOKENS.lighting.shopTint;
  if (grade === 'cellar') return ART_TOKENS.lighting.cellarTint;
  return ART_TOKENS.lighting.tombTint;
}

