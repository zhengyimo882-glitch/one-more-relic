import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { TombEncounterState } from './TombEncounterSystem';

export type WallShadowDebugInfo = Readonly<{
  state: TombEncounterState;
  advance: number;
  visibleAlpha: number;
  lightOn: boolean;
  inBeam: boolean;
  worldX: number;
  worldY: number;
}>;

export class WallShadowSystem {
  private readonly wallShadow: Phaser.GameObjects.Sprite;
  private readonly ghost: Phaser.GameObjects.Sprite;
  private readonly afterimages: Phaser.GameObjects.Sprite[] = [];
  private state: TombEncounterState = 'Dormant';
  private lightOn = true;
  private inBeam = false;
  private advance = 0;
  private animationElapsed = 0;
  private readonly ghostPosition = new Phaser.Math.Vector2();
  private residualTween?: Phaser.Tweens.Tween;
  private dissipateTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly anchorX: number,
    private readonly anchorY: number,
  ) {
    this.ghostPosition.set(anchorX - 44, anchorY + 10);
    this.wallShadow = scene.add
      .sprite(anchorX, anchorY, 'generated-wall-shadow', 0)
      .setOrigin(0.5, 0.69)
      .setScale(
        TOMB_FEEL.ghost.wallShadowScaleX,
        TOMB_FEEL.ghost.wallShadowScaleY,
      )
      .setRotation(-0.14)
      .setTint(0x82928f)
      .setAlpha(0)
      .setDepth(7.16)
      .setVisible(false);

    this.ghost = scene.add
      .sprite(anchorX - 44, anchorY + 10, 'generated-tomb-ghost', 0)
      .setOrigin(0.5, 0.72)
      .setScale(TOMB_FEEL.ghost.spriteScale)
      .setTint(0xaeb9b6)
      .setAlpha(0)
      .setDepth(7.18)
      .setVisible(false);

    for (let index = 0; index < TOMB_FEEL.ghost.afterimageCount; index += 1) {
      this.afterimages.push(
        scene.add
          .sprite(anchorX, anchorY, 'generated-tomb-ghost', index + 1)
          .setOrigin(0.5, 0.72)
          .setScale(TOMB_FEEL.ghost.spriteScale * (1 + index * 0.012))
          .setTint(index === 0 ? 0x526965 : 0x705a55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setDepth(7.17 - index * 0.005)
          .setVisible(false),
      );
    }
  }

  setState(state: TombEncounterState): void {
    if (state === this.state) {
      return;
    }
    this.state = state;
    this.stopVisualTweens();

    if (state === 'Manifesting' || state === 'Provoked') {
      this.restoreVisualScales();
      this.showVisuals();
      this.wallShadow.setAlpha(0);
      this.ghost.setAlpha(0);
      this.afterimages.forEach((afterimage) => afterimage.setAlpha(0));
      this.scene.tweens.add({
        targets: this.wallShadow,
        alpha: state === 'Provoked' ? 0.46 : 0.34,
        duration: state === 'Provoked'
          ? 120
          : TOMB_FEEL.ghost.manifestationDurationMs,
        ease: 'Sine.Out',
      });
      return;
    }

    if (state === 'Appeased') {
      this.dissipate();
      return;
    }

    this.hideVisuals();
  }

  setLightOn(lightOn: boolean): void {
    if (this.lightOn === lightOn) {
      return;
    }
    this.lightOn = lightOn;
    this.residualTween?.stop();
    if (lightOn) {
      if (this.isActiveState()) {
        this.showVisuals();
      }
      return;
    }
    if (!this.isActiveState()) {
      return;
    }
    const residualTargets = [this.wallShadow, this.ghost, ...this.afterimages];
    this.residualTween = this.scene.tweens.add({
      targets: residualTargets,
      alpha: 0,
      duration: TOMB_FEEL.ghost.lampOffResidualMs,
      ease: 'Sine.In',
      onComplete: () => residualTargets.forEach((target) => target.setVisible(false)),
    });
  }

  getAdvance(): number {
    return this.advance;
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.ghost.x, this.ghost.y);
  }

  getDebugInfo(): WallShadowDebugInfo {
    return {
      state: this.state,
      advance: this.advance,
      visibleAlpha: this.ghost.alpha,
      lightOn: this.lightOn,
      inBeam: this.inBeam,
      worldX: this.ghost.x,
      worldY: this.ghost.y,
    };
  }

  update(
    deltaSeconds: number,
    inBeam: boolean,
    playerX: number,
    playerY: number,
  ): void {
    this.inBeam = inBeam;
    if (!this.isActiveState()) {
      return;
    }

    if (this.lightOn) {
      const speed = this.state === 'Provoked'
        ? TOMB_FEEL.ghost.provokedAdvancePerSecond
        : TOMB_FEEL.ghost.normalAdvancePerSecond;
      this.advance = Phaser.Math.Clamp(this.advance + speed * deltaSeconds, 0, 1);
    }

    this.animationElapsed += deltaSeconds;
    const frame = Math.floor(
      this.animationElapsed * TOMB_FEEL.ghost.frameRate,
    ) % 4;
    this.wallShadow.setFrame((frame + 1) % 4);
    this.ghost.setFrame(frame);

    const time = this.scene.time.now;
    const drift = Math.sin(time / 760) * TOMB_FEEL.ghost.driftAmplitude;
    const edgeJitter = Math.sin(time / 173) * TOMB_FEEL.ghost.edgeJitterAmplitude;
    const worldX = this.anchorX - this.advance * 54;
    const worldY = this.anchorY + this.advance * 98;
    this.wallShadow
      .setPosition(worldX + edgeJitter, worldY + drift * 0.25)
      .setScale(
        TOMB_FEEL.ghost.wallShadowScaleX + this.advance * 0.13,
        TOMB_FEEL.ghost.wallShadowScaleY + this.advance * 0.09,
      )
      .setRotation(-0.14 - this.advance * 0.07 + Math.sin(time / 1100) * 0.012);
    const toPlayer = new Phaser.Math.Vector2(
      playerX - this.ghostPosition.x,
      playerY - this.ghostPosition.y,
    );
    const distanceToPlayer = toPlayer.length();
    if (distanceToPlayer > TOMB_FEEL.ghost.followDistance) {
      const followSpeed = this.state === 'Provoked'
        ? TOMB_FEEL.ghost.provokedFollowSpeed
        : TOMB_FEEL.ghost.followSpeed;
      const travel = Math.min(
        distanceToPlayer - TOMB_FEEL.ghost.followDistance,
        followSpeed * deltaSeconds,
      );
      this.ghostPosition.add(toPlayer.scale(travel / distanceToPlayer));
    }
    this.ghost.setPosition(
      this.ghostPosition.x + edgeJitter * 0.35,
      this.ghostPosition.y + drift,
    );

    const manifestation = Phaser.Math.SmoothStep(this.advance, 0.08, 0.42);
    const baseAlpha = this.state === 'Provoked'
      ? TOMB_FEEL.ghost.provokedAlpha
      : TOMB_FEEL.ghost.baseAlpha;
    const beamFactor = inBeam ? 1 : 0.045;
    const targetGhostAlpha = this.lightOn
      ? baseAlpha * manifestation * beamFactor
      : 0;
    const targetShadowAlpha = this.lightOn
      ? (this.state === 'Provoked' ? 0.52 : 0.38) * (inBeam ? 1 : 0.08)
      : 0;
    const blend = Phaser.Math.Clamp(deltaSeconds * 8, 0, 1);
    this.ghost.setAlpha(Phaser.Math.Linear(this.ghost.alpha, targetGhostAlpha, blend));
    this.wallShadow.setAlpha(
      Phaser.Math.Linear(this.wallShadow.alpha, targetShadowAlpha, blend),
    );

    this.afterimages.forEach((afterimage, index) => {
      const offset = (index + 1) * (this.state === 'Provoked' ? 5.5 : 3.2);
      afterimage
        .setFrame((frame + 3 - index) % 4)
        .setPosition(
          this.ghost.x + Math.sin(time / (205 + index * 43)) * offset,
          this.ghost.y + 2 + index * 3,
        )
        .setAlpha(
          this.ghost.alpha *
            (this.state === 'Provoked' ? 0.2 - index * 0.045 : 0.1 - index * 0.025),
        );
    });
  }

  reset(): void {
    this.stopVisualTweens();
    this.state = 'Dormant';
    this.lightOn = true;
    this.inBeam = false;
    this.advance = 0;
    this.animationElapsed = 0;
    this.wallShadow
      .setPosition(this.anchorX, this.anchorY)
      .setScale(
        TOMB_FEEL.ghost.wallShadowScaleX,
        TOMB_FEEL.ghost.wallShadowScaleY,
      )
      .setRotation(-0.14)
      .setFrame(0);
    this.ghost
      .setPosition(this.anchorX - 44, this.anchorY + 10)
      .setScale(TOMB_FEEL.ghost.spriteScale)
      .setFrame(0);
    this.ghostPosition.set(this.anchorX - 44, this.anchorY + 10);
    this.hideVisuals();
  }

  destroy(): void {
    this.stopVisualTweens();
    this.scene.tweens.killTweensOf([
      this.wallShadow,
      this.ghost,
      ...this.afterimages,
    ]);
    this.wallShadow.destroy();
    this.ghost.destroy();
    this.afterimages.forEach((afterimage) => afterimage.destroy());
    this.afterimages.length = 0;
  }

  private isActiveState(): boolean {
    return this.state === 'Manifesting' || this.state === 'Provoked';
  }

  private showVisuals(): void {
    this.wallShadow.setVisible(true);
    this.ghost.setVisible(true);
    this.afterimages.forEach((afterimage) => afterimage.setVisible(true));
  }

  private restoreVisualScales(): void {
    this.wallShadow.setScale(
      TOMB_FEEL.ghost.wallShadowScaleX + this.advance * 0.13,
      TOMB_FEEL.ghost.wallShadowScaleY + this.advance * 0.09,
    );
    this.ghost.setScale(TOMB_FEEL.ghost.spriteScale);
    this.afterimages.forEach((afterimage, index) =>
      afterimage.setScale(TOMB_FEEL.ghost.spriteScale * (1 + index * 0.012)),
    );
  }

  private hideVisuals(): void {
    this.wallShadow.setAlpha(0).setVisible(false);
    this.ghost.setAlpha(0).setVisible(false);
    this.afterimages.forEach((afterimage) => afterimage.setAlpha(0).setVisible(false));
  }

  private dissipate(): void {
    const targets = [this.wallShadow, this.ghost, ...this.afterimages];
    targets.forEach((target) => target.setVisible(true));
    this.dissipateTween = this.scene.tweens.add({
      targets,
      alpha: 0,
      y: '-=18',
      scaleY: '*=0.74',
      angle: '+=3',
      duration: TOMB_FEEL.ghost.dissipateDurationMs,
      ease: 'Sine.In',
      stagger: 54,
      onUpdate: () => {
        const frame = Math.floor(this.scene.time.now / 58) % 4;
        this.ghost.setFrame(frame);
        this.afterimages.forEach((afterimage, index) =>
          afterimage.setFrame((frame + index + 1) % 4),
        );
      },
      onComplete: () => this.hideVisuals(),
    });
  }

  private stopVisualTweens(): void {
    this.residualTween?.stop();
    this.dissipateTween?.stop();
    this.residualTween = undefined;
    this.dissipateTween = undefined;
    this.scene.tweens.killTweensOf([
      this.wallShadow,
      this.ghost,
      ...this.afterimages,
    ]);
  }
}
