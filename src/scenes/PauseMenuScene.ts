import Phaser from 'phaser';
import {
  createStyleBoardButtonBackground,
  createStyleBoardPanel,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
  UI_STYLE_BOARD,
  type StyleBoardButtonKind,
} from '../ui/styleBoardUi';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type PauseMenuData = {
  sourceSceneKey: string;
};

type PauseAction = 'resume' | 'main-menu';

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
  private confirmPanel?: Phaser.GameObjects.Container;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private upKey?: Phaser.Input.Keyboard.Key;
  private downKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;

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
    this.inputReadyAt = this.time.now + 160;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.input.setDefaultCursor('default');

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, UI_STYLE_BOARD.colors.backdrop, 0.84).setOrigin(0);
    createStyleBoardPanel(this, 500, 430, 'carved', 0.985).setPosition(width / 2, height / 2);
    this.add
      .text(width / 2, 188, '暂停', {
        fontFamily: SERIF_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 231, '游戏已暂停', {
        fontFamily: SERIF_FONT,
        fontSize: '21px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0.5);

    this.createButton(0, width / 2, 316, '', '继续游戏', 'resume');
    this.createButton(1, width / 2, 398, '', '返回主菜单', 'main-menu');
    this.add
      .text(width / 2, 510, 'ESC 继续   ·   ↑ ↓ / 摇杆 选择   ·   ENTER / A 确认', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0.5);

    this.createConfirmationPanel();
    this.registerInput();
    this.updateSelection();
  }

  update(): void {
    if (this.transitioning || this.time.now < this.inputReadyAt) {
      return;
    }

    const pad = this.input.gamepad?.getPad(0);
    const escapePressed = this.escapeKey
      ? Phaser.Input.Keyboard.JustDown(this.escapeKey)
      : false;
    const padConfirmDown = Boolean(pad?.A);
    const padCancelDown = Boolean(pad?.B);
    const padDirectionDown = Boolean(pad?.up || pad?.down || pad?.left || pad?.right);
    const cancelPressed = escapePressed || (padCancelDown && !this.gamepadCancelHeld);
    const confirmPressed =
      (this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false) ||
      (padConfirmDown && !this.gamepadConfirmHeld);
    const previousPressed =
      (this.upKey ? Phaser.Input.Keyboard.JustDown(this.upKey) : false) ||
      (this.leftKey ? Phaser.Input.Keyboard.JustDown(this.leftKey) : false) ||
      (Boolean(pad?.up || pad?.left) && !this.gamepadDirectionHeld);
    const nextPressed =
      (this.downKey ? Phaser.Input.Keyboard.JustDown(this.downKey) : false) ||
      (this.rightKey ? Phaser.Input.Keyboard.JustDown(this.rightKey) : false) ||
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
      this.selectedIndex = this.selectedIndex === 0 ? 1 : 0;
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
      } else if (this.selectedIndex === 0) {
        this.resumeGame();
      } else {
        this.openConfirmation();
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
      if (action === 'resume') {
        this.resumeGame();
      } else {
        this.openConfirmation();
      }
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
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for the pause menu.');
    }
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.upKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
  }

  private openConfirmation(): void {
    this.confirmingReturn = true;
    this.selectedIndex = 0;
    this.confirmPanel?.setVisible(true);
    this.updateSelection();
  }

  private closeConfirmation(): void {
    this.confirmingReturn = false;
    this.selectedIndex = 1;
    this.confirmPanel?.setVisible(false);
    this.updateSelection();
  }

  private updateSelection(): void {
    const offset = this.confirmingReturn ? 2 : 0;
    this.buttons.forEach((button, index) => {
      const inCurrentLayer = this.confirmingReturn ? index >= 2 : index < 2;
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

  private returnToMainMenu(): void {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    resetPauseButtonState(this);
    if (this.scene.isActive(this.sourceSceneKey) || this.scene.isPaused(this.sourceSceneKey)) {
      this.scene.stop(this.sourceSceneKey);
    }
    this.scene.start('MainMenuScene');
  }
}
