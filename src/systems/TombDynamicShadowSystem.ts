import Phaser from 'phaser';
import type { TombPointLight, TombShadowCaster } from '../types/TombLighting';

export type FlashlightShadowSource = Readonly<{
  x: number;
  y: number;
  angle: number;
  distance: number;
  halfAngle: number;
  intensity: number;
}>;

export class TombDynamicShadowSystem {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(2.04);
  }

  update(
    flashlight: FlashlightShadowSource | null,
    pointLights: readonly TombPointLight[],
    casters: readonly TombShadowCaster[],
  ): void {
    this.graphics.clear();
    for (const caster of casters) {
      if (!caster.visible) continue;
      const source = this.chooseLight(caster, flashlight, pointLights);
      if (!source || source.score < 0.035) continue;
      this.drawProjectedShadow(caster, source.x, source.y, source.score);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private chooseLight(
    caster: TombShadowCaster,
    flashlight: FlashlightShadowSource | null,
    pointLights: readonly TombPointLight[],
  ): { x: number; y: number; score: number } | null {
    let chosen: { x: number; y: number; score: number } | null = null;
    if (flashlight && flashlight.intensity > 0.01) {
      const distance = Phaser.Math.Distance.Between(flashlight.x, flashlight.y, caster.x, caster.y);
      const targetAngle = Phaser.Math.Angle.Between(flashlight.x, flashlight.y, caster.x, caster.y);
      const difference = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - flashlight.angle));
      const angular = Phaser.Math.Clamp(1 - difference / (flashlight.halfAngle * 1.2), 0, 1);
      const radial = Phaser.Math.Clamp(1 - distance / flashlight.distance, 0, 1);
      const score = flashlight.intensity * angular * radial;
      if (score > 0.035) chosen = { x: flashlight.x, y: flashlight.y, score };
    }
    for (const light of pointLights) {
      if (light.intensity <= 0.01) continue;
      const distance = Phaser.Math.Distance.Between(light.x, light.y, caster.x, caster.y);
      const score = light.intensity * Phaser.Math.Clamp(1 - distance / light.radius, 0, 1);
      if (score > (chosen?.score ?? 0)) {
        chosen = { x: light.x, y: light.y, score };
      }
    }
    return chosen;
  }

  private drawProjectedShadow(
    caster: TombShadowCaster,
    lightX: number,
    lightY: number,
    score: number,
  ): void {
    const direction = new Phaser.Math.Vector2(caster.x - lightX, caster.y - lightY);
    if (direction.lengthSq() < 4) direction.set(0, 1);
    direction.normalize();
    const perpendicular = new Phaser.Math.Vector2(-direction.y, direction.x);
    const length = Phaser.Math.Clamp(caster.height * (0.32 + score * 0.7), 10, 58);
    const baseWidth = caster.radius * (0.72 + score * 0.32);

    for (let layer = 0; layer < 3; layer += 1) {
      const spread = layer * 3.5;
      const startX = caster.x + direction.x * 3;
      const startY = caster.y + direction.y * 3;
      const endX = caster.x + direction.x * (length + spread * 1.7);
      const endY = caster.y + direction.y * (length + spread * 1.7);
      const startWidth = baseWidth + spread;
      const endWidth = baseWidth * 0.34 + spread * 0.45;
      const points = [
        new Phaser.Geom.Point(startX + perpendicular.x * startWidth, startY + perpendicular.y * startWidth),
        new Phaser.Geom.Point(startX - perpendicular.x * startWidth, startY - perpendicular.y * startWidth),
        new Phaser.Geom.Point(endX - perpendicular.x * endWidth, endY - perpendicular.y * endWidth),
        new Phaser.Geom.Point(endX + perpendicular.x * endWidth, endY + perpendicular.y * endWidth),
      ];
      this.graphics.fillStyle(0x020302, score * (0.18 - layer * 0.045));
      this.graphics.fillPoints(points, true);
    }
  }
}
