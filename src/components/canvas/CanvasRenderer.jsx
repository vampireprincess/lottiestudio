import React, { useMemo, useEffect, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { getLayerValueAtFrame } from '../../engine/project.js';
import { colorToCSS } from '../../utils/colorUtils.js';
import { SnapGuides } from './SnapGuides.jsx';
import lottie from 'lottie-web';

export function CanvasRenderer({ outlineMode = false }) {
  const { project, currentFrame, showGrid, gridSize, onionSkin } = useEditorStore();
  const rootLayers = project.rootLayers || [];

  // Build gradient/filter/mask defs
  const allDefs = useMemo(() => {
    const defs = [];
    Object.values(project.layers).forEach(layer => {
      // Process fills and strokes for gradients
      [...(layer.fills || []), ...(layer.strokes || [])].forEach((fill, i) => {
        if (!fill || fill.type === 'solid') return;
        
        // Safety: skip if gradient data missing
        if (!fill.gradient || !fill.gradient.stops || fill.gradient.stops.length === 0) return;

        const g = fill.gradient;
        const gradId = `grad-${layer.id}-${i}`;

        if (fill.type === 'linear') {
          defs.push(
            <linearGradient key={gradId} id={gradId}
              gradientUnits="objectBoundingBox"
              x1={g.startPoint?.x ?? 0} y1={g.startPoint?.y ?? 0.5}
              x2={g.endPoint?.x ?? 1} y2={g.endPoint?.y ?? 0.5}>
              {g.stops.map(s => (
                <stop key={s.id} offset={s.position}
                  stopColor={colorToCSS(s.color)} stopOpacity={s.opacity ?? 1} />
              ))}
            </linearGradient>
          );
        } else if (fill.type === 'radial') {
          defs.push(
            <radialGradient key={gradId} id={gradId}
              gradientUnits="objectBoundingBox"
              cx={g.center?.x ?? 0.5} cy={g.center?.y ?? 0.5} r={g.radius ?? 0.5}
              fx={g.focalPoint?.x ?? 0.5} fy={g.focalPoint?.y ?? 0.5}>
              {g.stops.map(s => (
                <stop key={s.id} offset={s.position}
                  stopColor={colorToCSS(s.color)} stopOpacity={s.opacity ?? 1} />
              ))}
            </radialGradient>
          );
        } else {
          // Angular/diamond/reflected — approximate as linear
          defs.push(
            <linearGradient key={gradId} id={gradId}
              gradientUnits="objectBoundingBox"
              x1="0" y1="0" x2="1" y2="1">
              {g.stops.map(s => (
                <stop key={s.id} offset={s.position}
                  stopColor={colorToCSS(s.color)} stopOpacity={s.opacity ?? 1} />
              ))}
            </linearGradient>
          );
        }
      });

      // Effect blur filters
      (layer.effects || []).forEach((effect, ei) => {
        if (!effect.enabled) return;
        const blurStd = (effect.blur || 10) / 4;
        defs.push(
          <filter key={`blur-${layer.id}-${ei}`} id={`blur-${layer.id}-${ei}`}
            x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={blurStd} />
          </filter>
        );
      });

      // Mask defs
      const maskPaths = (layer.masks || []).filter(m => m.pathData);
      if (maskPaths.length > 0) {
        const maskId = `mask-${layer.id}`;
        defs.push(
          <mask key={maskId} id={maskId}>
            <rect width="10000" height="10000" fill="black" />
            {maskPaths.map((mask, mi) => {
              const fillColor = mask.inverted
                ? (mask.mode === 'subtract' ? 'white' : 'black')
                : (mask.mode === 'subtract' ? 'black' : 'white');
              const featherFilter = mask.feather > 0
                ? `blur(${mask.feather * 0.5}px)` : undefined;
              return (
                <g key={mask.id} style={{ filter: featherFilter }}>
                  {mask.mode === 'intersect' && mi > 0 && (
                    <rect width="10000" height="10000" fill="black" />
                  )}
                  <path d={mask.pathData} fill={fillColor} opacity={mask.opacity ?? 1} />
                </g>
              );
            })}
          </mask>
        );
      }
    });
    return defs;
  }, [project.layers]);

  return (
    <svg
      width={project.width} height={project.height}
      viewBox={`0 0 ${project.width} ${project.height}`}
      style={{
        display: 'block',
        overflow: 'visible',
        position: 'absolute',
        top: 0,
        left: 0,
        imageRendering: 'crisp-edges',
        shapeRendering: 'geometricPrecision',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {allDefs}
        {showGrid && (
          <pattern id="grid-pat" width={gridSize || 20} height={gridSize || 20} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize || 20} 0 L 0 0 0 ${gridSize || 20}`}
              fill="none" stroke="rgba(123,104,238,0.12)" strokeWidth="0.5" />
          </pattern>
        )}
        <clipPath id="canvas-clip">
          <rect x="0" y="0" width={project.width} height={project.height} />
        </clipPath>
      </defs>

      {showGrid && <rect width={project.width} height={project.height} fill="url(#grid-pat)" />}

      {onionSkin.enabled && (
        <OnionFrames direction="past" project={project} currentFrame={currentFrame} onionSkin={onionSkin} />
      )}

      <g clipPath="url(#canvas-clip)">
        {rootLayers.map(id => (
          <LayerRenderer key={id} layerId={id} frame={currentFrame}
            project={project} outlineMode={outlineMode} />
        ))}
      </g>

      {onionSkin.enabled && (
        <OnionFrames direction="future" project={project} currentFrame={currentFrame} onionSkin={onionSkin} />
      )}

      {(project.motionPaths || []).map(mp => (
        <MotionPathVisual key={mp.id} motionPath={mp} />
      ))}

      <SnapGuides />
    </svg>
  );
}

function MotionPathVisual({ motionPath }) {
  if (!motionPath?.pathData) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={motionPath.pathData} fill="none"
        stroke="rgba(123,104,238,0.4)" strokeWidth={1.5} strokeDasharray="6,4" />
    </g>
  );
}

// ─── Layer Renderer ───────────────────────────────────────────────────────────
export function LayerRenderer({ layerId, frame, project, outlineMode }) {
  const layer = project.layers[layerId];
  if (!layer || !layer.visible) return null;
  if (frame < (layer.inFrame ?? 0) || frame > (layer.outFrame ?? 99999)) return null;

  let pos = getLayerValueAtFrame(project, layerId, 'transform.position', frame)
    || layer.transform?.position || { x: 0, y: 0 };
  let scale = getLayerValueAtFrame(project, layerId, 'transform.scale', frame)
    || layer.transform?.scale || { x: 1, y: 1 };
  let rotation = getLayerValueAtFrame(project, layerId, 'transform.rotation', frame)
    ?? layer.transform?.rotation ?? 0;
  const opacity = getLayerValueAtFrame(project, layerId, 'opacity', frame)
    ?? layer.opacity ?? 1;

  // Anchor point — used as center of rotation/scale
  const anchor = layer.transform?.anchor || { x: 0, y: 0 };

  // ── Parent-Child transform propagation ─────────────────────────────────────
  if (layer.parentId && project.layers[layer.parentId]) {
    const parentDelay = layer.parentDelay || 0;
    const parentFrame = Math.max(0, frame - parentDelay);

    const parentChain = [];
    let currentId = layer.parentId;
    let depth = 0;
    while (currentId && project.layers[currentId] && depth < 10) {
      parentChain.unshift(currentId);
      currentId = project.layers[currentId].parentId;
      depth++;
    }

    let worldPos = { x: 0, y: 0 };
    let worldRot = 0;
    let worldScale = { x: 1, y: 1 };

    for (const pid of parentChain) {
      const parent = project.layers[pid];
      if (!parent) continue;
      const pPos = getLayerValueAtFrame(project, pid, 'transform.position', parentFrame)
        || parent.transform?.position || { x: 0, y: 0 };
      const pScale = getLayerValueAtFrame(project, pid, 'transform.scale', parentFrame)
        || parent.transform?.scale || { x: 1, y: 1 };
      const pRot = ((getLayerValueAtFrame(project, pid, 'transform.rotation', parentFrame)
        ?? parent.transform?.rotation ?? 0)) * Math.PI / 180;
      const pAnchor = parent.transform?.anchor || { x: 0, y: 0 };

      worldPos = {
        x: worldPos.x + pPos.x + pScale.x * (Math.cos(pRot) * (-pAnchor.x) - Math.sin(pRot) * (-pAnchor.y)),
        y: worldPos.y + pPos.y + pScale.y * (Math.sin(pRot) * (-pAnchor.x) + Math.cos(pRot) * (-pAnchor.y)),
      };
      worldRot += pRot * 180 / Math.PI;
      worldScale = { x: worldScale.x * pScale.x, y: worldScale.y * pScale.y };
    }

    if (layer.parentFollowPosition !== false) {
      const cosR = Math.cos(worldRot * Math.PI / 180);
      const sinR = Math.sin(worldRot * Math.PI / 180);
      pos = {
        x: worldPos.x + worldScale.x * (cosR * pos.x - sinR * pos.y),
        y: worldPos.y + worldScale.y * (sinR * pos.x + cosR * pos.y),
      };
    }
    if (layer.parentFollowRotation !== false) rotation += worldRot;
    if (layer.parentFollowScale !== false) {
      scale = { x: scale.x * worldScale.x, y: scale.y * worldScale.y };
    }
  }

  // ── SVG Transform: translate to pos, rotate around anchor, scale from anchor ─
  // Correct CSS/SVG transform: 
  // 1. Move to position
  // 2. Rotate around anchor
  // 3. Scale from anchor
  // This keeps anchor as the pivot for all transforms
  const tfm = [
    `translate(${pos.x},${pos.y})`,
    `rotate(${rotation},${anchor.x},${anchor.y})`,
    `translate(${anchor.x},${anchor.y})`,
    `scale(${scale.x},${scale.y})`,
    `translate(${-anchor.x},${-anchor.y})`,
  ].join(' ');

  const hasMasks = (layer.masks || []).some(m => m.pathData);
  const maskAttr = hasMasks ? { mask: `url(#mask-${layer.id})` } : {};

  return (
    <g
      opacity={opacity}
      transform={tfm}
      style={{ mixBlendMode: layer.blendMode || 'normal' }}
      data-layer-id={layerId}
      {...maskAttr}
    >
      {!outlineMode && (layer.effects || []).map((effect, ei) => (
        effect.enabled && <GlowCopies key={ei} layer={layer} effect={effect} effectIndex={ei} />
      ))}

      {/* Group: render children */}
      {layer.type === 'group' && (
        <g>
          {(layer.children || []).map(cid => (
            <LayerRenderer key={cid} layerId={cid} frame={frame}
              project={project} outlineMode={outlineMode} />
          ))}
        </g>
      )}

      {/* Lottie animation — rendered by lottie-web */}
      {layer.type === 'lottie' && layer.lottieData && (
        <>
          <LottieLayerCanvas layer={layer} frame={frame} />
          {/* Transparent hit-area for selection */}
          {(() => {
            const p = layer.shapeParams || {};
            const w = p.width || 400;
            const h = p.height || 300;
            const x = p.x ?? 0;
            const y = p.y ?? 0;
            return (
              <rect x={x} y={y} width={w} height={h}
                fill="transparent"
                style={{ pointerEvents: 'fill', cursor: 'move' }} />
            );
          })()}
        </>
      )}

      {/* SVG layer — static/imported SVG content */}
      {layer.type === 'svg' && layer.svgContent && (
        <>
          <g dangerouslySetInnerHTML={{ __html: layer.svgContent }} />
          {(() => {
            const p = layer.shapeParams || {};
            const w = p.width || 200;
            const h = p.height || 200;
            const x = p.x ?? 0;
            const y = p.y ?? 0;
            return (
              <rect x={x} y={y} width={w} height={h}
                fill="transparent"
                style={{ pointerEvents: 'fill', cursor: 'move' }} />
            );
          })()}
        </>
      )}

      {/* Shape/path layer */}
      {(layer.type === 'shape' || layer.type === 'path') && (
        <ShapeContent layer={layer} layerId={layerId}
          project={project} frame={frame} outlineMode={outlineMode} />
      )}
    </g>
  );
}

// ─── Lottie Layer Canvas ───────────────────────────────────────────────────────
function LottieLayerCanvas({ layer, frame }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  const lottieData = layer.lottieData;
  const p = layer.shapeParams || {};
  const w = p.width || 400;
  const h = p.height || 300;
  const x = p.x ?? 0;
  const y = p.y ?? 0;

  useEffect(() => {
    if (!containerRef.current || !lottieData) return;

    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    try {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        animationData: typeof lottieData === 'string' ? JSON.parse(lottieData) : lottieData,
      });
    } catch (e) {
      console.warn('LottieLayerCanvas init error:', e);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [lottieData]);

  useEffect(() => {
    if (!animRef.current) return;
    const totalFrames = animRef.current.totalFrames;
    if (totalFrames > 0) {
      animRef.current.goToAndStop(frame % totalFrames, true);
    }
  }, [frame]);

  if (!lottieData) return null;

  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div
        ref={containerRef}
        style={{ width: w, height: h, overflow: 'hidden' }}
      />
    </foreignObject>
  );
}

// ─── Shape Content ────────────────────────────────────────────────────────────
function ShapeContent({ layer, layerId, project, frame, outlineMode }) {
  const pathData = getLayerValueAtFrame(project, layerId, 'pathData', frame) || layer.pathData;
  const shapePath = layer.shapeType
    ? generateShapePath(layer.shapeType, layer.shapeParams || {})
    : pathData;

  if (!shapePath) return null;

  if (outlineMode) {
    return <path d={shapePath} fill="none" stroke="#333" strokeWidth={0.5} />;
  }

  const fills = layer.fills || [];
  const strokes = layer.strokes || [];

  const trimStart = getLayerValueAtFrame(project, layerId, 'trimStart', frame) ?? layer.trimStart ?? 0;
  const trimEnd = getLayerValueAtFrame(project, layerId, 'trimEnd', frame) ?? layer.trimEnd ?? 1;
  const hasTrim = layer.trimStart !== undefined || project.keyframes.some(
    kf => kf.layerId === layerId && kf.property === 'trimStart'
  );

  const dashProps = hasTrim ? {
    strokeDasharray: 1000,
    strokeDashoffset: (1 - (trimEnd - trimStart)) * 1000 - trimStart * 1000,
  } : {};

  return (
    <g>
      {fills.filter(f => f && f.enabled).map((fill, fi) => {
        let fillAttr;
        try {
          if (fill.type === 'solid') {
            fillAttr = colorToCSS(getAnimatedFillColor(project, layerId, fi, frame) || fill.color);
          } else if (fill.gradient && fill.gradient.stops?.length > 0) {
            fillAttr = `url(#grad-${layerId}-${fi})`;
          } else {
            fillAttr = '#7b68ee'; // fallback
          }
        } catch (e) {
          fillAttr = '#7b68ee';
        }
        return (
          <path key={fi} d={shapePath}
            fill={fillAttr}
            fillOpacity={fill.opacity ?? 1}
            stroke="none" />
        );
      })}

      {strokes.filter(s => s && s.enabled).map((stroke, si) => {
        const strokeAnimW = getLayerValueAtFrame(project, layerId, `strokes.${si}.width`, frame)
          ?? stroke.width ?? 2;
        let strokeColor;
        try {
          strokeColor = stroke.type === 'solid'
            ? colorToCSS(stroke.color)
            : `url(#grad-${layerId}-${si + 100})`;
        } catch (e) {
          strokeColor = '#ffffff';
        }
        return (
          <path key={si} d={shapePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeAnimW}
            strokeLinecap={stroke.lineCap || 'round'}
            strokeLinejoin={stroke.lineJoin || 'round'}
            strokeOpacity={stroke.opacity ?? 1}
            strokeDasharray={stroke.dashPattern || undefined}
            {...dashProps} />
        );
      })}
    </g>
  );
}

function getAnimatedFillColor(project, layerId, fillIndex, frame) {
  const kf = project.keyframes.find(
    k => k.layerId === layerId && k.property === `fills.${fillIndex}.color` && k.frame === frame
  );
  return kf?.value || null;
}

// ─── Glow copies ──────────────────────────────────────────────────────────────
function GlowCopies({ layer, effect, effectIndex }) {
  const shapePath = layer.shapeType
    ? generateShapePath(layer.shapeType, layer.shapeParams || {})
    : layer.pathData;
  const copies = Math.min(effect.copies || 3, 12);
  const glowColor = colorToCSS(effect.color);

  if (!shapePath && !layer.svgContent) return null;

  return (
    <>
      {Array.from({ length: copies }, (_, i) => {
        const t = (i + 1) / copies;
        const opacityVal = (effect.opacity || 0.8) * (1 - t * 0.4);
        const spread = effect.spread ? (1 + effect.spread * t * 0.008) : 1;
        return (
          <g key={i} opacity={opacityVal}
            style={{ filter: `url(#blur-${layer.id}-${effectIndex})` }}>
            <g transform={`scale(${spread})`}>
              {layer.svgContent ? (
                <g style={{ color: glowColor }}
                  dangerouslySetInnerHTML={{ __html: layer.svgContent }} />
              ) : (
                <path d={shapePath} fill={glowColor} stroke="none" />
              )}
            </g>
          </g>
        );
      })}
    </>
  );
}

// ─── Onion Skin ───────────────────────────────────────────────────────────────
function OnionFrames({ direction, project, currentFrame, onionSkin }) {
  const { selectedLayerIds } = useEditorStore.getState();
  const count = direction === 'past' ? onionSkin.pastCount : onionSkin.futureCount;

  const layerIds = onionSkin.selectedLayersOnly && selectedLayerIds.length > 0
    ? selectedLayerIds
    : project.rootLayers;

  const hueRotate = direction === 'past' ? 200 : 30;

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const f = currentFrame + (direction === 'past' ? -(i + 1) : (i + 1));
        if (f < 0 || f >= project.totalFrames) return null;
        const opacity = onionSkin.opacity * (1 - i * 0.3);

        return (
          <g key={f} opacity={opacity} style={{ pointerEvents: 'none' }}>
            <g style={{ filter: `sepia(1) saturate(3) hue-rotate(${hueRotate}deg) opacity(0.6)` }}>
              {layerIds.map(id => (
                <LayerRenderer key={id} layerId={id} frame={f} project={project} />
              ))}
            </g>
          </g>
        );
      })}
    </>
  );
}

// ─── Shape path generator ─────────────────────────────────────────────────────
export function generateShapePath(type, params = {}) {
  const {
    x = 0, y = 0, width = 100, height = 100,
    rx = 0, ry = 0, sides = 6, points = 5,
    innerRadius = 0.4, outerRadius = 0.5,
    cx: paramCx, cy: paramCy, r: paramR,
    x1 = 0, y1 = 0, x2 = 100, y2 = 0,
  } = params;

  const W = width || 100, H = height || 100;
  const CX = paramCx ?? (x + W / 2);
  const CY = paramCy ?? (y + H / 2);
  const R = paramR ?? Math.max(W, H) / 2;

  switch (type) {
    case 'rect':
      return `M ${x},${y} L ${x + W},${y} L ${x + W},${y + H} L ${x},${y + H} Z`;
    case 'roundedRect': {
      const rad = Math.min(rx || 8, W / 2, H / 2);
      return `M ${x + rad},${y} L ${x + W - rad},${y} Q ${x + W},${y} ${x + W},${y + rad} L ${x + W},${y + H - rad} Q ${x + W},${y + H} ${x + W - rad},${y + H} L ${x + rad},${y + H} Q ${x},${y + H} ${x},${y + H - rad} L ${x},${y + rad} Q ${x},${y} ${x + rad},${y} Z`;
    }
    case 'ellipse':
      return `M ${CX + W / 2},${CY} A ${W / 2},${H / 2} 0 1,1 ${CX - W / 2},${CY} A ${W / 2},${H / 2} 0 1,1 ${CX + W / 2},${CY} Z`;
    case 'circle':
      return `M ${CX + R},${CY} A ${R},${R} 0 1,1 ${CX - R},${CY} A ${R},${R} 0 1,1 ${CX + R},${CY} Z`;
    case 'polygon': {
      const n = Math.max(3, sides);
      const ro = outerRadius * 100 || R;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return `${CX + ro * Math.cos(a)},${CY + ro * Math.sin(a)}`;
      });
      return `M ${pts.join(' L ')} Z`;
    }
    case 'star': {
      const n = Math.max(3, points);
      const ro = outerRadius * 100 || R;
      const ri = innerRadius * 100 || R * 0.4;
      const pts = Array.from({ length: n * 2 }, (_, i) => {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? ro : ri;
        return `${CX + rad * Math.cos(a)},${CY + rad * Math.sin(a)}`;
      });
      return `M ${pts.join(' L ')} Z`;
    }
    case 'triangle': {
      const ro = outerRadius * 100 || R;
      return `M ${CX},${CY - ro} L ${CX + ro * 0.866},${CY + ro * 0.5} L ${CX - ro * 0.866},${CY + ro * 0.5} Z`;
    }
    case 'line':
      return `M ${x1},${y1} L ${x2},${y2}`;
    case 'heart': {
      const hw = W / 2, hh = H / 2;
      return `M ${CX},${CY + hh * 0.9} C ${CX - hw * 1.1},${CY + hh * 0.4} ${CX - hw * 1.2},${CY - hh * 0.5} ${CX},${CY - hh * 0.1} C ${CX + hw * 1.2},${CY - hh * 0.5} ${CX + hw * 1.1},${CY + hh * 0.4} ${CX},${CY + hh * 0.9} Z`;
    }
    case 'diamond': {
      const ro = outerRadius * 100 || R;
      return `M ${CX},${CY - ro} L ${CX + ro * 0.7},${CY} L ${CX},${CY + ro} L ${CX - ro * 0.7},${CY} Z`;
    }
    case 'cross': {
      const ro = outerRadius * 100 || R, t = ro * 0.35;
      return `M ${CX - t},${CY - ro} L ${CX + t},${CY - ro} L ${CX + t},${CY - t} L ${CX + ro},${CY - t} L ${CX + ro},${CY + t} L ${CX + t},${CY + t} L ${CX + t},${CY + ro} L ${CX - t},${CY + ro} L ${CX - t},${CY + t} L ${CX - ro},${CY + t} L ${CX - ro},${CY - t} L ${CX - t},${CY - t} Z`;
    }
    case 'arc': {
      const { startAngle = 0, endAngle = 270, strokeWidth: sw = 10 } = params;
      const sa = (startAngle - 90) * Math.PI / 180;
      const ea = (endAngle - 90) * Math.PI / 180;
      const ro = outerRadius * 100 || R;
      const ri = ro - (sw || 10);
      const large = (endAngle - startAngle) > 180 ? 1 : 0;
      return `M ${CX + ro * Math.cos(sa)},${CY + ro * Math.sin(sa)} A ${ro},${ro} 0 ${large},1 ${CX + ro * Math.cos(ea)},${CY + ro * Math.sin(ea)} L ${CX + ri * Math.cos(ea)},${CY + ri * Math.sin(ea)} A ${ri},${ri} 0 ${large},0 ${CX + ri * Math.cos(sa)},${CY + ri * Math.sin(sa)} Z`;
    }
    case 'ring': {
      const ro = outerRadius * 100 || R;
      const ri = innerRadius * 100 || R * 0.5;
      return `M ${CX + ro},${CY} A ${ro},${ro} 0 1,0 ${CX - ro},${CY} A ${ro},${ro} 0 1,0 ${CX + ro},${CY} Z M ${CX + ri},${CY} A ${ri},${ri} 0 1,1 ${CX - ri},${CY} A ${ri},${ri} 0 1,1 ${CX + ri},${CY} Z`;
    }
    case 'pie': {
      const { startAngle: sa2 = 0, endAngle: ea2 = 270 } = params;
      const sa3 = (sa2 - 90) * Math.PI / 180;
      const ea3 = (ea2 - 90) * Math.PI / 180;
      const large = (ea2 - sa2) > 180 ? 1 : 0;
      return `M ${CX},${CY} L ${CX + R * Math.cos(sa3)},${CY + R * Math.sin(sa3)} A ${R},${R} 0 ${large},1 ${CX + R * Math.cos(ea3)},${CY + R * Math.sin(ea3)} Z`;
    }
    case 'spiral': {
      const turns = params.turns || 3;
      const pts = [];
      for (let i = 0; i <= turns * 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const rad = R * (i / (turns * 36));
        pts.push(`${CX + rad * Math.cos(a - Math.PI / 2)},${CY + rad * Math.sin(a - Math.PI / 2)}`);
      }
      return `M ${pts.join(' L ')}`;
    }
    case 'cloud': {
      const cR = W * 0.18;
      return `M ${CX - W * 0.25},${CY + H * 0.25} A ${cR},${cR} 0 1,1 ${CX - W * 0.05},${CY} A ${cR * 1.2},${cR * 1.2} 0 1,1 ${CX + W * 0.15},${CY - H * 0.05} A ${cR},${cR} 0 1,1 ${CX + W * 0.38},${CY + H * 0.1} A ${cR * 0.8},${cR * 0.8} 0 1,1 ${CX + W * 0.25},${CY + H * 0.25} Z`;
    }
    case 'speechBubble':
      return `M ${x},${y} L ${x + W},${y} Q ${x + W + 10},${y} ${x + W + 10},${y + 10} L ${x + W + 10},${y + H - 10} Q ${x + W + 10},${y + H} ${x + W},${y + H} L ${x + W * 0.4},${y + H} L ${x + W * 0.2},${y + H + 20} L ${x + W * 0.25},${y + H} L ${x},${y + H} Q ${x - 10},${y + H} ${x - 10},${y + H - 10} L ${x - 10},${y + 10} Q ${x - 10},${y} ${x},${y} Z`;
    case 'arrow': {
      const hw = W / 2, hh = H / 2;
      return `M ${x},${CY - hh * 0.3} L ${CX - hw * 0.3},${CY - hh * 0.3} L ${CX - hw * 0.3},${y} L ${x + W},${CY} L ${CX - hw * 0.3},${y + H} L ${CX - hw * 0.3},${CY + hh * 0.3} L ${x},${CY + hh * 0.3} Z`;
    }
    default:
      return null;
  }
}
