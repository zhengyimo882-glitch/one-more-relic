import type { RelicCondition, RelicDisposition } from '../data/shopRelics';
import { SHOP_RELICS } from '../data/shopRelics';

export type TombLootRecord = {
  instanceId: string;
  definitionId: string;
  condition: RelicCondition;
  evidenceIds: string[];
  cleaningProgress: number;
  cleaningDamage: number;
  cleaned: boolean;
  appraised: boolean;
  appraisalCorrect?: boolean;
  conclusionIndex?: number;
  placed: boolean;
  disposition?: RelicDisposition;
};

export type TombSettlement = {
  id: string;
  completed: boolean;
  createdAt: number;
  loot: TombLootRecord[];
  discoveredEvidence: string[];
  hasAtlas: boolean;
  hasFirstTombCoin: boolean;
  carriedArtifactId: string | null;
  consumed: boolean;
};

export type ShopProgress = {
  funds: number;
  growthStage: number;
  atlasPage: number;
  unlockedDisplays: string[];
  identifiedRelics: string[];
  collectedRelics: string[];
  researchedRelics: string[];
  pledgedRelics: string[];
  discoveredEvidence: string[];
  activeLoot: TombLootRecord[];
  completedSettlementIds: string[];
  unloadedSettlementIds: string[];
};

const progress: ShopProgress = {
  funds: 240,
  growthStage: 0,
  atlasPage: 0,
  unlockedDisplays: [],
  identifiedRelics: [],
  collectedRelics: [],
  researchedRelics: [],
  pledgedRelics: [],
  discoveredEvidence: [],
  activeLoot: [],
  completedSettlementIds: [],
  unloadedSettlementIds: [],
};

let pendingSettlement: TombSettlement | null = null;
let settlementCounter = 0;

export const ShopProgressSystem = {
  createFirstTombSettlement(carriedArtifactId: string | null): TombSettlement {
    if (pendingSettlement && !pendingSettlement.consumed) {
      return pendingSettlement;
    }
    settlementCounter += 1;
    pendingSettlement = {
      id: `first-tomb-${Date.now()}-${settlementCounter}`,
      completed: true,
      createdAt: Date.now(),
      carriedArtifactId,
      hasAtlas: true,
      hasFirstTombCoin: true,
      discoveredEvidence: [
        'compass-cloth-layer',
        'restored-offering-clean-ring',
        'front-chamber-empty-place',
      ],
      consumed: false,
      loot: [
        this.createLoot('myriad-character-atlas', 'anomalous'),
        this.createLoot('first-tomb-ritual-coin', 'contaminated'),
      ],
    };
    return pendingSettlement;
  },

  consumeSettlement(settlement?: TombSettlement): TombSettlement | null {
    const candidate = settlement ?? pendingSettlement;
    if (!candidate || candidate.consumed || progress.completedSettlementIds.includes(candidate.id)) {
      return null;
    }
    candidate.consumed = true;
    if (
      candidate.completed &&
      candidate.loot.some((loot) => loot.definitionId === 'myriad-character-atlas') &&
      !candidate.loot.some((loot) => loot.definitionId === 'first-tomb-ritual-coin')
    ) {
      candidate.loot.push(this.createLoot('first-tomb-ritual-coin', 'contaminated'));
      candidate.hasFirstTombCoin = true;
      candidate.discoveredEvidence.push('shopkeeper-recovered-coin-from-offering-cloth');
    }
    progress.activeLoot = candidate.loot;
    progress.discoveredEvidence = Array.from(new Set([
      ...progress.discoveredEvidence,
      ...candidate.discoveredEvidence,
    ]));
    progress.completedSettlementIds.push(candidate.id);
    if (pendingSettlement?.id === candidate.id) {
      pendingSettlement = candidate;
    }
    return candidate;
  },

  getProgress(): ShopProgress {
    return progress;
  },

  recordAppraisal(loot: TombLootRecord, evidenceIds: string[]): void {
    loot.cleaned = true;
    loot.appraised = true;
    loot.evidenceIds = Array.from(new Set([...loot.evidenceIds, ...evidenceIds]));
    if (!progress.identifiedRelics.includes(loot.definitionId)) {
      progress.identifiedRelics.push(loot.definitionId);
    }
    progress.discoveredEvidence = Array.from(new Set([
      ...progress.discoveredEvidence,
      ...evidenceIds,
    ]));
  },

  recordConclusion(loot: TombLootRecord, conclusionIndex: number, correct: boolean): void {
    loot.conclusionIndex = conclusionIndex;
    loot.appraisalCorrect = correct;
    this.recordAppraisal(loot, loot.evidenceIds);
  },

  markUnloaded(settlementId: string): void {
    if (!progress.unloadedSettlementIds.includes(settlementId)) {
      progress.unloadedSettlementIds.push(settlementId);
    }
  },

  applyDisposition(loot: TombLootRecord, disposition: RelicDisposition, value: number): void {
    const definition = SHOP_RELICS[loot.definitionId];
    if (definition?.isCore && disposition === 'sell') {
      return;
    }
    loot.disposition = disposition;
    if (disposition === 'sell') progress.funds += value;
    if (disposition === 'collect' && !progress.collectedRelics.includes(loot.definitionId)) {
      progress.collectedRelics.push(loot.definitionId);
    }
    if (disposition === 'research' && !progress.researchedRelics.includes(loot.definitionId)) {
      progress.researchedRelics.push(loot.definitionId);
    }
    if (disposition === 'pledge' && !progress.pledgedRelics.includes(loot.definitionId)) {
      progress.pledgedRelics.push(loot.definitionId);
    }
  },

  markPlaced(loot: TombLootRecord): void {
    loot.placed = true;
  },

  unlockFirstGrowth(): void {
    progress.atlasPage = Math.max(progress.atlasPage, 1);
    progress.growthStage = Math.max(progress.growthStage, 1);
    if (!progress.unlockedDisplays.includes('first-tomb-display')) {
      progress.unlockedDisplays.push('first-tomb-display');
    }
  },

  createFallbackSettlement(): TombSettlement {
    if (pendingSettlement) {
      return pendingSettlement;
    }
    if (progress.completedSettlementIds.length > 0) {
      return {
        id: progress.completedSettlementIds[progress.completedSettlementIds.length - 1],
        completed: true,
        createdAt: Date.now(),
        loot: progress.activeLoot,
        discoveredEvidence: progress.discoveredEvidence,
        hasAtlas: progress.activeLoot.some((loot) => loot.definitionId === 'myriad-character-atlas'),
        hasFirstTombCoin: progress.activeLoot.some((loot) => loot.definitionId === 'first-tomb-ritual-coin'),
        carriedArtifactId: null,
        consumed: true,
      };
    }
    return this.createFirstTombSettlement(null);
  },

  createLoot(definitionId: string, condition: RelicCondition): TombLootRecord {
    return {
      instanceId: `${definitionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      definitionId,
      condition,
      evidenceIds: [],
      cleaningProgress: 0,
      cleaningDamage: 0,
      cleaned: false,
      appraised: false,
      placed: false,
    };
  },
};
