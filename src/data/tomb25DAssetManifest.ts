export type Tomb25DFootprint = {
  /** Relative to the calibrated ground-contact point, in displayed world pixels. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export type Tomb25DAssetDefinition = {
  key: string;
  sourcePath: string;
  displayScale: number;
  /** Normalized texture origin calibrated from the opaque pixels, not the canvas center. */
  originX: number;
  originY: number;
  /** Ground-contact point in source-image pixels. */
  groundAnchorX: number;
  groundAnchorY: number;
  footprint: Tomb25DFootprint;
  depthOffset: number;
  collides: boolean;
  foregroundOccluder: boolean;
  notes: string;
};

const ASSET_ROOT = 'assets/imported/brutalist_metropole_prototype';

export const TOMB_25D_ASSETS = {
  earthPatch3x3: {
    key: 'tomb25d-earth-patch-3x3',
    sourcePath: `${ASSET_ROOT}/Earth Patch - Rough - Gray - 3x3.png`,
    displayScale: 1.65,
    originX: 377.8 / 710,
    originY: 407.6 / 420,
    groundAnchorX: 377.8,
    groundAnchorY: 407.6,
    footprint: { offsetX: -435, offsetY: -268, width: 870, height: 535 },
    depthOffset: -1_000,
    collides: false,
    foregroundOccluder: false,
    notes: '3x3 Earth Patch，作为中央可行走地面；透明画布不参与碰撞。',
  },
  buildingS2A: {
    key: 'tomb25d-building-s2a',
    sourcePath: `${ASSET_ROOT}/Buildings/Noshadow/Brutalist Building s2A noshadow stackable.png`,
    displayScale: 0.58,
    originX: 324.3 / 647,
    originY: 394.4 / 421,
    groundAnchorX: 324.3,
    groundAnchorY: 394.4,
    footprint: { offsetX: -92, offsetY: -34, width: 184, height: 68 },
    depthOffset: 0,
    collides: true,
    foregroundOccluder: true,
    notes: '左侧空间边界；使用无烘焙阴影版本，脚印仅覆盖建筑落地范围。',
  },
  buildingS2B: {
    key: 'tomb25d-building-s2b',
    sourcePath: `${ASSET_ROOT}/Buildings/Noshadow/Brutalist Building s2B noshadow stackable.png`,
    displayScale: 0.58,
    originX: 345.9 / 695,
    originY: 392.7 / 442,
    groundAnchorX: 345.9,
    groundAnchorY: 392.7,
    footprint: { offsetX: -88, offsetY: -32, width: 176, height: 64 },
    depthOffset: 0,
    collides: true,
    foregroundOccluder: true,
    notes: '右侧空间边界；Noshadow版本，透明上部不参与碰撞或锚点计算。',
  },
  buildingS2C: {
    key: 'tomb25d-building-s2c',
    sourcePath: `${ASSET_ROOT}/Buildings/Noshadow/Brutalist Building s2C noshadow.png`,
    displayScale: 0.5,
    originX: 173.8 / 348,
    originY: 432.2 / 456,
    groundAnchorX: 173.8,
    groundAnchorY: 432.2,
    footprint: { offsetX: -70, offsetY: -25, width: 140, height: 50 },
    depthOffset: 0,
    collides: true,
    foregroundOccluder: true,
    notes: '北侧终点后方的高大边界；用底部接触像素校准排序。',
  },
  transitwayDiagonal: {
    key: 'tomb25d-transitway-diagonal',
    sourcePath: `${ASSET_ROOT}/Infrastructure/Raised Transitway - NExSW.png`,
    displayScale: 0.9,
    originX: 173.5 / 434,
    originY: 283.5 / 295,
    groundAnchorX: 173.5,
    groundAnchorY: 283.5,
    footprint: { offsetX: -170, offsetY: -82, width: 340, height: 164 },
    depthOffset: -900,
    collides: false,
    foregroundOccluder: false,
    notes: '入口墓道的可行走视觉底座；本轮不把透明画布当作实体。',
  },
  transitwayJunction: {
    key: 'tomb25d-transitway-junction',
    sourcePath: `${ASSET_ROOT}/Infrastructure/Raised Transitway - X Junction.png`,
    displayScale: 0.9,
    originX: 334.7 / 700,
    originY: 435.3 / 450,
    groundAnchorX: 334.7,
    groundAnchorY: 435.3,
    footprint: { offsetX: -300, offsetY: -190, width: 600, height: 380 },
    depthOffset: -950,
    collides: false,
    foregroundOccluder: false,
    notes: '中央房间与左右小区域的空间底座。',
  },
  rubbleA: {
    key: 'tomb25d-rubble-a',
    sourcePath: `${ASSET_ROOT}/Ruins/Rubble A.png`,
    displayScale: 0.42,
    originX: 188.4 / 403,
    originY: 239.1 / 275,
    groundAnchorX: 188.4,
    groundAnchorY: 239.1,
    footprint: { offsetX: -56, offsetY: -15, width: 112, height: 30 },
    depthOffset: 0,
    collides: true,
    foregroundOccluder: true,
    notes: '左侧瓦砾；体积较大，使用窄脚印碰撞。',
  },
  rubbleB: {
    key: 'tomb25d-rubble-b',
    sourcePath: `${ASSET_ROOT}/Ruins/Rubble B.png`,
    displayScale: 0.4,
    originX: 268 / 524,
    originY: 235.4 / 287,
    groundAnchorX: 268,
    groundAnchorY: 235.4,
    footprint: { offsetX: -64, offsetY: -16, width: 128, height: 32 },
    depthOffset: 0,
    collides: true,
    foregroundOccluder: true,
    notes: '右侧瓦砾；保留中央路线宽度。',
  },
  rubbleC: {
    key: 'tomb25d-rubble-c',
    sourcePath: `${ASSET_ROOT}/Ruins/Rubble C.png`,
    displayScale: 0.38,
    originX: 221.1 / 401,
    originY: 317 / 394,
    groundAnchorX: 221.1,
    groundAnchorY: 317,
    footprint: { offsetX: -42, offsetY: -12, width: 84, height: 24 },
    depthOffset: 0,
    collides: false,
    foregroundOccluder: true,
    notes: '小型竖向瓦砾，仅用于遮挡测试，不阻挡玩家。',
  },
} as const satisfies Record<string, Tomb25DAssetDefinition>;

export const TOMB_25D_ASSET_LIST = Object.values(TOMB_25D_ASSETS);
