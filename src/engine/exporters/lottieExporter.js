/**
 * Lottie JSON Exporter
 * Converts internal project format to Lottie JSON v5.x
 */

import { colorToHex } from '../../utils/colorUtils.js';
import { generateShapePath } from '../../components/canvas/CanvasRenderer.jsx';

/**
 * Export project to Lottie JSON
 */
export function exportLottie(project, options = {}) {
  const {
    fps = project.fps || 30,
    loop = true,
    optimize = false,
    transparent = false,
    startFrame = 0,
    endFrame = null,
    markerName = null,   // export only a named segment
  } = options;

  // Resolve segment range
  let segStart = startFrame;
  let segEnd = endFrame !== null ? endFrame : (project.totalFrames || 180);

  // If exporting by marker name, find the marker
  if (markerName) {
    const marker = (project.markers || []).find(m =>
      m.name.toLowerCase() === markerName.toLowerCase() ||
      m.name === markerName
    );
    if (marker) {
      segStart = marker.frame;
      segEnd = marker.endFrame ?? (marker.frame + 30);
    }
  }

  const segDuration = segEnd - segStart;

  const lottie = {
    v: '5.9.6',
    fr: fps,
    ip: 0,
    op: segDuration,
    w: project.width,
    h: project.height,
    nm: project.name || 'Lottie Studio Export',
    ddd: 0,
    assets: [],
    layers: [],
    markers: [],
    meta: {
      g: 'Lottie Studio',
      a: '',
      k: '',
      dc: '',
      tc: transparent ? '' : (project.backgroundColor || '#000000'),
    },
  };

  // Convert markers — offset by segStart so they align with the segment
  if (project.markers) {
    lottie.markers = project.markers
      .filter(m => m.frame >= segStart && m.frame <= segEnd)
      .map(m => ({
        tm: m.frame - segStart,
        cm: m.name,
        dr: m.endFrame ? Math.min(m.endFrame, segEnd) - m.frame : 0,
      }));
  }

  // Convert root layers with segment trimming
  const rootLayers = [...(project.rootLayers || [])];

  // Build a modified project with keyframes offset by -segStart for segment export
  const segProject = segStart === 0 ? project : {
    ...project,
    keyframes: project.keyframes.map(kf => ({
      ...kf,
      frame: Math.max(0, kf.frame - segStart),
    })).filter(kf => {
      const origFrame = kf.frame + segStart;
      return origFrame >= segStart && origFrame <= segEnd;
    }),
    layers: Object.fromEntries(
      Object.entries(project.layers).map(([id, layer]) => [id, {
        ...layer,
        inFrame: Math.max(0, (layer.inFrame || 0) - segStart),
        outFrame: Math.min(segDuration, (layer.outFrame || project.totalFrames) - segStart),
      }])
    ),
  };

  lottie.layers = rootLayers
    .map((layerId, index) => convertLayer(segProject, layerId, index, fps))
    .filter(Boolean)
    .reverse();

  return lottie;
}

