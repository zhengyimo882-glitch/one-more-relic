import Phaser from 'phaser';
import {
  RESTORATION_TOOLS,
  type DirtType,
  type RestorationDefinition,
  type RestorationToolId,
} from '../data/relicRestoration';
import type { TombLootRecord } from './ShopProgressSystem';
import type { ShopAudioSystem } from './ShopAudioSystem';

type CleaningCallbacks = {
  onChanged: (progress: number, damage: number, dirtType: DirtType) => void;
  onWarning: (message: string) => void;
};

type CleaningCell = { x: number; y: number; remaining: number; passes: number; dirtType: DirtType };

export class RelicCleaningController {
  private readonly scene: Phaser.Scene;
  private readonly definition: RestorationDefinition;
  private readonly loot: TombLootRecord;
  private readonly audio?: ShopAudioSystem;
  private readonly callbacks: CleaningCallbacks;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly width: number;
  private readonly height: number;
  private readonly dirtTexture: Phaser.GameObjects.RenderTexture;
  private readonly damageImage: Phaser.GameObjects.Image;
  private readonly toolFollower: Phaser.GameObjects.Image;
  private readonly maskStamp: Phaser.GameObjects.Image;
  private readonly cells: CleaningCell[] = [];
  private toolId: RestorationToolId = 'soft-brush';
  private strokeActive = false;
  private lastPointer = new Phaser.Math.Vector2();
  private lastSampleAt = 0;
  private dwellMs = 0;
  private lastParticleAt = 0;
  private lastWarningAt = -5000;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    definition: RestorationDefinition,
    loot: TombLootRecord,
    audio: ShopAudioSystem | undefined,
    centerX: number,
    centerY: number,
    callbacks: CleaningCallbacks,
  ) {
    this.scene = scene; this.definition = definition; this.loot = loot; this.audio = audio;
    this.centerX = centerX; this.centerY = centerY; this.callbacks = callbacks;
    const face = definition.inspectionFaces.find((candidate) => candidate.id === definition.cleaningFace)
      ?? definition.inspectionFaces[0];
    this.width = face.displayWidth; this.height = face.displayHeight;

    const shadow = scene.add.image(centerX + 12, centerY + 16, face.shadowTexture).setDisplaySize(this.width, this.height).setAlpha(0.75);
    const clean = scene.add.image(centerX, centerY, face.cleanTexture).setDisplaySize(this.width, this.height);
    this.damageImage = scene.add.image(centerX, centerY, face.damagedTexture).setDisplaySize(this.width, this.height);
    this.damageImage.setAlpha(this.damageAlpha());
    this.dirtTexture = scene.add.renderTexture(centerX, centerY, this.width, this.height).setOrigin(0.5);
    const dirtSource = scene.make.image({ x: 0, y: 0, key: face.dirtyTexture, add: false }).setOrigin(0).setDisplaySize(this.width, this.height);
    this.dirtTexture.draw(dirtSource, 0, 0); dirtSource.destroy();
    this.ensureMaskTexture();
    this.maskStamp = scene.make.image({ x: 0, y: 0, key: 'restoration-soft-mask', add: false });
    this.toolFollower = scene.add.image(centerX, centerY, RESTORATION_TOOLS[this.toolId].texture)
      .setDisplaySize(105, 178).setAlpha(0).setDepth(4).setAngle(-28);
    layer.add([shadow, clean, this.damageImage, this.dirtTexture, this.toolFollower]);

    this.createCells();
    this.restoreMask();
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointermove', this.onPointerMove);
  }

  setTool(toolId: RestorationToolId): void {
    this.toolId = toolId;
    const tool = RESTORATION_TOOLS[toolId];
    this.toolFollower.setTexture(tool.texture);
    const sizes: Record<RestorationToolId, [number, number, number]> = {
      'soft-brush': [105, 178, -28], 'bamboo-pick': [74, 185, -38], 'dry-cloth': [138, 150, -10],
    };
    this.toolFollower.setDisplaySize(sizes[toolId][0], sizes[toolId][1]).setAngle(sizes[toolId][2]);
  }

  getTool(): RestorationToolId { return this.toolId; }

  update(time: number): void {
    if (!this.strokeActive || this.destroyed) return;
    if (time - this.lastSampleAt >= 70) {
      this.applyAt(this.lastPointer.x, this.lastPointer.y, time, 0);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.maskStamp.destroy();
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.insideArtifact(pointer.x, pointer.y)) return;
    this.strokeActive = true; this.lastPointer.set(pointer.x, pointer.y);
    this.lastSampleAt = this.scene.time.now; this.dwellMs = 0;
    this.toolFollower.setPosition(pointer.x + 35, pointer.y + 46).setAlpha(1);
    this.applyAt(pointer.x, pointer.y, this.scene.time.now, 0);
  };

  private readonly onPointerUp = (): void => {
    this.strokeActive = false; this.dwellMs = 0;
    this.scene.tweens.add({ targets: this.toolFollower, alpha: 0, duration: 110 });
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.strokeActive) return;
    const fromX = this.lastPointer.x; const fromY = this.lastPointer.y;
    const distance = Phaser.Math.Distance.Between(fromX, fromY, pointer.x, pointer.y);
    const steps = Math.max(1, Math.ceil(distance / 9));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      this.applyAt(Phaser.Math.Linear(fromX, pointer.x, t), Phaser.Math.Linear(fromY, pointer.y, t), this.scene.time.now, distance);
    }
    this.lastPointer.set(pointer.x, pointer.y);
    this.toolFollower.setPosition(pointer.x + 35, pointer.y + 46);
  };

  private applyAt(worldX: number, worldY: number, time: number, movementDistance: number): void {
    if (!this.insideArtifact(worldX, worldY)) return;
    const dt = Phaser.Math.Clamp(time - this.lastSampleAt, 16, 90);
    const speed = movementDistance / Math.max(0.016, dt / 1000);
    this.dwellMs = movementDistance < 4 ? this.dwellMs + dt : Math.max(0, this.dwellMs - dt * 0.65);
    this.lastSampleAt = time;
    const nx = (worldX - (this.centerX - this.width / 2)) / this.width;
    const ny = (worldY - (this.centerY - this.height / 2)) / this.height;
    const dirtType = this.dirtTypeAt(nx, ny);
    const tool = RESTORATION_TOOLS[this.toolId];
    const modifier = this.definition.toolModifiers[this.toolId] ?? 1;
    const rate = tool.rates[dirtType] * modifier;
    const radiusX = tool.radius / this.width; const radiusY = tool.radius / this.height;
    let touched = false;
    this.cells.forEach((cell) => {
      const distance = Math.hypot((cell.x - nx) / radiusX, (cell.y - ny) / radiusY);
      if (distance > 1 || cell.remaining <= 0) return;
      const localRate = tool.rates[cell.dirtType] * modifier;
      cell.remaining = Math.max(0, cell.remaining - localRate * (0.045 + dt / 2300));
      cell.passes += 1; touched = true;
    });
    if (touched) {
      this.maskStamp.setDisplaySize(tool.radius * 2, tool.radius * 2).setAlpha(Phaser.Math.Clamp(rate * 0.28, 0.05, 0.6));
      this.dirtTexture.erase(this.maskStamp, nx * this.width, ny * this.height);
      const points = this.loot.cleaningMaskPoints ?? (this.loot.cleaningMaskPoints = []);
      if (points.length < 520 && (points.length === 0 || Phaser.Math.Distance.Between(points.at(-1)!.x, points.at(-1)!.y, nx, ny) > 0.012)) {
        points.push({ x: nx, y: ny, radius: tool.radius });
      }
    }
    const toolUse = this.loot.cleaningToolUse ?? (this.loot.cleaningToolUse = {});
    toolUse[this.toolId] = (toolUse[this.toolId] ?? 0) + dt;

    const incompatible = rate < 0.25;
    const dwellRisk = this.dwellMs > tool.dwellRiskMs;
    const speedRisk = this.toolId === 'dry-cloth' && speed > tool.safeSpeed;
    const repeatedRisk = this.toolId === 'bamboo-pick' && this.cells.some((cell) => cell.passes > 22 && Math.hypot((cell.x - nx) / radiusX, (cell.y - ny) / radiusY) <= 0.65);
    if (incompatible || dwellRisk || speedRisk || repeatedRisk) {
      const multiplier = incompatible ? 1.45 : speedRisk ? 1.25 : repeatedRisk ? 1.4 : 1;
      this.loot.cleaningDamage = Phaser.Math.Clamp(this.loot.cleaningDamage + tool.damagePerSecond * multiplier * dt / 1000, 0, 100);
      this.damageImage.setAlpha(this.damageAlpha());
      this.markDestroyedEvidence();
      if (time - this.lastWarningAt > 820) {
        this.lastWarningAt = time;
        this.callbacks.onWarning(this.toolId === 'dry-cloth' ? '布面发涩了——放慢一些。' : '传来一声细刮响，表面正在受伤。');
        this.audio?.playRestorationFriction(this.toolId, dirtType, true);
      }
    } else if (time - this.lastParticleAt > 140) {
      this.audio?.playRestorationFriction(this.toolId, dirtType, false);
    }

    this.loot.cleaningProgress = this.calculateProgress();
    this.loot.preservationScore = Math.round(Phaser.Math.Clamp(100 - this.loot.cleaningDamage - Math.max(0, this.loot.cleaningProgress - 82) * 0.7, 0, 100));
    if (touched) this.emitParticle(worldX, worldY, tool.feedbackColor, dirtType);
    this.callbacks.onChanged(this.loot.cleaningProgress, this.loot.cleaningDamage, dirtType);
  }

  private createCells(): void {
    const columns = 27; const rows = 21;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column + 0.5) / columns; const y = (row + 0.5) / rows;
        if (this.definition.artifactShape === 'ellipse' && Math.hypot((x - 0.5) / 0.47, (y - 0.5) / 0.47) > 1) continue;
        if (this.definition.artifactShape === 'rect' && (x < 0.035 || x > 0.965 || y < 0.05 || y > 0.95)) continue;
        this.cells.push({ x, y, remaining: 1, passes: 0, dirtType: this.dirtTypeAt(x, y) });
      }
    }
    const initialProgress = this.loot.cleaningProgress > 0 && this.loot.cleaningProgress <= 9 && !this.loot.cleaned
      ? this.loot.cleaningProgress / 9 * 100 : this.loot.cleaningProgress;
    if (initialProgress > 0 && !(this.loot.cleaningMaskPoints?.length)) {
      const cleared = Math.floor(this.cells.length * initialProgress / 100);
      this.cells.slice(0, cleared).forEach((cell) => { cell.remaining = 0; });
      this.dirtTexture.setAlpha(Phaser.Math.Clamp(1 - initialProgress / 118, 0.12, 1));
    }
  }

  private restoreMask(): void {
    const points = this.loot.cleaningMaskPoints ?? [];
    points.forEach((point) => {
      this.maskStamp.setDisplaySize(point.radius * 2, point.radius * 2).setAlpha(0.42);
      this.dirtTexture.erase(this.maskStamp, point.x * this.width, point.y * this.height);
    });
  }

  private calculateProgress(): number {
    const remaining = this.cells.reduce((sum, cell) => sum + cell.remaining, 0);
    return Math.round((1 - remaining / this.cells.length) * 1000) / 10;
  }

  private dirtTypeAt(x: number, y: number): DirtType {
    let result: DirtType = this.definition.cleaningLayers[0] ?? 'loose-dust';
    this.definition.cleaningRegions.forEach((region) => {
      if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) result = region.dirtType;
    });
    return result;
  }

  private insideArtifact(x: number, y: number): boolean {
    const nx = (x - this.centerX) / (this.width / 2); const ny = (y - this.centerY) / (this.height / 2);
    if (this.definition.artifactShape === 'ellipse') return nx * nx + ny * ny <= 0.96;
    return Math.abs(nx) <= 0.96 && Math.abs(ny) <= 0.93;
  }

  private damageAlpha(): number {
    if (this.loot.cleaningDamage < this.definition.damageThresholds.visible) return 0;
    return Phaser.Math.Clamp((this.loot.cleaningDamage - this.definition.damageThresholds.visible) / 22, 0.18, 0.88);
  }

  private markDestroyedEvidence(): void {
    const destroyed = this.loot.destroyedEvidenceIds ?? (this.loot.destroyedEvidenceIds = []);
    this.definition.evidenceRegions.forEach((evidence) => {
      if (this.loot.cleaningDamage > evidence.maximumDamage && !destroyed.includes(evidence.id)) destroyed.push(evidence.id);
    });
  }

  private emitParticle(x: number, y: number, color: number, dirtType: DirtType): void {
    const now = this.scene.time.now;
    if (now - this.lastParticleAt < 62) return;
    this.lastParticleAt = now;
    const count = dirtType === 'hard-corrosion' ? 3 : 2;
    for (let index = 0; index < count; index += 1) {
      const particle = this.scene.add.circle(x + Phaser.Math.Between(-7, 7), y + Phaser.Math.Between(-7, 7), Phaser.Math.FloatBetween(1.2, 2.8), color, 0.7).setDepth(92);
      this.scene.tweens.add({
        targets: particle, x: particle.x + Phaser.Math.Between(-22, 22), y: particle.y + Phaser.Math.Between(-28, -8),
        alpha: 0, scale: 0.25, duration: Phaser.Math.Between(260, 520), onComplete: () => particle.destroy(),
      });
    }
  }

  private ensureMaskTexture(): void {
    if (this.scene.textures.exists('restoration-soft-mask')) return;
    const texture = this.scene.textures.createCanvas('restoration-soft-mask', 128, 128);
    if (!texture) return;
    const context = texture.context;
    const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.72, 'rgba(255,255,255,0.9)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128); texture.refresh();
  }
}
