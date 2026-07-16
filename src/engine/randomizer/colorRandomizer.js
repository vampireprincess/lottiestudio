/**
 * Color Randomizer Engine — Faza 8
 */
import { hslToRgb, rgbToHsl } from '../../utils/colorUtils.js';
import { v4 as uuidv4 } from 'uuid';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

// ─── Shades randomizer ────────────────────────────────────────────────────────
export function generateShades(count, opts = {}) {
  const {
    hue = 320, hueRange = 20, satMin = 60, satMax = 100,
    briMin = 40, briMax = 95, alphaMin = 1, alphaMax = 1,
    minColorDiff = 8, seed = 42,
  } = opts;
  const rng = seededRng(seed);
  const colors = [];

  let attempts = 0;
  while (colors.length < count && attempts < count * 20) {
    attempts++;
    const h = (hue + (rng() - 0.5) * hueRange * 2 + 360) % 360;
    const s = satMin + rng() * (satMax - satMin);
    const l = briMin + rng() * (briMax - briMin);
    const a = alphaMin + rng() * (alphaMax - alphaMin);
    const rgb = hslToRgb(h, s, l);
    const color = { ...rgb, a };

    // Check min color difference
    const tooClose = colors.some(existing => {
      const eHsl = rgbToHsl(existing.r, existing.g, existing.b);
      const nHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return Math.abs(eHsl.l - nHsl.l) < minColorDiff;
    });
    if (!tooClose) colors.push(color);
  }
  return colors;
}

// ─── Palette replacement ──────────────────────────────────────────────────────
export function replacePalette(layers, targetPaletteColors, opts = {}) {
  const { preserveRelativeBrightness = true, seed = 42 } = opts;
  const rng = seededRng(seed);

  // Gather all current fill colors and their brightness
  const allColors = [];
  layers.forEach(layer => {
    (layer.fills || []).forEach((fill, fi) => {
      if (fill.type === 'solid' && fill.color) {
        const hsl = rgbToHsl(fill.color.r, fill.color.g, fill.color.b);
        allColors.push({ layerId: layer.id, fillIndex: fi, brightness: hsl.l, color: fill.color });
      }
    });
  });

  if (!allColors.length || !targetPaletteColors.length) return [];

  // Sort by brightness
  const sorted = [...allColors].sort((a, b) => a.brightness - b.brightness);
  const sortedTarget = [...targetPaletteColors].map(c => ({ ...c, hsl: rgbToHsl(c.r, c.g, c.b) }))
    .sort((a, b) => a.hsl.l - b.hsl.l);

  // Map brightness ranks
  const updates = sorted.map((item, i) => {
    const targetIdx = Math.min(Math.round((i / sorted.length) * (sortedTarget.length - 1)), sortedTarget.length - 1);
    const targetBase = sortedTarget[targetIdx];
    let newColor;

    if (preserveRelativeBrightness) {
      // Keep relative brightness within the new palette hue
      const origHsl = rgbToHsl(item.color.r, item.color.g, item.color.b);
      const targetHsl = targetBase.hsl;
      const newL = Math.max(5, Math.min(95, targetHsl.l + (origHsl.l - allColors.reduce((s,c)=>s+rgbToHsl(c.color.r,c.color.g,c.color.b).l,0)/allColors.length)));
      const rgb = hslToRgb(targetHsl.h, targetHsl.s, newL);
      newColor = { ...rgb, a: item.color.a ?? 1 };
    } else {
      newColor = { ...targetBase, a: item.color.a ?? 1 };
    }

    return { layerId: item.layerId, fillIndex: item.fillIndex, newColor };
  });

  return updates;
}

