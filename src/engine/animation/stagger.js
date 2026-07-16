/**
 * Stagger Engine — Faza 4
 */
import { v4 as uuidv4 } from 'uuid';
import { applyEasing } from './easingEngine.js';

export const STAGGER_ORDERS = [
  { id: 'layerOrder',    label: 'Layer Order' },
  { id: 'leftToRight',   label: 'Left → Right' },
  { id: 'rightToLeft',   label: 'Right → Left' },
  { id: 'topToBottom',   label: 'Top → Bottom' },
  { id: 'bottomToTop',   label: 'Bottom → Top' },
  { id: 'fromCenter',    label: 'From Center' },
  { id: 'toCenter',      label: 'To Center' },
  { id: 'random',        label: 'Random' },
  { id: 'custom',        label: 'Custom' },
];

/**
 * Apply stagger: shift keyframes for each selected layer
 * @param {Array} layers - selected layers (with bboxes attached)
 * @param {Array} keyframeGroups - { layerId, keyframes } array
 * @param {Object} options
 */
export function applyStagger(layers, keyframeGroups, options = {}) {
  const {
    order = 'layerOrder',
    delay = 6,          // frames between each element
    overlap = 0,        // negative = overlap, positive = gap
    reverse = false,
    randomVariation = 0,
    preserveDuration = true,
    seed = 42,
    easing = { type: 'easeInOut' },
  } = options;

  if (!layers.length || !keyframeGroups.length) return keyframeGroups;

  // Sort layers by stagger order
  const sorted = sortByOrder(layers, order, seed);

  // Calculate delay for each layer
  const result = [];
  sorted.forEach((layer, i) => {
    const group = keyframeGroups.find(g => g.layerId === layer.id);
    if (!group) return;

    let frameDelay = i * (delay - overlap);
    if (reverse) frameDelay = (sorted.length - 1 - i) * (delay - overlap);

    // Add random variation
    if (randomVariation > 0) {
      const rng = seededRandom(seed + i * 31337);
      frameDelay += (rng() - 0.5) * randomVariation * 2;
    }

    frameDelay = Math.max(0, Math.round(frameDelay));

    const shiftedKfs = group.keyframes.map(kf => ({
      ...kf,
      id: uuidv4(),
      frame: kf.frame + frameDelay,
    }));

    result.push({ layerId: layer.id, keyframes: shiftedKfs, delay: frameDelay });
  });

  return result;
}

function sortByOrder(layers, order, seed) {
  const layersCopy = [...layers];

  switch (order) {
    case 'leftToRight':
      return layersCopy.sort((a, b) => (a.bbox?.x || 0) - (b.bbox?.x || 0));
    case 'rightToLeft':
      return layersCopy.sort((a, b) => (b.bbox?.x || 0) - (a.bbox?.x || 0));
    case 'topToBottom':
      return layersCopy.sort((a, b) => (a.bbox?.y || 0) - (b.bbox?.y || 0));
    case 'bottomToTop':
      return layersCopy.sort((a, b) => (b.bbox?.y || 0) - (a.bbox?.y || 0));
    case 'fromCenter': {
      const cx = layersCopy.reduce((s, l) => s + (l.bbox?.cx || 0), 0) / layersCopy.length;
      const cy = layersCopy.reduce((s, l) => s + (l.bbox?.cy || 0), 0) / layersCopy.length;
      return layersCopy.sort((a, b) => {
        const da = Math.hypot((a.bbox?.cx||0)-cx, (a.bbox?.cy||0)-cy);
        const db = Math.hypot((b.bbox?.cx||0)-cx, (b.bbox?.cy||0)-cy);
        return da - db;
      });
    }
    case 'toCenter': {
      const cx2 = layersCopy.reduce((s, l) => s + (l.bbox?.cx || 0), 0) / layersCopy.length;
      const cy2 = layersCopy.reduce((s, l) => s + (l.bbox?.cy || 0), 0) / layersCopy.length;
      return layersCopy.sort((a, b) => {
        const da = Math.hypot((a.bbox?.cx||0)-cx2, (a.bbox?.cy||0)-cy2);
        const db = Math.hypot((b.bbox?.cx||0)-cx2, (b.bbox?.cy||0)-cy2);
        return db - da;
      });
    }
    case 'random': {
      const rng = seededRandom(seed);
      return layersCopy.sort(() => rng() - 0.5);
    }
    case 'layerOrder':
    default:
      return layersCopy; // Keep existing order
  }
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
