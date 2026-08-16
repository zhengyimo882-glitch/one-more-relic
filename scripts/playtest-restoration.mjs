import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = 'artifacts/restoration-refactor';
const url = 'http://127.0.0.1:5173/one-more-relic/?scene=shopgrowth';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

const shot = async (name) => page.screenshot({ path: `${out}/${name.replace(/\.png$/, '')}.png` });
const sceneEval = async (fn, arg) => page.evaluate(({ source, arg }) => {
  const scene = window.__GAME__.scene.getScene('ShopGrowthScene');
  return Function('scene', 'arg', `return (${source})(scene, arg)`)(scene, arg);
}, { source: fn.toString(), arg });
const station = async (id) => {
  await sceneEval((scene, value) => scene.handleStation(value), id);
  await page.waitForTimeout(360);
};
const sweep = async (passes, slow = false) => {
  for (let pass = 0; pass < passes; pass += 1) {
    const y = 255 + (pass % 7) * 44;
    const reverse = pass % 2 === 1;
    await page.mouse.move(reverse ? 635 : 275, y);
    await page.mouse.down();
    await page.mouse.move(reverse ? 275 : 635, y, { steps: slow ? 22 : 9 });
    await page.mouse.up();
    await page.waitForTimeout(slow ? 70 : 25);
  }
};
const dragLamp = async (from, to) => {
  await page.mouse.move(from[0], from[1]); await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(150);
};
const nextFace = async (direction) => {
  await sceneEval((scene, value) => scene.inspectionController.nextFace(value), direction);
  await page.waitForTimeout(180);
};

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('ShopGrowthScene'));

// Atlas: conservative brush cleaning, early stop, two distinct evidence conditions.
await station('incoming'); await station('workbench');
await shot('01_atlas_cleaning_start.png');
await page.mouse.click(560, 655); await page.mouse.move(420, 390); await page.mouse.down(); await page.waitForTimeout(280); await page.mouse.up();
await page.mouse.click(150, 655);
await sweep(18, true);
await shot('02_atlas_continuous_brush.png');
const atlasCleaning = await sceneEval((scene) => ({
  id: scene.selectedLoot.definitionId,
  progress: scene.selectedLoot.cleaningProgress,
  damage: scene.selectedLoot.cleaningDamage,
  brushUse: scene.selectedLoot.cleaningToolUse?.['soft-brush'] ?? 0,
  clothUse: scene.selectedLoot.cleaningToolUse?.['dry-cloth'] ?? 0,
}));
await page.mouse.click(790, 655); await page.waitForTimeout(450);
await shot('03_atlas_inspection.png');
await nextFace(-1); await shot('03b_atlas_back_alignment.png'); await nextFace(1);

await nextFace(1); // spine
await page.mouse.move(420, 390); await page.mouse.wheel(0, -130); await page.waitForTimeout(120);
await dragLamp([740, 565], [311, 529]);
const lampHint = await sceneEval((scene) => scene.focusLayer.list
  .filter((item) => item.type === 'Text')
  .map((item) => item.text)
  .find((text) => text.includes('侧光方向合适') || text.includes('灯位已固定')) ?? '');
await shot('03c_atlas_lamp_guidance.png');
await page.mouse.move(492, 391); await page.waitForTimeout(1250);
await nextFace(1); // open
await page.mouse.move(430, 390);
await page.mouse.wheel(0, -120); await page.mouse.wheel(0, -120); await page.mouse.wheel(0, -120); await page.waitForTimeout(120);
await dragLamp([311, 529], [583, 237]);
await page.mouse.move(606, 353); await page.waitForTimeout(1050);
await shot('04_atlas_evidence_notebook.png');
const atlasInspection = await sceneEval((scene) => ({ evidence: [...scene.selectedLoot.evidenceIds], face: scene.inspectionController.faceIndex }));

await page.mouse.click(45, 45); await page.keyboard.down('Escape'); await page.waitForTimeout(90); await page.keyboard.up('Escape'); await page.waitForTimeout(220);
const atlasEsc = await sceneEval((scene) => ({ focus: scene.focusMode ?? null, loot: scene.selectedLoot?.definitionId ?? null }));
await station('workbench'); await page.waitForTimeout(250);
await sceneEval((scene) => scene.openAppraisal()); await page.waitForTimeout(180);
await shot('05_atlas_appraisal.png');
await sceneEval((scene) => scene.confirmAppraisal(1)); await page.waitForTimeout(260);
await station('research'); await page.waitForTimeout(380);

// Coin: bamboo pick exposes hard rust quickly, then repeated dwell visibly damages and destroys facing evidence.
await station('incoming'); await station('workbench');
await page.mouse.click(355, 655); await page.waitForTimeout(100);
await page.mouse.move(350, 455); await page.mouse.down();
for (let index = 0; index < 24; index += 1) {
  await page.mouse.move(350 + (index % 2) * 3, 455 + (index % 3), { steps: 2 });
  await page.waitForTimeout(80);
}
await page.waitForTimeout(3200);
await page.mouse.up();
await page.mouse.click(150, 655); await page.waitForTimeout(100);
await sweep(18, true);
await shot('06_coin_bamboo_damage.png');
const coinCleaning = await sceneEval((scene) => ({
  id: scene.selectedLoot.definitionId,
  progress: scene.selectedLoot.cleaningProgress,
  damage: scene.selectedLoot.cleaningDamage,
  destroyed: [...(scene.selectedLoot.destroyedEvidenceIds ?? [])],
  bambooUse: scene.selectedLoot.cleaningToolUse?.['bamboo-pick'] ?? 0,
}));
await page.mouse.click(790, 655); await page.waitForTimeout(420);

await dragLamp([740, 565], [636, 301]);
await page.mouse.move(464, 393); await page.waitForTimeout(850);
await nextFace(1); await nextFace(1); // back
await page.mouse.move(420, 390); await page.mouse.wheel(0, -230); await page.waitForTimeout(100);
await dragLamp([636, 301], [342, 557]);
await page.mouse.move(362, 452); await page.waitForTimeout(1180);
await shot('07_coin_inspection_damage_block.png');
const coinInspection = await sceneEval((scene) => ({ evidence: [...scene.selectedLoot.evidenceIds], destroyed: [...(scene.selectedLoot.destroyedEvidenceIds ?? [])] }));
await sceneEval((scene) => scene.openAppraisal()); await page.waitForTimeout(150);
await sceneEval((scene) => scene.confirmAppraisal(1)); await page.waitForTimeout(240);
await shot('08_coin_value_consequence.png');
const coinResult = await sceneEval((scene) => ({
  appraisalCorrect: scene.selectedLoot.appraisalCorrect,
  cleaningDamage: scene.selectedLoot.cleaningDamage,
  preservation: scene.selectedLoot.preservationScore,
  evidence: [...scene.selectedLoot.evidenceIds],
}));

const report = { errors, atlasCleaning, lampHint, atlasInspection, atlasEsc, coinCleaning, coinInspection, coinResult };
await writeFile(`${out}/playtest-results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
