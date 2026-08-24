import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rootUrl = 'http://127.0.0.1:5173/one-more-relic/';
const out = 'artifacts/main-menu-redesign';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(rootUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GAME__?.scene?.isActive('MainMenuScene'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/main-menu-1280x720.png` });

const sampleLights = () => page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('MainMenuScene');
  return scene.children.list
    .filter((child) => child.name?.startsWith('main-menu-'))
    .map((child) => ({
      name: child.name,
      alpha: Number(child.alpha.toFixed(3)),
      y: Number(child.y.toFixed(2)),
      scaleX: Number(child.scaleX.toFixed(4)),
      scaleY: Number(child.scaleY.toFixed(4)),
      frame: child.frame?.name ?? null,
    }));
});
const lightSampleA = await sampleLights();
await page.waitForTimeout(420);
const lightSampleB = await sampleLights();

const menuState = await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('MainMenuScene');
  const texts = scene.children.list
    .filter((child) => child.type === 'Text')
    .map((child) => child.text);
  const interactive = scene.children.list.filter((child) => child.input?.enabled);
  return { texts, interactiveCount: interactive.length };
});

await page.mouse.move(640, 638);
await page.waitForTimeout(260);
await page.screenshot({ path: `${out}/main-menu-hover-1280x720.png` });
const hoverState = await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('MainMenuScene');
  const button = scene.children.list.find((child) => child.input?.enabled);
  return button ? { y: button.y, scaleX: button.scaleX, scaleY: button.scaleY } : null;
});

await page.mouse.click(640, 638);
await page.waitForFunction(() => window.__GAME__.scene.isActive('StoryIntroScene'));
const result = {
  errors,
  menuState,
  lightsAnimated: JSON.stringify(lightSampleA) !== JSON.stringify(lightSampleB),
  ghostEffectCount: lightSampleA.filter((sample) => sample.name.includes('ghost')).length,
  lightSampleA,
  lightSampleB,
  hoverState,
  storyStarted: await page.evaluate(() => window.__GAME__.scene.isActive('StoryIntroScene')),
};
await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
