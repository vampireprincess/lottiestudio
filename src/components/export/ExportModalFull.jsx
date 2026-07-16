import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from '../modals/ActiveModal.jsx';
import { exportLottie } from '../../engine/exporters/lottieExporter.js';
import { exportSVG } from '../../engine/exporters/svgExporter.js';
import { exportDotLottie } from '../../engine/export/dotLottieExporter.js';
import { renderToWebM, exportPNGSequence, checkWebMSupport } from '../../engine/export/renderedExporter.js';
import { exportGIF } from '../../engine/export/gifExporter.js';
import { OptimizationInspector } from './OptimizationInspector.jsx';
import { analyzeOptimization } from '../../engine/export/optimizationEngine.js';
import { getExportPresets, saveExportPreset } from '../../db/index.js';
import { Download, CheckCircle, AlertCircle, Loader, Info, Save, Trash2 } from 'lucide-react';
import { saveFile, isTauri } from '../../lib/tauriFS.js';

const FORMATS = [
  { id:'lottie',       label:'Lottie JSON',        ext:'.json',   cat:'vector', stable:true },
  { id:'lottie-min',   label:'Lottie Minified',     ext:'.json',   cat:'vector', stable:true },
  { id:'dotlottie',    label:'dotLottie',           ext:'.lottie', cat:'vector', stable:true },
  { id:'svg-static',   label:'Static SVG',          ext:'.svg',    cat:'vector', stable:true },
  { id:'svg-animated', label:'Animated SVG',        ext:'.svg',    cat:'vector', stable:true },
  { id:'webm',         label:'WebM (with alpha)',    ext:'.webm',   cat:'rendered', stable:true },
  { id:'png-seq',      label:'PNG Sequence',        ext:'.zip',    cat:'rendered', stable:true },
  { id:'gif',          label:'GIF (Animated)',      ext:'.gif',    cat:'rendered', stable:true },
];

const BUILTIN_PRESETS = [
  { id:'obs',        label:'OBS Lottie',          format:'lottie',       settings:{ loop:true, transparent:true } },
  { id:'universal',  label:'Universal Lottie',     format:'lottie-min',   settings:{} },
  { id:'dotlottie',  label:'dotLottie Optimized',  format:'dotlottie',    settings:{ includeThemes:true } },
  { id:'svg-anim',   label:'Animated SVG',         format:'svg-animated', settings:{} },
  { id:'webm-alpha', label:'WebM Alpha',           format:'webm',         settings:{ transparent:true, scale:1 } },
  { id:'preview',    label:'GIF Preview',          format:'gif',          settings:{ scale:0.5, fps:15 } },
];

