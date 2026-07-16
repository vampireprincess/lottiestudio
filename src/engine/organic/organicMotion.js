/**
 * Organic Motion Engine — Faza 7
 * Growing vines, hanging elements, spider, lantern, wind, butterfly, etc.
 */
import { v4 as uuidv4 } from 'uuid';

// ─── Seeded RNG ────────────────────────────────────────────────────────────────
export function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}

// ─── Keyframe helper ──────────────────────────────────────────────────────────
function kf(layerId, property, frame, value, easing = { type: 'smooth', bezier: [0.25,0.1,0.25,1] }) {
  return { id: uuidv4(), layerId, property, frame: Math.round(frame), value, easing, hold: false, selected: false };
}

// ─── GROWING VINE ─────────────────────────────────────────────────────────────
export function generateGrowingVine(layerIds, project, options = {}) {
  const {
    startFrame = 0, duration = 60, fps = 30,
    amplitude = 1, overshoot = 0.1, staggerDelay = 4,
    seed = 42, easing = { type: 'overshoot', bezier: [0.34,1.56,0.64,1] },
  } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const layer = project.layers[lid];
    if (!layer) return;
    const delay = i * staggerDelay;
    const start = startFrame + delay;
    const end = start + duration;

    // Scale grow from 0 → 1 with optional overshoot
    keyframes.push(kf(lid, 'transform.scale', start, { x: 0, y: 0 }, { type: 'linear' }));
    if (overshoot > 0) {
      const os = 1 + overshoot;
      keyframes.push(kf(lid, 'transform.scale', end - Math.round(duration * 0.15), { x: os, y: os }, easing));
    }
    keyframes.push(kf(lid, 'transform.scale', end, { x: 1, y: 1 }, easing));

    // Opacity fade in
    keyframes.push(kf(lid, 'opacity', start, 0));
    keyframes.push(kf(lid, 'opacity', start + Math.round(duration * 0.2), 1));

    // Slight random rotation wobble
    const wobble = (rng() - 0.5) * 8 * amplitude;
    keyframes.push(kf(lid, 'transform.rotation', start, wobble));
    keyframes.push(kf(lid, 'transform.rotation', end, 0));
  });

  return keyframes;
}

// ─── TRIM PATH GROW (stroke-based vines) ──────────────────────────────────────
export function generateTrimPathGrow(layerIds, project, options = {}) {
  const { startFrame = 0, duration = 60, staggerDelay = 8, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const delay = i * staggerDelay;
    const start = startFrame + delay;
    const end = start + duration;
    keyframes.push(kf(lid, 'trimEnd', start, 0, { type: 'linear' }));
    keyframes.push(kf(lid, 'trimEnd', end, 1, { type: 'smooth', bezier: [0.25,0.1,0.25,1] }));
  });

  return keyframes;
}

// ─── HANGING VINE SWING ───────────────────────────────────────────────────────
export function generateHangingSwing(layerIds, project, options = {}) {
  const {
    startFrame = 0, totalFrames = 180, fps = 30,
    amplitude = 12, speed = 1, damping = 0,
    seed = 42, type = 'gentle', pivot = 'top',
  } = options;
  const rng = seededRng(seed);
  const keyframes = [];
  const period = Math.round(fps * 2.2 / speed);

  layerIds.forEach((lid, i) => {
    const phase = rng() * period;
    const amp = amplitude * (1 + (rng() - 0.5) * 0.3);
    let f = startFrame;
    let cycle = 0;

    while (f < startFrame + totalFrames) {
      const t = (f - startFrame) / fps;
      const dampFactor = damping > 0 ? Math.exp(-damping * t * 0.1) : 1;
      const angle = Math.sin((f + phase) / period * Math.PI * 2) * amp * dampFactor;
      keyframes.push(kf(lid, 'transform.rotation', f, angle, { type: 'smooth', bezier: [0.25,0.1,0.25,1] }));
      f += Math.round(period / 8);
      cycle++;
      if (cycle > 200) break;
    }
    // Ensure last frame matches first for seamless loop
    const firstVal = keyframes.find(k => k.layerId === lid)?.value || 0;
    keyframes.push(kf(lid, 'transform.rotation', startFrame + totalFrames - 1, firstVal));
  });

  return keyframes;
}

// ─── PENDULUM (hanging sign, lantern, spider) ─────────────────────────────────
export function generatePendulum(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 120, fps = 30, amplitude = 15, speed = 1, seed = 42, phase = 0 } = options;
  const rng = seededRng(seed);
  const period = Math.round(fps * 2.0 / speed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const ph = (rng() * period + phase * i) % period;
    const amp = amplitude * (0.8 + rng() * 0.4);
    let f = startFrame;
    while (f <= startFrame + totalFrames) {
      const angle = Math.sin((f + ph) / period * Math.PI * 2) * amp;
      keyframes.push(kf(lid, 'transform.rotation', f, angle));
      f += Math.round(period / 6);
    }
  });

  return keyframes;
}

