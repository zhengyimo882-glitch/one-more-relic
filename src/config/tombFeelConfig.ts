export type FootstepPresentationMode = 'visual' | 'audio' | 'both';

export interface TombFeelConfig {
  readonly movement: {
    readonly speed: number;
    readonly acceleration: number;
    readonly deceleration: number;
  };
  readonly camera: {
    readonly followLerpX: number;
    readonly followLerpY: number;
    readonly deadzoneWidth: number;
    readonly deadzoneHeight: number;
  };
  readonly interaction: {
    readonly radiusMultiplier: number;
    readonly rearToleranceDot: number;
    readonly rearPenalty: number;
    readonly highlightPulseMs: number;
    readonly safetyRevealRadius: number;
  };
  readonly player: {
    readonly spriteScale: number;
    readonly animationFrameRate: number;
    readonly movementAnimationSpeedMultiplier: number;
    readonly flashlightMountOffsetX: number;
    readonly flashlightMountOffsetY: number;
    readonly flashlightForwardOffset: number;
    readonly carriedArtifactMountOffsetX: number;
    readonly carriedArtifactMountOffsetY: number;
    readonly idleBreathingAmplitude: number;
    readonly pickupFeedbackMs: number;
    readonly placeFeedbackMs: number;
  };
  readonly footsteps: {
    readonly presentation: FootstepPresentationMode;
    readonly sampleIntervalMs: number;
    readonly historyDurationMs: number;
    readonly playerStepIntervalMs: number;
    readonly delayedStepIntervalMs: number;
    readonly delayedPathMs: number;
    readonly followerStepIntervalMs: number;
    readonly manifestingStepIntervalMs: number;
  };
  readonly ripples: {
    readonly echoColor: number;
    readonly echoInitialRadius: number;
    readonly echoMaximumRadius: number;
    readonly echoDurationMs: number;
    readonly echoLineWidth: number;
    readonly echoLayerCount: number;
    readonly followerColor: number;
    readonly followerInitialRadius: number;
    readonly followerMaximumRadius: number;
    readonly followerDurationMs: number;
    readonly followerLineWidth: number;
    readonly followerLayerCount: number;
    readonly concentricDelayMs: number;
    readonly maximumActiveFootsteps: number;
    readonly maximumActiveRings: number;
    readonly minimumDarknessAlpha: number;
    readonly beamAlphaMultiplier: number;
    readonly provokedSizeMultiplier: number;
    readonly provokedSpeedMultiplier: number;
    readonly provokedDurationMultiplier: number;
    readonly provokedFrequencyMultiplier: number;
    readonly debugVisibleByDefault: boolean;
  };
  readonly lamp: {
    readonly toggleKey: string;
    readonly centerBrightness: number;
    readonly effectiveDistance: number;
    readonly coneHalfAngle: number;
    readonly edgeFeatherWidthRadians: number;
    readonly edgeFeatherDistance: number;
    readonly outsideDarknessAlpha: number;
    readonly safetyLightRadius: number;
    readonly safetyLightBrightness: number;
    readonly directionSmoothingRadiansPerSecond: number;
    readonly turnOnTransitionMs: number;
    readonly turnOffTransitionMs: number;
    readonly lampOffMinimumEnvironmentBrightness: number;
    readonly occlusionRayCount: number;
    readonly occlusionHitPadding: number;
    readonly debugVisibleByDefault: boolean;
  };
  readonly ghost: {
    readonly baseAlpha: number;
    readonly provokedAlpha: number;
    readonly manifestationDurationMs: number;
    readonly lampOffResidualMs: number;
    readonly driftAmplitude: number;
    readonly afterimageCount: number;
    readonly edgeJitterAmplitude: number;
    readonly normalAdvancePerSecond: number;
    readonly provokedAdvancePerSecond: number;
    readonly dissipateDurationMs: number;
    readonly spriteScale: number;
    readonly wallShadowScaleX: number;
    readonly wallShadowScaleY: number;
    readonly frameRate: number;
    readonly followDistance: number;
    readonly followSpeed: number;
    readonly provokedFollowSpeed: number;
  };
  readonly feedback: {
    readonly lightShake: number;
    readonly rejectShake: number;
    readonly manifestationShake: number;
    readonly pickupTweenMs: number;
    readonly placeTweenMs: number;
    readonly appeaseTweenMs: number;
  };
  readonly encounter: {
    readonly followDistance: number;
    readonly manifestingCorridorY: number;
  };
}

