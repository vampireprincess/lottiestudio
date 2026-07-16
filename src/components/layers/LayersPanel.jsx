import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { VirtualList } from '../shared/VirtualList.jsx';
import {
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown,
  Folder, Square, Circle, Image, Layers, Plus,
  Trash2, Copy, Search, ArrowUp, ArrowDown
} from 'lucide-react';
import { LAYER_COLORS } from '../../types/index.js';

const LAYER_TYPE_ICONS = {
  shape:   Square,
  group:   Folder,
  svg:     Image,
  lottie:  Layers,
  mask:    Layers,
  precomp: Folder,
  null:    Circle,
};

export function LayersPanel() {
  const {
    project, selectedLayerIds, selectLayers, deselectAll,
    updateLayer, removeLayers, duplicateLayer, groupLayers, ungroupLayer,
    moveLayerUp, moveLayerDown, reorderLayer, saveHistory,
    openModal,
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [filterType, setFilterType] = useState('all');
  const [contextMenu, setContextMenu] = useState(null);
  // DnD state
  const dragLayerId = useRef(null);
  const dragOverLayerId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const toggleExpanded = (id) =>
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  
  // Helper: is layer expanded? Default to true (expanded) unless explicitly collapsed
  const isLayerExpanded = (id) => expanded[id] !== false;

  const handleLayerClick = useCallback((e, layerId) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      selectLayers([layerId], true);
    } else {
      selectLayers([layerId]);
    }
  }, [selectLayers]);

  const handleContextMenu = useCallback((e, layerId) => {
    e.preventDefault();
    e.stopPropagation();
    selectLayers([layerId]);
    setContextMenu({ x: e.clientX, y: e.clientY, layerId });
  }, [selectLayers]);

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, layerId) => {
    dragLayerId.current = layerId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  }, []);

  const handleDragOver = useCallback((e, layerId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverLayerId.current = layerId;
    setDragOverId(layerId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, targetLayerId) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = dragLayerId.current;
    if (!sourceId || sourceId === targetLayerId) return;

    saveHistory('Reorder Layer');

    const rootLayers = project.rootLayers;
    const sourceIdx = rootLayers.indexOf(sourceId);
    const targetIdx = rootLayers.indexOf(targetLayerId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      reorderLayer(sourceId, targetIdx);
    }
    dragLayerId.current = null;
    dragOverLayerId.current = null;
  }, [project.rootLayers, reorderLayer, saveHistory]);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    dragLayerId.current = null;
  }, []);

  // ── Layer rendering ────────────────────────────────────────────────────────
  const renderLayer = (layerId, depth = 0) => {
    const layer = project.layers[layerId];
    if (!layer) return null;

    if (searchQuery && !layer.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      const childMatch = layer.children?.some(id => {
        const c = project.layers[id];
        return c?.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
      if (!childMatch) return null;
    }

    if (filterType !== 'all' && layer.type !== filterType) {
      return null;
    }

    const isSelected = selectedLayerIds.includes(layerId);
    const isExpanded = isLayerExpanded(layerId);
    const hasChildren = layer.children && layer.children.length > 0;
    const Icon = LAYER_TYPE_ICONS[layer.type] || Square;
    const isDragTarget = dragOverId === layerId;

    return (
      <div key={layerId}>
        <div
          className={`flex items-center gap-1 px-1 py-0.5 cursor-pointer transition-colors group relative border-l-2 ${
            isSelected ? 'bg-[#2a2a35] border-[#7b68ee]' : 'hover:bg-[#1e1e26] border-transparent'
          } ${isDragTarget ? 'border-t-2 border-t-[#7b68ee]' : ''}`}
          style={{ paddingLeft: `${4 + depth * 16}px` }}
          onClick={e => handleLayerClick(e, layerId)}
          onContextMenu={e => handleContextMenu(e, layerId)}
          draggable
          onDragStart={e => handleDragStart(e, layerId)}
          onDragOver={e => handleDragOver(e, layerId)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, layerId)}
          onDragEnd={handleDragEnd}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              className="w-4 h-4 flex items-center justify-center text-[#5a5a70] hover:text-[#9090a8]"
              onClick={e => { e.stopPropagation(); toggleExpanded(layerId); }}
            >
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Color label */}
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 cursor-pointer"
            style={{ background: layer.colorLabel || '#5a5a70' }}
            onClick={e => {
              e.stopPropagation();
              // Cycle color labels
              const idx = LAYER_COLORS.indexOf(layer.colorLabel);
              const next = LAYER_COLORS[(idx + 1) % LAYER_COLORS.length];
              updateLayer(layerId, { colorLabel: next });
            }}
            title="Click to change color label"
          />

          {/* Layer type icon */}
          <Icon size={11} className={isSelected ? 'text-[#a08fff]' : 'text-[#5a5a70]'} />

          {/* Layer name */}
          <LayerName
            layerId={layerId}
            name={layer.name}
            isSelected={isSelected}
            onRename={name => updateLayer(layerId, { name })}
          />

          {/* Controls */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className={`w-5 h-5 flex items-center justify-center rounded text-2xs ${layer.solo ? 'text-[#f0a030]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={e => { e.stopPropagation(); updateLayer(layerId, { solo: !layer.solo }); }}
              title="Solo"
            >S</button>
            <button
              className={`w-5 h-5 flex items-center justify-center rounded ${layer.visible ? 'text-[#9090a8] hover:text-[#f0f0f5]' : 'text-[#3a3a50]'}`}
              onClick={e => { e.stopPropagation(); updateLayer(layerId, { visible: !layer.visible }); }}
              title={layer.visible ? 'Hide' : 'Show'}
            >
              {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
            <button
              className={`w-5 h-5 flex items-center justify-center rounded ${layer.locked ? 'text-[#f0a030]' : 'text-[#3a3a50] hover:text-[#9090a8]'}`}
              onClick={e => { e.stopPropagation(); updateLayer(layerId, { locked: !layer.locked }); }}
              title={layer.locked ? 'Unlock' : 'Lock'}
            >
              {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {layer.children.map(childId => renderLayer(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Root layers — show top of stack first (reversed display)
  const rootLayers = [...(project.rootLayers || [])].reverse();

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Layers</span>
        <div className="flex items-center gap-1">
          <button
            className="btn-icon w-6 h-6"
            onClick={() => useEditorStore.getState().addLayer({
              name: 'New Layer', type: 'shape',
              fills: [{ enabled: true, type: 'solid', color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1, blendMode: 'normal' }],
              strokes: [],
            })}
            title="Add Layer"
          >
            <Plus size={13} />
          </button>
          <button
            className="btn-icon w-6 h-6"
            onClick={() => { if (selectedLayerIds.length > 0) removeLayers(selectedLayerIds); }}
            title="Delete Selected"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#2e2e3a] flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#22222a] rounded px-2 py-1">
          <Search size={11} className="text-[#5a5a70]" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#f0f0f5] placeholder-[#5a5a70] outline-none"
          />
          {searchQuery && (
            <button className="text-[#5a5a70] hover:text-[#9090a8]" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[#2e2e3a] flex-shrink-0">
        {['all', 'shape', 'group', 'svg', 'lottie'].map(type => (
          <button
            key={type}
            className={`px-1.5 py-0.5 text-2xs rounded transition-colors capitalize ${
              filterType === type ? 'bg-[#7b68ee]/20 text-[#a08fff]' : 'text-[#5a5a70] hover:text-[#9090a8]'
            }`}
            onClick={() => setFilterType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Layers list — virtualized for performance with many layers */}
      <div className="flex-1 overflow-hidden"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const sourceId = dragLayerId.current;
          if (sourceId && project.rootLayers.includes(sourceId)) {
            saveHistory('Move Layer to Top');
            reorderLayer(sourceId, 0);
          }
          setDragOverId(null);
        }}
      >
        {rootLayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <Layers size={24} className="text-[#3a3a50]" />
            <p className="text-xs text-[#5a5a70]">No layers yet</p>
            <p className="text-2xs text-[#3a3a50]">Draw a shape or import an SVG to start</p>
          </div>
        ) : (
          // For small lists (<100), render directly; for large lists use VirtualList
          rootLayers.length <= 100 ? (
            <div className="h-full overflow-y-auto">
              {rootLayers.map(id => renderLayer(id))}
            </div>
          ) : (
            // Flatten hierarchy for virtual rendering
            <FlattenedVirtualLayerList
              project={project}
              rootLayers={rootLayers}
              renderLayer={renderLayer}
              expanded={expanded}
            />
          )
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-[#2e2e3a] flex-shrink-0">
        <button className="btn-icon w-6 h-6" onClick={() => selectedLayerIds.length > 0 && duplicateLayer(selectedLayerIds[0])} title="Duplicate">
          <Copy size={11} />
        </button>
        <button
          className="btn-icon w-6 h-6"
          onClick={() => selectedLayerIds.length > 1 && groupLayers(selectedLayerIds)}
          title="Group Selected"
        >
          <Folder size={11} />
        </button>
        <button
          className="btn-icon w-6 h-6"
          onClick={() => {
            const layer = project.layers[selectedLayerIds[0]];
            if (layer?.type === 'group') ungroupLayer(selectedLayerIds[0]);
          }}
          title="Ungroup"
        >
          <Layers size={11} />
        </button>
        <div className="flex-1" />
        <button className="btn-icon w-6 h-6" onClick={() => selectedLayerIds[0] && moveLayerUp(selectedLayerIds[0])} title="Move Up"><ArrowUp size={11} /></button>
        <button className="btn-icon w-6 h-6" onClick={() => selectedLayerIds[0] && moveLayerDown(selectedLayerIds[0])} title="Move Down"><ArrowDown size={11} /></button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <LayerContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}

// ─── Flattened virtual layer list for large projects ──────────────────────────
function FlattenedVirtualLayerList({ project, rootLayers, renderLayer, expanded }) {
  // Flatten the layer hierarchy into a flat array respecting expand/collapse
  const flatItems = useMemo(() => {
    const result = [];
    const flatten = (ids, depth) => {
      ids.forEach(id => {
        result.push({ id, depth });
        const layer = project.layers[id];
        if (layer?.children?.length > 0 && expanded[id] !== false) {
          flatten(layer.children, depth + 1);
        }
      });
    };
    flatten(rootLayers, 0);
    return result;
  }, [rootLayers, project.layers, expanded]);

  return (
    <VirtualList
      items={flatItems}
      itemHeight={28}
      className="h-full"
      renderItem={(item) => renderLayer(item.id, item.depth)}
    />
  );
}

// ─── Layer Name inline edit ───────────────────────────────────────────────────
function LayerName({ layerId, name, isSelected, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditing(true);
    setValue(name);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const finishEdit = () => {
    setEditing(false);
    if (value.trim()) onRename(value.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={finishEdit}
        onKeyDown={e => {
          if (e.key === 'Enter') finishEdit();
          if (e.key === 'Escape') setEditing(false);
          e.stopPropagation();
        }}
        className="flex-1 bg-[#22222a] text-xs text-[#f0f0f5] outline-none rounded px-1"
        onClick={e => e.stopPropagation()}
        autoFocus
      />
    );
  }

  return (
    <span
      className={`flex-1 text-xs truncate cursor-pointer ${isSelected ? 'text-[#f0f0f5]' : 'text-[#b0b0c0]'}`}
      onDoubleClick={startEdit}
      title={`${name} (double-click to rename)`}
    >
      {name}
    </span>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function LayerContextMenu({ x, y, layerId, onClose }) {
  const {
    selectedLayerIds, removeLayers, duplicateLayer, groupLayers, ungroupLayer,
    updateLayer, project, moveLayerUp, moveLayerDown, saveHistory,
  } = useEditorStore();

  const layer = project.layers[layerId];

  const doAction = (fn) => { fn(); onClose(); };

  const items = [
    { label: 'Duplicate', action: () => doAction(() => duplicateLayer(layerId)) },
    { label: selectedLayerIds.length > 1 ? `Group ${selectedLayerIds.length} layers` : 'Group', action: () => doAction(() => groupLayers(selectedLayerIds.includes(layerId) ? selectedLayerIds : [layerId])) },
    layer?.type === 'group' && { label: 'Ungroup', action: () => doAction(() => ungroupLayer(layerId)) },
    { separator: true },
    { label: 'Move Up', action: () => doAction(() => moveLayerUp(layerId)) },
    { label: 'Move Down', action: () => doAction(() => moveLayerDown(layerId)) },
    { separator: true },
    { label: layer?.locked ? 'Unlock' : 'Lock', action: () => doAction(() => updateLayer(layerId, { locked: !layer?.locked })) },
    { label: layer?.visible ? 'Hide' : 'Show', action: () => doAction(() => updateLayer(layerId, { visible: !layer?.visible })) },
    { separator: true },
    { label: 'Color Label', submenu: true, colors: LAYER_COLORS },
    { separator: true },
    { label: 'Delete', action: () => doAction(() => removeLayers([layerId])), danger: true },
  ].filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 py-1 rounded-md shadow-popup min-w-[170px]"
        style={{ left: Math.min(x, window.innerWidth - 180), top: Math.min(y, window.innerHeight - 200), background: '#1a1a22', border: '1px solid #3a3a50' }}
      >
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} className="my-1 mx-2 border-t border-[#2e2e3a]" />
          ) : item.submenu ? (
            <div key={i} className="px-3 py-1.5">
              <div className="text-2xs text-[#5a5a70] mb-1.5">Color Label</div>
              <div className="flex flex-wrap gap-1">
                {item.colors.map(color => (
                  <button
                    key={color}
                    className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
                    style={{ background: color }}
                    onClick={() => { updateLayer(layerId, { colorLabel: color }); onClose(); }}
                  />
                ))}
                <button
                  className="w-5 h-5 rounded-full border-2 border-[#3a3a50] text-2xs text-[#5a5a70] flex items-center justify-center hover:border-[#5a5a70]"
                  onClick={() => { updateLayer(layerId, { colorLabel: null }); onClose(); }}
                  title="No color"
                >✕</button>
              </div>
            </div>
          ) : (
            <button
              key={i}
              className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors ${
                item.danger ? 'text-[#f04060] hover:bg-[#f04060]/10' : 'text-[#d0d0e0] hover:bg-[#7b68ee]/20'
              }`}
              onClick={item.action}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
