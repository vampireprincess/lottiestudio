import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { useColorStore } from '../../stores/colorStore.js';
import { ColorPicker } from '../color/ColorPicker.jsx';
import { colorToHex, hexToColor, gradientToCSS } from '../../utils/colorUtils.js';
import { Star, Trash2, Plus, Copy, Search, Heart, ChevronDown, ChevronRight } from 'lucide-react';

export function ColorPanel() {
  const { project, selectedLayerIds, updateLayer } = useEditorStore();
  const {
    recentColors, savedColors, gradientSwatches, gradientSwatchCategory,
    gradientSwatchCategories, loadGradientSwatches, setGradientSwatchCategory,
    saveGradientSwatch, deleteGradientSwatch, toggleGradientFavorite, addRecentColor,
    loadSavedColors, saveColor,
  } = useColorStore();

  const [activeTab, setActiveTab] = useState('swatches');
  const [search, setSearch] = useState('');
  const [newSwatchGradient, setNewSwatchGradient] = useState(null);
  const [expandedCats, setExpandedCats] = useState({ Pastel: true, Neon: true, Sunset: true });

  useEffect(() => {
    loadGradientSwatches();
    loadSavedColors();
  }, []);

  // Filter swatches
  const filteredSwatches = gradientSwatches.filter(s => {
    const catMatch = gradientSwatchCategory === 'All' || s.category === gradientSwatchCategory;
    const searchMatch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  // Group by category
  const grouped = filteredSwatches.reduce((acc, s) => {
    const cat = s.category || 'Custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const applyGradient = (swatch) => {
    const id = selectedLayerIds[0];
    if (!id) return;
    const layer = project.layers[id];
    if (!layer) return;
    const fill = {
      enabled: true,
      type: swatch.type || 'linear',
      gradient: {
        type: swatch.type || 'linear',
        stops: swatch.stops,
        angle: swatch.angle || 90,
        center: swatch.center || { x: 0.5, y: 0.5 },
        radius: swatch.radius || 0.5,
        startPoint: { x: 0, y: 0.5 },
        endPoint: { x: 1, y: 0.5 },
        focalPoint: { x: 0.5, y: 0.5 },
        focalRadius: 0,
        spread: 'pad',
      },
      opacity: 1,
      blendMode: 'normal',
    };
    const newFills = layer.fills?.length > 0
      ? layer.fills.map((f, i) => i === 0 ? fill : f)
      : [fill];
    updateLayer(id, { fills: newFills });
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Color & Gradients</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2e2e3a] flex-shrink-0">
        {[
          { id: 'swatches', label: 'Gradient Swatches' },
          { id: 'colors', label: 'Colors' },
          { id: 'global', label: 'Global' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex-1 py-2 text-2xs transition-colors ${activeTab === tab.id ? 'text-[#a08fff] border-b-2 border-[#7b68ee]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Gradient Swatches ── */}
        {activeTab === 'swatches' && (
          <div className="p-2 space-y-2">
            {/* Search */}
            <div className="flex items-center gap-1.5 bg-[#22222a] rounded px-2 py-1">
              <Search size={11} className="text-[#5a5a70]" />
              <input
                type="text" placeholder="Search swatches..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[#f0f0f5] placeholder-[#5a5a70] outline-none"
              />
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-0.5">
              {['All', ...Object.keys(grouped)].filter((v, i, a) => a.indexOf(v) === i).map(cat => (
                <button
                  key={cat}
                  className={`px-1.5 py-0.5 text-2xs rounded transition-colors ${gradientSwatchCategory === cat ? 'bg-[#7b68ee]/20 text-[#a08fff]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
                  onClick={() => setGradientSwatchCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grouped swatches */}
            {Object.entries(grouped).map(([cat, swatches]) => (
              <div key={cat}>
                <button
                  className="w-full flex items-center gap-1 py-1 text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider hover:text-[#9090a8]"
                  onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                >
                  {expandedCats[cat] !== false ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  {cat} ({swatches.length})
                </button>

                {expandedCats[cat] !== false && (
                  <div className="grid grid-cols-4 gap-1">
                    {swatches.map(s => (
                      <GradientSwatchItem
                        key={s.id}
                        swatch={s}
                        onApply={() => applyGradient(s)}
                        onFavorite={() => toggleGradientFavorite(s)}
                        onDelete={() => {
                          if (!s.isBuiltin) deleteGradientSwatch(s.id);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredSwatches.length === 0 && (
              <div className="text-center py-6 text-xs text-[#5a5a70]">No swatches found</div>
            )}

            {/* Save current gradient as swatch */}
            <button
              className="w-full btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1 mt-2"
          onClick={() => {
              const layer = project.layers[selectedLayerIds[0]];
              const fill = layer?.fills?.find(f => f.type !== 'solid' && f.gradient);
              if (fill) {
                // Use a simple inline approach — auto-name based on layer name
                const autoName = (layer?.name || 'Gradient') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                saveGradientSwatch({ name: autoName, ...fill.gradient, category: 'Custom' });
              }
            }}
            >
              <Plus size={11} /> Save Current Gradient as Swatch
            </button>
          </div>
        )}

        {/* ── Saved Colors ── */}
        {activeTab === 'colors' && (
          <div className="p-2 space-y-3">
            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div>
                <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider mb-1.5">Recent</p>
                <div className="flex flex-wrap gap-1">
                  {recentColors.map((color, i) => (
                    <ColorDot key={i} color={color} onClick={() => {
                      const id = selectedLayerIds[0];
                      if (id) {
                        const layer = project.layers[id];
                        if (layer?.fills?.[0]) {
                          const newFills = layer.fills.map((f, fi) => fi === 0 ? { ...f, color } : f);
                          updateLayer(id, { fills: newFills });
                        }
                      }
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Project colors */}
            <div>
              <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider mb-1.5">Project Colors</p>
              <div className="flex flex-wrap gap-1">
                {extractProjectColors(project).map((color, i) => (
                  <ColorDot key={i} color={color} />
                ))}
                {extractProjectColors(project).length === 0 && (
                  <p className="text-2xs text-[#3a3a50]">No colors in project yet</p>
                )}
              </div>
            </div>

            {/* Saved colors */}
            {savedColors.length > 0 && (
              <div>
                <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider mb-1.5">Saved</p>
                <div className="flex flex-wrap gap-1">
                  {savedColors.map((s, i) => (
                    <div key={i} className="group relative">
                      <ColorDot color={s.color} />
                      <div className="absolute -bottom-4 left-0 text-2xs text-[#5a5a70] whitespace-nowrap hidden group-hover:block bg-[#0a0a10] px-1 rounded">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="w-full btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
              onClick={() => {
                const id = selectedLayerIds[0];
                const layer = project.layers[id];
                const color = layer?.fills?.[0]?.color;
                if (color) {
                  const autoName = (layer?.name || 'Color') + ' ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                  useColorStore.getState().saveColor(color, autoName);
                }
              }}
            >
              <Plus size={11} /> Save Current Color
            </button>
          </div>
        )}

        {/* ── Global Colors ── */}
        {activeTab === 'global' && (
          <GlobalColorsPanel />
        )}
      </div>
    </div>
  );
}

// ─── Gradient Swatch Item ─────────────────────────────────────────────────────
function GradientSwatchItem({ swatch, onApply, onFavorite, onDelete }) {
  const gradCSS = gradientToCSS({ type: swatch.type || 'linear', stops: swatch.stops, angle: swatch.angle || 90, center: swatch.center });

  return (
    <div className="group relative cursor-pointer" title={swatch.name} onClick={onApply}>
      {/* Checkerboard bg */}
      <div className="w-full aspect-square rounded border border-[#3a3a50] overflow-hidden relative">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%)',
          backgroundSize: '8px 8px',
        }} />
        <div className="absolute inset-0 hover:ring-2 hover:ring-[#7b68ee] rounded transition-all" style={{ background: gradCSS }} />
      </div>

      <p className="text-2xs text-[#5a5a70] mt-0.5 truncate">{swatch.name}</p>

      {/* Hover controls */}
      <div className="absolute top-0 right-0 hidden group-hover:flex flex-col gap-0.5 p-0.5">
        <button
          className={`w-4 h-4 rounded flex items-center justify-center ${swatch.isFavorite ? 'text-yellow-400' : 'text-[#5a5a70]'} bg-[#0a0a10]/80`}
          onClick={e => { e.stopPropagation(); onFavorite(); }}
        >
          <Star size={9} />
        </button>
        {!swatch.isBuiltin && (
          <button
            className="w-4 h-4 rounded flex items-center justify-center text-[#f04060] bg-[#0a0a10]/80"
            onClick={e => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Color Dot ────────────────────────────────────────────────────────────────
function ColorDot({ color, onClick, selected }) {
  const hex = colorToHex(color);
  return (
    <button
      className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${selected ? 'border-white' : 'border-transparent hover:border-white/40'}`}
      style={{ background: hex }}
      onClick={onClick}
      title={hex}
    />
  );
}

// ─── Global Colors Panel ──────────────────────────────────────────────────────
function GlobalColorsPanel() {
  const { project, addGlobalColor, updateGlobalColor, selectedLayerIds } = useEditorStore();
  const globalColors = project.globalColors || [];
  const [expandedId, setExpandedId] = useState(null);

  const removeGlobalColor = (id) => {
    const store = useEditorStore.getState();
    store.loadProject({
      ...project,
      globalColors: project.globalColors.filter(gc => gc.id !== id),
    });
  };

  const linkSelectedLayer = (gcId) => {
    if (!selectedLayerIds[0]) return;
    const gc = globalColors.find(c => c.id === gcId);
    if (!gc) return;
    const updatedLinked = [...new Set([...(gc.linkedLayers || []), selectedLayerIds[0]])];
    updateGlobalColor(gcId, { linkedLayers: updatedLinked });

    // Apply color to selected layer's first fill immediately
    const store = useEditorStore.getState();
    const layer = project.layers[selectedLayerIds[0]];
    if (layer) {
      const newFills = (layer.fills || []).map((f, i) =>
        i === 0 ? { ...f, color: gc.color, globalColorId: gcId } : f
      );
      store.updateLayer(selectedLayerIds[0], { fills: newFills });
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Global Colors link across layers. When you change a global color, all linked layers update instantly.
      </div>

      {globalColors.length === 0 && (
        <div className="text-center py-4 text-xs text-[#5a5a70]">No global colors. Click + to add one.</div>
      )}

      {globalColors.map(gc => (
        <div key={gc.id} className="rounded border border-[#2e2e3a] overflow-hidden">
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#22222a]"
            onClick={() => setExpandedId(expandedId === gc.id ? null : gc.id)}
          >
            <div
              className="w-6 h-6 rounded border border-[#3a3a50] flex-shrink-0 cursor-pointer"
              style={{ background: colorToHex(gc.color) }}
            />
            <input
              type="text"
              value={gc.name}
              onChange={e => updateGlobalColor(gc.id, { name: e.target.value })}
              className="text-xs text-[#f0f0f5] bg-transparent outline-none flex-1 cursor-text"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
            />
            <span className="text-2xs text-[#5a5a70]">{gc.linkedLayers?.length || 0} linked</span>
            <button
              className="btn-icon w-5 h-5 text-[#f04060]"
              onClick={e => { e.stopPropagation(); removeGlobalColor(gc.id); }}
              title="Remove global color"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {expandedId === gc.id && (
            <div className="border-t border-[#2e2e3a] p-2 space-y-2">
              <ColorPicker
                color={gc.color}
                onChange={color => {
                  updateGlobalColor(gc.id, { color });
                  // Auto-propagate to all linked layers
                  const store = useEditorStore.getState();
                  (gc.linkedLayers || []).forEach(layerId => {
                    const layer = store.project.layers[layerId];
                    if (!layer) return;
                    const newFills = (layer.fills || []).map(f =>
                      f.globalColorId === gc.id ? { ...f, color } : f
                    );
                    if (newFills.some((f, i) => f !== layer.fills[i])) {
                      store.updateLayer(layerId, { fills: newFills });
                    } else {
                      // If no fill linked by id, update first fill
                      const firstFillIdx = layer.fills?.findIndex(f => f.type === 'solid');
                      if (firstFillIdx !== -1) {
                        const updatedFills = [...(layer.fills || [])];
                        updatedFills[firstFillIdx] = { ...updatedFills[firstFillIdx], color };
                        store.updateLayer(layerId, { fills: updatedFills });
                      }
                    }
                  });
                }}
              />

              {selectedLayerIds.length > 0 && (
                <button
                  className="w-full btn-ghost text-2xs py-1 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
                  onClick={() => linkSelectedLayer(gc.id)}
                >
                  <Plus size={9} /> Link selected layer to this color
                </button>
              )}

              {(gc.linkedLayers || []).length > 0 && (
                <div>
                  <p className="text-2xs text-[#5a5a70] mb-1">Linked layers:</p>
                  {(gc.linkedLayers || []).map(layerId => {
                    const layer = project.layers[layerId];
                    return layer ? (
                      <div key={layerId} className="flex items-center gap-1 text-2xs text-[#9090a8]">
                        <span className="flex-1">{layer.name}</span>
                        <button
                          className="text-[#f04060] hover:text-[#ff6080]"
                          onClick={() => {
                            const updated = (gc.linkedLayers || []).filter(id => id !== layerId);
                            updateGlobalColor(gc.id, { linkedLayers: updated });
                          }}
                          title="Unlink"
                        >✕</button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        className="w-full btn-ghost text-xs py-1.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
        onClick={() => addGlobalColor({ r: 123, g: 104, b: 238, a: 1 })}
      >
        <Plus size={11} /> Add Global Color
      </button>

      {/* Exposed Properties section */}
      <div className="border-t border-[#2e2e3a] pt-3">
        <p className="text-2xs font-semibold text-[#9090a8] uppercase tracking-wider mb-1">Exposed Properties</p>
        <p className="text-2xs text-[#5a5a70] mb-2">Mark layer properties as exposed — used for dotLottie themes/slots.</p>
        {Object.values(project.layers).filter(l => (l.exposedProperties || []).length > 0).map(layer => (
          <div key={layer.id} className="text-2xs text-[#9090a8] mb-1">
            <span className="text-[#f0f0f5]">{layer.name}:</span> {(layer.exposedProperties || []).join(', ')}
          </div>
        ))}
        {Object.values(project.layers).every(l => !(l.exposedProperties || []).length) && (
          <p className="text-2xs text-[#3a3a50]">No exposed properties yet. Mark fills or strokes as global colors to expose them.</p>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractProjectColors(project) {
  const seen = new Set();
  const colors = [];
  Object.values(project.layers).forEach(layer => {
    (layer.fills || []).forEach(fill => {
      if (fill.type === 'solid' && fill.color) {
        const hex = colorToHex(fill.color);
        if (!seen.has(hex)) { seen.add(hex); colors.push(fill.color); }
      }
    });
    (layer.strokes || []).forEach(stroke => {
      if (stroke.color) {
        const hex = colorToHex(stroke.color);
        if (!seen.has(hex)) { seen.add(hex); colors.push(stroke.color); }
      }
    });
  });
  return colors.slice(0, 32);
}
