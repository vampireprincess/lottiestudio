import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ORGANIC_MOTION_TYPES, applyOrganicMotion, seededRng } from '../../engine/organic/organicMotion.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Shuffle, Play } from 'lucide-react';

export function OrganicMotionPanel() {
  const { project, selectedLayerIds, currentFrame, saveHistory } = useEditorStore();
  const [selected, setSelected] = useState(null);
  const [seed, setSeed] = useState(42);
  const [options, setOptions] = useState({
    startFrame: 0, totalFrames: 120, duration: 60, fps: 30,
    amplitude: 12, speed: 1, damping: 0, intensity: 1,
    staggerDelay: 4, overshoot: 0.1, windGust: false,
    flickerRate: 0.15, flapSpeed: 1, asymmetric: false,
    swingAmp: 12, flickerAmount: 0.15,
    startY: 0, endY: -200, wobble: true,
    mode: 'random', direction: 1, phase: 0, bounce: 0.05,
    dropDuration: 20, fallDistance: 200,
  });

  const opt = (k, v) => setOptions(p => ({ ...p, [k]: v }));

  const apply = () => {
    if (!selected || selectedLayerIds.length === 0) return;
    saveHistory(`Organic: ${selected}`);
    const store = useEditorStore.getState();
    const kfs = applyOrganicMotion(selected, selectedLayerIds, project, {
      ...options,
      seed,
      fps: project.fps,
      startFrame: options.startFrame ?? currentFrame,
    });
    kfs.forEach(kf => store.setKeyframe(kf.layerId, kf.property, kf.frame, kf.value, kf.easing));
  };

  const motionDef = ORGANIC_MOTION_TYPES.find(m => m.id === selected);

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Organic Motion</span>
      </div>

      {selectedLayerIds.length === 0 && (
        <div className="p-3 text-xs text-[#5a5a70] text-center border-b border-[#2e2e3a]">
          Select one or more layers to apply organic motion
        </div>
      )}

      {/* Motion type grid */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <div className="grid grid-cols-2 gap-1.5">
          {ORGANIC_MOTION_TYPES.map(m => (
            <button key={m.id}
              className={`flex items-center gap-2 p-2 rounded border text-left transition-all ${selected === m.id ? 'border-[#7b68ee] bg-[#7b68ee]/15' : 'border-[#2e2e3a] hover:border-[#5a5a70]'}`}
              onClick={() => setSelected(m.id)}
            >
              <span className="text-lg flex-shrink-0">{m.icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-[#f0f0f5] truncate">{m.label}</div>
                <div className="text-2xs text-[#5a5a70] truncate">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Options */}
        {selected && (
          <div className="border border-[#2e2e3a] rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-[#9090a8]">{motionDef?.icon} {motionDef?.label} Options</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Start Frame</label>
                <NumericInput value={options.startFrame} onChange={v => opt('startFrame', v)} min={0} step={1} />
              </div>
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Duration (fr)</label>
                <NumericInput value={options.duration} onChange={v => opt('duration', Math.max(1,v))} min={1} step={1} />
              </div>
            </div>

            {/* Amplitude */}
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Amplitude: {options.amplitude}</label>
              <input type="range" min={1} max={60} step={0.5} value={options.amplitude}
                onChange={e => opt('amplitude', parseFloat(e.target.value))}
                className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
            </div>

            {/* Speed (for swing types) */}
            {['hangingSwing','pendulum','windReactive'].includes(selected) && (
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Speed: {options.speed}×</label>
                <input type="range" min={0.1} max={5} step={0.1} value={options.speed}
                  onChange={e => opt('speed', parseFloat(e.target.value))}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>
            )}

            {/* Stagger delay */}
            {['growingVine','trimPathGrow'].includes(selected) && (
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Stagger Delay (fr): {options.staggerDelay}</label>
                <input type="range" min={0} max={30} step={1} value={options.staggerDelay}
                  onChange={e => opt('staggerDelay', parseInt(e.target.value))}
                  className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              </div>
            )}

            {/* Spider-specific */}
            {selected === 'spiderClimb' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Start Y offset</label>
                  <NumericInput value={options.startY} onChange={v => opt('startY', v)} step={10}/>
                </div>
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">End Y offset</label>
                  <NumericInput value={options.endY} onChange={v => opt('endY', v)} step={10}/>
                </div>
              </div>
            )}

            {/* Drip-specific */}
            {selected === 'drip' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Drop dur. (fr)</label>
                  <NumericInput value={options.dropDuration} onChange={v => opt('dropDuration', v)} min={5} step={1}/>
                </div>
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Fall dist.</label>
                  <NumericInput value={options.fallDistance} onChange={v => opt('fallDistance', v)} step={10}/>
                </div>
              </div>
            )}

            {/* Fairy lights mode */}
            {selected === 'fairyLights' && (
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Mode</label>
                <select value={options.mode} onChange={e => opt('mode', e.target.value)} className="input w-full text-xs">
                  <option value="random">Random Flicker</option>
                  <option value="chase">Chase</option>
                  <option value="alternate">Alternate</option>
                </select>
              </div>
            )}

            {/* Wind gust */}
            {['windReactive','hangingLeaves'].includes(selected) && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={options.windGust}
                  onChange={e => opt('windGust', e.target.checked)} className="accent-[#7b68ee]"/>
                <span className="text-xs text-[#9090a8]">Random Wind Gusts</span>
              </label>
            )}

            {/* Seed */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-2xs text-[#5a5a70]">Seed</label>
                <span
                  className="text-2xs text-[#5a5a70] cursor-help"
                  title="Seed controls the random pattern of the motion. The same Seed always produces the same movement. Change it to get a different variation."
                >
                  ⓘ
                </span>
              </div>
              <p className="text-2xs text-[#3a3a50] leading-tight">
                Same Seed = same motion every time. Different Seed = different variation.
              </p>
              <div className="flex items-center gap-2">
                <NumericInput value={seed} onChange={setSeed} min={0} step={1} className="flex-1"/>
                <button
                  className="flex items-center gap-1 px-2 py-1 text-2xs rounded border border-[#2e2e3a] text-[#9090a8] hover:text-[#f0f0f5] hover:border-[#7b68ee] transition-colors"
                  onClick={() => setSeed(Math.round(Math.random()*99999))}
                  title="Generate a random new Seed for a different motion variation"
                >
                  <Shuffle size={10}/> Randomize
                </button>
              </div>
            </div>

            {/* Total frames for loops */}
            {['hangingSwing','pendulum','windReactive','fairyLights','cobwebMovement','hangingLeaves','swingingDecoration','lantern','butterflyFlap'].includes(selected) && (
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Loop Duration (fr)</label>
                <NumericInput value={options.totalFrames} onChange={v => opt('totalFrames', Math.max(10,v))} min={10} step={5}/>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply */}
      <div className="p-3 border-t border-[#2e2e3a] flex-shrink-0">
        <button
          className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white transition-all ${selected && selectedLayerIds.length > 0 ? '' : 'opacity-40 cursor-not-allowed'}`}
          style={{ background: selected && selectedLayerIds.length > 0 ? 'linear-gradient(135deg, #7b68ee, #5c4de0)' : '#2e2e3a' }}
          onClick={apply}
          disabled={!selected || selectedLayerIds.length === 0}
        >
          <Play size={13}/> Apply to {selectedLayerIds.length} Layer{selectedLayerIds.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
