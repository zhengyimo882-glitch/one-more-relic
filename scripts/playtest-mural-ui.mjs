import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootUrl = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/mural-ui-redesign';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const sceneEval = async (fn) => page.evaluate((source) => {
  const scene = window.__GAME__.scene.getScene('TombScene');
  return Function('scene', `return (${source})(scene)`)(scene);
}, fn.toString());

await page.goto(`${rootUrl}?scene=tomb`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('TombScene'));
await page.waitForTimeout(350);

await sceneEval((scene) => {
  scene.arrivalTextReveal?.complete();
  scene.advanceArrivalIntroduction();
  scene.arrivalTextReveal?.complete();
  scene.advanceArrivalIntroduction();
  scene.arrivalTextReveal?.complete();
  scene.advanceArrivalIntroduction();
  scene.player.setPosition(800, 1300);
  scene.cameras.main.centerOn(800, 1300);
  for (let index = 0; index < 24; index += 1) scene.corridorMurals.update(() => true, 1);
});
await page.waitForTimeout(220);
await page.screenshot({ path: `${out}/00_corridor_wall_markers.png` });

const ids = await sceneEval((scene) => scene.corridorMurals.getPanels().map((panel) => panel.id));
const measurements = [];
const closeResults = [];
for (let index = 0; index < ids.length; index += 1) {
  await sceneEval((scene) => {
    const panel = scene.corridorMurals.getPanels()[scene.registry.get('__muralTestIndex') ?? 0];
    scene.openMuralDiscovery(panel);
  });
  await page.waitForTimeout(900);
  measurements.push(await sceneEval((scene) => ({
    id: scene.corridorMurals.getPanels()[scene.registry.get('__muralTestIndex') ?? 0].id,
    preview: {
      width: Math.round(scene.muralDiscoveryPreview.displayWidth),
      height: Math.round(scene.muralDiscoveryPreview.displayHeight),
      alpha: scene.muralDiscoveryPreview.alpha,
    },
    active: scene.muralDiscoveryActive,
    textGroupAlpha: scene.muralDiscoveryTextGroup.alpha,
    closeBounds: scene.muralDiscoveryCloseHitArea.getBounds(),
  })));
  await page.screenshot({ path: `${out}/${String(index + 1).padStart(2, '0')}_${ids[index]}.png` });
  await page.mouse.click(1095, 638);
  await page.waitForTimeout(220);
  closeResults.push(await sceneEval((scene) => ({
    active: scene.muralDiscoveryActive,
    visible: scene.muralDiscoveryPanel.visible,
    movementEnabled: scene.player.isMovementEnabled(),
  })));
  await sceneEval((scene) => scene.registry.set('__muralTestIndex', (scene.registry.get('__muralTestIndex') ?? 0) + 1));
}

const report = { errors, ids, measurements, closeResults };
await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
