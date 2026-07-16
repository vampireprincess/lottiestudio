import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import {
  MousePointer2, Pen, Pencil, Square, Circle, Triangle,
  Star, Minus, Edit3, Eraser,
  Spline, ZoomIn, Hand, PenTool, Layers, Grid
} from 'lucide-react';

const TOOL_GROUPS = [
  {
    label: 'Select',
    tools: [
      { id: 'select',     icon: MousePointer2, label: 'Select Tool',        shortcut: 'V' },
      { id: 'editPoints', icon: Edit3,         label: 'Edit Shape Points',   shortcut: 'A' },
      { id: 'zoom',       icon: ZoomIn,        label: 'Zoom Tool',           shortcut: 'Z' },
      { id: 'hand',       icon: Hand,          label: 'Pan Tool',            shortcut: 'H' },
    ]
  },
  {
    label: 'Draw',
    tools: [
      { id: 'pen',        icon: Pen,      label: 'Pen Tool — click to add points, double-click to finish, click near start to close',       shortcut: 'P' },
      { id: 'pencil',     icon: Pencil,   label: 'Pencil Tool — drag freehand stroke (stays open)',    shortcut: 'N' },
      { id: 'brush',      icon: PenTool,  label: 'Vector Brush — drag for thick freehand stroke',   shortcut: 'B' },
      { id: 'maskBrush',  icon: Layers,   label: 'Mask Brush — drag on selected layer to paint a mask',     shortcut: 'M' },
      { id: 'eraser',     icon: Eraser,   label: 'Eraser — click layer to delete it',         shortcut: 'E' },
      { id: 'line',       icon: Minus,    label: 'Line Tool — drag to draw straight line',      shortcut: 'L' },
      { id: 'curvature',  icon: Spline,   label: 'Curvature Tool — click to add smooth curve points, double-click to finish', shortcut: 'Shift+C' },
    ]
  },
];

// All available shapes with SVG icon paths for visual display
const ALL_SHAPES = [
  { id: 'rect',        label: 'Rectangle',    svg: <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'roundedRect', label: 'Rounded Rect', svg: <rect x="4" y="6" width="16" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'ellipse',     label: 'Ellipse',      svg: <ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'circle',      label: 'Circle',       svg: <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'line',        label: 'Line',         svg: <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> },
  { id: 'polygon',     label: 'Polygon',      svg: <polygon points="12,3 21,9 21,15 12,21 3,15 3,9" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'star',        label: 'Star',         svg: <polygon points="12,2 15,9 22,9 16,14 18,21 12,16 6,21 8,14 2,9 9,9" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'triangle',    label: 'Triangle',     svg: <polygon points="12,3 21,20 3,20" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'heart',       label: 'Heart',        svg: <path d="M12 21C12 21 3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 13-9 13z" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'diamond',     label: 'Diamond',      svg: <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'cross',       label: 'Cross',        svg: <><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></> },
  { id: 'arc',         label: 'Arc',          svg: <path d="M4 18 A10 10 0 0 1 20 18" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'ring',        label: 'Ring',         svg: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/></> },
  { id: 'pie',         label: 'Pie',          svg: <path d="M12 12 L20 12 A8 8 0 0 1 6 19 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'arrow',       label: 'Arrow',        svg: <><line x1="2" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="14,6 20,12 14,18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></> },
  { id: 'speechBubble',label: 'Speech Bubble',svg: <path d="M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 1-1.73" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'spiral',      label: 'Spiral',       svg: <path d="M12 12 m0-6 a6 6 0 0 1 6 6 A9 9 0 0 1 3 12 A12 12 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
  { id: 'cloud',       label: 'Cloud',        svg: <path d="M18 10A5 5 0 0 0 8 8 4 4 0 0 0 8 16h10a4 4 0 0 0 0-8z" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
];

// Tool tooltip
function ToolTooltip({ label, shortcut }) {
  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200] pointer-events-none" style={{ width: 220 }}>
      <div className="bg-[#0a0a0f] border border-[#3a3a50] rounded px-2 py-1.5 shadow-popup" style={{ wordBreak: 'break-word' }}>
        <div className="text-xs text-[#f0f0f5] leading-tight">{label}</div>
        {shortcut && (
          <span className="text-2xs text-[#5a5a70] font-mono bg-[#22222a] px-1 py-0.5 rounded mt-1 inline-block">{shortcut}</span>
        )}
      </div>
    </div>
  );
}

