#!/usr/bin/env node
// Run against the emulator-backed server started by scripts/crosshare.mjs run.
import assert from 'node:assert/strict';
const { chromium } = await import(new URL('../.prototype/crosshare/app/node_modules/@playwright/test/index.mjs', import.meta.url));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CROSSHARE_CHROMIUM_PATH ? {executablePath: process.env.CROSSHARE_CHROMIUM_PATH} : {}),
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__crosshareCompletions = [];
    window.addEventListener('message', (event) => {
      if (event.source === window && event.origin === window.location.origin && event.data?.type === 'complete') {
        window.__crosshareCompletions.push(event.data);
      }
    });
  });
  // This is an inherited local emulator fixture, not content for our release.
  const url = 'http://127.0.0.1:3000/crosswords/WBaCU7w7Jcvm5yoQcxng/just-like-jeff';
  await page.goto(url);
  await page.getByRole('button', {name: 'Begin Puzzle', exact: true}).click({timeout: 60_000});
  await page.getByRole('button', {name: 'Reveal', exact: true}).click();
  await page.getByRole('button', {name: 'Reveal Puzzle', exact: true}).click();
  await page.waitForFunction(() => window.__crosshareCompletions.length > 0);
  const completion = await page.evaluate(() => window.__crosshareCompletions[0]);
  assert.equal(completion.type, 'complete');
  assert.equal(typeof completion.elapsed, 'number');
  assert.ok(Number.isFinite(completion.elapsed) && completion.elapsed >= 0);
  assert.equal(completion.didCheat, true);
  console.log(JSON.stringify({url, completion, checkedAt: new Date().toISOString()}, null, 2));
} finally {
  await browser.close();
}
