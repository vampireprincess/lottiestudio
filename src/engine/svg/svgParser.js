/**
 * SVG Parser Engine — Faza 2
 * Konvertuje SVG DOM strukturu u interni Layer format
 */
import { v4 as uuidv4 } from 'uuid';
import { createLayer, createSolidFill, createStroke } from '../project.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseSVGContent(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;

  const w = parseFloat(svg.getAttribute('width')) || svg.viewBox?.baseVal?.width || 800;
  const h = parseFloat(svg.getAttribute('height')) || svg.viewBox?.baseVal?.height || 600;
  const vb = svg.getAttribute('viewBox');

  const defs = extractDefs(svg);

  // Parse root children
  const { layers, order } = parseChildren(svg, defs, null);

  return { layers, order, width: w, height: h, viewBox: vb, defs };
}

// ─── Defs extraction ──────────────────────────────────────────────────────────

function extractDefs(svg) {
  const defs = { gradients: {}, filters: {}, clipPaths: {}, masks: {} };

  svg.querySelectorAll('linearGradient, radialGradient').forEach(el => {
    const id = el.getAttribute('id');
    if (!id) return;

    const xlink = el.getAttribute('xlink:href') || el.getAttribute('href');
    let base = el;
    if (xlink) {
      const ref = svg.querySelector(xlink.replace('#', '#'));
      if (ref) base = ref;
    }

    const stops = Array.from(base.querySelectorAll('stop')).map(s => ({
      id: uuidv4(),
      position: parseFloat(s.getAttribute('offset') || '0'),
      color: parseStopColor(s),
      opacity: parseFloat(s.getAttribute('stop-opacity') || s.style.stopOpacity || '1'),
    }));

    if (el.tagName === 'linearGradient') {
      defs.gradients[id] = {
        type: 'linear',
        stops,
        x1: parseFloat(el.getAttribute('x1') || '0'),
        y1: parseFloat(el.getAttribute('y1') || '0'),
        x2: parseFloat(el.getAttribute('x2') || '1'),
        y2: parseFloat(el.getAttribute('y2') || '0'),
        gradientUnits: el.getAttribute('gradientUnits') || 'objectBoundingBox',
        gradientTransform: el.getAttribute('gradientTransform'),
        angle: 90,
      };
    } else {
      defs.gradients[id] = {
        type: 'radial',
        stops,
        cx: parseFloat(el.getAttribute('cx') || '0.5'),
        cy: parseFloat(el.getAttribute('cy') || '0.5'),
        r: parseFloat(el.getAttribute('r') || '0.5'),
        fx: parseFloat(el.getAttribute('fx') || el.getAttribute('cx') || '0.5'),
        fy: parseFloat(el.getAttribute('fy') || el.getAttribute('cy') || '0.5'),
      };
    }
  });

  svg.querySelectorAll('filter').forEach(el => {
    const id = el.getAttribute('id');
    if (id) defs.filters[id] = el.outerHTML;
  });

  svg.querySelectorAll('clipPath').forEach(el => {
    const id = el.getAttribute('id');
    if (id) {
      const path = el.querySelector('path, rect, circle, ellipse, polygon');
      defs.clipPaths[id] = path ? elementToPathData(path) : null;
    }
  });

  return defs;
}

// ─── Recursive children parsing ───────────────────────────────────────────────

function parseChildren(parent, defs, parentId) {
  const layers = {};
  const order = [];

  const kids = Array.from(parent.children).filter(el => {
    const tag = el.tagName.toLowerCase();
    return !['defs', 'title', 'desc', 'metadata', 'style'].includes(tag);
  });

  for (const el of kids) {
    const result = parseElement(el, defs, parentId);
    if (!result) continue;

    if (result.layers) {
      Object.assign(layers, result.layers);
      layers[result.id] = result.layer;
      order.push(result.id);
    } else {
      layers[result.id] = result.layer;
      order.push(result.id);
    }
  }

  return { layers, order };
}

