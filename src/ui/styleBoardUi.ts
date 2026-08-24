import Phaser from 'phaser';
import { VISUAL_THEME } from '../visuals/visualTheme';
import { setTypographyRole } from './gameTypography';

export const UI_STYLE_BOARD = {
  colors: {
    backdrop: 0x080a08,
    panel: 0x11110f,
    panelWarm: 0x1d1812,
    panelHover: 0x332619,
    panelPressed: 0x17130f,
    lineDark: 0x4c3825,
    line: 0x9c7240,
    lineBright: 0xc08b48,
    focus: 0xd39a42,
    text: '#ddc9aa',
    textBright: '#f0dbb9',
    muted: '#a99678',
    danger: 0x8d241d,
    dangerBright: 0xc34735,
    abnormal: 0x40583f,
    disabled: 0x484846,
    disabledText: '#7f7a70',
  },
  fonts: VISUAL_THEME.fonts,
  sizes: {
    smallPanel: { width: 240, height: 80 },
    mediumPanel: { width: 480, height: 180 },
    largePanel: { width: 720, height: 360 },
  },
} as const;

export type StyleBoardPanelVariant = 'thin' | 'standard' | 'carved' | 'danger';
export type StyleBoardButtonState =
  | 'default'
  | 'hover'
  | 'pressed'
  | 'focused'
  | 'disabled'
  | 'selected'
  | 'loading';
export type StyleBoardButtonKind = 'primary' | 'secondary' | 'danger';

export function createStyleBoardPanel(
  scene: Phaser.Scene,
  width: number,
  height: number,
  variant: StyleBoardPanelVariant = 'standard',
  alpha = 0.96,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  drawStyleBoardPanel(graphics, width, height, variant, alpha);
  return graphics;
}

export function drawStyleBoardPanel(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: StyleBoardPanelVariant = 'standard',
  alpha = 0.96,
): void {
  const palette = UI_STYLE_BOARD.colors;
  const left = -width / 2;
  const top = -height / 2;
  const right = width / 2;
  const bottom = height / 2;
  const carved = variant === 'carved';
  const danger = variant === 'danger';
  const border = danger ? palette.dangerBright : palette.line;
  const bright = danger ? 0xdc5a43 : palette.lineBright;
  const corner = Math.min(carved ? 24 : 15, width * 0.12, height * 0.24);

  graphics.clear();
  graphics.fillStyle(carved ? palette.panelWarm : palette.panel, alpha);
  graphics.fillRect(left, top, width, height);
  graphics.fillStyle(0x000000, carved ? 0.2 : 0.12);
  graphics.fillRect(left + 5, top + 5, width - 10, height - 10);

  graphics.lineStyle(1, palette.lineDark, 0.95);
  graphics.strokeRect(left, top, width, height);
  graphics.lineStyle(variant === 'thin' ? 1 : 2, border, variant === 'thin' ? 0.72 : 0.92);
  graphics.strokeRect(left + 3, top + 3, width - 6, height - 6);
  graphics.lineStyle(1, bright, carved ? 0.48 : 0.28);
  graphics.strokeRect(left + 7, top + 7, width - 14, height - 14);

  drawPixelCorner(graphics, left + 3, top + 3, 1, 1, corner, bright, carved);
  drawPixelCorner(graphics, right - 3, top + 3, -1, 1, corner, bright, carved);
  drawPixelCorner(graphics, left + 3, bottom - 3, 1, -1, corner, bright, carved);
  drawPixelCorner(graphics, right - 3, bottom - 3, -1, -1, corner, bright, carved);

  if (carved && width >= 320 && height >= 150) {
    graphics.lineStyle(1, border, 0.2);
    graphics.lineBetween(left + corner + 12, top + 11, right - corner - 12, top + 11);
    graphics.lineBetween(left + corner + 12, bottom - 11, right - corner - 12, bottom - 11);
  }
}

export function createStyleBoardButtonBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  state: StyleBoardButtonState = 'default',
  kind: StyleBoardButtonKind = 'primary',
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  drawStyleBoardButton(graphics, width, height, state, kind);
  return graphics;
}

