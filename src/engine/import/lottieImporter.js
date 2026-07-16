/**
 * Lottie Import Engine — Enhanced
 * Imports Lottie JSON v5.x and creates both:
 * 1. Individual editable layers for each Lottie layer (visible in Layers panel)
 * 2. Uses lottie-web for rendering (stored in lottieData for correct playback)
 */
import { v4 as uuidv4 } from 'uuid';
import { createProject, createLayer } from '../project.js';

export function importLottieJSON(lottieData, options = {}) {
  if (!lottieData || typeof lottieData !== 'object') {
    throw new Error('Invalid Lottie JSON');
  }

  const { v, fr, ip, op, w, h, nm, layers = [], assets = [], markers = [] } = lottieData;

  const lottieW = w || 800;
  const lottieH = h || 600;
  const lottieFps = fr || 30;
  const totalFrames = Math.round(op - ip) || 180;

  // Create base project matching the Lottie dimensions
  const project = createProject({
    name: nm || 'Imported Lottie',
    width: lottieW,
    height: lottieH,
    fps: lottieFps,
    totalFrames,
    backgroundColor: lottieData.meta?.tc || '#000000',
  });

  const analysis = analyzeLottie(lottieData);

  // ── Strategy: Create a root group "Lottie Animation" containing ──────────────
  // one lottie-type layer (for rendering) + individual editable layers (for layer panel)
  // The lottie-type layer renders the full animation via lottie-web
  // The individual layers show in the panel and can be selected/transformed

  const rootGroupId = uuidv4();
  
  // Create the lottie render layer (full animation, rendered by lottie-web)
  const lottieLayerId = uuidv4();
  const lottieLayer = createLayer({
    id: lottieLayerId,
    name: '🎬 ' + (nm || 'Lottie Animation') + ' (Render)',
    type: 'lottie',
    lottieData,           // raw JSON for lottie-web rendering
    visible: true,
    locked: false,
    solo: false,
    colorLabel: null,
    opacity: 1,
    blendMode: 'normal',
    fills: [], strokes: [], masks: [], effects: [],
    children: [], parentId: rootGroupId,
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      anchor: { x: lottieW / 2, y: lottieH / 2 },
      pivot: { x: 0.5, y: 0.5 },
    },
    shapeParams: {
      x: 0, y: 0,
      width: lottieW,
      height: lottieH,
      cx: lottieW / 2,
      cy: lottieH / 2,
    },
    inFrame: 0,
    outFrame: totalFrames,
  });

  // Convert individual Lottie layers to editor layers
  const { projectLayers: individualLayers, rootLayerIds: individualIds, keyframes } = 
    convertLottieLayers(layers, lottieFps, lottieW, lottieH, totalFrames, rootGroupId, assets);

  // Create root group containing lottie render + individual layers
  const rootGroup = createLayer({
    id: rootGroupId,
    name: nm || 'Lottie Animation',
    type: 'group',
    children: [lottieLayerId, ...individualIds],
    visible: true,
    locked: false,
    solo: false,
    colorLabel: '#7b68ee',
    opacity: 1,
    blendMode: 'normal',
    fills: [], strokes: [], masks: [], effects: [],
    parentId: null,
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      anchor: { x: lottieW / 2, y: lottieH / 2 },
      pivot: { x: 0.5, y: 0.5 },
    },
    shapeParams: { x: 0, y: 0, width: lottieW, height: lottieH },
    inFrame: 0,
    outFrame: totalFrames,
  });

  const allLayers = {
    [rootGroupId]: rootGroup,
    [lottieLayerId]: lottieLayer,
    ...individualLayers,
  };

  // Convert markers
  const projectMarkers = (markers || []).map(m => ({
    id: uuidv4(),
    name: m.cm || 'Marker',
    frame: Math.round(m.tm) || 0,
    endFrame: m.dr ? Math.round(m.tm + m.dr) : undefined,
    color: '#f0a030',
    isLoop: false,
    exportFlag: false,
  }));

  return {
    project: {
      ...project,
      layers: allLayers,
      rootLayers: [rootGroupId],
      keyframes,
      markers: projectMarkers,
    },
    analysis,
  };
}

