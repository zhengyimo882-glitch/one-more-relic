import { localize } from '../i18n/gameLanguage';
import Phaser from 'phaser';
import {
  RESTORATION_TEXTURES,
  type EvidenceRegionDefinition,
  type RelicFaceDefinition,
  type RestorationDefinition,
} from '../data/relicRestoration';
import type { TombLootRecord } from './ShopProgressSystem';
import type { ShopAudioSystem } from './ShopAudioSystem';
import { PointerGestureSession } from '../input/PointerGestureSession';

type InspectionCallbacks = {
  onEvidence: (evidence: EvidenceRegionDefinition) => void;
  onHint: (text: string) => void;
  onFaceChanged: (face: RelicFaceDefinition, zoom: number, lightAngle: number) => void;
};

export class RelicInspectionController {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;
  private readonly definition: RestorationDefinition;
  private readonly loot: TombLootRecord;
  private readonly audio?: ShopAudioSystem;
  private readonly callbacks: InspectionCallbacks;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly relicContainer: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly clean: Phaser.GameObjects.Image;
  private readonly dirt: Phaser.GameObjects.Image;
  private readonly damage: Phaser.GameObjects.Image;
  private readonly light: Phaser.GameObjects.Graphics;
  private readonly lamp: Phaser.GameObjects.Image;
  private faceIndex = 0;
  private zoom = 1;
  private lightAngle = -42;
  private artifactDragging = false;
  private dragStartX = 0;
  private dragAccumulator = 0;
  private lastPointer = new Phaser.Math.Vector2();
  private lastPointerAt = 0;
  private stableEvidence?: string;
  private stableSince = 0;
  private lastHintKey = '';
  private destroyed = false;
  private readonly pointerSession: PointerGestureSession;
  private lastDragAt = 0;
  private dragVelocityX = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    definition: RestorationDefinition,
    loot: TombLootRecord,
    audio: ShopAudioSystem | undefined,
    centerX: number,
    centerY: number,
    callbacks: InspectionCallbacks,
  ) {
    this.scene = scene; this.layer = layer; this.definition = definition; this.loot = loot;
    this.audio = audio; this.centerX = centerX; this.centerY = centerY; this.callbacks = callbacks;
    const first = definition.inspectionFaces[0];
    this.light = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.shadow = scene.add.image(0, 0, first.shadowTexture);
    this.clean = scene.add.image(0, 0, first.cleanTexture);
    this.dirt = scene.add.image(0, 0, first.dirtyTexture);
    this.damage = scene.add.image(0, 0, first.damagedTexture);
    this.relicContainer = scene.add.container(centerX, centerY, [this.shadow, this.clean, this.dirt, this.damage]);
    this.lamp = scene.add.image(740, 565, RESTORATION_TEXTURES.lamp).setDisplaySize(154, 128)
      .setInteractive({ useHandCursor: true }).setDepth(5);
    scene.input.setDraggable(this.lamp);
    layer.add([this.light, this.relicContainer, this.lamp]);
    this.applyFace(); this.drawLight();
    this.pointerSession = new PointerGestureSession(scene, () => this.finishArtifactDrag());
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('wheel', this.onWheel);
    scene.input.on('drag', this.onDrag);
    scene.input.on('dragend', this.onDragEnd);
  }

  nextFace(direction: number): void {
    this.faceIndex = Phaser.Math.Wrap(this.faceIndex + direction, 0, this.definition.inspectionFaces.length);
    this.dragAccumulator = 0; this.zoom = 1; this.stableEvidence = undefined;
    this.applyFace(); this.audio?.playSfx('choice-move');
  }

  isDragging(): boolean { return this.artifactDragging || this.scene.input.activePointer?.isDown === true; }

  update(time: number, pointer: Phaser.Input.Pointer): void {
    if (this.destroyed || this.artifactDragging || pointer.primaryDown) {
      this.stableEvidence = undefined; return;
    }
    const face = this.currentFace();
    const halfWidth = face.displayWidth * this.zoom / 2; const halfHeight = face.displayHeight * this.zoom / 2;
    if (Math.abs(pointer.x - this.relicContainer.x) > halfWidth || Math.abs(pointer.y - this.relicContainer.y) > halfHeight) {
      this.scene.game.canvas.style.cursor = 'default';
      this.stableEvidence = undefined; return;
    }
    const nx = (pointer.x - (this.relicContainer.x - halfWidth)) / (halfWidth * 2);
    const ny = (pointer.y - (this.relicContainer.y - halfHeight)) / (halfHeight * 2);
    const speed = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.lastPointer.x, this.lastPointer.y)
      / Math.max(0.016, (time - this.lastPointerAt) / 1000);
    this.lastPointer.set(pointer.x, pointer.y); this.lastPointerAt = time;
    const evidence = this.definition.evidenceRegions.find((candidate) => candidate.face === face.id
      && Phaser.Math.Distance.Between(nx, ny, candidate.x, candidate.y) <= candidate.radius);
    if (!evidence || this.loot.evidenceIds.includes(evidence.id) || speed > 95) {
      this.scene.game.canvas.style.cursor = 'default';
      this.stableEvidence = undefined; return;
    }
    this.scene.game.canvas.style.cursor = 'zoom-in';
    const cleaningOk = this.loot.cleaningProgress >= evidence.minimumCleaning;
    const zoomOk = this.zoom >= evidence.zoom[0] && this.zoom <= evidence.zoom[1];
    const lightOk = Math.abs(Phaser.Math.Angle.WrapDegrees(this.lightAngle - evidence.lightAngle)) <= evidence.lightTolerance;
    const destroyed = this.loot.destroyedEvidenceIds?.includes(evidence.id) || this.loot.cleaningDamage > evidence.maximumDamage;
    if (!cleaningOk || !zoomOk || !lightOk || destroyed) {
      this.stableEvidence = undefined;
      if (destroyed) this.emitHint(`${evidence.id}-destroyed`, evidence.destroyedObservation);
      else if (!cleaningOk) this.emitHint(`${evidence.id}-clean`, localize(`Found ${evidence.searchHint}, but the dirt is still too thick.\nReveal at least ${evidence.minimumCleaning}%.`, `已找到${evidence.searchHint}，但污层仍太厚。\n需要显露 ${evidence.minimumCleaning}% 以上。`));
      else if (!zoomOk) this.emitHint(`${evidence.id}-zoom-${this.zoom < evidence.zoom[0]}`, this.zoom < evidence.zoom[0]
        ? localize(`Correct position.\nScroll up to zoom to about ${evidence.zoom[0].toFixed(1)}×.`, `位置正确。\n向上滚轮放大到约 ${evidence.zoom[0].toFixed(1)}×。`)
        : localize(`Correct position.\nZoom out below ${evidence.zoom[1].toFixed(1)}×.`, `位置正确。\n略微缩小到 ${evidence.zoom[1].toFixed(1)}× 以下。`));
      else if (!lightOk) this.emitHint(`${evidence.id}-light`, localize(`Distance is right.\nDrag the lamp toward the ${this.directionName(evidence.lightAngle)} until the detail catches the light.`, `距离合适。\n把工作灯拖向画面${this.directionName(evidence.lightAngle)}，直到细节出现反光。`));
      return;
    }
    if (this.stableEvidence !== evidence.id) {
      this.stableEvidence = evidence.id; this.stableSince = time;
      this.emitHint(`${evidence.id}-ready`, localize(`Conditions match.\nHold still over ${evidence.searchHint} for a moment.`, `条件已对上。\n在${evidence.searchHint}保持不动片刻。`));
      return;
    }
    if (time - this.stableSince >= evidence.holdMs) this.discoverEvidence(evidence);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('wheel', this.onWheel);
    this.scene.input.off('drag', this.onDrag);
    this.scene.input.off('dragend', this.onDragEnd);
    this.scene.game.canvas.style.cursor = 'default';
    this.pointerSession.destroy();
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void => {
    if (gameObjects.includes(this.lamp)) return;
    const face = this.currentFace();
    if (Math.abs(pointer.x - this.relicContainer.x) > face.displayWidth * this.zoom / 2 || Math.abs(pointer.y - this.relicContainer.y) > face.displayHeight * this.zoom / 2) return;
    if (!this.pointerSession.begin(pointer)) return;
    this.artifactDragging = true; this.dragStartX = pointer.x; this.dragAccumulator = 0;
    this.lastPointer.set(pointer.x, pointer.y);
    this.lastDragAt = this.scene.time.now; this.dragVelocityX = 0;
  };

  private finishArtifactDrag(): void {
    if (!this.artifactDragging) return;
    this.artifactDragging = false;
    const shouldFlip = Math.abs(this.dragAccumulator) > 52 || Math.abs(this.dragVelocityX) > 280;
    if (shouldFlip) {
      const direction = (Math.abs(this.dragAccumulator) > 8 ? this.dragAccumulator : this.dragVelocityX) > 0 ? 1 : -1;
      this.scene.tweens.add({
        targets: this.relicContainer,
        scaleX: 0.07,
        angle: direction * 5,
        duration: 125,
        ease: 'Sine.In',
        onComplete: () => {
          this.nextFace(direction);
          this.relicContainer.setScale(0.07, this.zoom).setAngle(-direction * 5);
          this.scene.tweens.add({
            targets: this.relicContainer,
            scaleX: this.zoom,
            angle: 0,
            duration: 155,
            ease: 'Sine.Out',
          });
        },
      });
      return;
    }
    const inertialAngle = Phaser.Math.Clamp(this.dragVelocityX * 0.012, -7, 7);
    this.scene.tweens.add({
      targets: this.relicContainer,
      scaleX: this.zoom,
      scaleY: this.zoom,
      angle: inertialAngle,
      duration: 90,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => this.relicContainer.setAngle(0),
    });
  }

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.artifactDragging || !this.pointerSession.isActive(pointer)) return;
    const now = this.scene.time.now;
    const dt = Math.max(16, now - this.lastDragAt);
    this.dragVelocityX = (pointer.x - this.lastPointer.x) / dt * 1000;
    this.lastPointer.set(pointer.x, pointer.y);
    this.lastDragAt = now;
    this.dragAccumulator = pointer.x - this.dragStartX;
    const squeeze = 1 - Math.min(0.22, Math.abs(this.dragAccumulator) / 620);
    this.relicContainer.setScale(this.zoom * squeeze, this.zoom).setAngle(Phaser.Math.Clamp(this.dragAccumulator / 30, -5, 5));
  };

  private readonly onWheel = (pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number): void => {
    if (pointer.x > 830) return;
    const previousZoom = this.zoom;
    this.zoom = Phaser.Math.Clamp(this.zoom - Math.sign(dy) * 0.1, 0.82, 1.8);
    const ratio = this.zoom / previousZoom;
    this.relicContainer.setPosition(
      Phaser.Math.Clamp(pointer.x - (pointer.x - this.relicContainer.x) * ratio, this.centerX - 90, this.centerX + 90),
      Phaser.Math.Clamp(pointer.y - (pointer.y - this.relicContainer.y) * ratio, this.centerY - 65, this.centerY + 65),
    );
    this.relicContainer.setScale(this.zoom); this.stableEvidence = undefined;
    this.callbacks.onFaceChanged(this.currentFace(), this.zoom, this.lightAngle);
  };

  private readonly onDrag = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number): void => {
    if (gameObject !== this.lamp) return;
    this.lamp.setPosition(Phaser.Math.Clamp(dragX, 210, 805), Phaser.Math.Clamp(dragY, 145, 625));
    this.lightAngle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.centerX, this.centerY, this.lamp.x, this.lamp.y));
    this.drawLight(); this.stableEvidence = undefined;
    this.callbacks.onFaceChanged(this.currentFace(), this.zoom, this.lightAngle);
  };

  private readonly onDragEnd = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject): void => {
    if (gameObject !== this.lamp) return;
    const evidence = this.pendingEvidenceForCurrentFace();
    if (!evidence) {
      this.emitHint(`face-${this.currentFace().id}-empty`, localize("No new clues on this face. Drag the relic or press A / D to turn it.", '这一面没有新的可确认线索。拖动器物或按 A / D 继续翻面。'));
      return;
    }
    const lightOk = Math.abs(Phaser.Math.Angle.WrapDegrees(this.lightAngle - evidence.lightAngle)) <= evidence.lightTolerance;
    this.emitHint(`${evidence.id}-lamp-${lightOk}`, lightOk
      ? localize(`The light angle is right.\nMove the cursor over ${evidence.searchHint} and hold still when the magnifying cursor appears.`, `侧光方向合适。\n把光标移到${evidence.searchHint}，出现放大光标后保持不动。`)
      : localize(`The lamp is fixed, but the angle is wrong.\nAim toward the ${this.directionName(evidence.lightAngle)}.`, `灯位已固定，但反光方向还不对。\n目标在画面${this.directionName(evidence.lightAngle)}。`));
  };

  private currentFace(): RelicFaceDefinition { return this.definition.inspectionFaces[this.faceIndex]; }

  private applyFace(): void {
    const face = this.currentFace();
    this.shadow.setTexture(face.shadowTexture).setDisplaySize(face.displayWidth, face.displayHeight).setPosition(11, 16).setAlpha(0.75);
    this.clean.setTexture(face.cleanTexture).setDisplaySize(face.displayWidth, face.displayHeight);
    this.dirt.setTexture(face.dirtyTexture).setDisplaySize(face.displayWidth, face.displayHeight)
      .setAlpha(Phaser.Math.Clamp((100 - this.loot.cleaningProgress) / 120, 0.04, 0.78));
    this.damage.setTexture(face.damagedTexture).setDisplaySize(face.displayWidth, face.displayHeight)
      .setAlpha(this.loot.cleaningDamage < this.definition.damageThresholds.visible ? 0 : Phaser.Math.Clamp(this.loot.cleaningDamage / 35, 0.18, 0.86));
    this.relicContainer.setScale(this.zoom).setAngle(0);
    this.callbacks.onFaceChanged(face, this.zoom, this.lightAngle);
    const pending = this.pendingEvidenceForCurrentFace();
    this.emitHint(pending ? `face-${face.id}-${pending.id}` : `face-${face.id}-empty`, pending
      ? localize(`Look for: ${pending.searchHint}.\nScroll to adjust distance, then drag the lamp to reveal reflections.`, `本面观察目标：${pending.searchHint}。\n滚轮调整距离，再拖灯寻找侧光反光。`)
      : localize("No new clues on this face. Drag the relic or press A / D to turn it.", '这一面没有新的可确认线索。拖动器物或按 A / D 继续翻面。'));
  }

  private drawLight(): void {
    this.light.clear();
    const radians = Phaser.Math.DegToRad(this.lightAngle);
    const highlightX = this.centerX + Math.cos(radians) * 62; const highlightY = this.centerY + Math.sin(radians) * 54;
    this.light.fillStyle(0xf1c982, 0.025).fillCircle(highlightX, highlightY, 230);
    this.light.fillStyle(0xf5d9a0, 0.035).fillCircle(highlightX, highlightY, 155);
    this.light.fillStyle(0xffe9b5, 0.045).fillCircle(highlightX, highlightY, 82);
  }

  private discoverEvidence(evidence: EvidenceRegionDefinition): void {
    if (!this.loot.evidenceIds.includes(evidence.id)) this.loot.evidenceIds.push(evidence.id);
    this.stableEvidence = undefined;
    this.audio?.playSfx('choice-confirm');
    this.callbacks.onEvidence(evidence);
    const glint = this.scene.add.text(this.centerX, this.centerY - 80, '✦', { fontSize: '24px', color: '#e8c886' }).setOrigin(0.5).setDepth(94);
    this.layer.add(glint);
    this.scene.tweens.add({ targets: glint, alpha: 0, y: glint.y - 20, scale: 1.5, duration: 620, onComplete: () => glint.destroy() });
  }

  private pendingEvidenceForCurrentFace(): EvidenceRegionDefinition | undefined {
    return this.definition.evidenceRegions.find((evidence) => evidence.face === this.currentFace().id && !this.loot.evidenceIds.includes(evidence.id));
  }

  private emitHint(key: string, text: string): void {
    if (this.lastHintKey === key) return;
    this.lastHintKey = key; this.callbacks.onHint(text);
  }

  private directionName(angle: number): string {
    const normalized = Phaser.Math.Angle.WrapDegrees(angle);
    if (normalized >= -67.5 && normalized < -22.5) return localize("upper right", '右上方');
    if (normalized >= -22.5 && normalized < 22.5) return localize("right", '右侧');
    if (normalized >= 22.5 && normalized < 67.5) return localize("lower right", '右下方');
    if (normalized >= 67.5 && normalized < 112.5) return localize("bottom", '下方');
    if (normalized >= 112.5 && normalized < 157.5) return localize("lower left", '左下方');
    if (normalized >= 157.5 || normalized < -157.5) return localize("left", '左侧');
    if (normalized >= -157.5 && normalized < -112.5) return localize("upper left", '左上方');
    return localize("top", '上方');
  }
}
