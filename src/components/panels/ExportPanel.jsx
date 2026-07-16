import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { Download, FileJson, Film, Image, FileCode } from 'lucide-react';
import { exportLottie } from '../../engine/exporters/lottieExporter.js';
import { exportSVG } from '../../engine/exporters/svgExporter.js';

const EXPORT_FORMATS = [
  { id: 'lottie', label: 'Lottie JSON', icon: FileJson, ext: '.json', category: 'vector' },
  { id: 'lottie-optimized', label: 'Optimized Lottie', icon: FileJson, ext: '.json', category: 'vector' },
  { id: 'dotlottie', label: 'dotLottie', icon: FileJson, ext: '.lottie', category: 'vector' },
  { id: 'svg-animated', label: 'Animated SVG', icon: FileCode, ext: '.svg', category: 'vector' },
  { id: 'svg-static', label: 'Static SVG', icon: FileCode, ext: '.svg', category: 'vector' },
  { id: 'webm', label: 'WebM (with alpha)', icon: Film, ext: '.webm', category: 'video' },
  { id: 'gif', label: 'GIF', icon: Image, ext: '.gif', category: 'video' },
  { id: 'png-seq', label: 'PNG Sequence', icon: Image, ext: '.zip', category: 'video' },
];

const EXPORT_PRESETS = [
  { id: 'obs-lottie', label: 'OBS Lottie', format: 'lottie', settings: { fps: 30, loop: true, transparent: true } },
  { id: 'universal-lottie', label: 'Universal Lottie', format: 'lottie-optimized', settings: {} },
  { id: 'small-web', label: 'Small Web Lottie', format: 'lottie-optimized', settings: { minify: true } },
  { id: 'animated-svg', label: 'Animated SVG', format: 'svg-animated', settings: {} },
  { id: 'transparent-webm', label: 'Transparent WebM', format: 'webm', settings: { transparent: true, quality: 90 } },
  { id: 'gif-preview', label: 'GIF Preview', format: 'gif', settings: { fps: 15, quality: 80 } },
];

export function ExportPanel() {
  const { project } = useEditorStore();
  const [format, setFormat] = useState('lottie');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [settings, setSettings] = useState({
    fps: project.fps,
    width: project.width,
    height: project.height,
    quality: 90,
    transparent: false,
    loop: true,
    minify: false,
    pretty: true,
    segment: 'full',
  });

  const updateSettings = (updates) => setSettings(prev => ({ ...prev, ...updates }));

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data, filename, mimeType;

      if (format === 'lottie' || format === 'lottie-optimized') {
        const lottieData = exportLottie(project, {
          ...settings,
          optimize: format === 'lottie-optimized',
        });
        const json = settings.minify
          ? JSON.stringify(lottieData)
          : JSON.stringify(lottieData, null, 2);
        data = new Blob([json], { type: 'application/json' });
        filename = `${project.name}.json`;
        mimeType = 'application/json';

      } else if (format === 'svg-animated' || format === 'svg-static') {
        const svgContent = exportSVG(project, {
          ...settings,
          animated: format === 'svg-animated',
        });
        data = new Blob([svgContent], { type: 'image/svg+xml' });
        filename = `${project.name}.svg`;

      } else {
        // For rendered formats, open the full export modal
        useEditorStore.getState().openModal('export');
        setIsExporting(false);
        return;
      }

      // Download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export error:', err);
      setExportError(err.message);
      setTimeout(() => setExportError(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Export</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Presets */}
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Quick Presets</label>
          <div className="grid grid-cols-2 gap-1">
            {EXPORT_PRESETS.map(preset => (
              <button
                key={preset.id}
                className="btn-ghost text-2xs py-1 border border-[#2e2e3a] rounded"
                onClick={() => {
                  setFormat(preset.format);
                  updateSettings(preset.settings);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format selection */}
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Format</label>
          <div className="space-y-1">
            {EXPORT_FORMATS.map(f => (
              <label
                key={f.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  format === f.id
                    ? 'bg-[#7b68ee]/15 border border-[#7b68ee]/40'
                    : 'hover:bg-[#22222a] border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.id}
                  checked={format === f.id}
                  onChange={() => setFormat(f.id)}
                  className="accent-[#7b68ee]"
                />
                <f.icon size={12} className="text-[#5a5a70]" />
                <span className="text-xs text-[#b0b0c0]">{f.label}</span>
                <span className="text-2xs text-[#5a5a70] ml-auto">{f.ext}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="border-t border-[#2e2e3a] pt-3 space-y-2">
          <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider">Settings</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Width</label>
              <input
                type="number"
                value={settings.width}
                onChange={e => updateSettings({ width: parseInt(e.target.value) })}
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block mb-1">Height</label>
              <input
                type="number"
                value={settings.height}
                onChange={e => updateSettings({ height: parseInt(e.target.value) })}
                className="input w-full text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">FPS</label>
            <input
              type="number"
              value={settings.fps}
              onChange={e => updateSettings({ fps: parseInt(e.target.value) })}
              className="input w-full text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.transparent}
              onChange={e => updateSettings({ transparent: e.target.checked })}
              className="accent-[#7b68ee]"
            />
            <span className="text-xs text-[#b0b0c0]">Transparent Background</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={e => updateSettings({ loop: e.target.checked })}
              className="accent-[#7b68ee]"
            />
            <span className="text-xs text-[#b0b0c0]">Loop</span>
          </label>

          {(format === 'lottie' || format === 'lottie-optimized') && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.minify}
                  onChange={e => updateSettings({ minify: e.target.checked })}
                  className="accent-[#7b68ee]"
                />
                <span className="text-xs text-[#b0b0c0]">Minify JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pretty}
                  onChange={e => updateSettings({ pretty: e.target.checked })}
                  className="accent-[#7b68ee]"
                />
                <span className="text-xs text-[#b0b0c0]">Pretty Print</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="mx-3 mb-1 text-2xs text-[#f04060] bg-[#f04060]/10 rounded p-1.5 border border-[#f04060]/30">
          ❌ {exportError}
        </div>
      )}

      {/* Export button */}
      <div className="p-3 border-t border-[#2e2e3a] flex-shrink-0">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded font-medium text-sm text-white transition-all"
          style={{ background: isExporting ? '#5c4de0' : 'linear-gradient(135deg, #7b68ee, #5c4de0)' }}
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download size={14} />
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
}
