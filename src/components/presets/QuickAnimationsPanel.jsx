import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Play } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Quick looping animation presets that respect the layer's anchor point.
 * Each animation is applied as keyframes on the timeline.
 */

const QUICK_ANIMS = [
  { id: 'rotate',    label: '↻ Rotate',      desc: 'Continuous rotation around anchor' },
  { id: 'swing',     label: '⟺ Swing',       desc: 'Pendulum swing using anchor as pivot' },
  { id: 'shake',     label: '〰 Shake',       desc: 'Rapid horizontal shake' },
  { id: 'pulse',     label: '◉ Pulse',        desc: 'Scale pulses out and back' },
  { id: 'bounce',    label: '⤒ Bounce',       desc: 'Vertical bounce with squash' },
  { id: 'float',     label: '〜 Float',        desc: 'Gentle up-down floating' },
  { id: 'wobble',    label: '≈ Wobble',       desc: 'Rotation wobble side to side' },
  { id: 'scaleIn',   label: '⊕ Scale In',    desc: 'Grows from anchor point (0%→100%)' },
  { id: 'scaleOut',  label: '⊖ Scale Out',   desc: 'Shrinks to anchor point (100%→0%)' },
  { id: 'grow',      label: '↑ Grow',        desc: 'Grows from anchor (0%→100%, loop)' },
  { id: 'fadeIn',    label: '◑ Fade In',     desc: 'Opacity 0% to 100%' },
  { id: 'fadeOut',   label: '◐ Fade Out',    desc: 'Opacity 100% to 0%' },
];

