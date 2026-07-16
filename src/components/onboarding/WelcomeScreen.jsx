import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { setPref, getPref } from '../../db/index.js';
import { Film, Zap, Layers, Palette, Download, X } from 'lucide-react';

const STEPS = [
  {
    icon: '🎬',
    title: 'Welcome to Lottie Studio',
    desc: 'A professional local animation editor for SVG and Lottie animations. Works 100% offline — no account needed.',
    tip: null,
  },
  {
    icon: '🖼️',
    title: 'Canvas & Tools',
    desc: 'Use the left toolbar to select tools. Draw shapes directly on the canvas. Zoom with Ctrl+Scroll, pan with middle mouse or the Hand tool.',
    tip: 'Shortcut: V = Select, R = Rectangle, O = Ellipse, P = Pen, Space = Play',
  },
  {
    icon: '⏱️',
    title: 'Timeline & Keyframes',
    desc: 'Animate any property by enabling Auto-Key (K), then changing values at different frames. The timeline shows all keyframes with diamond markers.',
    tip: 'Right-click a keyframe to delete. Drag to move. Select + click Easing to change timing.',
  },
  {
    icon: '✨',
    title: 'Glow, Neon & Effects',
    desc: 'Select a layer → Properties → FX tab. Add glow, neon, shadow effects. These use OBS-compatible Gaussian blur copies for authentic glow.',
    tip: 'OBS users: glow effects are tested and compatible with OBS browser source.',
  },
  {
    icon: '🌿',
    title: 'Animation Presets',
    desc: 'Open the Animation panel (⚡ button). Apply Entrance, Idle or Exit presets to any layer in one click. Organic Motion handles vines, spiders, lanterns and more.',
    tip: 'Stagger, Loop Maker, Motion Path and Parent-Child systems are all in the Animation panel.',
  },
  {
    icon: '📦',
    title: 'Export',
    desc: 'Click Export to save as Lottie JSON, dotLottie, SVG, WebM, or PNG Sequence. The Compatibility Inspector shows what will work in your target renderer.',
    tip: 'For OBS: use Lottie JSON or WebM. For web: use dotLottie or Animated SVG.',
  },
];

export function WelcomeScreen({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleClose = async () => {
    if (dontShow) await setPref('hideWelcome', true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)' }}>
      <div className="relative max-w-lg w-full mx-4 rounded-2xl shadow-popup overflow-hidden" style={{ background:'#1a1a22', border:'1px solid #3a3a50' }}>
        {/* Header gradient */}
        <div className="h-1" style={{ background:'linear-gradient(90deg, #7b68ee, #00c8ff, #7b68ee)' }}/>

        {/* Close */}
        <button className="absolute top-4 right-4 btn-icon w-7 h-7 z-10" onClick={handleClose}><X size={14}/></button>

        <div className="p-8">
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button key={i}
                className={`rounded-full transition-all ${i===step?'w-5 h-2 bg-[#7b68ee]':'w-2 h-2 bg-[#2e2e3a] hover:bg-[#5a5a70]'}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{current.icon}</div>
            <h2 className="text-xl font-bold text-[#f0f0f5] mb-3">{current.title}</h2>
            <p className="text-sm text-[#9090a8] leading-relaxed">{current.desc}</p>
            {current.tip && (
              <div className="mt-4 p-3 rounded-lg bg-[#7b68ee]/10 border border-[#7b68ee]/20 text-xs text-[#a08fff] text-left">
                💡 {current.tip}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setStep(s=>s-1)}>← Back</button>
            )}
            <div className="flex-1"/>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5a5a70]">
              <input type="checkbox" checked={dontShow} onChange={e=>setDontShow(e.target.checked)} className="accent-[#7b68ee]"/>
              Don't show again
            </label>
            {isLast ? (
              <button
                className="px-6 py-2 rounded text-sm font-semibold text-white"
                style={{ background:'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
                onClick={handleClose}
              >
                Start Creating! 🚀
              </button>
            ) : (
              <button
                className="px-6 py-2 rounded text-sm font-semibold text-white"
                style={{ background:'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
                onClick={() => setStep(s=>s+1)}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useWelcomeScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getPref('hideWelcome').then(hide => {
      if (!hide) setTimeout(() => setShow(true), 600);
    });
  }, []);

  return { show, close: () => setShow(false) };
}
