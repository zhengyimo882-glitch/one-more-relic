import Phaser from 'phaser';

export type GameLanguage = 'zh-CN' | 'en';

let selectedLanguage: GameLanguage | undefined;

const textState = new WeakMap<
  Phaser.GameObjects.Text,
  { raw: string | string[]; localized: string; languageHidden: boolean }
>();
const pairedText = new WeakMap<Phaser.GameObjects.Text, Phaser.GameObjects.Text>();

const CJK_PATTERN = /[\u3400-\u9fff]/u;
const CJK_GLOBAL_PATTERN = /[\u3400-\u9fff]+/gu;
const CHINESE_PUNCTUATION_PATTERN = /[，。！？；：“”‘’、【】《》（）]/gu;
const CONTROL_TOKENS = new Set([
  'E', 'ENTER', 'ESC', 'SPACE', 'TAB', 'WASD', 'W', 'A', 'S', 'D', 'F', 'B',
  'Q', 'R', 'SHIFT', 'CTRL', 'ALT', 'UP', 'DOWN', 'LEFT', 'RIGHT',
]);

export function setGameLanguage(language: GameLanguage): void {
  selectedLanguage = language;
}

export function getGameLanguage(): GameLanguage | undefined {
  return selectedLanguage;
}

export function isChineseLanguage(): boolean {
  return selectedLanguage === 'zh-CN';
}

export function localize(english: string, chinese: string): string {
  return selectedLanguage === 'zh-CN' ? chinese : english;
}

function cleanSeparators(value: string): string {
  return value
    .replace(/\s*\/\s*\/+/g, ' / ')
    .replace(/^\s*[\/|·—–-]+\s*/g, '')
    .replace(/\s*[\/|·—–-]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function englishLine(line: string): string {
  if (!CJK_PATTERN.test(line)) return cleanSeparators(line);
  return cleanSeparators(
    line.replace(CJK_GLOBAL_PATTERN, '').replace(CHINESE_PUNCTUATION_PATTERN, ''),
  );
}

function chineseLine(line: string): string {
  if (!CJK_PATTERN.test(line)) {
    const words = line.match(/[A-Za-z]+/g) ?? [];
    const hasOnlyControls = words.length > 0 && words.every((word) => CONTROL_TOKENS.has(word.toUpperCase()));
    const hasNoWords = words.length === 0;
    return hasOnlyControls || hasNoWords ? line : '';
  }

  const withoutEnglish = line.replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, (word) =>
    CONTROL_TOKENS.has(word.toUpperCase()) ? word.toUpperCase() : '',
  );
  return cleanSeparators(withoutEnglish);
}

export function localizeRuntimeText(value: string | string[]): string {
  const source = Array.isArray(value) ? value.join('\n') : value;
  const transform = selectedLanguage === 'zh-CN' ? chineseLine : englishLine;
  return source
    .split('\n')
    .map(transform)
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join('\n')
    .trim();
}

function rawText(text: Phaser.GameObjects.Text): string {
  const existing = textState.get(text);
  const current = text.text;
  const raw = existing && current === existing.localized ? existing.raw : current;
  return Array.isArray(raw) ? raw.join('\n') : raw;
}

function containsLanguageEnglish(value: string): boolean {
  const words = value.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [];
  return words.some((word) => !CONTROL_TOKENS.has(word.toUpperCase()));
}

function isEnglishSlot(text: Phaser.GameObjects.Text): boolean {
  const value = rawText(text);
  return Boolean(value) && !CJK_PATTERN.test(value) && containsLanguageEnglish(value);
}

function isChineseSlot(text: Phaser.GameObjects.Text): boolean {
  const value = rawText(text);
  return CJK_PATTERN.test(value) && !containsLanguageEnglish(value);
}

function pairSiblingTexts(texts: Phaser.GameObjects.Text[]): void {
  const english = texts.filter((text) => isEnglishSlot(text) && !pairedText.has(text));
  const chinese = texts.filter((text) => isChineseSlot(text) && !pairedText.has(text));

  for (const chineseText of chinese) {
    const chineseIndex = texts.indexOf(chineseText);
    let best: Phaser.GameObjects.Text | undefined;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const englishText of english) {
      if (pairedText.has(englishText)) continue;
      const englishIndex = texts.indexOf(englishText);
      const indexDistance = Math.abs(chineseIndex - englishIndex);
      const yDistance = Math.abs(chineseText.y - englishText.y);
      const xDistance = Math.abs(chineseText.x - englishText.x);
      const adjacentPair = indexDistance === 1;
      if (indexDistance > 4 || yDistance > 170 || (!adjacentPair && xDistance > 220)) continue;
      const score = indexDistance * 48 + yDistance + xDistance * (adjacentPair ? 0.04 : 0.2);
      if (score < bestScore) {
        best = englishText;
        bestScore = score;
      }
    }

    if (best) {
      pairedText.set(chineseText, best);
      pairedText.set(best, chineseText);
    }
  }
}