function convertLottieLayers(lottieLayers, fps, canvasW, canvasH, totalFrames, parentGroupId, assets = []) {
  const projectLayers = {};
  const rootLayerIds = [];
  const keyframes = [];

  // Lottie order is top-to-bottom (index 0 = top) — we reverse for internal order
  const reversed = [...(lottieLayers || [])].reverse();

  // Build a map from lottie ind → our layer id for parent linking
  const indToId = {};
  reversed.forEach(ll => {
    const id = uuidv4();
    indToId[ll.ind] = id;
  });

  reversed.forEach((ll) => {
    const id = indToId[ll.ind];
    const parentLottieId = ll.parent;
    const parentId = parentLottieId && indToId[parentLottieId] ? indToId[parentLottieId] : parentGroupId;
    
    const layer = convertSingleLayer(ll, id, fps, canvasW, canvasH, totalFrames, parentId, keyframes, assets);
    projectLayers[id] = layer;
    
    if (!parentLottieId || !indToId[parentLottieId]) {
      rootLayerIds.push(id);
    }
  });

  // Build parent-child for nested lottie layers
  reversed.forEach(ll => {
    if (ll.parent && indToId[ll.parent]) {
      const parentId = indToId[ll.parent];
      const childId = indToId[ll.ind];
      if (projectLayers[parentId] && projectLayers[childId]) {
        if (!projectLayers[parentId].children) projectLayers[parentId].children = [];
        projectLayers[parentId].children.push(childId);
        projectLayers[childId].parentId = parentId;
      }
    }
  });

  return { projectLayers, rootLayerIds, keyframes };
}

function convertSingleLayer(ll, id, fps, canvasW, canvasH, totalFrames, parentId, keyframesOut, assets) {
  const ks = ll.ks || {};
  const name = ll.nm || `Layer ${ll.ind || id.slice(0, 4)}`;

  // Extract transforms
  const pos = extractStaticValue(ks.p) || { x: canvasW / 2, y: canvasH / 2 };
  const scl = extractStaticValue(ks.s) || { x: 100, y: 100 };
  const rot = extractStaticValue(ks.r) || 0;
  const anc = extractStaticValue(ks.a) || { x: 0, y: 0 };
  const opacity = extractStaticValue(ks.o) ?? 100;

  // Extract animated keyframes
  extractLayerKeyframes(ll, id, fps, keyframesOut);

  // Determine shape/path data
  const pathData = extractShapePath(ll);
  const fills = extractShapeFills(ll);
  const strokes = extractShapeStrokes(ll);

  // Determine layer type
  let layerType = getLottieLayerType(ll.ty);
  
  // For shape layers with actual shapes — use 'shape' type for rendering
  if (ll.ty === 4 && (pathData || fills.length > 0)) {
    layerType = 'shape';
  }

  const posX = Array.isArray(pos) ? pos[0] : (pos?.x ?? 0);
  const posY = Array.isArray(pos) ? pos[1] : (pos?.y ?? 0);
  const sclX = Array.isArray(scl) ? (scl[0] ?? 100) : (scl?.x ?? 100);
  const sclY = Array.isArray(scl) ? (scl[1] ?? 100) : (scl?.y ?? 100);
  const ancX = Array.isArray(anc) ? (anc[0] ?? 0) : (anc?.x ?? 0);
  const ancY = Array.isArray(anc) ? (anc[1] ?? 0) : (anc?.y ?? 0);

  // Compute bounding box for shapeParams
  let layerW = canvasW, layerH = canvasH;
  if (pathData) {
    // Approximate from path coords — use canvas as fallback
    layerW = canvasW;
    layerH = canvasH;
  }

  const layer = createLayer({
    id, name,
    type: layerType,
    visible: !ll.hd,
    opacity: (typeof opacity === 'number' ? opacity : 100) / 100,
    blendMode: lottieBlendMode(ll.bm),
    inFrame: Math.round(ll.ip) || 0,
    outFrame: Math.round(ll.op) || totalFrames,
    transform: {
      position: { x: posX, y: posY },
      scale: { x: sclX / 100, y: sclY / 100 },
      rotation: typeof rot === 'number' ? rot : 0,
      skew: { x: extractStaticValue(ks.sk) || 0, y: 0 },
      anchor: { x: ancX, y: ancY },
      pivot: { x: 0.5, y: 0.5 },
    },
    fills: fills.length > 0 ? fills : (pathData ? [{ enabled: true, type: 'solid', color: { r: 123, g: 104, b: 238, a: 0.5 }, opacity: 1, blendMode: 'normal' }] : []),
    strokes,
    pathData,
    shapeParams: {
      x: posX - layerW / 2,
      y: posY - layerH / 2,
      width: layerW,
      height: layerH,
      cx: posX,
      cy: posY,
    },
    children: [],
    parentId,
    masks: [],
    effects: [],
    solo: false,
    locked: false,
    colorLabel: null,
  });

  return layer;
}

