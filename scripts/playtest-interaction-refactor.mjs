import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootUrl = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/interaction-refactor';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const sceneEval = async (key, fn, arg) => page.evaluate(({ key, source, arg }) => {
  const scene = window.__GAME__.scene.getScene(key);
  return Function('scene', 'arg', `return (${source})(scene, arg)`)(scene, arg);
}, { key, source: fn.toString(), arg });

await page.goto(`${rootUrl}?scene=tomb`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('TombScene'));
await sceneEval('TombScene', (scene) => {
  scene.arrivalIntroductionActive = false;
  scene.arrivalPanel?.setVisible(false);
  scene.tutorialPhase = 'objective-active';
  scene.player.setMovementEnabled(true);
});
await page.waitForTimeout(180);

const velocity = () => sceneEval('TombScene', (scene) => {
  const value = scene.player.getMovementVelocity();
  return { x: value.x, y: value.y, speed: value.length(), animation: scene.player.getAnimationState() };
});
await page.keyboard.down('KeyW');
await page.waitForTimeout(50);
const response50ms = await velocity();
await page.waitForTimeout(300);
const straight = await velocity();
await page.keyboard.down('KeyD');
await page.waitForTimeout(260);
const diagonal = await velocity();
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyD');
const releaseStarted = performance.now();
let stoppedAfterMs = -1;
for (let index = 0; index < 10; index += 1) {
  await page.waitForTimeout(20);
  const sample = await velocity();
  if (sample.speed < 1) { stoppedAfterMs = performance.now() - releaseStarted; break; }
}

await page.keyboard.down('KeyA');
await page.waitForTimeout(100);
await page.evaluate(() => window.dispatchEvent(new Event('blur')));
await page.waitForTimeout(50);
const afterBlur = await velocity();
await page.keyboard.up('KeyA');
await page.waitForTimeout(350);
const cameraA = await sceneEval('TombScene', (scene) => ({ x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY }));
await page.waitForTimeout(220);
const cameraB = await sceneEval('TombScene', (scene) => ({ x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY }));

await sceneEval('TombScene', (scene) => {
  scene.__acceptedConfirmCount = 0;
  scene.inputActions.on('accepted', (action) => {
    if (action === 'confirm') scene.__acceptedConfirmCount += 1;
  });
});
for (let index = 0; index < 30; index += 1) await page.keyboard.press('KeyE', { delay: 1 });
await page.waitForTimeout(240);
const rapidConfirm = await sceneEval('TombScene', (scene) => ({
  accepted: scene.__acceptedConfirmCount,
  scene: scene.scene.key,
  phase: scene.tutorialPhase,
  buffered: scene.inputActions.getDebugSnapshot().buffered,
}));

const listenersBefore = await sceneEval('TombScene', (scene) => scene.input.keyboard.listenerCount('keydown'));
await sceneEval('TombScene', (scene) => scene.scene.restart({ appearanceId: scene.appearanceId }));
await page.waitForTimeout(550);
const listenersAfter = await sceneEval('TombScene', (scene) => scene.input.keyboard.listenerCount('keydown'));

await page.goto(`${rootUrl}?scene=shopgrowth`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await sceneEval('ShopGrowthScene', (scene) => scene.handleStation('incoming'));
await sceneEval('ShopGrowthScene', (scene) => scene.handleStation('workbench'));
await page.waitForTimeout(220);
await page.mouse.move(420, 390);
await page.mouse.down();
await page.mouse.move(470, 390, { steps: 4 });
await sceneEval('ShopGrowthScene', (scene) => scene.input.emit('gameout'));
await page.waitForTimeout(80);
const cleaningAfterGameOut = await sceneEval('ShopGrowthScene', (scene) => scene.cleaningController?.isDragging() ?? false);
await page.mouse.up();
await page.mouse.click(790, 655);
await page.waitForTimeout(320);
await page.mouse.move(420, 390);
await page.mouse.down();
await page.mouse.move(500, 390, { steps: 4 });
await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })));
await page.waitForTimeout(80);
const inspectionAfterOutsideUp = await sceneEval('ShopGrowthScene', (scene) => scene.inspectionController?.isDragging() ?? false);

const fpsSamples = [];
for (let index = 0; index < 10; index += 1) {
  await page.waitForTimeout(100);
  fpsSamples.push(await sceneEval('ShopGrowthScene', (scene) => scene.game.loop.actualFps));
}

await page.goto(rootUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('MainMenuScene'));
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('StoryIntroScene'));
const transition = await sceneEval('StoryIntroScene', (scene) => scene.registry.get('__interactionTransitionRecord'));
const storyBefore = await sceneEval('StoryIntroScene', (scene) => ({ index: scene.actIndex, typing: scene.typewriterActive }));
await page.mouse.click(640, 360);
await page.waitForTimeout(40);
const storyFirstInput = await sceneEval('StoryIntroScene', (scene) => ({ index: scene.actIndex, typing: scene.typewriterActive }));
await page.waitForTimeout(170);
await page.mouse.click(640, 360);
await page.waitForTimeout(380);
const storySecondInput = await sceneEval('StoryIntroScene', (scene) => ({ index: scene.actIndex, typing: scene.typewriterActive }));

const report = {
  errors,
  movement: {
    response50ms,
    straight,
    diagonal,
    diagonalRatio: diagonal.speed / Math.max(1, straight.speed),
    stoppedAfterMs,
    afterBlur,
  },
  cameraJitterPixels: Math.hypot(cameraB.x - cameraA.x, cameraB.y - cameraA.y),
  rapidConfirm,
  listeners: { beforeRestart: listenersBefore, afterRestart: listenersAfter },
  dragSafety: { cleaningAfterGameOut, inspectionAfterOutsideUp },
  averageFps: fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length,
  transition,
  dialogue: { storyBefore, storyFirstInput, storySecondInput },
};
await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
