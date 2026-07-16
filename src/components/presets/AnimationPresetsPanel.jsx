import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ENTRANCE_PRESETS, IDLE_PRESETS, EXIT_PRESETS, applyAnimationPreset } from '../../engine/animation/animationPresets.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { EasingPresetGrid } from '../easing/GraphEditor.jsx';
import { Zap, Play, Box } from 'lucide-react';
import { getLayerBBox, getCombinedBBox } from '../../engine/svg/alignment.js';

// ─── Bounding Box Region ──────────────────────────────────────────────────────
function BoundingBoxRegion({ project, onApply }) {
  const [region, setRegion] = useState({ x: 100, y: 100, w: 400, h: 300 });
  const [mode, setMode] = useState('center'); // center | touch | full

  const upd = (k,v) => setRegion(p => ({ ...p, [k]: v }));

  const findLayersInRegion = () => {
    const { x, y, w, h } = region;
    const found = [];
    Object.values(project.layers).forEach(layer => {
      const bbox = getLayerBBox(layer);
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;

      if (mode === 'center') {
        if (cx >= x && cx <= x+w && cy >= y && cy <= y+h) found.push(layer.id);
      } else if (mode === 'touch') {
        const overlaps = !(bbox.x > x+w || bbox.x+bbox.width < x || bbox.y > y+h || bbox.y+bbox.height < y);
        if (overlaps) found.push(layer.id);
      } else {
        if (bbox.x >= x && bbox.y >= y && bbox.x+bbox.width <= x+w && bbox.y+bbox.height <= y+h) found.push(layer.id);
      }
    });
    return found;
  };

  const layersFound = findLayersInRegion();

  return (
    <div className="border border-[#2e2e3a] rounded-lg p-2 space-y-2 bg-[#1a1a22]">
      <p className="text-2xs font-semibold text-[#9090a8] uppercase tracking-wider flex items-center gap-1">
        <Box size={10}/> Bounding Box Region
      </p>
      <p className="text-2xs text-[#5a5a70]">Define a region and apply the preset only to layers within it.</p>

      <div className="grid grid-cols-4 gap-1">
        {[{k:'x',l:'X'},{k:'y',l:'Y'},{k:'w',l:'W'},{k:'h',l:'H'}].map(({k,l}) => (
          <div key={k}>
            <label className="text-2xs text-[#5a5a70] block">{l}</label>
            <NumericInput value={region[k]} onChange={v => upd(k,v)} min={0} step={10}/>
          </div>
        ))}
      </div>

      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Include layers where</label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="input w-full text-xs">
          <option value="center">Center is inside region</option>
          <option value="touch">Touches region</option>
          <option value="full">Fully inside region</option>
        </select>
      </div>

      <div className={`text-2xs p-1.5 rounded ${layersFound.length > 0 ? 'text-[#30d060] bg-[#30d060]/8' : 'text-[#5a5a70] bg-[#22222a]'}`}>
        {layersFound.length > 0 ? `✅ ${layersFound.length} layer(s) found` : 'No layers in this region'}
      </div>

      {layersFound.length > 0 && (
        <button
          className="w-full btn-ghost text-2xs py-1 border border-[#7b68ee]/40 rounded text-[#a08fff]"
          onClick={() => onApply(layersFound)}
        >
          Apply preset to these {layersFound.length} layers
        </button>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function AnimationPresetsPanel() {
  const { selectedLayerIds, project, currentFrame, saveHistory } = useEditorStore();
  const [category, setCategory] = useState('entrance');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showBB, setShowBB] = useState(false);
  const [options, setOptions] = useState({
    startFrame: 0,
    duration: 30,
    delay: 0,
    intensity: 1.0,
    direction: 1,
    loop: false,
    pingPong: false,
    preserveFinalState: true,
    easing: { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] },
  });
  const [showEasingPicker, setShowEasingPicker] = useState(false);

  const categories = {
    entrance: ENTRANCE_PRESETS,
    idle: IDLE_PRESETS,
    exit: EXIT_PRESETS,
  };

  const opt = (k, v) => setOptions(p => ({ ...p, [k]: v }));

  const doApply = (layerIds) => {
    if (!selectedPreset || layerIds.length === 0) return;
    saveHistory(`Apply Preset: ${selectedPreset}`);

    const store = useEditorStore.getState();
    layerIds.forEach((layerId, idx) => {
      const layer = project.layers[layerId];
      if (!layer) return;
      const opts = {
        ...options,
        startFrame: (options.startFrame ?? currentFrame) + (options.delay || 0) * idx,
        canvasWidth: project.width,
        canvasHeight: project.height,
      };
      const newKfs = applyAnimationPreset(selectedPreset, layerId, layer, opts);
      newKfs.forEach(kf => store.setKeyframe(kf.layerId, kf.property, kf.frame, kf.value, kf.easing));
    });
  };

  const applyPreset = () => doApply(selectedLayerIds);

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Animation Presets</span>
        <div className="flex items-center gap-1">
          <button
            className={`btn-icon w-6 h-6 ${showBB ? 'active' : ''}`}
            onClick={() => setShowBB(p => !p)}
            title="Bounding Box Region"
          >
            <Box size={12}/>
          </button>
          <Zap size={13} className="text-[#7b68ee]"/>
        </div>
      </div>

      {selectedLayerIds.length === 0 && !showBB && (
        <div className="p-3 text-xs text-[#5a5a70] text-center border-b border-[#2e2e3a]">
          Select a layer to apply a preset
        </div>
      )}

      {/* Category tabs */}
      <div className="flex border-b border-[#2e2e3a] flex-shrink-0">
        {Object.keys(categories).map(cat => (
          <button key={cat}
            className={`flex-1 py-2 text-xs capitalize transition-colors ${category === cat ? 'text-[#a08fff] border-b-2 border-[#7b68ee]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preset grid */}
        <div className="p-2 grid grid-cols-2 gap-1.5">
          {categories[category].map(preset => (
            <button key={preset.id}
              className={`flex items-center gap-2 px-2 py-2 rounded border text-left transition-all ${selectedPreset === preset.id ? 'border-[#7b68ee] bg-[#7b68ee]/15 text-[#a08fff]' : 'border-[#2e2e3a] hover:border-[#5a5a70] text-[#9090a8] hover:text-[#f0f0f5]'}`}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <span className="text-base">{preset.icon}</span>
              <span className="text-xs leading-tight">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="p-3 border-t border-[#2e2e3a] space-y-2">
          <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider">Options</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Start Frame</label>
              <NumericInput value={options.startFrame} onChange={v => opt('startFrame', v)} min={0} step={1}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Duration (fr)</label>
              <NumericInput value={options.duration} onChange={v => opt('duration', Math.max(1,v))} min={1} step={1}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Delay per layer</label>
              <NumericInput value={options.delay} onChange={v => opt('delay', Math.max(0,v))} min={0} step={1}
                decimals={0}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Intensity</label>
              <NumericInput value={parseFloat(options.intensity.toFixed(2))} onChange={v => opt('intensity', v)}
                min={0.1} max={5} step={0.05} decimals={2}/>
            </div>
          </div>

          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Intensity: {options.intensity.toFixed(2)}</label>
            <input type="range" min={0.1} max={3} step={0.05}
              value={options.intensity} onChange={e => opt('intensity', parseFloat(e.target.value))}
              className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
          </div>

          <div className="flex gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={options.direction > 0}
                onChange={e => opt('direction', e.target.checked ? 1 : -1)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Forward</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={options.loop}
                onChange={e => opt('loop', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Loop</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={options.pingPong}
                onChange={e => opt('pingPong', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Ping-Pong</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={options.preserveFinalState}
                onChange={e => opt('preserveFinalState', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Preserve Final State</span>
            </label>
          </div>

          {/* Easing */}
          <div>
            <button
              className="w-full flex items-center justify-between p-1.5 text-xs border border-[#2e2e3a] rounded hover:border-[#5a5a70]"
              onClick={() => setShowEasingPicker(p => !p)}>
              <span className="text-[#9090a8]">Easing: <span className="text-[#f0f0f5]">{options.easing.type}</span></span>
              <span className="text-2xs text-[#5a5a70]">{showEasingPicker ? '▲' : '▼'}</span>
            </button>
            {showEasingPicker && (
              <div className="mt-1 p-2 border border-[#2e2e3a] rounded bg-[#1a1a22]">
                <EasingPresetGrid selectedEasing={options.easing}
                  onSelect={ez => { opt('easing', ez); setShowEasingPicker(false); }}/>
              </div>
            )}
          </div>

          {/* Bounding Box Region */}
          {showBB && (
            <BoundingBoxRegion project={project} onApply={layerIds => {
              if (selectedPreset) doApply(layerIds);
              else alert('Select a preset first, then use the Bounding Box region to apply it.');
            }}/>
          )}

          {selectedLayerIds.length > 1 && (
            <div className="text-2xs text-[#f0a030] bg-[#f0a030]/10 rounded p-1.5">
              Will apply to {selectedLayerIds.length} layers{options.delay > 0 ? ` with ${options.delay}fr delay each` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-[#2e2e3a] flex-shrink-0">
        <button
          className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${selectedPreset && selectedLayerIds.length > 0 ? '' : 'opacity-40 cursor-not-allowed'}`}
          style={{ background: selectedPreset && selectedLayerIds.length > 0 ? 'linear-gradient(135deg,#7b68ee,#5c4de0)' : '#2e2e3a' }}
          onClick={applyPreset} disabled={!selectedPreset || selectedLayerIds.length === 0}
        >
          <Play size={13}/> Apply "{selectedPreset ? ALL_PRESETS_MAP[selectedPreset] : 'Select a preset'}"
        </button>
      </div>
    </div>
  );
}

const ALL_PRESETS_MAP = {};
[...ENTRANCE_PRESETS, ...IDLE_PRESETS, ...EXIT_PRESETS].forEach(p => { ALL_PRESETS_MAP[p.id] = p.label; });
