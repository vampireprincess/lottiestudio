import React, { useState, useRef } from 'react';
import { openFile } from '../../lib/tauriFS.js';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { parseSVGContent } from '../../engine/svg/svgParser.js';
import { createLayer } from '../../engine/project.js';
import { Upload, File, AlertCircle, CheckCircle, Layers, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function ImportSVGModal({ onClose }) {
  const { project, saveHistory } = useEditorStore();
  const [svgContent, setSvgContent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [importMode, setImportMode] = useState('preserve');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  const analyzeSVG = (content, name) => {
    try {
      const result = parseSVGContent(content);
      if (!result) return null;

      const layerList = Object.values(result.layers);
      const groups = layerList.filter(l => l.type === 'group').length;
      const paths = layerList.filter(l => l.type === 'shape' && !l.shapeType && l.pathData).length;
      const shapes = layerList.filter(l => l.type === 'shape' && l.shapeType).length;
      const svgLayers = layerList.filter(l => l.type === 'svg').length;
      const withFills = layerList.filter(l => l.fills?.length > 0).length;
      const withStrokes = layerList.filter(l => l.strokes?.length > 0).length;
      const withGradients = layerList.filter(l => l.fills?.some(f => f.type !== 'solid')).length;

      const warnings = [];
      if (svgLayers > 0) warnings.push(`${svgLayers} text/image element(s) — preserved as SVG embeds`);
      if (result.defs?.filters && Object.keys(result.defs.filters).length > 0)
        warnings.push(`SVG filters detected — not transferred to Lottie`);

      return {
        result,
        groups, paths, shapes, svgLayers,
        withFills, withStrokes, withGradients,
        totalLayers: layerList.length,
        width: Math.round(result.width),
        height: Math.round(result.height),
        warnings,
      };
    } catch (err) {
      console.warn('SVG parse error:', err);
      return null;
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      const name = file.name.replace(/\.svg$/i, '');
      setSvgContent(content);
      setFileName(name);
      const a = analyzeSVG(content, name);
      setAnalysis(a);
      if (a) setParsed(a.result);
    };
    reader.readAsText(file);
  };

  // Tauri-enhanced file open
  const handleBrowse = async () => {
    try {
      const result = await openFile({
        filters: [{ name: 'SVG Files', extensions: ['svg'] }],
      });
      if (result?.content) {
        const name = result.name.replace(/\.svg$/i, '');
        setSvgContent(result.content);
        setFileName(name);
        const a = analyzeSVG(result.content, name);
        setAnalysis(a);
        if (a) setParsed(a.result);
      }
    } catch (e) {
      // Fallback to input click
      fileRef.current?.click();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.name.endsWith('.svg') || f.type === 'image/svg+xml');
    if (file) handleFile(file);
  };

  const handleImport = () => {
    if (!svgContent || !parsed) return;
    saveHistory('Import SVG');

    const store = useEditorStore.getState();
    const project = store.project;

    // Compute scale-to-fit for the SVG onto the canvas
    const svgW = analysis?.width || 800;
    const svgH = analysis?.height || 600;
    const canvasW = project.width;
    const canvasH = project.height;
    const padding = 40;
    const scaleX = (canvasW - padding * 2) / svgW;
    const scaleY = (canvasH - padding * 2) / svgH;
    const fitScale = Math.min(scaleX, scaleY, 1); // never upscale beyond 100%
    const offsetX = (canvasW - svgW * fitScale) / 2;
    const offsetY = (canvasH - svgH * fitScale) / 2;

    // Helper: apply fit transform to a layer
    const applyFitTransform = (layer) => ({
      ...layer,
      transform: {
        ...(layer.transform || {}),
        position: {
          x: (layer.transform?.position?.x || 0) * fitScale + offsetX,
          y: (layer.transform?.position?.y || 0) * fitScale + offsetY,
        },
        scale: {
          x: (layer.transform?.scale?.x || 1) * fitScale,
          y: (layer.transform?.scale?.y || 1) * fitScale,
        },
      },
    });

    if (importMode === 'single') {
      // Import as one SVG layer with fit transform
      const newLayerId = uuidv4();
      const newLayer = {
        id: newLayerId,
        name: fileName,
        type: 'svg',
        svgContent,
        visible: true,
        locked: false,
        solo: false,
        colorLabel: null,
        opacity: 1,
        blendMode: 'normal',
        fills: [], strokes: [], masks: [], effects: [],
        children: [], parentId: null,
        transform: {
          position: { x: offsetX, y: offsetY },
          scale: { x: fitScale, y: fitScale },
          rotation: 0,
          skew: { x: 0, y: 0 },
          anchor: { x: 0, y: 0 },
          pivot: { x: 0.5, y: 0.5 },
        },
        shapeParams: { width: svgW, height: svgH },
        inFrame: 0,
        outFrame: project.totalFrames,
      };
      store.loadProject({
        ...project,
        layers: { ...project.layers, [newLayerId]: newLayer },
        rootLayers: [...project.rootLayers, newLayerId],
        updatedAt: Date.now(),
      });

    } else if (importMode === 'preserve' && parsed) {
      const { layers: parsedLayers, order } = parsed;
      const newLayers = { ...store.project.layers };

      // Apply fit transform to all parsed layers
      Object.entries(parsedLayers).forEach(([id, layer]) => {
        newLayers[id] = applyFitTransform(layer);
      });

      const groupId = uuidv4();
      const group = createLayer({
        id: groupId,
        name: fileName,
        type: 'group',
        children: order,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, pivot: { x: 0.5, y: 0.5 } },
      });
      order.forEach(id => {
        if (newLayers[id]) newLayers[id].parentId = groupId;
      });
      newLayers[groupId] = group;

      store.loadProject({
        ...store.project,
        layers: newLayers,
        rootLayers: [...store.project.rootLayers, groupId],
        updatedAt: Date.now(),
      });

    } else if (importMode === 'expanded' && parsed) {
      const { layers: parsedLayers, order } = parsed;
      const flatIds = [];
      const flatLayers = {};

      const flatten = (ids) => {
        ids.forEach(id => {
          const layer = parsedLayers[id];
          if (!layer) return;
          if (layer.type === 'group' && layer.children?.length > 0) {
            flatten(layer.children);
          } else {
            const newId = uuidv4();
            flatLayers[newId] = applyFitTransform({ ...layer, id: newId, parentId: null });
            flatIds.push(newId);
          }
        });
      };
      flatten(order);

      const newLayers = { ...store.project.layers, ...flatLayers };
      store.loadProject({
        ...store.project,
        layers: newLayers,
        rootLayers: [...store.project.rootLayers, ...flatIds],
        updatedAt: Date.now(),
      });

    } else {
      store.importSVG(svgContent, { name: fileName });
    }

    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-2xl">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f0f5]">Import SVG</h2>
          <button className="btn-icon text-lg leading-none" onClick={onClose}>✕</button>
        </div>

        {!svgContent ? (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-[#2e2e3a] hover:border-[#5a5a70]'}`}
            onClick={handleBrowse}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload size={32} className="mx-auto text-[#5a5a70] mb-3" />
            <p className="text-sm text-[#9090a8] mb-1">Drop SVG file here or click to browse</p>
            <p className="text-xs text-[#5a5a70]">Full SVG structure is preserved — groups, fills, strokes, gradients</p>
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#22222a] border border-[#2e2e3a]">
              <File size={20} className="text-[#7b68ee]" />
              <div className="flex-1">
                <p className="text-sm text-[#f0f0f5]">{fileName}.svg</p>
                {analysis && <p className="text-xs text-[#5a5a70]">{analysis.width} × {analysis.height}px — {analysis.totalLayers} editable layers found</p>}
              </div>
              <button className="text-xs text-[#7b68ee] hover:text-[#a08fff]" onClick={() => { setSvgContent(null); setAnalysis(null); setParsed(null); }}>
                Change
              </button>
            </div>

            {/* Analysis grid */}
            {analysis && (
              <div className="p-3 rounded-lg bg-[#1a1a22] border border-[#2e2e3a]">
                <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-3">SVG Structure Analysis</p>
                <div className="grid grid-cols-4 gap-3 text-center mb-3">
                  {[
                    { label: 'Groups', value: analysis.groups, color: '#7b68ee' },
                    { label: 'Paths', value: analysis.paths, color: '#30d060' },
                    { label: 'Shapes', value: analysis.shapes, color: '#30a0f0' },
                    { label: 'Gradients', value: analysis.withGradients, color: '#f0a030' },
                    { label: 'With Fill', value: analysis.withFills, color: '#f04060' },
                    { label: 'With Stroke', value: analysis.withStrokes, color: '#00c8ff' },
                    { label: 'SVG Embeds', value: analysis.svgLayers, color: '#9090a8' },
                    { label: 'Total Layers', value: analysis.totalLayers, color: '#f0f0f5' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-2xs text-[#5a5a70]">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {analysis.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#f0a030] bg-[#f0a030]/8 rounded px-2 py-1.5 mt-1">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}

                {analysis.warnings.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#30d060] bg-[#30d060]/8 rounded px-2 py-1.5">
                    <CheckCircle size={12} />
                    SVG fully compatible — all elements can be imported as editable layers
                  </div>
                )}
              </div>
            )}

            {/* Import mode */}
            <div>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Import Mode</p>
              <div className="space-y-1.5">
                {[
                  { id: 'preserve', label: 'Preserve Structure', desc: 'Import SVG with full group hierarchy — best for complex illustrations', badge: 'Recommended' },
                  { id: 'single', label: 'Single Object', desc: 'One layer containing the entire SVG as-is', badge: '' },
                  { id: 'expanded', label: 'Expand to Shapes', desc: 'Flatten all groups — each path/shape becomes its own editable layer', badge: '' },
                ].map(mode => (
                  <label
                    key={mode.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${importMode === mode.id ? 'bg-[#7b68ee]/15 border border-[#7b68ee]/40' : 'hover:bg-[#22222a] border border-transparent'}`}
                  >
                    <input type="radio" name="importMode" value={mode.id} checked={importMode === mode.id} onChange={() => setImportMode(mode.id)} className="mt-1 accent-[#7b68ee]" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#f0f0f5]">{mode.label}</span>
                        {mode.badge && <span className="text-2xs bg-[#7b68ee]/20 text-[#a08fff] px-1.5 py-0.5 rounded">{mode.badge}</span>}
                      </div>
                      <div className="text-xs text-[#5a5a70] mt-0.5">{mode.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Layer name */}
            <div>
              <label className="text-xs text-[#5a5a70] block mb-1">Group / Layer Name</label>
              <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="input w-full text-sm" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost px-4 py-2" onClick={onClose}>Cancel</button>
          {svgContent && (
            <button className="btn-primary px-6 py-2" onClick={handleImport}>
              Import SVG
            </button>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}
