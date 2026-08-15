import { UI_STYLE_BOARD } from './styleBoardUi';

export const SHOP_UI = {
  colors: {
    ink: UI_STYLE_BOARD.colors.panel,
    inkSoft: UI_STYLE_BOARD.colors.panelWarm,
    paper: 0xd1bb91,
    paperDark: 0xa88b5f,
    text: UI_STYLE_BOARD.colors.textBright,
    muted: UI_STYLE_BOARD.colors.muted,
    gold: UI_STYLE_BOARD.colors.line,
    cinnabar: 0x8f392d,
    danger: UI_STYLE_BOARD.colors.dangerBright,
    focus: UI_STYLE_BOARD.colors.focus,
  },
  alpha: { hud: 0.78, panel: 0.97, prompt: 0.92 },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 },
  type: { caption: '13px', body: '16px', title: '25px', display: '32px' },
  border: { normal: 1, focus: 2 },
  motion: { fast: 160, normal: 320, slow: 700 },
} as const;
