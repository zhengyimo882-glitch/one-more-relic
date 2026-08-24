import Phaser from 'phaser';
import { VISUAL_THEME } from '../visuals/visualTheme';

export const GAME_TYPOGRAPHY = {
  fonts: {
    display: VISUAL_THEME.fonts.serif,
    body: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif',
  },
  colors: {
    lightPrimary: '#f2e6c9',
    lightSecondary: '#cfc1a5',
    lightMuted: '#aaa087',
    inkPrimary: '#21130b',
    inkSecondary: '#4b2a18',
    accent: '#d6a954',
  },
} as const;

export type TypographyRole =
  | 'display-title'
  | 'dialogue-speaker-dark'
  | 'dialogue-body-dark'
  | 'dialogue-translation-dark'
  | 'dialogue-speaker-light'
  | 'dialogue-body-light'
  | 'dialogue-translation-light'
  | 'hint-dark'
  | 'hint-light'
  | 'meta-dark'
  | 'meta-light';

const ROLE_KEY = '__gameTypographyRole';

export function setTypographyRole(
  text: Phaser.GameObjects.Text,
  role: TypographyRole,
): Phaser.GameObjects.Text {
  text.setData(ROLE_KEY, role);
  text.setResolution(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));

  const isDarkInk = role.endsWith('-dark');
  const isMeta = role.startsWith('meta');
  const isHint = role.startsWith('hint');
  const isSpeaker = role.startsWith('dialogue-speaker');
  const isTranslation = role.startsWith('dialogue-translation');
  const isBody = role.startsWith('dialogue-body');

  text.setFontFamily(isMeta || isHint || isSpeaker
    ? GAME_TYPOGRAPHY.fonts.body
    : GAME_TYPOGRAPHY.fonts.display);

  if (role === 'display-title') {
    text
      .setFontFamily(GAME_TYPOGRAPHY.fonts.display)
      .setColor(GAME_TYPOGRAPHY.colors.lightPrimary)
      .setStroke('#090705', 2)
      .setShadow(0, 3, '#000000', 5, true, true);
  } else if (isDarkInk) {
    text
      .setColor(
        isHint || isMeta
          ? GAME_TYPOGRAPHY.colors.inkSecondary
          : GAME_TYPOGRAPHY.colors.inkPrimary,
      )
      .setShadow(0, 1, 'rgba(244, 220, 174, 0.72)', 1, true, true);
  } else {
    text
      .setColor(
        isTranslation
          ? GAME_TYPOGRAPHY.colors.lightSecondary
          : isHint || isMeta
            ? GAME_TYPOGRAPHY.colors.lightMuted
            : GAME_TYPOGRAPHY.colors.lightPrimary,
      )
      .setStroke('#090705', isBody || isSpeaker ? 1.5 : 1)
      .setShadow(0, 2, '#000000', 3, true, true);
  }

  if (isSpeaker || isMeta) text.setFontStyle('bold');
  if (isTranslation) text.setFontStyle('bold');
  return text;
}

/** Gives legacy text consistent raster quality and contrast without changing layout. */
export function polishSceneTypography(scene: Phaser.Scene): void {
  const visit = (object: Phaser.GameObjects.GameObject): void => {
    if (object instanceof Phaser.GameObjects.Text) {
      if (object.getData(ROLE_KEY)) {
        setTypographyRole(object, object.getData(ROLE_KEY) as TypographyRole);
        return;
      }
      object.setResolution(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
      const rawColor = object.style.color;
      const color = typeof rawColor === 'string' ? rawColor.toLowerCase() : '#ffffff';
      const hex = /^#([0-9a-f]{6})$/.exec(color);
      if (hex) {
        const value = Number.parseInt(hex[1], 16);
        const luminance =
          ((value >> 16) * 0.299 + ((value >> 8) & 255) * 0.587 + (value & 255) * 0.114);
        if (luminance > 115) {
          object.setStroke('#080706', 1).setShadow(0, 2, '#000000', 2, true, true);
        } else {
          object.setShadow(0, 1, 'rgba(246, 221, 174, 0.45)', 1, true, true);
        }
      }
    }
    if (object instanceof Phaser.GameObjects.Container) {
      object.list.forEach((child) => visit(child));
    }
  };
  scene.children.list.forEach((child) => visit(child));
}

export class BilingualTextReveal {
  private timer?: Phaser.Time.TimerEvent;
  private englishCharacters: string[] = [];
  private chineseCharacters: string[] = [];
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly englishText: Phaser.GameObjects.Text,
    private readonly chineseText: Phaser.GameObjects.Text,
    private readonly onLayout?: () => void,
    private readonly intervalMs = 18,
  ) {}

  show(english: string, chinese: string): void {
    this.timer?.remove(false);
    this.englishCharacters = Array.from(english);
    this.chineseCharacters = Array.from(chinese);

    // Measure the final wrapped bounds once so the Chinese line never jumps while typing.
    this.englishText.setText(english);
    this.chineseText.setText(chinese);
    this.onLayout?.();
    this.englishText.setText('');
    this.chineseText.setText('');

    const longest = Math.max(this.englishCharacters.length, this.chineseCharacters.length);
    if (longest === 0) {
      this.active = false;
      return;
    }
    this.active = true;
    let step = 0;
    this.timer = this.scene.time.addEvent({
      delay: this.intervalMs,
      repeat: longest - 1,
      callback: () => {
        step += 1;
        const progress = step / longest;
        const englishLength = Math.ceil(this.englishCharacters.length * progress);
        const chineseLength = Math.ceil(this.chineseCharacters.length * progress);
        this.englishText.setText(this.englishCharacters.slice(0, englishLength).join(''));
        this.chineseText.setText(this.chineseCharacters.slice(0, chineseLength).join(''));
        if (step >= longest) {
          this.active = false;
          this.timer = undefined;
        }
      },
    });
  }

  /** Returns true when an active reveal was completed by this call. */
  complete(): boolean {
    if (!this.active) return false;
    this.timer?.remove(false);
    this.timer = undefined;
    this.active = false;
    this.englishText.setText(this.englishCharacters.join(''));
    this.chineseText.setText(this.chineseCharacters.join(''));
    this.onLayout?.();
    return true;
  }

  destroy(): void {
    this.timer?.remove(false);
    this.timer = undefined;
    this.active = false;
  }
}

export function revealPanel(
  scene: Phaser.Scene,
  panel: Phaser.GameObjects.Container,
  duration = 190,
): void {
  const finalY = panel.y;
  scene.tweens.killTweensOf(panel);
  panel.setVisible(true).setAlpha(0).setY(finalY + 9);
  scene.tweens.add({
    targets: panel,
    alpha: 1,
    y: finalY,
    duration,
    ease: 'Cubic.Out',
  });
}
