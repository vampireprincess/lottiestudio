import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Link2 } from 'lucide-react';

// 9-point anchor preset grid
const ANCHOR_PRESETS = [
  { label: '↖', pos: 'topLeft',     title: 'Top Left' },
  { label: '↑', pos: 'topCenter',   title: 'Top Center' },
  { label: '↗', pos: 'topRight',    title: 'Top Right' },
  { label: '←', pos: 'midLeft',     title: 'Middle Left' },
  { label: '⊙', pos: 'center',      title: 'Center' },
  { label: '→', pos: 'midRight',    title: 'Middle Right' },
  { label: '↙', pos: 'botLeft',     title: 'Bottom Left' },
  { label: '↓', pos: 'botCenter',   title: 'Bottom Center' },
  { label: '↘', pos: 'botRight',    title: 'Bottom Right' },
];

function getAnchorFromPreset(pos, layer) {
  // Get bounding box of the layer
  const p = layer.shapeParams || {};
  const x = p.x ?? 0;
  const y = p.y ?? 0;
  const w = p.width || 100;
  const h = p.height || 100;
  const cx = p.cx ?? (x + w / 2);
  const cy = p.cy ?? (y + h / 2);

  const left   = cx - w / 2;
  const right  = cx + w / 2;
  const top    = cy - h / 2;
  const bottom = cy + h / 2;
  const midX   = cx;
  const midY   = cy;

  const map = {
    topLeft:   { x: left,  y: top    },
    topCenter: { x: midX,  y: top    },
    topRight:  { x: right, y: top    },
    midLeft:   { x: left,  y: midY   },
    center:    { x: midX,  y: midY   },
    midRight:  { x: right, y: midY   },
    botLeft:   { x: left,  y: bottom },
    botCenter: { x: midX,  y: bottom },
    botRight:  { x: right, y: bottom },
  };
  return map[pos] || { x: midX, y: midY };
}

