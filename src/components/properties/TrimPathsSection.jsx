import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { NumericInput } from '../shared/NumericInput.jsx';

export function TrimPathsSection({ layerId }) {
  const { project, updateLayer, currentFrame, setKeyframe, autoKey, saveHistory } = useEditorStore();
  const layer = project.layers[layerId];
  if (!layer) return null;

  const trimStart = layer.trimStart ?? 0;
  const trimEnd = layer.trimEnd ?? 1;
  const trimOffset = layer.trimOffset ?? 0;
  const trimMode = layer.trimMode ?? 'simultaneous';

  const update = (key, val) => {
    updateLayer(layerId, { [key]: val });
    if (autoKey) setKeyframe(layerId, key, currentFrame, val);
  };

  const addTrimKeyframe = (property) => {
    saveHistory(`Keyframe ${property}`);
    const val = property === 'trimStart' ? trimStart : property === 'trimEnd' ? trimEnd : trimOffset;
    setKeyframe(layerId, property, currentFrame, val);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Trim Paths animates the drawing/erasing of stroke paths. Use for "draw-on" reveal effects.
      </div>

      {/* Visual trim preview */}
      <div className="relative h-6 rounded overflow-hidden border border-[#2e2e3a]" style={{ background: '#22222a' }}>
        <div
          className="absolute top-0 h-full rounded"
          style={{
            left: `${trimStart * 100}%`,
            width: `${(trimEnd - trimStart) * 100}%`,
            background: 'linear-gradient(90deg, #7b68ee, #a08fff)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xs text-[#9090a8]">
          {Math.round(trimStart*100)}% → {Math.round(trimEnd*100)}%
        </div>
      </div>

      {/* Trim Start */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[#9090a8]">Trim Start</label>
          <button
            className="text-2xs text-[#7b68ee] hover:text-[#a08fff]"
            onClick={() => addTrimKeyframe('trimStart')}
            title="Add keyframe for Trim Start"
          >
            ◆ Key
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} step={0.5}
            value={Math.round(trimStart * 100)}
            onChange={e => update('trimStart', parseInt(e.target.value) / 100)}
            className="flex-1 h-1" style={{ accentColor: '#7b68ee' }}
          />
          <NumericInput value={Math.round(trimStart*100)} onChange={v => update('trimStart', v/100)} min={0} max={100} step={0.5} suffix="%" className="w-16" />
        </div>
      </div>

      {/* Trim End */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[#9090a8]">Trim End</label>
          <button className="text-2xs text-[#7b68ee] hover:text-[#a08fff]" onClick={() => addTrimKeyframe('trimEnd')} title="Add keyframe for Trim End">
            ◆ Key
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} step={0.5}
            value={Math.round(trimEnd * 100)}
            onChange={e => update('trimEnd', parseInt(e.target.value) / 100)}
            className="flex-1 h-1" style={{ accentColor: '#7b68ee' }}
          />
          <NumericInput value={Math.round(trimEnd*100)} onChange={v => update('trimEnd', v/100)} min={0} max={100} step={0.5} suffix="%" className="w-16" />
        </div>
      </div>

      {/* Trim Offset */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[#9090a8]">Offset</label>
          <button className="text-2xs text-[#7b68ee] hover:text-[#a08fff]" onClick={() => addTrimKeyframe('trimOffset')} title="Add keyframe for Trim Offset">
            ◆ Key
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min={-360} max={360} step={1}
            value={Math.round(trimOffset * 360)}
            onChange={e => update('trimOffset', parseInt(e.target.value) / 360)}
            className="flex-1 h-1" style={{ accentColor: '#7b68ee' }}
          />
          <NumericInput value={Math.round(trimOffset*360)} onChange={v => update('trimOffset', v/360)} min={-360} max={360} step={1} suffix="°" className="w-16" />
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="text-xs text-[#9090a8] block mb-1">Multiple Shapes Mode</label>
        <div className="flex gap-1">
          {['simultaneous', 'individually'].map(mode => (
            <button key={mode}
              className={`flex-1 py-1 text-xs rounded border transition-colors capitalize ${trimMode === mode ? 'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10' : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={() => updateLayer(layerId, { trimMode: mode })}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1.5 uppercase tracking-wider">Quick Presets</label>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'Draw On (0→100)', action: () => {
              setKeyframe(layerId, 'trimEnd', 0, 0);
              setKeyframe(layerId, 'trimEnd', project.totalFrames - 1, 1);
            }},
            { label: 'Erase Out (100→0)', action: () => {
              setKeyframe(layerId, 'trimStart', 0, 0);
              setKeyframe(layerId, 'trimStart', project.totalFrames - 1, 1);
            }},
            { label: 'Wipe (0→100→0)', action: () => {
              const mid = Math.round(project.totalFrames / 2);
              setKeyframe(layerId, 'trimEnd', 0, 0);
              setKeyframe(layerId, 'trimEnd', mid, 1);
              setKeyframe(layerId, 'trimStart', mid, 0);
              setKeyframe(layerId, 'trimStart', project.totalFrames - 1, 1);
            }},
            { label: 'Reset', action: () => updateLayer(layerId, { trimStart: 0, trimEnd: 1, trimOffset: 0 }) },
          ].map(item => (
            <button key={item.label}
              className="btn-ghost text-2xs py-1 border border-[#2e2e3a] rounded"
              onClick={() => { saveHistory(item.label); item.action(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
