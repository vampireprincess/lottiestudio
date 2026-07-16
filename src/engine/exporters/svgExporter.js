/**
 * SVG Exporter - Static and Animated SVG
 */

import { colorToCSS, gradientToCSS } from '../../utils/colorUtils.js';
import { generateShapePath } from '../../components/canvas/CanvasRenderer.jsx';
import { getLayerValueAtFrame } from '../project.js';

/**
 * Export project to SVG (static or animated)
 */
export function exportSVG(project, options = {}) {
  const { animated = false, fps = project.fps || 30, frame = 0 } = options;

  const width = project.width;
  const height = project.height;
  const totalFrames = project.totalFrames || 180;
  const duration = totalFrames / fps;

  let defs = '';
  let content = '';

  // Add gradient defs
  Object.values(project.layers).forEach((layer, li) => {
    [...(layer.fills || []), ...(layer.strokes || [])].forEach((fill, fi) => {
      if (fill.type === 'linear' && fill.gradient) {
        const g = fill.gradient;
        const stops = (g.stops || [])
          .sort((a, b) => a.position - b.position)
          .map(stop => `<stop offset="${stop.position * 100}%" stop-color="${colorToCSS(stop.color)}" stop-opacity="${stop.opacity ?? 1}"/>`)
          .join('\n    ');

        defs += `
  <linearGradient id="grad-${layer.id}-${fi}" gradientUnits="objectBoundingBox"
    x1="${g.startPoint?.x ?? 0}" y1="${g.startPoint?.y ?? 0}"
    x2="${g.endPoint?.x ?? 1}" y2="${g.endPoint?.y ?? 0}">
    ${stops}
  </linearGradient>`;
      } else if (fill.type === 'radial' && fill.gradient) {
        const g = fill.gradient;
        const stops = (g.stops || [])
          .sort((a, b) => a.position - b.position)
          .map(stop => `<stop offset="${stop.position * 100}%" stop-color="${colorToCSS(stop.color)}" stop-opacity="${stop.opacity ?? 1}"/>`)
          .join('\n    ');

        defs += `
  <radialGradient id="grad-${layer.id}-${fi}" gradientUnits="objectBoundingBox"
    cx="${g.center?.x ?? 0.5}" cy="${g.center?.y ?? 0.5}" r="${g.radius ?? 0.5}">
    ${stops}
  </radialGradient>`;
      }
    });

    // Mask defs
    (layer.masks || []).forEach(mask => {
      if (!mask.pathData) return;
      defs += `
  <mask id="mask-${mask.id}">
    <path d="${mask.pathData}" fill="${mask.mode === 'subtract' ? 'black' : 'white'}" opacity="${mask.opacity ?? 1}"/>
  </mask>`;
    });
  });

  // Render layers
  const renderLayer = (layerId, depth = 0) => {
    const layer = project.layers[layerId];
    if (!layer || !layer.visible) return '';

    const transform = layer.transform || {};
    const pos = animated ? { x: 0, y: 0 } : (transform.position || { x: 0, y: 0 });
    const scale = transform.scale || { x: 1, y: 1 };
    const rotation = transform.rotation || 0;
    const anchor = transform.anchor || { x: 0, y: 0 };
    const opacity = layer.opacity ?? 1;

    const transformAttr = `translate(${pos.x}, ${pos.y}) rotate(${rotation}, ${anchor.x}, ${anchor.y}) scale(${scale.x}, ${scale.y})`;

    const maskId = layer.masks?.length > 0 ? `mask-${layer.masks[0].id}` : null;

    let layerContent = '';

    if (layer.type === 'group') {
      layerContent = layer.children?.map(id => renderLayer(id, depth + 1)).join('\n') || '';
    } else if (layer.type === 'svg' && layer.svgContent) {
      layerContent = layer.svgContent;
    } else if (layer.shapeType || layer.pathData) {
      const pathData = layer.shapeType
        ? generateShapePath(layer.shapeType, layer.shapeParams || {})
        : layer.pathData;

      if (pathData) {
        const fills = layer.fills || [];
        const strokes = layer.strokes || [];
        const pf = fills.find(f => f.enabled);
        const ps = strokes.find(s => s.enabled);

        const fillAttr = pf
          ? pf.type === 'solid'
            ? `fill="${colorToCSS(pf.color)}" fill-opacity="${pf.opacity ?? 1}"`
            : `fill="url(#grad-${layer.id}-0)" fill-opacity="${pf.opacity ?? 1}"`
          : 'fill="none"';

        const strokeAttr = ps
          ? `stroke="${colorToCSS(ps.color)}" stroke-width="${ps.width}" stroke-linecap="${ps.lineCap || 'round'}" stroke-linejoin="${ps.lineJoin || 'round'}" stroke-opacity="${ps.opacity ?? 1}"`
          : 'stroke="none"';

        // Add glow effects as SVG filters
        let filterAttr = '';
        const glowEffects = (layer.effects || []).filter(e => e.enabled);
        if (glowEffects.length > 0) {
          glowEffects.forEach((effect, ei) => {
            defs += `
  <filter id="glow-${layer.id}-${ei}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="${effect.blur / 4}" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>`;
            filterAttr = `filter="url(#glow-${layer.id}-${ei})"`;
          });
        }

        // Animated SVG with CSS animations
        let animContent = '';
        if (animated) {
          const posKfs = project.keyframes.filter(kf => kf.layerId === layerId && kf.property === 'transform.position');
          if (posKfs.length > 0) {
            const animId = `anim-pos-${layer.id}`;
            const keyframesCSS = posKfs
              .sort((a, b) => a.frame - b.frame)
              .map(kf => {
                const pct = Math.round(kf.frame / project.totalFrames * 100);
                return `${pct}% { transform: translate(${kf.value.x}px, ${kf.value.y}px); }`;
              })
              .join('\n        ');
            animContent += `\n    @keyframes ${animId} { ${keyframesCSS} }`;
          }
        }

        layerContent = `<path d="${pathData}" ${fillAttr} ${strokeAttr} ${filterAttr}/>`;

        if (animated && animContent) {
          // Add style for animation
          defs += `<style>${animContent}</style>`;
        }
      }
    }

    if (!layerContent) return '';

    return `
  <g id="${layerId}" opacity="${opacity}" transform="${transformAttr}" style="mix-blend-mode:${layer.blendMode || 'normal'}"${maskId ? ` mask="url(#${maskId})"` : ''}>
    ${layerContent}
  </g>`;
  };

  const rootLayers = [...(project.rootLayers || [])];
  content = rootLayers.map(id => renderLayer(id)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${defs}
  </defs>
  ${project.backgroundAlpha > 0 ? `<rect width="${width}" height="${height}" fill="${project.backgroundColor || '#000000'}"/>` : ''}
  ${content}
</svg>`;
}
