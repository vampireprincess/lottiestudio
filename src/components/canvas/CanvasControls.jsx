import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ZoomIn, ZoomOut, Maximize2, Eye, Grid3X3, Ruler } from 'lucide-react';

export function CanvasControls({ fitToScreen }) {
  const {
    canvasZoom, setZoom, setPan,
    showGrid, showRulers, showCheckerboard,
    updateCanvasSettings,
    project,
    previewMode,
  } = useEditorStore();

  const zoomPercent = Math.round(canvasZoom * 100);

  const zoomOptions = [25, 50, 75, 100, 150, 200, 400];

  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20">
      {/* Preview mode selector */}
      <select
        value={previewMode}
        onChange={e => updateCanvasSettings({ previewMode: e.target.value })}
        className="text-2xs bg-[#1a1a22]/90 border border-[#2e2e3a] rounded px-2 py-1 text-[#9090a8] outline-none backdrop-blur-sm"
      >
        <option value="normal">Normal</option>
        <option value="lottie">Lottie Preview</option>
        <option value="dark">Dark BG</option>
        <option value="light">Light BG</option>
        <option value="transparent">Transparent</option>
        <option value="outline">Outline View</option>
      </select>

      <div className="w-px h-4 bg-[#2e2e3a]" />

      {/* Grid toggle */}
      <button
        className={`btn-icon w-6 h-6 ${showGrid ? 'active' : ''}`}
        onClick={() => updateCanvasSettings({ showGrid: !showGrid })}
        title="Toggle Grid"
      >
        <Grid3X3 size={12} />
      </button>

      {/* Rulers toggle */}
      <button
        className={`btn-icon w-6 h-6 ${showRulers ? 'active' : ''}`}
        onClick={() => updateCanvasSettings({ showRulers: !showRulers })}
        title="Toggle Rulers"
      >
        <Ruler size={12} />
      </button>

      <div className="w-px h-4 bg-[#2e2e3a]" />

      {/* Zoom out */}
      <button
        className="btn-icon w-6 h-6"
        onClick={() => setZoom(canvasZoom * 0.8)}
        title="Zoom Out (Ctrl+-)"
      >
        <ZoomOut size={12} />
      </button>

      {/* Zoom display / selector */}
      <select
        value={zoomPercent}
        onChange={e => setZoom(parseInt(e.target.value) / 100)}
        className="text-2xs bg-[#1a1a22]/90 border border-[#2e2e3a] rounded px-1 py-1 text-[#f0f0f5] outline-none w-16 text-center font-mono backdrop-blur-sm"
      >
        {zoomOptions.map(z => (
          <option key={z} value={z}>{z}%</option>
        ))}
      </select>

      {/* Zoom in */}
      <button
        className="btn-icon w-6 h-6"
        onClick={() => setZoom(canvasZoom * 1.25)}
        title="Zoom In (Ctrl++)"
      >
        <ZoomIn size={12} />
      </button>

      {/* Fit to screen */}
      <button
        className="btn-icon w-6 h-6"
        onClick={fitToScreen}
        title="Fit to Screen (Ctrl+0)"
      >
        <Maximize2 size={12} />
      </button>
    </div>
  );
}
