import React, { useRef, useState, useCallback, useEffect } from 'react';
import { EASING_LIBRARY, EASING_CATEGORIES, sampleEasing, cubicBezier } from '../../engine/animation/easingEngine.js';
import { useEditorStore } from '../../stores/editorStore.js';

const GRAPH_W = 220;
const GRAPH_H = 160;
const PAD = 20;

export function GraphEditor({ easing, onChange, compact = false }) {
  const svgRef = useRef(null);
  const [dragHandle, setDragHandle] = useState(null); // 'in' | 'out'
  const [hoveredPreset, setHoveredPreset] = useState(null);

  const bz = easing?.bezier || [0.42, 0, 0, 0.58];
  const [x1, y1, x2, y2] = bz;

  // Convert bezier coords [0-1] → SVG px
  const toSVG = (x, y) => ({
    x: PAD + x * (GRAPH_W - PAD * 2),
    y: PAD + (1 - y) * (GRAPH_H - PAD * 2),
  });
  const fromSVG = (px, py) => ({
    x: Math.max(0, Math.min(1, (px - PAD) / (GRAPH_W - PAD * 2))),
    y: Math.max(-0.5, Math.min(1.5, 1 - (py - PAD) / (GRAPH_H - PAD * 2))),
  });

  const p0 = toSVG(0, 0);
  const p1 = toSVG(x1, y1);
  const p2 = toSVG(x2, y2);
  const p3 = toSVG(1, 1);

  // Sample curve
  const curve = sampleEasing(easing, 80);
  const curvePath = curve.map((pt, i) => {
    const s = toSVG(pt.x, pt.y);
    return `${i === 0 ? 'M' : 'L'} ${s.x},${s.y}`;
  }).join(' ');

  const handleDragStart = useCallback((handle, e) => {
    e.stopPropagation();
    setDragHandle(handle);
    const svg = svgRef.current;
    if (!svg) return;

    const onMove = (me) => {
      const rect = svg.getBoundingClientRect();
      const px = me.clientX - rect.left;
      const py = me.clientY - rect.top;
      const { x, y } = fromSVG(px, py);

      if (handle === 'in') {
        onChange({ ...easing, bezier: [Math.max(0, Math.min(1, x)), y, x2, y2] });
      } else {
        onChange({ ...easing, bezier: [x1, y1, Math.max(0, Math.min(1, x)), y] });
      }
    };
    const onUp = () => {
      setDragHandle(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [easing, x1, y1, x2, y2, onChange]);

  if (compact) {
    // Mini inline preview
    return (
      <svg width={48} height={32} viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} style={{ display: 'block' }}>
        <rect width={GRAPH_W} height={GRAPH_H} fill="#1a1a22" rx={3} />
        <path d={curvePath} fill="none" stroke="#7b68ee" strokeWidth={3} />
      </svg>
    );
  }

  return (
    <div className="space-y-2">
      {/* Graph */}
      <svg
        ref={svgRef}
        width={GRAPH_W} height={GRAPH_H}
        viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
        style={{ display: 'block', borderRadius: 6, cursor: 'crosshair' }}
      >
        {/* BG */}
        <rect width={GRAPH_W} height={GRAPH_H} fill="#1a1a22" rx={6} />

        {/* Grid */}
        {[0.25, 0.5, 0.75].map(v => {
          const gx = toSVG(v, 0);
          const gy = toSVG(0, v);
          return (
            <g key={v}>
              <line x1={gx.x} y1={PAD} x2={gx.x} y2={GRAPH_H - PAD} stroke="#2e2e3a" strokeWidth={0.5} />
              <line x1={PAD} y1={gy.y} x2={GRAPH_W - PAD} y2={gy.y} stroke="#2e2e3a" strokeWidth={0.5} />
            </g>
          );
        })}

        {/* Diagonal reference */}
        <line x1={p0.x} y1={p0.y} x2={p3.x} y2={p3.y} stroke="#3a3a50" strokeWidth={0.8} strokeDasharray="4,3" />

        {/* Curve */}
        <path d={curvePath} fill="none" stroke="#7b68ee" strokeWidth={2.5} strokeLinecap="round" />

        {/* Handle lines */}
        <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#f0a030" strokeWidth={1} strokeDasharray="3,2" />
        <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="#30c8f0" strokeWidth={1} strokeDasharray="3,2" />

        {/* Anchor points */}
        <circle cx={p0.x} cy={p0.y} r={4} fill="#7b68ee" stroke="#fff" strokeWidth={1} />
        <circle cx={p3.x} cy={p3.y} r={4} fill="#7b68ee" stroke="#fff" strokeWidth={1} />

        {/* Control handles */}
        <circle cx={p1.x} cy={p1.y} r={6} fill="#f0a030" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={e => handleDragStart('in', e)} />
        <circle cx={p2.x} cy={p2.y} r={6} fill="#30c8f0" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={e => handleDragStart('out', e)} />
      </svg>

      {/* Bezier values */}
      <div className="grid grid-cols-4 gap-1">
        {['X1','Y1','X2','Y2'].map((label, i) => (
          <div key={label}>
            <div className="text-2xs text-[#5a5a70] text-center mb-0.5">{label}</div>
            <input
              type="number"
              step="0.01"
              min={i % 2 === 0 ? 0 : -1}
              max={i % 2 === 0 ? 1 : 2}
              value={parseFloat(bz[i]?.toFixed(3) || 0)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                const nb = [...bz];
                nb[i] = isNaN(v) ? 0 : v;
                onChange({ ...easing, type: 'custom', bezier: nb });
              }}
              className="input w-full text-2xs text-center font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Easing Preset Grid ───────────────────────────────────────────────────────
export function EasingPresetGrid({ selectedEasing, onSelect }) {
  const [category, setCategory] = useState('all');

  const entries = Object.entries(EASING_LIBRARY).filter(([key, val]) =>
    category === 'all' || val.category === category
  );

  return (
    <div className="space-y-2">
      {/* Category tabs */}
      <div className="flex gap-0.5 flex-wrap">
        {['all', ...EASING_CATEGORIES].map(cat => (
          <button key={cat}
            className={`px-1.5 py-0.5 text-2xs rounded capitalize transition-colors ${category === cat ? 'bg-[#7b68ee]/20 text-[#a08fff]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {entries.map(([key, val]) => {
          const isSelected = selectedEasing?.type === key;
          const ez = val.bezier ? { type: key, bezier: val.bezier } : { type: key };
          const curve = sampleEasing(ez, 32);
          const W = 52, H = 36, pad = 4;
          const path = curve.map((pt, i) => {
            const sx = pad + pt.x * (W - pad * 2);
            const sy = pad + (1 - pt.y) * (H - pad * 2);
            return `${i === 0 ? 'M' : 'L'} ${sx},${sy}`;
          }).join(' ');

          return (
            <button key={key}
              className={`flex flex-col items-center p-1.5 rounded border transition-all ${isSelected ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-[#2e2e3a] hover:border-[#5a5a70]'}`}
              onClick={() => onSelect(ez)}
              title={val.label}
            >
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                <rect width={W} height={H} fill="#1a1a22" rx={3} />
                <line x1={pad} y1={H-pad} x2={W-pad} y2={pad} stroke="#2e2e3a" strokeWidth={0.5} />
                <path d={path} fill="none" stroke={isSelected ? '#a08fff' : '#7b68ee'} strokeWidth={1.5} />
              </svg>
              <span className="text-2xs text-[#5a5a70] mt-0.5 leading-tight text-center">{val.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
