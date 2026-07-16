import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { colorToHex } from '../../utils/colorUtils.js';
import { createStroke } from '../../engine/project.js';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { ColorPicker } from '../color/ColorPicker.jsx';
import { NumericInput } from '../shared/NumericInput.jsx';

export function StrokesSection({ layerId }) {
  const { project, updateLayer, saveHistory } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const strokes = layer.strokes || [];
  const [expandedStroke, setExpandedStroke] = useState(0);
  const [colorPickerOpen, setColorPickerOpen] = useState(null);

  const updateStroke = (index, updates) => {
    const newStrokes = strokes.map((s, i) => i === index ? { ...s, ...updates } : s);
    updateLayer(layerId, { strokes: newStrokes });
  };

  const addStroke = () => {
    saveHistory('Add Stroke');
    updateLayer(layerId, { strokes: [...strokes, createStroke()] });
  };

  const removeStroke = (index) => {
    saveHistory('Remove Stroke');
    updateLayer(layerId, { strokes: strokes.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-3 space-y-2">
      {strokes.length === 0 && (
        <div className="text-center py-4 text-xs text-[#5a5a70]">
          No strokes. Click + to add one.
        </div>
      )}

      {strokes.map((stroke, i) => (
        <div key={i} className="rounded border border-[#2e2e3a] overflow-hidden">
          {/* Stroke header */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#22222a]"
            onClick={() => setExpandedStroke(expandedStroke === i ? -1 : i)}
          >
            {/* Color preview */}
            <div
              className="w-6 h-5 rounded border border-[#3a3a50] cursor-pointer flex-shrink-0"
              style={{ background: colorToHex(stroke.color) }}
              onClick={e => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === i ? null : i); }}
            />

            <span className="text-xs text-[#b0b0c0] flex-1">Stroke {i + 1}</span>

            {/* Width */}
            <div onClick={e => e.stopPropagation()}>
              <NumericInput
                value={stroke.width}
                onChange={v => updateStroke(i, { width: v })}
                min={0}
                step={0.5}
                suffix="px"
                className="w-16"
              />
            </div>

            {/* Visibility */}
            <button
              className="btn-icon w-5 h-5"
              onClick={e => { e.stopPropagation(); updateStroke(i, { enabled: !stroke.enabled }); }}
            >
              {stroke.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            <button
              className="btn-icon w-5 h-5 text-[#f04060]"
              onClick={e => { e.stopPropagation(); removeStroke(i); }}
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Expanded */}
          {expandedStroke === i && (
            <div className="border-t border-[#2e2e3a] p-2 space-y-2">
              {colorPickerOpen === i && (
                <ColorPicker
                  color={stroke.color || { r: 255, g: 255, b: 255, a: 1 }}
                  onChange={color => updateStroke(i, { color })}
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Line Cap</label>
                  <select
                    value={stroke.lineCap || 'round'}
                    onChange={e => updateStroke(i, { lineCap: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="butt">Butt</option>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Line Join</label>
                  <select
                    value={stroke.lineJoin || 'round'}
                    onChange={e => updateStroke(i, { lineJoin: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="miter">Miter</option>
                    <option value="round">Round</option>
                    <option value="bevel">Bevel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Dash Pattern</label>
                <input
                  type="text"
                  placeholder="e.g. 5 3 (dash gap)"
                  value={stroke.dashPattern || ''}
                  onChange={e => updateStroke(i, { dashPattern: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Opacity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(stroke.opacity * 100)}
                    onChange={e => updateStroke(i, { opacity: parseInt(e.target.value) / 100 })}
                    className="flex-1 h-1"
                    style={{ accentColor: '#7b68ee' }}
                  />
                  <NumericInput
                    value={Math.round(stroke.opacity * 100)}
                    onChange={v => updateStroke(i, { opacity: v / 100 })}
                    min={0} max={100} suffix="%"
                    className="w-14"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        className="w-full btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
        onClick={addStroke}
      >
        <Plus size={11} /> Add Stroke
      </button>
    </div>
  );
}