function extractStaticValue(prop) {
  if (!prop) return null;
  if (prop.a === 0) {
    const k = prop.k;
    if (Array.isArray(k) && k.length >= 2) return { x: k[0], y: k[1] };
    return k;
  }
  if (prop.a === 1 && Array.isArray(prop.k) && prop.k.length > 0) {
    const firstKf = prop.k[0];
    const s = firstKf.s || firstKf;
    if (Array.isArray(s) && s.length >= 2) return { x: s[0], y: s[1] };
    return Array.isArray(s) ? s[0] : s;
  }
  // Direct value
  if (typeof prop === 'number') return prop;
  if (Array.isArray(prop) && prop.length >= 2) return { x: prop[0], y: prop[1] };
  return null;
}

function extractLayerKeyframes(ll, layerId, fps, out) {
  const ks = ll.ks || {};

  const propMap = {
    p: 'transform.position',
    s: 'transform.scale',
    r: 'transform.rotation',
    o: 'opacity',
  };

  Object.entries(propMap).forEach(([lottieKey, propName]) => {
    const prop = ks[lottieKey];
    if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) return;

    prop.k.forEach((kf) => {
      if (kf.t === undefined) return;
      const s = kf.s;
      let value;
      if (propName.includes('position')) {
        value = { x: s?.[0] || 0, y: s?.[1] || 0 };
      } else if (propName.includes('scale')) {
        value = { x: (s?.[0] || 100) / 100, y: (s?.[1] || 100) / 100 };
      } else {
        value = Array.isArray(s) ? (s[0] || 0) : (s || 0);
        if (propName === 'opacity') value /= 100;
      }

      const easing = kf.i && kf.o ? {
        type: 'custom',
        bezier: [kf.o.x?.[0] || 0.5, kf.o.y?.[0] || 0.5, kf.i.x?.[0] || 0.5, kf.i.y?.[0] || 0.5],
      } : { type: 'linear' };

      out.push({
        id: uuidv4(),
        layerId,
        property: propName,
        frame: Math.round(kf.t),
        value,
        easing,
        hold: kf.h === 1,
        selected: false,
      });
    });
  });
}

