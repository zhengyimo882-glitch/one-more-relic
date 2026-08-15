export type RelicCondition = 'intact' | 'damaged' | 'opened' | 'contaminated' | 'anomalous';
export type RelicDisposition = 'sell' | 'collect' | 'research' | 'pledge';

export type RelicEvidence = {
  id: string;
  label: string;
  chineseLabel: string;
  detail: string;
  chineseDetail: string;
};

export type ShopRelicDefinition = {
  id: string;
  unidentifiedName: string;
  unidentifiedChineseName: string;
  name: string;
  chineseName: string;
  condition: RelicCondition;
  cleaningMethods: readonly string[];
  cleaningMethodsChinese: readonly string[];
  evidence: readonly RelicEvidence[];
  conclusions: readonly string[];
  correctConclusionIndex: number;
  saleValue: number;
  pledgeValue: number;
  isCore: boolean;
  canSell: boolean;
  tombOrigin: string;
  shopPlacement: string;
  storyTrigger?: 'atlas-first-page';
};

export const SHOP_RELICS: Record<string, ShopRelicDefinition> = {
  'myriad-character-atlas': {
    id: 'myriad-character-atlas',
    unidentifiedName: 'Blank Thread-bound Book',
    unidentifiedChineseName: '空白线装册',
    name: 'Myriad-Character Hidden Atlas',
    chineseName: '《万字藏图》',
    condition: 'anomalous',
    cleaningMethods: ['Soft brush', 'Dry cloth'],
    cleaningMethodsChinese: ['软毛刷（安全）', '干布（快速）'],
    evidence: [
      {
        id: 'blank-fibres', label: 'Blank fibres', chineseLabel: '空白纸纤维',
        detail: 'The paper is old, but no ink has soaked through it.',
        chineseDetail: '纸张年代久远，却没有任何墨迹渗透。',
      },
      {
        id: 'folded-map-seam', label: 'Folded map seam', chineseLabel: '地图折痕',
        detail: 'Its fold matches the cloth tucked beneath the compass.',
        chineseDetail: '折痕与罗盘下夹着的包布完全吻合。',
      },
    ],
    conclusions: ['An unused account book', 'A ritual map awaiting a trigger'],
    correctConclusionIndex: 1,
    saleValue: 0, pledgeValue: 0, isCore: true, canSell: false,
    tombOrigin: 'Cloth layer beneath the geomancer’s compass',
    shopPlacement: 'appraisal-workbench', storyTrigger: 'atlas-first-page',
  },
  'first-tomb-ritual-coin': {
    id: 'first-tomb-ritual-coin',
    unidentifiedName: 'Corroded Round Token',
    unidentifiedChineseName: '锈蚀圆片',
    name: 'Front-Chamber Ritual Coin',
    chineseName: '前室仪式铜钱',
    condition: 'contaminated',
    cleaningMethods: ['Bamboo pick', 'Soft brush'],
    cleaningMethodsChinese: ['软毛刷（安全）', '竹签（快速）'],
    evidence: [
      {
        id: 'offering-dust', label: 'Offering-table dust', chineseLabel: '供桌积灰',
        detail: 'Dust in the square hole matches the clean ring left by the restored offering.',
        chineseDetail: '方孔中的积灰与归位供物留下的净圈一致。',
      },
      {
        id: 'ritual-facing', label: 'Ritual-facing wear', chineseLabel: '仪式朝向磨损',
        detail: 'One face was repeatedly turned toward the empty place on the offering table.',
        chineseDetail: '其中一面长期朝向供桌空位，磨损方向固定。',
      },
    ],
    conclusions: ['Common circulation coin', 'Position marker from the offering arrangement'],
    correctConclusionIndex: 1,
    saleValue: 180, pledgeValue: 90, isCore: false, canSell: true,
    tombOrigin: 'Recovered from the returned offering cloth and dust',
    shopPlacement: 'counter-ritual-spot',
  },
};
