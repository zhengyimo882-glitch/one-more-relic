import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = 'artifacts/shop-growth-refactor';
const url = 'http://127.0.0.1:4173/one-more-relic/?scene=shopgrowth';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const sceneEval = async (fn, arg) => page.evaluate(({ source, arg }) => {
  const game = window.__GAME__;
  const scene = game.scene.getScene('ShopGrowthScene');
  return Function('scene', 'arg', `return (${source})(scene, arg)`)(scene, arg);
}, { source: fn.toString(), arg });
const move = async (x, y) => sceneEval((scene, p) => scene.player.setPosition(p.x, p.y), { x, y });
const station = async (id) => { await sceneEval((scene, id) => scene.handleStation(id), id); await page.waitForTimeout(220); };
const focusInput = async (confirm, left, right, up = false, down = false) => { await sceneEval((scene, p) => scene.updateFocusInput(p.confirm, p.left, p.right, p.up, p.down), { confirm, left, right, up, down }); await page.waitForTimeout(80); };
const clean = async (fast = false) => {
  if (fast) await page.mouse.click(660, 625);
  await page.mouse.move(562, 348); await page.mouse.down();
  for (const [x, y] of [[618,323],[688,336],[724,380],[578,418],[642,432],[710,444],[652,382],[536,390]]) {
    await page.mouse.move(x, y, { steps: 4 });
  }
  await page.mouse.up(); await page.waitForTimeout(650);
};
const inspect = async () => {
  await focusInput(false, true, false); await page.mouse.click(468, 355);
  await focusInput(false, false, true); await focusInput(false, false, true); await page.mouse.click(632, 425);
  await page.waitForTimeout(150);
};

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await shot('01-free-roam-1280x720');

await station('incoming'); await shot('02-relic-carried');
await station('workbench'); await shot('03-cleaning');
await clean(false); await shot('04-inspection');
await inspect(); await shot('05-evidence-found');
await page.mouse.click(900, 608); await page.waitForTimeout(150); await shot('06-appraisal');
await page.mouse.click(870, 430); await page.waitForTimeout(350);
await station('research');

await station('incoming'); await station('workbench');
await clean(true); await inspect(); await page.mouse.click(900, 608); await page.waitForTimeout(100);
await page.mouse.click(870, 430); await page.waitForTimeout(200); await shot('07-disposition');
await page.mouse.click(915, 285); await page.waitForTimeout(200);
await station('collect'); await shot('08-collected-in-shop');

await station('atlas'); await page.waitForTimeout(1900); await shot('09-atlas-event');
await sceneEval((scene) => scene.closeFocus()); await page.waitForTimeout(200);
await station('display'); await page.waitForTimeout(900); await shot('10-growth-reveal');
await sceneEval((scene) => { scene.scene.pause(); scene.scene.launch('PauseMenuScene', { sourceSceneKey: 'ShopGrowthScene' }); });
await page.waitForTimeout(250); await shot('11-pause');
await sceneEval((scene) => { scene.scene.resume('ShopGrowthScene'); scene.scene.stop('PauseMenuScene'); });
await page.waitForTimeout(250);

await page.setViewportSize({ width: 960, height: 600 }); await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene')); await shot('12-free-roam-16x10');
await page.setViewportSize({ width: 960, height: 540 }); await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene')); await shot('13-free-roam-16x9-low');

const state = await sceneEval((scene) => {
  const p = scene.constructor.name && window.__GAME__.scene.getScene('ShopGrowthScene');
  return { flowState: p.flowState, focusMode: p.focusMode, carried: p.carriedLoot?.definitionId ?? null };
});
console.log(JSON.stringify({ errors, state }, null, 2));
await browser.close();
