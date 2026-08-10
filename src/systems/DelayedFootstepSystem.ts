import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';
import type { TombEncounterState } from './TombEncounterSystem';

export type FootstepEmission = {
  kind: 'player' | 'echo' | 'follower';
  x: number;
  y: number;
  provoked: boolean;
};

export type FootstepPathSample = {
  time: number;
  x: number;
  y: number;
  moving: boolean;
  directionX: number;
  directionY: number;
};

export class DelayedFootstepSystem {
  private samples: FootstepPathSample[] = [];
  private sampleAccumulator = 0;
  private playerStepAccumulator = 0;
  private echoStepAccumulator = 0;
  private followerStepAccumulator = 0;
  private followerStopGrace = 0;
  private lastMovementDirectionX = 0;
  private lastMovementDirectionY = 1;
  private echoFootSide = -1;
  private followerFootSide = 1;

  constructor(
    private readonly emitStep: (emission: FootstepEmission) => void,
  ) {}

  update(
    time: number,
    deltaMs: number,
    playerX: number,
    playerY: number,
    velocityX: number,
    velocityY: number,
    encounterState: TombEncounterState,
  ): void {
    const moving = Math.hypot(velocityX, velocityY) > 24;
    if (moving) {
      const velocityLength = Math.hypot(velocityX, velocityY);
      this.lastMovementDirectionX = velocityX / velocityLength;
      this.lastMovementDirectionY = velocityY / velocityLength;
    }
    this.sampleAccumulator += deltaMs;
    while (this.sampleAccumulator >= TOMB_FEEL.footsteps.sampleIntervalMs) {
      this.sampleAccumulator -= TOMB_FEEL.footsteps.sampleIntervalMs;
      this.samples.push({
        time,
        x: playerX,
        y: playerY,
        moving,
        directionX: this.lastMovementDirectionX,
        directionY: this.lastMovementDirectionY,
      });
    }
    const oldestAllowed = time - TOMB_FEEL.footsteps.historyDurationMs;
    while (this.samples.length > 0 && this.samples[0].time < oldestAllowed) {
      this.samples.shift();
    }

    if (moving) {
      this.playerStepAccumulator += deltaMs;
      if (this.playerStepAccumulator >= TOMB_FEEL.footsteps.playerStepIntervalMs) {
        this.playerStepAccumulator = 0;
        this.emitStep({ kind: 'player', x: playerX, y: playerY, provoked: false });
      }
    } else {
      this.playerStepAccumulator = TOMB_FEEL.footsteps.playerStepIntervalMs * 0.6;
    }

    if (encounterState !== 'Dormant' && encounterState !== 'Appeased') {
      this.updateEcho(time, deltaMs);
    }
    if (
      encounterState === 'Following' ||
      encounterState === 'Manifesting' ||
      encounterState === 'Provoked'
    ) {
      this.updateFollower(deltaMs, playerX, playerY, velocityX, velocityY, moving, encounterState);
    } else {
      this.followerStepAccumulator = 0;
      this.followerStopGrace = 0;
    }
  }

  getSamples(): readonly FootstepPathSample[] {
    return this.samples;
  }

  reset(): void {
    this.samples = [];
    this.sampleAccumulator = 0;
    this.playerStepAccumulator = 0;
    this.echoStepAccumulator = 0;
    this.followerStepAccumulator = 0;
    this.followerStopGrace = 0;
    this.lastMovementDirectionX = 0;
    this.lastMovementDirectionY = 1;
    this.echoFootSide = -1;
    this.followerFootSide = 1;
  }

  private updateEcho(time: number, deltaMs: number): void {
    const delayedSample = this.findSampleAt(
      time - TOMB_FEEL.footsteps.delayedPathMs,
    );
    if (!delayedSample?.moving) {
      return;
    }
    this.echoStepAccumulator += deltaMs;
    if (this.echoStepAccumulator >= TOMB_FEEL.footsteps.delayedStepIntervalMs) {
      this.echoStepAccumulator = 0;
      const lateralX = -delayedSample.directionY * this.echoFootSide * 4;
      const lateralY = delayedSample.directionX * this.echoFootSide * 4;
      this.echoFootSide *= -1;
      this.emitStep({
        kind: 'echo',
        x: delayedSample.x + lateralX,
        y: delayedSample.y + lateralY,
        provoked: false,
      });
    }
  }

  private updateFollower(
    deltaMs: number,
    playerX: number,
    playerY: number,
    velocityX: number,
    velocityY: number,
    moving: boolean,
    state: TombEncounterState,
  ): void {
    const interval = state === 'Provoked'
      ? TOMB_FEEL.footsteps.manifestingStepIntervalMs /
        TOMB_FEEL.ripples.provokedFrequencyMultiplier
      : state === 'Manifesting'
        ? TOMB_FEEL.footsteps.manifestingStepIntervalMs
        : TOMB_FEEL.footsteps.followerStepIntervalMs;
    if (moving) {
      this.followerStopGrace = 1;
    } else if (this.followerStopGrace <= 0) {
      return;
    }
    this.followerStepAccumulator += deltaMs;
    if (this.followerStepAccumulator < interval) {
      return;
    }
    this.followerStepAccumulator = 0;
    if (!moving) {
      this.followerStopGrace -= 1;
    }

    const backwardX = -this.lastMovementDirectionX;
    const backwardY = -this.lastMovementDirectionY;
    const sideX = -backwardY;
    const sideY = backwardX;
    const distance = state === 'Provoked' ? 74 : state === 'Manifesting' ? 96 : 132;
    const footOffset = this.followerFootSide * 6;
    this.followerFootSide *= -1;
    this.emitStep({
      kind: 'follower',
      x: playerX + backwardX * distance + sideX * (48 + footOffset),
      y: playerY + backwardY * distance + sideY * (48 + footOffset),
      provoked: state === 'Provoked',
    });
  }

  private findSampleAt(targetTime: number): FootstepPathSample | undefined {
    for (let index = this.samples.length - 1; index >= 0; index -= 1) {
      if (this.samples[index].time <= targetTime) {
        return this.samples[index];
      }
    }
    return undefined;
  }
}
