import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { StoryIntroScene } from './scenes/StoryIntroScene';
import { ShopIntroductionScene } from './scenes/ShopIntroductionScene';
import { TombScene } from './scenes/TombScene';
import { AntiqueShopScene } from './scenes/AntiqueShopScene';
import { Tomb25DPrototypeScene } from './scenes/Tomb25DPrototypeScene';

const requestedScene = new URLSearchParams(window.location.search).get('scene');
const launchTomb25DPrototype = requestedScene === 'tomb25d';
const launchAntiqueShop25D = requestedScene === 'shop25d';
const launchShopIntroduction = requestedScene === 'shopintro';

const regularScenes = [
  BootScene,
  MainMenuScene,
  StoryIntroScene,
  ShopIntroductionScene,
  TombScene,
  AntiqueShopScene,
];

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111310',
  scene: launchTomb25DPrototype
    ? [Tomb25DPrototypeScene, ...regularScenes]
    : launchAntiqueShop25D
      ? [
          AntiqueShopScene,
          ...regularScenes.filter((scene) => scene !== AntiqueShopScene),
          Tomb25DPrototypeScene,
        ]
      : launchShopIntroduction
        ? [
            ShopIntroductionScene,
            ...regularScenes.filter((scene) => scene !== ShopIntroductionScene),
            Tomb25DPrototypeScene,
          ]
      : [...regularScenes, Tomb25DPrototypeScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    keyboard: {
      target: window,
      capture: [
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
      ],
    },
  },
};

export const game = new Phaser.Game(config);

const focusGameCanvas = (): void => {
  const canvas = game.canvas;
  if (!canvas) {
    return;
  }
  canvas.tabIndex = 0;
  canvas.focus({ preventScroll: true });
};

game.events.once(Phaser.Core.Events.READY, () => {
  const canvas = game.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'ONE MORE RELIC game canvas');
  canvas.addEventListener('pointerdown', focusGameCanvas);
  focusGameCanvas();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyW' || event.code === 'KeyA' ||
      event.code === 'KeyS' || event.code === 'KeyD') {
    focusGameCanvas();
  }
}, true);
