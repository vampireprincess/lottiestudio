import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { CANVAS_PRESETS, FPS_OPTIONS } from '../../types/index.js';
import { NumericInput } from '../shared/NumericInput.jsx';

export function ProjectSettings() {
  const { project, updateProjectSettings } = useEditorStore();

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <p className="text-2xs text-[#5a5a70] text-center">Select a layer to edit its properties</p>

      <div className="border-t border-[#2e2e3a] pt-3">
        <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-3">Project Settings</p>

        {/* Canvas size presets */}
        <div className="mb-2">
          <label className="text-2xs text-[#5a5a70] block mb-1">Canvas Preset</label>
          <select
            className="input w-full text-xs"
            onChange={e => {
              const preset = CANVAS_PRESETS.find(p => p.name === e.target.value);
              if (preset) updateProjectSettings({ width: preset.width, height: preset.height });
            }}
          >
            <option value="">Custom...</option>
            {CANVAS_PRESETS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Width/Height */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Width</label>
            <NumericInput
              value={project.width}
              onChange={v => updateProjectSettings({ width: v })}
              min={1} max={8000} step={1}
              suffix="px"
            />
          </div>
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Height</label>
            <NumericInput
              value={project.height}
              onChange={v => updateProjectSettings({ height: v })}
              min={1} max={8000} step={1}
              suffix="px"
            />
          </div>
        </div>

        {/* FPS */}
        <div className="mb-2">
          <label className="text-2xs text-[#5a5a70] block mb-1">Frame Rate</label>
          <div className="flex gap-1 flex-wrap">
            {FPS_OPTIONS.map(fps => (
              <button
                key={fps}
                className={`px-2 py-0.5 text-2xs rounded border transition-colors ${
                  project.fps === fps
                    ? 'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10'
                    : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'
                }`}
                onClick={() => updateProjectSettings({ fps })}
              >
                {fps}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-2">
          <label className="text-2xs text-[#5a5a70] block mb-1">Duration</label>
          <div className="flex items-center gap-2">
            <NumericInput
              value={project.totalFrames}
              onChange={v => updateProjectSettings({ totalFrames: v })}
              min={1} step={1}
              suffix="fr"
              className="flex-1"
            />
            <span className="text-2xs text-[#5a5a70]">
              = {(project.totalFrames / (project.fps || 30)).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Background color */}
        <div className="mb-2">
          <label className="text-2xs text-[#5a5a70] block mb-1">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={project.backgroundColor || '#000000'}
              onChange={e => updateProjectSettings({ backgroundColor: e.target.value })}
              className="w-8 h-6 rounded cursor-pointer border border-[#2e2e3a]"
            />
            <input
              type="text"
              value={project.backgroundColor || '#000000'}
              onChange={e => updateProjectSettings({ backgroundColor: e.target.value })}
              className="input flex-1 text-xs font-mono"
            />
            <label className="flex items-center gap-1 text-2xs text-[#5a5a70] cursor-pointer">
              <input
                type="checkbox"
                checked={project.backgroundAlpha < 1}
                onChange={e => updateProjectSettings({ backgroundAlpha: e.target.checked ? 0 : 1 })}
              />
              Trans.
            </label>
          </div>
        </div>

        {/* Project name */}
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Project Name</label>
          <input
            type="text"
            value={project.name}
            onChange={e => updateProjectSettings({ name: e.target.value })}
            className="input w-full text-xs"
          />
        </div>
      </div>
    </div>
  );
}
