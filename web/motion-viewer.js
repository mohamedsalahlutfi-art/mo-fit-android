import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, GridHelper, Mesh,
  MeshStandardMaterial, OrthographicCamera, Scene, Vector3, WebGLRenderer,
  AnimationMixer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import mannequin from '../app/src/main/assets/motion-model.glb';

const stage = document.querySelector('#modelStage');
const panel = document.querySelector('#model');
const canvas = document.querySelector('#motionCanvas');
const selector = document.querySelector('#modelMove');
const status = document.querySelector('#motionPhase');
const toggle = document.querySelector('#modelToggle');
const speed = document.querySelector('#modelSpeed');
const restart = document.querySelector('#modelRestart');
const viewButtons = Array.from(panel.querySelectorAll('[data-view]'));
const hints = {
  squat: 'الفخذ الأمامي والأرداف. ثبّت القدمين والمَس المقعد بهدوء قبل النهوض.',
  wall: 'الصدر والعضلة ثلاثية الرؤوس. ثبّت القدمين واثنِ المرفقين ببطء.',
  bridge: 'الأرداف. ادفع بالقدمين وارفع الحوض بمدى مريح مع استرخاء الرقبة.',
};

const scene = new Scene();
scene.background = new Color(0x101c2b);
const camera = new OrthographicCamera();
const target = new Vector3();
const angles = { front: 0, side: Math.PI / 2, three: Math.PI / 4 };
let angle = angles.three;
let playing = true;
let halfSpeed = false;
let mixer;
let current;
let renderer;
let previousTime = 0;
let frame = 0;

function box(width, height, depth, x, y, z, material) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

const chair = new Scene();
const seatMaterial = new MeshStandardMaterial({ color: 0x447981, roughness: .74 });
chair.add(box(.54, .05, .42, 0, .324, -.47, seatMaterial));
for (const x of [-.23, .23]) {
  for (const z of [-.64, -.30]) {
    chair.add(box(.045, .30, .045, x, .15, z, seatMaterial));
  }
  chair.add(box(.045, .41, .045, x, .52, -.65, seatMaterial));
}
chair.add(box(.50, .13, .045, 0, .70, -.65, seatMaterial));
const wall = box(1.16, 1.68, .035, 0, .84, .793,
  new MeshStandardMaterial({ color: 0x59acb0, transparent: true, opacity: .17, depthWrite: false }));
scene.add(chair, wall, new GridHelper(5, 20, 0x355068, 0x24394d));
scene.add(new AmbientLight(0xc3e2f4, 1.6));
const key = new DirectionalLight(0xfff1d9, 2.4);
key.position.set(3, 6, 4);
const fill = new DirectionalLight(0x7dbbff, 1.7);
fill.position.set(-3, 2, -4);
scene.add(key, fill);

function render() {
  if (!renderer || !panel.classList.contains('active')) return;
  const { clientWidth: width, clientHeight: height } = stage;
  if (!width || !height) return;
  const bridge = selector.value === 'bridge';
  const span = Math.max(bridge ? 1.25 : 2.06, (bridge ? 2.05 : 1.74) * height / width);
  camera.left = -span * width / height / 2;
  camera.right = -camera.left;
  camera.top = span / 2;
  camera.bottom = -camera.top;
  camera.near = .1;
  camera.far = 15;
  target.set(0, bridge ? .39 : .88, bridge ? .06 : .07);
  camera.position.copy(target).add(new Vector3(3.6 * Math.sin(angle), bridge ? 1.8 : .95, 3.6 * Math.cos(angle)));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);
}

function tick(time) {
  if (previousTime && playing) mixer.update(Math.min(.06, (time - previousTime) / 1000));
  previousTime = time;
  render();
  frame = requestAnimationFrame(tick);
}

function updateVisibility() {
  if (panel.classList.contains('active') && !document.hidden && mixer) {
    if (!frame) frame = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
}

function setExercise(clips) {
  current?.stop();
  const name = selector.value;
  chair.visible = name === 'squat';
  wall.visible = name === 'wall';
  current = mixer.clipAction(clips.get(name)).reset().play();
  mixer.update(0);
  document.querySelector('#modelTip').textContent = hints[name];
  render();
}

async function initialize() {
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const { scene: model, animations } = await new GLTFLoader().parseAsync(mannequin.buffer, '');
    const clips = new Map(animations.map(clip => [clip.name, clip]));
    if (Object.keys(hints).some(name => !clips.has(name))) throw new Error('Missing motion clip');
    scene.add(model);
    mixer = new AnimationMixer(model);
    setExercise(clips);
    selector.addEventListener('change', () => setExercise(clips));
    for (const button of viewButtons) {
      button.addEventListener('click', () => {
        angle = angles[button.dataset.view];
        for (const item of viewButtons) item.setAttribute('aria-pressed', String(item === button));
        render();
      });
    }
    toggle.addEventListener('click', () => {
      playing = !playing;
      toggle.textContent = playing ? 'إيقاف الحركة' : 'تشغيل الحركة';
    });
    speed.addEventListener('click', () => {
      halfSpeed = !halfSpeed;
      mixer.timeScale = halfSpeed ? .5 : 1;
      speed.textContent = halfSpeed ? 'السرعة 0.5×' : 'السرعة 1×';
    });
    restart.addEventListener('click', () => {
      current.reset().play();
      mixer.update(0);
      render();
    });
    status.textContent = 'عرض ثلاثي الأبعاد تجريبي';
    new MutationObserver(updateVisibility).observe(panel, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
  } catch (error) {
    renderer?.dispose();
    status.textContent = 'تعذّر تشغيل العرض الثلاثي الأبعاد على هذا الجهاز.';
    for (const control of [selector, toggle, speed, restart, ...viewButtons]) control.disabled = true;
    console.error(error);
  }
}

initialize();
