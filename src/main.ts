import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { StoryIntroScene } from './scenes/StoryIntroScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { ShopIntroductionScene } from './scenes/ShopIntroductionScene';
import { TombScene } from './scenes/TombScene';
import { AntiqueShopScene } from './scenes/AntiqueShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111310',
  scene: [
    BootScene,
    MainMenuScene,
    StoryIntroScene,
    CharacterSelectScene,
    ShopIntroductionScene,
    TombScene,
    AntiqueShopScene,
  ],
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
};

export const game = new Phaser.Game(config);
