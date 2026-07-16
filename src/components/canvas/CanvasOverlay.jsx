import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { getLayerBBox } from '../../engine/svg/alignment.js';
import { extractPathPoints, pointsToPath } from '../../engine/svg/pathOps.js';

// Smoothing function for pencil strokes using Chaikin algorithm
function smoothPoints(pts, iterations = 2) {
  if (pts.length < 3) return pts;
  let result = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const smooth = [result[0]];
    for (let i = 0; i < result.length - 1; i++) {
      const p0 = result[i], p1 = result[i + 1];
      smooth.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      smooth.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    smooth.push(result[result.length - 1]);
    result = smooth;
  }
  return result;
}

// Convert smooth points to SVG cubic bezier path
function pointsToCubicPath(pts, closed = false) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx1 = prev.x + (cur.x - prev.x) * 0.33;
    const cpy1 = prev.y + (cur.y - prev.y) * 0.33;
    const cpx2 = prev.x + (cur.x - prev.x) * 0.67;
    const cpy2 = prev.y + (cur.y - prev.y) * 0.67;
    d += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${cur.x},${cur.y}`;
  }
  if (closed) d += ' Z';
  return d;
}

export function CanvasOverlay({ fitToScreen }) {
  const {
    project, tool, selectedLayerIds, currentFrame,
    selectLayers, deselectAll, addLayer,
    canvasZoom, canvasPanX, canvasPanY,
    updateLayer, saveHistory,
    autoKey, setKeyframe,
    setZoom, setPan,
  } = useEditorStore();

  const svgRef = useRef(null);
  const [drawState, setDrawState] = useState(null);
  const [boxSelect, setBoxSelect] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [penPoints, setPenPoints] = useState([]);
  const [pencilPoints, setPencilPoints] = useState([]);
  const [pencilSmoothing, setPencilSmoothing] = useState(2); // 0-5
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserShape, setEraserShape] = useState('circle'); // circle | square
  const [eraserPos, setEraserPos] = useState(null);
  const isPencilDrawing = useRef(false);
  const isZoomDragging = useRef(false);
  const zoomStartX = useRef(0);

  // Convert client coords → canvas SVG space (accounting for pan+zoom)
  const getCanvasPos = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // ── Find layer under cursor by checking bounding boxes ──────────────────
  const findLayerAtPoint = useCallback((pos) => {
    // Check layers in reverse order (top-most first)
    const allIds = project.rootLayers ? [...project.rootLayers].reverse() : [];
    
    const checkLayer = (id) => {
      const layer = project.layers[id];
      if (!layer || !layer.visible) return null;
      
      // Check children first (groups)
      if (layer.type === 'group' && layer.children?.length) {
        for (const cid of [...layer.children].reverse()) {
          const found = checkLayer(cid);
          if (found) return found;
        }
      }
      
      // Get the effective transform position
      const layerPos = layer.transform?.position || { x: 0, y: 0 };
      const bbox = getLayerBBox(layer);
      
      // Expand hit area slightly for thin paths
      const padding = 6 / canvasZoom;
      if (pos.x >= bbox.x - padding && pos.x <= bbox.x + bbox.width + padding &&
          pos.y >= bbox.y - padding && pos.y <= bbox.y + bbox.height + padding) {
        return id;
      }
      return null;
    };
    
    for (const id of allIds) {
      const found = checkLayer(id);
      if (found) return found;
    }
    return null;
  }, [project, canvasZoom]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const pos = getCanvasPos(e);

    if (tool === 'zoom') {
      isZoomDragging.current = true;
      zoomStartX.current = e.clientX;
      e.preventDefault();
      return;
    }

    if (tool === 'hand') {
      // Hand tool handled in Canvas.jsx (middle mouse button)
      return;
    }

    if (tool === 'select') {
      // Try to find element via DOM data-layer-id first (most precise)
      let layerId = null;
      const target = e.target.closest('[data-layer-id]');
      if (target) {
        layerId = target.getAttribute('data-layer-id');
      }
      // If DOM didn't give us a layer, try bounding box hit test
      if (!layerId) {
        layerId = findLayerAtPoint(pos);
      }

      if (layerId) {
        const multi = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!selectedLayerIds.includes(layerId)) {
          selectLayers([layerId], multi);
        }
        // Compute which ids will be dragged
        const ids = multi
          ? [...new Set([...selectedLayerIds, layerId])]
          : selectedLayerIds.includes(layerId) ? selectedLayerIds : [layerId];

        const origPositions = {};
        ids.forEach(id => {
          origPositions[id] = { ...((project.layers[id]?.transform?.position) || { x: 0, y: 0 }) };
        });

        const dragType = e.altKey ? 'duplicate-move' : 'move';
        setDragState({
          type: dragType,
          startPos: pos,
          layerIds: ids,
          originalPositions: origPositions,
          altDuplicated: false,
          hasMoved: false,
        });
        e.stopPropagation();
        return;
      }
      // Clicked on empty space
      setBoxSelect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      if (!e.shiftKey) deselectAll();

    } else if (['rect','roundedRect','ellipse','circle','polygon','star','line','triangle',
                'heart','diamond','cross','arc','ring','arrow','pie','spiral','cloud','speechBubble'].includes(tool)) {
      setDrawState({ type: tool, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });

    } else if (tool === 'pen') {
      if (penPoints.length >= 2) {
        const first = penPoints[0];
        const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2);
        const closeThreshold = 12 / (canvasZoom || 1);
        if (dist < closeThreshold) {
          const pathData = `M ${penPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
          saveHistory('Draw Pen Path (Closed)');
          addLayer({
            name: 'Pen Path',
            type: 'shape',
            pathData,
            shapeType: null,
            fills: [{ enabled: true, type: 'solid', color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1, blendMode: 'normal' }],
            strokes: [{ enabled: true, type: 'solid', color: { r: 255, g: 255, b: 255, a: 1 }, width: 2, opacity: 1, lineCap: 'round', lineJoin: 'round', dashPattern: '', alignment: 'center' }],
            transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, pivot: { x: 0.5, y: 0.5 } },
            inFrame: 0, outFrame: project.totalFrames,
          });
          setPenPoints([]);
          return;
        }
      }
      setPenPoints(prev => [...prev, { x: pos.x, y: pos.y, type: 'corner', inHandle: null, outHandle: null }]);

    } else if (tool === 'pencil') {
      isPencilDrawing.current = true;
      setPencilPoints([pos]);

    } else if (tool === 'maskBrush') {
      if (selectedLayerIds[0]) {
        isPencilDrawing.current = true;
        setPencilPoints([pos]);
      }

    } else if (tool === 'brush') {
      isPencilDrawing.current = true;
      setPencilPoints([pos]);

    } else if (tool === 'curvature') {
      setPenPoints(prev => {
        const newPt = { x: pos.x, y: pos.y, type: 'smooth', inHandle: null, outHandle: null };
        if (prev.length >= 1) {
          const last = prev[prev.length - 1];
          const dx = (pos.x - last.x) / 3;
          const dy = (pos.y - last.y) / 3;
          newPt.inHandle = { x: pos.x - dx, y: pos.y - dy };
          newPt.outHandle = { x: pos.x + dx, y: pos.y + dy };
        }
        return [...prev, newPt];
      });

    } else if (tool === 'eraser') {
      // Eraser: erase pixels near cursor from a drawn path, or delete layer
      const target = e.target.closest('[data-layer-id]');
      let layerId = target ? target.getAttribute('data-layer-id') : findLayerAtPoint(pos);
      if (layerId) {
        saveHistory('Eraser Delete');
        useEditorStore.getState().removeLayers([layerId]);
      }
    }
  }, [tool, selectedLayerIds, getCanvasPos, selectLayers, deselectAll, project,
      saveHistory, penPoints, canvasZoom, findLayerAtPoint, addLayer]);

  const handleMouseMove = useCallback((e) => {
    const pos = getCanvasPos(e);

    // Zoom drag: right = zoom in, left = zoom out
    if (tool === 'zoom' && isZoomDragging.current) {
      const dx = e.clientX - zoomStartX.current;
      if (Math.abs(dx) > 2) {
        const factor = dx > 0 ? 1.02 : 0.98;
        const newZoom = Math.max(0.04, Math.min(32, canvasZoom * factor));
        setZoom(newZoom);
        zoomStartX.current = e.clientX;
      }
      return;
    }

    // Eraser cursor tracking
    if (tool === 'eraser') {
      setEraserPos(pos);
    }

    if (boxSelect) {
      setBoxSelect(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
    }
    if (drawState) {
      setDrawState(prev => ({ ...prev, endX: pos.x, endY: pos.y }));
    }
    if (dragState?.type === 'move' || dragState?.type === 'duplicate-move') {
      const dx = pos.x - dragState.startPos.x;
      const dy = pos.y - dragState.startPos.y;

      // Alt+drag: duplicate once before first actual movement
      if (dragState.type === 'duplicate-move' && !dragState.altDuplicated && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        const store = useEditorStore.getState();
        dragState.layerIds.forEach(id => store.duplicateLayer(id));
        dragState.altDuplicated = true;
        dragState.layerIds.forEach(id => {
          dragState.originalPositions[id] = { ...(project.layers[id]?.transform?.position || { x: 0, y: 0 }) };
        });
      }

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        dragState.hasMoved = true;
        dragState.layerIds.forEach(id => {
          const orig = dragState.originalPositions[id] || { x: 0, y: 0 };
          const layer = project.layers[id];
          if (!layer || layer.locked) return;
          updateLayer(id, {
            transform: { ...layer.transform, position: { x: orig.x + dx, y: orig.y + dy } }
          });
        });
      }
    }

    if (isPencilDrawing.current && (tool === 'pencil' || tool === 'brush' || tool === 'maskBrush')) {
      setPencilPoints(prev => [...prev, pos]);
    }
  }, [boxSelect, drawState, dragState, project, updateLayer, getCanvasPos, tool,
      canvasZoom, setZoom, setPan]);

  const handleMouseUp = useCallback((e) => {
    const pos = getCanvasPos(e);

    isZoomDragging.current = false;

    if (boxSelect) {
      const x1 = Math.min(boxSelect.x1, boxSelect.x2);
      const x2 = Math.max(boxSelect.x1, boxSelect.x2);
      const y1 = Math.min(boxSelect.y1, boxSelect.y2);
      const y2 = Math.max(boxSelect.y1, boxSelect.y2);
      if (x2 - x1 > 5 || y2 - y1 > 5) {
        const inBox = Object.values(project.layers).filter(layer => {
          const bbox = getLayerBBox(layer);
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;
          return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
        }).map(l => l.id);
        if (inBox.length > 0) selectLayers(inBox, e.shiftKey);
      }
      setBoxSelect(null);
    }

    if (drawState) {
      const { type, startX, startY, endX, endY } = drawState;
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      if (w > 3 || h > 3) {
        saveHistory(`Draw ${type}`);
        const cx = x + w / 2, cy = y + h / 2;
        addLayer({
          name: getShapeName(type),
          type: 'shape',
          shapeType: type,
          shapeParams: {
            x, y, width: w, height: h, cx, cy,
            r: Math.max(w, h) / 2,
            outerRadius: Math.max(w, h) / 200,
            innerRadius: Math.max(w, h) / 400,
            rx: (type === 'roundedRect') ? Math.min(8, w * 0.1) : 0,
            x1: startX, y1: startY, x2: endX, y2: endY,
            sides: 6, points: 5,
          },
          fills: [{ enabled: true, type: 'solid', color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1, blendMode: 'normal' }],
          strokes: [],
          transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: cx, y: cy }, pivot: { x: 0.5, y: 0.5 } },
          inFrame: 0, outFrame: project.totalFrames,
        });
      }
      setDrawState(null);
    }

    if (dragState) {
      if (dragState.hasMoved) {
        saveHistory(dragState.type === 'duplicate-move' ? 'Duplicate Layer(s)' : 'Move Layer(s)');
        if (autoKey) {
          dragState.layerIds.forEach(id => {
            const layer = project.layers[id];
            if (layer) setKeyframe(id, 'transform.position', currentFrame, layer.transform.position);
          });
        }
      }
      setDragState(null);
    }

    // Finish pencil/brush/maskBrush
    if (isPencilDrawing.current && (tool === 'pencil' || tool === 'brush' || tool === 'maskBrush') && pencilPoints.length > 2) {
      isPencilDrawing.current = false;

      // Apply smoothing for pencil
      let pts = pencilPoints;
      if (tool === 'pencil') {
        // Reduce points first
        pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
        pts = smoothPoints(pts, pencilSmoothing);
      } else {
        pts = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
      }

      if (pts.length >= 2) {
        const pathData = tool === 'pencil'
          ? pointsToCubicPath(pts, false)
          : (`M ${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + (tool === 'maskBrush' ? ' Z' : ''));

        if (tool === 'maskBrush' && selectedLayerIds[0]) {
          const store = useEditorStore.getState();
          const targetLayer = project.layers[selectedLayerIds[0]];
          if (targetLayer) {
            saveHistory('Mask Brush');
            const newMask = {
              id: `mask-brush-${Date.now()}`,
              name: 'Brush Mask',
              mode: 'add', inverted: false, feather: 0, expansion: 0, opacity: 1,
              pathData, animated: false,
            };
            store.updateLayer(selectedLayerIds[0], {
              masks: [...(targetLayer.masks || []), newMask],
            });
          }
        } else if (tool === 'brush') {
          saveHistory('Vector Brush');
          addLayer({
            name: 'Brush Stroke',
            type: 'shape',
            pathData,
            shapeType: null,
            fills: [],
            strokes: [{ enabled: true, type: 'solid', color: { r: 255, g: 255, b: 255, a: 1 }, width: 6, opacity: 1, lineCap: 'round', lineJoin: 'round', dashPattern: '', alignment: 'center' }],
            transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, pivot: { x: 0.5, y: 0.5 } },
            inFrame: 0, outFrame: project.totalFrames,
          });
        } else {
          // Pencil — smooth path
          saveHistory('Pencil Draw');
          addLayer({
            name: 'Pencil Path',
            type: 'shape',
            pathData,
            shapeType: null,
            fills: [],
            strokes: [{ enabled: true, type: 'solid', color: { r: 255, g: 255, b: 255, a: 1 }, width: 2, opacity: 1, lineCap: 'round', lineJoin: 'round', dashPattern: '', alignment: 'center' }],
            transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, pivot: { x: 0.5, y: 0.5 } },
            inFrame: 0, outFrame: project.totalFrames,
          });
        }
      }
      setPencilPoints([]);
    } else if (isPencilDrawing.current) {
      isPencilDrawing.current = false;
      setPencilPoints([]);
    }
  }, [boxSelect, drawState, dragState, project, addLayer, saveHistory, selectLayers,
      autoKey, currentFrame, setKeyframe, getCanvasPos, pencilPoints, tool, pencilSmoothing]);

  const handleDblClick = useCallback((e) => {
    if ((tool === 'pen' || tool === 'curvature') && penPoints.length >= 2) {
      const pathData = `M ${penPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
      saveHistory(tool === 'curvature' ? 'Draw Curvature Path' : 'Draw Pen Path');
      addLayer({
        name: tool === 'curvature' ? 'Curvature Path' : 'Pen Path',
        type: 'shape',
        pathData,
        shapeType: null,
        fills: [{ enabled: true, type: 'solid', color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1, blendMode: 'normal' }],
        strokes: [{ enabled: true, type: 'solid', color: { r: 255, g: 255, b: 255, a: 1 }, width: 2, opacity: 1, lineCap: 'round', lineJoin: 'round', dashPattern: '', alignment: 'center' }],
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, pivot: { x: 0.5, y: 0.5 } },
        inFrame: 0, outFrame: project.totalFrames,
      });
      setPenPoints([]);
    }
    // Zoom tool: double-click = zoom in, alt+dblclick = zoom out
    if (tool === 'zoom') {
      const factor = e.altKey ? 0.5 : 2;
      setZoom(Math.max(0.04, Math.min(32, canvasZoom * factor)));
    }
  }, [tool, penPoints, saveHistory, addLayer, project, canvasZoom, setZoom]);

  const handleCanvasClick = useCallback((e) => {
    if (tool === 'select') {
      // Check if clicked on empty space (no layer found)
      const target = e.target.closest('[data-layer-id]');
      const layerId = target ? target.getAttribute('data-layer-id') : findLayerAtPoint(getCanvasPos(e));
      if (!layerId) {
        deselectAll();
      }
    }
    if (tool === 'zoom') {
      const factor = e.altKey ? 0.7 : 1.4;
      setZoom(Math.max(0.04, Math.min(32, canvasZoom * factor)));
    }
  }, [tool, deselectAll, findLayerAtPoint, getCanvasPos, canvasZoom, setZoom]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && penPoints.length > 0) setPenPoints([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [penPoints]);

  // Cursor style based on tool
  const getCursor = () => {
    if (tool === 'zoom') return isZoomDragging.current ? 'zoom-in' : 'zoom-in';
    if (tool === 'hand') return 'grab';
    if (tool === 'eraser') return 'none'; // Custom eraser cursor
    if (tool === 'pen' || tool === 'curvature') return 'crosshair';
    if (tool === 'pencil' || tool === 'brush' || tool === 'maskBrush') return 'crosshair';
    if (tool === 'editPoints') return 'default';
    return 'default';
  };

  return (
    <>
      {/* Eraser settings toolbar - shown when eraser active */}
      {tool === 'eraser' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl shadow-xl"
          style={{ background: '#1a1a22', border: '1px solid #3a3a50' }}>
          <span className="text-xs text-[#9090a8]">Eraser:</span>
          <select value={eraserShape} onChange={e => setEraserShape(e.target.value)}
            className="input text-xs px-1 py-0.5">
            <option value="circle">Circle</option>
            <option value="square">Square</option>
          </select>
          <span className="text-xs text-[#5a5a70]">Size:</span>
          <input type="range" min={4} max={100} value={eraserSize}
            onChange={e => setEraserSize(parseInt(e.target.value))}
            className="w-20 h-1" style={{ accentColor: '#7b68ee' }} />
          <span className="text-xs text-[#9090a8] w-6">{eraserSize}</span>
        </div>
      )}

      {/* Pencil smoothing toolbar */}
      {tool === 'pencil' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl shadow-xl"
          style={{ background: '#1a1a22', border: '1px solid #3a3a50' }}>
          <span className="text-xs text-[#9090a8]">Pencil Smoothing:</span>
          <input type="range" min={0} max={5} step={1} value={pencilSmoothing}
            onChange={e => setPencilSmoothing(parseInt(e.target.value))}
            className="w-24 h-1" style={{ accentColor: '#7b68ee' }} />
          <span className="text-xs text-[#a08fff] w-4">{pencilSmoothing}</span>
          <span className="text-xs text-[#5a5a70]">{pencilSmoothing === 0 ? 'None' : pencilSmoothing <= 2 ? 'Low' : pencilSmoothing <= 4 ? 'High' : 'Max'}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        className="absolute inset-0"
        width={project.width}
        height={project.height}
        style={{ overflow: 'visible', pointerEvents: 'all', cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        onDoubleClick={handleDblClick}
      >
        {/* Invisible background hit area */}
        <rect x="0" y="0" width={project.width} height={project.height}
          fill="transparent" style={{ pointerEvents: 'fill' }} />

        {/* Box select */}
        {boxSelect && (
          <rect
            x={Math.min(boxSelect.x1, boxSelect.x2)} y={Math.min(boxSelect.y1, boxSelect.y2)}
            width={Math.abs(boxSelect.x2 - boxSelect.x1)} height={Math.abs(boxSelect.y2 - boxSelect.y1)}
            fill="rgba(123,104,238,0.08)" stroke="#7b68ee" strokeWidth="1" strokeDasharray="4,2"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Draw preview */}
        {drawState && <DrawPreview drawState={drawState} />}

        {/* Pen preview */}
        {penPoints.length > 0 && (tool === 'pen' || tool === 'curvature') && (
          <PenPreview points={penPoints} zoom={canvasZoom || 1} />
        )}

        {/* Pencil/Brush/MaskBrush freehand preview */}
        {pencilPoints.length > 1 && (tool === 'pencil' || tool === 'brush' || tool === 'maskBrush') && (
          <path
            d={tool === 'pencil'
              ? pointsToCubicPath(pencilPoints.filter((_, i) => i % 2 === 0 || i === pencilPoints.length - 1))
              : `M ${pencilPoints[0].x},${pencilPoints[0].y} ` + pencilPoints.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
            fill={tool === 'maskBrush' ? 'rgba(240,160,48,0.2)' : 'none'}
            stroke={tool === 'maskBrush' ? '#f0a030' : tool === 'brush' ? '#ffffff' : '#a08fff'}
            strokeWidth={tool === 'brush' ? 6 : 2}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ pointerEvents: 'none', opacity: 0.7 }}
          />
        )}

        {/* Selection handles */}
        {tool === 'select' && selectedLayerIds.map(id => (
          <SelectionHandles key={id} layerId={id} project={project}
            updateLayer={updateLayer} saveHistory={saveHistory}
            autoKey={autoKey} currentFrame={currentFrame} setKeyframe={setKeyframe}
            canvasZoom={canvasZoom} />
        ))}

        {/* Node editor overlay */}
        {tool === 'editPoints' && selectedLayerIds[0] && (
          <NodeEditor layerId={selectedLayerIds[0]} project={project}
            updateLayer={updateLayer} saveHistory={saveHistory} />
        )}

        {/* Eraser cursor visual */}
        {tool === 'eraser' && eraserPos && (
          eraserShape === 'circle'
            ? <circle cx={eraserPos.x} cy={eraserPos.y} r={eraserSize / 2 / (canvasZoom || 1)}
                fill="rgba(255,80,80,0.15)" stroke="#f04060" strokeWidth={1 / (canvasZoom || 1)}
                strokeDasharray={`${3 / (canvasZoom || 1)},${2 / (canvasZoom || 1)}`}
                style={{ pointerEvents: 'none' }} />
            : <rect x={eraserPos.x - eraserSize / 2 / (canvasZoom || 1)}
                y={eraserPos.y - eraserSize / 2 / (canvasZoom || 1)}
                width={eraserSize / (canvasZoom || 1)} height={eraserSize / (canvasZoom || 1)}
                fill="rgba(255,80,80,0.15)" stroke="#f04060" strokeWidth={1 / (canvasZoom || 1)}
                strokeDasharray={`${3 / (canvasZoom || 1)},${2 / (canvasZoom || 1)}`}
                style={{ pointerEvents: 'none' }} />
        )}
      </svg>
    </>
  );
}

function getShapeName(type) {
  const n = {
    rect: 'Rectangle', roundedRect: 'Rounded Rect', ellipse: 'Ellipse', circle: 'Circle',
    line: 'Line', polygon: 'Polygon', star: 'Star', triangle: 'Triangle',
    heart: 'Heart', diamond: 'Diamond', cross: 'Cross', arc: 'Arc', ring: 'Ring',
    arrow: 'Arrow', pie: 'Pie', spiral: 'Spiral', cloud: 'Cloud', speechBubble: 'Speech Bubble',
  };
  return n[type] || 'Shape';
}

// ─── Draw Preview ─────────────────────────────────────────────────────────────
function DrawPreview({ drawState }) {
  const { type, startX, startY, endX, endY } = drawState;
  const x = Math.min(startX, endX), y = Math.min(startY, endY);
  const w = Math.abs(endX - startX), h = Math.abs(endY - startY);
  const cx = x + w / 2, cy = y + h / 2;
  const props = { fill: 'rgba(123,104,238,0.15)', stroke: '#7b68ee', strokeWidth: 1.5, strokeDasharray: '5,3', style: { pointerEvents: 'none' } };

  if (type === 'rect') return <rect x={x} y={y} width={w} height={h} {...props} />;
  if (type === 'roundedRect') return <rect x={x} y={y} width={w} height={h} rx={Math.min(8, w * 0.1)} {...props} />;
  if (type === 'ellipse') return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} {...props} />;
  if (type === 'circle') { const r = Math.min(w, h) / 2; return <circle cx={cx} cy={cy} r={r} {...props} />; }
  if (type === 'line') return <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#7b68ee" strokeWidth={2} strokeDasharray="5,3" style={{ pointerEvents: 'none' }} />;
  if (type === 'triangle') {
    const r = Math.max(w, h) / 2;
    const pts = `${cx},${cy - r} ${cx + r * 0.866},${cy + r * 0.5} ${cx - r * 0.866},${cy + r * 0.5}`;
    return <polygon points={pts} {...props} />;
  }
  if (type === 'polygon') {
    const r = Math.max(w, h) / 2, n = 6;
    const pts = Array.from({ length: n }, (_, i) => `${cx + r * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2)},${cy + r * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2)}`).join(' ');
    return <polygon points={pts} {...props} />;
  }
  if (type === 'star') {
    const ro = Math.max(w, h) / 2, ri = ro * 0.4, n = 5;
    const pts = Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? ro : ri;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    return <polygon points={pts} {...props} />;
  }
  if (type === 'heart') {
    const hw = w / 2, hh = h / 2;
    return <path d={`M ${cx},${cy + hh * 0.9} C ${cx - hw * 1.1},${cy + hh * 0.4} ${cx - hw * 1.2},${cy - hh * 0.5} ${cx},${cy - hh * 0.1} C ${cx + hw * 1.2},${cy - hh * 0.5} ${cx + hw * 1.1},${cy + hh * 0.4} ${cx},${cy + hh * 0.9} Z`} {...props} />;
  }
  if (type === 'diamond') {
    const r = Math.max(w, h) / 2;
    return <polygon points={`${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`} {...props} />;
  }
  return <rect x={x} y={y} width={w} height={h} {...props} />;
}

// ─── Pen Preview ──────────────────────────────────────────────────────────────
function PenPreview({ points, zoom = 1 }) {
  if (points.length === 0) return null;
  const d = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const closeThreshold = 12 / zoom;
  const nodeR = 4 / zoom;
  const strokeW = 1.5 / zoom;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} fill="none" stroke="#7b68ee" strokeWidth={strokeW} strokeDasharray={`${5 / zoom},${3 / zoom}`} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={nodeR}
          fill={i === 0 ? '#7b68ee' : '#fff'} stroke="#7b68ee" strokeWidth={strokeW} />
      ))}
      {points.length >= 2 && (
        <circle cx={points[0].x} cy={points[0].y} r={closeThreshold}
          fill="none" stroke="rgba(123,104,238,0.35)" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom},${2 / zoom}`} />
      )}
      {points.length > 0 && (
        <text x={points[points.length - 1].x + 8 / zoom} y={points[points.length - 1].y - 8 / zoom}
          fill="#7b68ee" fontSize={10 / zoom} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
          {points.length} pts · dbl-click to finish · click start to close
        </text>
      )}
    </g>
  );
}

// ─── Selection Handles ────────────────────────────────────────────────────────
function SelectionHandles({ layerId, project, updateLayer, saveHistory, autoKey, currentFrame, setKeyframe, canvasZoom }) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  // getLayerBBox already incorporates position transform
  const bbox = getLayerBBox(layer);
  const { x, y, width: w, height: h } = bbox;
  const pos = layer.transform?.position || { x: 0, y: 0 };

  const HANDLE = Math.max(5, 7 / (canvasZoom || 1));
  const HH = HANDLE / 2;

  // bbox already includes position, so we don't add pos again here
  const handles = [
    { id: 'nw', x: x - HH, y: y - HH, cursor: 'nw-resize', dx: -1, dy: -1 },
    { id: 'n',  x: x + w / 2 - HH, y: y - HH, cursor: 'n-resize', dx: 0, dy: -1 },
    { id: 'ne', x: x + w - HH, y: y - HH, cursor: 'ne-resize', dx: 1, dy: -1 },
    { id: 'e',  x: x + w - HH, y: y + h / 2 - HH, cursor: 'e-resize', dx: 1, dy: 0 },
    { id: 'se', x: x + w - HH, y: y + h - HH, cursor: 'se-resize', dx: 1, dy: 1 },
    { id: 's',  x: x + w / 2 - HH, y: y + h - HH, cursor: 's-resize', dx: 0, dy: 1 },
    { id: 'sw', x: x - HH, y: y + h - HH, cursor: 'sw-resize', dx: -1, dy: 1 },
    { id: 'w',  x: x - HH, y: y + h / 2 - HH, cursor: 'w-resize', dx: -1, dy: 0 },
  ];

  const handleResizeStart = useCallback((e, handle) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origParams = { ...(layer.shapeParams || { width: w, height: h, x, y }) };

    const onMove = (me) => {
      const dx = (me.clientX - startX) / (canvasZoom || 1);
      const dy = (me.clientY - startY) / (canvasZoom || 1);
      const newParams = { ...origParams };
      if (handle.dx !== 0) {
        if (handle.dx > 0) newParams.width = Math.max(1, (origParams.width || 100) + dx);
        else { newParams.width = Math.max(1, (origParams.width || 100) - dx); newParams.x = (origParams.x || 0) + dx; }
        newParams.cx = (newParams.x || 0) + newParams.width / 2;
      }
      if (handle.dy !== 0) {
        if (handle.dy > 0) newParams.height = Math.max(1, (origParams.height || 100) + dy);
        else { newParams.height = Math.max(1, (origParams.height || 100) - dy); newParams.y = (origParams.y || 0) + dy; }
        newParams.cy = (newParams.y || 0) + newParams.height / 2;
      }
      updateLayer(layerId, { shapeParams: newParams });
    };
    const onUp = () => {
      saveHistory('Resize Layer');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [layer, layerId, updateLayer, saveHistory, canvasZoom, x, y, w, h]);

  const handleRotateStart = useCallback((e) => {
    e.stopPropagation();
    // bbox already includes position
    const bx = x + w / 2;
    const by = y + h / 2;
    const svg = e.target.closest('svg');
    const ctm = svg?.getScreenCTM();
    const screenCx = ctm ? (bx * ctm.a + ctm.e) : 0;
    const screenCy = ctm ? (by * ctm.d + ctm.f) : 0;

    const startAngle = Math.atan2(e.clientY - screenCy, e.clientX - screenCx) * 180 / Math.PI;
    const origRot = layer.transform?.rotation || 0;

    const onMove = (me) => {
      const angle = Math.atan2(me.clientY - screenCy, me.clientX - screenCx) * 180 / Math.PI;
      const delta = angle - startAngle;
      updateLayer(layerId, { transform: { ...layer.transform, rotation: origRot + delta } });
    };
    const onUp = () => {
      saveHistory('Rotate Layer');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [x, y, w, h, pos, layer, layerId, updateLayer, saveHistory]);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Bounding box — bbox already includes position */}
      <rect x={x} y={y} width={w} height={h}
        fill="none" stroke="#7b68ee" strokeWidth={1 / (canvasZoom || 1)} style={{ pointerEvents: 'none' }} />

      {/* Handles */}
      {handles.map(handle => (
        <rect key={handle.id} x={handle.x} y={handle.y} width={HANDLE} height={HANDLE}
          fill="#7b68ee" stroke="white" strokeWidth={1 / (canvasZoom || 1)} rx={1 / (canvasZoom || 1)}
          style={{ cursor: handle.cursor, pointerEvents: 'all' }}
          onMouseDown={e => handleResizeStart(e, handle)}
        />
      ))}

      {/* Rotation handle — bbox already includes position */}
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - 22 / (canvasZoom || 1)}
        stroke="#7b68ee" strokeWidth={1 / (canvasZoom || 1)} style={{ pointerEvents: 'none' }} />
      <circle cx={x + w / 2} cy={y - 22 / (canvasZoom || 1)} r={5 / (canvasZoom || 1)}
        fill="#7b68ee" stroke="white" strokeWidth={1 / (canvasZoom || 1)}
        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
        onMouseDown={handleRotateStart} />

      {/* Anchor point indicator — shown in canvas coords (pos + anchor) */}
      {layer.transform?.anchor && (
        <g style={{ pointerEvents: 'none' }}>
          <line
            x1={pos.x + layer.transform.anchor.x - 6 / (canvasZoom || 1)}
            y1={pos.y + layer.transform.anchor.y}
            x2={pos.x + layer.transform.anchor.x + 6 / (canvasZoom || 1)}
            y2={pos.y + layer.transform.anchor.y}
            stroke="#f0a030" strokeWidth={1.5 / (canvasZoom || 1)} />
          <line
            x1={pos.x + layer.transform.anchor.x}
            y1={pos.y + layer.transform.anchor.y - 6 / (canvasZoom || 1)}
            x2={pos.x + layer.transform.anchor.x}
            y2={pos.y + layer.transform.anchor.y + 6 / (canvasZoom || 1)}
            stroke="#f0a030" strokeWidth={1.5 / (canvasZoom || 1)} />
          <circle
            cx={pos.x + layer.transform.anchor.x}
            cy={pos.y + layer.transform.anchor.y}
            r={3 / (canvasZoom || 1)} fill="#f0a030" stroke="white" strokeWidth={1 / (canvasZoom || 1)} />
        </g>
      )}
    </g>
  );
}

// ─── Node Editor ──────────────────────────────────────────────────────────────
function NodeEditor({ layerId, project, updateLayer, saveHistory }) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  // Support both pathData and shapeType (convert shape to path for editing)
  const pathData = layer.pathData || '';
  const [points, setPoints] = useState(() => extractPathPoints(pathData));
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    setPoints(extractPathPoints(pathData));
  }, [pathData]);

  const closed = pathData.toUpperCase().includes('Z');

  const commitPoints = useCallback((newPts, histLabel = 'Move Node') => {
    const d = pointsToPath(newPts, closed);
    setPoints(newPts);
    updateLayer(layerId, { pathData: d });
  }, [closed, layerId, updateLayer]);

  const toSVG = useCallback((e, svg) => {
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const snapAngle = (dx, dy) => {
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: Math.cos(snapped) * len, y: Math.sin(snapped) * len };
  };

  const handleAnchorDrag = useCallback((e, idx) => {
    e.stopPropagation();
    const svg = e.target.closest('svg');
    const origPt = { ...points[idx] };
    const startSVG = toSVG(e, svg);

    const onMove = (me) => {
      const svgPt = toSVG(me, svg);
      let dx = svgPt.x - startSVG.x;
      let dy = svgPt.y - startSVG.y;
      if (me.shiftKey) { const s = snapAngle(dx, dy); dx = s.x; dy = s.y; }

      const newPts = points.map((p, i) => {
        if (i !== idx) return p;
        const np = { ...p, x: origPt.x + dx, y: origPt.y + dy };
        if (p.inHandle) np.inHandle = { x: p.inHandle.x + dx, y: p.inHandle.y + dy };
        if (p.outHandle) np.outHandle = { x: p.outHandle.x + dx, y: p.outHandle.y + dy };
        return np;
      });
      commitPoints(newPts);
    };
    const onUp = () => {
      saveHistory('Move Node');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    setSelectedPoint(idx);
  }, [points, commitPoints, saveHistory, toSVG]);

  const handleHandleDrag = useCallback((e, idx, handleType) => {
    e.stopPropagation();
    const svg = e.target.closest('svg');
    const broken = e.altKey;

    const onMove = (me) => {
      const svgPt = toSVG(me, svg);
      const newPts = points.map((p, i) => {
        if (i !== idx) return p;
        const np = { ...p };
        if (handleType === 'in') {
          np.inHandle = { x: svgPt.x, y: svgPt.y };
          if (!broken && p.type !== 'broken' && np.outHandle) {
            const dx = p.x - svgPt.x, dy = p.y - svgPt.y;
            if (me.shiftKey) {
              const s = snapAngle(dx, dy);
              np.outHandle = { x: p.x + s.x, y: p.y + s.y };
            } else {
              np.outHandle = { x: p.x + dx, y: p.y + dy };
            }
          }
        } else {
          np.outHandle = { x: svgPt.x, y: svgPt.y };
          if (!broken && p.type !== 'broken' && np.inHandle) {
            const dx = p.x - svgPt.x, dy = p.y - svgPt.y;
            if (me.shiftKey) {
              const s = snapAngle(dx, dy);
              np.inHandle = { x: p.x + s.x, y: p.y + s.y };
            } else {
              np.inHandle = { x: p.x + dx, y: p.y + dy };
            }
          }
        }
        if (broken) np.type = 'broken';
        return np;
      });
      commitPoints(newPts);
    };
    const onUp = () => {
      saveHistory('Move Handle');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    setSelectedPoint(idx);
  }, [points, commitPoints, saveHistory, toSVG]);

  if (points.length === 0) return (
    <text x={10} y={20} fill="#f0a030" fontSize={11} fontFamily="sans-serif" style={{ pointerEvents: 'none' }}>
      Select a path layer to edit its nodes
    </text>
  );

  const pathPreview = pointsToPath(points, closed);

  return (
    <g style={{ pointerEvents: 'all' }}>
      <path d={pathPreview} fill="none" stroke="#7b68ee" strokeWidth={1} strokeDasharray="3,2"
        style={{ pointerEvents: 'none' }} />

      {points.map((pt, i) => (
        <React.Fragment key={`handles-${i}`}>
          {pt.inHandle && (
            <>
              <line x1={pt.x} y1={pt.y} x2={pt.inHandle.x} y2={pt.inHandle.y}
                stroke="#5a5a70" strokeWidth={0.8} style={{ pointerEvents: 'none' }} />
              <circle cx={pt.inHandle.x} cy={pt.inHandle.y} r={4}
                fill={selectedPoint === i ? '#f0a030' : '#1a1a22'} stroke="#f0a030" strokeWidth={1.5}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => handleHandleDrag(e, i, 'in')} />
            </>
          )}
          {pt.outHandle && (
            <>
              <line x1={pt.x} y1={pt.y} x2={pt.outHandle.x} y2={pt.outHandle.y}
                stroke="#5a5a70" strokeWidth={0.8} style={{ pointerEvents: 'none' }} />
              <circle cx={pt.outHandle.x} cy={pt.outHandle.y} r={4}
                fill={selectedPoint === i ? '#30a0f0' : '#1a1a22'} stroke="#30a0f0" strokeWidth={1.5}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => handleHandleDrag(e, i, 'out')} />
            </>
          )}
        </React.Fragment>
      ))}

      {points.map((pt, i) => (
        <rect key={`node-${i}`} x={pt.x - 5} y={pt.y - 5} width={10} height={10}
          fill={selectedPoint === i ? '#7b68ee' : '#1a1a22'}
          stroke={pt.type === 'broken' ? '#f04060' : pt.type === 'smooth' ? '#a08fff' : '#7b68ee'}
          strokeWidth={1.5}
          style={{ cursor: 'move', pointerEvents: 'all' }}
          onMouseDown={e => handleAnchorDrag(e, i)}
          onClick={e => { e.stopPropagation(); setSelectedPoint(i); }} />
      ))}

      <text x={10} y={16} fill="#5a5a70" fontSize={10} fontFamily="monospace"
        style={{ pointerEvents: 'none' }}>
        Edit Nodes: drag=move · Alt+drag handle=break · Shift=snap45° · Dbl-click path=finish
      </text>
    </g>
  );
}