// ─── SPIDER CLIMB ─────────────────────────────────────────────────────────────
export function generateSpiderClimb(layerIds, project, options = {}) {
  const {
    startFrame = 0, duration = 90, fps = 30,
    startY = 0, endY = -300, pauseAt = null, pauseDuration = 15,
    seed = 42, wobble = true,
  } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const layer = project.layers[lid];
    const baseX = layer?.transform?.position?.x || 0;
    const baseY = layer?.transform?.position?.y || 0;

    if (pauseAt !== null) {
      // Climb, pause, continue
      const pauseFrame = startFrame + Math.round(duration * pauseAt);
      keyframes.push(kf(lid, 'transform.position', startFrame, { x: baseX, y: baseY + startY }));
      keyframes.push(kf(lid, 'transform.position', pauseFrame, { x: baseX + (rng()-0.5)*4, y: baseY + (endY - startY) * pauseAt + startY }));
      keyframes.push(kf(lid, 'transform.position', pauseFrame + pauseDuration, { x: baseX + (rng()-0.5)*4, y: baseY + (endY - startY) * pauseAt + startY }));
      keyframes.push(kf(lid, 'transform.position', startFrame + duration, { x: baseX, y: baseY + endY }));
    } else {
      keyframes.push(kf(lid, 'transform.position', startFrame, { x: baseX, y: baseY + startY }));
      // Mid point with slight wobble
      if (wobble) {
        keyframes.push(kf(lid, 'transform.position', startFrame + Math.round(duration/2), { x: baseX + (rng()-0.5)*6, y: baseY + startY + (endY-startY)*0.5 }));
      }
      keyframes.push(kf(lid, 'transform.position', startFrame + duration, { x: baseX, y: baseY + endY }));
    }

    // Thread length (trimEnd)
    keyframes.push(kf(lid, 'trimEnd', startFrame, 0));
    keyframes.push(kf(lid, 'trimEnd', startFrame + duration, 1));

    // Slight rotation wobble
    if (wobble) {
      for (let f = startFrame; f <= startFrame + duration; f += Math.round(fps/4)) {
        keyframes.push(kf(lid, 'transform.rotation', f, (rng()-0.5)*8));
      }
    }
  });

  return keyframes;
}

// ─── WIND REACTIVE ────────────────────────────────────────────────────────────
export function generateWindReactive(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 120, fps = 30, strength = 8, turbulence = 0.3, direction = 1, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const layer = project.layers[lid];
    const basePos = layer?.transform?.position || { x: 0, y: 0 };
    const baseRot = layer?.transform?.rotation || 0;
    const phaseOffset = rng() * 20;

    // Rotation
    for (let f = startFrame; f <= startFrame + totalFrames; f += 4) {
      const t = (f - startFrame + phaseOffset) / fps;
      const wind = Math.sin(t * 1.8) * strength * direction;
      const turb = (rng() - 0.5) * strength * turbulence;
      const gust = Math.max(0, Math.sin(t * 0.4)) * strength * 0.5 * direction;
      keyframes.push(kf(lid, 'transform.rotation', f, baseRot + wind + turb + gust));
    }

    // Ensure loop
    const firstRotKf = keyframes.find(k => k.layerId === lid && k.property === 'transform.rotation');
    if (firstRotKf) {
      keyframes.push(kf(lid, 'transform.rotation', startFrame + totalFrames, firstRotKf.value));
    }
  });

  return keyframes;
}

// ─── FAIRY LIGHTS FLICKER ─────────────────────────────────────────────────────
export function generateFairyLights(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 120, fps = 30, flickerRate = 0.15, seed = 42, mode = 'random' } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const r2 = seededRng(seed + i * 1337);
    let f = startFrame;
    while (f <= startFrame + totalFrames) {
      const on = r2() > flickerRate;
      const brightness = on ? 0.5 + r2() * 0.5 : 0.05 + r2() * 0.1;
      keyframes.push(kf(lid, 'opacity', f, brightness, { type: 'linear' }));
      const nextStep = mode === 'chase' ? Math.round(fps / 8) : Math.round(fps / (4 + r2() * 8));
      f += Math.max(1, nextStep);
    }
    keyframes.push(kf(lid, 'opacity', startFrame + totalFrames - 1, 0.6 + rng() * 0.4));
  });

  return keyframes;
}