export function ExportModalFull({ onClose }) {
  const { project } = useEditorStore();
  const [format, setFormat] = useState('lottie');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [activeTab, setActiveTab] = useState('format');
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [beforeSize, setBeforeSize] = useState(null);
  const [afterSize, setAfterSize] = useState(null);

  const [settings, setSettings] = useState({
    fps: project.fps, width: project.width, height: project.height,
    quality: 0.8, scale: 1,
    transparent: project.backgroundAlpha < 1, loop: true,
    minify: false, pretty: true, includeThemes: true,
    segment: 'full', startFrame: 0, endFrame: project.totalFrames - 1,
    markerName: null,
  });

  const upd = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  // Load user-saved export presets from DB
  useEffect(() => {
    getExportPresets().then(setSavedPresets).catch(() => {});
  }, []);

  // Calculate before/after sizes for optimization preview
  useEffect(() => {
    if (activeTab === 'optimize') {
      try {
        const data = exportLottie(project, settings);
        const json = JSON.stringify(data);
        setBeforeSize(json.length);
      } catch(e) {}
    }
  }, [activeTab, project]);

  const handleOptimized = (optimizedProject) => {
    try {
      const data = exportLottie(optimizedProject, settings);
      const json = JSON.stringify(data);
      setAfterSize(json.length);
    } catch(e) {}
  };

  const applyPreset = (preset) => {
    setFormat(preset.format || 'lottie');
    setSettings(prev => ({ ...prev, ...(preset.settings || {}) }));
  };

  const saveCurrentAsPreset = async () => {
    if (!newPresetName.trim()) return;
    await saveExportPreset({
      name: newPresetName.trim(),
      format,
      settings,
    });
    const presets = await getExportPresets();
    setSavedPresets(presets);
    setNewPresetName('');
    setShowSavePreset(false);
  };

  // Build export options with segment support
  const buildExportOptions = () => {
    const seg = settings.segment;
    let startFrame = 0;
    let endFrame = project.totalFrames - 1;
    let markerName = null;

    if (seg === 'workarea') {
      startFrame = useEditorStore.getState().workAreaStart;
      endFrame = useEditorStore.getState().workAreaEnd;
    } else if (seg === 'range') {
      startFrame = settings.startFrame;
      endFrame = settings.endFrame;
    } else if (seg.startsWith('marker:')) {
      const markerId = seg.replace('marker:', '');
      const marker = project.markers.find(m => m.id === markerId);
      if (marker) {
        markerName = marker.name;
        startFrame = marker.frame;
        endFrame = marker.endFrame ?? marker.frame + 30;
      }
    } else if (seg === 'intro' || seg === 'loop' || seg === 'outro') {
      // Find marker by name
      const m = project.markers.find(m => m.name.toLowerCase() === seg);
      if (m) {
        markerName = m.name;
        startFrame = m.frame;
        endFrame = m.endFrame ?? m.frame + 30;
      }
    }

    return {
      fps: settings.fps,
      loop: settings.loop,
      transparent: settings.transparent,
      scale: settings.scale,
      quality: settings.quality,
      includeThemes: settings.includeThemes,
      startFrame,
      endFrame,
      markerName,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setDone(false);

    try {
      let blob, filename;
      const opts = buildExportOptions();

      switch (format) {
        case 'lottie': {
          const data = exportLottie(project, opts);
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          filename = `${project.name || 'animation'}.json`;
          break;
        }
        case 'lottie-min': {
          const data = exportLottie(project, opts);
          blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          filename = `${project.name || 'animation'}.min.json`;
          break;
        }
        case 'dotlottie': {
          blob = await exportDotLottie(project, opts);
          filename = `${project.name || 'animation'}.lottie`;
          break;
        }
        case 'svg-static': {
          const svg = exportSVG(project, { ...opts, animated: false });
          blob = new Blob([svg], { type: 'image/svg+xml' });
          filename = `${project.name || 'animation'}.svg`;
          break;
        }
        case 'svg-animated': {
          const svg = exportSVG(project, { ...opts, animated: true });
          blob = new Blob([svg], { type: 'image/svg+xml' });
          filename = `${project.name || 'animation'}.svg`;
          break;
        }
        case 'webm': {
          // Check browser support first
          const webmCheck = checkWebMSupport();
          if (!webmCheck.supported) {
            throw new Error(webmCheck.reason);
          }
          blob = await renderToWebM(project, opts, pct => setProgress(pct));
          filename = `${project.name || 'animation'}.webm`;
          break;
        }
        case 'gif': {
          // Real GIF export via gifenc
          blob = await exportGIF(project, opts, pct => setProgress(pct));
          filename = `${project.name || 'animation'}.gif`;
          break;
        }
        case 'png-seq': {
          const frames = await exportPNGSequence(project, opts, pct => setProgress(pct));
          frames.forEach(({ name, blob: fb }) => {
            const url = URL.createObjectURL(fb);
            const a = document.createElement('a');
            a.href = url; a.download = name; a.click();
            URL.revokeObjectURL(url);
          });
          setDone(true);
          setIsExporting(false);
          return;
        }
        default: {
          const data = exportLottie(project, opts);
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          filename = `${project.name || 'animation'}.json`;
        }
      }

      // Use Tauri native save dialog if available, else browser download
      const ext = filename.split('.').pop();
      const mimeMap = {
        json: 'application/json', lottie: 'application/octet-stream',
        svg: 'image/svg+xml', webm: 'video/webm',
        gif: 'image/gif', zip: 'application/zip',
      };
      await saveFile(blob, {
        defaultName: filename,
        filters: [{ name: filename, extensions: [ext] }],
        mimeType: mimeMap[ext] || 'application/octet-stream',
      });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Named marker segments for quick export
  const namedMarkers = (project.markers || []).filter(m => m.exportFlag || m.isLoop);
  const introBtnShow = project.markers?.some(m => m.name.toLowerCase() === 'intro');
  const loopBtnShow  = project.markers?.some(m => m.name.toLowerCase() === 'loop');
  const outroBtnShow = project.markers?.some(m => m.name.toLowerCase() === 'outro');

  const currentFormat = FORMATS.find(f => f.id === format);

  return (
    <ModalBackdrop onClose={onClose} width="max-w-3xl">
      <div className="flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e3a] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Export Animation</h2>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2e2e3a] flex-shrink-0">
          {[
            {id:'format',   label:'Format & Settings'},
            {id:'optimize', label:'Optimization'},
            {id:'compat',   label:'Compatibility'},
          ].map(t => (
            <button key={t.id}
              className={`px-4 py-2 text-xs transition-colors ${activeTab===t.id ? 'text-[#a08fff] border-b-2 border-[#7b68ee]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'format' && (
            <div className="p-5 grid grid-cols-2 gap-5">
              {/* Left: presets + format */}
              <div className="space-y-4">
                {/* Built-in quick presets */}
                <div>
                  <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Quick Presets</p>
                  <div className="grid grid-cols-2 gap-1">
                    {BUILTIN_PRESETS.map(p => (
                      <button key={p.id}
                        className="py-1 px-2 text-2xs btn-ghost border border-[#2e2e3a] rounded text-left hover:border-[#5a5a70]"
                        onClick={() => applyPreset(p)}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>

                {/* Named segment quick buttons */}
                {(introBtnShow || loopBtnShow || outroBtnShow) && (
                  <div>
                    <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Export by Marker</p>
                    <div className="flex gap-1 flex-wrap">
                      {introBtnShow && (
                        <button className="py-1 px-2 text-2xs rounded border border-[#30a0f0]/40 text-[#30a0f0] hover:bg-[#30a0f0]/10"
                          onClick={() => { upd('segment','intro'); }}>Intro</button>
                      )}
                      {loopBtnShow && (
                        <button className="py-1 px-2 text-2xs rounded border border-[#30d060]/40 text-[#30d060] hover:bg-[#30d060]/10"
                          onClick={() => { upd('segment','loop'); }}>Loop</button>
                      )}
                      {outroBtnShow && (
                        <button className="py-1 px-2 text-2xs rounded border border-[#f04060]/40 text-[#f04060] hover:bg-[#f04060]/10"
                          onClick={() => { upd('segment','outro'); }}>Outro</button>
                      )}
                    </div>
                  </div>
                )}

                {/* User-saved presets */}
                {savedPresets.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Saved Presets</p>
                    <div className="space-y-1">
                      {savedPresets.map(preset => (
                        <div key={preset.id} className="flex items-center gap-1">
                          <button
                            className="flex-1 py-1 px-2 text-2xs btn-ghost border border-[#2e2e3a] rounded text-left hover:border-[#7b68ee]/40"
                            onClick={() => applyPreset(preset)}
                          >{preset.name}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save current as preset */}
                {showSavePreset ? (
                  <div className="flex gap-1">
                    <input type="text" placeholder="Preset name..."
                      value={newPresetName} onChange={e => setNewPresetName(e.target.value)}
                      className="input flex-1 text-xs"
                      onKeyDown={e => { if (e.key === 'Enter') saveCurrentAsPreset(); }}
                      autoFocus/>
                    <button className="btn-primary px-2 py-1 text-xs" onClick={saveCurrentAsPreset}>Save</button>
                    <button className="btn-ghost px-2 py-1 text-xs border border-[#2e2e3a] rounded" onClick={() => setShowSavePreset(false)}>✕</button>
                  </div>
                ) : (
                  <button
                    className="w-full btn-ghost text-xs py-1 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
                    onClick={() => setShowSavePreset(true)}
                  >
                    <Save size={11}/> Save Current as Preset
                  </button>
                )}

                {/* Format select */}
                <div>
                  <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Format</p>
                  <div className="space-y-1">
                    {FORMATS.map(f => (
                      <label key={f.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors border ${format===f.id ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-transparent hover:bg-[#22222a]'}`}
                      >
                        <input type="radio" name="fmt" value={f.id} checked={format===f.id}
                          onChange={() => setFormat(f.id)} className="accent-[#7b68ee]"/>
                        <div className="flex-1">
                          <span className="text-xs text-[#f0f0f5]">{f.label}</span>
                          {!f.stable && <span className="ml-1 text-2xs text-[#f0a030] bg-[#f0a030]/10 px-1 rounded">Beta</span>}
                        </div>
                        <span className="text-2xs text-[#5a5a70]">{f.ext}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: settings */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Settings</p>

                <div className="grid grid-cols-2 gap-2">
                  {[{k:'width',l:'Width'},{k:'height',l:'Height'},{k:'fps',l:'FPS'}].map(({k,l}) => (
                    <div key={k}>
                      <label className="text-2xs text-[#5a5a70] block mb-1">{l}</label>
                      <input type="number" value={settings[k]}
                        onChange={e => upd(k, parseInt(e.target.value))}
                        className="input w-full text-xs"/>
                    </div>
                  ))}
                  <div>
                    <label className="text-2xs text-[#5a5a70] block mb-1">Scale</label>
                    <select value={settings.scale} onChange={e => upd('scale',parseFloat(e.target.value))} className="input w-full text-xs">
                      {[0.25,0.5,1,2].map(s => <option key={s} value={s}>{s}×</option>)}
                    </select>
                  </div>
                </div>

                {['webm','png-seq','gif'].includes(format) && (
                  <div>
                    <label className="text-2xs text-[#5a5a70] block mb-1">Quality: {Math.round(settings.quality*100)}%</label>
                    <input type="range" min={0.3} max={1} step={0.05}
                      value={settings.quality} onChange={e => upd('quality',parseFloat(e.target.value))}
                      className="w-full h-1" style={{ accentColor:'#7b68ee' }}/>
                  </div>
                )}

                <div className="space-y-1.5">
                  {[
                    {k:'loop',l:'Loop Animation'},
                    {k:'transparent',l:'Transparent Background'},
                  ].map(({k,l}) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings[k]} onChange={e => upd(k,e.target.checked)} className="accent-[#7b68ee]"/>
                      <span className="text-xs text-[#b0b0c0]">{l}</span>
                    </label>
                  ))}
                </div>

                {/* Segment export */}
                <div>
                  <label className="text-2xs text-[#5a5a70] block mb-1">Export Range</label>
                  <select value={settings.segment} onChange={e => upd('segment',e.target.value)} className="input w-full text-xs">
                    <option value="full">Full Animation</option>
                    <option value="workarea">Work Area</option>
                    <option value="range">Custom Range</option>
                    {project.markers?.map(m => (
                      <option key={m.id} value={`marker:${m.id}`}>
                        Marker: {m.name} ({m.frame}–{m.endFrame || m.frame+30})
                      </option>
                    ))}
                  </select>
                </div>

                {settings.segment === 'range' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-2xs text-[#5a5a70] block mb-1">Start Frame</label>
                      <input type="number" value={settings.startFrame}
                        onChange={e => upd('startFrame', parseInt(e.target.value)||0)}
                        min={0} max={project.totalFrames-1} className="input w-full text-xs"/>
                    </div>
                    <div>
                      <label className="text-2xs text-[#5a5a70] block mb-1">End Frame</label>
                      <input type="number" value={settings.endFrame}
                        onChange={e => upd('endFrame', parseInt(e.target.value)||0)}
                        min={0} max={project.totalFrames-1} className="input w-full text-xs"/>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="p-2.5 rounded bg-[#1a1a22] border border-[#2e2e3a] space-y-1">
                  <p className="text-2xs font-semibold text-[#9090a8]">Summary</p>
                  {[
                    ['Project', project.name || 'Untitled'],
                    ['Size', `${settings.width}×${settings.height}`],
                    ['FPS', settings.fps],
                    ['Duration', `${(project.totalFrames/project.fps).toFixed(1)}s`],
                    ['Range', settings.segment === 'full' ? 'All frames' : `${settings.startFrame}–${settings.endFrame}`],
                    ['Layers', Object.keys(project.layers).length],
                    ['Keyframes', project.keyframes?.length || 0],
                    ['Format', currentFormat?.label],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between text-2xs">
                      <span className="text-[#5a5a70]">{l}</span>
                      <span className="text-[#f0f0f5]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'optimize' && (
            <div className="p-4">
              {/* Before/After size comparison */}
              {(beforeSize || afterSize) && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 p-2.5 rounded bg-[#1a1a22] border border-[#2e2e3a] text-center">
                    <p className="text-2xs text-[#5a5a70] mb-1">Before</p>
                    <p className="text-sm font-bold text-[#f0f0f5]">
                      {beforeSize ? `${(beforeSize/1024).toFixed(1)} KB` : '—'}
                    </p>
                  </div>
                  <div className="flex items-center text-[#5a5a70] text-sm">→</div>
                  <div className="flex-1 p-2.5 rounded bg-[#1a1a22] border border-[#2e2e3a] text-center">
                    <p className="text-2xs text-[#5a5a70] mb-1">After</p>
                    <p className={`text-sm font-bold ${afterSize && afterSize < beforeSize ? 'text-[#30d060]' : 'text-[#f0f0f5]'}`}>
                      {afterSize ? `${(afterSize/1024).toFixed(1)} KB` : '—'}
                    </p>
                  </div>
                  {beforeSize && afterSize && beforeSize > afterSize && (
                    <div className="flex items-center text-[#30d060] text-xs font-semibold">
                      -{Math.round((1 - afterSize/beforeSize)*100)}%
                    </div>
                  )}
                </div>
              )}
              <OptimizationInspector inline onOptimized={handleOptimized}/>
            </div>
          )}

          {activeTab === 'compat' && (
            <CompatibilityTab project={project} format={format}/>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-[#2e2e3a] flex-shrink-0">
          {isExporting && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Loader size={12} className="text-[#7b68ee] animate-spin"/>
                <span className="text-xs text-[#9090a8]">Rendering... {progress}%</span>
              </div>
              <div className="h-1.5 bg-[#2e2e3a] rounded-full overflow-hidden">
                <div className="h-full bg-[#7b68ee] rounded-full transition-all" style={{ width:`${progress}%` }}/>
              </div>
            </div>
          )}
          <div className="flex-1"/>
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold text-white transition-all"
            style={{ background: done?'#30d060':isExporting?'#5c4de0':'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
            onClick={handleExport} disabled={isExporting}
          >
            {done ? <><CheckCircle size={14}/> Exported!</> : isExporting ? 'Exporting...' : <><Download size={14}/> Export</>}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function CompatibilityTab({ project, format }) {
  const layers = Object.values(project.layers);
  const items = [];
  items.push({ type:'ok', msg:'Basic shapes and paths — supported in all formats' });
  const glowLayers = layers.filter(l => l.effects?.some(e=>e.enabled));
  if (glowLayers.length) {
    items.push({ type:'warn', msg:`${glowLayers.length} layer(s) use Gaussian blur glow — OBS browser source: ✓ tested. Other renderers may vary.` });
  }
  const gradients = layers.filter(l => l.fills?.some(f=>f.type!=='solid'));
  if (gradients.length) items.push({ type:'ok', msg:`${gradients.length} gradient fill(s) — supported in Lottie v5+` });
  const masks = layers.filter(l => l.masks?.some(m => m.pathData));
  if (masks.length) items.push({ type:'ok', msg:`${masks.length} layer(s) with masks — supported` });
  const trimLayers = layers.filter(l => l.trimStart !== undefined || project.keyframes.some(k => k.layerId === l.id && k.property === 'trimStart'));
  if (trimLayers.length) items.push({ type:'ok', msg:`${trimLayers.length} Trim Path(s) — exported as ty:tm shape` });

  if (format === 'dotlottie') {
    items.push({ type:'ok', msg:'dotLottie: themes and slots included if global colors defined' });
    items.push({ type:'info', msg:'dotLottie: compatible with Lottie players v3+' });
  }
  if (['webm','png-seq','gif'].includes(format)) {
    items.push({ type:'ok', msg:'Rendered: all effects preserved at pixel level' });
    items.push({ type:'warn', msg:'Rendered: not scalable, larger file size than vector' });
  }

  const segMarkers = project.markers?.filter(m => m.exportFlag) || [];
  if (segMarkers.length > 0) {
    items.push({ type:'ok', msg:`${segMarkers.length} export-flagged segment(s) available for segment export` });
  }

  return (
    <div className="p-5 space-y-2">
      <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-3">
        Compatibility — {FORMATS.find(f=>f.id===format)?.label}
      </p>
      {items.map((item,i) => {
        const Icon = item.type==='ok' ? CheckCircle : item.type==='warn' ? AlertCircle : Info;
        const color = item.type==='ok'?'text-[#30d060]':item.type==='warn'?'text-[#f0a030]':'text-[#9090a8]';
        const bg = item.type==='ok'?'bg-[#30d060]/8':item.type==='warn'?'bg-[#f0a030]/8':'bg-[#9090a8]/8';
        return (
          <div key={i} className={`flex items-start gap-2 p-2 rounded border border-transparent ${color} ${bg} text-xs`}>
            <Icon size={12} className="flex-shrink-0 mt-0.5"/>{item.msg}
          </div>
        );
      })}
    </div>
  );
}