function convertLayer(project, layerId, index, fps) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  const transform = layer.transform || {};
  // For shapes, the visual center is encoded in shapeParams (cx,cy)
  // The transform.position is additional offset on top of the shape's own coords
  const shapeP = layer.shapeParams || {};
  const shapeCenterX = shapeP.cx ?? (shapeP.x != null ? shapeP.x + (shapeP.width || 0) / 2 : 0);
  const shapeCenterY = shapeP.cy ?? (shapeP.y != null ? shapeP.y + (shapeP.height || 0) / 2 : 0);

  const pos = transform.position || { x: 0, y: 0 };
  const scale = transform.scale || { x: 1, y: 1 };
  const rotation = transform.rotation || 0;
  // Use the shape center as anchor if available, otherwise use transform.anchor
  const anchor = (layer.type === 'shape' && (shapeCenterX || shapeCenterY))
    ? { x: shapeCenterX, y: shapeCenterY }
    : (transform.anchor || { x: 0, y: 0 });
  const opacity = (layer.opacity ?? 1) * 100;

  // Get keyframes for this layer
  const layerKeyframes = project.keyframes.filter(kf => kf.layerId === layerId);

  const lottieLayer = {
    ddd: 0,
    ind: index + 1,
    ty: getLayerType(layer.type),
    nm: layer.name,
    sr: 1,
    ks: buildTransformKS(transform, opacity, layerKeyframes, fps),
    ao: 0,
    ip: layer.inFrame ?? 0,
    op: layer.outFrame ?? project.totalFrames,
    st: 0,
    bm: 0,
  };

  if (!layer.visible) {
    lottieLayer.hd = true;
  }

  // Shape layer
  if (layer.type === 'shape' || layer.type === 'path') {
    lottieLayer.ty = 4;
    lottieLayer.shapes = buildShapes(layer, layerKeyframes, fps);
  }

  // Group layer
  if (layer.type === 'group') {
    lottieLayer.ty = 4;
    lottieLayer.shapes = [
      {
        ty: 'gr',
        nm: layer.name,
        it: layer.children?.map((childId, ci) =>
          convertLayerToShape(project, childId, fps)
        ).filter(Boolean) || [],
      }
    ];
  }

  // SVG layer (precomp or shape)
  if (layer.type === 'svg' && layer.svgContent) {
    // Convert SVG to shape layer as best effort
    lottieLayer.ty = 4;
    lottieLayer.shapes = [{
      ty: 'gr',
      nm: 'SVG Content',
      it: [],
    }];
  }

  // Add glow effects as extra layers (OBS-style)
  // Glow effects are stored as metadata; they create blur copies during render
  if (layer.effects?.length > 0) {
    lottieLayer.ef = layer.effects
      .filter(e => e.enabled)
      .map(effect => convertEffect(effect));
  }

  return lottieLayer;
}

function convertLayerToShape(project, layerId, fps) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  const shapes = buildShapes(layer, [], fps);
  return {
    ty: 'gr',
    nm: layer.name,
    it: shapes,
  };
}

function getLayerType(type) {
  switch (type) {
    case 'shape': case 'path': return 4;
    case 'group': return 4;
    case 'svg': return 4;
    case 'null': return 3;
    default: return 4;
  }
}