function extractShapeFills(ll) {
  const fills = [];
  const shapes = ll.shapes || [];

  const findFills = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (!item) return;
      if (item.ty === 'fl') {
        const c = item.c?.k;
        let color;
        if (Array.isArray(c) && c.length >= 3) {
          // Lottie colors are 0-1 range
          color = {
            r: Math.round(Math.min(1, c[0]) * 255),
            g: Math.round(Math.min(1, c[1]) * 255),
            b: Math.round(Math.min(1, c[2]) * 255),
            a: c[3] !== undefined ? Math.min(1, c[3]) : 1,
          };
        } else {
          color = { r: 123, g: 104, b: 238, a: 1 };
        }
        const opacityVal = item.o?.k;
        const opacity = typeof opacityVal === 'number' ? opacityVal / 100 : 1;
        fills.push({ enabled: true, type: 'solid', color, opacity, blendMode: 'normal' });
      } else if (item.ty === 'gf') {
        // Gradient fill — create a basic gradient
        fills.push({
          enabled: true, type: 'linear',
          gradient: {
            type: 'linear',
            stops: [
              { id: uuidv4(), position: 0, color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1 },
              { id: uuidv4(), position: 1, color: { r: 0, g: 200, b: 255, a: 1 }, opacity: 1 },
            ],
            angle: 90,
            startPoint: { x: 0, y: 0.5 },
            endPoint: { x: 1, y: 0.5 },
            center: { x: 0.5, y: 0.5 },
            radius: 0.5,
            focalPoint: { x: 0.5, y: 0.5 },
          },
          opacity: 1, blendMode: 'normal',
        });
      } else if (item.ty === 'gr' && item.it) {
        findFills(item.it);
      }
    });
  };

  findFills(shapes);
  return fills;
}

function extractShapeStrokes(ll) {
  const strokes = [];
  const shapes = ll.shapes || [];

  const findStrokes = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (!item) return;
      if (item.ty === 'st') {
        const c = item.c?.k;
        let color;
        if (Array.isArray(c) && c.length >= 3) {
          color = {
            r: Math.round(Math.min(1, c[0]) * 255),
            g: Math.round(Math.min(1, c[1]) * 255),
            b: Math.round(Math.min(1, c[2]) * 255),
            a: 1,
          };
        } else {
          color = { r: 255, g: 255, b: 255, a: 1 };
        }
        const w = item.w?.k;
        const width = typeof w === 'number' ? w : 2;
        const opacityVal = item.o?.k;
        const opacity = typeof opacityVal === 'number' ? opacityVal / 100 : 1;
        strokes.push({
          enabled: true, type: 'solid', color, width, opacity,
          lineCap: 'round', lineJoin: 'round', dashPattern: '', alignment: 'center',
        });
      } else if (item.ty === 'gr' && item.it) {
        findStrokes(item.it);
      }
    });
  };

  findStrokes(shapes);
  return strokes;
}

function extractShapePath(ll) {
  const shapes = ll.shapes || [];
  let pathData = null;

  const findPath = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (pathData || !item) return;
      if (item.ty === 'sh') {
        const k = item.ks?.k;
        if (k && k.v) pathData = lottieBezierToSVG(k);
        else if (Array.isArray(k) && k[0]?.s?.[0]?.v) pathData = lottieBezierToSVG(k[0].s[0]);
      } else if (item.ty === 'rc') {
        const s = item.s?.k || [100, 100];
        const p = item.p?.k || [0, 0];
        const r = item.r?.k || 0;
        const rw = Array.isArray(s) ? s[0] : 100;
        const rh = Array.isArray(s) ? s[1] : 100;
        const px = (Array.isArray(p) ? p[0] : 0) - rw / 2;
        const py = (Array.isArray(p) ? p[1] : 0) - rh / 2;
        const rad = Math.min(r || 0, rw / 2, rh / 2);
        if (rad > 0) {
          pathData = `M ${px + rad},${py} L ${px + rw - rad},${py} Q ${px + rw},${py} ${px + rw},${py + rad} L ${px + rw},${py + rh - rad} Q ${px + rw},${py + rh} ${px + rw - rad},${py + rh} L ${px + rad},${py + rh} Q ${px},${py + rh} ${px},${py + rh - rad} L ${px},${py + rad} Q ${px},${py} ${px + rad},${py} Z`;
        } else {
          pathData = `M ${px},${py} L ${px + rw},${py} L ${px + rw},${py + rh} L ${px},${py + rh} Z`;
        }
      } else if (item.ty === 'el') {
        const s = item.s?.k || [100, 100];
        const p = item.p?.k || [0, 0];
        const erx = (Array.isArray(s) ? s[0] : 100) / 2;
        const ery = (Array.isArray(s) ? s[1] : 100) / 2;
        const ecx = Array.isArray(p) ? p[0] : 0;
        const ecy = Array.isArray(p) ? p[1] : 0;
        pathData = `M ${ecx + erx},${ecy} A ${erx},${ery} 0 1,1 ${ecx - erx},${ecy} A ${erx},${ery} 0 1,1 ${ecx + erx},${ecy} Z`;
      } else if (item.ty === 'gr' && item.it) {
        findPath(item.it);
      }
    });
  };

  findPath(shapes);
  return pathData;
}

