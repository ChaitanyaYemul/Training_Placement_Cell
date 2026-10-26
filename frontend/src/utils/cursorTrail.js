import {
  createSmokeTexture,
  drawSmoke,
  drawButterfly,
} from './cursorArtwork.js';

const MAX_PUFFS = 80;
const MAX_BUTTERFLIES = 3;
const FRAME_INTERVAL = 1000 / 45;

/** Attach one event-driven canvas scene; return a complete StrictMode-safe cleanup. */
export function attachCursorTrail(canvas) {
  if (!canvas || !window.matchMedia) return () => {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let stop = () => {};
  const configure = () => {
    stop();
    stop = () => {};
    if (reducedMotion.matches || !pointer.matches) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const texture = createSmokeTexture();
    if (texture) stop = startScene(canvas, context, texture);
  };
  reducedMotion.addEventListener('change', configure);
  pointer.addEventListener('change', configure);
  configure();
  return () => {
    stop();
    reducedMotion.removeEventListener('change', configure);
    pointer.removeEventListener('change', configure);
  };
}

function startScene(canvas, context, texture) {
  let puffs = [];
  let butterflies = [];
  let frame = 0;
  let lastFrame = 0;
  let lastInput = 0;
  let lastButterfly = 0;
  let previous = null;
  let target = { x: 0, y: 0 };
  let ratio = 1;
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    previous = null;
    puffs = [];
    butterflies = [];
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
  };
  const resize = () => {
    clear();
    // Cap backing-store size on high-DPI screens; the smoke is intentionally soft.
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const render = (time) => {
    if (lastFrame && time - lastFrame < FRAME_INTERVAL) {
      frame = requestAnimationFrame(render);
      return;
    }
    const delta = Math.min((time - (lastFrame || time - 16)) / 1000, 0.05);
    lastFrame = time;
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    puffs = puffs.filter((puff) => {
      puff.age += delta;
      if (puff.age >= puff.duration) return false;
      puff.x += puff.vx * delta;
      puff.y += puff.vy * delta;
      drawSmoke(context, texture, puff);
      return true;
    });
    const idle = (time - lastInput) / 1000;
    if (idle > 1.7) butterflies = [];
    for (const butterfly of butterflies) {
      const offset = time * 0.0015 + butterfly.phase;
      const x = target.x + Math.sin(offset) * (20 + butterfly.phase * 2);
      const y = target.y + Math.cos(offset * 1.3) * 20 - 12;
      const ease = 1 - Math.exp(-delta * butterfly.follow);
      const dx = x - butterfly.x;
      const dy = y - butterfly.y;
      butterfly.x += dx * ease;
      butterfly.y += dy * ease;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        const angle = Math.atan2(dy, dx);
        butterfly.angle +=
          Math.atan2(
            Math.sin(angle - butterfly.angle),
            Math.cos(angle - butterfly.angle),
          ) * ease;
      }
      drawButterfly(
        context,
        butterfly,
        time,
        Math.max(0, 1 - Math.max(0, idle - 0.45) / 1.25),
      );
    }
    if (puffs.length || butterflies.length)
      frame = requestAnimationFrame(render);
    else {
      frame = 0;
      lastFrame = 0;
      previous = null;
    }
  };

  const move = (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (document.hidden) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        'input, textarea, select, [contenteditable="true"], dialog',
      )
    ) {
      clear();
      return;
    }
    const now = performance.now();
    target = { x: event.clientX, y: event.clientY };
    const dx = previous ? target.x - previous.x : 0;
    const dy = previous ? target.y - previous.y : 0;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    // Discard a discontinuous entry instead of painting across the whole screen.
    const steps =
      distance < 250 ? Math.min(10, Math.max(1, Math.ceil(distance / 8))) : 1;
    const origin = distance < 250 && previous ? previous : target;
    for (let i = 1; i <= steps; i += 1) {
      const side = Math.random() * 2 - 1;
      puffs.push({
        x: origin.x + (target.x - origin.x) * (i / steps),
        y: origin.y + (target.y - origin.y) * (i / steps),
        vx: Math.cos(angle + Math.PI / 2) * side * 25,
        vy: Math.sin(angle + Math.PI / 2) * side * 25 - 7,
        radius: 17 + Math.random() * 15,
        duration: 0.75 + Math.random() * 0.65,
        angle,
        turn: side * 1.6,
        phase: Math.random() * Math.PI * 2,
        age: 0,
      });
    }
    puffs = puffs.slice(-MAX_PUFFS);
    if (butterflies.length < MAX_BUTTERFLIES && now - lastButterfly > 230) {
      const index = butterflies.length;
      butterflies.push({
        x: target.x - Math.cos(angle) * 18,
        y: target.y - Math.sin(angle) * 18,
        phase: index * 2.3,
        size: 0.48 + index * 0.1,
        follow: 3.8 - index * 0.8,
        angle,
      });
      lastButterfly = now;
    }
    lastInput = now;
    previous = target;
    if (!frame) frame = requestAnimationFrame(render);
  };
  const leave = (event) => {
    if (!event.relatedTarget) previous = null;
  };
  const visibility = () => {
    if (document.hidden) clear();
  };

  resize();
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('blur', clear);
  window.addEventListener('pointerdown', clear, { passive: true });
  window.addEventListener('pointerout', leave, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  return () => {
    clear();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('resize', resize);
    window.removeEventListener('blur', clear);
    window.removeEventListener('pointerdown', clear);
    window.removeEventListener('pointerout', leave);
    document.removeEventListener('visibilitychange', visibility);
  };
}
