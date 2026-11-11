const panel = document.querySelector('#model');
const canvas = document.querySelector('#motionCanvas');
const context = canvas.getContext('2d', {alpha: false});
const stage = document.querySelector('#modelStage');
const status = document.querySelector('#motionPhase');
const toggle = document.querySelector('#modelToggle');
const speedButton = document.querySelector('#modelSpeed');
const restart = document.querySelector('#modelRestart');
const title = document.querySelector('#motionTitle');
const target = document.querySelector('#motionTarget');
const hint = document.querySelector('#modelTip');
const views = Array.from(panel.querySelectorAll('[data-view]'));
const exercises = Array.from(panel.querySelectorAll('[data-exercise]'));
const clips = {
  squat: ['النهوض من الكرسي', 'الفخذان والأرداف', 'ثبّت قدميك والمس المقعد بهدوء، ثم انهض.'],
  wall: ['ضغط الحائط', 'الصدر والذراعان', 'ثبّت قدميك واثنِ مرفقيك قبل الدفع بعيدًا عن الحائط.'],
  bridge: ['جسر الأرداف', 'الأرداف', 'ادفع بقدميك وارفع الحوض مع إبقاء الرقبة مسترخية.'],
};
const frames = 24;
const duration = 3200;
const sheets = new Map();
let exercise = 'squat';
let view = 'three';
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let rate = 1;
let elapsed = 0;
let previousTime = 0;
let lastFrame = -1;
let frameRequest = 0;
let sheet;

function syncPlayButton() {
  toggle.textContent = playing ? 'إيقاف مؤقت' : 'تشغيل';
  toggle.setAttribute('aria-label', playing ? 'إيقاف الحركة مؤقتًا' : 'تشغيل الحركة');
}

function paint(frame) {
  if (!sheet || frame === lastFrame) return;
  const width = canvas.width;
  const height = canvas.height;
  context.drawImage(sheet, (frame % 6) * width, Math.floor(frame / 6) * height,
    width, height, 0, 0, width, height);
  lastFrame = frame;
}

function tick() {
  const now = performance.now();
  if (previousTime) elapsed = (elapsed + (now - previousTime) * rate) % duration;
  previousTime = now;
  paint(Math.floor(elapsed / duration * frames));
}

function updatePlayback() {
  if (playing && sheet && panel.classList.contains('active')) {
    if (!frameRequest) frameRequest = setInterval(tick, 1000 / 30);
    return;
  }
  clearInterval(frameRequest);
  frameRequest = 0;
  previousTime = 0;
}

function imageFor(key) {
  if (!sheets.has(key)) {
    const image = new Image();
    const load = new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => {
        sheets.delete(key);
        reject(new Error(key));
      };
    });
    if (sheets.size >= 3) sheets.delete(sheets.keys().next().value);
    sheets.set(key, load);
    image.src = 'motion/' + key + '.webp';
  }
  return sheets.get(key);
}

async function selectClip(reset) {
  if (reset) elapsed = 0;
  const name = exercise + '-' + view;
  const [label, muscles, instructions] = clips[exercise];
  title.textContent = label;
  target.textContent = muscles;
  hint.textContent = instructions;
  stage.style.backgroundImage = 'url(motion/' + exercise + '-poster.webp)';
  for (const button of views) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  for (const button of exercises) button.setAttribute('aria-pressed', String(button.dataset.exercise === exercise));
  canvas.hidden = true;
  status.hidden = true;
  sheet = null;
  lastFrame = -1;
  updatePlayback();
  try {
    const image = await imageFor(name);
    if (name !== exercise + '-' + view) return;
    sheet = image;
    paint(Math.floor(elapsed / duration * frames));
    canvas.hidden = false;
    updatePlayback();
  } catch {
    if (name !== exercise + '-' + view) return;
    status.textContent = 'تعذّر تحميل الحركة. اضغط على زاوية العرض لإعادة المحاولة.';
    status.hidden = false;
  }
}

function openExercise(name) {
  if (!Object.prototype.hasOwnProperty.call(clips, name)) return;
  exercise = name;
  selectClip(true);
}

for (const button of views) {
  button.addEventListener('click', () => {
    view = button.dataset.view;
    selectClip(false);
  });
}
for (const button of exercises) button.addEventListener('click', () => openExercise(button.dataset.exercise));
panel.addEventListener('open-motion', event => openExercise(event.detail));
toggle.addEventListener('click', () => {
  playing = !playing;
  syncPlayButton();
  updatePlayback();
});
speedButton.addEventListener('click', () => {
  rate = rate === 1 ? .5 : 1;
  speedButton.textContent = rate === 1 ? '1×' : '0.5×';
});
restart.addEventListener('click', () => {
  elapsed = 0;
  paint(0);
});
new MutationObserver(updatePlayback).observe(panel, {attributes: true, attributeFilter: ['class']});
syncPlayButton();
selectClip(true);