function buildShapes(layer, keyframes, fps) {
  const shapes = [];

  // Path/Shape geometry
  if (layer.pathData || layer.shapeType) {
    const pathData = layer.shapeType
      ? generateShapePath(layer.shapeType, layer.shapeParams || {})
      : layer.pathData;

    if (pathData) {
      const pathKfs = keyframes.filter(kf => kf.property === 'pathData');
      shapes.push({
        ty: 'sh',
        nm: 'Path',
        ks: pathKfs.length > 0
          ? { a: 1, k: pathKfs.map(kf => ({
              t: kf.frame,
              s: [svgPathToLottie(kf.value || pathData)],
              e: [svgPathToLottie(pathData)],
              i: { x: 0.5, y: 0.5 },
              o: { x: 0.5, y: 0.5 },
            })) }
          : { a: 0, k: svgPathToLottie(pathData) },
      });
    }
  }

  // Trim Paths — add tm shape if layer has trimStart/trimEnd defined or keyframes
  const trimKfs = keyframes.filter(kf => kf.property === 'trimStart' || kf.property === 'trimEnd' || kf.property === 'trimOffset');
  const hasTrim = layer.trimStart !== undefined || layer.trimEnd !== undefined || trimKfs.length > 0;

  if (hasTrim || trimKfs.length > 0) {
    const trimStartKfs = keyframes.filter(kf => kf.property === 'trimStart');
    const trimEndKfs = keyframes.filter(kf => kf.property === 'trimEnd');
    const trimOffsetKfs = keyframes.filter(kf => kf.property === 'trimOffset');

    shapes.push({
      ty: 'tm',
      nm: 'Trim Paths',
      s: trimStartKfs.length > 0
        ? { a: 1, k: trimStartKfs.map(kf => buildKfValue(kf, fps, v => (v ?? 0) * 100)) }
        : { a: 0, k: (layer.trimStart ?? 0) * 100 },
      e: trimEndKfs.length > 0
        ? { a: 1, k: trimEndKfs.map(kf => buildKfValue(kf, fps, v => (v ?? 1) * 100)) }
        : { a: 0, k: (layer.trimEnd ?? 1) * 100 },
      o: trimOffsetKfs.length > 0
        ? { a: 1, k: trimOffsetKfs.map(kf => buildKfValue(kf, fps, v => (v ?? 0) * 360)) }
        : { a: 0, k: (layer.trimOffset ?? 0) * 360 },
      m: layer.trimMode === 'individually' ? 2 : 1, // 1=simultaneous, 2=individually
    });
  }

  // Fills
  (layer.fills || []).filter(f => f.enabled).forEach((fill, fi) => {
    if (fill.type === 'solid') {
      const c = fill.color || { r: 0, g: 0, b: 0, a: 1 };
      shapes.push({
        ty: 'fl',
        nm: `Fill ${fi + 1}`,
        o: { a: 0, k: (fill.opacity ?? 1) * 100 },
        c: { a: 0, k: [c.r / 255, c.g / 255, c.b / 255, c.a ?? 1] },
        r: 1,
      });
    } else if (fill.type === 'linear' && fill.gradient) {
      const g = fill.gradient;
      shapes.push({
        ty: 'gf',
        nm: `Gradient Fill ${fi + 1}`,
        o: { a: 0, k: (fill.opacity ?? 1) * 100 },
        r: 1,
        t: 1, // linear
        g: {
          p: g.stops?.length || 2,
          k: { a: 0, k: stopsToLottie(g.stops || []) },
        },
        s: { a: 0, k: [
          ((g.startPoint?.x || 0) - 0.5) * (1920),
          ((g.startPoint?.y || 0.5) - 0.5) * (-1080),
        ]},
        e: { a: 0, k: [
          ((g.endPoint?.x || 1) - 0.5) * (1920),
          ((g.endPoint?.y || 0.5) - 0.5) * (-1080),
        ]},
      });
    } else if (fill.type === 'radial' && fill.gradient) {
      const g = fill.gradient;
      shapes.push({
        ty: 'gf',
        nm: `Radial Gradient Fill ${fi + 1}`,
        o: { a: 0, k: (fill.opacity ?? 1) * 100 },
        r: 1,
        t: 2, // radial
        g: {
          p: g.stops?.length || 2,
          k: { a: 0, k: stopsToLottie(g.stops || []) },
        },
        s: { a: 0, k: [
          ((g.center?.x || 0.5) - 0.5) * 100,
          ((g.center?.y || 0.5) - 0.5) * 100,
        ]},
        e: { a: 0, k: [
          ((g.center?.x || 0.5) - 0.5) * 100 + (g.radius || 0.5) * 100,
          ((g.center?.y || 0.5) - 0.5) * 100,
        ]},
        h: { a: 0, k: 0 },
        a: { a: 0, k: 0 },
      });
    }
  });

  // Strokes
  (layer.strokes || []).filter(s => s.enabled).forEach((stroke, si) => {
    const c = stroke.color || { r: 255, g: 255, b: 255, a: 1 };
    shapes.push({
      ty: 'st',
      nm: `Stroke ${si + 1}`,
      o: { a: 0, k: (stroke.opacity ?? 1) * 100 },
      c: { a: 0, k: [c.r / 255, c.g / 255, c.b / 255, c.a ?? 1] },
      w: { a: 0, k: stroke.width || 2 },
      lc: { butt: 1, round: 2, square: 3 }[stroke.lineCap] || 2,
      lj: { miter: 1, round: 2, bevel: 3 }[stroke.lineJoin] || 2,
      ml: 4,
    });
  });

  return shapes;
}

function buildTransformKS(transform, opacity, keyframes, fps) {
  const pos = transform.position || { x: 0, y: 0 };
  const scale = transform.scale || { x: 1, y: 1 };
  const rotation = transform.rotation || 0;
  const anchor = transform.anchor || { x: 0, y: 0 };

  const posKfs = keyframes.filter(kf => kf.property === 'transform.position');
  const scaleKfs = keyframes.filter(kf => kf.property === 'transform.scale');
  const rotKfs = keyframes.filter(kf => kf.property === 'transform.rotation');
  const opacKfs = keyframes.filter(kf => kf.property === 'opacity');

  return {
    o: opacKfs.length > 0
      ? { a: 1, k: opacKfs.map(kf => buildKfValue(kf, fps, v => v * 100)) }
      : { a: 0, k: opacity },
    r: rotKfs.length > 0
      ? { a: 1, k: rotKfs.map(kf => buildKfValue(kf, fps)) }
      : { a: 0, k: rotation },
    p: posKfs.length > 0
      ? { a: 1, k: posKfs.map(kf => buildKfValue(kf, fps, v => [v.x, v.y, 0])) }
      : { a: 0, k: [pos.x, pos.y, 0] },
    a: { a: 0, k: [anchor.x, anchor.y, 0] },
    s: scaleKfs.length > 0
      ? { a: 1, k: scaleKfs.map(kf => buildKfValue(kf, fps, v => [v.x * 100, v.y * 100, 100])) }
      : { a: 0, k: [scale.x * 100, scale.y * 100, 100] },
  };
}

