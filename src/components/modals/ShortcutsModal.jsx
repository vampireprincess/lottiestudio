import React from 'react';
import { ModalBackdrop } from './ActiveModal.jsx';

const SHORTCUTS = [
  { category: 'Tools', items: [
    { key: 'V', action: 'Select Tool' },
    { key: 'A', action: 'Edit Shape Points' },
    { key: 'P', action: 'Pen Tool' },
    { key: 'N', action: 'Pencil Tool' },
    { key: 'R', action: 'Rectangle Tool' },
    { key: 'O', action: 'Ellipse Tool' },
    { key: 'L', action: 'Line Tool' },
    { key: 'Z', action: 'Zoom Tool' },
    { key: 'H', action: 'Pan Tool' },
  ]},
  { category: 'Edit', items: [
    { key: 'Ctrl+Z', action: 'Undo' },
    { key: 'Ctrl+Y / Ctrl+Shift+Z', action: 'Redo' },
    { key: 'Ctrl+D', action: 'Duplicate' },
    { key: 'Ctrl+G', action: 'Group' },
    { key: 'Ctrl+A', action: 'Select All' },
    { key: 'Delete / Backspace', action: 'Delete Selected' },
    { key: 'Escape', action: 'Deselect All / Close Modal' },
  ]},
  { category: 'View', items: [
    { key: 'Ctrl + Scroll', action: 'Zoom In/Out' },
    { key: 'Middle Click + Drag', action: 'Pan Canvas' },
    { key: 'Ctrl+0', action: 'Fit to Screen' },
  ]},
  { category: 'Animation', items: [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'ArrowLeft / ArrowRight', action: 'Previous / Next Frame' },
    { key: 'Shift+Arrow', action: 'Jump 10 Frames' },
    { key: 'Home', action: 'Go to Start' },
    { key: 'End', action: 'Go to End' },
    { key: 'K', action: 'Toggle Auto-Key' },
  ]},
];

export function ShortcutsModal({ onClose }) {
  return (
    <ModalBackdrop onClose={onClose} width="max-w-xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f0f5]">Keyboard Shortcuts</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map(section => (
            <div key={section.category}>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">{section.category}</p>
              <div className="space-y-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-[#b0b0c0]">{item.action}</span>
                    <kbd className="text-2xs bg-[#22222a] border border-[#3a3a50] rounded px-1.5 py-0.5 text-[#9090a8] font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary mt-5 w-full py-2" onClick={onClose}>Close</button>
      </div>
    </ModalBackdrop>
  );
}
