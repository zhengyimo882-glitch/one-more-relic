import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import { createStyleBoardPrompt } from '../ui/styleBoardUi';

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
  private taskHighlightEnabled = false;
  private taskHighlightAlpha = 0.32;

  private readonly highlightObject: Phaser.GameObjects.Graphics;
  private readonly taskMarker: Phaser.GameObjects.Graphics;
  private readonly promptOffsetY: number;
  private readonly promptText: Phaser.GameObjects.Text;

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
    this.taskMarker = scene.add
      .graphics()
      .setPosition(config.worldX, config.worldY)
      .setDepth(7.18)
      .setVisible(false);
    this.taskMarker.lineStyle(2, 0xcbbb8c, 0.54);
    this.taskMarker.strokeCircle(0, -34, 34);
    this.promptOffsetY = config.promptOffsetY;

    this.promptObject = createStyleBoardPrompt(
      scene,
      'E',
      'Investigate / 调查',
      224,
      42,
    )
      .setPosition(config.worldX, config.worldY + config.promptOffsetY)
      .setDepth(8)
      .setVisible(false);
    this.promptText = this.promptObject.getData('label') as Phaser.GameObjects.Text;
    this.highlightObject.setVisible(false);
    scene.tweens.add({
      targets: this.highlightObject,
      alpha: { from: 0.48, to: 1 },
      duration: TOMB_FEEL.interaction.highlightPulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    scene.tweens.add({
      targets: this.taskMarker,
      alpha: { from: 0.24, to: 0.58 },
      scaleX: { from: 0.96, to: 1.06 },
      scaleY: { from: 0.96, to: 1.06 },
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.worldX, this.worldY, x, y);
  }

  setNearby(isNearby: boolean, showPrompt = true): void {
    const isInWorld = this.isAvailable && this.locationState === 'world';
    this.promptObject.setVisible(showPrompt && isInWorld && isNearby && !this.isBeingInvestigated);
    this.highlightObject
      .setVisible(isInWorld && (isNearby || this.isBeingInvestigated || this.taskHighlightEnabled))
      .setAlpha(isNearby || this.isBeingInvestigated ? 1 : this.taskHighlightAlpha);
  }

  setTaskHighlight(enabled: boolean, alpha = 0.32): void {
    this.taskHighlightEnabled = enabled;
    this.taskHighlightAlpha = alpha;
    const isInWorld = this.isAvailable && this.locationState === 'world';
    this.highlightObject
      .setVisible(isInWorld && (enabled || this.isBeingInvestigated))
      .setAlpha(this.isBeingInvestigated ? 1 : alpha);
    this.taskMarker.setVisible(enabled && isInWorld).setAlpha(alpha);
  }

  setPromptText(text: string): void {
    this.promptText.setText(text.replace(/^E\s+/, ''));
  }

  beginInvestigation(): void {
    this.isBeingInvestigated = true;
    this.promptObject.setVisible(false);
    this.highlightObject.setVisible(true).setAlpha(1);
  }

  endInvestigation(): void {
    this.isBeingInvestigated = false;
    this.promptObject.setVisible(false);
    this.highlightObject
      .setVisible(this.taskHighlightEnabled && this.locationState === 'world')
      .setAlpha(this.taskHighlightAlpha);
  }

  moveToWorldSpot(worldX: number, worldY: number, displaySpotId: string): void {
    this.worldX = worldX;
    this.worldY = worldY;
    this.locationState = 'world';
    this.displaySpotId = displaySpotId;
    this.isAvailable = true;
    this.visualObject.setPosition(worldX, worldY).setVisible(true);
    this.taskMarker.setPosition(worldX, worldY).setVisible(this.taskHighlightEnabled);
    this.promptObject.setPosition(worldX, worldY + this.promptOffsetY).setVisible(false);
    this.highlightObject
      .setVisible(this.taskHighlightEnabled)
      .setAlpha(this.taskHighlightAlpha);
  }

  setCarried(): void {
    this.locationState = 'carried';
    this.displaySpotId = null;
    this.isBeingInvestigated = false;
    this.visualObject.setVisible(false);
    this.promptObject.setVisible(false);
    this.highlightObject.setVisible(false);
    this.taskMarker.setVisible(false);
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available;
    this.visualObject.setVisible(available && this.locationState === 'world');

    if (!available) {
      this.promptObject.setVisible(false);
      this.highlightObject.setVisible(false);
      this.taskMarker.setVisible(false);
    }
  }
}

export type ArtifactData = InvestigableObject;
