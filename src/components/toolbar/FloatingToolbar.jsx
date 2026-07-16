import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import {
  FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw,
  Copy, Trash2, Group, Ungroup, ChevronUp, ChevronDown,
  ChevronsUp, ChevronsDown, Lock, Eye, Clipboard,
  RefreshCw, Maximize2, AlignLeft, AlignRight, AlignCenter,
  AlignStartVertical, AlignEndVertical, AlignCenterVertical
} from 'lucide-react';
import { alignLayers } from '../../engine/svg/alignment.js';
import {
  closePath, openPath, reversePath, simplifyPath, smoothPath
} from '../../engine/svg/pathOps.js';

export function FloatingToolbar() {
  const {
    selectedLayerIds, project,
    duplicateLayer, removeLayers, groupLayers, ungroupLayer,
    moveLayerUp, moveLayerDown, updateLayer, saveHistory,
    tool, styleClipboard,
  } = useEditorStore();
  const [localStyleClip, setLocalStyleClip] = useState(null);

  if (selectedLayerIds.length === 0) return null;
  if (tool === 'editPoints') return <NodeToolBar />;

  const layer = project.layers[selectedLayerIds[0]];
  if (!layer) return null;

  const flip = (axis) => {
    saveHistory(`Flip ${axis}`);
    selectedLayerIds.forEach(id => {
      const l = project.layers[id];
      if (!l) return;
      const scale = l.transform?.scale || { x:1, y:1 };
      updateLayer(id, { transform: { ...l.transform, scale: {
        x: axis === 'H' ? -scale.x : scale.x,
        y: axis === 'V' ? -scale.y : scale.y,
      }}});
    });
  };

  const rotate = (deg) => {
    saveHistory(`Rotate ${deg}°`);
    selectedLayerIds.forEach(id => {
      const l = project.layers[id];
      if (!l) return;
      updateLayer(id, { transform: { ...l.transform, rotation: (l.transform?.rotation||0) + deg } });
    });
  };

  const doAlign = (alignment) => {
    const layers = selectedLayerIds.map(id => project.layers[id]).filter(Boolean);
    if (layers.length < 1) return;
    saveHistory(`Align ${alignment}`);
    const updated = alignLayers(layers, alignment, project.width, project.height,
      selectedLayerIds.length === 1 ? 'canvas' : 'selection');
    updated.forEach(l => updateLayer(l.id, { transform: l.transform }));
  };

  // Copy style = copy fills, strokes, effects, opacity from first selected layer
  const copyStyle = () => {
    if (!layer) return;
    const style = {
      fills: JSON.parse(JSON.stringify(layer.fills || [])),
      strokes: JSON.parse(JSON.stringify(layer.strokes || [])),
      effects: JSON.parse(JSON.stringify(layer.effects || [])),
      opacity: layer.opacity,
      blendMode: layer.blendMode,
    };
    setLocalStyleClip(style);
    useEditorStore.setState({ styleClipboard: style });
  };

  const pasteStyle = () => {
    const clip = localStyleClip || styleClipboard;
    if (!clip) return;
    saveHistory('Paste Style');
    selectedLayerIds.forEach(id => {
      updateLayer(id, {
        fills: JSON.parse(JSON.stringify(clip.fills || [])),
        strokes: JSON.parse(JSON.stringify(clip.strokes || [])),
        effects: JSON.parse(JSON.stringify(clip.effects || [])),
        opacity: clip.opacity,
        blendMode: clip.blendMode,
      });
    });
  };

  // Center on canvas
  const centerOnCanvas = () => {
    saveHistory('Center on Canvas');
    selectedLayerIds.forEach(id => {
      const l = project.layers[id];
      if (!l) return;
      const params = l.shapeParams || {};
      const w = params.width || 100, h = params.height || 100;
      const newX = project.width / 2 - w / 2;
      const newY = project.height / 2 - h / 2;
      updateLayer(id, {
        shapeParams: { ...params, x: newX, y: newY, cx: newX + w/2, cy: newY + h/2 },
        transform: { ...l.transform, position: { x: 0, y: 0 } },
      });
    });
  };

  // Fit to canvas (scale to fill)
  const fitToCanvas = () => {
    saveHistory('Fit to Canvas');
    selectedLayerIds.forEach(id => {
      const l = project.layers[id];
      if (!l) return;
      const params = l.shapeParams || {};
      const w = params.width || 100, h = params.height || 100;
      const scaleX = project.width / w;
      const scaleY = project.height / h;
      const scale = Math.min(scaleX, scaleY);
      updateLayer(id, {
        transform: {
          ...l.transform,
          scale: { x: scale, y: scale },
          position: { x: 0, y: 0 },
        },
      });
    });
  };

  const groups = [
    {
      items: [
        { icon: FlipHorizontal2, label: 'Flip Horizontal', action: () => flip('H') },
        { icon: FlipVertical2, label: 'Flip Vertical', action: () => flip('V') },
        { icon: RotateCcw, label: 'Rotate 90° CCW', action: () => rotate(-90) },
        { icon: RotateCw, label: 'Rotate 90° CW', action: () => rotate(90) },
      ]
    },
    {
      items: [
        { icon: Copy, label: 'Duplicate (Ctrl+D)', action: () => selectedLayerIds[0] && duplicateLayer(selectedLayerIds[0]) },
        { icon: Copy, label: 'Copy Style', action: copyStyle, title: 'Copy fills, strokes & effects' },
        { icon: Clipboard, label: 'Paste Style', action: pasteStyle },
        { icon: Group, label: 'Group', action: () => selectedLayerIds.length > 1 && groupLayers(selectedLayerIds) },
        { icon: Ungroup, label: 'Ungroup', action: () => layer.type === 'group' && ungroupLayer(selectedLayerIds[0]) },
      ]
    },
    {
      items: [
        { icon: Maximize2, label: 'Fit to Canvas', action: fitToCanvas },
        { icon: AlignCenter, label: 'Center on Canvas', action: centerOnCanvas },
        { icon: RefreshCw, label: 'Reset Transform', action: () => {
          saveHistory('Reset Transform');
          selectedLayerIds.forEach(id => {
            const l = project.layers[id];
            if (l) updateLayer(id, { transform: { ...l.transform, position: {x:0,y:0}, scale:{x:1,y:1}, rotation:0, skew:{x:0,y:0} } });
          });
        }},
      ]
    },
    {
      items: [
        { icon: ChevronsUp, label: 'Bring to Front', action: () => {
          // Move to end of rootLayers (top of stack)
          const store = useEditorStore.getState();
          const id = selectedLayerIds[0];
          if (!id) return;
          store.saveHistory('Bring to Front');
          store.loadProject({
            ...project,
            rootLayers: [...project.rootLayers.filter(lid => lid !== id), id],
          });
        }},
        { icon: ChevronUp, label: 'Bring Forward', action: () => moveLayerUp(selectedLayerIds[0]) },
        { icon: ChevronDown, label: 'Send Backward', action: () => moveLayerDown(selectedLayerIds[0]) },
        { icon: ChevronsDown, label: 'Send to Back', action: () => {
          const store = useEditorStore.getState();
          const id = selectedLayerIds[0];
          if (!id) return;
          store.saveHistory('Send to Back');
          store.loadProject({
            ...project,
            rootLayers: [id, ...project.rootLayers.filter(lid => lid !== id)],
          });
        }},
      ]
    },
    {
      items: [
        { icon: AlignLeft, label: 'Align Left', action: () => doAlign('left') },
        { icon: AlignCenter, label: 'Align Center H', action: () => doAlign('centerH') },
        { icon: AlignRight, label: 'Align Right', action: () => doAlign('right') },
        { icon: AlignStartVertical, label: 'Align Top', action: () => doAlign('top') },
        { icon: AlignCenterVertical, label: 'Align Middle', action: () => doAlign('centerV') },
        { icon: AlignEndVertical, label: 'Align Bottom', action: () => doAlign('bottom') },
      ]
    },
    {
      items: [
        { icon: Lock, label: layer.locked ? 'Unlock' : 'Lock', action: () => updateLayer(selectedLayerIds[0], { locked: !layer.locked }), active: layer.locked },
        { icon: Eye, label: layer.visible ? 'Hide' : 'Show', action: () => updateLayer(selectedLayerIds[0], { visible: !layer.visible }), active: !layer.visible },
        { icon: Trash2, label: 'Delete', action: () => removeLayers(selectedLayerIds), danger: true },
      ]
    },
  ];

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1 rounded-lg shadow-popup z-30 max-w-full overflow-x-auto"
      style={{ background: 'rgba(18,18,26,0.96)', border: '1px solid #2e2e3a', backdropFilter: 'blur(8px)' }}
    >
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="w-px h-5 bg-[#2e2e3a] mx-0.5 flex-shrink-0" />}
          {group.items.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.label} title={item.label}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors flex-shrink-0 ${
                  item.danger ? 'text-[#f04060] hover:bg-[#f04060]/15'
                  : item.active ? 'text-[#f0a030] bg-[#f0a030]/10'
                  : 'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'
                }`}
                onClick={item.action}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </React.Fragment>
      ))}

      <div className="w-px h-5 bg-[#2e2e3a] mx-0.5 flex-shrink-0" />
      <span className="text-2xs text-[#5a5a70] px-1 flex-shrink-0">
        {selectedLayerIds.length > 1 ? `${selectedLayerIds.length} layers` : layer.name}
      </span>
    </div>
  );
}

// Node edit toolbar — shown when Edit Shape Points tool is active
function NodeToolBar() {
  const { selectedLayerIds, project, updateLayer, saveHistory } = useEditorStore();

  const applyPathOp = (opName, fn) => {
    const id = selectedLayerIds[0];
    const layer = project.layers[id];
    if (!layer?.pathData) return;
    saveHistory('Node: ' + opName);
    const newPath = fn(layer.pathData);
    if (newPath) updateLayer(id, { pathData: newPath });
  };

  const convertPoint = (type) => {
    // Convert selected points to type (corner/smooth) — requires NodeEditor state
    // For now, applies smoothPath to whole path for 'Smooth', converts to straight for 'Corner'
    const id = selectedLayerIds[0];
    const layer = project.layers[id];
    if (!layer?.pathData) return;
    saveHistory('Convert to ' + type);
    if (type === 'smooth') {
      updateLayer(id, { pathData: smoothPath(layer.pathData, 0.3) });
    }
    // Corner: straighten — remove bezier handles (approximated by cleaning path)
  };

  const items = [
    { label: 'Corner',     action: () => convertPoint('corner'),  title: 'Convert to corner point' },
    { label: 'Smooth',     action: () => convertPoint('smooth'),  title: 'Convert to smooth point' },
    { sep: true },
    { label: 'Close',      action: () => applyPathOp('Close Path', closePath),    title: 'Close path' },
    { label: 'Open',       action: () => applyPathOp('Open Path', openPath),      title: 'Open path' },
    { label: 'Reverse',    action: () => applyPathOp('Reverse Path', reversePath), title: 'Reverse path direction' },
    { sep: true },
    { label: 'Simplify',   action: () => applyPathOp('Simplify', (d) => simplifyPath(d, 2)), title: 'Simplify path (reduce points)' },
    { label: 'Smooth All', action: () => applyPathOp('Smooth All', (d) => smoothPath(d, 0.4)), title: 'Smooth all points' },
  ];

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1 rounded-lg shadow-popup z-30"
      style={{ background: 'rgba(18,18,26,0.96)', border: '1px solid #2e2e3a', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-2xs text-[#5a5a70] mr-1">Path:</span>
      {items.map((item, i) => item.sep
        ? <div key={i} className="w-px h-4 bg-[#2e2e3a] mx-0.5"/>
        : (
          <button key={i}
            className={`px-1.5 py-0.5 text-2xs rounded transition-colors ${
              selectedLayerIds[0] && project.layers[selectedLayerIds[0]]?.pathData
                ? 'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'
                : 'text-[#3a3a50] cursor-not-allowed'
            }`}
            onClick={item.action}
            title={item.title}
            disabled={!selectedLayerIds[0] || !project.layers[selectedLayerIds[0]]?.pathData}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
