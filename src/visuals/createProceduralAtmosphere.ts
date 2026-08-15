import Phaser from 'phaser';
import { VISUAL_THEME, type VisualSceneStyle } from './visualTheme';

export interface ProceduralAtmosphereConfig {
  style: VisualSceneStyle;
  worldWidth: number;
  worldHeight: number;
  lightAnchors?: readonly Phaser.Math.Vector2[];
  playerLightEnabled?: boolean;
}

export interface ProceduralAtmosphere {
  update(focusX: number, focusY: number, time: number): void;
  destroy(): void;
}

export function createProceduralAtmosphere(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): ProceduralAtmosphere {
  const ownedObjects: Phaser.GameObjects.GameObject[] = [];
  const ownedTweens: Phaser.Tweens.Tween[] = [];
  let destroyed = false;

  const texture = createSurfaceTexture(scene, config);
  ownedObjects.push(texture);

  const parallax = createParallaxLayer(scene, config);
  ownedObjects.push(parallax);

  const lightLayer = createLightLayer(scene, config);
  ownedObjects.push(lightLayer);

  const dust = createDust(scene, config, ownedTweens);
  ownedObjects.push(dust);

  if (config.style === 'tomb') {
    const fog = createLowFog(scene, config, ownedTweens);
    const foreground = createTombForeground(scene, config);
    ownedObjects.push(fog, foreground);
  } else {
    const foreground = createShopForeground(scene, config);
    ownedObjects.push(foreground);
  }

  const vignette = createVignette(scene);
  ownedObjects.push(vignette);

  const transition = createInkTransition(scene, ownedTweens);
  ownedObjects.push(transition);

  const controller: ProceduralAtmosphere = {
    update(focusX: number, focusY: number, time: number): void {
      if (destroyed) {
        return;
      }

      const horizontalRatio = Phaser.Math.Clamp(
        focusX / config.worldWidth - 0.5,
        -0.5,
        0.5,
      );
      const verticalRatio = Phaser.Math.Clamp(
        focusY / config.worldHeight - 0.5,
        -0.5,
        0.5,
      );
      parallax.setPosition(-horizontalRatio * 7, -verticalRatio * 4);

      if (config.style === 'tomb') {
        const flicker =
          1 + Math.sin(time / 173) * 0.018 + Math.sin(time / 71) * 0.008;
        if (config.playerLightEnabled !== false) {
          lightLayer
            .setPosition(focusX, focusY)
            .setScale(flicker, 1 / flicker)
            .setAlpha(0.88 + Math.sin(time / 137) * 0.035);
        }
      } else {
        lightLayer.setPosition(
          horizontalRatio * 4,
          Math.sin(time / 1100) * 1.5,
        );
        lightLayer.setAlpha(0.9 + Math.sin(time / 210) * 0.025);
      }
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      ownedTweens.forEach((tween) => tween.remove());
      ownedObjects.forEach((object) => {
        if (object.scene) {
          object.destroy();
        }
      });
    },
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, controller.destroy);
  return controller;
}

function createSurfaceTexture(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add
    .graphics()
    .setDepth(VISUAL_THEME.depth.backgroundTexture);
  const baseColor =
    config.style === 'tomb'
      ? VISUAL_THEME.colors.tombBlue
      : VISUAL_THEME.colors.darkWood;
  graphics.fillStyle(baseColor, config.style === 'tomb' ? 0.22 : 0.18);
  graphics.fillRect(0, 0, config.worldWidth, config.worldHeight);

  const seed = config.style === 'tomb' ? 37 : 19;
  for (let index = 0; index < 150; index += 1) {
    const x = pseudoRandom(index * 3 + seed) * config.worldWidth;
    const y = pseudoRandom(index * 5 + seed + 11) * config.worldHeight;
    const size = 1 + Math.floor(pseudoRandom(index * 7 + seed) * 3);
    graphics.fillStyle(
      index % 4 === 0
        ? VISUAL_THEME.colors.oldPaper
        : VISUAL_THEME.colors.inkBlack,
      index % 4 === 0 ? 0.035 : 0.055,
    );
    graphics.fillRect(x, y, size * 2.5, size);
  }
  return graphics;
}