function parseElement(el, defs, parentId) {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'g': return parseGroup(el, defs, parentId);
    case 'path': return parsePathElement(el, defs, parentId);
    case 'rect': return parseRect(el, defs, parentId);
    case 'circle': return parseCircle(el, defs, parentId);
    case 'ellipse': return parseEllipse(el, defs, parentId);
    case 'line': return parseLine(el, defs, parentId);
    case 'polyline': return parsePolyline(el, defs, parentId, false);
    case 'polygon': return parsePolyline(el, defs, parentId, true);
    case 'text': return parseText(el, defs, parentId);
    case 'image': return parseImage(el, defs, parentId);
    default: return null;
  }
}

// ─── Element parsers ──────────────────────────────────────────────────────────

function parseGroup(el, defs, parentId) {
  const id = uuidv4();
  const name = el.getAttribute('id') || el.getAttribute('inkscape:label') || 'Group';
  const transform = parseTransformAttr(el.getAttribute('transform'));

  const { layers: childLayers, order: childOrder } = parseChildren(el, defs, id);

  // Update children's parentId
  childOrder.forEach(cid => {
    if (childLayers[cid]) childLayers[cid].parentId = id;
  });

  const layer = createLayer({
    id,
    name,
    type: 'group',
    transform,
    children: childOrder,
    parentId,
    visible: el.getAttribute('visibility') !== 'hidden' && el.style.display !== 'none',
    opacity: parseFloat(el.getAttribute('opacity') || el.style.opacity || '1'),
  });

  return { id, layer, layers: { ...childLayers, [id]: layer } };
}

