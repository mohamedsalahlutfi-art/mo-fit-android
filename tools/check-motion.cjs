const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');

async function run() {
  mkdirSync('motion-qa', { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return kind.includes('webgl') ? null : original.call(this, kind, ...args);
      };
    });
    await page.context().setOffline(true);
    await page.goto(pathToFileURL('app/src/main/assets/index.html').href);
    const canvas = page.locator('#motionCanvas');
    await canvas.waitFor();
    const pixels = async () => (await canvas.screenshot()).toString('base64');
    async function waitForMotion(previous) {
      for (let attempt = 0; attempt < 15; attempt++) {
        if (await pixels() !== previous) return;
        await page.waitForTimeout(120);
      }
      assert.fail('The exercise frame did not advance');
    }
    const initial = await pixels();
    await waitForMotion(initial);
    await page.screenshot({path: 'motion-qa/start-screen.png'});
    await page.locator('#modelToggle').click();
    const frozen = await pixels();
    await page.waitForTimeout(240);
    assert.equal(await pixels(), frozen);
    await page.locator('#modelSpeed').click();
    assert.match(await page.locator('#modelSpeed').innerText(), /0.5/);
    await page.locator('#modelSpeed').click();
    const views = new Set();
    for (const exercise of ['squat', 'wall', 'bridge']) {
      await page.locator('[data-exercise=' + exercise + ']').click();
      for (const view of ['front', 'side', 'three']) {
        await page.locator('[data-view=' + view + ']').click();
        await canvas.waitFor();
        views.add(await pixels());
        await canvas.screenshot({path: 'motion-qa/' + exercise + '-' + view + '.png'});
      }
      const still = await pixels();
      await page.locator('#modelToggle').click();
      await waitForMotion(still);
      await page.locator('#modelToggle').click();
      await page.locator('#modelRestart').click();
      assert.equal(await pixels(), still);
    }
    assert.equal(views.size, 9);
    await page.locator('[data-tab=moves]').click();
    assert.equal(await page.locator('[data-open-motion]').count(), 3);
    await page.locator('[data-open-motion=wall]').click();
    await canvas.waitFor();
    assert.equal(await page.locator('#motionTitle').innerText(), 'ضغط الحائط');
    assert.deepEqual(errors, []);
    console.log('Three motion clips, nine views, initial autoplay and library links verified offline with WebGL disabled.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