function createParallaxLayer(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics().setDepth(VISUAL_THEME.depth.background);
  const lineColor =
    config.style === 'tomb'
      ? VISUAL_THEME.colors.corpseGreen
      : VISUAL_THEME.colors.antiqueGold;
  graphics.lineStyle(1, lineColor, 0.09);
  for (let x = 48; x < config.worldWidth; x += 96) {
    graphics.lineBetween(x, 0, x - 20, config.worldHeight);
  }
  return graphics;
}

function createLightLayer(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics().setDepth(VISUAL_THEME.depth.floorLight);
  graphics.setBlendMode(Phaser.BlendModes.ADD);
  if (config.style === 'tomb') {
    if (config.playerLightEnabled === false) {
      graphics.setVisible(false);
      return graphics;
    }
    graphics.fillStyle(VISUAL_THEME.colors.lanternOrange, 0.095);
    graphics.fillEllipse(0, 10, 340, 280);
    graphics.fillStyle(VISUAL_THEME.colors.oldPaper, 0.045);
    graphics.fillEllipse(0, 0, 210, 180);
  } else {
    const anchors =
      config.lightAnchors ??
      [
        new Phaser.Math.Vector2(390, 360),
        new Phaser.Math.Vector2(890, 360),
      ];
    anchors.forEach((anchor) => {
      graphics.fillStyle(VISUAL_THEME.colors.lanternOrange, 0.075);
      graphics.fillEllipse(anchor.x, anchor.y, 330, 300);
      graphics.fillStyle(VISUAL_THEME.colors.antiqueGold, 0.04);
      graphics.fillEllipse(anchor.x, anchor.y - 35, 190, 210);
    });
  }
  return graphics;
}

function createDust(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
  tweens: Phaser.Tweens.Tween[],
): Phaser.GameObjects.Container {
  const particles: Phaser.GameObjects.Arc[] = [];
  const count = config.style === 'tomb' ? 24 : 18;
  for (let index = 0; index < count; index += 1) {
    const particle = scene.add.circle(
      pseudoRandom(index * 13 + 3) * config.worldWidth,
      pseudoRandom(index * 17 + 9) * config.worldHeight,
      index % 5 === 0 ? 1.6 : 1,
      config.style === 'tomb'
        ? VISUAL_THEME.colors.mutedPaper
        : VISUAL_THEME.colors.oldPaper,
      0.08 + pseudoRandom(index * 23) * 0.1,
    );
    particles.push(particle);
    tweens.push(
      scene.tweens.add({
        targets: particle,
        x: particle.x + 18 + (index % 4) * 7,
        y: particle.y - 28 - (index % 5) * 9,
        alpha: { from: particle.alpha * 0.45, to: particle.alpha },
        duration: 5200 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      }),
    );
  }
  return scene.add
    .container(0, 0, particles)
    .setDepth(VISUAL_THEME.depth.worldDust);
}

function createLowFog(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
  tweens: Phaser.Tweens.Tween[],
): Phaser.GameObjects.Container {
  const fogBanks: Phaser.GameObjects.Ellipse[] = [];
  for (let index = 0; index < 6; index += 1) {
    const fog = scene.add.ellipse(
      180 + index * 260,
      config.worldHeight - 145 + (index % 2) * 38,
      390,
      82,
      VISUAL_THEME.colors.tombBlue,
      0.055,
    );
    fogBanks.push(fog);
    tweens.push(
      scene.tweens.add({
        targets: fog,
        x: fog.x + (index % 2 === 0 ? 42 : -42),
        alpha: { from: 0.025, to: 0.075 },
        duration: 6200 + index * 410,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      }),
    );
  }
  return scene.add
    .container(0, 0, fogBanks)
    .setDepth(VISUAL_THEME.depth.worldDust - 0.2);
}

