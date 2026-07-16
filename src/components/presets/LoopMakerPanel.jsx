import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { analyzeLoop, makeSeamlessLoop, createPingPongLoop, detectLoopJump } from '../../engine/animation/loopMaker.js';
import { CheckCircle, AlertCircle, Repeat, RefreshCw } from 'lucide-react';

export function LoopMakerPanel({ onClose }) {
  const { project, selectedLayerIds, saveHistory } = useEditorStore();
  const [mode, setMode] = useState('seamless');
  const [cycleOffset, setCycleOffset] = useState(0);

  const relevantKfs = project.keyframes.filter(kf =>
    selectedLayerIds.length === 0 || selectedLayerIds.includes(kf.layerId)
  );

  const analysis = useMemo(() => analyzeLoop(relevantKfs, project.totalFrames), [relevantKfs, project.totalFrames]);
  const jumps = useMemo(() => detectLoopJump(relevantKfs, project.totalFrames), [relevantKfs, project.totalFrames]);

  const applyLoop = () => {
    saveHistory('Make Seamless Loop');
    const store = useEditorStore.getState();

    let newKfs;
    if (mode === 'seamless') {
      newKfs = makeSeamlessLoop(relevantKfs, project.totalFrames);
    } else {
      newKfs = createPingPongLoop(relevantKfs, project.totalFrames);
    }

    // Apply cycle offset: shift all keyframes by cycleOffset frames
    if (cycleOffset !== 0) {
      newKfs = newKfs.map(kf => ({
        ...kf,
        frame: ((kf.frame + cycleOffset) % project.totalFrames + project.totalFrames) % project.totalFrames,
      }));
    }

    // Replace keyframes
    store.loadProject({
      ...project,
      keyframes: [
        ...project.keyframes.filter(kf => !relevantKfs.find(r => r.id === kf.id)),
        ...newKfs,
      ],
    });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Loop Maker ensures your animation loops seamlessly by matching start and end keyframe values.
      </div>

      {/* Mode */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Loop Mode</label>
        <div className="flex gap-1">
          {[
            { id: 'seamless', label: 'Seamless Loop', desc: 'Copy first values to last frame' },
            { id: 'pingpong', label: 'Ping-Pong', desc: 'Mirror animation in second half' },
          ].map(m => (
            <button key={m.id}
              className={`flex-1 p-2 rounded border text-left transition-colors ${mode === m.id ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-[#2e2e3a] hover:border-[#5a5a70]'}`}
              onClick={() => setMode(m.id)}
            >
              <div className="text-xs text-[#f0f0f5]">{m.label}</div>
              <div className="text-2xs text-[#5a5a70]">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis */}
      <div className="space-y-1">
        <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider">Loop Analysis</p>

        {analysis.ok.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-xs text-[#30d060]">
            <CheckCircle size={11} className="flex-shrink-0" />
            "{item.propName}" — seamless
          </div>
        ))}

        {analysis.issues.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-xs text-[#f0a030]">
            <AlertCircle size={11} className="flex-shrink-0" />
            {item.message}
          </div>
        ))}

        {relevantKfs.length === 0 && (
          <div className="text-xs text-[#5a5a70] text-center py-2">No keyframes to analyze</div>
        )}
      </div>

      {/* Visible jumps */}
      {jumps.length > 0 && (
        <div className="p-2 rounded bg-[#f04060]/10 border border-[#f04060]/30">
          <p className="text-xs text-[#f04060] font-semibold mb-1">Visible Jumps Detected:</p>
          {jumps.map((j, i) => (
            <div key={i} className="text-2xs text-[#f04060]">• "{j.property}" has mismatched start/end</div>
          ))}
          <p className="text-2xs text-[#9090a8] mt-1">Loop Maker will fix these automatically.</p>
        </div>
      )}

      {analysis.isSeamless && jumps.length === 0 && (
        <div className="flex items-center gap-2 p-2 rounded bg-[#30d060]/10 border border-[#30d060]/30">
          <CheckCircle size={13} className="text-[#30d060]" />
          <span className="text-xs text-[#30d060]">Animation is already seamless!</span>
        </div>
      )}

      {/* Cycle Offset */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">
          Cycle Offset: <span className="text-[#9090a8]">{cycleOffset} frames</span>
        </label>
        <input type="range" min={-(project.totalFrames - 1)} max={project.totalFrames - 1} step={1}
          value={cycleOffset} onChange={e => setCycleOffset(parseInt(e.target.value))}
          className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
        <p className="text-2xs text-[#5a5a70] mt-0.5">Shifts all keyframes by N frames after loop creation</p>
      </div>

      <button
        className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #7b68ee, #5c4de0)' }}
        onClick={applyLoop}
      >
        <RefreshCw size={13} /> Apply {mode === 'seamless' ? 'Seamless Loop' : 'Ping-Pong'}
      </button>
    </div>
  );
}