// ─── Color animation keyframes ────────────────────────────────────────────────
export function generateColorAnimation(layers, fromColors, toColors, opts = {}) {
  const {
    startFrame = 0, duration = 30, mode = 'instant',
    fps = 30, seed = 42,
  } = opts;
  const rng = seededRng(seed);
  const keyframes = [];

  const kf = (layerId, fillIndex, frame, color, easing = { type: 'linear' }) => ({
    id: uuidv4(), layerId, property: `fills.${fillIndex}.color`, frame, value: color, easing, hold: false, selected: false,
  });

  layers.forEach((layer, li) => {
    (layer.fills || []).forEach((fill, fi) => {
      if (fill.type !== 'solid') return;
      const from = fromColors[li]?.[fi] || fill.color;
      const to = toColors[li]?.[fi] || fill.color;

      switch (mode) {
        case 'instant':
          keyframes.push(kf(layer.id, fi, startFrame, from, { type: 'linear' }));
          keyframes.push(kf(layer.id, fi, startFrame + 1, to, { type: 'linear' }));
          break;
        case 'smooth':
          keyframes.push(kf(layer.id, fi, startFrame, from));
          keyframes.push(kf(layer.id, fi, startFrame + duration, to, { type: 'easeInOut', bezier: [0.42,0,0.58,1] }));
          break;
        case 'flicker':
          keyframes.push(kf(layer.id, fi, startFrame, from, { type: 'linear' }));
          for (let s = 1; s <= 6; s++) {
            const f = startFrame + Math.round(s / 7 * duration);
            keyframes.push(kf(layer.id, fi, f, s % 2 === 0 ? from : to, { type: 'linear' }));
          }
          keyframes.push(kf(layer.id, fi, startFrame + duration, to, { type: 'linear' }));
          break;
        case 'leftToRight': {
          const delay = li * Math.round(duration / (layers.length + 1));
          keyframes.push(kf(layer.id, fi, startFrame + delay, from));
          keyframes.push(kf(layer.id, fi, startFrame + delay + Math.round(duration * 0.4), to));
          break;
        }
        case 'chase': {
          const chaseDelay = li * Math.round(fps / 6);
          keyframes.push(kf(layer.id, fi, startFrame + chaseDelay, from, { type: 'linear' }));
          keyframes.push(kf(layer.id, fi, startFrame + chaseDelay + 3, to, { type: 'linear' }));
          break;
        }
        case 'pulse': {
          const pd = Math.round(duration / 2);
          keyframes.push(kf(layer.id, fi, startFrame, from));
          keyframes.push(kf(layer.id, fi, startFrame + pd, to));
          keyframes.push(kf(layer.id, fi, startFrame + duration, from));
          break;
        }
        default:
          keyframes.push(kf(layer.id, fi, startFrame, from));
          keyframes.push(kf(layer.id, fi, startFrame + duration, to));
      }
    });
  });

  return keyframes;
}

// ─── Random from existing colors ──────────────────────────────────────────────
export function shuffleExistingColors(layers, opts = {}) {
  const { seed = 42, preventAdjacent = false } = opts;
  const rng = seededRng(seed);

  // Gather all solid fill colors
  const colorEntries = [];
  layers.forEach(layer => {
    (layer.fills || []).forEach((fill, fi) => {
      if (fill.type === 'solid' && fill.color) {
        colorEntries.push({ layerId: layer.id, fillIndex: fi, color: fill.color });
      }
    });
  });

  const colors = colorEntries.map(e => e.color);
  // Fisher-Yates shuffle with seed
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  return colorEntries.map((entry, i) => ({ ...entry, newColor: colors[i] }));
}

// ─── General randomizer (rotation, scale, opacity, etc.) ─────────────────────
export function randomizeProperty(layers, property, opts = {}) {
  const { min = 0, max = 1, seed = 42 } = opts;
  const rng = seededRng(seed);
  const updates = [];

  layers.forEach(layer => {
    const val = min + rng() * (max - min);
    let value;
    if (property === 'transform.scale') value = { x: val, y: val };
    else if (property === 'transform.rotation') value = val;
    else if (property === 'opacity') value = val;
    else if (property === 'transform.position') {
      value = { x: (rng() - 0.5) * (max - min), y: (rng() - 0.5) * (max - min) };
    }
    else value = val;
    updates.push({ layerId: layer.id, property, value });
  });

  return updates;
}

export const PALETTE_PRESETS = [
  { id: 'pink',      label: 'Pink',      hue: 330, hueRange: 25 },
  { id: 'red',       label: 'Red',       hue: 0,   hueRange: 20 },
  { id: 'orange',    label: 'Orange',    hue: 30,  hueRange: 20 },
  { id: 'yellow',    label: 'Yellow',    hue: 55,  hueRange: 15 },
  { id: 'green',     label: 'Green',     hue: 130, hueRange: 30 },
  { id: 'teal',      label: 'Teal',      hue: 175, hueRange: 20 },
  { id: 'blue',      label: 'Blue',      hue: 215, hueRange: 25 },
  { id: 'purple',    label: 'Purple',    hue: 275, hueRange: 25 },
  { id: 'gold',      label: 'Gold',      hue: 45,  hueRange: 15, satMin: 70, briMin: 50, briMax: 80 },
  { id: 'pastel',    label: 'Pastel',    hue: 270, hueRange: 60, satMax: 60, briMin: 75, briMax: 95 },
  { id: 'neon',      label: 'Neon',      hue: 300, hueRange: 60, satMin: 90, briMin: 60, briMax: 80 },
  { id: 'dark',      label: 'Dark',      hue: 240, hueRange: 40, satMax: 40, briMin: 10, briMax: 40 },
  { id: 'rainbow',   label: 'Rainbow',   hue: 0,   hueRange: 360 },
  { id: 'monochrome',label: 'Monochrome',hue: 0,   hueRange: 0, satMax: 0 },
];

export const COLOR_CHANGE_MODES = [
  { id: 'instant',    label: 'Instant Change' },
  { id: 'smooth',     label: 'Smooth Transition' },
  { id: 'flicker',    label: 'Flicker Change' },
  { id: 'leftToRight',label: 'Left → Right Wave' },
  { id: 'rightToLeft',label: 'Right → Left Wave' },
  { id: 'chase',      label: 'Chase' },
  { id: 'pulse',      label: 'Pulse Then Change' },
  { id: 'alternate',  label: 'Alternate' },
];
