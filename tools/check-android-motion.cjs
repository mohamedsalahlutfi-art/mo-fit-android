const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');

const app = 'com.mofit.app';
const adb = (...args) => execFileSync('adb', args);
const deadline = Date.now() + 45000;

async function retry(operation) {
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await delay(500);
    }
  }
}

async function run() {
  adb('install', 'MO-FIT-v0.7.2.apk');
  adb('shell', 'svc', 'wifi', 'disable');
  adb('shell', 'svc', 'data', 'disable');
  adb('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity');
  const pid = adb('shell', 'pidof', app).toString().trim();
  assert.match(pid, /^\d+$/);
  adb('forward', 'tcp:9222', 'localabstract:webview_devtools_remote_' + pid);
  const url = await retry(async () => {
    const response = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await response.json();
    const page = targets.find(target => target.url === 'file:///android_asset/index.html');
    assert(page, 'Android WebView did not load the app entry page');
    const url = new URL(page.webSocketDebuggerUrl);
    url.hostname = '127.0.0.1';
    return url;
  });
  const socket = new WebSocket(url);
  let nextId = 0;
  const requests = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    requests.get(message.id)?.(message);
    requests.delete(message.id);
  });
  try {
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, {once: true});
      socket.addEventListener('error', reject, {once: true});
    });
    const request = (method, params) => new Promise((resolve, reject) => {
      const id = ++nextId;
      requests.set(id, message => {
        if (message.error || message.result?.exceptionDetails) {
          reject(new Error(JSON.stringify(message.error || message.result?.exceptionDetails)));
        } else {
          resolve(message.result);
        }
      });
      socket.send(JSON.stringify({id, method, params}));
    });
    const evaluate = async expression => (await request('Runtime.evaluate', {expression, returnByValue: true})).result.value;
    mkdirSync('android-motion-qa', {recursive: true});
    await retry(async () => {
      const ready = await evaluate(`document.readyState === 'complete' &&
        !!document.querySelector('[data-exercise="squat"]') &&
        document.querySelector('#motionCanvas').hidden === false`);
      assert(ready, 'The Android motion screen did not finish loading');
    });
    const settings = await evaluate(`({
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      visibility: document.visibilityState,
      playing: document.querySelector('#modelToggle').textContent
    })`);
    console.log('Android motion settings:', settings);
    if (settings.playing === 'تشغيل') await evaluate("document.querySelector('#modelToggle').click()");
    await evaluate(`(() => {
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      window.androidMotionFrames = 0;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        const result = draw.apply(this, args);
        if (this.canvas.id === 'motionCanvas') window.androidMotionFrames++;
        return result;
      };
    })()`);
    for (const exercise of ['squat', 'wall', 'bridge']) {
      const first = await evaluate('window.androidMotionFrames');
      await evaluate(`document.querySelector('[data-exercise="${exercise}"]').click()`);
      await retry(async () => {
        const frames = await evaluate(`(() => {
          const canvas = document.querySelector('#motionCanvas');
          return canvas.hidden ? 0 : window.androidMotionFrames;
        })()`);
        assert(frames > first + 2, 'No sequence of painted frames for ' + exercise);
      });
      writeFileSync('android-motion-qa/' + exercise + '.png', adb('exec-out', 'screencap', '-p'));
    }
    console.log('APK installed and all three exercises animated on the Android emulator with network disabled.');
  } finally {
    socket.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
