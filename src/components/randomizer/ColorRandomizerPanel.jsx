import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import {
  generateShades, replacePalette, generateColorAnimation,
  shuffleExistingColors, randomizeProperty,
  PALETTE_PRESETS, COLOR_CHANGE_MODES,
} from '../../engine/randomizer/colorRandomizer.js';
import { hslToRgb, colorToHex } from '../../utils/colorUtils.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Shuffle, RefreshCw, Zap, Copy } from 'lucide-react';

export function ColorRandomizerPanel() {
  const { project, selectedLayerIds, currentFrame, saveHistory } = useEditorStore();
  const [tab, setTab] = useState('shades');
  const [seed, setSeed] = useState(42);
  const [previewColors, setPreviewColors] = useState([]);

  // Shades options
  const [shadesOpts, setShadesOpts] = useState({
    hue: 320, hueRange: 20, satMin: 60, satMax: 100,
    briMin: 40, briMax: 95, minColorDiff: 8,
  });

  // Palette replace
  const [selectedPalette, setSelectedPalette] = useState('pink');

  // Color animation
  const [animMode, setAnimMode] = useState('smooth');
  const [animDuration, setAnimDuration] = useState(20);

  // General randomizer
  const [genProperty, setGenProperty] = useState('transform.rotation');
  const [genMin, setGenMin] = useState(-15);
  const [genMax, setGenMax] = useState(15);

  const selectedLayers = selectedLayerIds.map(id => project.layers[id]).filter(Boolean);

  const applyShades = () => {
    if (!selectedLayers.length) return;
    saveHistory('Randomize Colors — Shades');
    const count = selectedLayers.length;
    const colors = generateShades(count, { ...shadesOpts, seed });
    const store = useEditorStore.getState();
    selectedLayers.forEach((layer, i) => {
      const color = colors[i] || colors[colors.length - 1];
      const newFills = (layer.fills || []).map((f, fi) =>
        fi === 0 && f.type === 'solid' ? { ...f, color } : f
      );
      store.updateLayer(layer.id, { fills: newFills });
    });
    setPreviewColors(colors);
  };

  const applyShuffle = () => {
    if (!selectedLayers.length) return;
    saveHistory('Shuffle Colors');
    const updates = shuffleExistingColors(selectedLayers, { seed });
    const store = useEditorStore.getState();
    updates.forEach(({ layerId, fillIndex, newColor }) => {
      const layer = project.layers[layerId];
      if (!layer) return;
      const newFills = (layer.fills || []).map((f, fi) =>
        fi === fillIndex ? { ...f, color: newColor } : f
      );
      store.updateLayer(layerId, { fills: newFills });
    });
  };

  const applyPaletteReplace = () => {
    if (!selectedLayers.length) return;
    saveHistory('Replace Palette');
    const palDef = PALETTE_PRESETS.find(p => p.id === selectedPalette) || PALETTE_PRESETS[0];
    const targetColors = generateShades(Math.max(selectedLayers.length, 5), {
      hue: palDef.hue, hueRange: palDef.hueRange,
      satMin: palDef.satMin ?? 65, satMax: palDef.satMax ?? 100,
      briMin: palDef.briMin ?? 40, briMax: palDef.briMax ?? 90,
      seed,
    });
    const updates = replacePalette(selectedLayers, targetColors, { seed });
    const store = useEditorStore.getState();
    updates.forEach(({ layerId, fillIndex, newColor }) => {
      const layer = project.layers[layerId];
      if (!layer) return;
      const newFills = (layer.fills || []).map((f, fi) =>
        fi === fillIndex ? { ...f, color: newColor } : f
      );
      store.updateLayer(layerId, { fills: newFills });
    });
  };

  const applyColorAnimation = () => {
    if (!selectedLayers.length) return;
    saveHistory(`Color Animation: ${animMode}`);
    const store = useEditorStore.getState();
    const fromColors = selectedLayers.map(l => (l.fills || []).map(f => f.color));
    const palDef = PALETTE_PRESETS.find(p => p.id === selectedPalette) || PALETTE_PRESETS[0];
    const targetColors = generateShades(selectedLayers.length, {
      hue: palDef.hue, hueRange: palDef.hueRange, satMin: palDef.satMin ?? 65, satMax: palDef.satMax ?? 100,
      briMin: palDef.briMin ?? 40, briMax: palDef.briMax ?? 90, seed,
    });
    const toColors = selectedLayers.map(() => targetColors);

    const kfs = generateColorAnimation(selectedLayers, fromColors, toColors, {
      startFrame: currentFrame, duration: animDuration, mode: animMode, fps: project.fps, seed,
    });
    kfs.forEach(kf => store.setKeyframe(kf.layerId, kf.property, kf.frame, kf.value, kf.easing));
  };

  const applyGeneralRandom = () => {
    if (!selectedLayers.length) return;
    saveHistory(`Randomize ${genProperty}`);
    const updates = randomizeProperty(selectedLayers, genProperty, { min: genMin, max: genMax, seed });
    const store = useEditorStore.getState();
    updates.forEach(({ layerId, property, value }) => {
      if (property === 'transform.rotation') {
        const layer = project.layers[layerId];
        store.updateLayer(layerId, { transform: { ...layer?.transform, rotation: value } });
      } else if (property === 'transform.scale') {
        const layer = project.layers[layerId];
        store.updateLayer(layerId, { transform: { ...layer?.transform, scale: value } });
      } else if (property === 'opacity') {
        store.updateLayer(layerId, { opacity: value });
      }
    });
  };

  const newSeed = () => setSeed(Math.round(Math.random() * 99999));

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Color Randomizer</span>
      </div>

      {selectedLayerIds.length === 0 && (
        <div className="p-2 text-2xs text-[#5a5a70] text-center bg-[#f0a030]/8 border-b border-[#2e2e3a]">
          Select layers to randomize
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#2e2e3a] flex-shrink-0 overflow-x-auto">
        {[
          { id:'shades',   label:'Shades' },
          { id:'shuffle',  label:'Shuffle' },
          { id:'palette',  label:'Replace' },
          { id:'animate',  label:'Animate' },
          { id:'general',  label:'General' },
        ].map(t => (
          <button key={t.id}
            className={`flex-1 py-1.5 text-xs whitespace-nowrap transition-colors ${tab===t.id?'text-[#a08fff] border-b-2 border-[#7b68ee]':'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── SHADES ── */}
        {tab === 'shades' && (
          <>
            <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
              Generate controlled color shades within a hue family — e.g. all pink, all purple, etc.
            </div>
            {[
              { label:`Hue: ${shadesOpts.hue}°`, key:'hue', min:0, max:360, step:1 },
              { label:`Hue Range: ±${shadesOpts.hueRange}°`, key:'hueRange', min:0, max:90, step:1 },
              { label:`Sat Min: ${shadesOpts.satMin}%`, key:'satMin', min:0, max:100, step:1 },
              { label:`Sat Max: ${shadesOpts.satMax}%`, key:'satMax', min:0, max:100, step:1 },
              { label:`Bri Min: ${shadesOpts.briMin}%`, key:'briMin', min:0, max:100, step:1 },
              { label:`Bri Max: ${shadesOpts.briMax}%`, key:'briMax', min:0, max:100, step:1 },
              { label:`Min Diff: ${shadesOpts.minColorDiff}%`, key:'minColorDiff', min:0, max:30, step:1 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <label className="text-2xs text-[#5a5a70] block mb-0.5">{label}</label>
                <input type="range" min={min} max={max} step={step}
                  value={shadesOpts[key]}
                  onChange={e => setShadesOpts(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>
            ))}

            {/* Hue quick-picks */}
            <div className="flex flex-wrap gap-1">
              {PALETTE_PRESETS.slice(0,8).map(p => (
                <button key={p.id}
                  className="px-1.5 py-0.5 text-2xs rounded border border-[#2e2e3a] hover:border-[#7b68ee] transition-colors"
                  style={{ color: `hsl(${p.hue},80%,65%)` }}
                  onClick={() => setShadesOpts(prev => ({
                    ...prev, hue: p.hue, hueRange: p.hueRange || 20,
                    satMin: p.satMin||60, satMax: p.satMax||100,
                    briMin: p.briMin||40, briMax: p.briMax||90,
                  }))}
                >{p.label}</button>
              ))}
            </div>

            {/* Preview */}
            {previewColors.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {previewColors.map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded border border-[#3a3a50]" style={{ background: colorToHex(c) }} title={colorToHex(c)}/>
                ))}
              </div>
            )}

            <button className="w-full py-1.5 text-xs btn-ghost border border-[#2e2e3a] rounded" onClick={() => { const c=generateShades(selectedLayers.length||8,{...shadesOpts,seed}); setPreviewColors(c); }}>Preview Colors</button>
            <button
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${selectedLayers.length>0?'':'opacity-40 cursor-not-allowed'}`}
              style={{ background: selectedLayers.length>0?'linear-gradient(135deg,#7b68ee,#5c4de0)':'#2e2e3a' }}
              onClick={applyShades} disabled={!selectedLayers.length}
            ><Zap size={13}/> Apply Shades to {selectedLayers.length} Layers</button>
          </>
        )}

        {/* ── SHUFFLE ── */}
        {tab === 'shuffle' && (
          <>
            <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
              Redistribute existing colors randomly — locked layers keep their colors.
            </div>
            <div className="p-2 rounded border border-[#2e2e3a] bg-[#1a1a22]">
              <p className="text-2xs text-[#9090a8] mb-1.5">Lock layers to exclude from shuffle:</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {selectedLayers.map(layer => (
                  <label key={layer.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!layer.locked}
                      onChange={e => {
                        useEditorStore.getState().updateLayer(layer.id, { locked: !e.target.checked });
                      }}
                      className="accent-[#7b68ee]"/>
                    <span className="text-2xs text-[#b0b0c0] truncate">{layer.name}</span>
                    <span className={`text-2xs ml-auto ${layer.locked ? 'text-[#f0a030]' : 'text-[#5a5a70]'}`}>
                      {layer.locked ? '🔒 Locked' : 'Active'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${selectedLayers.filter(l=>!l.locked).length>1?'':'opacity-40 cursor-not-allowed'}`}
              style={{ background:selectedLayers.filter(l=>!l.locked).length>1?'linear-gradient(135deg,#7b68ee,#5c4de0)':'#2e2e3a' }}
              onClick={() => {
                // Only shuffle unlocked layers
                const unlocked = selectedLayers.filter(l => !l.locked);
                if (unlocked.length < 2) return;
                saveHistory('Shuffle Colors (unlocked)');
                const updates = shuffleExistingColors(unlocked, { seed });
                const store = useEditorStore.getState();
                updates.forEach(({ layerId, fillIndex, newColor }) => {
                  const layer = project.layers[layerId];
                  if (!layer || layer.locked) return;
                  const newFills = (layer.fills || []).map((f, fi) =>
                    fi === fillIndex ? { ...f, color: newColor } : f
                  );
                  store.updateLayer(layerId, { fills: newFills });
                });
              }}
              disabled={selectedLayers.filter(l=>!l.locked).length<2}
            ><Shuffle size={13}/> Shuffle {selectedLayers.filter(l=>!l.locked).length} Unlocked Layers</button>
          </>
        )}

        {/* ── PALETTE REPLACE ── */}
        {tab === 'palette' && (
          <>
            <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
              Replace the color palette while preserving relative brightness relationships.
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE_PRESETS.map(p => (
                <button key={p.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border text-left ${selectedPalette===p.id?'border-[#7b68ee] bg-[#7b68ee]/10':'border-[#2e2e3a] hover:border-[#5a5a70]'}`}
                  onClick={() => setSelectedPalette(p.id)}
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background:`hsl(${p.hue},75%,60%)` }}/>
                  <span className="text-xs text-[#d0d0e0]">{p.label}</span>
                </button>
              ))}
            </div>
            <button
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${selectedLayers.length>0?'':'opacity-40 cursor-not-allowed'}`}
              style={{ background:selectedLayers.length>0?'linear-gradient(135deg,#7b68ee,#5c4de0)':'#2e2e3a' }}
              onClick={applyPaletteReplace} disabled={!selectedLayers.length}
            ><RefreshCw size={13}/> Replace with {PALETTE_PRESETS.find(p=>p.id===selectedPalette)?.label} Palette</button>
          </>
        )}

        {/* ── ANIMATE ── */}
        {tab === 'animate' && (
          <>
            <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
              Generate color change keyframes on the timeline at current frame.
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Target Palette</label>
              <select value={selectedPalette} onChange={e => setSelectedPalette(e.target.value)} className="input w-full text-xs">
                {PALETTE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Animation Mode</label>
              <div className="grid grid-cols-2 gap-1">
                {COLOR_CHANGE_MODES.map(m => (
                  <button key={m.id}
                    className={`py-1 px-2 text-2xs rounded border transition-colors text-left ${animMode===m.id?'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10':'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'}`}
                    onClick={() => setAnimMode(m.id)}
                  >{m.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Duration: {animDuration} frames</label>
              <input type="range" min={1} max={60} step={1} value={animDuration}
                onChange={e => setAnimDuration(parseInt(e.target.value))}
                className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
            </div>
            <button
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${selectedLayers.length>0?'':'opacity-40 cursor-not-allowed'}`}
              style={{ background:selectedLayers.length>0?'linear-gradient(135deg,#7b68ee,#5c4de0)':'#2e2e3a' }}
              onClick={applyColorAnimation} disabled={!selectedLayers.length}
            ><Zap size={13}/> Generate Color Keyframes</button>
          </>
        )}

        {/* ── GENERAL ── */}
        {tab === 'general' && (
          <>
            <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
              Randomize any property across selected layers with min/max range.
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Property</label>
              <select value={genProperty} onChange={e => setGenProperty(e.target.value)} className="input w-full text-xs">
                <option value="transform.rotation">Rotation</option>
                <option value="transform.scale">Scale</option>
                <option value="opacity">Opacity</option>
                <option value="transform.position">Position Offset</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Min</label>
                <NumericInput value={genMin} onChange={setGenMin} step={1}/>
              </div>
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Max</label>
                <NumericInput value={genMax} onChange={setGenMax} step={1}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold text-white ${selectedLayers.length>0?'':'opacity-40 cursor-not-allowed'}`}
                style={{ background:selectedLayers.length>0?'linear-gradient(135deg,#7b68ee,#5c4de0)':'#2e2e3a' }}
                onClick={applyGeneralRandom} disabled={!selectedLayers.length}
                title="Apply directly to layer (no keyframe)"
              ><Shuffle size={11}/> Apply</button>
              <button
                className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold border ${selectedLayers.length>0?'border-[#7b68ee] text-[#a08fff] hover:bg-[#7b68ee]/10':'border-[#2e2e3a] text-[#5a5a70] opacity-40 cursor-not-allowed'}`}
                onClick={() => {
                  if (!selectedLayers.length) return;
                  saveHistory('Bake Randomize to KF');
                  const store = useEditorStore.getState();
                  const updates = randomizeProperty(selectedLayers, genProperty, { min: genMin, max: genMax, seed });
                  updates.forEach(({ layerId, property, value }) => {
                    store.setKeyframe(layerId, property, store.currentFrame, value, { type: 'linear' });
                  });
                }}
                disabled={!selectedLayers.length}
                title="Bake random values as keyframes at current frame"
              >Bake to KF</button>
            </div>
          </>
        )}

        {/* Seed control — always visible */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#2e2e3a]">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-1">Seed: {seed}</label>
            <input type="range" min={0} max={99999} step={1} value={seed}
              onChange={e => setSeed(parseInt(e.target.value))}
              className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
          </div>
          <button className="btn-icon w-7 h-7" onClick={newSeed} title="New random seed"><Shuffle size={12}/></button>
        </div>
      </div>
    </div>
  );
}