function buildKfValue(kf, fps, transform = v => v) {
  const easingX = getEasingBezier(kf.easing);
  return {
    t: kf.frame,
    s: [transform(kf.value)].flat(),
    i: { x: [easingX[0]], y: [easingX[1]] },
    o: { x: [easingX[2]], y: [easingX[3]] },
  };
}

function getEasingBezier(easing) {
  if (!easing) return [0.5, 0.5, 0.5, 0.5];
  const map = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    smooth: [0.25, 0.1, 0.25, 1],
    custom: easing.bezier || [0.5, 0.5, 0.5, 0.5],
  };
  return map[easing.type] || [0.5, 0.5, 0.5, 0.5];
}

function stopsToLottie(stops) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const result = [];
  sorted.forEach(stop => {
    result.push(stop.position);
    result.push((stop.color?.r ?? 0) / 255);
    result.push((stop.color?.g ?? 0) / 255);
    result.push((stop.color?.b ?? 0) / 255);
  });
  // Add alpha stops
  sorted.forEach(stop => {
    result.push(stop.position);
    result.push(stop.opacity ?? 1);
  });
  return result;
}

function convertEffect(effect) {
  // Convert to Lottie effect format (simplified)
  // Real effects would use Lottie's effect system
  return {
    ty: 20, // Gaussian blur equivalent
    nm: effect.type,
    np: 3,
    ix: 1,
    en: effect.enabled ? 1 : 0,
    ef: [
      { ty: 0, nm: 'Blur', v: { a: 0, k: effect.blur || 10 } },
      { ty: 7, nm: 'Dimensions', v: { a: 0, k: 1 } },
    ],
  };
}

/**
 * Convert SVG path string to Lottie bezier format (simplified)
 * This is a basic implementation - full conversion requires a complete SVG path parser
 */
function svgPathToLottie(pathData) {
  if (!pathData) return { i: [[0, 0]], o: [[0, 0]], v: [[0, 0]], c: false };

  try {
    // Basic path parsing
    const vertices = [];
    const inHandles = [];
    const outHandles = [];

    const commands = pathData.match(/[MmLlCcSsQqTtAaZz][^MmLlCcSsQqTtAaZz]*/g) || [];
    let x = 0, y = 0;
    let closed = false;

    for (const cmd of commands) {
      const type = cmd[0];
      const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

      switch (type) {
        case 'M':
          x = nums[0] || 0;
          y = nums[1] || 0;
          vertices.push([x, y]);
          inHandles.push([0, 0]);
          outHandles.push([0, 0]);
          break;
        case 'L':
          x = nums[0] || 0;
          y = nums[1] || 0;
          vertices.push([x, y]);
          inHandles.push([0, 0]);
          outHandles.push([0, 0]);
          break;
        case 'C':
          if (nums.length >= 6) {
            // Out handle for current point
            if (outHandles.length > 0) outHandles[outHandles.length - 1] = [nums[0] - x, nums[1] - y];
            vertices.push([nums[4], nums[5]]);
            inHandles.push([nums[2] - nums[4], nums[3] - nums[5]]);
            outHandles.push([0, 0]);
            x = nums[4]; y = nums[5];
          }
          break;
        case 'Z':
        case 'z':
          closed = true;
          break;
      }
    }

    return {
      i: inHandles,
      o: outHandles,
      v: vertices,
      c: closed,
    };
  } catch (e) {
    return { i: [[0, 0]], o: [[0, 0]], v: [[0, 0]], c: false };
  }
}
