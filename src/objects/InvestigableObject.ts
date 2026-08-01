import Phaser from 'phaser';

export type ArtifactLocationState = 'world' | 'carried';
export type OmenTier = 0 | 1 | 2;

export type InvestigableObjectConfig = {
  id: string;
  englishName: string;
  chineseName: string;
  description: string;
  chineseDescription: string;
  portable: boolean;
  hiddenValue: number | null;
  appraisalText: string;
  chineseAppraisalText: string;
  omenTier: OmenTier;
  originalSpotId: string | null;
  hasBeenDisturbed: boolean;
  worldX: number;
  worldY: number;
  interactionRadius: number;
  locationState: ArtifactLocationState;
  displaySpotId: string | null;
  isAvailable?: boolean;
  promptOffsetY: number;
  visualObject: Phaser.GameObjects.Container;
  highlightObject: Phaser.GameObjects.Graphics;
};

export class InvestigableObject {
  readonly id: string;
  readonly englishName: string;
  readonly chineseName: string;
  description: string;
  chineseDescription: string;
  readonly portable: boolean;
  readonly hiddenValue: number | null;
  readonly appraisalText: string;
  readonly chineseAppraisalText: string;
  readonly omenTier: OmenTier;
  readonly originalSpotId: string | null;
  readonly interactionRadius: number;
  readonly visualObject: Phaser.GameObjects.Container;
  readonly promptObject: Phaser.GameObjects.Container;
  worldX: number;
  worldY: number;
  locationState: ArtifactLocationState;
  displaySpotId: string | null;
  hasBeenDisturbed: boolean;
  isAvailable: boolean;
  isBeingInvestigated = false;

  private readonly highlightObject: Phaser.GameObjects.Graphics;
  private readonly promptOffsetY: number;

  constructor(scene: Phaser.Scene, config: InvestigableObjectConfig) {
    this.id = config.id;
    this.englishName = config.englishName;
    this.chineseName = config.chineseName;
    this.description = config.description;
    this.chineseDescription = config.chineseDescription;
    this.portable = config.portable;
    this.hiddenValue = config.hiddenValue;
    this.appraisalText = config.appraisalText;
    this.chineseAppraisalText = config.chineseAppraisalText;
    this.omenTier = config.omenTier;
    this.originalSpotId = config.originalSpotId;
    this.hasBeenDisturbed = config.hasBeenDisturbed;
    this.worldX = config.worldX;
    this.worldY = config.worldY;
    this.interactionRadius = config.interactionRadius;
    this.locationState = config.locationState;
    this.displaySpotId = config.displaySpotId;
    this.isAvailable = config.isAvailable ?? true;
    this.visualObject = config.visualObject;
    this.highlightObject = config.highlightObject;
    this.promptOffsetY = config.promptOffsetY;

    const promptBackground = scene.add
      .rectangle(0, 0, 214, 32, 0x12100d, 0.88)
      .setStrokeStyle(1, 0x94886d, 0.75);
    const promptText = scene.add
      .text(0, 0, 'E  Investigate / 调查', {
        fontFamily:
          'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
        fontSize: '15px',
        color: '#ded4b7',
      })
      .setOrigin(0.5);

    this.promptObject = scene.add
      .container(config.worldX, config.worldY + config.promptOffsetY, [
        promptBackground,
        promptText,
      ])
      .setDepth(6)
      .setVisible(false);
    this.highlightObject.setVisible(false);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.worldX, this.worldY, x, y);
  }

  setNearby(isNearby: boolean): void {
    const isInWorld = this.isAvailable && this.locationState === 'world';
    this.promptObject.setVisible(isInWorld && isNearby && !this.isBeingInvestigated);
    this.highlightObject.setVisible(isInWorld && (isNearby || this.isBeingInvestigated));
  }

  beginInvestigation(): void {
    this.isBeingInvestigated = true;
    this.promptObject.setVisible(false);
    this.highlightObject.setVisible(true);
  }

  endInvestigation(): void {
    this.isBeingInvestigated = false;
    this.promptObject.setVisible(false);
    this.highlightObject.setVisible(false);
  }

  moveToWorldSpot(worldX: number, worldY: number, displaySpotId: string): void {
    this.worldX = worldX;
    this.worldY = worldY;
    this.locationState = 'world';
    this.displaySpotId = displaySpotId;
    this.isAvailable = true;
    this.visualObject.setPosition(worldX, worldY).setVisible(true);
    this.promptObject.setPosition(worldX, worldY + this.promptOffsetY).setVisible(false);
    this.highlightObject.setVisible(false);
  }

  setCarried(): void {
    this.locationState = 'carried';
    this.displaySpotId = null;
    this.isBeingInvestigated = false;
    this.visualObject.setVisible(false);
    this.promptObject.setVisible(false);
    this.highlightObject.setVisible(false);
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available;
    this.visualObject.setVisible(available && this.locationState === 'world');

    if (!available) {
      this.promptObject.setVisible(false);
      this.highlightObject.setVisible(false);
    }
  }
}

export type ArtifactData = InvestigableObject;
