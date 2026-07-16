import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { NumericInput } from '../shared/NumericInput.jsx';

const MASK_MODES = [
  { id: 'add',        label: 'Add',        desc: 'Reveal within mask shape' },
  { id: 'subtract',   label: 'Subtract',   desc: 'Hide within mask shape' },
  { id: 'intersect',  label: 'Intersect',  desc: 'Keep only overlap' },
  { id: 'difference', label: 'Difference', desc: 'XOR — toggle overlap' },
];

export function MasksSection({ layerId }) {
  const { project, updateLayer, saveHistory, currentFrame, setKeyframe, autoKey } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const masks = layer.masks || [];
  const [expanded, setExpanded] = useState({});

  const addMask = () => {
    saveHistory('Add Mask');
    const newMask = {
      id: uuidv4(),
      name: `Mask ${masks.length + 1}`,
      mode: 'add',
      inverted: false,
      feather: 0,
      expansion: 0,
      opacity: 1,
      pathData: '',
      animated: false,
    };
    updateLayer(layerId, { masks: [...masks, newMask] });
    setExpanded(p => ({ ...p, [newMask.id]: true }));
  };

  const updateMask = (maskId, updates) => {
    updateLayer(layerId, {
      masks: masks.map(m => m.id === maskId ? { ...m, ...updates } : m),
    });
  };

  const removeMask = (maskId) => {
    saveHistory('Remove Mask');
    updateLayer(layerId, { masks: masks.filter(m => m.id !== maskId) });
  };

  // Create a rectangular mask from bounding box of the layer
  const createRectMask = () => {
    const params = layer.shapeParams || {};
    const x = params.x ?? 0;
    const y = params.y ?? 0;
    const w = params.width ?? 100;
    const h = params.height ?? 100;
    return `M ${x},${y} L ${x+w},${y} L ${x+w},${y+h} L ${x},${y+h} Z`;
  };

  const createCircleMask = () => {
    const params = layer.shapeParams || {};
    const cx = params.cx ?? 50;
    const cy = params.cy ?? 50;
    const r = params.r ?? 50;
    return `M ${cx+r},${cy} A ${r},${r} 0 1,1 ${cx-r},${cy} A ${r},${r} 0 1,1 ${cx+r},${cy} Z`;
  };

  return (
    <div className="p-3 space-y-2">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Masks clip or reveal layer content. Add mode reveals, Subtract hides, Intersect keeps overlap, Difference toggles.
      </div>

      {masks.length === 0 && (
        <div className="text-center py-3 text-xs text-[#5a5a70]">
          No masks. Click + to add one.
        </div>
      )}

      {masks.map(mask => (
        <div key={mask.id} className="rounded border border-[#2e2e3a] overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#22222a]"
            onClick={() => setExpanded(p => ({ ...p, [mask.id]: !p[mask.id] }))}
          >
            {expanded[mask.id] ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
            <span className="text-xs text-[#f0f0f5] flex-1">{mask.name}</span>
            <span className="text-2xs px-1.5 py-0.5 rounded" style={{
              background: mask.mode === 'add' ? 'rgba(48,192,96,0.15)' :
                          mask.mode === 'subtract' ? 'rgba(240,64,96,0.15)' :
                          mask.mode === 'intersect' ? 'rgba(48,160,240,0.15)' : 'rgba(123,104,238,0.15)',
              color: mask.mode === 'add' ? '#30d060' : mask.mode === 'subtract' ? '#f04060' :
                     mask.mode === 'intersect' ? '#30a0f0' : '#a08fff',
            }}>
              {MASK_MODES.find(m=>m.id===mask.mode)?.label || mask.mode}
            </span>
            {mask.inverted && <span className="text-2xs text-[#f0a030]">INV</span>}
            <button className="btn-icon w-5 h-5 text-[#f04060]" onClick={e => { e.stopPropagation(); removeMask(mask.id); }}>
              <Trash2 size={11}/>
            </button>
          </div>

          {/* Controls */}
          {expanded[mask.id] && (
            <div className="border-t border-[#2e2e3a] p-2 space-y-2">
              {/* Name */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Name</label>
                <input type="text" value={mask.name}
                  onChange={e => updateMask(mask.id, { name: e.target.value })}
                  className="input w-full text-xs"/>
              </div>

              {/* Mode */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Mode</label>
                <div className="grid grid-cols-2 gap-1">
                  {MASK_MODES.map(m => (
                    <button key={m.id}
                      className={`py-1 px-2 text-2xs rounded border transition-colors text-left ${mask.mode === m.id ? 'border-[#7b68ee] bg-[#7b68ee]/10 text-[#a08fff]' : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'}`}
                      onClick={() => updateMask(mask.id, { mode: m.id })}
                      title={m.desc}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invert */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={mask.inverted}
                  onChange={e => updateMask(mask.id, { inverted: e.target.checked })}
                  className="accent-[#7b68ee]"/>
                <span className="text-xs text-[#9090a8]">Invert Mask</span>
              </label>

              {/* Feather */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Feather: {mask.feather}px</label>
                <input type="range" min={0} max={80} step={0.5}
                  value={mask.feather}
                  onChange={e => updateMask(mask.id, { feather: parseFloat(e.target.value) })}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>

              {/* Expansion */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Expansion: {mask.expansion}px</label>
                <input type="range" min={-50} max={50} step={0.5}
                  value={mask.expansion}
                  onChange={e => updateMask(mask.id, { expansion: parseFloat(e.target.value) })}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>

              {/* Opacity */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Opacity: {Math.round(mask.opacity * 100)}%</label>
                <input type="range" min={0} max={100} step={1}
                  value={Math.round(mask.opacity * 100)}
                  onChange={e => {
                    const val = parseInt(e.target.value) / 100;
                    updateMask(mask.id, { opacity: val });
                    if (autoKey) setKeyframe(layerId, `mask.${mask.id}.opacity`, currentFrame, val);
                  }}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>

              {/* Animated toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={mask.animated}
                  onChange={e => updateMask(mask.id, { animated: e.target.checked })}
                  className="accent-[#7b68ee]"/>
                <span className="text-xs text-[#9090a8]">Animated Mask Path</span>
              </label>

              {/* Path data */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Mask Path (SVG d)</label>
                <textarea
                  value={mask.pathData}
                  onChange={e => updateMask(mask.id, { pathData: e.target.value })}
                  placeholder="M 0,0 L 100,0 L 100,100 L 0,100 Z"
                  className="input w-full text-xs font-mono h-12 resize-none"
                  style={{ lineHeight: 1.4 }}
                />
                {/* Quick path presets */}
                <div className="flex gap-1 mt-1">
                  <button className="btn-ghost text-2xs px-1.5 py-0.5 border border-[#2e2e3a] rounded"
                    onClick={() => updateMask(mask.id, { pathData: createRectMask() })}>
                    Rect from Layer
                  </button>
                  <button className="btn-ghost text-2xs px-1.5 py-0.5 border border-[#2e2e3a] rounded"
                    onClick={() => updateMask(mask.id, { pathData: createCircleMask() })}>
                    Circle from Layer
                  </button>
                  <button className="btn-ghost text-2xs px-1.5 py-0.5 border border-[#2e2e3a] rounded"
                    onClick={() => {
                      // Use pathData from the layer itself as a mask
                      const src = layer.pathData || '';
                      if (src) updateMask(mask.id, { pathData: src });
                    }}>
                    From Layer Path
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        className="w-full btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
        onClick={addMask}
      >
        <Plus size={11}/> Add Mask
      </button>
    </div>
  );
}
