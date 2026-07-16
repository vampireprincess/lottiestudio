import React, { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { colorToHex, hexToColor, gradientToCSS } from '../../utils/colorUtils.js';
import { ColorPicker } from '../color/ColorPicker.jsx';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Plus, Trash2, RotateCcw, Shuffle, Copy } from 'lucide-react';

/**
 * Professional Gradient Editor
 * Supports: Linear, Radial, Angular, Diamond, Reflected
 * Unlimited color stops, drag to move, midpoints, opacity per stop
 */
export function GradientEditor({ gradient, onChange }) {
  const [selectedStop, setSelectedStop] = useState(0);
  const trackRef = useRef(null);
  const isDragging = useRef(false);

  if (!gradient) return null;

  const stops = [...(gradient.stops || [])].sort((a, b) => a.position - b.position);
  const selected = stops[selectedStop] || stops[0];

  // ── Stop manipulation ──────────────────────────────────────────────────────

  const updateStop = (stopId, updates) => {
    const newStops = gradient.stops.map(s => s.id === stopId ? { ...s, ...updates } : s);
    onChange({ ...gradient, stops: newStops });
  };

  const addStop = (position) => {
    // Interpolate color at position
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    let color = { r: 128, g: 128, b: 128, a: 1 };

    for (let i = 0; i < sorted.length - 1; i++) {
      if (position >= sorted[i].position && position <= sorted[i + 1].position) {
        const t = (position - sorted[i].position) / (sorted[i + 1].position - sorted[i].position);
        const c1 = sorted[i].color;
        const c2 = sorted[i + 1].color;
        color = {
          r: c1.r + (c2.r - c1.r) * t,
          g: c1.g + (c2.g - c1.g) * t,
          b: c1.b + (c2.b - c1.b) * t,
          a: (c1.a ?? 1) + ((c2.a ?? 1) - (c1.a ?? 1)) * t,
        };
        break;
      }
    }

    const newStop = { id: uuidv4(), position, color, opacity: 1 };
    onChange({ ...gradient, stops: [...gradient.stops, newStop] });
    setSelectedStop(gradient.stops.length);
  };

  const removeStop = (stopId) => {
    if (gradient.stops.length <= 2) return;
    const newStops = gradient.stops.filter(s => s.id !== stopId);
    onChange({ ...gradient, stops: newStops });
    setSelectedStop(Math.max(0, selectedStop - 1));
  };

  const reverseGradient = () => {
    const newStops = gradient.stops.map(s => ({ ...s, position: 1 - s.position }));
    onChange({ ...gradient, stops: newStops });
  };

  const distributeStops = () => {
    const sorted = [...gradient.stops].sort((a, b) => a.position - b.position);
    const newStops = sorted.map((s, i) => ({ ...s, position: i / (sorted.length - 1) }));
    onChange({ ...gradient, stops: newStops });
  };

  // ── Track dragging ─────────────────────────────────────────────────────────

  const handleTrackMouseDown = useCallback((e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Check if clicked on existing stop
    const clickedStop = stops.find(s => Math.abs(s.position - pos) < 0.03);
    if (clickedStop) {
      setSelectedStop(stops.indexOf(clickedStop));
      isDragging.current = clickedStop.id;
    } else {
      // Add new stop
      addStop(pos);
    }

    const onMove = (me) => {
      if (!isDragging.current || !rect) return;
      const newPos = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      updateStop(isDragging.current, { position: newPos });
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [stops, addStop, updateStop]);

  const gradientCSS = gradientToCSS(gradient);

  return (
    <div className="space-y-3">
      {/* Gradient type */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Type</label>
        <div className="flex gap-1 flex-wrap">
          {['linear', 'radial', 'angular', 'diamond', 'reflected'].map(type => (
            <button
              key={type}
              className={`px-2 py-0.5 text-2xs rounded border transition-colors capitalize ${
                gradient.type === type
                  ? 'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10'
                  : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'
              }`}
              onClick={() => onChange({ ...gradient, type })}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Gradient preview */}
      <div className="relative h-8 rounded border border-[#3a3a50] overflow-hidden" style={{ background: gradientCSS }}>
        <div className="absolute inset-0 rounded" style={{
          backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%)',
          backgroundSize: '8px 8px',
        }} />
        <div className="absolute inset-0 rounded" style={{ background: gradientCSS }} />
      </div>

      {/* Gradient track with stops */}
      <div className="relative">
        <div
          ref={trackRef}
          className="relative h-5 rounded cursor-pointer border border-[#3a3a50]"
          style={{ background: gradientCSS }}
          onMouseDown={handleTrackMouseDown}
        >
          {/* Checkerboard bg */}
          <div className="absolute inset-0 rounded" style={{
            backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%)',
            backgroundSize: '8px 8px',
          }} />
          <div className="absolute inset-0 rounded" style={{ background: gradientCSS }} />

          {/* Stop handles */}
          {stops.map((stop, i) => (
            <div
              key={stop.id}
              className={`absolute top-full mt-0.5 transform -translate-x-1/2 cursor-pointer`}
              style={{ left: `${stop.position * 100}%` }}
              onMouseDown={e => {
                e.stopPropagation();
                setSelectedStop(i);
                isDragging.current = stop.id;
              }}
            >
              <div
                className={`w-3 h-3 rounded-sm border-2 ${
                  i === selectedStop ? 'border-white scale-125' : 'border-[#9090a8]'
                }`}
                style={{
                  background: colorToHex(stop.color),
                  transform: 'rotate(45deg)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Stop positions ruler */}
        <div className="mt-5 flex justify-between text-2xs text-[#5a5a70] px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Selected stop controls */}
      {selected && (
        <div className="border border-[#2e2e3a] rounded p-2 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-5 rounded border border-[#3a3a50]"
              style={{ background: colorToHex(selected.color) }}
            />
            <span className="text-xs text-[#b0b0c0] flex-1">Stop {selectedStop + 1}</span>
            <button
              className="btn-icon w-5 h-5 text-[#f04060]"
              onClick={() => removeStop(selected.id)}
              disabled={stops.length <= 2}
              title="Remove stop (min 2 stops required)"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Stop color picker */}
          <ColorPicker
            color={selected.color}
            onChange={color => updateStop(selected.id, { color })}
          />

          {/* Position & opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Position</label>
              <NumericInput
                value={Math.round(selected.position * 100)}
                onChange={v => updateStop(selected.id, { position: v / 100 })}
                min={0} max={100} step={1} suffix="%"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Opacity</label>
              <NumericInput
                value={Math.round((selected.opacity ?? 1) * 100)}
                onChange={v => updateStop(selected.id, { opacity: v / 100 })}
                min={0} max={100} step={1} suffix="%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gradient settings */}
      {gradient.type === 'linear' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Angle</label>
            <NumericInput
              value={gradient.angle ?? 90}
              onChange={v => onChange({ ...gradient, angle: v })}
              min={0} max={360} step={1} suffix="°"
            />
          </div>
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Spread</label>
            <select
              value={gradient.spread || 'pad'}
              onChange={e => onChange({ ...gradient, spread: e.target.value })}
              className="input w-full text-xs"
            >
              <option value="pad">Pad</option>
              <option value="repeat">Repeat</option>
              <option value="reflect">Reflect</option>
            </select>
          </div>
        </div>
      )}

      {gradient.type === 'radial' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Center X</label>
            <NumericInput
              value={Math.round((gradient.center?.x ?? 0.5) * 100)}
              onChange={v => onChange({ ...gradient, center: { ...(gradient.center || {}), x: v / 100 } })}
              min={0} max={100} step={1} suffix="%"
            />
          </div>
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Center Y</label>
            <NumericInput
              value={Math.round((gradient.center?.y ?? 0.5) * 100)}
              onChange={v => onChange({ ...gradient, center: { ...(gradient.center || {}), y: v / 100 } })}
              min={0} max={100} step={1} suffix="%"
            />
          </div>
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Radius</label>
            <NumericInput
              value={Math.round((gradient.radius ?? 0.5) * 100)}
              onChange={v => onChange({ ...gradient, radius: v / 100 })}
              min={0} max={200} step={1} suffix="%"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 flex-wrap">
        <button
          className="btn-ghost text-2xs px-2 py-1 border border-[#2e2e3a] rounded flex items-center gap-1"
          onClick={reverseGradient}
          title="Reverse gradient"
        >
          <RotateCcw size={10} /> Reverse
        </button>
        <button
          className="btn-ghost text-2xs px-2 py-1 border border-[#2e2e3a] rounded flex items-center gap-1"
          onClick={distributeStops}
          title="Distribute stops evenly"
        >
          <Shuffle size={10} /> Distribute
        </button>
        <button
          className="btn-ghost text-2xs px-2 py-1 border border-[#2e2e3a] rounded flex items-center gap-1"
          onClick={() => addStop(0.5)}
          title="Add stop at center"
        >
          <Plus size={10} /> Add Stop
        </button>
        <button
          className="btn-ghost text-2xs px-2 py-1 border border-[#2e2e3a] rounded flex items-center gap-1"
          onClick={() => {
            const text = JSON.stringify(gradient);
            navigator.clipboard?.writeText(text).catch(() => {});
          }}
          title="Copy gradient"
        >
          <Copy size={10} /> Copy
        </button>
      </div>
    </div>
  );
}
