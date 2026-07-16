import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { parseSVGContent } from '../../engine/svg/svgParser.js';
import { ModalBackdrop } from '../modals/ActiveModal.jsx';
import { Upload, AlertCircle, CheckCircle, Image, Grid, Layers, ChevronDown, ChevronRight, Trash2, Plus, FileText } from 'lucide-react';

export function ImportSVGModal({ onClose }) {
  const { importSVG, saveHistory, loadProject } = useEditorStore();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [rawString, setRawString] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const [importOptions, setImportOptions] = useState({
    preserveStructure: true,
    preserveGroups: true,
    importAsSingle: false,
    expandToEditable: false,
    flattenEffects: false,
    removeMetadata: true,
    optimizePaths: false,
    preserveIds: true,
  });

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        setFileName(file.name.replace(/\.svg$/i, ''));
        setError(null);
        setRawString(content);

        const parsed = parseSVGContent(content);
        if (!parsed) {
          throw new Error('Could not parse SVG — no <svg> root found.');
        }

        // Analyze
        const groupCount = parsed.layers ? Object.values(parsed.layers).filter(l => l.type === 'group').length : 0;
        const pathCount = parsed.layers ? Object.values(parsed.layers).filter(l => l.type === 'shape' && l.pathData).length : 0;
        const shapeCount = parsed.layers ? Object.values(parsed.layers).filter(l => l.type === 'shape').length : 0;
        const gradientCount = parsed.defs?.gradients ? Object.keys(parsed.defs.gradients).length : 0;
        const maskCount = parsed.defs?.clipPaths ? Object.keys(parsed.defs.clipPaths).length : 0;
        const unsupportedFeatures = [];
        if (parsed.defs?.filters && Object.keys(parsed.defs.filters).length > 0) unsupportedFeatures.push('Filters');
        if (groupCount > 0 && !importOptions.preserveGroups) unsupportedFeatures.push('Groups (will be flattened)');

        setAnalysis({
          width: parsed.width || 800,
          height: parsed.height || 600,
          groupCount,
          pathCount,
          shapeCount,
          gradientCount,
          maskCount,
          unsupportedFeatures,
          viewBox: parsed.viewBox,
        });
        setData({ parsed, content });
      } catch (err) {
        setError(`Could not import SVG: ${err.message}`);
        setData(null);
        setAnalysis(null);
      }
    };
    reader.readAsText(file);
  };

  const doImport = () => {
    if (!data) return;
    saveHistory('Import SVG');

    // If importAsSingle is selected, create a single group layer with the full SVG content
    if (importOptions.importAsSingle) {
      importSVG(data.content, { name: fileName || 'SVG Import' });
    } else if (importOptions.expandToEditable) {
      // Import as editable elements (one layer per path/group)
      const parsed = data.parsed;
      const rootId = parsed.layers ? Object.values(parsed.layers)[0]?.id : null;
      // For simplicity, import the whole content as editable SVG group
      // (Full expansion is complex; we import the full SVG for now and rely on Ungroup in editor)
      importSVG(data.content, { name: fileName || 'SVG Import' });
    } else {
      // Default: preserve structure
      importSVG(data.content, { name: fileName || 'SVG Import' });
    }

    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-2xl">
      <div className="p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#f0f0f5] flex items-center gap-2">
            <Image size={16} className="text-[#7b68ee]" /> Import SVG
          </h2>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>

        {!data ? (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-[#2e2e3a] hover:border-[#5a5a70]'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault(); setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f && f.name.endsWith('.svg')) handleFile(f);
            }}
          >
            <Upload size={32} className="mx-auto text-[#5a5a70] mb-3" />
            <p className="text-sm text-[#9090a8] mb-1">Drop an SVG file here or click to browse</p>
            <p className="text-xs text-[#5a5a70]">Supports .svg files</p>
            {error && <p className="text-xs text-[#f04060] mt-2">{error}</p>}
            <input
              ref={fileRef}
              type="file"
              accept=".svg"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {/* Left: Preview */}
            <div>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Preview</p>
              <div
                className="rounded-lg overflow-hidden border border-[#2e2e3a] flex items-center justify-center"
                style={{ background: '#111118', minHeight: 160 }}
              >
                <div
                  className="w-full h-full p-2 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: data.content.substring(0, 5000) }}
                />
              </div>
            </div>

            {/* Right: Info & settings */}
            <div className="space-y-3">
              {/* File info */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#22222a] border border-[#2e2e3a]">
                <Image size={18} className="text-[#7b68ee] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f0f5] truncate">{fileName}</p>
                  <p className="text-2xs text-[#5a5a70]">
                    {analysis?.width}×{analysis?.height} · {analysis?.groupCount} groups · {analysis?.pathCount} paths
                  </p>
                </div>
                <button className="text-xs text-[#7b68ee] hover:text-[#a08fff] flex-shrink-0"
                  onClick={() => { setData(null); setAnalysis(null); setRawString(''); }}
                >
                  Change
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Groups', value: analysis?.groupCount },
                  { label: 'Paths', value: analysis?.pathCount },
                  { label: 'Shapes', value: analysis?.shapeCount },
                  { label: 'Gradients', value: analysis?.gradientCount },
                  { label: 'Clipping', value: analysis?.maskCount },
                  { label: 'Warnings', value: analysis?.unsupportedFeatures?.length || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 rounded bg-[#1a1a22] border border-[#2e2e3a] text-center">
                    <div className="text-base font-bold text-[#7b68ee]">{value ?? '—'}</div>
                    <div className="text-2xs text-[#5a5a70]">{label}</div>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {analysis?.unsupportedFeatures?.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {analysis.unsupportedFeatures.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-[#f0a030] bg-[#f0a030]/8 rounded p-1.5">
                      <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />{w}
                    </div>
                  ))}
                </div>
              )}

              {/* Import options */}
              <div className="space-y-2">
                <p className="text-2xs text-[#9090a8] font-semibold uppercase tracking-wider">Import Options</p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.preserveStructure} onChange={e => setImportOptions(p => ({ ...p, preserveStructure: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Preserve Original Structure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.preserveGroups} onChange={e => setImportOptions(p => ({ ...p, preserveGroups: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Preserve Groups</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.importAsSingle} onChange={e => setImportOptions(p => ({ ...p, importAsSingle: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Import as Single Object</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.expandToEditable} onChange={e => setImportOptions(p => ({ ...p, expandToEditable: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Expand to Editable Elements</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.flattenEffects} onChange={e => setImportOptions(p => ({ ...p, flattenEffects: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Flatten Unsupported Effects</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.removeMetadata} onChange={e => setImportOptions(p => ({ ...p, removeMetadata: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Remove Unused Metadata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.optimizePaths} onChange={e => setImportOptions(p => ({ ...p, optimizePaths: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Optimize Paths</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.preserveIds} onChange={e => setImportOptions(p => ({ ...p, preserveIds: e.target.checked }))} className="accent-[#7b68ee]" />
                  <span className="text-xs text-[#9090a8]">Preserve IDs and Layer Names</span>
                </label>
              </div>

              <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a] leading-relaxed">
                The preview shows the raw SVG content. After import, you can ungroup, release compound paths, merge shapes, and apply boolean operations using the toolbar commands.
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 py-2 text-sm" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary flex-1 py-2 text-sm"
                  onClick={doImport}
                >
                  Import SVG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}
