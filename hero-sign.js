import { createSign04 } from './motion/sign-04.js';

const sign = document.querySelector('#hero-motion');
const poster = sign.querySelector('img');
const canvas = sign.querySelector('canvas');
const replay = sign.querySelector('button');
const loader = window.lectoriumPreloader;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

let scene;
let presented = false;
let elapsed = 0;
let frame = 0;
let lastFrame = null;

sign.dataset.motionState = 'loading';

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastFrame = null;
}

function showOpenSign() {
  stop();
  elapsed = scene.duration;
  scene.render(elapsed);
  sign.dataset.motionState = 'open';
}

function tick(now) {
  frame = 0;
  if (document.hidden) return;
  if (lastFrame !== null) {
    elapsed = Math.min(scene.duration, elapsed + now - lastFrame);
  }
  lastFrame = now;
  scene.render(elapsed);

  if (elapsed < scene.duration) {
    frame = requestAnimationFrame(tick);
  } else {
    sign.dataset.motionState = 'open';
  }
}

function start() {
  if (!scene || !presented || document.hidden || reducedMotion.matches ||
      frame || elapsed >= scene.duration) return;
  lastFrame = null;
  sign.dataset.motionState = 'playing';
  frame = requestAnimationFrame(tick);
}

function restart() {
  if (!scene || !presented || reducedMotion.matches || elapsed < scene.duration) return;
  elapsed = 0;
  start();
}

replay.addEventListener('click', restart);
replay.addEventListener('focus', restart);
replay.addEventListener('mouseenter', () => {
  if (finePointer.matches) restart();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else start();
});

reducedMotion.addEventListener('change', () => {
  if (!scene || !presented) return;
  replay.hidden = reducedMotion.matches;
  if (reducedMotion.matches) showOpenSign();
});

async function initialize() {
  const pageReady = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  const initialization = Promise.all([pageReady, document.fonts?.ready, createSign04(canvas)]);
  let deadline;
  const timeout = new Promise((_, reject) => {
    deadline = setTimeout(() => reject(new Error('The sign took too long to load')), 8000);
  });

  try {
    const [, , initialized] = await Promise.race([initialization, timeout]);
    scene = initialized;
    scene.render(reducedMotion.matches ? scene.duration : 0);
    canvas.hidden = false;
    poster.hidden = true;
    sign.dataset.motionState = 'ready';
  } catch {
    scene = undefined;
    sign.dataset.motionState = 'fallback';
  } finally {
    clearTimeout(deadline);
    loader?.release();
  }

  if (scene) {
    await loader?.ready;
    presented = true;
    replay.hidden = reducedMotion.matches;
    if (reducedMotion.matches) showOpenSign();
    else {
      // The motion preference may have changed while the overlay was fading.
      scene.render(0);
      start();
    }
  }
}

void initialize();