export function TransformSection({ layerId }) {
  const { project, updateLayer, currentFrame, setKeyframe, autoKey } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const t = layer.transform || {};
  const pos = t.position || { x: 0, y: 0 };
  const scale = t.scale || { x: 1, y: 1 };
  const rotation = t.rotation ?? 0;
  const skew = t.skew || { x: 0, y: 0 };
  const anchor = t.anchor || { x: 0, y: 0 };

  const updateTransform = (key, value) => {
    const newTransform = { ...t, [key]: value };
    updateLayer(layerId, { transform: newTransform });
    if (autoKey) {
      setKeyframe(layerId, `transform.${key}`, currentFrame, value);
    }
  };

  const updateOpacity = (val) => {
    updateLayer(layerId, { opacity: val / 100 });
    if (autoKey) setKeyframe(layerId, 'opacity', currentFrame, val / 100);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Position */}
      <PropertyRow label="Position">
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">X</label>
            <NumericInput
              value={Math.round(pos.x * 10) / 10}
              onChange={v => updateTransform('position', { ...pos, x: v })}
              step={1}
            />
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">Y</label>
            <NumericInput
              value={Math.round(pos.y * 10) / 10}
              onChange={v => updateTransform('position', { ...pos, y: v })}
              step={1}
            />
          </div>
        </div>
      </PropertyRow>

      {/* Scale */}
      <PropertyRow label="Scale">
        <div className="flex gap-1 items-center">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">W</label>
            <NumericInput
              value={Math.round(scale.x * 100)}
              onChange={v => updateTransform('scale', { ...scale, x: v / 100 })}
              step={1}
              suffix="%"
            />
          </div>
          <Link2 size={11} className="text-[#5a5a70] mt-4" />
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">H</label>
            <NumericInput
              value={Math.round(scale.y * 100)}
              onChange={v => updateTransform('scale', { ...scale, y: v / 100 })}
              step={1}
              suffix="%"
            />
          </div>
        </div>
      </PropertyRow>

      {/* Rotation */}
      <PropertyRow label="Rotation">
        <NumericInput
          value={Math.round(rotation * 10) / 10}
          onChange={v => updateTransform('rotation', v)}
          step={0.1}
          suffix="°"
          className="w-full"
        />
      </PropertyRow>

      {/* Skew */}
      <PropertyRow label="Skew">
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">X</label>
            <NumericInput
              value={Math.round(skew.x * 10) / 10}
              onChange={v => updateTransform('skew', { ...skew, x: v })}
              step={0.1}
              suffix="°"
            />
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">Y</label>
            <NumericInput
              value={Math.round(skew.y * 10) / 10}
              onChange={v => updateTransform('skew', { ...skew, y: v })}
              step={0.1}
              suffix="°"
            />
          </div>
        </div>
      </PropertyRow>

      {/* Anchor Point — 9-grid preset + numeric */}
      <div className="border-t border-[#2e2e3a] pt-2 mt-1">
        <p className="text-2xs font-semibold text-[#5a5a70] uppercase tracking-wider mb-2">Anchor Point</p>

        {/* 9-point preset grid */}
        <div className="grid grid-cols-3 gap-0.5 mb-2 w-20 mx-auto">
          {ANCHOR_PRESETS.map(preset => {
            const presetAnchor = getAnchorFromPreset(preset.pos, layer);
            const isActive = Math.abs(anchor.x - presetAnchor.x) < 1 && Math.abs(anchor.y - presetAnchor.y) < 1;
            return (
              <button
                key={preset.pos}
                title={`Set anchor to ${preset.title}`}
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-all ${
                  isActive
                    ? 'bg-[#7b68ee] text-white'
                    : 'bg-[#22222a] text-[#5a5a70] hover:bg-[#2e2e3a] hover:text-[#f0f0f5]'
                }`}
                onClick={() => updateTransform('anchor', getAnchorFromPreset(preset.pos, layer))}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Numeric inputs */}
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">X</label>
            <NumericInput
              value={Math.round(anchor.x * 10) / 10}
              onChange={v => updateTransform('anchor', { ...anchor, x: v })}
              step={1}
            />
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">Y</label>
            <NumericInput
              value={Math.round(anchor.y * 10) / 10}
              onChange={v => updateTransform('anchor', { ...anchor, y: v })}
              step={1}
            />
          </div>
        </div>
        <p className="text-2xs text-[#5a5a70] mt-1">Rotation and scale use this point. Grow from anchor by scaling from 0%.</p>
      </div>

      {/* Opacity */}
      <PropertyRow label="Opacity">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={e => updateOpacity(parseInt(e.target.value))}
            className="flex-1 h-1 rounded appearance-none"
            style={{ accentColor: '#7b68ee' }}
          />
          <NumericInput
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={updateOpacity}
            min={0}
            max={100}
            suffix="%"
            className="w-14"
          />
        </div>
      </PropertyRow>

      {/* Blend Mode */}
      <PropertyRow label="Blend">
        <select
          value={layer.blendMode || 'normal'}
          onChange={e => updateLayer(layerId, { blendMode: e.target.value })}
          className="input w-full text-xs"
        >
          {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
            'colorDodge', 'colorBurn', 'hardLight', 'softLight', 'difference',
            'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </PropertyRow>

      {/* Frame range */}
      <div className="border-t border-[#2e2e3a] pt-3">
        <p className="text-2xs font-semibold text-[#5a5a70] uppercase tracking-wider mb-2">Frame Range</p>
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">In</label>
            <NumericInput
              value={layer.inFrame ?? 0}
              onChange={v => updateLayer(layerId, { inFrame: v })}
              min={0}
              step={1}
            />
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-0.5">Out</label>
            <NumericInput
              value={layer.outFrame ?? project.totalFrames}
              onChange={v => updateLayer(layerId, { outFrame: v })}
              max={project.totalFrames}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* Reset transform */}
      <button
        className="w-full btn-ghost text-xs py-1.5 mt-1 border border-[#2e2e3a] rounded"
        onClick={() => updateTransform('position', { x: 0, y: 0 }) || updateTransform('scale', { x: 1, y: 1 }) || updateTransform('rotation', 0)}
      >
        Reset Transform
      </button>
    </div>
  );
}

export function PropertyRow({ label, children }) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <label className="text-xs text-[#9090a8] w-16 flex-shrink-0 mt-1.5">{label}</label>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
