/**
 * Animation Presets Engine — Faza 6
 * Entrance, Idle, Exit presets
 */
import { v4 as uuidv4 } from 'uuid';

// ─── Entrance Presets ─────────────────────────────────────────────────────────

export const ENTRANCE_PRESETS = [
  { id: 'fadeIn',        label: 'Fade In',         icon: '◐', category: 'entrance' },
  { id: 'scaleIn',       label: 'Scale In',         icon: '⊕', category: 'entrance' },
  { id: 'popIn',         label: 'Pop In',           icon: '●', category: 'entrance' },
  { id: 'bounceIn',      label: 'Bounce In',        icon: '↕', category: 'entrance' },
  { id: 'slideInLeft',   label: 'Slide In Left',    icon: '←', category: 'entrance' },
  { id: 'slideInRight',  label: 'Slide In Right',   icon: '→', category: 'entrance' },
  { id: 'slideInUp',     label: 'Slide In Up',      icon: '↑', category: 'entrance' },
  { id: 'slideInDown',   label: 'Slide In Down',    icon: '↓', category: 'entrance' },
  { id: 'rotateIn',      label: 'Rotate In',        icon: '↻', category: 'entrance' },
  { id: 'drawOn',        label: 'Draw On',          icon: '✏', category: 'entrance' },
  { id: 'wipeReveal',    label: 'Wipe Reveal',      icon: '▶', category: 'entrance' },
  { id: 'growFromAnchor',label: 'Grow From Anchor', icon: '⊙', category: 'entrance' },
  { id: 'blurIn',        label: 'Blur In',          icon: '◉', category: 'entrance' },
  { id: 'elasticAppear', label: 'Elastic Appear',   icon: '⊛', category: 'entrance' },
];

// ─── Idle Presets ─────────────────────────────────────────────────────────────

export const IDLE_PRESETS = [
  { id: 'float',         label: 'Float',            icon: '〜', category: 'idle' },
  { id: 'gentleSway',    label: 'Gentle Sway',      icon: '≈', category: 'idle' },
  { id: 'pulse',         label: 'Pulse',            icon: '◯', category: 'idle' },
  { id: 'breathe',       label: 'Breathing',        icon: '⊙', category: 'idle' },
  { id: 'flicker',       label: 'Flicker',          icon: '✦', category: 'idle' },
  { id: 'neonFlicker',   label: 'Neon Flicker',     icon: '⚡', category: 'idle' },
  { id: 'wiggle',        label: 'Wiggle',           icon: '〰', category: 'idle' },
  { id: 'hover',         label: 'Hover',            icon: '↕', category: 'idle' },
  { id: 'gentleBob',     label: 'Gentle Bob',       icon: '⊻', category: 'idle' },
  { id: 'softRotation',  label: 'Soft Rotation',    icon: '⟳', category: 'idle' },
  { id: 'randomMicro',   label: 'Micro Motion',     icon: '∿', category: 'idle' },
  { id: 'pendulum',      label: 'Pendulum',         icon: '⊸', category: 'idle' },
  { id: 'scaleBreath',   label: 'Scale Breathe',    icon: '⊕', category: 'idle' },
  { id: 'colorShift',    label: 'Color Shift',      icon: '◈', category: 'idle' },
];

// ─── Exit Presets ─────────────────────────────────────────────────────────────

export const EXIT_PRESETS = [
  { id: 'fadeOut',       label: 'Fade Out',         icon: '◑', category: 'exit' },
  { id: 'shrink',        label: 'Shrink',           icon: '⊖', category: 'exit' },
  { id: 'popOut',        label: 'Pop Out',          icon: '○', category: 'exit' },
  { id: 'slideOutLeft',  label: 'Slide Out Left',   icon: '←', category: 'exit' },
  { id: 'slideOutRight', label: 'Slide Out Right',  icon: '→', category: 'exit' },
  { id: 'slideOutUp',    label: 'Slide Out Up',     icon: '↑', category: 'exit' },
  { id: 'slideOutDown',  label: 'Slide Out Down',   icon: '↓', category: 'exit' },
  { id: 'retractPath',   label: 'Retract Path',     icon: '↩', category: 'exit' },
  { id: 'spinOut',       label: 'Spin Out',         icon: '↻', category: 'exit' },
  { id: 'blurOut',       label: 'Blur Out',         icon: '◉', category: 'exit' },
];

export const ALL_PRESETS = [...ENTRANCE_PRESETS, ...IDLE_PRESETS, ...EXIT_PRESETS];

// ─── Preset Application Engine ────────────────────────────────────────────────

