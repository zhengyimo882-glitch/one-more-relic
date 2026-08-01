import type { OmenTier } from '../objects/InvestigableObject';

export type CoffinState = 'sealed' | 'opened';
export type OmenLevel = 0 | 1 | 2 | 3;

export class TombDisturbanceSystem {
  private disturbanceLevel = 0;
  private readonly disturbedArtifactIds = new Set<string>();
  private readonly triggeredActions = new Set<string>();

  getDisturbanceLevel(): number {
    return this.disturbanceLevel;
  }

  registerArtifact(artifactId: string, amount: number): boolean {
    if (this.disturbedArtifactIds.has(artifactId)) {
      return false;
    }

    this.disturbedArtifactIds.add(artifactId);
    this.increaseDisturbance(amount);
    return true;
  }

  registerAction(actionId: string, amount: number): boolean {
    if (this.triggeredActions.has(actionId)) {
      return false;
    }

    this.triggeredActions.add(actionId);
    this.increaseDisturbance(amount);
    return true;
  }

  calculateOmenLevel(
    omenTier: OmenTier,
    carriedExposureSeconds: number,
    coffinState: CoffinState,
  ): OmenLevel {
    if (
      coffinState === 'opened' &&
      omenTier === 2 &&
      carriedExposureSeconds >= 6
    ) {
      return 3;
    }

    if (
      this.disturbanceLevel >= 2 ||
      (omenTier === 1 && carriedExposureSeconds >= 8) ||
      (omenTier === 2 && carriedExposureSeconds >= 3)
    ) {
      return 2;
    }

    if (
      this.disturbanceLevel >= 1 ||
      (omenTier === 1 && carriedExposureSeconds >= 2) ||
      (omenTier === 2 && carriedExposureSeconds >= 1)
    ) {
      return 1;
    }

    return 0;
  }

  reset(): void {
    this.disturbanceLevel = 0;
    this.disturbedArtifactIds.clear();
    this.triggeredActions.clear();
  }

  private increaseDisturbance(amount: number): void {
    this.disturbanceLevel = Math.min(3, this.disturbanceLevel + amount);
  }
}
