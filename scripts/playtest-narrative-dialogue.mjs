import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootUrl = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/narrative-dialogue';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const sceneEval = async (sceneKey, fn) => page.evaluate(({ sceneKey, source }) => {
  const scene = window.__GAME__.scene.getScene(sceneKey);
  return Function('scene', `return (${source})(scene)`)(scene);
}, { sceneKey, source: fn.toString() });

await page.goto(rootUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__);
await page.evaluate(() => window.__GAME__.scene.start('StoryIntroScene'));
await page.waitForFunction(() => window.__GAME__.scene.isActive('StoryIntroScene'));
await page.waitForTimeout(500);
const storyIndexBeforeComplete = await sceneEval('StoryIntroScene', (scene) => scene.actIndex);
await page.mouse.click(640, 340); // Complete the current reveal only.
await page.waitForTimeout(80);
await page.screenshot({ path: `${out}/01_story_unemployed.png` });
const storyIndexAfterComplete = await sceneEval('StoryIntroScene', (scene) => scene.actIndex);
const storyStart = await sceneEval('StoryIntroScene', (scene) => ({
  act: scene.actIndex,
  texture: scene.visual?.texture?.key,
}));
await page.mouse.click(640, 340);
await page.waitForTimeout(450);
await page.mouse.click(640, 340);
await page.waitForTimeout(80);
await page.screenshot({ path: `${out}/02_story_tally.png` });
await page.mouse.click(640, 340);
await page.waitForTimeout(450);
await page.mouse.click(640, 340);
await page.waitForTimeout(80);
await page.screenshot({ path: `${out}/03_story_shop.png` });
const storyEnd = await sceneEval('StoryIntroScene', (scene) => ({
  act: scene.actIndex,
  texture: scene.visual?.texture?.key,
}));

await page.goto(`${rootUrl}?scene=shopintro`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopIntroductionScene'));
await sceneEval('ShopIntroductionScene', (scene) => scene.beginFirstConversation());
await page.waitForTimeout(150);
const dialogueBefore = await sceneEval('ShopIntroductionScene', (scene) => scene.dialogueIndex);
await page.mouse.click(640, 595);
await page.waitForTimeout(80);
const dialogueAfterComplete = await sceneEval('ShopIntroductionScene', (scene) => scene.dialogueIndex);
await page.screenshot({ path: `${out}/04_intro_dialogue_complete.png` });
await page.mouse.click(640, 595);
await page.waitForTimeout(180);
const dialogueAfterAdvance = await sceneEval('ShopIntroductionScene', (scene) => scene.dialogueIndex);
await sceneEval('ShopIntroductionScene', (scene) => scene.openResponseChoice());
await page.mouse.move(885, 604);
await page.waitForTimeout(120);
const introHover = await sceneEval('ShopIntroductionScene', (scene) => scene.selectedChoice);
await page.screenshot({ path: `${out}/05_intro_choice_hover.png` });
await page.mouse.click(885, 604);
await page.waitForTimeout(180);
const introClick = await sceneEval('ShopIntroductionScene', (scene) => ({
  response: scene.firstMeetingResponse,
  phase: scene.phase,
}));

await page.goto(`${rootUrl}?scene=shop`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('AntiqueShopScene'));
await sceneEval('AntiqueShopScene', (scene) => scene.openResponseChoice());
await page.mouse.move(870, 605);
await page.waitForTimeout(120);
const returnHover = await sceneEval('AntiqueShopScene', (scene) => scene.choiceIndex);
await page.screenshot({ path: `${out}/06_return_choice_hover.png` });
await page.mouse.click(870, 605);
await page.waitForTimeout(180);
const returnClick = await sceneEval('AntiqueShopScene', (scene) => ({
  response: scene.shopkeeperResponse,
  phase: scene.phase,
  dialogueIndex: scene.conversationIndex,
}));
await page.mouse.click(640, 596);
await page.waitForTimeout(80);
const returnDialogueAfterComplete = await sceneEval('AntiqueShopScene', (scene) => scene.conversationIndex);
await page.screenshot({ path: `${out}/07_return_dialogue_complete.png` });
await page.mouse.click(640, 596);
await page.waitForTimeout(150);
const returnDialogueAfterAdvance = await sceneEval('AntiqueShopScene', (scene) => scene.conversationIndex);

await page.goto(`${rootUrl}?scene=shopgrowth`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await sceneEval('ShopGrowthScene', (scene) => scene.openAtlas());
await page.waitForTimeout(2600);
await page.screenshot({ path: `${out}/08_myriad_atlas_reveal.png` });
const atlas = await sceneEval('ShopGrowthScene', (scene) => ({
  focus: scene.focusMode,
  artImages: scene.focusLayer?.list?.filter((item) => item.texture?.key === 'narrative-myriad-atlas-reveal').length ?? 0,
}));

await page.goto(`${rootUrl}?scene=tomb`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('TombScene'));
await page.waitForTimeout(350);
const tombArrivalBefore = await sceneEval('TombScene', (scene) => scene.arrivalIntroductionIndex);
await page.mouse.click(640, 154);
await page.waitForTimeout(80);
const tombArrivalAfterComplete = await sceneEval('TombScene', (scene) => scene.arrivalIntroductionIndex);
await page.screenshot({ path: `${out}/09_tomb_arrival_complete.png` });
await page.mouse.click(640, 154);
await page.waitForTimeout(120);
const tombArrivalAfterAdvance = await sceneEval('TombScene', (scene) => scene.arrivalIntroductionIndex);

const report = {
  errors,
  storyFirstClickOnlyCompleted: storyIndexBeforeComplete === storyIndexAfterComplete,
  storyStart,
  storyEnd,
  introFirstClickOnlyCompleted: dialogueAfterComplete === dialogueBefore,
  introSecondClickAdvanced: dialogueAfterAdvance === dialogueBefore + 1,
  introHover,
  introClick,
  returnHover,
  returnClick,
  returnFirstClickOnlyCompleted: returnDialogueAfterComplete === returnClick.dialogueIndex,
  returnSecondClickAdvanced: returnDialogueAfterAdvance === returnClick.dialogueIndex + 1,
  atlas,
  tombFirstClickOnlyCompleted: tombArrivalAfterComplete === tombArrivalBefore,
  tombSecondClickAdvanced: tombArrivalAfterAdvance === tombArrivalBefore + 1,
};
await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
