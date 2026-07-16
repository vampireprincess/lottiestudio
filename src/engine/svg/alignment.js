/**
 * Align & Distribute engine — Faza 2
 */
import { getPathBBox } from './pathOps.js';
import { generateShapePath } from '../../components/canvas/CanvasRenderer.jsx';

/**
 * Get bounding box for a layer
 */
export function getLayerBBox(layer) {
  const transform = layer.transform || {};
  const pos = transform.position || { x: 0, y: 0 };

  if (layer.shapeParams) {
    const p = layer.shapeParams;
    const x = (p.x ?? (p.cx - (p.width || 100) / 2)) + pos.x;
    const y = (p.y ?? (p.cy - (p.height || 100) / 2)) + pos.y;
    const w = p.width ?? 100;
    const h = p.height ?? 100;
    return { x, y, width: w, height: h, cx: x + w/2, cy: y + h/2 };
  }

  if (layer.pathData) {
    const bbox = getPathBBox(layer.pathData);
    return {
      x: bbox.x + pos.x,
      y: bbox.y + pos.y,
      width: bbox.width,
      height: bbox.height,
      cx: bbox.x + pos.x + bbox.width / 2,
      cy: bbox.y + pos.y + bbox.height / 2,
    };
  }

  // Default fallback
  return { x: pos.x, y: pos.y, width: 100, height: 100, cx: pos.x + 50, cy: pos.y + 50 };
}

/**
 * Get combined bounding box of multiple layers
 */
export function getCombinedBBox(layers) {
  if (!layers.length) return null;
  const bboxes = layers.map(getLayerBBox);
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.width));
  const maxY = Math.max(...bboxes.map(b => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Align layers relative to each other or to canvas
 */
export function alignLayers(layers, alignment, canvasWidth, canvasHeight, relativeTo = 'selection') {
  if (!layers.length) return layers;

  const bboxes = layers.map(getLayerBBox);
  const combined = getCombinedBBox(layers);

  let referenceBox;
  if (relativeTo === 'canvas') {
    referenceBox = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  } else if (relativeTo === 'first') {
    referenceBox = bboxes[0];
  } else {
    referenceBox = combined;
  }

  return layers.map((layer, i) => {
    const bbox = bboxes[i];
    const pos = layer.transform?.position || { x: 0, y: 0 };
    let newX = pos.x;
    let newY = pos.y;

    switch (alignment) {
      case 'left':
        newX = pos.x + (referenceBox.x - bbox.x);
        break;
      case 'centerH':
        newX = pos.x + (referenceBox.x + referenceBox.width / 2) - (bbox.x + bbox.width / 2);
        break;
      case 'right':
        newX = pos.x + (referenceBox.x + referenceBox.width) - (bbox.x + bbox.width);
        break;
      case 'top':
        newY = pos.y + (referenceBox.y - bbox.y);
        break;
      case 'centerV':
        newY = pos.y + (referenceBox.y + referenceBox.height / 2) - (bbox.y + bbox.height / 2);
        break;
      case 'bottom':
        newY = pos.y + (referenceBox.y + referenceBox.height) - (bbox.y + bbox.height);
        break;
    }

    return {
      ...layer,
      transform: {
        ...layer.transform,
        position: { x: newX, y: newY },
      },
    };
  });
}

/**
 * Distribute layers evenly
 */
export function distributeLayers(layers, direction) {
  if (layers.length < 3) return layers;

  const bboxes = layers.map(getLayerBBox);
  const sorted = [...layers].map((l, i) => ({ layer: l, bbox: bboxes[i] }));

  if (direction === 'horizontal') {
    sorted.sort((a, b) => a.bbox.x - b.bbox.x);
    const totalSpace = sorted[sorted.length - 1].bbox.x - sorted[0].bbox.x;
    const totalWidth = sorted.reduce((sum, { bbox }) => sum + bbox.width, 0);
    const gap = (totalSpace - totalWidth + sorted[0].bbox.width + sorted[sorted.length-1].bbox.width) / (sorted.length - 1);

    let curX = sorted[0].bbox.x;
    return sorted.map(({ layer, bbox }, i) => {
      if (i === 0 || i === sorted.length - 1) return layer;
      const pos = layer.transform?.position || { x: 0, y: 0 };
      const prevBox = sorted[i - 1].bbox;
      curX = sorted[i - 1].bbox.x + sorted[i - 1].bbox.width + gap;
      return {
        ...layer,
        transform: {
          ...layer.transform,
          position: { x: pos.x + (curX - bbox.x), y: pos.y },
        },
      };
    });
  } else {
    sorted.sort((a, b) => a.bbox.y - b.bbox.y);
    const totalSpace = sorted[sorted.length - 1].bbox.y - sorted[0].bbox.y;
    const totalHeight = sorted.reduce((sum, { bbox }) => sum + bbox.height, 0);
    const gap = (totalSpace - totalHeight + sorted[0].bbox.height + sorted[sorted.length-1].bbox.height) / (sorted.length - 1);

    let curY = sorted[0].bbox.y;
    return sorted.map(({ layer, bbox }, i) => {
      if (i === 0 || i === sorted.length - 1) return layer;
      const pos = layer.transform?.position || { x: 0, y: 0 };
      curY = sorted[i - 1].bbox.y + sorted[i - 1].bbox.height + gap;
      return {
        ...layer,
        transform: {
          ...layer.transform,
          position: { x: pos.x, y: pos.y + (curY - bbox.y) },
        },
      };
    });
  }
}
