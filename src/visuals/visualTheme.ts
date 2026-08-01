export const VISUAL_THEME = {
  colors: {
    inkBlack: 0x121411,
    softInk: 0x22251f,
    oldPaper: 0xd8c9a7,
    mutedPaper: 0xb7ab91,
    darkWood: 0x493525,
    woodEdge: 0xa17b55,
    lanternOrange: 0xb9783f,
    antiqueGold: 0xb39a68,
    corpseGreen: 0x68766c,
    tombBlue: 0x596a70,
    cinnabar: 0x6f3f38,
    coldStone: 0x4d5550,
  },
  fonts: {
    serif:
      'Georgia, "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
    sans:
      'Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
  },
  stroke: {
    subtleAlpha: 0.42,
    clearAlpha: 0.82,
    width: 1.5,
  },
  shadow: {
    color: 0x090a08,
    alpha: 0.46,
  },
  panel: {
    color: 0x171612,
    alpha: 0.94,
    border: 0xb29f7b,
  },
  depth: {
    backgroundTexture: -2,
    background: -1,
    floorLight: 0.45,
    worldDust: 4.8,
    foreground: 6.6,
    vignette: 7.8,
    ui: 10,
    transition: 220,
  },
} as const;

export type VisualSceneStyle = 'antique-shop' | 'tomb';
