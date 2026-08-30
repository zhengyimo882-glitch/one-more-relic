import Phaser from 'phaser';
import { localize } from '../i18n/gameLanguage';
import { UI_STYLE_BOARD } from './styleBoardUi';

export interface CurrentDialogueController {
  isCurrentDialogueSkippable(): boolean;
  skipCurrentDialogue(): boolean;
}

export function getCurrentDialogueController(
  scene: Phaser.Scene,
): CurrentDialogueController | undefined {
  const candidate = scene as Phaser.Scene & Partial<CurrentDialogueController>;
  if (
    typeof candidate.isCurrentDialogueSkippable !== 'function' ||
    typeof candidate.skipCurrentDialogue !== 'function'
  ) {
    return undefined;
  }
  return candidate as CurrentDialogueController;
}

export function createSettingsButton(
  scene: Phaser.Scene,
  onOpen: () => void,
  depth = 90,
): Phaser.GameObjects.Container {
  const width = 112;
  const height = 42;
  const drawBackground = (
    graphics: Phaser.GameObjects.Graphics,
    focused: boolean,
  ): void => {
    graphics.clear();
    graphics.fillStyle(0x11100e, focused ? 0.92 : 0.7);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    graphics.lineStyle(1, focused ? 0xd4ad63 : 0x9b7946, focused ? 0.95 : 0.68);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    graphics.lineStyle(1, 0x5f4528, 0.46);
    graphics.lineBetween(-width / 2 + 8, height / 2 - 6, width / 2 - 8, height / 2 - 6);
  };

  const background = scene.add.graphics();
  drawBackground(background, false);
  const icon = scene.add.graphics();
  icon.lineStyle(2, 0xd4ad63, 0.94);
  icon.strokeCircle(-36, 0, 8);
  icon.strokeCircle(-36, 0, 2.5);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    icon.lineBetween(
      -36 + Math.cos(angle) * 9,
      Math.sin(angle) * 9,
      -36 + Math.cos(angle) * 12,
      Math.sin(angle) * 12,
    );
  }
  const label = scene.add
    .text(12, 0, localize('SETTINGS', '设置'), {
      fontFamily: 'Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.textBright,
    })
    .setOrigin(0.5);
  const button = scene.add
    .container(scene.scale.width - width / 2 - 18, height / 2 + 18, [background, icon, label])
    .setName('settings-button')
    .setSize(width, height)
    .setScrollFactor(0)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });

  button.on('pointerover', () => drawBackground(background, true));
  button.on('pointerout', () => drawBackground(background, false));
  button.on(
    'pointerup',
    (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      onOpen();
    },
  );
  return button;
}
