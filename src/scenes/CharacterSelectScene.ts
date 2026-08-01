import Phaser from 'phaser';
import {
  PLAYER_APPEARANCES,
  type PlayerAppearanceId,
} from '../data/playerAppearances';
import {
  createPlayerAvatarVisual,
  type PlayerAvatarVisual,
} from '../visuals/createPlayerAvatarVisual';

const SERIF_FONT =
  'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS_FONT =
  'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type AppearanceOption = {
  border: Phaser.GameObjects.Rectangle;
  avatar: PlayerAvatarVisual;
  englishName: Phaser.GameObjects.Text;
  chineseName: Phaser.GameObjects.Text;
};

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private preview?: PlayerAvatarVisual;
  private options: AppearanceOption[] = [];
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private confirmKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.selectedIndex = 0;
    this.options = [];
    this.cameras.main.setBackgroundColor('#181b17');
    this.createRainyShopWindow();
    this.createTitles();
    this.createAppearanceOptions();
    this.updateSelection();
    this.registerInput();
  }

  update(): void {
    if (
      !this.leftKey ||
      !this.rightKey ||
      !this.confirmKey ||
      !this.enterKey ||
      !this.escapeKey
    ) {
      return;
    }
    const leftPressed = Phaser.Input.Keyboard.JustDown(this.leftKey);
    const rightPressed = Phaser.Input.Keyboard.JustDown(this.rightKey);
    const confirmPressed =
      Phaser.Input.Keyboard.JustDown(this.confirmKey) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey);
    const escapePressed = Phaser.Input.Keyboard.JustDown(this.escapeKey);

    if (leftPressed) {
      this.selectedIndex =
        (this.selectedIndex - 1 + PLAYER_APPEARANCES.length) %
        PLAYER_APPEARANCES.length;
      this.updateSelection();
      return;
    }
    if (rightPressed) {
      this.selectedIndex =
        (this.selectedIndex + 1) % PLAYER_APPEARANCES.length;
      this.updateSelection();
      return;
    }
    if (confirmPressed) {
      this.scene.start('ShopIntroductionScene', {
        appearanceId: this.selectedAppearanceId,
      });
      return;
    }
    if (escapePressed) {
      this.scene.start('StoryIntroScene', { startAct: 2 });
    }
  }

  private get selectedAppearanceId(): PlayerAppearanceId {
    return PLAYER_APPEARANCES[this.selectedIndex].id;
  }

  private createRainyShopWindow(): void {
    const g = this.add.graphics();
    g.fillStyle(0x20231f, 1);
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle(0x302d27, 1);
    g.fillRect(110, 125, 1060, 340);
    g.fillStyle(0x151b19, 0.96);
    g.fillRoundedRect(225, 132, 830, 326, 8);
    g.lineStyle(5, 0x735b45, 0.9);
    g.strokeRoundedRect(225, 132, 830, 326, 8);
    g.lineBetween(640, 132, 640, 458);
    g.fillStyle(0xd0aa68, 0.12);
    g.fillEllipse(640, 300, 650, 300);

    g.fillStyle(0x6b5844, 0.7);
    g.fillRect(720, 215, 230, 16);
    g.fillRect(720, 320, 230, 16);
    g.fillStyle(0x88765d, 0.68);
    g.fillCircle(760, 190, 25);
    g.fillRoundedRect(835, 176, 50, 48, 7);
    g.fillEllipse(785, 290, 70, 38);
    g.fillCircle(900, 286, 32);

    g.fillStyle(0x252b24, 0.94);
    g.fillRoundedRect(785, 170, 70, 120, 20);
    g.fillCircle(820, 160, 19);

    g.lineStyle(2, 0x8f9ba0, 0.3);
    for (let x = 260; x < 1040; x += 72) {
      g.lineBetween(x, 140, x - 18, 448);
    }
    g.fillStyle(0x8a969b, 0.19);
    for (let x = 290; x < 1040; x += 118) {
      g.fillEllipse(x, 175 + ((x / 118) % 3) * 65, 5, 18);
    }
  }

  private createTitles(): void {
    this.add
      .text(this.scale.width / 2, 28, 'WHO STEPS THROUGH THE DOOR?', {
        fontFamily: SERIF_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#e8deca',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 58, '谁将推开这扇门？', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#c0b8a5',
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 88, 'Appearance only. All choices play the same.', {
        fontFamily: SANS_FONT,
        fontSize: '15px',
        color: '#b09f87',
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 108, '外观选择不会影响角色能力。', {
        fontFamily: SANS_FONT,
        fontSize: '13px',
        color: '#a9afa2',
      })
      .setOrigin(0.5);

    this.add
      .text(640, 602, 'ENTER THE SHOP', {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#d9cdae',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.add
      .text(640, 625, '走进古玩店', {
        fontFamily: SERIF_FONT,
        fontSize: '14px',
        color: '#9b927e',
      })
      .setOrigin(0.5);
    this.add
      .text(
        640,
        658,
        'A / D  SELECT / 选择     E / ENTER  CONFIRM / 确认',
        {
          fontFamily: SANS_FONT,
          fontSize: '14px',
          color: '#aaa08b',
        },
      )
      .setOrigin(0.5, 1);
    this.add
      .text(28, 676, 'ESC  BACK / 返回', {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        color: '#969e92',
      })
      .setOrigin(0, 0.5);
  }

  private createAppearanceOptions(): void {
    this.createPreview();
    const startX = 370;
    PLAYER_APPEARANCES.forEach((appearance, index) => {
      const x = startX + index * 180;
      const border = this.add
        .rectangle(x, 515, 142, 98, 0x211f1b, 0.9)
        .setStrokeStyle(2, 0x635b4d, 0.7);
      const avatar = createPlayerAvatarVisual(this, appearance);
      avatar.container.setPosition(x, 495).setScale(0.96);
      avatar.setFacing('down');
      const englishName = this.add
        .text(x, 530, appearance.nameEn, {
          fontFamily: SANS_FONT,
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#d8ceb5',
        })
        .setOrigin(0.5);
      const chineseName = this.add
        .text(x, 551, appearance.nameZh, {
          fontFamily: SANS_FONT,
          fontSize: '13px',
          color: '#b8ad99',
        })
        .setOrigin(0.5);
      this.options.push({ border, avatar, englishName, chineseName });
    });
  }

  private createPreview(): void {
    this.preview?.container.destroy(true);
    this.preview = createPlayerAvatarVisual(
      this,
      PLAYER_APPEARANCES[this.selectedIndex],
    );
    this.preview.container.setPosition(640, 300).setScale(3.25);
    this.preview.setFacing('down');
  }

  private updateSelection(): void {
    this.createPreview();
    this.options.forEach((option, index) => {
      const selected = index === this.selectedIndex;
      option.border.setStrokeStyle(
        2,
        selected ? 0xb8a276 : 0x635b4d,
        selected ? 1 : 0.65,
      );
      option.avatar.container.setAlpha(selected ? 1 : 0.64);
      option.englishName.setAlpha(selected ? 1 : 0.7);
      option.chineseName.setAlpha(selected ? 1 : 0.7);
    });
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for appearance selection.');
    }
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.confirmKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }
}