function lottieBezierToSVG(bezier) {
  if (!bezier || !bezier.v) return null;
  const v = bezier.v, i = bezier.i, o = bezier.o;
  if (!v.length) return null;

  let d = `M ${v[0][0]},${v[0][1]}`;
  for (let idx = 0; idx < v.length; idx++) {
    const next = (idx + 1) % v.length;
    if (bezier.c || next !== 0) {
      const cp1 = [v[idx][0] + (o[idx]?.[0] || 0), v[idx][1] + (o[idx]?.[1] || 0)];
      const cp2 = [v[next][0] + (i[next]?.[0] || 0), v[next][1] + (i[next]?.[1] || 0)];
      d += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${v[next][0]},${v[next][1]}`;
    }
  }
  if (bezier.c) d += ' Z';
  return d;
}

function getLottieLayerType(ty) {
  switch (ty) {
    case 4: return 'shape';
    case 3: return 'shape'; // null layer (invisible, for parenting)
    case 2: return 'svg';   // image
    case 1: return 'shape'; // solid
    case 5: return 'shape'; // text
    case 0: return 'group'; // precomp
    default: return 'shape';
  }
}

function lottieBlendMode(bm) {
  const modes = {
    0: 'normal', 1: 'multiply', 2: 'screen', 3: 'overlay',
    4: 'darken', 5: 'lighten', 6: 'color-dodge', 7: 'color-burn',
    8: 'hard-light', 9: 'soft-light', 10: 'difference', 11: 'exclusion',
  };
  return modes[bm] || 'normal';
}

export function analyzeLottie(lottieData) {
  const layers = lottieData.layers || [];
  const assets = lottieData.assets || [];
  const warnings = [];

  layers.forEach(ll => {
    if (ll.ty === 5) warnings.push(`Text layer "${ll.nm}" — font may not be embedded`);
    if (ll.ty === 2) warnings.push(`Image layer "${ll.nm}" — raster image included`);
    if (ll.hasMask) warnings.push(`Layer "${ll.nm}" has masks`);
    if (ll.ef?.length) warnings.push(`Layer "${ll.nm}" has effects (${ll.ef.map(e => e.nm).join(', ')})`);
  });

  const imageAssets = assets.filter(a => a.h && !a.layers);
  if (imageAssets.length) warnings.push(`${imageAssets.length} embedded image asset(s)`);

  return {
    version: lottieData.v,
    frameRate: lottieData.fr,
    duration: (lottieData.op - lottieData.ip) / (lottieData.fr || 30),
    totalFrames: Math.round(lottieData.op - lottieData.ip),
    width: lottieData.w,
    height: lottieData.h,
    layerCount: layers.length,
    assetCount: assets.length,
    markerCount: (lottieData.markers || []).length,
    hasImages: imageAssets.length > 0,
    hasFonts: (lottieData.fonts?.list || []).length > 0,
    warnings,
    unsupported: [],
  };
}