function createTombForeground(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics().setDepth(VISUAL_THEME.depth.foreground);
  graphics.fillStyle(VISUAL_THEME.colors.inkBlack, 0.72);
  graphics.fillTriangle(
    0,
    config.worldHeight,
    0,
    config.worldHeight - 170,
    170,
    config.worldHeight,
  );
  graphics.fillTriangle(
    config.worldWidth,
    config.worldHeight,
    config.worldWidth,
    config.worldHeight - 185,
    config.worldWidth - 185,
    config.worldHeight,
  );
  graphics.lineStyle(3, VISUAL_THEME.colors.cinnabar, 0.2);
  graphics.lineBetween(44, config.worldHeight - 104, 115, config.worldHeight - 38);
  return graphics;
}

function createShopForeground(
  scene: Phaser.Scene,
  config: ProceduralAtmosphereConfig,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics().setDepth(VISUAL_THEME.depth.foreground);
  graphics.fillStyle(VISUAL_THEME.colors.inkBlack, 0.38);
  graphics.fillRect(0, 0, 34, config.worldHeight);
  graphics.fillRect(config.worldWidth - 34, 0, 34, config.worldHeight);
  graphics.fillStyle(VISUAL_THEME.colors.darkWood, 0.5);
  graphics.fillTriangle(0, 0, 150, 0, 0, 105);
  graphics.fillTriangle(
    config.worldWidth,
    0,
    config.worldWidth - 150,
    0,
    config.worldWidth,
    105,
  );
  return graphics;
}

function createVignette(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const graphics = scene.add
    .graphics()
    .setScrollFactor(0)
    .setDepth(VISUAL_THEME.depth.vignette);
  const bands = [
    { inset: 0, alpha: 0.13, size: 30 },
    { inset: 28, alpha: 0.065, size: 24 },
    { inset: 52, alpha: 0.03, size: 18 },
  ];
  bands.forEach(({ inset, alpha, size }) => {
    graphics.fillStyle(VISUAL_THEME.colors.inkBlack, alpha);
    graphics.fillRect(inset, inset, width - inset * 2, size);
    graphics.fillRect(inset, height - inset - size, width - inset * 2, size);
    graphics.fillRect(inset, inset, size, height - inset * 2);
    graphics.fillRect(width - inset - size, inset, size, height - inset * 2);
  });
  return graphics;
}

function createInkTransition(
  scene: Phaser.Scene,
  tweens: Phaser.Tweens.Tween[],
): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const ink = scene.add
    .graphics()
    .setScrollFactor(0)
    .setDepth(VISUAL_THEME.depth.transition);
  ink.fillStyle(VISUAL_THEME.colors.inkBlack, 1);
  ink.fillPoints([
    new Phaser.Geom.Point(0, 0),
    new Phaser.Geom.Point(width, 0),
    new Phaser.Geom.Point(width, height * 0.7),
    new Phaser.Geom.Point(width * 0.88, height * 0.76),
    new Phaser.Geom.Point(width * 0.72, height * 0.69),
    new Phaser.Geom.Point(width * 0.56, height * 0.8),
    new Phaser.Geom.Point(width * 0.38, height * 0.72),
    new Phaser.Geom.Point(width * 0.2, height * 0.83),
    new Phaser.Geom.Point(0, height * 0.74),
  ], true);
  ink.fillRect(0, height * 0.68, width, height * 0.32);
  tweens.push(
    scene.tweens.add({
      targets: ink,
      alpha: 0,
      duration: 520,
      ease: 'Sine.Out',
      onComplete: () => ink.destroy(),
    }),
  );
  return ink;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 91.3458) * 47453.5453;
  return value - Math.floor(value);
}
