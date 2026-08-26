export const UI_TOKENS = {
  theme: {
    dark: { panel: 0x171714, panelAlpha: 0.94, text: '#e8dcc0' },
    paper: { panel: 0xc8b184, panelAlpha: 0.98, text: '#24170f' },
  },
  colors: {
    brass: 0x8f6a32,
    brassHighlight: 0xd0a85a,
    verdigris: 0x55766c,
    cinnabar: 0x8e392e,
    mutedDark: '#a99b7f',
    mutedPaper: '#5b422d',
  },
  geometry: {
    cutCorner: 8,
    border: 2,
    panelPadding: 24,
    contentMaxWidth: 720,
    titleBarHeight: 40,
    actionSafeArea: 72,
    buttonHeight: 44,
    iconSize: 32,
    inventorySlot: 112,
    inventoryGap: 16,
  },
  typography: {
    chineseFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    englishFamily: 'Arial, sans-serif',
    displayFamily: 'Georgia, "Noto Serif SC", serif',
    titleFontSize: 28,
    englishBodySize: 17,
    chineseBodySize: 18,
    labelSize: 14,
    lineHeight: 1.48,
    paragraphGap: 12,
    maxBodyLines: 11,
  },
  motion: { fast: 150, normal: 240, messageLifetime: 3200, hudDimAlpha: 0.25 },
  textures: {
    darkPanel: 'assets/art-v2/ui/dark-brass-panel-v2.png',
    paperPanel: 'assets/art-v2/ui/old-paper-panel-v2.png',
  },
} as const;

