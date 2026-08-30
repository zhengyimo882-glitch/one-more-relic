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
import { localize } from '../i18n/gameLanguage';
import {
  DEFAULT_PLAYER_APPEARANCE_ID,
  isPlayerAppearanceId,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import { ShopProgressSystem } from '../systems/ShopProgressSystem';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type PauseMenuData = {
  sourceSceneKey: string;
};

type PauseAction = 'skip-dialogue' | 'operator-settings' | 'resume' | 'main-menu';
type OperatorStage =
  | 'pre-tomb-dialogue'
  | 'tomb-gameplay'
  | 'post-tomb-dialogue'
  | 'shop-growth';

const OPERATOR_STAGES: ReadonlyArray<{
  id: OperatorStage;
  english: string;
  chinese: string;
  descriptionEnglish: string;
  descriptionChinese: string;
}> = [
  {
    id: 'pre-tomb-dialogue',
    english: 'Before the Tomb',
    chinese: '下墓穴前对话',
    descriptionEnglish: 'Start with the shopkeeper assigning the first tomb job.',
    descriptionChinese: '从老板交代第一次下墓任务的对话开始。',
  },
  {
    id: 'tomb-gameplay',
    english: 'Tomb Gameplay',
    chinese: '墓穴游玩',
    descriptionEnglish: 'Enter the tomb at the first controllable moment.',
    descriptionChinese: '进入墓穴，并从第一个可操控时刻开始。',
  },
  {
    id: 'post-tomb-dialogue',
    english: 'After the Tomb',
    chinese: '墓穴返回后对话',
    descriptionEnglish: 'Return with valid relic data and begin the shopkeeper dialogue.',
    descriptionChinese: '携带有效的墓穴结算数据，直接开始返店对话。',
  },
  {
    id: 'shop-growth',
    english: 'Antique Shop Growth',
    chinese: '古玩店养成',
    descriptionEnglish: 'Open the restoration, appraisal, and shop growth loop.',
    descriptionChinese: '进入修复、鉴定与古玩店养成流程。',
  },
];

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
  private operatorSettingsActive = false;
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
  private operatorPanel?: Phaser.GameObjects.Container;
  private operatorButtons: Phaser.GameObjects.Container[] = [];
  private operatorButtonBackgrounds: Phaser.GameObjects.Graphics[] = [];
  private operatorButtonLabels: Phaser.GameObjects.Text[] = [];
  private operatorDescription?: Phaser.GameObjects.Text;
  private actionHints?: ActionHintPanel;
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
    this.operatorSettingsActive = false;
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
    this.operatorButtons = [];
    this.operatorButtonBackgrounds = [];
    this.operatorButtonLabels = [];
    const sourceScene = this.scene.get(this.sourceSceneKey);
    const dialogueController = getCurrentDialogueController(sourceScene);
    this.menuActions = dialogueController?.isCurrentDialogueSkippable()
      ? ['skip-dialogue', 'operator-settings', 'resume', 'main-menu']
      : ['operator-settings', 'resume', 'main-menu'];
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
    const mainPanelHeight = this.menuActions.length === 4 ? 590 : 520;
    const mainPanelTop = (height - mainPanelHeight) / 2;
    createStyleBoardPanel(this, 500, mainPanelHeight, 'carved', 0.985)
      .setPosition(width / 2, height / 2);
    this.add
      .text(width / 2, mainPanelTop + 70, localize('SETTINGS', '设置'), {
        fontFamily: SERIF_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, mainPanelTop + 116, localize('Game paused', '游戏已暂停'), {
        fontFamily: SERIF_FONT,
        fontSize: '21px',
        color: UI_STYLE_BOARD.colors.muted,
      })
      .setOrigin(0.5);

    const startY = this.menuActions.length === 4 ? mainPanelTop + 218 : mainPanelTop + 238;
    const gap = this.menuActions.length === 4 ? 74 : 78;
    this.menuActions.forEach((action, index) => {
      const label = action === 'skip-dialogue'
        ? localize('Skip to next action', '跳至下一操作')
        : action === 'operator-settings'
          ? localize('Operator Settings', '操作者设置')
        : action === 'resume'
          ? localize('Resume', '继续游戏')
          : localize('Return to Main Menu', '返回开始界面');
      this.createButton(index, width / 2, startY + index * gap, '', label, action);
    });
    this.actionHints = new ActionHintPanel(this, 100);
    this.updateActionHints();

    this.createConfirmationPanel();
    this.createOperatorSettingsPanel();
    this.registerInput();
    this.updateSelection();
    polishSceneTypography(this);
  }

  update(): void {
    if (this.transitioning || this.time.now < this.inputReadyAt) {
      return;
    }

    const pad = this.input.gamepad?.getPad(0);
    this.inputActions?.setContext(
      this.confirmingReturn
        ? 'pause-confirm-return'
        : this.operatorSettingsActive
          ? 'pause-operator-settings'
          : 'pause-menu',
    );
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
      } else if (this.operatorSettingsActive) {
        this.closeOperatorSettings();
      } else {
        this.resumeGame();
      }
      this.inputReadyAt = this.time.now + 160;
      return;
    }

    if (previousPressed || nextPressed) {
      const direction = previousPressed ? -1 : 1;
      const optionCount = this.confirmingReturn
        ? 2
        : this.operatorSettingsActive
          ? OPERATOR_STAGES.length + 1
          : this.menuActions.length;
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
      } else if (this.operatorSettingsActive) {
        if (this.selectedIndex === OPERATOR_STAGES.length) {
          this.closeOperatorSettings();
        } else {
          this.jumpToOperatorStage(OPERATOR_STAGES[this.selectedIndex]?.id);
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
      if (!this.confirmingReturn && !this.operatorSettingsActive) {
        this.selectedIndex = index;
        this.updateSelection();
      }
    });
    button.on('pointerup', () => {
      if (this.confirmingReturn || this.operatorSettingsActive || this.transitioning) {
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

  private createOperatorSettingsPanel(): void {
    const { width, height } = this.scale;
    const children: Phaser.GameObjects.GameObject[] = [];
    children.push(
      this.add.rectangle(0, 0, width, height, 0x050605, 0.78).setOrigin(0).setInteractive(),
      createStyleBoardPanel(this, 760, 630, 'carved', 1).setPosition(width / 2, height / 2),
      this.add.text(width / 2, 82, localize('OPERATOR SETTINGS', '操作者设置'), {
        fontFamily: SERIF_FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: UI_STYLE_BOARD.colors.textBright,
        letterSpacing: 2,
      }).setOrigin(0.5),
      this.add.text(
        width / 2,
        126,
        localize(
          'Jump directly to a playable production stage',
          '直接跳转到指定的可玩流程阶段',
        ),
        {
          fontFamily: SANS_FONT,
          fontSize: '15px',
          color: UI_STYLE_BOARD.colors.muted,
        },
      ).setOrigin(0.5),
    );

    OPERATOR_STAGES.forEach((stage, index) => {
      const button = this.createOperatorButton(
        index,
        640,
        204 + index * 76,
        localize(stage.english, stage.chinese),
        'primary',
      );
      button.on('pointerup', () => {
        if (this.operatorSettingsActive && !this.transitioning) {
          this.jumpToOperatorStage(stage.id);
        }
      });
      children.push(button);
    });
    const backIndex = OPERATOR_STAGES.length;
    const back = this.createOperatorButton(
      backIndex,
      640,
      204 + backIndex * 76,
      localize('Back', '返回'),
      'secondary',
    );
    back.on('pointerup', () => {
      if (this.operatorSettingsActive && !this.transitioning) {
        this.closeOperatorSettings();
      }
    });
    children.push(back);

    this.operatorDescription = this.add.text(width / 2, 604, '', {
      fontFamily: SANS_FONT,
      fontSize: '14px',
      color: UI_STYLE_BOARD.colors.text,
      align: 'center',
      wordWrap: { width: 650 },
    }).setOrigin(0.5);
    children.push(this.operatorDescription);
    this.operatorPanel = this.add.container(0, 0, children).setDepth(22).setVisible(false);
  }

  private createOperatorButton(
    index: number,
    x: number,
    y: number,
    labelText: string,
    kind: StyleBoardButtonKind,
  ): Phaser.GameObjects.Container {
    const buttonWidth = 500;
    const buttonHeight = 60;
    const background = createStyleBoardButtonBackground(
      this,
      buttonWidth,
      buttonHeight,
      'default',
      kind,
    );
    const label = this.add.text(0, 0, labelText, {
      fontFamily: SANS_FONT,
      fontSize: '17px',
      fontStyle: 'bold',
      color: styleBoardButtonTextColor('default', kind),
    }).setOrigin(0.5);
    const button = this.add.container(x, y, [background, label])
      .setSize(buttonWidth, buttonHeight)
      .setInteractive({ useHandCursor: true });
    button.setData('kind', kind);
    button.on('pointerover', () => {
      if (!this.operatorSettingsActive || this.transitioning) return;
      this.selectedIndex = index;
      this.updateSelection();
    });
    this.operatorButtons.push(button);
    this.operatorButtonBackgrounds.push(background);
    this.operatorButtonLabels.push(label);
    return button;
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
    } else if (action === 'operator-settings') {
      this.openOperatorSettings();
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
    this.updateActionHints();
    this.updateSelection();
  }

  private closeConfirmation(): void {
    this.confirmingReturn = false;
    this.selectedIndex = Math.max(0, this.menuActions.indexOf('main-menu'));
    this.confirmPanel?.setVisible(false);
    this.updateActionHints();
    this.updateSelection();
  }

  private openOperatorSettings(): void {
    this.operatorSettingsActive = true;
    this.selectedIndex = 0;
    this.operatorPanel?.setVisible(true);
    this.updateActionHints();
    this.updateSelection();
  }

  private closeOperatorSettings(): void {
    this.operatorSettingsActive = false;
    this.selectedIndex = Math.max(0, this.menuActions.indexOf('operator-settings'));
    this.operatorPanel?.setVisible(false);
    this.updateActionHints();
    this.updateSelection();
  }

  private updateSelection(): void {
    const menuButtonCount = this.menuActions.length;
    const offset = this.confirmingReturn ? menuButtonCount : 0;
    this.buttons.forEach((button, index) => {
      const inCurrentLayer = this.confirmingReturn
        ? index >= menuButtonCount
        : !this.operatorSettingsActive && index < menuButtonCount;
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

    this.operatorButtons.forEach((button, index) => {
      const selected = this.operatorSettingsActive && index === this.selectedIndex;
      const kind = (button.getData('kind') as StyleBoardButtonKind | undefined) ?? 'primary';
      drawStyleBoardButton(
        this.operatorButtonBackgrounds[index],
        500,
        60,
        selected ? 'focused' : 'default',
        kind,
      );
      this.operatorButtonLabels[index]?.setColor(
        styleBoardButtonTextColor(selected ? 'focused' : 'default', kind),
      );
    });

    const selectedStage = OPERATOR_STAGES[this.selectedIndex];
    this.operatorDescription?.setText(
      this.operatorSettingsActive && selectedStage
        ? localize(selectedStage.descriptionEnglish, selectedStage.descriptionChinese)
        : this.operatorSettingsActive
          ? localize('Return to the settings menu.', '返回设置菜单。')
          : '',
    );
  }

  private updateActionHints(): void {
    if (!this.actionHints) return;
    this.actionHints.setActions([
      { key: '↑/↓', label: localize('Select', '选择'), primary: true },
      { key: 'E', label: localize('Confirm', '确认') },
      {
        key: 'ESC',
        label: this.confirmingReturn || this.operatorSettingsActive
          ? localize('Back', '返回')
          : localize('Resume', '继续游戏'),
      },
    ]);
  }

  private jumpToOperatorStage(stage: OperatorStage | undefined): void {
    if (!stage || this.transitioning) return;
    this.transitioning = true;
    resetPauseButtonState(this);
    const appearanceId = this.resolveSourceAppearanceId();
    const settlement = stage === 'post-tomb-dialogue' || stage === 'shop-growth'
      ? ShopProgressSystem.createFirstTombSettlement('geomancers-compass')
      : undefined;
    const destination = stage === 'pre-tomb-dialogue'
      ? 'ShopIntroductionScene'
      : stage === 'tomb-gameplay'
        ? 'TombScene'
        : stage === 'post-tomb-dialogue'
          ? 'AntiqueShopScene'
          : 'ShopGrowthScene';
    const data = stage === 'pre-tomb-dialogue'
      ? { appearanceId, operatorStartAtDialogue: true }
      : stage === 'tomb-gameplay'
        ? { appearanceId, operatorSkipArrival: true }
        : stage === 'post-tomb-dialogue'
          ? {
              appearanceId,
              departureChoice: 'geomancers-compass',
              settlement,
              operatorStartAtDialogue: true,
            }
          : { appearanceId, settlement };

    if (this.scene.isActive(this.sourceSceneKey) || this.scene.isPaused(this.sourceSceneKey)) {
      this.scene.stop(this.sourceSceneKey);
    }
    this.transitionController?.start(destination, data, {
      durationMs: 220,
      label: localize('Operator jump · Loading stage', '操作者跳转 · 正在载入阶段'),
    });
  }

  private resolveSourceAppearanceId(): PlayerAppearanceId {
    const source = this.scene.get(this.sourceSceneKey) as Phaser.Scene & {
      appearanceId?: string;
      incomingAppearanceId?: string;
    };
    if (isPlayerAppearanceId(source.appearanceId)) return source.appearanceId;
    if (isPlayerAppearanceId(source.incomingAppearanceId)) return source.incomingAppearanceId;
    return DEFAULT_PLAYER_APPEARANCE_ID;
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
