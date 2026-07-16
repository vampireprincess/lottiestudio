import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { GraphEditor, EasingPresetGrid } from './GraphEditor.jsx';
import { EASING_LIBRARY } from '../../engine/animation/easingEngine.js';
import { Copy, Clipboard, RotateCcw, Save } from 'lucide-react';

/**
 * Floating easing editor — shown when keyframes are selected in timeline
 */
export function EasingPanel({ onClose }) {
  const { project, selectedKeyframeIds, updateKeyframeEasing, saveHistory } = useEditorStore();
  const [tab, setTab] = useState('presets'); // 'presets' | 'graph'
  const [copied, setCopied] = useState(null);

  const selectedKfs = project.keyframes.filter(kf => selectedKeyframeIds.includes(kf.id));
  const currentEasing = selectedKfs[0]?.easing || { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] };
  const [localEasing, setLocalEasing] = useState(currentEasing);

  const applyEasing = () => {
    if (selectedKeyframeIds.length === 0) return;
    saveHistory('Update Easing');
    updateKeyframeEasing(selectedKeyframeIds, localEasing);
  };

  const reverseEasing = () => {
    if (!localEasing.bezier) return;
    const [x1, y1, x2, y2] = localEasing.bezier;
    // Reverse: flip the curve horizontally
    const reversed = { ...localEasing, type: 'custom', bezier: [1 - x2, 1 - y2, 1 - x1, 1 - y1] };
    setLocalEasing(reversed);
  };

  const mirrorEasing = () => {
    if (!localEasing.bezier) return;
    const [x1, y1, x2, y2] = localEasing.bezier;
    // Mirror: swap in/out handles
    const mirrored = { ...localEasing, type: 'custom', bezier: [x2, y2, x1, y1] };
    setLocalEasing(mirrored);
  };

  const copyEasing = () => {
    setCopied(JSON.stringify(localEasing));
    navigator.clipboard?.writeText(JSON.stringify(localEasing)).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Easing</span>
        <div className="flex items-center gap-1">
          <button title="Copy easing" className="btn-icon w-6 h-6" onClick={copyEasing}><Copy size={11}/></button>
          <button title="Reverse easing" className="btn-icon w-6 h-6 text-xs" onClick={reverseEasing}>⇄</button>
          <button title="Mirror easing (swap in/out)" className="btn-icon w-6 h-6 text-xs" onClick={mirrorEasing}>⇆</button>
          {onClose && <button className="btn-icon w-6 h-6 text-lg leading-none" onClick={onClose}>✕</button>}
        </div>
      </div>

      {selectedKeyframeIds.length === 0 && (
        <div className="p-3 text-xs text-[#5a5a70] text-center">
          Select keyframes in the timeline to edit their easing
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#2e2e3a] flex-shrink-0">
        {[{id:'presets',label:'Presets'},{id:'graph',label:'Graph Editor'}].map(t => (
          <button key={t.id}
            className={`flex-1 py-1.5 text-xs transition-colors ${tab===t.id?'text-[#a08fff] border-b-2 border-[#7b68ee]':'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'presets' && (
          <EasingPresetGrid
            selectedEasing={localEasing}
            onSelect={ez => { setLocalEasing(ez); }}
          />
        )}
        {tab === 'graph' && (
          <GraphEditor
            easing={localEasing}
            onChange={setLocalEasing}
          />
        )}

        {/* Current easing name */}
        <div className="flex items-center gap-2 p-2 rounded bg-[#1a1a22] border border-[#2e2e3a]">
          <div className="flex-1 text-xs text-[#f0f0f5]">
            {EASING_LIBRARY[localEasing.type]?.label || 'Custom'}
          </div>
          {localEasing.bezier && (
            <span className="text-2xs text-[#5a5a70] font-mono">
              [{localEasing.bezier.map(v => v.toFixed(2)).join(', ')}]
            </span>
          )}
        </div>

        {/* Apply button */}
        <button
          className={`w-full py-2 rounded text-sm font-medium text-white transition-all ${selectedKeyframeIds.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
          style={{ background: 'linear-gradient(135deg, #7b68ee, #5c4de0)' }}
          onClick={applyEasing}
          disabled={selectedKeyframeIds.length === 0}
        >
          Apply to {selectedKeyframeIds.length || 0} Keyframe{selectedKeyframeIds.length !== 1 ? 's' : ''}
        </button>

        {/* Apply to all on this property */}
        {selectedKfs.length > 0 && (
          <button
            className="w-full py-1.5 text-xs btn-ghost border border-[#2e2e3a] rounded"
            onClick={() => {
              const prop = selectedKfs[0].property;
              const layerId = selectedKfs[0].layerId;
              const allIds = project.keyframes
                .filter(kf => kf.layerId === layerId && kf.property === prop)
                .map(kf => kf.id);
              saveHistory('Apply Easing to All');
              updateKeyframeEasing(allIds, localEasing);
            }}
          >
            Apply to All on "{selectedKfs[0]?.property?.split('.').pop()}"
          </button>
        )}
      </div>
    </div>
  );
}