// ─── BUTTERFLY WING FLAP ──────────────────────────────────────────────────────
export function generateButterflyFlap(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 60, fps = 30, flapSpeed = 1, asymmetric = false, seed = 42 } = options;
  const rng = seededRng(seed);
  const period = Math.round(fps * 0.3 / flapSpeed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const isLeft = i % 2 === 0;
    let f = startFrame;
    while (f <= startFrame + totalFrames) {
      const t = (f - startFrame) / period;
      const flapAngle = Math.sin(t * Math.PI * 2) * (isLeft ? 1 : -1) * 35 + (asymmetric && isLeft ? rng() * 5 : 0);
      keyframes.push(kf(lid, 'transform.rotation', f, flapAngle));
      f += Math.max(1, Math.round(period / 8));
    }
  });

  return keyframes;
}

// ─── DRIP (slime, water, wax) ─────────────────────────────────────────────────
export function generateDrip(layerIds, project, options = {}) {
  const { startFrame = 0, fps = 30, dropDuration = 20, fallDistance = 200, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const layer = project.layers[lid];
    const basePos = layer?.transform?.position || { x: 0, y: 0 };
    const delay = i * Math.round(fps * (0.5 + rng() * 1));
    const start = startFrame + delay;

    // Stretch before drop
    keyframes.push(kf(lid, 'transform.scale', start, { x: 1, y: 1 }));
    keyframes.push(kf(lid, 'transform.scale', start + Math.round(dropDuration * 0.4), { x: 0.7, y: 1.4 }));

    // Drop
    keyframes.push(kf(lid, 'transform.position', start, { x: basePos.x, y: basePos.y }));
    keyframes.push(kf(lid, 'transform.position', start + dropDuration, { x: basePos.x, y: basePos.y + fallDistance }, { type: 'accelerate', bezier: [0.4,0,1,1] }));

    // Squash on landing
    keyframes.push(kf(lid, 'transform.scale', start + dropDuration, { x: 1.3, y: 0.6 }));
    keyframes.push(kf(lid, 'transform.scale', start + dropDuration + 6, { x: 1, y: 1 }));

    // Opacity out
    keyframes.push(kf(lid, 'opacity', start + dropDuration, 1));
    keyframes.push(kf(lid, 'opacity', start + dropDuration + 12, 0));

    // Reset
    keyframes.push(kf(lid, 'transform.position', start + dropDuration + 20, { x: basePos.x, y: basePos.y }, { type: 'linear' }));
    keyframes.push(kf(lid, 'opacity', start + dropDuration + 20, 1, { type: 'linear' }));
  });

  return keyframes;
}

// ─── COBWEB MOVEMENT ──────────────────────────────────────────────────────────
export function generateCobwebMovement(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 90, fps = 30, amplitude = 3, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const layer = project.layers[lid];
    const basePos = layer?.transform?.position || { x: 0, y: 0 };
    const ph = rng() * 30;

    for (let f = startFrame; f <= startFrame + totalFrames; f += 6) {
      const t = (f - startFrame + ph) / fps;
      const dx = Math.sin(t * 1.2) * amplitude * (0.5 + rng() * 0.5);
      const dy = Math.cos(t * 0.8) * amplitude * 0.3;
      keyframes.push(kf(lid, 'transform.position', f, { x: basePos.x + dx, y: basePos.y + dy }));
    }
    keyframes.push(kf(lid, 'transform.position', startFrame + totalFrames - 1, basePos));
  });

  return keyframes;
}

// ─── HANGING LEAVES ───────────────────────────────────────────────────────────
export function generateHangingLeaves(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 150, fps = 30, amplitude = 10, windGust = false, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const phase = rng() * 40;
    const amp = amplitude * (0.6 + rng() * 0.8);
    const period = fps * (1.5 + rng() * 1.5);

    for (let f = startFrame; f <= startFrame + totalFrames; f += 5) {
      const t = f - startFrame + phase;
      let angle = Math.sin(t / period * Math.PI * 2) * amp;

      if (windGust && rng() < 0.002) {
        angle += (rng() - 0.5) * amp * 3;
      }

      keyframes.push(kf(lid, 'transform.rotation', f, angle));
    }
    keyframes.push(kf(lid, 'transform.rotation', startFrame + totalFrames, 0));
  });

  return keyframes;
}