function copySharedLayout(
  target: Phaser.GameObjects.Text,
  anchor: Phaser.GameObjects.Text,
): void {
  if (target.x !== anchor.x || target.y !== anchor.y) target.setPosition(anchor.x, anchor.y);
  if (target.originX !== anchor.originX || target.originY !== anchor.originY) {
    target.setOrigin(anchor.originX, anchor.originY);
  }
  if (target.style.fontFamily !== anchor.style.fontFamily) {
    target.setFontFamily(anchor.style.fontFamily);
  }
  if (target.style.fontSize !== anchor.style.fontSize) target.setFontSize(anchor.style.fontSize);
  if (target.style.fontStyle !== anchor.style.fontStyle) target.setFontStyle(anchor.style.fontStyle);
  if (target.style.align !== anchor.style.align) target.setAlign(anchor.style.align);
  if (target.letterSpacing !== anchor.letterSpacing) {
    target.setLetterSpacing(anchor.letterSpacing);
  }
  if (
    target.style.wordWrapWidth !== anchor.style.wordWrapWidth ||
    target.style.wordWrapUseAdvanced !== anchor.style.wordWrapUseAdvanced
  ) {
    target.setWordWrapWidth(anchor.style.wordWrapWidth, anchor.style.wordWrapUseAdvanced);
  }
  if (target.lineSpacing !== anchor.lineSpacing) target.setLineSpacing(anchor.lineSpacing);
}

function applyTextLanguage(text: Phaser.GameObjects.Text): void {
  const existing = textState.get(text);
  const current = text.text;
  const raw = existing && current === existing.localized ? existing.raw : current;
  const partner = pairedText.get(text);
  let localized: string;

  if (partner) {
    const textIsChinese = isChineseSlot(text);
    const selected = selectedLanguage === 'zh-CN' ? textIsChinese : !textIsChinese;
    localized = selected ? (Array.isArray(raw) ? raw.join('\n') : raw) : '';
    if (selectedLanguage === 'zh-CN' && textIsChinese) copySharedLayout(text, partner);
  } else {
    localized = localizeRuntimeText(raw);
  }

  const languageHidden = localized.length === 0;
  textState.set(text, { raw, localized, languageHidden });
  if (current !== localized) text.setText(localized);
  if (languageHidden) {
    text.setVisible(false);
  } else if (existing?.languageHidden) {
    text.setVisible(true);
  }
}

function processSiblings(objects: Phaser.GameObjects.GameObject[]): void {
  const texts = objects.filter(
    (object): object is Phaser.GameObjects.Text => object instanceof Phaser.GameObjects.Text,
  );
  pairSiblingTexts(texts);
  texts.forEach(applyTextLanguage);
  objects.forEach((object) => {
    if (object instanceof Phaser.GameObjects.Container) processSiblings(object.list);
  });
}

function applyLanguageToScene(scene: Phaser.Scene): void {
  if (!selectedLanguage || scene.scene.key === 'LanguageSelectScene' || scene.scene.key === 'MainMenuScene') {
    return;
  }

  processSiblings(scene.children.list);
}

export function installGameLanguageFilter(game: Phaser.Game): void {
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    if (!selectedLanguage) return;
    game.scene.getScenes(true).forEach(applyLanguageToScene);
  });
}
