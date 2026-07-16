import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';

function GlobalColorLink({ value, onChange }) {
  const { project } = useEditorStore();
  const globalColors = project.globalColors || [];
  if (globalColors.length === 0) return null;
  return (
    <div className="mt-1.5">
      <label className="text-2xs text-[#5a5a70] block mb-1">Link to Global Color</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="input w-full text-xs"
      >
        <option value="">None</option>
        {globalColors.map(gc => (
          <option key={gc.id} value={gc.id}>{gc.name}</option>
        ))}
      </select>
    </div>
  );
}

import { colorToHex, hexToColor, gradientToCSS } from '../../utils/colorUtils.js';
import { createSolidFill, createGradientFill } from '../../engine/project.js';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { ColorPicker } from '../color/ColorPicker.jsx';
import { GradientEditor } from '../gradient/GradientEditor.jsx';

// Safe gradient preview helper — never crashes if gradient is null/undefined
function safeFillBackground(fill) {
  try {
    if (fill.type === 'solid') {
      return fill.color ? colorToHex(fill.color) : '#7b68ee';
    }
    if (fill.gradient && fill.gradient.stops && fill.gradient.stops.length > 0) {
      return gradientToCSS(fill.gradient);
    }
    // Gradient type but no gradient data — show placeholder
    return 'linear-gradient(90deg, #7b68ee, #00c8ff)';
  } catch (e) {
    return '#7b68ee';
  }
}