function applyQuickAnimation(store, layerId, animId, options) {
  const {
    startFrame = 0,
    duration = 60,
    intensity = 1.0,
    loop = true,
    easing = { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] },
    delay = 0,
    reverse = false,
    alternate = false,
  } = options;

  const { project } = store;
  const layer = project.layers[layerId];
  if (!layer) return;

  const sf = startFrame + delay;
  const ef = sf + duration;

  // Helper to set keyframe
  const kf = (property, frame, value, ez = easing) => ({
    id: uuidv4(),
    layerId,
    property,
    frame,
    value: reverse && typeof value === 'number' ? -value : value,
    easing: ez,
    hold: false,
    selected: false,
  });

  const pos = layer.transform?.position || { x: 0, y: 0 };
  const anchor = layer.transform?.anchor || { x: 0, y: 0 };
  const keyframes = [];

  switch (animId) {
    case 'rotate': {
      const deg = 360 * (reverse ? -1 : 1) * intensity;
      keyframes.push(kf('transform.rotation', sf, 0, { type: 'linear' }));
      keyframes.push(kf('transform.rotation', ef, deg, { type: 'linear' }));
      break;
    }
    case 'swing': {
      const amp = 20 * intensity;
      const halfD = Math.round(duration / 2);
      keyframes.push(kf('transform.rotation', sf, 0));
      keyframes.push(kf('transform.rotation', sf + Math.round(duration / 4), amp));
      keyframes.push(kf('transform.rotation', sf + halfD, 0));
      keyframes.push(kf('transform.rotation', sf + Math.round(duration * 3/4), -amp));
      keyframes.push(kf('transform.rotation', ef, 0));
      break;
    }
    case 'shake': {
      const amp = 8 * intensity;
      const step = Math.round(duration / 8);
      for (let i = 0; i <= 8; i++) {
        const d = i % 2 === 0 ? amp : -amp;
        keyframes.push(kf('transform.position', sf + i * step, { x: pos.x + (i < 8 ? d : 0), y: pos.y }, { type: 'linear' }));
      }
      break;
    }
    case 'pulse': {
      const s = 1 + 0.15 * intensity;
      keyframes.push(kf('transform.scale', sf, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', sf + Math.round(duration / 2), { x: s, y: s }));
      keyframes.push(kf('transform.scale', ef, { x: 1, y: 1 }));
      break;
    }
    case 'bounce': {
      const h = 30 * intensity;
      const halfD = Math.round(duration / 2);
      keyframes.push(kf('transform.position', sf, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', sf + halfD, { x: pos.x, y: pos.y - h }, { type: 'easeOut', bezier: [0, 0, 0.58, 1] }));
      keyframes.push(kf('transform.position', ef, { x: pos.x, y: pos.y }, { type: 'easeIn', bezier: [0.42, 0, 1, 1] }));
      break;
    }
    case 'float': {
      const h = 12 * intensity;
      keyframes.push(kf('transform.position', sf, { x: pos.x, y: pos.y }));
      keyframes.push(kf('transform.position', sf + Math.round(duration / 2), { x: pos.x, y: pos.y - h }));
      keyframes.push(kf('transform.position', ef, { x: pos.x, y: pos.y }));
      break;
    }
    case 'wobble': {
      const amp = 12 * intensity;
      const q = Math.round(duration / 4);
      keyframes.push(kf('transform.rotation', sf, 0));
      keyframes.push(kf('transform.rotation', sf + q, amp));
      keyframes.push(kf('transform.rotation', sf + q*2, 0));
      keyframes.push(kf('transform.rotation', sf + q*3, -amp));
      keyframes.push(kf('transform.rotation', ef, 0));
      break;
    }
    case 'scaleIn': {
      // Grows from anchor point — scale 0→1
      keyframes.push(kf('transform.scale', sf, { x: 0, y: 0 }, { type: 'overshoot', bezier: [0.34, 1.56, 0.64, 1] }));
      keyframes.push(kf('transform.scale', ef, { x: 1, y: 1 }));
      keyframes.push(kf('opacity', sf, 0));
      keyframes.push(kf('opacity', sf + Math.min(10, Math.round(duration * 0.2)), 1));
      break;
    }
    case 'scaleOut': {
      keyframes.push(kf('transform.scale', sf, { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', ef, { x: 0, y: 0 }, { type: 'easeIn', bezier: [0.42, 0, 1, 1] }));
      keyframes.push(kf('opacity', ef - Math.min(10, Math.round(duration * 0.2)), 1));
      keyframes.push(kf('opacity', ef, 0));
      break;
    }
    case 'grow': {
      // Perfect grow-from-anchor loop
      keyframes.push(kf('transform.scale', sf, { x: 0, y: 0 }, { type: 'easeOut', bezier: [0, 0, 0.58, 1] }));
      keyframes.push(kf('transform.scale', sf + Math.round(duration * 0.6), { x: 1, y: 1 }));
      keyframes.push(kf('transform.scale', ef, { x: 1, y: 1 }));
      keyframes.push(kf('opacity', sf, 0));
      keyframes.push(kf('opacity', sf + Math.round(duration * 0.2), 1));
      break;
    }
    case 'fadeIn': {
      keyframes.push(kf('opacity', sf, 0));
      keyframes.push(kf('opacity', ef, 1));
      break;
    }
    case 'fadeOut': {
      keyframes.push(kf('opacity', sf, 1));
      keyframes.push(kf('opacity', ef, 0));
      break;
    }
    default: break;
  }

  if (keyframes.length === 0) return;

  store.saveHistory(`Quick Animation: ${animId}`);

  // Write all keyframes
  keyframes.forEach(kf2 => {
    store.setKeyframe(kf2.layerId, kf2.property, kf2.frame, kf2.value, kf2.easing);
  });
}

export function QuickAnimationsPanel() {
  const { selectedLayerIds, project, currentFrame } = useEditorStore();
  const [selected, setSelected] = useState(null);
  const [opts, setOpts] = useState({
    startFrame: 0,
    duration: 60,
    intensity: 1.0,
    loop: true,
    easing: { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] },
    delay: 0,
    reverse: false,
    alternate: false,
  });

  const o = (k, v) => setOpts(p => ({ ...p, [k]: v }));

  const apply = () => {
    if (!selected || selectedLayerIds.length === 0) return;
    const store = useEditorStore.getState();
    selectedLayerIds.forEach(layerId => {
      applyQuickAnimation(store, layerId, selected, {
        ...opts,
        startFrame: opts.startFrame ?? currentFrame,
      });
    });
  };

  const layer = project.layers[selectedLayerIds[0]];
  const anchor = layer?.transform?.anchor || { x: 0, y: 0 };

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Quick Animations</span>
      </div>

      {selectedLayerIds.length === 0 && (
        <div className="p-3 text-xs text-[#5a5a70] text-center border-b border-[#2e2e3a]">
          Select a layer to apply a quick animation
        </div>
      )}

      {/* Anchor reminder */}
      {layer && (
        <div className="px-3 py-1.5 border-b border-[#2e2e3a] text-2xs text-[#5a5a70] bg-[#1a1a22]">
          Anchor: {Math.round(anchor.x)}, {Math.round(anchor.y)} — set in Transform tab to control grow/rotate origin
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Animation picker */}
        <div className="grid grid-cols-2 gap-1">
          {QUICK_ANIMS.map(anim => (
            <button
              key={anim.id}
              className={`flex flex-col items-start px-2 py-1.5 rounded border text-left transition-all ${
                selected === anim.id
                  ? 'border-[#7b68ee] bg-[#7b68ee]/15 text-[#a08fff]'
                  : 'border-[#2e2e3a] hover:border-[#5a5a70] text-[#9090a8] hover:text-[#f0f0f5]'
              }`}
              onClick={() => setSelected(anim.id)}
              title={anim.desc}
            >
              <span className="text-xs font-medium">{anim.label}</span>
              <span className="text-2xs text-[#5a5a70] leading-tight mt-0.5">{anim.desc}</span>
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="border border-[#2e2e3a] rounded-lg p-2.5 space-y-2">
          <p className="text-2xs font-semibold text-[#9090a8] uppercase tracking-wider">Settings</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Start Frame</label>
              <NumericInput value={opts.startFrame} onChange={v => o('startFrame', v)} min={0} step={1}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Duration (fr)</label>
              <NumericInput value={opts.duration} onChange={v => o('duration', Math.max(1,v))} min={1} step={1}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Delay (fr)</label>
              <NumericInput value={opts.delay} onChange={v => o('delay', Math.max(0,v))} min={0} step={1}/>
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Intensity</label>
              <NumericInput value={parseFloat(opts.intensity.toFixed(2))} onChange={v => o('intensity', v)} min={0.1} max={5} step={0.1} decimals={1}/>
            </div>
          </div>

          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Intensity: {opts.intensity.toFixed(1)}</label>
            <input type="range" min={0.1} max={3} step={0.1} value={opts.intensity}
              onChange={e => o('intensity', parseFloat(e.target.value))}
              className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={opts.loop} onChange={e => o('loop', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Loop</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={opts.reverse} onChange={e => o('reverse', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Reverse</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={opts.alternate} onChange={e => o('alternate', e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Alternate</span>
            </label>
          </div>
        </div>

        {/* Apply */}
        <button
          className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${
            selected && selectedLayerIds.length > 0 ? '' : 'opacity-40 cursor-not-allowed'
          }`}
          style={{ background: selected && selectedLayerIds.length > 0 ? 'linear-gradient(135deg,#7b68ee,#5c4de0)' : '#2e2e3a' }}
          onClick={apply}
          disabled={!selected || selectedLayerIds.length === 0}
        >
          <Play size={13}/> Apply "{selected ? QUICK_ANIMS.find(a=>a.id===selected)?.label : 'Select one'}"
        </button>

        <p className="text-2xs text-[#5a5a70] text-center">
          Animations use the Anchor Point set in Transform tab.
          For "Grow", set anchor where you want growth to start from.
        </p>
      </div>
    </div>
  );
}
