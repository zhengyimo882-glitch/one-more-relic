import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/one-more-relic/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('artifacts/shop-language', { recursive: true });

try {
  for (const language of ['en', 'zh-CN', 'en']) {
    await page.goto(`${base}?scene=shopgrowth`);
    await page.waitForFunction(() => window.__GAME__?.scene.isActive('ShopGrowthScene'));
    await page.evaluate(async language => {
      const { setGameLanguage } = await import('./src/i18n/gameLanguage.ts');
      setGameLanguage(language);
      window.__GAME__.scene.getScene('ShopGrowthScene').scene.restart();
    }, language);
    await page.waitForTimeout(600);
    for (const phase of ['world', 'cleaning', 'inspection', 'appraisal', 'disposition', 'atlas']) {
      if (phase === 'cleaning') {
        await page.evaluate(() => window.__GAME__.scene.getScene('ShopGrowthScene').handleStation('incoming'));
        await page.waitForTimeout(400);
      }
      await page.evaluate(phase => {
        const scene = window.__GAME__.scene.getScene('ShopGrowthScene');
        if (phase === 'cleaning') {
          scene.handleStation('workbench');
        }
        if (phase === 'inspection') scene.openInspection();
        if (phase === 'appraisal') scene.openAppraisal();
        if (phase === 'disposition') scene.openDisposition();
        if (phase === 'atlas') { scene.closeFocus(); scene.openAtlas(); }
      }, phase);
      await page.waitForTimeout(400);
      const texts = await page.evaluate(() => {
        const result = [];
        const visit = objects => objects.forEach(object => {
          if (!object.visible || object.alpha === 0) return;
          if (object.type === 'Text' && object.text) result.push(object.text);
          if (object.list) visit(object.list);
        });
        visit(window.__GAME__.scene.getScene('ShopGrowthScene').children.list);
        return result;
      });
      assert(texts.length > 0, `${language}/${phase}: no text`);
      if (language === 'en') assert.deepEqual(texts.filter(text => /[\u3400-\u9fff]/u.test(text)), [], `${phase}: Chinese leaked into English`);
      else assert(texts.some(text => /[\u3400-\u9fff]/u.test(text)), `${phase}: Chinese missing`);
      if (phase === 'cleaning') assert(texts.some(text => text.includes(language === 'en' ? 'Soft brush' : '软毛刷')), 'Tool name missing');
      await page.screenshot({ path: `artifacts/shop-language/${language}-${phase}.png` });
      console.log(`${language}/${phase}: ${texts.length} visible labels OK`);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