export function drawStyleBoardButton(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  state: StyleBoardButtonState,
  kind: StyleBoardButtonKind = 'primary',
): void {
  const palette = UI_STYLE_BOARD.colors;
  const left = -width / 2;
  const top = -height / 2;
  const isDanger = kind === 'danger';
  const disabled = state === 'disabled';
  const focused = state === 'focused' || state === 'selected' || state === 'loading';
  const fill = disabled
    ? palette.disabled
    : isDanger
      ? state === 'pressed'
        ? 0x4d1512
        : 0x5d1c17
      : state === 'hover' || focused
        ? palette.panelHover
        : state === 'pressed'
          ? palette.panelPressed
          : palette.panelWarm;
  const border = disabled
    ? 0x5c5a55
    : isDanger
      ? palette.dangerBright
      : focused
        ? palette.focus
        : state === 'hover'
          ? palette.lineBright
          : palette.line;

  graphics.clear();
  graphics.fillStyle(fill, disabled ? 0.72 : 0.98);
  graphics.fillRect(left, top, width, height);
  graphics.fillStyle(0x000000, state === 'pressed' ? 0.28 : 0.13);
  graphics.fillRect(left + 4, top + 4, width - 8, height - 8);
  graphics.lineStyle(focused ? 2 : 1, border, disabled ? 0.55 : 0.95);
  graphics.strokeRect(left + 1, top + 1, width - 2, height - 2);
  graphics.lineStyle(1, isDanger ? 0x7a2a22 : palette.lineDark, 0.92);
  graphics.strokeRect(left + 5, top + 5, width - 10, height - 10);

  const notch = Math.min(9, height * 0.2);
  graphics.lineStyle(1, border, disabled ? 0.4 : 0.9);
  for (const [x, y, sx, sy] of [
    [left + 2, top + 2, 1, 1],
    [left + width - 2, top + 2, -1, 1],
    [left + 2, top + height - 2, 1, -1],
    [left + width - 2, top + height - 2, -1, -1],
  ] as const) {
    graphics.lineBetween(x, y + sy * notch, x, y);
    graphics.lineBetween(x, y, x + sx * notch, y);
  }

  if (state === 'selected') {
    graphics.lineStyle(2, palette.focus, 0.95);
    const dash = 8;
    for (let x = left + 8; x < left + width - 8; x += dash * 2) {
      graphics.lineBetween(x, top - 3, Math.min(x + dash, left + width - 8), top - 3);
      graphics.lineBetween(x, top + height + 3, Math.min(x + dash, left + width - 8), top + height + 3);
    }
  }
  if (state === 'loading') {
    graphics.fillStyle(palette.focus, 0.82);
    graphics.fillCircle(left + width - 16, 0, 3);
    graphics.lineStyle(1, palette.focus, 0.55);
    graphics.strokeCircle(left + width - 16, 0, 7);
  }
}

export function styleBoardButtonTextColor(
  state: StyleBoardButtonState,
  kind: StyleBoardButtonKind = 'primary',
): string {
  if (state === 'disabled') return UI_STYLE_BOARD.colors.disabledText;
  if (kind === 'danger') return state === 'focused' || state === 'hover'
    ? '#f2c1ae'
    : '#ddb19d';
  return state === 'focused' || state === 'hover' || state === 'selected' || state === 'loading'
    ? UI_STYLE_BOARD.colors.textBright
    : UI_STYLE_BOARD.colors.text;
}

export function createStyleBoardKeycap(
  scene: Phaser.Scene,
  label: string,
  width = 28,
  height = 28,
): Phaser.GameObjects.Container {
  const background = createStyleBoardButtonBackground(scene, width, height, 'default', 'secondary');
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: UI_STYLE_BOARD.fonts.sans,
      fontSize: `${Math.min(14, height - 10)}px`,
      fontStyle: 'bold',
      color: UI_STYLE_BOARD.colors.textBright,
    })
    .setOrigin(0.5);
  setTypographyRole(text, 'hint-light');
  return scene.add.container(0, 0, [background, text]);
}

export function createStyleBoardPrompt(
  scene: Phaser.Scene,
  key: string,
  label: string,
  width = 210,
  height = 42,
): Phaser.GameObjects.Container {
  const background = createStyleBoardPanel(scene, width, height, 'thin', 0.94);
  const keycap = createStyleBoardKeycap(scene, key, 28, 28).setX(-width / 2 + 24);
  const text = scene.add
    .text(-width / 2 + 46, 0, label, {
      fontFamily: UI_STYLE_BOARD.fonts.sans,
      fontSize: '14px',
      color: UI_STYLE_BOARD.colors.text,
      wordWrap: { width: width - 60 },
      maxLines: 2,
      lineSpacing: -3,
    })
    .setOrigin(0, 0.5);
  if (text.displayWidth > width - 60) {
    text.setFontSize(12);
  }
  setTypographyRole(text, 'hint-light');
  return scene.add.container(0, 0, [background, keycap, text]).setData('label', text);
}

function drawPixelCorner(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  sx: 1 | -1,
  sy: 1 | -1,
  size: number,
  color: number,
  carved: boolean,
): void {
  graphics.lineStyle(carved ? 2 : 1, color, carved ? 0.92 : 0.78);
  graphics.lineBetween(x, y + sy * size, x, y);
  graphics.lineBetween(x, y, x + sx * size, y);
  graphics.lineBetween(x + sx * 5, y + sy * size, x + sx * 5, y + sy * 7);
  graphics.lineBetween(x + sx * size, y + sy * 5, x + sx * 7, y + sy * 5);
  if (carved) {
    graphics.fillStyle(color, 0.72);
    graphics.fillRect(x + sx * 7 - (sx < 0 ? 4 : 0), y + sy * 7 - (sy < 0 ? 4 : 0), 4, 4);
    graphics.lineStyle(1, color, 0.55);
    graphics.lineBetween(x + sx * 9, y + sy * 9, x + sx * (size - 4), y + sy * 9);
    graphics.lineBetween(x + sx * 9, y + sy * 9, x + sx * 9, y + sy * (size - 4));
  }
}
