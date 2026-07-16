import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { STAGGER_ORDERS, applyStagger } from '../../engine/animation/stagger.js';
import { getLayerBBox } from '../../engine/svg/alignment.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Shuffle } from 'lucide-react';

export function StaggerPanel({ onClose }) {
  const { project, selectedLayerIds, saveHistory } = useEditorStore();
  const [order, setOrder] = useState('layerOrder');
  const [delay, setDelay] = useState(6);
  const [overlap, setOverlap] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [randomVariation, setRandomVariation] = useState(0);
  const [seed, setSeed] = useState(42);
  const [preserveDuration, setPreserveDuration] = useState(true);
  const [noKfWarning, setNoKfWarning] = useState(false);
  const [property, setProperty] = useState('opacity');

  const previewCount = selectedLayerIds.length;

  const applyStaggerEffect = () => {
    if (selectedLayerIds.length < 2) return;
    saveHistory('Apply Stagger');

    const store = useEditorStore.getState();
    const layers = selectedLayerIds.map(id => {
      const layer = project.layers[id];
      return { ...layer, bbox: getLayerBBox(layer) };
    }).filter(Boolean);

    // Get existing keyframes for selected property
    const keyframeGroups = layers.map(layer => {
      const kfs = project.keyframes.filter(kf =>
        kf.layerId === layer.id && kf.property === property
      );
      return { layerId: layer.id, keyframes: kfs };
    });

    if (keyframeGroups.every(g => g.keyframes.length === 0)) {
      setNoKfWarning(true);
      setTimeout(() => setNoKfWarning(false), 3000);
      return;
    }

    const result = applyStagger(layers, keyframeGroups, {
      order, delay, overlap, reverse, randomVariation, seed, preserveDuration,
    });

    // Apply shifted keyframes
    result.forEach(({ layerId, keyframes, delay: kfDelay }) => {
      keyframes.forEach(kf => {
        store.setKeyframe(kf.layerId, kf.property, kf.frame, kf.value, kf.easing);
      });
    });

    if (onClose) onClose();
  };

  return (
    <div className="space-y-3 p-3">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Stagger offsets existing keyframes across selected layers. Add keyframes first, then apply stagger.
      </div>

      {selectedLayerIds.length < 2 && (
        <div className="text-xs text-[#f0a030] text-center">Select 2+ layers to use stagger</div>
      )}
      {noKfWarning && (
        <div className="text-xs text-[#f04060] bg-[#f04060]/10 rounded p-2 border border-[#f04060]/30">
          ⚠️ No keyframes found for "{property}" on selected layers. Add keyframes first, then apply stagger.
        </div>
      )}

      {/* Property to stagger */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Property</label>
        <select value={property} onChange={e => setProperty(e.target.value)} className="input w-full text-xs">
          <option value="opacity">Opacity</option>
          <option value="transform.position">Position</option>
          <option value="transform.scale">Scale</option>
          <option value="transform.rotation">Rotation</option>
          <option value="trimEnd">Trim End</option>
        </select>
      </div>

      {/* Order */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Order</label>
        <div className="grid grid-cols-2 gap-1">
          {STAGGER_ORDERS.map(o => (
            <button key={o.id}
              className={`py-1 px-2 text-2xs rounded border transition-colors ${order === o.id ? 'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10' : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={() => setOrder(o.id)}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {/* Delay */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Delay (fr)</label>
          <NumericInput value={delay} onChange={setDelay} min={1} max={60} step={1} />
        </div>
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Overlap (fr)</label>
          <NumericInput value={overlap} onChange={setOverlap} min={-30} max={30} step={1} />
        </div>
      </div>

      {/* Random variation */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Random Variation: ±{randomVariation}fr</label>
        <input type="range" min={0} max={20} step={1}
          value={randomVariation}
          onChange={e => setRandomVariation(parseInt(e.target.value))}
          className="w-full h-1" style={{ accentColor: '#7b68ee' }}
        />
      </div>

      {/* Seed */}
      {(order === 'random' || randomVariation > 0) && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-2xs text-[#5a5a70] block mb-1">Seed</label>
            <NumericInput value={seed} onChange={setSeed} min={0} step={1} />
          </div>
          <button className="btn-icon w-8 h-8 mt-4" onClick={() => setSeed(Math.round(Math.random() * 99999))} title="New random seed">
            <Shuffle size={12} />
          </button>
        </div>
      )}

      {/* Options */}
      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)} className="accent-[#7b68ee]" />
          <span className="text-xs text-[#9090a8]">Reverse</span>
        </label>
      </div>

      {/* Preserve duration */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={preserveDuration} onChange={e => setPreserveDuration(e.target.checked)} className="accent-[#7b68ee]" />
        <span className="text-xs text-[#9090a8]">Preserve Duration</span>
      </label>

      {/* Preview */}
      <div className="p-2 rounded bg-[#1a1a22] border border-[#2e2e3a]">
        <p className="text-2xs text-[#5a5a70] mb-1">Preview ({selectedLayerIds.length} layers)</p>
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(8, selectedLayerIds.length) }, (_, i) => {
            const d = i * delay;
            return (
              <div key={i} className="flex-1 h-3 rounded-sm" style={{
                background: `rgba(123,104,238,${0.3 + i * 0.09})`,
                marginLeft: d * 0.5,
              }} />
            );
          })}
        </div>
      </div>

      <button
        className={`w-full py-2 rounded text-sm font-semibold text-white ${selectedLayerIds.length >= 2 ? '' : 'opacity-40 cursor-not-allowed'}`}
        style={{ background: selectedLayerIds.length >= 2 ? 'linear-gradient(135deg, #7b68ee, #5c4de0)' : '#2e2e3a' }}
        onClick={applyStaggerEffect}
        disabled={selectedLayerIds.length < 2}
      >
        Apply Stagger
      </button>
    </div>
  );
}
