import Phaser from 'phaser';
import {
  createStyleBoardButtonBackground,
  createStyleBoardPanel,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
  UI_STYLE_BOARD,
  type StyleBoardButtonKind,
} from '../ui/styleBoardUi';
import { InputActionManager } from '../input/InputActionManager';
import { SceneTransitionController } from '../systems/SceneTransitionController';
import { polishSceneTypography } from '../ui/gameTypography';
import { ActionHintPanel } from '../ui/ActionHintPanel';
import { getCurrentDialogueController } from '../ui/SettingsButton';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type PauseMenuData = {
  sourceSceneKey: string;
};

type PauseAction = 'skip-dialogue' | 'resume' | 'main-menu';

export function openPauseMenu(scene: Phaser.Scene): void {
  if (scene.scene.isActive('PauseMenuScene') || scene.scene.isPaused()) {
    return;
  }

  scene.scene.launch('PauseMenuScene', { sourceSceneKey: scene.scene.key });
  scene.scene.pause();
}

export function resetPauseButtonState(scene: Phaser.Scene): void {
  scene.registry.set('__pauseButtonHeld', false);
}

export function isPauseButtonPressed(scene: Phaser.Scene): boolean {
  const pad = scene.input.gamepad?.getPad(0);
  if (!pad) {
    return false;
  }
  const wasDown = Boolean(scene.registry.get('__pauseButtonHeld'));
  const isDown = Boolean(pad.buttons[9]?.pressed);
  scene.registry.set('__pauseButtonHeld', isDown);
  return isDown && !wasDown;
}

export class PauseMenuScene extends Phaser.Scene {
  private sourceSceneKey = '';
  private confirmingReturn = false;
  private selectedIndex = 0;
  private inputReadyAt = 0;
  private transitioning = false;
  private gamepadConfirmHeld = false;
  private gamepadCancelHeld = false;
  private gamepadDirectionHeld = false;
  private buttons: Phaser.GameObjects.Container[] = [];
  private buttonBackgrounds: Phaser.GameObjects.Graphics[] = [];
  private buttonLabels: Phaser.GameObjects.Text[] = [];
  private buttonKinds: StyleBoardButtonKind[] = [];
  private buttonSizes: Array<{ width: number; height: number }> = [];
  private menuActions: PauseAction[] = [];
  private confirmPanel?: Phaser.GameObjects.Container;
  private inputActions?: InputActionManager;
  private transitionController?: SceneTransitionController;

  constructor() {
    super('PauseMenuScene');
  }

  init(data: PauseMenuData): void {
    this.sourceSceneKey = data.sourceSceneKey;
  }