// Shapes popup panel — rendered as a FIXED positioned panel to avoid toolbar overflow clipping
function ShapesPopup({ buttonRef, onClose }) {
  const { tool, setTool } = useEditorStore();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, buttonRef]);

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-[190]" onClick={onClose} />
      {/* panel — fixed so it's never clipped by toolbar overflow */}
      <div
        className="fixed z-[200] rounded-xl shadow-popup p-2 animate-fade-in"
        style={{
          top: pos.top,
          left: pos.left,
          background: '#1a1a22',
          border: '1px solid #3a3a50',
          width: 210,
        }}
      >
        <p className="text-2xs font-semibold text-[#5a5a70] uppercase tracking-wider px-1 mb-2">Shapes — click to select</p>
        <div className="grid grid-cols-4 gap-1">
          {ALL_SHAPES.map(shape => {
            const isActive = tool === shape.id;
            return (
              <button
                key={shape.id}
                title={shape.label}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded transition-all ${
                  isActive
                    ? 'bg-[#7b68ee] text-white'
                    : 'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'
                }`}
                onClick={() => { setTool(shape.id); onClose(); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {shape.svg}
                </svg>
                <span className="leading-none text-center" style={{ fontSize: 9 }}>{shape.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function Toolbar() {
  const { tool, setTool } = useEditorStore();
  const [hoveredTool, setHoveredTool] = useState(null);
  const [shapesOpen, setShapesOpen] = useState(false);
  const shapesButtonRef = useRef(null);

  const isShapeActive = ALL_SHAPES.some(s => s.id === tool);
  const activeShape = ALL_SHAPES.find(s => s.id === tool);

  return (
    // overflow: visible so the shapes popup is NOT clipped
    <div
      className="flex flex-col w-11 border-r border-[#2e2e3a] flex-shrink-0 py-2 gap-0.5"
      style={{ background: '#12121a', overflowY: 'auto', overflowX: 'visible' }}
    >
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={group.label}>
          {gi > 0 && <div className="mx-2 my-1 border-t border-[#2e2e3a]" />}

          {group.tools.map(t => {
            const Icon = t.icon;
            const isActive = tool === t.id;

            return (
              <div
                key={t.id}
                className="relative flex items-center justify-center"
                onMouseEnter={() => setHoveredTool(t.id)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <button
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded transition-all ${
                    isActive
                      ? 'bg-[#7b68ee] text-white shadow-glow-sm'
                      : 'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'
                  }`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <Icon size={15} />
                </button>

                {hoveredTool === t.id && (
                  <ToolTooltip label={t.label} shortcut={t.shortcut} />
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}

      {/* Shapes group — fixed popup, not clipped by toolbar overflow */}
      <div className="mx-2 my-1 border-t border-[#2e2e3a]" />
      <div className="relative flex items-center justify-center">
        <button
          ref={shapesButtonRef}
          className={`w-8 h-8 mx-auto flex items-center justify-center rounded transition-all relative ${
            isShapeActive
              ? 'bg-[#7b68ee] text-white shadow-glow-sm'
              : 'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'
          }`}
          onClick={() => setShapesOpen(p => !p)}
          title="Shapes — click to open shape picker"
        >
          {isShapeActive && activeShape ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              {activeShape.svg}
            </svg>
          ) : (
            <Grid size={15} />
          )}
          {/* Small dot indicator */}
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#7b68ee] opacity-80" />
        </button>
      </div>

      {/* Shapes popup rendered at document level via fixed positioning */}
      {shapesOpen && (
        <ShapesPopup buttonRef={shapesButtonRef} onClose={() => setShapesOpen(false)} />
      )}
    </div>
  );
}
