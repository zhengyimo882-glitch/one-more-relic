import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:5173/one-more-relic/?scene=shopgrowth');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('ShopGrowthScene'));
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('ShopGrowthScene');
    scene.scene.pause();
    const player = scene.player;
    const avatar = player.avatarVisual;
    const sprite = avatar.container.list.find(object => object.type === 'Sprite');
    const failures = [];
    let framesChecked = 0;
    for (const carrying of [false, true]) {
      avatar.setCarrying(carrying);
      for (const facing of ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']) {
        avatar.setFacing(facing);
        for (const locomotion of ['forward', 'backward']) {
          avatar.setMovement(true, 0, locomotion);
          const frames = sprite.anims.currentAnim.frames;
          for (const animationFrame of frames) {
            sprite.setFrame(animationFrame.textureFrame);
            const frame = sprite.frame;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, 128, 128, 0, 0, 128, 128);
            const pixels = ctx.getImageData(0, 0, 128, 128).data;
            let bottom = -1;
            const height = sprite.isCropped ? sprite._crop.height : 128;
            for (let y = 0; y < height; y++) {
              let count = 0;
              for (let x = 0; x < 128; x++) if (pixels[(y * 128 + x) * 4 + 3] > 32) count++;
              if (count > 2) bottom = y;
            }
            const footY = sprite.y + (bottom - sprite.displayOriginY) * sprite.scaleY;
            if (footY < 5 || footY > 6) failures.push({ carrying, facing, locomotion, frame: frame.name, footY });
            framesChecked++;
          }
        }
        avatar.setMovement(false, 0);
        if (sprite.isCropped) failures.push({ carrying, facing, error: 'crop persisted into idle' });
      }
    }
    player.setPosition(850, 560);
    avatar.setCarrying(true);
    avatar.setFacing('east');
    avatar.setMovement(true, 0);
    sprite.anims.pause();
    return { framesChecked, failures };
  });
  assert.deepEqual(result.failures, []);
  await mkdir('artifacts/player-grounding', { recursive: true });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'artifacts/player-grounding/carry-right.png' });
  console.log(`PASS: ${result.framesChecked} walk frames across all directions, carry states and forward/backward playback; idle crop reset.`);
} finally {
  await browser.close();
}
