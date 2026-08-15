export type GameFlowState =
  | 'TombGameplay'
  | 'TombCompleted'
  | 'TransitionToShop'
  | 'ShopFreeRoam'
  | 'RelicSelected'
  | 'Cleaning'
  | 'Inspection'
  | 'AppraisalDecision'
  | 'DispositionDecision'
  | 'Placement'
  | 'AtlasEvent'
  | 'ShopGrowthReveal'
  | 'Paused';
