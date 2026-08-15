import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const url = 'http://127.0.0.1:4173/one-more-relic/?scene=shopgrowth';
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));
const run = (source, arg) => page.evaluate(({ source, arg }) => {
  const scene = window.__GAME__.scene.getScene('ShopGrowthScene');
  return Function('scene', 'arg', `return (${source})(scene,arg)`)(scene, arg);
}, { source: source.toString(), arg });

// Prepare the ordinary coin at the appraisal branch and deliberately choose the unsupported conclusion.
const result = await run((scene) => {
  const system = scene.selectedLoot;
  const progress = scene.game.scene.getScene('ShopGrowthScene');
  const records = progress.constructor.name && scene;
  const coin = records.activeSettlementId && records;
  const loot = records.game.registry; void system; void coin; void loot;
  scene.handleStation('incoming');
  scene.selectedLoot.cleaned = true;
  scene.selectedLoot.evidenceIds = ['blank-fibres', 'folded-map-seam'];
  scene.evidenceFound = new Set(scene.selectedLoot.evidenceIds);
  scene.openAppraisal();
  scene.confirmAppraisal(0);
  return { wrong: scene.selectedLoot?.appraisalCorrect === false };
});

// Exit/re-enter a focus layer repeatedly, then hammer pause launch: only one pause scene may be active.
await run((scene) => { scene.closeFocus(); scene.openWork(); scene.closeFocus(); scene.openWork(); scene.closeFocus(); });
await run((scene) => { for (let i = 0; i < 6; i++) scene.scene.launch('PauseMenuScene', { sourceSceneKey: 'ShopGrowthScene' }); });
await page.waitForTimeout(250);
const pauseCount = await page.evaluate(() => window.__GAME__.scene.getScenes(true).filter((s) => s.scene.key === 'PauseMenuScene').length);
console.log(JSON.stringify({ errors, result, pauseCount }, null, 2));
await browser.close();
