import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { CANVAS_PRESETS, FPS_OPTIONS } from '../../types/index.js';
import { createProject } from '../../engine/project.js';

export function NewProjectModal({ onClose }) {
  const { loadProject } = useEditorStore();
  const [name, setName] = useState('New Project');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(30);
  const [totalFrames, setTotalFrames] = useState(180);
  const [bgColor, setBgColor] = useState('#000000');
  const [transparent, setTransparent] = useState(false);

  const handleCreate = () => {
    const project = createProject({
      name,
      width,
      height,
      fps,
      totalFrames,
      backgroundColor: bgColor,
      backgroundAlpha: transparent ? 0 : 1,
    });
    loadProject(project);
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[#f0f0f5] mb-4">New Project</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#5a5a70] block mb-1">Project Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input w-full" />
          </div>

          <div>
            <label className="text-xs text-[#5a5a70] block mb-1">Canvas Preset</label>
            <select
              className="input w-full text-xs"
              onChange={e => {
                const p = CANVAS_PRESETS.find(p => p.name === e.target.value);
                if (p) { setWidth(p.width); setHeight(p.height); }
              }}
            >
              <option value="">Custom</option>
              {CANVAS_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#5a5a70] block mb-1">Width</label>
              <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value))} className="input w-full" />
            </div>
            <div>
              <label className="text-xs text-[#5a5a70] block mb-1">Height</label>
              <input type="number" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="input w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5a5a70] block mb-1">FPS</label>
            <div className="flex gap-1">
              {FPS_OPTIONS.map(f => (
                <button
                  key={f}
                  className={`px-2 py-1 text-xs rounded border ${fps === f ? 'border-[#7b68ee] text-[#a08fff]' : 'border-[#2e2e3a] text-[#5a5a70]'}`}
                  onClick={() => setFps(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5a5a70] block mb-1">Duration (frames)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={totalFrames} onChange={e => setTotalFrames(parseInt(e.target.value))} className="input flex-1" />
              <span className="text-xs text-[#5a5a70]">= {(totalFrames / fps).toFixed(1)}s</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5a5a70] block mb-1">Background</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-7 rounded cursor-pointer border border-[#2e2e3a]" />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="input flex-1" />
              <label className="flex items-center gap-1 text-xs text-[#5a5a70] cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} className="accent-[#7b68ee]" />
                Transparent
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost px-4 py-2" onClick={onClose}>Cancel</button>
          <button className="btn-primary px-6 py-2" onClick={handleCreate}>Create Project</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