export function applyAnimationPreset(presetId, layerId, layer, options = {}) {
  const {
    startFrame = 0,
    duration = 30,
    easing = { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] },
    intensity = 1.0,
    direction = 1,
    loop = false,
    pingPong = false,
    preserveFinalState = true,
    canvasWidth = 1920,
    canvasHeight = 1080,
  } = options;

  const endFrame = startFrame + duration;
  const pos = layer.transform?.position || { x: 0, y: 0 };
  const anchor = layer.transform?.anchor || { x: 0, y: 0 };
  const keyframes = [];

  const kf = (property, frame, value, ez = easing) => ({
    id: uuidv4(),
    layerId,
    property,
    frame: Math.round(frame),
    value,
    easing: ez,
    hold: false,
    selected: false,
  });

  switch (presetId) {
    // ── ENTRANCE ──────────────────────────────────────────────────────────────
    case 'fadeIn':
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', endFrame, 1));
      break;

    case 'scaleIn':
      keyframes.push(kf('transform.scale', startFrame, { x: 0, y: 0 }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', endFrame, 1));
      break;

    case 'popIn':
      keyframes.push(kf('transform.scale', startFrame, { x: 0, y: 0 }, { type: 'overshoot', bezier: [0.34, 1.56, 0.64, 1] }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }, { type: 'overshoot', bezier: [0.34, 1.56, 0.64, 1] }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', endFrame > startFrame + 8 ? startFrame + 8 : endFrame, 1));
      break;

    case 'bounceIn': {
      const bounceEasing = { type: 'bounce' };
      keyframes.push(kf('transform.scale', startFrame, { x: 0.01, y: 0.01 }, bounceEasing));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }, bounceEasing));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame + 6, endFrame), 1));
      break;
    }

    case 'slideInLeft':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x - canvasWidth * 0.5 * intensity, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame + 6, endFrame), 1));
      break;

    case 'slideInRight':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x + canvasWidth * 0.5 * intensity, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame + 6, endFrame), 1));
      break;

    case 'slideInUp':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y + canvasHeight * 0.4 * intensity }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame + 6, endFrame), 1));
      break;

    case 'slideInDown':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y - canvasHeight * 0.4 * intensity }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame + 6, endFrame), 1));
      break;

    case 'rotateIn':
      keyframes.push(kf('transform.rotation', startFrame, -180 * intensity * direction));
      keyframes.push(kf('transform.rotation', endFrame, 0));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', endFrame, 1));
      break;

    case 'drawOn':
      keyframes.push(kf('trimEnd', startFrame, 0));
      keyframes.push(kf('trimEnd', endFrame, 1));
      break;

    case 'wipeReveal':
      keyframes.push(kf('trimStart', startFrame, 0));
      keyframes.push(kf('trimEnd', startFrame, 0));
      keyframes.push(kf('trimEnd', endFrame, 1));
      break;

    case 'growFromAnchor':
      keyframes.push(kf('transform.scale', startFrame, { x: 0.01, y: 0.01 }, { type: 'overshoot', bezier: [0.34, 1.56, 0.64, 1] }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }));
      break;

    case 'blurIn':
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', endFrame, 1));
      keyframes.push(kf('transform.scale', startFrame, { x: 1.1 * intensity, y: 1.1 * intensity }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }));
      break;

    case 'elasticAppear':
      keyframes.push(kf('transform.scale', startFrame, { x: 0, y: 0 }, { type: 'elastic' }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1, y: 1 }, { type: 'elastic' }));
      keyframes.push(kf('opacity', startFrame, 0));
      keyframes.push(kf('opacity', Math.min(startFrame+3, endFrame), 1));
      break;

    // ── IDLE ──────────────────────────────────────────────────────────────────
    case 'float': {
      const amp = 12 * intensity;
      const loopEnd = loop ? endFrame : startFrame + duration;
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', startFrame + Math.round(duration/2), { x: pos.x, y: pos.y - amp }, { type: 'smooth', bezier: [0.25, 0.1, 0.25, 1] }));
      keyframes.push(kf('transform.position', loopEnd, { x: pos.x, y: pos.y }));
      break;
    }

    case 'gentleSway': {
      const swayAmp = 8 * intensity;
      keyframes.push(kf('transform.rotation', startFrame, 0));
      keyframes.push(kf('transform.rotation', startFrame + Math.round(duration/4), swayAmp, { type: 'smooth', bezier: [0.25, 0.1, 0.25, 1] }));
      keyframes.push(kf('transform.rotation', startFrame + Math.round(duration/2), 0));
      keyframes.push(kf('transform.rotation', startFrame + Math.round(duration*3/4), -swayAmp));
      keyframes.push(kf('transform.rotation', startFrame + duration, 0));
      break;
    }

    case 'pulse': {
      const ps = 0.08 * intensity;
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', startFrame + Math.round(duration/2), { x: 1+ps, y: 1+ps }));
      keyframes.push(kf('transform.scale', startFrame + duration, { x: 1, y: 1 }));
      break;
    }

    case 'breathe': {
      const bs = 0.05 * intensity;
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', startFrame + Math.round(duration/2), { x: 1+bs, y: 1+bs }, { type: 'smooth', bezier: [0.25, 0.1, 0.25, 1] }));
      keyframes.push(kf('transform.scale', startFrame + duration, { x: 1, y: 1 }));
      break;
    }

    case 'flicker':
      for (let i = 0; i < 6; i++) {
        const f = startFrame + Math.round((i / 6) * duration);
        keyframes.push(kf('opacity', f, i % 2 === 0 ? 1 : 0.3 + Math.random() * 0.4));
      }
      keyframes.push(kf('opacity', startFrame + duration, 1));
      break;

    case 'neonFlicker':
      for (let i = 0; i < 10; i++) {
        const f = startFrame + Math.round((i / 10) * duration);
        const onOff = Math.random() > 0.2;
        keyframes.push(kf('opacity', f, onOff ? 1 : 0.1, { type: 'linear' }));
      }
      keyframes.push(kf('opacity', startFrame + duration, 1, { type: 'linear' }));
      break;

    case 'wiggle': {
      const wa = 6 * intensity;
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const f = startFrame + Math.round((i / steps) * duration);
        const dx = (i % 2 === 0 ? 1 : -1) * wa * (1 - i/steps);
        keyframes.push(kf('transform.position', f, { x: pos.x + dx, y: pos.y }));
      }
      keyframes.push(kf('transform.position', startFrame + duration, { x: pos.x, y: pos.y }));
      break;
    }

    case 'hover': {
      const ha = 6 * intensity;
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', startFrame + Math.round(duration/2), { x: pos.x, y: pos.y - ha }));
      keyframes.push(kf('transform.position', startFrame + duration, { x: pos.x, y: pos.y }));
      break;
    }

    case 'gentleBob': {
      const ba = 4 * intensity;
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', startFrame + Math.round(duration/3), { x: pos.x, y: pos.y - ba }));
      keyframes.push(kf('transform.position', startFrame + Math.round(duration*2/3), { x: pos.x, y: pos.y + ba/2 }));
      keyframes.push(kf('transform.position', startFrame + duration, { x: pos.x, y: pos.y }));
      break;
    }

    case 'softRotation': {
      const ra = 5 * intensity;
      keyframes.push(kf('transform.rotation', startFrame, 0));
      keyframes.push(kf('transform.rotation', startFrame + Math.round(duration/2), ra));
      keyframes.push(kf('transform.rotation', startFrame + duration, 0));
      break;
    }

    case 'pendulum': {
      const pa = 15 * intensity;
      keyframes.push(kf('transform.rotation', startFrame, -pa, { type: 'smooth', bezier: [0.25, 0.1, 0.25, 1] }));
      keyframes.push(kf('transform.rotation', startFrame + Math.round(duration/2), pa));
      keyframes.push(kf('transform.rotation', startFrame + duration, -pa));
      break;
    }

    case 'scaleBreath': {
      const ss = 0.06 * intensity;
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', startFrame + Math.round(duration/2), { x: 1+ss, y: 1-ss/2 }));
      keyframes.push(kf('transform.scale', startFrame + duration, { x: 1, y: 1 }));
      break;
    }

    case 'randomMicro': {
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const f = startFrame + Math.round((i/steps)*duration);
        const dx = (Math.random()-0.5) * 3 * intensity;
        const dy = (Math.random()-0.5) * 3 * intensity;
        keyframes.push(kf('transform.position', f, { x: pos.x+dx, y: pos.y+dy }));
      }
      break;
    }

    // ── EXIT ──────────────────────────────────────────────────────────────────
    case 'fadeOut':
      keyframes.push(kf('opacity', startFrame, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'shrink':
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', endFrame, { x: 0, y: 0 }));
      keyframes.push(kf('opacity', endFrame - 4, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'popOut':
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', startFrame + Math.round(duration * 0.7), { x: 1.15, y: 1.15 }, { type: 'easeIn' }));
      keyframes.push(kf('transform.scale', endFrame, { x: 0, y: 0 }));
      keyframes.push(kf('opacity', endFrame - 4, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'slideOutLeft':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x - canvasWidth * 0.5 * intensity, y: pos.y }));
      keyframes.push(kf('opacity', endFrame - 6, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'slideOutRight':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x + canvasWidth * 0.5 * intensity, y: pos.y }));
      keyframes.push(kf('opacity', endFrame - 6, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'slideOutUp':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y - canvasHeight * 0.4 * intensity }));
      keyframes.push(kf('opacity', endFrame - 6, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'slideOutDown':
      keyframes.push(kf('transform.position', startFrame, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', endFrame, { x: pos.x, y: pos.y + canvasHeight * 0.4 * intensity }));
      keyframes.push(kf('opacity', endFrame - 6, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'retractPath':
      keyframes.push(kf('trimStart', startFrame, 0));
      keyframes.push(kf('trimStart', endFrame, 1));
      break;

    case 'spinOut':
      keyframes.push(kf('transform.rotation', startFrame, 0));
      keyframes.push(kf('transform.rotation', endFrame, 360 * direction * intensity));
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', endFrame, { x: 0, y: 0 }));
      keyframes.push(kf('opacity', endFrame - 4, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      break;

    case 'blurOut':
      keyframes.push(kf('opacity', startFrame, 1));
      keyframes.push(kf('opacity', endFrame, 0));
      keyframes.push(kf('transform.scale', startFrame, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', endFrame, { x: 1.1 * intensity, y: 1.1 * intensity }));
      break;

    default:
      break;
  }

  return keyframes;
}
