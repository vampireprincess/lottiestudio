import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { exportLottie } from '../../engine/exporters/lottieExporter.js';
import { exportSVG } from '../../engine/exporters/svgExporter.js';
import { Download, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ExportModal({ onClose }) {
  const { project } = useEditorStore();
  const [format, setFormat] = useState('lottie');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [settings, setSettings] = useState({
    fps: project.fps,
    width: project.width,
    height: project.height,
    quality: 90,
    transparent: project.backgroundAlpha < 1,
    loop: true,
    minify: false,
    pretty: true,
    segment: 'full',
    optimize: false,
  });

  const updateSettings = (updates) => setSettings(prev => ({ ...prev, ...updates }));

  // Compatibility analysis
  const analysis = analyzeCompatibility(project, format);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data, filename;

      if (format === 'lottie' || format === 'lottie-min') {
        const lottieData = exportLottie(project, { ...settings, optimize: false });
        const json = format === 'lottie-min'
          ? JSON.stringify(lottieData)
          : JSON.stringify(lottieData, null, 2);
        data = new Blob([json], { type: 'application/json' });
        filename = `${project.name || 'animation'}.json`;

      } else if (format === 'svg-static') {
        const svgContent = exportSVG(project, { ...settings, animated: false });
        data = new Blob([svgContent], { type: 'image/svg+xml' });
        filename = `${project.name || 'animation'}.svg`;

      } else if (format === 'svg-animated') {
        const svgContent = exportSVG(project, { ...settings, animated: true });
        data = new Blob([svgContent], { type: 'image/svg+xml' });
        filename = `${project.name || 'animation'}.svg`;

      } else {
        alert(`Format "${format}" will be available in the next phase (WebM/GIF rendering requires canvas rendering pipeline).`);
        setIsExporting(false);
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);

    } catch (err) {
      console.error('Export error:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-2xl">
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f0f5]">Export Animation</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Format & Settings */}
          <div className="space-y-4">
            {/* Format */}
            <div>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Format</p>
              <div className="space-y-1">
                {[
                  { id: 'lottie', label: 'Lottie JSON', desc: 'Standard Lottie format', stable: true },
                  { id: 'lottie-min', label: 'Lottie JSON (Minified)', desc: 'Smallest file size', stable: true },
                  { id: 'svg-static', label: 'Static SVG', desc: 'Current frame as SVG', stable: true },
                  { id: 'svg-animated', label: 'Animated SVG', desc: 'SVG with CSS animations', stable: true },
                  { id: 'webm', label: 'WebM (Alpha)', desc: 'Rendered video with transparency', stable: false },
                  { id: 'gif', label: 'GIF', desc: 'Animated GIF', stable: false },
                  { id: 'png-seq', label: 'PNG Sequence', desc: 'Individual frames as PNGs', stable: false },
                ].map(f => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      format === f.id ? 'bg-[#7b68ee]/15 border border-[#7b68ee]/40' : 'hover:bg-[#22222a] border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={f.id}
                      checked={format === f.id}
                      onChange={() => setFormat(f.id)}
                      className="accent-[#7b68ee]"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#f0f0f5] flex items-center gap-1">
                        {f.label}
                        {!f.stable && (
                          <span className="text-2xs text-[#f0a030] bg-[#f0a030]/10 px-1 rounded">Phase 9</span>
                        )}
                      </div>
                      <div className="text-2xs text-[#5a5a70]">{f.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Settings</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Width</label>
                  <input type="number" value={settings.width} onChange={e => updateSettings({ width: parseInt(e.target.value) })} className="input w-full text-xs" />
                </div>
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Height</label>
                  <input type="number" value={settings.height} onChange={e => updateSettings({ height: parseInt(e.target.value) })} className="input w-full text-xs" />
                </div>
              </div>

              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">FPS</label>
                <input type="number" value={settings.fps} onChange={e => updateSettings({ fps: parseInt(e.target.value) })} className="input w-full text-xs" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.transparent} onChange={e => updateSettings({ transparent: e.target.checked })} className="accent-[#7b68ee]" />
                <span className="text-xs text-[#b0b0c0]">Transparent Background</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.loop} onChange={e => updateSettings({ loop: e.target.checked })} className="accent-[#7b68ee]" />
                <span className="text-xs text-[#b0b0c0]">Loop Animation</span>
              </label>
            </div>
          </div>

          {/* Right: Compatibility Inspector */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Compatibility</p>

              {/* Target profile */}
              <div className="space-y-1">
                {analysis.items.map((item, i) => (
                  <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                    item.type === 'ok' ? 'text-[#30d060] bg-[#30d060]/5'
                    : item.type === 'warn' ? 'text-[#f0a030] bg-[#f0a030]/5'
                    : 'text-[#f04060] bg-[#f04060]/5'
                  }`}>
                    {item.type === 'ok' ? <CheckCircle size={12} className="flex-shrink-0 mt-0.5" />
                     : item.type === 'warn' ? <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                     : <Info size={12} className="flex-shrink-0 mt-0.5" />}
                    {item.message}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded bg-[#1a1a22] border border-[#2e2e3a]">
              <p className="text-xs font-semibold text-[#9090a8] mb-1">Export Summary</p>
              <div className="text-xs space-y-0.5 text-[#b0b0c0]">
                <div>Project: <span className="text-[#f0f0f5]">{project.name}</span></div>
                <div>Size: <span className="text-[#f0f0f5]">{settings.width}×{settings.height}</span></div>
                <div>FPS: <span className="text-[#f0f0f5]">{settings.fps}</span></div>
                <div>Duration: <span className="text-[#f0f0f5]">{(project.totalFrames / project.fps).toFixed(1)}s</span></div>
                <div>Layers: <span className="text-[#f0f0f5]">{Object.keys(project.layers).length}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Export button */}
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost px-4 py-2" onClick={onClose}>Cancel</button>
          <button
            className="flex items-center gap-2 px-6 py-2 rounded font-medium text-sm text-white transition-all"
            style={{ background: exportDone ? '#30d060' : isExporting ? '#5c4de0' : 'linear-gradient(135deg, #7b68ee, #5c4de0)' }}
            onClick={handleExport}
            disabled={isExporting}
          >
            {exportDone ? <><CheckCircle size={14} /> Exported!</>
             : isExporting ? 'Exporting...'
             : <><Download size={14} /> Export</>}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function analyzeCompatibility(project, format) {
  const items = [];
  const layers = Object.values(project.layers);

  if (format === 'lottie' || format === 'lottie-min') {
    items.push({ type: 'ok', message: 'Basic shapes and paths — fully supported' });

    const glowLayers = layers.filter(l => l.effects?.some(e => e.enabled));
    if (glowLayers.length > 0) {
      items.push({ type: 'warn', message: `${glowLayers.length} layer(s) use Gaussian blur/glow — may vary by renderer. OBS browser source: ✓ tested` });
    }

    const svgLayers = layers.filter(l => l.type === 'svg' && l.svgContent);
    if (svgLayers.length > 0) {
      items.push({ type: 'warn', message: `${svgLayers.length} raw SVG layer(s) — converted as best-effort shapes` });
    }

    const gradients = layers.filter(l => l.fills?.some(f => f.type !== 'solid'));
    if (gradients.length > 0) {
      items.push({ type: 'ok', message: `${gradients.length} gradient fill(s) — supported in Lottie v5` });
    }

    const masks = layers.filter(l => l.masks?.length > 0);
    if (masks.length > 0) {
      items.push({ type: 'ok', message: `${masks.length} layer(s) with masks — supported` });
    }

    items.push({ type: 'ok', message: 'Keyframe animation — fully supported' });
    items.push({ type: 'ok', message: 'Transform (position, scale, rotation) — fully supported' });

  } else if (format === 'svg-static' || format === 'svg-animated') {
    items.push({ type: 'ok', message: 'All vector shapes — fully supported in SVG' });
    items.push({ type: 'ok', message: 'All gradients — natively supported' });
    items.push({ type: 'ok', message: 'Glow/blur effects — exported as SVG filters' });
    if (format === 'svg-animated') {
      items.push({ type: 'warn', message: 'Keyframe animations converted to CSS — may vary by browser' });
    }
  }

  return { items };
}
