import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { CanvasRenderer } from './CanvasRenderer.jsx';
import { CanvasOverlay } from './CanvasOverlay.jsx';
import { CanvasControls } from './CanvasControls.jsx';
import { AlignDistributeBar } from './AlignDistribute.jsx';
import { getAssets } from '../../db/index.js';

// SnapGuides is now rendered INSIDE CanvasRenderer's SVG (not here as a div child)

export function Canvas() {
  const containerRef = useRef(null);
  const {
    canvasZoom, canvasPanX, canvasPanY,
    setZoom, setPan, project,
    showRulers, showGrid, showCheckerboard,
    tool, selectedLayerIds,
  } = useEditorStore();

  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.04, Math.min(32, canvasZoom * factor));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const zf = newZoom / canvasZoom;
        setPan(cx - (cx - canvasPanX) * zf, cy - (cy - canvasPanY) * zf);
      }
      setZoom(newZoom);
    } else {
      setPan(canvasPanX - e.deltaX * 0.6, canvasPanY - e.deltaY * 0.6);
    }
  }, [canvasZoom, canvasPanX, canvasPanY, setZoom, setPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && tool === 'hand')) {
      isPanning.current = true;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      e.preventDefault();
    }
    // Zoom tool: left click = zoom in, alt+click = zoom out
    if (e.button === 0 && tool === 'zoom') {
      const factor = e.altKey ? 0.7 : 1.4;
      const newZoom = Math.max(0.04, Math.min(32, canvasZoom * factor));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const zf = newZoom / canvasZoom;
        setPan(cx - (cx - canvasPanX) * zf, cy - (cy - canvasPanY) * zf);
      }
      setZoom(newZoom);
    }
  }, [tool, canvasZoom, canvasPanX, canvasPanY, setZoom, setPan]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setPan(canvasPanX + dx, canvasPanY + dy);
    }
  }, [canvasPanX, canvasPanY, setPan]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    setIsDragging(false);
  }, []);

  // Handle asset drop from Asset Library
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const assetData = e.dataTransfer.getData('application/lottie-studio-asset');
    if (!assetData) return;
    try {
      const asset = JSON.parse(assetData);
      const store = useEditorStore.getState();
      getAssets().then(assets => {
        const found = assets.find(a => a.id === asset.id);
        if (found?.type === 'svg' && found.content) {
          store.importSVG(found.content, { name: found.name });
        } else if (found?.type === 'lottie') {
          store.openModal('importLottie');
        }
      });
    } catch (e) {
      console.warn('Asset drop parse error:', e);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes('application/lottie-studio-asset')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const padding = 60;
    const scaleX = (rect.width - padding * 2) / project.width;
    const scaleY = (rect.height - padding * 2) / project.height;
    const scale = Math.min(scaleX, scaleY, 4);
    setZoom(scale);
    setPan(
      (rect.width - project.width * scale) / 2,
      (rect.height - project.height * scale) / 2,
    );
  }, [project.width, project.height, setZoom, setPan]);

  useEffect(() => { setTimeout(fitToScreen, 120); }, []);
  useEffect(() => { fitToScreen(); }, [project.width, project.height]);

  const cursor = isDragging || tool === 'hand' ? 'grabbing'
    : tool === 'zoom' ? 'zoom-in'
    : ['pen','pencil','brush','line','rect','roundedRect','ellipse','circle',
       'polygon','star','triangle','heart','diamond','cross','arc','ring'].includes(tool) ? 'crosshair'
    : tool === 'editPoints' ? 'default'
    : 'default';

  const previewMode = useEditorStore(s => s.previewMode);
  const bgStyle = previewMode === 'dark'    ? { background: '#1a1a1a' }
    : previewMode === 'light'   ? { background: '#f5f5f5' }
    : previewMode === 'transparent' ? {}
    : previewMode === 'outline' ? { background: '#ffffff' }
    : {};

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${
        !bgStyle.background && showCheckerboard ? 'canvas-checkerboard' : ''
      }`}
      style={{ cursor, ...bgStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {showRulers && <Rulers zoom={canvasZoom} panX={canvasPanX} panY={canvasPanY} />}

      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${canvasPanX}px,${canvasPanY}px) scale(${canvasZoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Canvas background shadow */}
        <div
          className="absolute"
          style={{
            width: project.width,
            height: project.height,
            boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
            background: previewMode === 'outline' ? 'white'
              : (project.backgroundAlpha ?? 1) > 0 ? project.backgroundColor
              : 'transparent',
          }}
        />

        {/* Outline mode overlay */}
        {previewMode === 'outline' && (
          <div
            className="absolute inset-0 bg-white"
            style={{ width: project.width, height: project.height }}
          />
        )}

        {/* CanvasRenderer is an <svg> — SnapGuides is rendered inside it */}
        <CanvasRenderer outlineMode={previewMode === 'outline'} />

        {/* CanvasOverlay is also an <svg> positioned absolute */}
        <CanvasOverlay fitToScreen={fitToScreen} />
      </div>

      {/* Align bar — HTML overlay, correct context */}
      {selectedLayerIds.length >= 2 && tool === 'select' && <AlignDistributeBar />}

      <CanvasControls fitToScreen={fitToScreen} />
    </div>
  );
}

// ─── Rulers ──────────────────────────────────────────────────────────────────
function Rulers({ zoom, panX, panY }) {
  return (
    <>
      <div
        className="absolute top-0 left-4 right-0 h-4 z-10 overflow-hidden"
        style={{ background: '#1a1a22', borderBottom: '1px solid #2e2e3a' }}
      >
        {/* RulerTicks returns <svg>, valid inside <div> */}
        <RulerTicks orientation="h" zoom={zoom} pan={panX} />
      </div>
      <div
        className="absolute top-4 left-0 bottom-0 w-4 z-10 overflow-hidden"
        style={{ background: '#1a1a22', borderRight: '1px solid #2e2e3a' }}
      >
        <RulerTicks orientation="v" zoom={zoom} pan={panY} />
      </div>
      {/* Corner square */}
      <div
        className="absolute top-0 left-0 w-4 h-4 z-20"
        style={{
          background: '#1a1a22',
          borderRight: '1px solid #2e2e3a',
          borderBottom: '1px solid #2e2e3a',
        }}
      />
    </>
  );
}

function getTickInterval(zoom) {
  if (zoom < 0.08) return 2000;
  if (zoom < 0.15) return 1000;
  if (zoom < 0.3)  return 500;
  if (zoom < 0.6)  return 200;
  if (zoom < 1.2)  return 100;
  if (zoom < 2.5)  return 50;
  if (zoom < 5)    return 20;
  if (zoom < 10)   return 10;
  return 5;
}

function RulerTicks({ orientation, zoom, pan }) {
  const interval = getTickInterval(zoom);
  const count = Math.ceil(3000 / (interval * zoom)) + 2;
  const start = Math.floor(-pan / zoom / interval) * interval;
  const ticks = [];

  for (let i = 0; i < count; i++) {
    const val = start + i * interval;
    const px = val * zoom + pan + 16;

    ticks.push(
      <g key={i}>
        <line
          x1={orientation === 'h' ? px : 8}
          y1={orientation === 'h' ? 8 : px}
          x2={orientation === 'h' ? px : 16}
          y2={orientation === 'h' ? 16 : px}
          stroke="#3a3a50"
          strokeWidth="1"
        />
        {interval >= 50 && (
          <text
            x={orientation === 'h' ? px + 2 : 2}
            y={orientation === 'h' ? 7 : px - 2}
            fill="#5a5a70"
            fontSize="7"
            fontFamily="monospace"
            transform={orientation === 'v' ? `rotate(-90,6,${px})` : undefined}
          >
            {val}
          </text>
        )}
      </g>
    );
  }

  // RulerTicks correctly returns <svg> — valid inside <div>
  return <svg width="100%" height="100%">{ticks}</svg>;
}
