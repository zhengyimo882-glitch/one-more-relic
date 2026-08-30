import Phaser from 'phaser';
import { VISUAL_THEME } from '../visuals/visualTheme';

export type ActionHint = {
  key: string;
  label: string;
  primary?: boolean;
};

const PANEL_WIDTH = 286;
const SAFE_MARGIN = 22;
const LINE_HEIGHT = 25;
const PADDING_X = 15;
const PADDING_Y = 12;
const MAX_ACTIONS = 5;

/** A single, camera-independent home for all playable key prompts in a scene. */
export class ActionHintPanel {
  private readonly scene: Phaser.Scene;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Text[];
  readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, depth = 90) {
    this.scene = scene;
    this.background = scene.add.graphics();
    this.lines = Array.from({ length: MAX_ACTIONS }, (_, index) =>
      scene.add
        .text(-PANEL_WIDTH + PADDING_X, -PADDING_Y - index * LINE_HEIGHT, '', {
          fontFamily: VISUAL_THEME.fonts.sans,
          fontSize: '14px',
          color: '#c5b898',
          stroke: '#080907',
          strokeThickness: 2,
        })
        .setOrigin(0, 1),
    );
    this.container = scene.add
      .container(0, 0, [this.background, ...this.lines])
      .setScrollFactor(0)
      .setDepth(depth);
    this.reposition(scene.scale.gameSize);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reposition, this);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  setActions(actions: ActionHint[]): void {
    const visible = actions.slice(0, MAX_ACTIONS);
    const height = PADDING_Y * 2 + visible.length * LINE_HEIGHT;
    this.background.clear();
    if (visible.length > 0) {
      this.background.fillStyle(0x090b09, visible.some((item) => item.primary) ? 0.72 : 0.58);
      this.background.fillRoundedRect(-PANEL_WIDTH, -height, PANEL_WIDTH, height, 8);
      this.background.lineStyle(1, 0x9d7b45, visible.some((item) => item.primary) ? 0.82 : 0.48);
      this.background.strokeRoundedRect(-PANEL_WIDTH, -height, PANEL_WIDTH, height, 8);
    }

    this.lines.forEach((line, index) => {
      const action = visible[index];
      if (!action) {
        line.setVisible(false);
        return;
      }
      line
        .setText(`[${action.key.toUpperCase()}]  ${action.label}`)
        .setColor(action.primary ? '#f1d89f' : '#b6aa8e')
        .setAlpha(action.primary ? 1 : 0.68)
        .setFontStyle(action.primary ? 'bold' : 'normal')
        .setY(-height + PADDING_Y + (index + 1) * LINE_HEIGHT)
        .setVisible(true);
    });
    this.container.setVisible(visible.length > 0);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  private reposition(gameSize: Phaser.Structs.Size): void {
    this.container.setPosition(gameSize.width - SAFE_MARGIN, gameSize.height - SAFE_MARGIN);
  }

  private handleScenePause(): void {
    this.container.setVisible(false);
  }

  private handleSceneResume(): void {
    this.container.setVisible(true);
  }

  private destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reposition, this);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
  }
}
