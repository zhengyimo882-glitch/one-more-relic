import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { TombPointLight } from '../types/TombLighting';

export type LampOccluderRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type DirectionalLampDebugInfo = Readonly<{
  isOn: boolean;
  angleRadians: number;
  brightness: number;
  effectiveDistance: number;
  safeRadius: number;
  originX: number;
  originY: number;
}>;

export class DirectionalLampSystem {
  private readonly darkness: Phaser.GameObjects.RenderTexture;
  private readonly visibilityBrush: Phaser.GameObjects.Graphics;
  private readonly light: Phaser.GameObjects.Graphics;
  private readonly pointLightGlow: Phaser.GameObjects.Graphics;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private readonly toggleKey: Phaser.Input.Keyboard.Key;
  private readonly occluders: readonly LampOccluderRect[];
  private angle = -Math.PI / 2;
  private aimAngle = -Math.PI / 2;
  private brightness = 1;
  private targetBrightness = 1;
  private flickerRemaining = 0;
  private flickerStrength = 0;
  private debugVisible: boolean = TOMB_FEEL.lamp.debugVisibleByDefault;
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private lastLightX = 0;
  private lastLightY = 0;
  private latestPointLights: readonly TombPointLight[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    occluders: readonly LampOccluderRect[] = [],
  ) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for the directional lamp.');
    }
    this.occluders = occluders;
    this.toggleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.darkness = scene.add
      .renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(7.05);
    this.visibilityBrush = new Phaser.GameObjects.Graphics(scene);
    this.light = scene.add
      .graphics()
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.pointLightGlow = scene.add
      .graphics()
      .setDepth(7.08)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.debugGraphics = scene.add
      .graphics()
      .setDepth(78)
      .setVisible(this.debugVisible);
  }

  update(
    playerX: number,
    playerY: number,
    deltaSeconds: number,
    pointLights: readonly TombPointLight[] = [],
  ): boolean {
    let toggled = false;
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.targetBrightness = this.targetBrightness > 0 ? 0 : 1;
      toggled = true;
    }

    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    this.latestPointLights = pointLights;
    this.updateDirection(playerX, playerY, deltaSeconds);
    this.lastLightX =
      playerX +
      Math.cos(this.angle) * TOMB_FEEL.player.flashlightForwardOffset -
      Math.sin(this.angle) * TOMB_FEEL.player.flashlightMountOffsetX;
    this.lastLightY =
      playerY +
      TOMB_FEEL.player.flashlightMountOffsetY +
      Math.sin(this.angle) * TOMB_FEEL.player.flashlightForwardOffset * 0.35 +
      Math.cos(this.angle) * TOMB_FEEL.player.flashlightMountOffsetX;
    this.updateBrightness(deltaSeconds);

    if (this.flickerRemaining > 0) {
      this.flickerRemaining = Math.max(0, this.flickerRemaining - deltaSeconds);
      if (this.flickerRemaining === 0) {
        this.flickerStrength = 0;
      }
    }

    const flicker = this.flickerRemaining > 0
      ? 1 - (0.2 + Math.abs(Math.sin(this.scene.time.now / 34)) * this.flickerStrength)
      : 1;
    const visibleBrightness = Phaser.Math.Clamp(this.brightness * flicker, 0, 1);
    this.redrawDarkness(
      playerX,
      playerY,
      this.lastLightX,
      this.lastLightY,
      visibleBrightness,
      pointLights,
    );
    this.redrawLight(this.lastLightX, this.lastLightY, visibleBrightness);
    this.redrawPointLights(pointLights);
    this.redrawDebug();
    return toggled;
  }

  isOn(): boolean {
    return this.targetBrightness > 0;
  }

  getBrightness(): number {
    return this.brightness;
  }

  getAngleRadians(): number {
    return this.angle;
  }

  getAimAngleRadians(): number {
    return this.aimAngle;
  }

  getDebugInfo(): DirectionalLampDebugInfo {
    return {
      isOn: this.isOn(),
      angleRadians: this.angle,
      brightness: this.brightness,
      effectiveDistance: TOMB_FEEL.lamp.effectiveDistance,
      safeRadius: TOMB_FEEL.lamp.safetyLightRadius,
      originX: this.lastLightX,
      originY: this.lastLightY,
    };
  }

  isWorldPointVisible(worldX: number, worldY: number): boolean {
    const playerDistance = Phaser.Math.Distance.Between(
      this.lastPlayerX,
      this.lastPlayerY,
      worldX,
      worldY,
    );
    if (playerDistance <= TOMB_FEEL.interaction.safetyRevealRadius) {
      return true;
    }
    if (this.latestPointLights.some((light) => {
      const distance = Phaser.Math.Distance.Between(light.x, light.y, worldX, worldY);
      return light.intensity >= 0.12 && distance <= light.radius * 0.78;
    })) {
      return true;
    }
    if (!this.isOn() || this.brightness < 0.12) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(
      this.lastLightX,
      this.lastLightY,
      worldX,
      worldY,
    );
    const targetAngle = Phaser.Math.Angle.Between(
      this.lastLightX,
      this.lastLightY,
      worldX,
      worldY,
    );
    const angleDifference = Math.abs(
      Phaser.Math.Angle.Wrap(targetAngle - this.angle),
    );
    if (
      angleDifference >
      TOMB_FEEL.lamp.coneHalfAngle +
        TOMB_FEEL.lamp.edgeFeatherWidthRadians * 0.55
    ) {
      return false;
    }
    if (
      distance >
      TOMB_FEEL.lamp.effectiveDistance +
        TOMB_FEEL.lamp.edgeFeatherDistance * 0.5
    ) {
      return false;
    }

    const directionX = (worldX - this.lastLightX) / Math.max(distance, 0.001);
    const directionY = (worldY - this.lastLightY) / Math.max(distance, 0.001);
    const unobstructedDistance = this.getOccludedDistance(
      this.lastLightX,
      this.lastLightY,
      directionX,
      directionY,
      distance,
    );
    return unobstructedDistance >= distance - TOMB_FEEL.lamp.occlusionHitPadding;
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.debugGraphics.setVisible(visible);
    if (!visible) {
      this.debugGraphics.clear();
    }
  }

  flicker(durationSeconds = 0.34, strength = 0.48): void {
    this.flickerRemaining = Math.max(this.flickerRemaining, durationSeconds);
    this.flickerStrength = Math.max(this.flickerStrength, strength);
  }

  destroy(): void {
    this.toggleKey.destroy();
    this.darkness.destroy();
    this.visibilityBrush.destroy();
    this.light.destroy();
    this.pointLightGlow.destroy();
    this.debugGraphics.destroy();
  }

  private updateDirection(
    playerX: number,
    playerY: number,
    deltaSeconds: number,
  ): void {
    const pointerWorld = this.scene.input.activePointer.positionToCamera(
      this.scene.cameras.main,
    ) as Phaser.Math.Vector2;
    const targetAngle = Phaser.Math.Angle.Between(
      playerX,
      playerY,
      pointerWorld.x,
      pointerWorld.y,
    );
    this.aimAngle = Phaser.Math.Angle.RotateTo(
      this.aimAngle,
      targetAngle,
      TOMB_FEEL.lamp.directionSmoothingRadiansPerSecond * deltaSeconds,
    );
    this.angle = this.aimAngle;
  }

  private updateBrightness(deltaSeconds: number): void {
    const transitionMs = this.targetBrightness > this.brightness
      ? TOMB_FEEL.lamp.turnOnTransitionMs
      : TOMB_FEEL.lamp.turnOffTransitionMs;
    const maxChange = transitionMs <= 0 ? 1 : (deltaSeconds * 1000) / transitionMs;
    this.brightness = Phaser.Math.Linear(
      this.brightness,
      this.targetBrightness,
      Phaser.Math.Clamp(maxChange, 0, 1),
    );
    if (Math.abs(this.brightness - this.targetBrightness) < 0.002) {
      this.brightness = this.targetBrightness;
    }
  }

  private redrawDarkness(
    playerX: number,
    playerY: number,
    lightX: number,
    lightY: number,
    visibleBrightness: number,
    pointLights: readonly TombPointLight[],
  ): void {
    const camera = this.scene.cameras.main;
    const screenX = (playerX - camera.scrollX) * camera.zoom + camera.x;
    const screenY = (playerY - camera.scrollY) * camera.zoom + camera.y;
    const outsideAlpha = this.isOn()
      ? TOMB_FEEL.lamp.outsideDarknessAlpha
      : 1 - TOMB_FEEL.lamp.lampOffMinimumEnvironmentBrightness;
    this.darkness.clear();
    this.darkness.fill(0x000000, outsideAlpha);

    this.eraseSafetyLight(screenX, screenY);
    this.erasePointLights(pointLights);
    if (visibleBrightness <= 0.01) {
      return;
    }

    const layerCount = 14;
    for (let index = 0; index < layerCount; index += 1) {
      const ratio = 1 - index / (layerCount - 1);
      const alpha = Phaser.Math.Linear(0.018, 0.19, 1 - ratio);
      const worldPolygon = this.createVisibilityPolygon(
        lightX,
        lightY,
        TOMB_FEEL.lamp.coneHalfAngle + TOMB_FEEL.lamp.edgeFeatherWidthRadians * ratio,
        TOMB_FEEL.lamp.effectiveDistance + TOMB_FEEL.lamp.edgeFeatherDistance * ratio,
      );
      const screenPolygon = worldPolygon.map(
        (point) =>
          new Phaser.Geom.Point(
            (point.x - camera.scrollX) * camera.zoom + camera.x,
            (point.y - camera.scrollY) * camera.zoom + camera.y,
          ),
      );
      this.visibilityBrush.clear();
      this.visibilityBrush.fillStyle(
        0xffffff,
        alpha * visibleBrightness,
      );
      this.visibilityBrush.fillPoints(screenPolygon, true);
      this.darkness.erase(this.visibilityBrush);
    }
  }

  private erasePointLights(pointLights: readonly TombPointLight[]): void {
    const camera = this.scene.cameras.main;
    for (const light of pointLights) {
      const intensity = Phaser.Math.Clamp(light.intensity, 0, 1);
      if (intensity <= 0.005) continue;
      const screenX = (light.x - camera.scrollX) * camera.zoom + camera.x;
      const screenY = (light.y - camera.scrollY) * camera.zoom + camera.y;
      for (let index = 0; index < 10; index += 1) {
        const ratio = 1 - index / 10;
        this.visibilityBrush.clear();
        this.visibilityBrush.fillStyle(
          0xffffff,
          intensity * Phaser.Math.Linear(0.018, 0.14, 1 - ratio),
        );
        this.visibilityBrush.fillCircle(screenX, screenY, light.radius * ratio);
        this.darkness.erase(this.visibilityBrush);
      }
    }
  }

  private eraseSafetyLight(screenX: number, screenY: number): void {
    const radius = TOMB_FEEL.lamp.safetyLightRadius;
    const brightness = TOMB_FEEL.lamp.safetyLightBrightness;
    const layers = [
      { radiusScale: 1.4, alphaScale: 0.18 },
      { radiusScale: 1.15, alphaScale: 0.3 },
      { radiusScale: 0.82, alphaScale: 0.52 },
    ] as const;
    for (const layer of layers) {
      this.visibilityBrush.clear();
      this.visibilityBrush.fillStyle(
        0xffffff,
        brightness * layer.alphaScale,
      );
      this.visibilityBrush.fillCircle(
        screenX,
        screenY,
        radius * layer.radiusScale,
      );
      this.darkness.erase(this.visibilityBrush);
    }
  }

  private redrawLight(
    lightX: number,
    lightY: number,
    visibleBrightness: number,
  ): void {
    this.light.clear();
    if (visibleBrightness <= 0.01) {
      return;
    }
    const centerStrength =
      TOMB_FEEL.lamp.centerBrightness * visibleBrightness;
    const layerCount = 11;
    for (let index = 0; index < layerCount; index += 1) {
      const ratio = 1 - index / (layerCount - 1);
      const polygon = this.createVisibilityPolygon(
        lightX,
        lightY,
        TOMB_FEEL.lamp.coneHalfAngle * Phaser.Math.Linear(1.18, 0.5, 1 - ratio),
        TOMB_FEEL.lamp.effectiveDistance * Phaser.Math.Linear(1.04, 0.72, 1 - ratio),
      );
      const color = index < 4 ? 0xd8a15f : index < 8 ? 0xffc879 : 0xffe1ad;
      this.light.fillStyle(color, centerStrength * Phaser.Math.Linear(0.012, 0.04, 1 - ratio));
      this.light.fillPoints(polygon, true);
    }
    this.light.fillStyle(0xffe4b4, 0.08 * centerStrength);
    this.light.fillCircle(lightX, lightY, 34);
  }

  private redrawPointLights(pointLights: readonly TombPointLight[]): void {
    this.pointLightGlow.clear();
    for (const light of pointLights) {
      const intensity = Phaser.Math.Clamp(light.intensity, 0, 1);
      if (intensity <= 0.005) continue;
      for (let index = 0; index < 9; index += 1) {
        const ratio = 1 - index / 9;
        this.pointLightGlow.fillStyle(
          light.color,
          intensity * Phaser.Math.Linear(0.006, 0.034, 1 - ratio),
        );
        this.pointLightGlow.fillCircle(light.x, light.y, light.radius * ratio);
      }
      this.pointLightGlow.fillStyle(light.color, intensity * 0.12);
      this.pointLightGlow.fillCircle(light.x, light.y, 13);
    }
  }

  private createVisibilityPolygon(
    originX: number,
    originY: number,
    halfAngle: number,
    maxDistance: number,
  ): Phaser.Geom.Point[] {
    const points = [new Phaser.Geom.Point(originX, originY)];
    const rayCount = Math.max(3, TOMB_FEEL.lamp.occlusionRayCount);
    for (let index = 0; index < rayCount; index += 1) {
      const ratio = index / (rayCount - 1);
      const rayAngle = this.angle - halfAngle + halfAngle * 2 * ratio;
      const directionX = Math.cos(rayAngle);
      const directionY = Math.sin(rayAngle);
      const distance = this.getOccludedDistance(
        originX,
        originY,
        directionX,
        directionY,
        maxDistance,
      );
      points.push(
        new Phaser.Geom.Point(
          originX + directionX * distance,
          originY + directionY * distance,
        ),
      );
    }
    return points;
  }

  private getOccludedDistance(
    originX: number,
    originY: number,
    directionX: number,
    directionY: number,
    maxDistance: number,
  ): number {
    let nearestDistance = maxDistance;
    for (const rect of this.occluders) {
      const intersectionDistance = this.getRayRectangleDistance(
        originX,
        originY,
        directionX,
        directionY,
        rect,
        maxDistance,
      );
      if (intersectionDistance !== null) {
        nearestDistance = Math.min(nearestDistance, intersectionDistance);
      }
    }
    return Math.max(0, nearestDistance - TOMB_FEEL.lamp.occlusionHitPadding);
  }

  private getRayRectangleDistance(
    originX: number,
    originY: number,
    directionX: number,
    directionY: number,
    rect: LampOccluderRect,
    maxDistance: number,
  ): number | null {
    let minimumDistance = 0;
    let maximumDistance = maxDistance;
    const axes = [
      { origin: originX, direction: directionX, min: rect.x, max: rect.x + rect.width },
      { origin: originY, direction: directionY, min: rect.y, max: rect.y + rect.height },
    ] as const;
    for (const axis of axes) {
      if (Math.abs(axis.direction) < 0.00001) {
        if (axis.origin < axis.min || axis.origin > axis.max) {
          return null;
        }
        continue;
      }
      const firstDistance = (axis.min - axis.origin) / axis.direction;
      const secondDistance = (axis.max - axis.origin) / axis.direction;
      minimumDistance = Math.max(
        minimumDistance,
        Math.min(firstDistance, secondDistance),
      );
      maximumDistance = Math.min(
        maximumDistance,
        Math.max(firstDistance, secondDistance),
      );
      if (maximumDistance < minimumDistance) {
        return null;
      }
    }
    return minimumDistance > 0.5 ? minimumDistance : maximumDistance > 0.5 ? maximumDistance : null;
  }

  private redrawDebug(): void {
    if (!this.debugVisible) {
      return;
    }
    this.debugGraphics.clear();
    const polygon = this.createVisibilityPolygon(
      this.lastLightX,
      this.lastLightY,
      TOMB_FEEL.lamp.coneHalfAngle,
      TOMB_FEEL.lamp.effectiveDistance,
    );
    this.debugGraphics.lineStyle(2, 0x68d8cf, 0.9);
    this.debugGraphics.strokePoints(polygon, true);
    this.debugGraphics.lineStyle(1, 0x8ab7ff, 0.75);
    this.debugGraphics.strokeCircle(
      this.lastPlayerX,
      this.lastPlayerY,
      TOMB_FEEL.lamp.safetyLightRadius,
    );
    this.debugGraphics.lineBetween(
      this.lastLightX,
      this.lastLightY,
      this.lastLightX + Math.cos(this.angle) * TOMB_FEEL.lamp.effectiveDistance,
      this.lastLightY + Math.sin(this.angle) * TOMB_FEEL.lamp.effectiveDistance,
    );
    this.debugGraphics.fillStyle(0xffd18a, 0.95);
    this.debugGraphics.fillCircle(this.lastLightX, this.lastLightY, 3);
  }
}
