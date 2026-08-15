import type { ArtifactData } from '../objects/InvestigableObject';

export class CarrySystem {
  readonly capacity = 2;

  private carriedArtifacts: ArtifactData[] = [];
  private activeArtifactId: string | null = null;

  isEmpty(): boolean {
    return this.carriedArtifacts.length === 0;
  }

  isFull(): boolean {
    return this.carriedArtifacts.length >= this.capacity;
  }

  takeArtifact(artifact: ArtifactData): boolean {
    if (this.isFull() || this.hasArtifact(artifact.id)) {
      return false;
    }

    this.carriedArtifacts.push(artifact);
    return true;
  }

  removeCarriedArtifact(artifactId?: string): ArtifactData | null {
    if (this.carriedArtifacts.length === 0) {
      return null;
    }
    const index = artifactId
      ? this.carriedArtifacts.findIndex((artifact) => artifact.id === artifactId)
      : this.carriedArtifacts.length - 1;
    if (index < 0) {
      return null;
    }
    const removed = this.carriedArtifacts.splice(index, 1)[0] ?? null;
    if (removed?.id === this.activeArtifactId) {
      this.activeArtifactId = null;
    }
    return removed;
  }

  getCarriedArtifact(): ArtifactData | null {
    return this.carriedArtifacts.find((artifact) => artifact.id === this.activeArtifactId) ?? null;
  }

  getCarriedArtifacts(): readonly ArtifactData[] {
    return this.carriedArtifacts;
  }

  hasArtifact(artifactId: string): boolean {
    return this.carriedArtifacts.some((artifact) => artifact.id === artifactId);
  }

  selectArtifact(artifactId: string): boolean {
    if (!this.hasArtifact(artifactId)) {
      return false;
    }
    this.activeArtifactId = artifactId;
    return true;
  }

  storeActiveArtifact(): void {
    this.activeArtifactId = null;
  }

  getActiveArtifactId(): string | null {
    return this.activeArtifactId;
  }
}
