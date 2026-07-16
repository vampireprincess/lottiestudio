import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { alignLayers, distributeLayers } from '../../engine/svg/alignment.js';
import {
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Space, MoveHorizontal, MoveVertical
} from 'lucide-react';

export function AlignDistributeBar() {
  const { selectedLayerIds, project, updateLayer, saveHistory } = useEditorStore();

  if (selectedLayerIds.length < 2) return null;

  const selectedLayers = selectedLayerIds.map(id => project.layers[id]).filter(Boolean);

  const doAlign = (alignment, relativeTo = 'selection') => {
    saveHistory(`Align ${alignment}`);
    const updated = alignLayers(selectedLayers, alignment, project.width, project.height, relativeTo);
    updated.forEach(layer => updateLayer(layer.id, { transform: layer.transform }));
  };

  const doDistribute = (direction) => {
    if (selectedLayers.length < 3) return;
    saveHistory(`Distribute ${direction}`);
    const updated = distributeLayers(selectedLayers, direction);
    updated.forEach(layer => updateLayer(layer.id, { transform: layer.transform }));
  };

  return (
    <div
      className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1 rounded-lg shadow-popup z-20"
      style={{ background: 'rgba(18,18,26,0.92)', border: '1px solid #2e2e3a', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-2xs text-[#5a5a70] mr-1">Align:</span>

      {[
        { icon: AlignLeft, label: 'Align Left', action: () => doAlign('left') },
        { icon: AlignCenter, label: 'Align Center H', action: () => doAlign('centerH') },
        { icon: AlignRight, label: 'Align Right', action: () => doAlign('right') },
      ].map(item => (
        <button key={item.label} title={item.label} className="btn-icon w-6 h-6" onClick={item.action}>
          <item.icon size={12} />
        </button>
      ))}

      <div className="w-px h-4 bg-[#2e2e3a] mx-0.5" />

      {[
        { icon: AlignStartVertical, label: 'Align Top', action: () => doAlign('top') },
        { icon: AlignCenterVertical, label: 'Align Middle V', action: () => doAlign('centerV') },
        { icon: AlignEndVertical, label: 'Align Bottom', action: () => doAlign('bottom') },
      ].map(item => (
        <button key={item.label} title={item.label} className="btn-icon w-6 h-6" onClick={item.action}>
          <item.icon size={12} />
        </button>
      ))}

      {selectedLayers.length >= 3 && (
        <>
          <div className="w-px h-4 bg-[#2e2e3a] mx-0.5" />
          <span className="text-2xs text-[#5a5a70] mr-1">Distrib:</span>
          <button title="Distribute Horizontally" className="btn-icon w-6 h-6" onClick={() => doDistribute('horizontal')}>
            <MoveHorizontal size={12} />
          </button>
          <button title="Distribute Vertically" className="btn-icon w-6 h-6" onClick={() => doDistribute('vertical')}>
            <MoveVertical size={12} />
          </button>
        </>
      )}

      <div className="w-px h-4 bg-[#2e2e3a] mx-0.5" />
      <span className="text-2xs text-[#5a5a70]">rel.</span>
      <select
        className="text-2xs bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-[#9090a8] outline-none"
        onChange={e => {/* store reference */}}
      >
        <option value="selection">Selection</option>
        <option value="canvas">Canvas</option>
        <option value="first">First</option>
      </select>
    </div>
  );
}
