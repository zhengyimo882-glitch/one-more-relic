import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const root = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/interaction-approach';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const sceneEval = async (key, fn, arg) => page.evaluate(({ key, source, arg }) => {
  const scene = window.__GAME__.scene.getScene(key);
  return Function('scene', 'arg', `return (${source})(scene, arg)`)(scene, arg);
}, { key, source: fn.toString(), arg });

await page.goto(`${root}?scene=shopgrowth`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await page.mouse.move(640, 550);
await page.waitForTimeout(100);
const groundCursor = await page.evaluate(() => window.__GAME__.canvas.style.cursor);
const incoming = await sceneEval('ShopGrowthScene', (scene) => {
  const station = scene.stations.get('incoming');
  return { x: station.x, y: station.y };
});
await page.mouse.click(incoming.x, incoming.y);
await page.waitForTimeout(4200);
const afterIncoming = await sceneEval('ShopGrowthScene', (scene) => ({
  carried: scene.carriedLoot?.definitionId ?? null,
  focus: scene.focusMode ?? null,
  player: { x: scene.player.x, y: scene.player.y },
}));
const workbench = await sceneEval('ShopGrowthScene', (scene) => {
  const station = scene.stations.get('workbench');
  return { x: station.x, y: station.y };
});
await page.mouse.click(workbench.x, workbench.y);
await page.waitForTimeout(4200);
const afterWorkbench = await sceneEval('ShopGrowthScene', (scene) => ({
  focus: scene.focusMode ?? null,
  player: { x: scene.player.x, y: scene.player.y },
  dragging: scene.cleaningController?.isDragging() ?? false,
}));

await page.goto(`${root}?scene=shop`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('AntiqueShopScene'));
await sceneEval('AntiqueShopScene', (scene) => {
  scene.phase = 'free-roam';
  scene.player.setMovementEnabled(true);
});
const keeper = await sceneEval('AntiqueShopScene', (scene) => ({ x: scene.shopkeeper.x, y: scene.shopkeeper.y }));
await page.mouse.click(keeper.x, keeper.y);
await page.waitForTimeout(4200);
const afterCounter = await sceneEval('AntiqueShopScene', (scene) => ({
  phase: scene.phase,
  nearby: scene.shopkeeperNearby,
  player: { x: scene.player.x, y: scene.player.y },
}));

const report = { errors, groundCursor, incoming, afterIncoming, workbench, afterWorkbench, keeper, afterCounter };
await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
