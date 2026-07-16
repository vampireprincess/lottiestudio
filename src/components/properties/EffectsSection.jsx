import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Expand a glow effect into actual sibling layers (each with increasing blur opacity)
 */
function expandEffectToLayers(layerId, effect, effectIndex) {
  const store = useEditorStore.getState();
  const { project } = store;
  const sourceLayer = project.layers[layerId];
  if (!sourceLayer) return;

  store.saveHistory('Expand Glow Effect to Layers');

  const copies = Math.min(effect.copies || 3, 8);
  const newLayers = { ...project.layers };
  const newRootLayers = [...project.rootLayers];
  const insertIdx = newRootLayers.indexOf(layerId);

  for (let ci = 0; ci < copies; ci++) {
    const t = (ci + 1) / copies;
    const blurAmount = (effect.blur || 20) * t;
    const copyOpacity = (effect.opacity || 0.8) * (1 - t * 0.4);

    const copyId = uuidv4();
    const copyLayer = {
      ...JSON.parse(JSON.stringify(sourceLayer)),
      id: copyId,
      name: `${sourceLayer.name} — Glow ${ci + 1}`,
      effects: [{
        id: uuidv4(),
        type: 'glow',
        enabled: true,
        color: effect.color,
        blur: blurAmount,
        spread: 0,
        opacity: 1,
        copies: 1,
        expanded: false,
      }],
      fills: (sourceLayer.fills || []).map(f => ({
        ...f,
        color: effect.color,
        type: 'solid',
      })),
      opacity: copyOpacity,
    };

    newLayers[copyId] = copyLayer;
    // Insert below the source layer
    if (insertIdx !== -1) {
      newRootLayers.splice(insertIdx, 0, copyId);
    } else {
      newRootLayers.push(copyId);
    }
  }

  store.loadProject({
    ...project,
    layers: newLayers,
    rootLayers: newRootLayers,
  });
}
import { createGlowEffect } from '../../engine/project.js';
import { colorToHex } from '../../utils/colorUtils.js';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { ColorPicker } from '../color/ColorPicker.jsx';
import { NumericInput } from '../shared/NumericInput.jsx';

const EFFECT_TYPES = [
  { id: 'glow', label: 'Glow' },
  { id: 'softGlow', label: 'Soft Glow' },
  { id: 'strongGlow', label: 'Strong Glow' },
  { id: 'neon', label: 'Neon' },
  { id: 'neonTube', label: 'Neon Tube' },
  { id: 'innerGlow', label: 'Inner Glow' },
  { id: 'outerGlow', label: 'Outer Glow' },
  { id: 'sparkle', label: 'Sparkle Glow' },
  { id: 'shadow', label: 'Drop Shadow' },
  { id: 'softShadow', label: 'Soft Shadow' },
  { id: 'coloredShadow', label: 'Colored Shadow' },
  { id: 'longShadow', label: 'Long Shadow' },
  { id: 'flickeringNeon', label: 'Flickering Neon' },
  { id: 'pulsingGlow', label: 'Pulsing Glow' },
];

