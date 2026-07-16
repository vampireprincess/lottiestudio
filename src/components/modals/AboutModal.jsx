import React from 'react';
import { ModalBackdrop } from './ActiveModal.jsx';
import { Film } from 'lucide-react';

export function AboutModal({ onClose }) {
  return (
    <ModalBackdrop onClose={onClose} width="max-w-md">
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:'linear-gradient(135deg,#7b68ee,#00c8ff)' }}>
          <Film size={28} color="white"/>
        </div>
        <h2 className="text-xl font-bold text-[#f0f0f5] mb-1">Lottie Studio</h2>
        <p className="text-xs text-[#5a5a70] mb-4">v1.0 — All Phases Complete</p>
        <p className="text-sm text-[#9090a8] leading-relaxed mb-4">
          Professional local SVG and Lottie animation editor.<br/>
          Built with React + Vite + Tailwind CSS.<br/>
          All data stored locally — no cloud, no account.
        </p>
        <div className="text-left text-xs text-[#5a5a70] space-y-0.5 mb-4 grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            '✓ Canvas + zoom/pan/rulers', '✓ SVG import (real parser)',
            '✓ 18 shape types + draw', '✓ Node / Bezier editing',
            '✓ Professional Gradient Editor', '✓ Color Picker (HEX/RGB/HSL/HSV)',
            '✓ OBS-style Glow/Neon', '✓ 21 easing types + Graph Editor',
            '✓ Timeline + keyframes', '✓ Copy/Paste/Reverse keyframes',
            '✓ 38 Animation Presets', '✓ 13 Organic Motion types',
            '✓ Stagger + Loop Maker', '✓ Motion Path editor',
            '✓ Parent-Child system', '✓ Color Randomizer (shades/replace)',
            '✓ Lottie JSON + dotLottie export', '✓ SVG static + animated export',
            '✓ WebM + PNG Sequence render', '✓ Optimization Inspector',
            '✓ Lottie import (editable)', '✓ Asset Library (IndexedDB)',
            '✓ Gradient Swatches (17 built-in)', '✓ Global Colors system',
            '✓ Undo/Redo (100 steps)', '✓ Autosave (30s)',
            '✓ Welcome walkthrough', '✓ Keyboard shortcuts',
          ].map((f,i) => <div key={i}>{f}</div>)}
        </div>
        <button className="btn-primary mt-2 px-6 py-2 w-full" onClick={onClose}>Close</button>
      </div>
    </ModalBackdrop>
  );
}