export const TOMB_FEEL: TombFeelConfig = {
  movement: {
    speed: 188,
    acceleration: 2800,
    deceleration: 3600,
  },
  camera: {
    followLerpX: 0.095,
    followLerpY: 0.095,
    deadzoneWidth: 84,
    deadzoneHeight: 46,
  },
  interaction: {
    radiusMultiplier: 1.12,
    rearToleranceDot: -0.72,
    rearPenalty: 24,
    highlightPulseMs: 760,
    safetyRevealRadius: 74,
  },
  player: {
    spriteScale: 0.43,
    animationFrameRate: 6.5,
    movementAnimationSpeedMultiplier: 1.15,
    flashlightMountOffsetX: 0,
    flashlightMountOffsetY: -18,
    flashlightForwardOffset: 14,
    carriedArtifactMountOffsetX: 0,
    carriedArtifactMountOffsetY: -12,
    idleBreathingAmplitude: 0.9,
    pickupFeedbackMs: 170,
    placeFeedbackMs: 190,
  },
  footsteps: {
    presentation: 'visual',
    sampleIntervalMs: 90,
    historyDurationMs: 7600,
    playerStepIntervalMs: 410,
    delayedStepIntervalMs: 470,
    delayedPathMs: 1750,
    followerStepIntervalMs: 720,
    manifestingStepIntervalMs: 520,
  },
  ripples: {
    echoColor: 0x607c78,
    echoInitialRadius: 5,
    echoMaximumRadius: 39,
    echoDurationMs: 720,
    echoLineWidth: 1.7,
    echoLayerCount: 3,
    followerColor: 0x68453d,
    followerInitialRadius: 8,
    followerMaximumRadius: 62,
    followerDurationMs: 880,
    followerLineWidth: 2.25,
    followerLayerCount: 4,
    concentricDelayMs: 82,
    maximumActiveFootsteps: 18,
    maximumActiveRings: 72,
    minimumDarknessAlpha: 0.13,
    beamAlphaMultiplier: 1.45,
    provokedSizeMultiplier: 1.28,
    provokedSpeedMultiplier: 1.16,
    provokedDurationMultiplier: 1.18,
    provokedFrequencyMultiplier: 1.33,
    debugVisibleByDefault: false,
  },
  lamp: {
    toggleKey: 'F',
    centerBrightness: 1.08,
    effectiveDistance: 390,
    coneHalfAngle: 0.52,
    edgeFeatherWidthRadians: 0.16,
    edgeFeatherDistance: 64,
    outsideDarknessAlpha: 0.988,
    safetyLightRadius: 54,
    safetyLightBrightness: 0.2,
    directionSmoothingRadiansPerSecond: 10.5,
    turnOnTransitionMs: 190,
    turnOffTransitionMs: 150,
    lampOffMinimumEnvironmentBrightness: 0.008,
    occlusionRayCount: 55,
    occlusionHitPadding: 5,
    debugVisibleByDefault: false,
  },
  ghost: {
    baseAlpha: 0.66,
    provokedAlpha: 0.86,
    manifestationDurationMs: 360,
    lampOffResidualMs: 190,
    driftAmplitude: 4.5,
    afterimageCount: 2,
    edgeJitterAmplitude: 1.4,
    normalAdvancePerSecond: 0.065,
    provokedAdvancePerSecond: 0.15,
    dissipateDurationMs: 620,
    spriteScale: 0.36,
    wallShadowScaleX: 0.45,
    wallShadowScaleY: 0.3,
    frameRate: 4.5,
    followDistance: 92,
    followSpeed: 78,
    provokedFollowSpeed: 112,
  },
  feedback: {
    lightShake: 0.00105,
    rejectShake: 0.0018,
    manifestationShake: 0.00135,
    pickupTweenMs: 170,
    placeTweenMs: 190,
    appeaseTweenMs: 520,
  },
  encounter: {
    followDistance: 150,
    manifestingCorridorY: 714,
  },
};
