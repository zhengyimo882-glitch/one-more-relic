import type { ArtifactData } from '../objects/InvestigableObject';

export class CarrySystem {
  readonly capacity = 1;

  private carriedArtifact: ArtifactData | null = null;

  isEmpty(): boolean {
    return this.carriedArtifact === null;
  }

  takeArtifact(artifact: ArtifactData): boolean {
    if (!this.isEmpty()) {
      return false;
    }

    this.carriedArtifact = artifact;
    return true;
  }

  removeCarriedArtifact(): ArtifactData | null {
    const artifact = this.carriedArtifact;
    this.carriedArtifact = null;
    return artifact;
  }

  getCarriedArtifact(): ArtifactData | null {
    return this.carriedArtifact;
  }
}
