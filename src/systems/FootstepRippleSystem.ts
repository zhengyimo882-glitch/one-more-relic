import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { FootstepEmission } from './DelayedFootstepSystem';

export type RippleAllowedArea = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type FootstepRippleDebugInfo = Readonly<{
  activeFootsteps: number;
  activeRings: number;
  poolSize: number;
  lastEchoX: number | null;
  lastEchoY: number | null;
  lastFollowerX: number | null;
  lastFollowerY: number | null;
}>;

type RippleSlot = {
  graphics: Phaser.GameObjects.Graphics;
  active: boolean;
  kind: 'echo' | 'follower';
  x: number;
  y: number;
  ageMs: number;
  durationMs: number;
  initialRadius: number;
  maximumRadius: number;
  lineWidth: number;
  layerCount: number;
  color: number;
  baseAlpha: number;
  seed: number;
  provoked: boolean;
};

export class FootstepRippleSystem {
  private readonly slots: RippleSlot[] = [];
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private debugVisible = TOMB_FEEL.ripples.debugVisibleByDefault;
  private sequence = 0;
  private lastEchoX: number | null = null;
  private lastEchoY: number | null = null;
  private lastFollowerX: number | null = null;
  private lastFollowerY: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly allowedAreas: readonly RippleAllowedArea[],
  ) {
    for (let index = 0; index < TOMB_FEEL.ripples.maximumActiveFootsteps; index += 1) {
      this.slots.push({
        graphics: scene.add.graphics().setDepth(7.1).setVisible(false),
        active: false,
        kind: 'echo',
        x: 0,
        y: 0,
        ageMs: 0,
        durationMs: 0,
        initialRadius: 0,
        maximumRadius: 0,
        lineWidth: 0,
        layerCount: 0,
        color: 0,
        baseAlpha: 0,
        seed: index + 1,
        provoked: false,
      });
    }
    this.debugGraphics = scene.add
      .graphics()
      .setDepth(78.5)
      .setVisible(this.debugVisible);
  }

  emit(emission: FootstepEmission): void {
    if (emission.kind === 'player') {
      return;
    }
    const projectedPosition = this.projectToAllowedPoint(
      emission.x,
      emission.y,
      emission.kind === 'follower' ? 96 : 18,
    );
    if (!projectedPosition) {
      return;
    }
    const slot = this.acquireSlot();
    const follower = emission.kind === 'follower';
    const sizeMultiplier = emission.provoked
      ? TOMB_FEEL.ripples.provokedSizeMultiplier
      : 1;
    const speedMultiplier = emission.provoked
      ? TOMB_FEEL.ripples.provokedSpeedMultiplier
      : 1;
    slot.active = true;
    slot.kind = emission.kind;
    slot.x = projectedPosition.x;
    slot.y = projectedPosition.y;
    slot.ageMs = 0;
    slot.durationMs = (follower
      ? TOMB_FEEL.ripples.followerDurationMs
      : TOMB_FEEL.ripples.echoDurationMs) *
      (emission.provoked ? TOMB_FEEL.ripples.provokedDurationMultiplier : 1);
    slot.initialRadius = follower
      ? TOMB_FEEL.ripples.followerInitialRadius
      : TOMB_FEEL.ripples.echoInitialRadius;
    slot.maximumRadius = (follower
      ? TOMB_FEEL.ripples.followerMaximumRadius
      : TOMB_FEEL.ripples.echoMaximumRadius) * sizeMultiplier * speedMultiplier;
    slot.lineWidth = follower
      ? TOMB_FEEL.ripples.followerLineWidth
      : TOMB_FEEL.ripples.echoLineWidth;
    slot.layerCount = Math.min(
      follower ? TOMB_FEEL.ripples.followerLayerCount : TOMB_FEEL.ripples.echoLayerCount,
      Math.floor(
        TOMB_FEEL.ripples.maximumActiveRings /
          TOMB_FEEL.ripples.maximumActiveFootsteps,
      ),
    );
    slot.color = follower
      ? TOMB_FEEL.ripples.followerColor
      : TOMB_FEEL.ripples.echoColor;
    slot.baseAlpha = follower ? 0.27 : 0.19;
    slot.seed = ++this.sequence;
    slot.provoked = emission.provoked;
    slot.graphics
      .clear()
      .setPosition(slot.x, slot.y)
      .setVisible(true);

    if (follower) {
      this.lastFollowerX = slot.x;
      this.lastFollowerY = slot.y;
    } else {
      this.lastEchoX = slot.x;
      this.lastEchoY = slot.y;
    }
  }

  update(
    deltaSeconds: number,
    isWorldPointInBeam: (worldX: number, worldY: number) => boolean,
  ): void {
    for (const slot of this.slots) {
      if (!slot.active) {
        continue;
      }
      slot.ageMs += deltaSeconds * 1000;
      const totalLifetime =
        slot.durationMs + (slot.layerCount - 1) * TOMB_FEEL.ripples.concentricDelayMs;
      if (slot.ageMs >= totalLifetime) {
        this.releaseSlot(slot);
        continue;
      }
      this.redrawSlot(slot, isWorldPointInBeam(slot.x, slot.y));
    }
    this.redrawDebug();
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.debugGraphics.setVisible(visible);
    if (!visible) {
      this.debugGraphics.clear();
    }
  }

  getDebugInfo(): FootstepRippleDebugInfo {
    let activeFootsteps = 0;
    let activeRings = 0;
    for (const slot of this.slots) {
      if (!slot.active) {
        continue;
      }
      activeFootsteps += 1;
      activeRings += slot.layerCount;
    }
    return {
      activeFootsteps,
      activeRings,
      poolSize: this.slots.length,
      lastEchoX: this.lastEchoX,
      lastEchoY: this.lastEchoY,
      lastFollowerX: this.lastFollowerX,
      lastFollowerY: this.lastFollowerY,
    };
  }

  clear(): void {
    for (const slot of this.slots) {
      this.releaseSlot(slot);
    }
    this.lastEchoX = null;
    this.lastEchoY = null;
    this.lastFollowerX = null;
    this.lastFollowerY = null;
    this.debugGraphics.clear();
  }

  destroy(): void {
    this.slots.forEach((slot) => slot.graphics.destroy());
    this.slots.length = 0;
    this.debugGraphics.destroy();
  }

  private acquireSlot(): RippleSlot {
    const inactive = this.slots.find((slot) => !slot.active);
    if (inactive) {
      return inactive;
    }
    let oldest = this.slots[0];
    for (let index = 1; index < this.slots.length; index += 1) {
      if (this.slots[index].ageMs > oldest.ageMs) {
        oldest = this.slots[index];
      }
    }
    this.releaseSlot(oldest);
    return oldest;
  }

  private releaseSlot(slot: RippleSlot): void {
    slot.active = false;
    slot.graphics.clear().setVisible(false);
  }

  private redrawSlot(slot: RippleSlot, inBeam: boolean): void {
    const graphics = slot.graphics;
    graphics.clear();
    const beamMultiplier = inBeam ? TOMB_FEEL.ripples.beamAlphaMultiplier : 1;
    for (let ring = 0; ring < slot.layerCount; ring += 1) {
      const localAge = slot.ageMs - ring * TOMB_FEEL.ripples.concentricDelayMs;
      if (localAge < 0 || localAge > slot.durationMs) {
        continue;
      }
      const progress = Phaser.Math.Clamp(localAge / slot.durationMs, 0, 1);
      const eased = Phaser.Math.Easing.Sine.Out(progress);
      const radius = Phaser.Math.Linear(slot.initialRadius, slot.maximumRadius, eased);
      const alpha = Math.max(TOMB_FEEL.ripples.minimumDarknessAlpha, slot.baseAlpha) *
        Math.pow(1 - progress, 1.35) *
        beamMultiplier *
        (1 - ring * 0.08);
      const width = Math.max(0.35, slot.lineWidth * (1 - progress * 0.72));
      graphics.lineStyle(width, slot.color, Phaser.Math.Clamp(alpha, 0, 0.5));
      this.strokeBrokenEllipse(
        graphics,
        slot,
        ring,
        radius,
        radius * (slot.kind === 'follower' ? 0.46 : 0.4),
      );
    }
  }

  private strokeBrokenEllipse(
    graphics: Phaser.GameObjects.Graphics,
    slot: RippleSlot,
    ring: number,
    radiusX: number,
    radiusY: number,
  ): void {
    const segmentCount = 24;
    let drawing = false;
    graphics.beginPath();
    for (let segment = 0; segment <= segmentCount; segment += 1) {
      const angle = (segment / segmentCount) * Math.PI * 2;
      const noise = Math.sin(
        angle * (3 + (slot.seed % 3)) + slot.seed * 0.73 + ring * 1.9,
      ) * (slot.kind === 'follower' ? 2.4 : 1.45);
      const localX = Math.cos(angle) * (radiusX + noise);
      const localY = Math.sin(angle) * (radiusY + noise * 0.35);
      const allowed = this.isAllowedWorldPoint(slot.x + localX, slot.y + localY);
      const gap = ((segment * 11 + ring * 7 + slot.seed * 5) % 19) <
        (slot.kind === 'follower' ? 2 : 3);
      if (!allowed || gap) {
        drawing = false;
        continue;
      }
      if (!drawing) {
        graphics.moveTo(localX, localY);
        drawing = true;
      } else {
        graphics.lineTo(localX, localY);
      }
    }
    graphics.strokePath();
  }

  private isAllowedWorldPoint(worldX: number, worldY: number): boolean {
    for (const area of this.allowedAreas) {
      if (
        worldX >= area.x &&
        worldX <= area.x + area.width &&
        worldY >= area.y &&
        worldY <= area.y + area.height
      ) {
        return true;
      }
    }
    return false;
  }

  private projectToAllowedPoint(
    worldX: number,
    worldY: number,
    maximumDistance: number,
  ): Phaser.Math.Vector2 | null {
    if (this.isAllowedWorldPoint(worldX, worldY)) {
      return new Phaser.Math.Vector2(worldX, worldY);
    }
    const inset = 6;
    let bestX = worldX;
    let bestY = worldY;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    for (const area of this.allowedAreas) {
      const minimumX = area.x + Math.min(inset, area.width * 0.25);
      const maximumX = area.x + area.width - Math.min(inset, area.width * 0.25);
      const minimumY = area.y + Math.min(inset, area.height * 0.25);
      const maximumY = area.y + area.height - Math.min(inset, area.height * 0.25);
      const candidateX = Phaser.Math.Clamp(worldX, minimumX, maximumX);
      const candidateY = Phaser.Math.Clamp(worldY, minimumY, maximumY);
      const distanceSquared = Phaser.Math.Distance.Squared(
        worldX,
        worldY,
        candidateX,
        candidateY,
      );
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestX = candidateX;
        bestY = candidateY;
      }
    }
    if (bestDistanceSquared > maximumDistance * maximumDistance) {
      return null;
    }
    return new Phaser.Math.Vector2(bestX, bestY);
  }

  private redrawDebug(): void {
    if (!this.debugVisible) {
      return;
    }
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(1, 0x5a8f83, 0.22);
    this.allowedAreas.forEach((area) =>
      this.debugGraphics.strokeRect(area.x, area.y, area.width, area.height),
    );
    if (this.lastEchoX !== null && this.lastEchoY !== null) {
      this.debugGraphics.fillStyle(0x76b5aa, 0.88);
      this.debugGraphics.fillCircle(this.lastEchoX, this.lastEchoY, 4);
    }
    if (this.lastFollowerX !== null && this.lastFollowerY !== null) {
      this.debugGraphics.fillStyle(0xa66557, 0.9);
      this.debugGraphics.fillCircle(this.lastFollowerX, this.lastFollowerY, 5);
    }
  }
}