export function EffectsSection({ layerId }) {
  const { project, updateLayer, saveHistory } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const effects = layer.effects || [];
  const [expandedEffect, setExpandedEffect] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(null);

  const updateEffect = (index, updates) => {
    const newEffects = effects.map((e, i) => i === index ? { ...e, ...updates } : e);
    updateLayer(layerId, { effects: newEffects });
  };

  const addEffect = (type) => {
    saveHistory('Add Effect');
    const defaults = getEffectDefaults(type);
    updateLayer(layerId, { effects: [...effects, { ...createGlowEffect(type), ...defaults }] });
  };

  const removeEffect = (index) => {
    saveHistory('Remove Effect');
    updateLayer(layerId, { effects: effects.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-3 space-y-2">
      {/* Info about OBS-style glow */}
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Glow effects use Gaussian blur copies (OBS-style). Each effect creates blurred copies of the layer for authentic glow.
      </div>

      {effects.length === 0 && (
        <div className="text-center py-3 text-xs text-[#5a5a70]">
          No effects. Add a glow, neon or shadow below.
        </div>
      )}

      {effects.map((effect, i) => (
        <div key={effect.id || i} className="rounded border border-[#2e2e3a] overflow-hidden">
          {/* Effect header */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#22222a]"
            onClick={() => setExpandedEffect(expandedEffect === i ? null : i)}
          >
            <div
              className="w-5 h-5 rounded-full border border-[#3a3a50] flex-shrink-0"
              style={{ background: colorToHex(effect.color), boxShadow: `0 0 6px ${colorToHex(effect.color)}` }}
              onClick={e => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === i ? null : i); }}
            />
            <span className="text-xs text-[#b0b0c0] flex-1">
              {EFFECT_TYPES.find(t => t.id === effect.type)?.label || effect.type}
            </span>
            <button
              className="btn-icon w-5 h-5"
              onClick={e => { e.stopPropagation(); updateEffect(i, { enabled: !effect.enabled }); }}
            >
              {effect.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
            <button
              className="btn-icon w-5 h-5 text-[#f04060]"
              onClick={e => { e.stopPropagation(); removeEffect(i); }}
            >
              <Trash2 size={11} />
            </button>
            {expandedEffect === i ? <ChevronDown size={11} className="text-[#5a5a70]" /> : <ChevronRight size={11} className="text-[#5a5a70]" />}
          </div>

          {/* Expanded controls */}
          {expandedEffect === i && (
            <div className="border-t border-[#2e2e3a] p-2 space-y-2">
              {colorPickerOpen === i && (
                <div className="mb-2">
                  <label className="text-2xs text-[#5a5a70] block mb-1">Glow Color</label>
                  <ColorPicker
                    color={effect.color}
                    onChange={color => updateEffect(i, { color })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <SliderProp
                  label="Blur"
                  value={effect.blur}
                  min={0} max={100} step={1}
                  onChange={v => updateEffect(i, { blur: v })}
                />
                <SliderProp
                  label="Opacity"
                  value={Math.round(effect.opacity * 100)}
                  min={0} max={100} step={1}
                  suffix="%"
                  onChange={v => updateEffect(i, { opacity: v / 100 })}
                />
                <SliderProp
                  label="Spread"
                  value={effect.spread}
                  min={0} max={100} step={1}
                  onChange={v => updateEffect(i, { spread: v })}
                />
                <SliderProp
                  label="Copies"
                  value={effect.copies}
                  min={1} max={10} step={1}
                  onChange={v => updateEffect(i, { copies: v })}
                />
              </div>

              {/* Shadow-specific */}
              {(effect.type === 'shadow' || effect.type === 'softShadow' || effect.type === 'coloredShadow') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-2xs text-[#5a5a70] block mb-1">Offset X</label>
                    <NumericInput value={effect.offsetX || 0} onChange={v => updateEffect(i, { offsetX: v })} step={1} />
                  </div>
                  <div>
                    <label className="text-2xs text-[#5a5a70] block mb-1">Offset Y</label>
                    <NumericInput value={effect.offsetY || 0} onChange={v => updateEffect(i, { offsetY: v })} step={1} />
                  </div>
                </div>
              )}

              {/* Flicker controls */}
              {(effect.type === 'flickeringNeon' || effect.type === 'pulsingGlow') && (
                <div className="grid grid-cols-2 gap-2">
                  <SliderProp
                    label="Flicker"
                    value={Math.round(effect.flickerAmount * 100)}
                    min={0} max={100} step={1}
                    suffix="%"
                    onChange={v => updateEffect(i, { flickerAmount: v / 100 })}
                  />
                  <SliderProp
                    label="Speed"
                    value={effect.flickerSpeed}
                    min={0.1} max={10} step={0.1}
                    onChange={v => updateEffect(i, { flickerSpeed: v })}
                  />
                </div>
              )}

              {/* Expand to layers button */}
              <button
                className="w-full btn-ghost text-xs py-1 border border-[#2e2e3a] rounded mt-1"
                onClick={() => {
                  expandEffectToLayers(layerId, effect, i);
                  updateEffect(i, { expanded: true });
                }}
                title="Expand this effect into individual layers for full control"
              >
                Expand Effect to Layers
              </button>

              {/* OBS warning */}
              <div className="text-2xs text-[#9090a8] bg-[#1a1a22] p-1.5 rounded border border-[#2e2e3a]">
                ⚡ OBS-compatible: Gaussian blur glow tested with OBS browser source.
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add effect */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Add Effect</label>
        <div className="grid grid-cols-2 gap-1">
          {EFFECT_TYPES.slice(0, 8).map(t => (
            <button
              key={t.id}
              className="btn-ghost text-2xs py-1 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
              onClick={() => addEffect(t.id)}
            >
              <Plus size={9} /> {t.label}
            </button>
          ))}
        </div>
        <select
          className="input w-full text-xs mt-1"
          onChange={e => { if (e.target.value) addEffect(e.target.value); e.target.value = ''; }}
        >
          <option value="">More effects...</option>
          {EFFECT_TYPES.slice(8).map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SliderProp({ label, value, min, max, step, suffix, onChange }) {
  return (
    <div>
      <label className="text-2xs text-[#5a5a70] block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1"
          style={{ accentColor: '#7b68ee' }}
        />
        <span className="text-2xs text-[#9090a8] w-8 text-right">{value}{suffix}</span>
      </div>
    </div>
  );
}

function getEffectDefaults(type) {
  switch (type) {
    case 'softGlow': return { blur: 30, copies: 2, opacity: 0.6 };
    case 'strongGlow': return { blur: 40, copies: 5, opacity: 0.9 };
    case 'neon': return { blur: 20, copies: 4, opacity: 0.85, spread: 5 };
    case 'neonTube': return { blur: 15, copies: 3, opacity: 0.9, spread: 2 };
    case 'innerGlow': return { blur: 10, copies: 2, opacity: 0.7 };
    case 'outerGlow': return { blur: 25, copies: 3, opacity: 0.75 };
    case 'sparkle': return { blur: 20, copies: 4, opacity: 0.8, spread: 8 };
    case 'shadow': return { blur: 15, copies: 1, opacity: 0.8, offsetX: 5, offsetY: 5 };
    case 'softShadow': return { blur: 20, copies: 1, opacity: 0.5, offsetX: 3, offsetY: 6 };
    case 'coloredShadow': return { blur: 18, copies: 2, opacity: 0.7, offsetX: 4, offsetY: 4 };
    case 'longShadow': return { blur: 5, copies: 1, opacity: 0.4, offsetX: 15, offsetY: 15 };
    case 'flickeringNeon': return { blur: 20, copies: 3, opacity: 0.85, flickerAmount: 0.3, flickerSpeed: 2 };
    case 'pulsingGlow': return { blur: 25, copies: 3, opacity: 0.8, flickerAmount: 0.5, flickerSpeed: 1 };
    default: return {};
  }
}