  create(): void {
    this.confirmingReturn = false;
    this.selectedIndex = 0;
    this.transitioning = false;
    this.gamepadConfirmHeld = false;
    this.gamepadCancelHeld = false;
    this.gamepadDirectionHeld = false;
    this.buttons = [];
    this.buttonBackgrounds = [];
    this.buttonLabels = [];
    this.buttonKinds = [];
    this.buttonSizes = [];
    const sourceScene = this.scene.get(this.sourceSceneKey);
    const dialogueController = getCurrentDialogueController(sourceScene);
    this.menuActions = dialogueController?.isCurrentDialogueSkippable()
      ? ['skip-dialogue', 'resume', 'main-menu']
      : ['resume', 'main-menu'];
    this.inputReadyAt = this.time.now + 160;
    this.inputActions = InputActionManager.forScene(this);
    this.inputActions.setContext('pause-menu');
    this.transitionController = new SceneTransitionController(this, this.inputActions);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.input.setDefaultCursor('default');

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, UI_STYLE_BOARD.colors.backdrop, 0.84).setOrigin(0);
    createStyleBoardPanel(this, 500, this.menuActions.length === 3 ? 500 : 430, 'carved', 0.985)
      .setPosition(width / 2, height / 2);
    this.add
      .text(width / 2, this.menuActions.length === 3 ? 150 : 188, '设置', {
        fontFamily: SERIF_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, this.menuActions.length === 3 ? 198 : 231, '游戏已暂停', {
        fontFamily: SERIF_FONT,
        fontSize: '21px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0.5);

    const startY = this.menuActions.length === 3 ? 280 : 316;
    const gap = this.menuActions.length === 3 ? 76 : 82;
    this.menuActions.forEach((action, index) => {
      const label = action === 'skip-dialogue'
        ? '跳至下一操作'
        : action === 'resume'
          ? '继续游戏'
          : '返回开始界面';
      this.createButton(index, width / 2, startY + index * gap, '', label, action);
    });
    const actionHints = new ActionHintPanel(this, 100);
    actionHints.setActions([
      { key: '↑/↓', label: '选择', primary: true },
      { key: 'E', label: '确认' },
      { key: 'ESC', label: '继续游戏' },
    ]);

    this.createConfirmationPanel();
    this.registerInput();
    this.updateSelection();
    polishSceneTypography(this);
  }

  update(): void {
    if (this.transitioning || this.time.now < this.inputReadyAt) {
      return;
    }

    const pad = this.input.gamepad?.getPad(0);
    this.inputActions?.setContext(this.confirmingReturn ? 'pause-confirm-return' : 'pause-menu');
    const escapePressed = this.inputActions?.consume('cancel') ?? false;
    const padConfirmDown = Boolean(pad?.A);
    const padCancelDown = Boolean(pad?.B);
    const padDirectionDown = Boolean(pad?.up || pad?.down || pad?.left || pad?.right);
    const cancelPressed = escapePressed || (padCancelDown && !this.gamepadCancelHeld);
    const confirmPressed =
      (this.inputActions?.consume('confirm') ?? false) ||
      (padConfirmDown && !this.gamepadConfirmHeld);
    const previousPressed =
      (this.inputActions?.consume('nav-up', { cooldownMs: 120 }) ?? false) ||
      (this.inputActions?.consume('nav-left', { cooldownMs: 120 }) ?? false) ||
      (Boolean(pad?.up || pad?.left) && !this.gamepadDirectionHeld);
    const nextPressed =
      (this.inputActions?.consume('nav-down', { cooldownMs: 120 }) ?? false) ||
      (this.inputActions?.consume('nav-right', { cooldownMs: 120 }) ?? false) ||
      (Boolean(pad?.down || pad?.right) && !this.gamepadDirectionHeld);

    this.gamepadConfirmHeld = padConfirmDown;
    this.gamepadCancelHeld = padCancelDown;
    this.gamepadDirectionHeld = padDirectionDown;

    if (cancelPressed) {
      if (this.confirmingReturn) {
        this.closeConfirmation();
      } else {
        this.resumeGame();
      }
      this.inputReadyAt = this.time.now + 160;
      return;
    }

    if (previousPressed || nextPressed) {
      const direction = previousPressed ? -1 : 1;
      const optionCount = this.confirmingReturn ? 2 : this.menuActions.length;
      this.selectedIndex = Phaser.Math.Wrap(
        this.selectedIndex + direction,
        0,
        optionCount,
      );
      this.updateSelection();
      this.inputReadyAt = this.time.now + 140;
      return;
    }

    if (confirmPressed) {
      if (this.confirmingReturn) {
        if (this.selectedIndex === 0) {
          this.closeConfirmation();
        } else {
          this.returnToMainMenu();
        }
      } else {
        this.performMenuAction(this.menuActions[this.selectedIndex]);
      }
      this.inputReadyAt = this.time.now + 160;
    }
  }

  private createButton(
    index: number,
    x: number,
    y: number,
    english: string,
    chinese: string,
    action: PauseAction,
  ): void {
    const buttonWidth = 340;
    const buttonHeight = 64;
    const background = createStyleBoardButtonBackground(
      this,
      buttonWidth,
      buttonHeight,
      'default',
      action === 'main-menu' ? 'secondary' : 'primary',
    );
    const label = this.add
      .text(0, 0, english ? `${english}  /  ${chinese}` : chinese, {
        fontFamily: SANS_FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: styleBoardButtonTextColor('default'),
      })
      .setOrigin(0.5);
    const button = this.add
      .container(x, y, [background, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (!this.confirmingReturn) {
        this.selectedIndex = index;
        this.updateSelection();
      }
    });
    button.on('pointerup', () => {
      if (this.confirmingReturn || this.transitioning) {
        return;
      }
      this.performMenuAction(action);
    });
    this.buttons.push(button);
    this.buttonBackgrounds.push(background);
    this.buttonLabels.push(label);
    this.buttonKinds.push(action === 'main-menu' ? 'secondary' : 'primary');
    this.buttonSizes.push({ width: buttonWidth, height: buttonHeight });
  }

  private createConfirmationPanel(): void {
    const { width, height } = this.scale;
    const blocker = this.add
      .rectangle(0, 0, width, height, 0x050605, 0.7)
      .setOrigin(0)
      .setInteractive();
    const background = createStyleBoardPanel(this, 650, 330, 'carved', 1)
      .setPosition(width / 2, height / 2);
    const title = this.add
      .text(width / 2, 260, '返回主菜单？', {
        fontFamily: SERIF_FONT,
        fontSize: '29px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
      })
      .setOrigin(0.5);
    const warning = this.add
      .text(
        width / 2,
        320,
        '确定返回主菜单吗？\n当前进度不会保存。',
        {
          fontFamily: SANS_FONT,
          fontSize: '17px',
          color: UI_STYLE_BOARD.colors.text,
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);
    const cancel = this.createConfirmButton(width / 2 - 150, 432, '取消', 0);
    const confirm = this.createConfirmButton(width / 2 + 150, 432, '确认返回', 1);
    this.confirmPanel = this.add
      .container(0, 0, [blocker, background, title, warning, cancel, confirm])
      .setDepth(20)
      .setVisible(false);
  }

  private createConfirmButton(
    x: number,
    y: number,
    labelText: string,
    index: number,
  ): Phaser.GameObjects.Container {
    const buttonWidth = 250;
    const buttonHeight = 60;
    const kind: StyleBoardButtonKind = index === 1 ? 'danger' : 'secondary';
    const background = createStyleBoardButtonBackground(
      this,
      buttonWidth,
      buttonHeight,
      'default',
      kind,
    );
    const label = this.add
      .text(0, 0, labelText, {
        fontFamily: SANS_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: styleBoardButtonTextColor('default', kind),
      })
      .setOrigin(0.5);
    const button = this.add
      .container(x, y, [background, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      if (this.confirmingReturn) {
        this.selectedIndex = index;
        this.updateSelection();
      }
    });
    button.on('pointerup', () => {
      if (!this.confirmingReturn || this.transitioning) {
        return;
      }
      if (index === 0) {
        this.closeConfirmation();
      } else {
        this.returnToMainMenu();
      }
    });
    this.buttons.push(button);
    this.buttonBackgrounds.push(background);
    this.buttonLabels.push(label);
    this.buttonKinds.push(kind);
    this.buttonSizes.push({ width: buttonWidth, height: buttonHeight });
    return button;
  }

  private registerInput(): void {
    this.inputActions = InputActionManager.forScene(this);
  }

  private performMenuAction(action: PauseAction | undefined): void {
    if (action === 'skip-dialogue') {
      this.skipCurrentDialogue();
    } else if (action === 'resume') {
      this.resumeGame();
    } else if (action === 'main-menu') {
      this.openConfirmation();
    }
  }

  private openConfirmation(): void {
    this.confirmingReturn = true;
    this.selectedIndex = 0;
    this.confirmPanel?.setVisible(true);
    this.updateSelection();
  }

  private closeConfirmation(): void {
    this.confirmingReturn = false;
    this.selectedIndex = Math.max(0, this.menuActions.indexOf('main-menu'));
    this.confirmPanel?.setVisible(false);
    this.updateSelection();
  }

  private updateSelection(): void {
    const menuButtonCount = this.menuActions.length;
    const offset = this.confirmingReturn ? menuButtonCount : 0;
    this.buttons.forEach((button, index) => {
      const inCurrentLayer = this.confirmingReturn
        ? index >= menuButtonCount
        : index < menuButtonCount;
      button.setVisible(inCurrentLayer);
      const selected = inCurrentLayer && index - offset === this.selectedIndex;
      const background = this.buttonBackgrounds[index];
      const size = this.buttonSizes[index];
      const kind = this.buttonKinds[index] ?? 'primary';
      if (background && size) {
        drawStyleBoardButton(
          background,
          size.width,
          size.height,
          selected ? 'focused' : 'default',
          kind,
        );
      }
      this.buttonLabels[index]?.setColor(
        styleBoardButtonTextColor(selected ? 'focused' : 'default', kind),
      );
    });
  }

  private resumeGame(): void {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    resetPauseButtonState(this);
    if (this.scene.isPaused(this.sourceSceneKey)) {
      this.scene.resume(this.sourceSceneKey);
    }
    this.scene.stop();
  }

  private skipCurrentDialogue(): void {
    if (this.transitioning) {
      return;
    }
    const sourceScene = this.scene.get(this.sourceSceneKey);
    const dialogueController = getCurrentDialogueController(sourceScene);
    if (!dialogueController?.isCurrentDialogueSkippable()) {
      this.resumeGame();
      return;
    }
    dialogueController.skipCurrentDialogue();
    this.resumeGame();
  }

  private returnToMainMenu(): void {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    resetPauseButtonState(this);
    if (this.scene.isActive(this.sourceSceneKey) || this.scene.isPaused(this.sourceSceneKey)) {
      this.scene.stop(this.sourceSceneKey);
    }
    this.transitionController?.start('MainMenuScene', undefined, {
      durationMs: 220,
      label: '拓片收卷 · 返回主菜单',
    });
  }
}