// ─── SWINGING DECORATION ──────────────────────────────────────────────────────
export function generateSwingingDecoration(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 100, fps = 30, amplitude = 20, bounce = 0.05, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid, i) => {
    const phase = rng() * 50;
    const amp = amplitude * (0.7 + rng() * 0.6);
    const period = fps * (1.8 + rng() * 1.2);

    for (let f = startFrame; f <= startFrame + totalFrames; f += 4) {
      const t = (f - startFrame + phase);
      const angle = Math.sin(t / period * Math.PI * 2) * amp;
      const scaleB = 1 + Math.abs(Math.sin(t / period * Math.PI)) * bounce;
      keyframes.push(kf(lid, 'transform.rotation', f, angle));
      if (bounce > 0) keyframes.push(kf(lid, 'transform.scale', f, { x: scaleB, y: scaleB }));
    }
    keyframes.push(kf(lid, 'transform.rotation', startFrame + totalFrames, 0));
  });

  return keyframes;
}

// ─── LANTERN (swing + glow pulse) ─────────────────────────────────────────────
export function generateLantern(layerIds, project, options = {}) {
  const { startFrame = 0, totalFrames = 120, fps = 30, swingAmp = 12, flickerAmount = 0.15, seed = 42 } = options;
  const rng = seededRng(seed);
  const keyframes = [];

  layerIds.forEach((lid) => {
    const swingKfs = generatePendulum([lid], project, { startFrame, totalFrames, fps, amplitude: swingAmp, seed });
    keyframes.push(...swingKfs);

    // Glow flicker via opacity
    for (let f = startFrame; f <= startFrame + totalFrames; f += Math.round(fps / 8)) {
      const flicker = 1 - rng() * flickerAmount;
      keyframes.push(kf(lid, 'opacity', f, flicker, { type: 'linear' }));
    }
    keyframes.push(kf(lid, 'opacity', startFrame + totalFrames - 1, 1));
  });

  return keyframes;
}

export const ORGANIC_MOTION_TYPES = [
  { id: 'growingVine',       label: 'Growing Vine',        icon: '🌿', desc: 'Scale grow + trim path reveal' },
  { id: 'trimPathGrow',      label: 'Trim Path Draw-On',   icon: '✏️',  desc: 'Stroke path grows from start to end' },
  { id: 'hangingSwing',      label: 'Hanging Swing',       icon: '🎋', desc: 'Pendulum sway for vines/branches' },
  { id: 'pendulum',          label: 'Pendulum',            icon: '⚖️',  desc: 'Classic pendulum for signs/lanterns' },
  { id: 'spiderClimb',       label: 'Spider Climb',        icon: '🕷️',  desc: 'Element climbs/descends + thread grow' },
  { id: 'windReactive',      label: 'Wind Reactive',       icon: '💨', desc: 'Wind-driven rotation with gusts' },
  { id: 'fairyLights',       label: 'Fairy Lights',        icon: '✨', desc: 'Random flicker/chase per element' },
  { id: 'butterflyFlap',     label: 'Wing Flap',           icon: '🦋', desc: 'Wing flap for butterfly/moth' },
  { id: 'drip',              label: 'Drip / Drop',         icon: '💧', desc: 'Stretch, drop, squash sequence' },
  { id: 'cobwebMovement',    label: 'Cobweb Drift',        icon: '🕸️',  desc: 'Subtle drift for cobwebs' },
  { id: 'hangingLeaves',     label: 'Hanging Leaves',      icon: '🍃', desc: 'Individual leaf sway with phase offset' },
  { id: 'swingingDecoration',label: 'Swinging Decoration', icon: '🎀', desc: 'Swing for stars, hearts, ornaments' },
  { id: 'lantern',           label: 'Lantern',             icon: '🏮', desc: 'Swing + opacity flicker combined' },
];

export function applyOrganicMotion(motionTypeId, layerIds, project, options) {
  switch (motionTypeId) {
    case 'growingVine':        return generateGrowingVine(layerIds, project, options);
    case 'trimPathGrow':       return generateTrimPathGrow(layerIds, project, options);
    case 'hangingSwing':       return generateHangingSwing(layerIds, project, options);
    case 'pendulum':           return generatePendulum(layerIds, project, options);
    case 'spiderClimb':        return generateSpiderClimb(layerIds, project, options);
    case 'windReactive':       return generateWindReactive(layerIds, project, options);
    case 'fairyLights':        return generateFairyLights(layerIds, project, options);
    case 'butterflyFlap':      return generateButterflyFlap(layerIds, project, options);
    case 'drip':               return generateDrip(layerIds, project, options);
    case 'cobwebMovement':     return generateCobwebMovement(layerIds, project, options);
    case 'hangingLeaves':      return generateHangingLeaves(layerIds, project, options);
    case 'swingingDecoration': return generateSwingingDecoration(layerIds, project, options);
    case 'lantern':            return generateLantern(layerIds, project, options);
    default: return [];
  }
}
