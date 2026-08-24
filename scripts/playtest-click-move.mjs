import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootUrl = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/click-move';
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

await page.goto(`${rootUrl}?scene=shopgrowth`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await page.mouse.move(640, 550);
await page.waitForTimeout(260);
const shopHover = await sceneEval('ShopGrowthScene', (scene) => ({
  visible: scene.clickMove.hoverMarker.visible,
  ringScaleX: scene.clickMove.hoverMarker.getData('ring').scaleX,
  ringAngle: scene.clickMove.hoverMarker.getData('ring').angle,
  arrowY: scene.clickMove.hoverMarker.getData('arrow').y,
  arrowAngle: scene.clickMove.hoverMarker.getData('arrow').angle,
  arrowTexture: scene.clickMove.hoverMarker.getData('arrow').texture.key,
  ringTexture: scene.clickMove.hoverMarker.getData('ring').texture.key,
}));
await page.waitForTimeout(180);
const shopHoverAnimated = await sceneEval('ShopGrowthScene', (scene) => ({
  ringScaleX: scene.clickMove.hoverMarker.getData('ring').scaleX,
  ringAngle: scene.clickMove.hoverMarker.getData('ring').angle,
  arrowY: scene.clickMove.hoverMarker.getData('arrow').y,
  arrowAngle: scene.clickMove.hoverMarker.getData('arrow').angle,
}));
await page.screenshot({ path: `${out}/01_shop_hover_marker.png` });
const shopStart = await sceneEval('ShopGrowthScene', (scene) => ({ x: scene.player.x, y: scene.player.y }));
await page.mouse.click(640, 550);
await page.waitForTimeout(130);
await page.screenshot({ path: `${out}/02_shop_destination_lock.png` });
await page.waitForTimeout(770);
const shopMoved = await sceneEval('ShopGrowthScene', (scene) => ({
  x: scene.player.x,
  y: scene.player.y,
  destinationVisible: scene.clickMove.destinationMarker.visible,
}));
await page.screenshot({ path: `${out}/02_shop_destination_move.png` });

await page.mouse.click(850, 540);
await page.waitForTimeout(220);
await page.keyboard.down('KeyA');
await page.waitForTimeout(180);
await page.keyboard.up('KeyA');
await page.waitForTimeout(120);
const wasdOverride = await sceneEval('ShopGrowthScene', (scene) => ({
  destinationVisible: scene.clickMove.destinationMarker.visible,
  pathLength: scene.clickMove.path.length,
}));

await page.goto(`${rootUrl}?scene=shopgrowth`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
await page.mouse.click(250, 500);
await page.waitForTimeout(220);
const furnitureRoute = await sceneEval('ShopGrowthScene', (scene) => ({
  waypoints: scene.clickMove.path.length,
  destinationVisible: scene.clickMove.destinationMarker.visible,
}));
await page.waitForTimeout(3600);
const furnitureArrival = await sceneEval('ShopGrowthScene', (scene) => ({
  x: scene.player.x,
  y: scene.player.y,
  destinationVisible: scene.clickMove.destinationMarker.visible,
}));
await page.screenshot({ path: `${out}/03_shop_furniture_route.png` });

await page.goto(`${rootUrl}?scene=shopintro`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopIntroductionScene'));
await sceneEval('ShopIntroductionScene', (scene) => {
  scene.phase = 'free-roam';
  scene.player.setMovementEnabled(true);
});
const introStart = await sceneEval('ShopIntroductionScene', (scene) => scene.player.y);
await page.mouse.click(640, 550);
await page.waitForTimeout(850);
const introMoved = await sceneEval('ShopIntroductionScene', (scene) => scene.player.y);

await page.goto(`${rootUrl}?scene=shop`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('AntiqueShopScene'));
await sceneEval('AntiqueShopScene', (scene) => {
  scene.phase = 'free-roam';
  scene.player.setMovementEnabled(true);
});
const returnShopStart = await sceneEval('AntiqueShopScene', (scene) => scene.player.y);
await page.mouse.click(640, 550);
await page.waitForTimeout(850);
const returnShopMoved = await sceneEval('AntiqueShopScene', (scene) => scene.player.y);

await page.goto(`${rootUrl}?scene=tomb`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('TombScene'));
await sceneEval('TombScene', (scene) => {
  scene.arrivalIntroductionActive = false;
  scene.arrivalPanel?.setVisible(false);
  scene.player.setMovementEnabled(true);
});
await page.waitForTimeout(250);
await page.mouse.move(640, 500);
await page.waitForTimeout(220);
const tombHover = await sceneEval('TombScene', (scene) => ({
  visible: scene.clickMove.hoverMarker.visible,
  worldX: scene.clickMove.hoverMarker.x,
  worldY: scene.clickMove.hoverMarker.y,
}));
await page.screenshot({ path: `${out}/03_tomb_hover_marker.png` });
const tombStart = await sceneEval('TombScene', (scene) => ({ x: scene.player.x, y: scene.player.y }));
await page.mouse.click(640, 500);
await page.waitForTimeout(1100);
const tombMoved = await sceneEval('TombScene', (scene) => ({
  x: scene.player.x,
  y: scene.player.y,
  destinationVisible: scene.clickMove.destinationMarker.visible,
}));
await page.screenshot({ path: `${out}/04_tomb_destination_move.png` });

const report = {
  errors,
  shopHover,
  shopHoverAnimated,
  shopStart,
  shopMoved,
  shopDistance: Math.hypot(shopMoved.x - shopStart.x, shopMoved.y - shopStart.y),
  wasdOverride,
  furnitureRoute,
  furnitureArrival,
  introShopDistance: Math.abs(introMoved - introStart),
  returnShopDistance: Math.abs(returnShopMoved - returnShopStart),
  tombHover,
  tombStart,
  tombMoved,
  tombDistance: Math.hypot(tombMoved.x - tombStart.x, tombMoved.y - tombStart.y),
};
await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