// Make a safe default gradient to avoid null crashes
function makeDefaultGradient(type = 'linear') {
  return {
    type,
    stops: [
      { id: uuidv4(), position: 0, color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1 },
      { id: uuidv4(), position: 1, color: { r: 0, g: 200, b: 255, a: 1 }, opacity: 1 },
    ],
    angle: 90,
    startPoint: { x: 0, y: 0.5 },
    endPoint: { x: 1, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    radius: 0.5,
    focalPoint: { x: 0.5, y: 0.5 },
    focalRadius: 0,
    spread: 'pad',
  };
}

export function FillsSection({ layerId }) {
  const { project, updateLayer, saveHistory } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const fills = layer.fills || [];
  const [expandedFill, setExpandedFill] = useState(0);
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [gradientEditorOpen, setGradientEditorOpen] = useState(null);

  const updateFill = (index, updates, addToHistory = false) => {
    if (addToHistory) saveHistory('Update Fill');
    const newFills = fills.map((f, i) => i === index ? { ...f, ...updates } : f);
    updateLayer(layerId, { fills: newFills });
  };

  const addFill = (type = 'solid') => {
    saveHistory('Add Fill');
    let newFill;
    if (type === 'solid') {
      newFill = createSolidFill ? createSolidFill() : {
        enabled: true, type: 'solid',
        color: { r: 123, g: 104, b: 238, a: 1 },
        opacity: 1, blendMode: 'normal',
      };
    } else {
      // Always create a valid gradient fill with default stops
      newFill = {
        enabled: true,
        type,
        gradient: makeDefaultGradient(type),
        opacity: 1,
        blendMode: 'normal',
      };
    }
    updateLayer(layerId, { fills: [...fills, newFill] });
  };

  const removeFill = (index) => {
    saveHistory('Remove Fill');
    updateLayer(layerId, { fills: fills.filter((_, i) => i !== index) });
  };

  const handleTypeChange = (i, newType, e) => {
    e.stopPropagation();
    if (newType === 'solid') {
      // Switch to solid — preserve existing color or use default
      const existingColor = fills[i].color || { r: 123, g: 104, b: 238, a: 1 };
      updateFill(i, { type: 'solid', color: existingColor, gradient: undefined });
    } else {
      // Switch to gradient — always create a valid gradient
      const existingGradient = fills[i].gradient && fills[i].gradient.stops?.length > 0
        ? { ...fills[i].gradient, type: newType }
        : makeDefaultGradient(newType);
      updateFill(i, { type: newType, gradient: existingGradient });
      setGradientEditorOpen(i);
      setColorPickerOpen(null);
    }
  };

  return (
    <div className="p-3 space-y-2">
      {fills.length === 0 && (
        <div className="text-center py-4 text-xs text-[#5a5a70]">
          No fills. Click + to add one.
        </div>
      )}

      {fills.map((fill, i) => (
        <div key={i} className="rounded border border-[#2e2e3a] overflow-hidden">
          {/* Fill header */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#22222a]"
            onClick={() => setExpandedFill(expandedFill === i ? -1 : i)}
          >
            {/* Color preview — never crashes */}
            <div
              className="w-8 h-5 rounded border border-[#3a3a50] cursor-pointer flex-shrink-0"
              style={{ background: safeFillBackground(fill) }}
              onClick={e => {
                e.stopPropagation();
                if (fill.type === 'solid') {
                  setColorPickerOpen(colorPickerOpen === i ? null : i);
                  setGradientEditorOpen(null);
                } else {
                  setGradientEditorOpen(gradientEditorOpen === i ? null : i);
                  setColorPickerOpen(null);
                }
              }}
            />

            {/* Type selector */}
            <select
              value={fill.type}
              onChange={e => handleTypeChange(i, e.target.value, e)}
              className="input text-xs flex-1"
              onClick={e => e.stopPropagation()}
            >
              <option value="solid">Solid</option>
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
              <option value="angular">Angular Gradient</option>
              <option value="diamond">Diamond</option>
              <option value="reflected">Reflected</option>
            </select>

            {/* Opacity */}
            <input
              type="number"
              value={Math.round((fill.opacity ?? 1) * 100)}
              onChange={e => { e.stopPropagation(); updateFill(i, { opacity: parseInt(e.target.value) / 100 }); }}
              className="input w-12 text-xs text-center"
              min={0} max={100}
              onClick={e => e.stopPropagation()}
            />

            {/* Visibility */}
            <button className="btn-icon w-5 h-5"
              onClick={e => { e.stopPropagation(); updateFill(i, { enabled: !fill.enabled }); }}>
              {fill.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            {/* Remove */}
            <button className="btn-icon w-5 h-5 text-[#f04060]"
              onClick={e => { e.stopPropagation(); removeFill(i); }}>
              <Trash2 size={11} />
            </button>
          </div>

          {/* Expanded controls */}
          {expandedFill === i && (
            <div className="border-t border-[#2e2e3a] p-2">
              {/* Solid color picker */}
              {fill.type === 'solid' && (
                <>
                  {colorPickerOpen === i ? (
                    <ColorPicker
                      color={fill.color || { r: 123, g: 104, b: 238, a: 1 }}
                      onChange={color => updateFill(i, { color })}
                    />
                  ) : (
                    <button className="btn-ghost text-xs w-full py-1"
                      onClick={() => { setColorPickerOpen(i); setGradientEditorOpen(null); }}>
                      Edit Color
                    </button>
                  )}
                </>
              )}

              {/* Gradient editor — only shown if gradient data is valid */}
              {fill.type !== 'solid' && (
                <>
                  {gradientEditorOpen === i ? (
                    <GradientEditor
                      gradient={fill.gradient || makeDefaultGradient(fill.type)}
                      onChange={gradient => updateFill(i, { gradient }, false)}
                    />
                  ) : (
                    <button className="btn-ghost text-xs w-full py-1"
                      onClick={() => { setGradientEditorOpen(i); setColorPickerOpen(null); }}>
                      Edit Gradient
                    </button>
                  )}
                </>
              )}

              {/* Blend mode */}
              <div className="mt-2">
                <label className="text-2xs text-[#5a5a70] block mb-1">Blend Mode</label>
                <select
                  value={fill.blendMode || 'normal'}
                  onChange={e => updateFill(i, { blendMode: e.target.value })}
                  className="input w-full text-xs"
                >
                  {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                    'difference', 'exclusion', 'color-dodge', 'color-burn', 'hard-light', 'soft-light'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Global Color link */}
              <GlobalColorLink
                value={fill.globalColorId || ''}
                onChange={gcId => updateFill(i, { globalColorId: gcId || null })}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add fill buttons */}
      <div className="flex gap-1">
        <button
          className="flex-1 btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
          onClick={() => addFill('solid')}>
          <Plus size={11} /> Solid
        </button>
        <button
          className="flex-1 btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
          onClick={() => addFill('linear')}>
          <Plus size={11} /> Gradient
        </button>
      </div>
    </div>
  );
}
