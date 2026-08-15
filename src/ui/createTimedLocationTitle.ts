import Phaser from 'phaser';

export type TimedLocationTitle = {
  container: Phaser.GameObjects.Container;
  play(): void;
};

type TimedLocationTitleConfig = {
  english: string;
  chinese: string;
  width?: number;
  y?: number;
};

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';

export function createTimedLocationTitle(
  scene: Phaser.Scene,
  config: TimedLocationTitleConfig,
): TimedLocationTitle {
  const panelWidth = config.width ?? 430;
  const background = scene.add
    .rectangle(0, 0, panelWidth, 96, 0x15120f, 0.84)
    .setStrokeStyle(1, 0x8d7858, 0.65);
  const english = scene.add
    .text(0, -17, config.english, {
      fontFamily: SERIF_FONT,
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#e6dcc4',
      letterSpacing: 2,
    })
    .setOrigin(0.5);
  const chinese = scene.add
    .text(0, 22, config.chinese, {
      fontFamily: SERIF_FONT,
      fontSize: '19px',
      color: '#bbb3a1',
    })
    .setOrigin(0.5);
  const container = scene.add
    .container(scene.scale.width / 2, config.y ?? 88, [background, english, chinese])
    .setScrollFactor(0)
    .setDepth(12)
    .setVisible(false);

  let played = false;
  return {
    container,
    play(): void {
      if (played) {
        return;
      }
      played = true;
      container.setVisible(true).setAlpha(0);
      scene.tweens.add({
        targets: container,
        alpha: 1,
        duration: 400,
        ease: 'Sine.Out',
        onComplete: () => {
          scene.tweens.add({
            targets: container,
            alpha: 0,
            delay: 2200,
            duration: 650,
            ease: 'Sine.In',
            onComplete: () => container.setVisible(false),
          });
        },
      });
    },
  };
}