function parsePathElement(el, defs, parentId) {
  const id = uuidv4();
  const d = el.getAttribute('d') || '';
  const name = el.getAttribute('id') || el.getAttribute('inkscape:label') || 'Path';
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const layer = createLayer({
    id,
    name,
    type: 'shape',
    pathData: d,
    shapeType: null,
    transform,
    parentId,
    ...buildFillsStrokes(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
    visible: el.getAttribute('visibility') !== 'hidden',
  });

  return { id, layer };
}

function parseRect(el, defs, parentId) {
  const id = uuidv4();
  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');
  const w = parseFloat(el.getAttribute('width') || '100');
  const h = parseFloat(el.getAttribute('height') || '100');
  const rx = parseFloat(el.getAttribute('rx') || '0');
  const ry = parseFloat(el.getAttribute('ry') || rx || '0');
  const name = el.getAttribute('id') || 'Rectangle';
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const layer = createLayer({
    id, name, type: 'shape',
    shapeType: rx > 0 ? 'roundedRect' : 'rect',
    shapeParams: { x, y, width: w, height: h, rx, ry, cx: x + w/2, cy: y + h/2 },
    transform,
    parentId,
    ...buildFillsStrokes(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
  });

  return { id, layer };
}

function parseCircle(el, defs, parentId) {
  const id = uuidv4();
  const cx = parseFloat(el.getAttribute('cx') || '50');
  const cy = parseFloat(el.getAttribute('cy') || '50');
  const r = parseFloat(el.getAttribute('r') || '50');
  const name = el.getAttribute('id') || 'Circle';
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const layer = createLayer({
    id, name, type: 'shape',
    shapeType: 'circle',
    shapeParams: { cx, cy, r, x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
    transform,
    parentId,
    ...buildFillsStrokes(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
  });

  return { id, layer };
}

function parseEllipse(el, defs, parentId) {
  const id = uuidv4();
  const cx = parseFloat(el.getAttribute('cx') || '50');
  const cy = parseFloat(el.getAttribute('cy') || '50');
  const rx = parseFloat(el.getAttribute('rx') || '50');
  const ry = parseFloat(el.getAttribute('ry') || '30');
  const name = el.getAttribute('id') || 'Ellipse';
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const layer = createLayer({
    id, name, type: 'shape',
    shapeType: 'ellipse',
    shapeParams: { cx, cy, rx, ry, r: Math.max(rx, ry), x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 },
    transform,
    parentId,
    ...buildFillsStrokes(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
  });

  return { id, layer };
}

function parseLine(el, defs, parentId) {
  const id = uuidv4();
  const x1 = parseFloat(el.getAttribute('x1') || '0');
  const y1 = parseFloat(el.getAttribute('y1') || '0');
  const x2 = parseFloat(el.getAttribute('x2') || '100');
  const y2 = parseFloat(el.getAttribute('y2') || '0');
  const name = el.getAttribute('id') || 'Line';
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const pathData = `M ${x1},${y1} L ${x2},${y2}`;

  const layer = createLayer({
    id, name, type: 'shape',
    pathData,
    shapeType: 'line',
    shapeParams: { x1, y1, x2, y2 },
    transform,
    parentId,
    fills: [],
    ...buildStrokesOnly(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
  });

  return { id, layer };
}

function parsePolyline(el, defs, parentId, closed) {
  const id = uuidv4();
  const points = el.getAttribute('points') || '';
  const name = el.getAttribute('id') || (closed ? 'Polygon' : 'Polyline');
  const transform = parseTransformAttr(el.getAttribute('transform'));
  const style = parseStyleAttr(el);

  const pairs = points.trim().split(/\s+|,/).reduce((acc, v, i, arr) => {
    if (i % 2 === 0 && arr[i + 1]) acc.push(`${v},${arr[i + 1]}`);
    return acc;
  }, []);

  const pathData = pairs.length > 0
    ? `M ${pairs.join(' L ')}${closed ? ' Z' : ''}`
    : '';

  const layer = createLayer({
    id, name, type: 'shape',
    pathData,
    transform,
    parentId,
    ...buildFillsStrokes(el, style, defs),
    opacity: parseFloat(el.getAttribute('opacity') || style.opacity || '1'),
  });

  return { id, layer };
}

function parseText(el, defs, parentId) {
  const id = uuidv4();
  const name = el.getAttribute('id') || 'Text';
  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');

  const layer = createLayer({
    id, name,
    type: 'svg', // Text treated as SVG embed
    svgContent: el.outerHTML,
    transform: {
      position: { x, y },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      anchor: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
    },
    parentId,
    fills: [],
    strokes: [],
    opacity: 1,
  });

  return { id, layer };
}

function parseImage(el, defs, parentId) {
  const id = uuidv4();
  const name = el.getAttribute('id') || 'Image';
  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');

  const layer = createLayer({
    id, name,
    type: 'svg',
    svgContent: el.outerHTML,
    transform: {
      position: { x, y },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      anchor: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
    },
    parentId,
    fills: [],
    strokes: [],
    opacity: parseFloat(el.getAttribute('opacity') || '1'),
  });

  return { id, layer };
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function parseStyleAttr(el) {
  const style = {};
  const styleAttr = el.getAttribute('style') || '';
  styleAttr.split(';').forEach(rule => {
    const [k, v] = rule.split(':').map(s => s.trim());
    if (k && v) style[camelCase(k)] = v;
  });

  // Also read direct attributes
  ['fill', 'stroke', 'fill-opacity', 'stroke-opacity', 'stroke-width',
   'opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
   'fill-rule', 'clip-path'].forEach(attr => {
    const val = el.getAttribute(attr);
    if (val && !style[camelCase(attr)]) style[camelCase(attr)] = val;
  });

  return style;
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function buildFillsStrokes(el, style, defs) {
  return {
    fills: buildFills(el, style, defs),
    strokes: buildStrokes(el, style, defs),
  };
}

function buildStrokesOnly(el, style, defs) {
  return { strokes: buildStrokes(el, style, defs) };
}

function buildFills(el, style, defs) {
  const fillVal = style.fill || el.getAttribute('fill') || 'black';
  if (fillVal === 'none') return [];

  if (fillVal.startsWith('url(#')) {
    const gradId = fillVal.slice(5, -1);
    const grad = defs.gradients[gradId];
    if (grad) {
      return [{
        enabled: true,
        type: grad.type,
        gradient: {
          type: grad.type,
          stops: grad.stops,
          angle: grad.angle || 90,
          startPoint: { x: grad.x1 || 0, y: grad.y1 || 0 },
          endPoint: { x: grad.x2 || 1, y: grad.y2 || 0 },
          center: { x: grad.cx || 0.5, y: grad.cy || 0.5 },
          radius: grad.r || 0.5,
          focalPoint: { x: grad.fx || 0.5, y: grad.fy || 0.5 },
          focalRadius: 0,
          spread: 'pad',
        },
        opacity: parseFloat(style.fillOpacity || el.getAttribute('fill-opacity') || '1'),
        blendMode: 'normal',
      }];
    }
  }

  const color = parseCSSColor(fillVal);
  if (!color) return [];

  return [{
    enabled: true,
    type: 'solid',
    color,
    opacity: parseFloat(style.fillOpacity || el.getAttribute('fill-opacity') || '1'),
    blendMode: 'normal',
    globalColorId: null,
  }];
}

function buildStrokes(el, style, defs) {
  const strokeVal = style.stroke || el.getAttribute('stroke') || 'none';
  if (!strokeVal || strokeVal === 'none') return [];

  const width = parseFloat(style.strokeWidth || el.getAttribute('stroke-width') || '1');
  if (width <= 0) return [];

  const strokeUrl = strokeVal.startsWith('url(#');
  let color = { r: 0, g: 0, b: 0, a: 1 };
  let fillType = 'solid';

  if (!strokeUrl) {
    color = parseCSSColor(strokeVal) || { r: 0, g: 0, b: 0, a: 1 };
  }

  return [{
    enabled: true,
    type: fillType,
    color,
    width,
    opacity: parseFloat(style.strokeOpacity || el.getAttribute('stroke-opacity') || '1'),
    lineCap: style.strokeLinecap || el.getAttribute('stroke-linecap') || 'butt',
    lineJoin: style.strokeLinejoin || el.getAttribute('stroke-linejoin') || 'miter',
    dashPattern: style.strokeDasharray || el.getAttribute('stroke-dasharray') || '',
    alignment: 'center',
    globalColorId: null,
  }];
}

// ─── Transform parser ─────────────────────────────────────────────────────────

export function parseTransformAttr(transformStr) {
  const result = {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    skew: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    pivot: { x: 0.5, y: 0.5 },
  };

  if (!transformStr) return result;

  const translateMatch = /translate\(([^)]+)\)/.exec(transformStr);
  if (translateMatch) {
    const parts = translateMatch[1].split(/[\s,]+/).map(Number);
    result.position.x = parts[0] || 0;
    result.position.y = parts[1] || 0;
  }

  const scaleMatch = /scale\(([^)]+)\)/.exec(transformStr);
  if (scaleMatch) {
    const parts = scaleMatch[1].split(/[\s,]+/).map(Number);
    result.scale.x = parts[0] || 1;
    result.scale.y = parts[1] !== undefined ? parts[1] : parts[0] || 1;
  }

  const rotateMatch = /rotate\(([^)]+)\)/.exec(transformStr);
  if (rotateMatch) {
    const parts = rotateMatch[1].split(/[\s,]+/).map(Number);
    result.rotation = parts[0] || 0;
    if (parts[1] !== undefined) result.anchor.x = parts[1];
    if (parts[2] !== undefined) result.anchor.y = parts[2];
  }

  const matrixMatch = /matrix\(([^)]+)\)/.exec(transformStr);
  if (matrixMatch) {
    const [a, b, c, d, e, f] = matrixMatch[1].split(/[\s,]+/).map(Number);
    result.position.x = e || 0;
    result.position.y = f || 0;
    result.scale.x = Math.sqrt(a * a + b * b);
    result.scale.y = Math.sqrt(c * c + d * d);
    result.rotation = Math.atan2(b, a) * 180 / Math.PI;
  }

  return result;
}

// ─── Color parser ─────────────────────────────────────────────────────────────

export function parseCSSColor(colorStr) {
  if (!colorStr || colorStr === 'none' || colorStr === 'transparent') return null;

  // Named colors → quick lookup
  const namedColors = {
    black: [0,0,0], white: [255,255,255], red: [255,0,0], green: [0,128,0],
    blue: [0,0,255], yellow: [255,255,0], orange: [255,165,0], purple: [128,0,128],
    pink: [255,192,203], gray: [128,128,128], grey: [128,128,128],
    brown: [165,42,42], cyan: [0,255,255], magenta: [255,0,255],
    lime: [0,255,0], indigo: [75,0,130], violet: [238,130,238],
    gold: [255,215,0], silver: [192,192,192], teal: [0,128,128],
    navy: [0,0,128], maroon: [128,0,0], olive: [128,128,0],
    aqua: [0,255,255], fuchsia: [255,0,255], coral: [255,127,80],
    salmon: [250,128,114], khaki: [240,230,140], tan: [210,180,140],
  };

  const lower = colorStr.toLowerCase().trim();
  if (namedColors[lower]) {
    const [r, g, b] = namedColors[lower];
    return { r, g, b, a: 1 };
  }

  // Hex #RGB #RRGGBB #RRGGBBAA
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colorStr);
  if (hex3) {
    return {
      r: parseInt(hex3[1] + hex3[1], 16),
      g: parseInt(hex3[2] + hex3[2], 16),
      b: parseInt(hex3[3] + hex3[3], 16),
      a: 1,
    };
  }

  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(colorStr);
  if (hex6) {
    return {
      r: parseInt(hex6[1], 16),
      g: parseInt(hex6[2], 16),
      b: parseInt(hex6[3], 16),
      a: hex6[4] ? parseInt(hex6[4], 16) / 255 : 1,
    };
  }

  // rgb() rgba()
  const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(colorStr);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // hsl() — approximate conversion
  const hslMatch = /hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/.exec(colorStr);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    };
    return {
      r: Math.round(hue2rgb(p,q,h+1/3)*255),
      g: Math.round(hue2rgb(p,q,h)*255),
      b: Math.round(hue2rgb(p,q,h-1/3)*255),
      a,
    };
  }

  return null;
}

// ─── Path conversion ──────────────────────────────────────────────────────────

function elementToPathData(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'path') return el.getAttribute('d') || '';
  if (tag === 'rect') {
    const x = parseFloat(el.getAttribute('x') || '0');
    const y = parseFloat(el.getAttribute('y') || '0');
    const w = parseFloat(el.getAttribute('width') || '0');
    const h = parseFloat(el.getAttribute('height') || '0');
    return `M ${x},${y} L ${x+w},${y} L ${x+w},${y+h} L ${x},${y+h} Z`;
  }
  if (tag === 'circle') {
    const cx = parseFloat(el.getAttribute('cx') || '0');
    const cy = parseFloat(el.getAttribute('cy') || '0');
    const r = parseFloat(el.getAttribute('r') || '0');
    return `M ${cx+r},${cy} A ${r},${r} 0 1 0 ${cx-r},${cy} A ${r},${r} 0 1 0 ${cx+r},${cy} Z`;
  }
  return '';
}

function parseStopColor(stop) {
  const colorAttr = stop.getAttribute('stop-color') || stop.style.stopColor || '#000000';
  return parseCSSColor(colorAttr) || { r: 0, g: 0, b: 0, a: 1 };
}
