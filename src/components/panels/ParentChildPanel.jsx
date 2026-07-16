import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { Link2, Unlink, ChevronRight, MapPin } from 'lucide-react';

export function ParentChildPanel() {
  const { project, selectedLayerIds, updateLayer, saveHistory } = useEditorStore();
  const layer = project.layers[selectedLayerIds[0]];
  const [followDelay, setFollowDelay] = useState(0);
  const [followDamping, setFollowDamping] = useState(0);

  if (!layer) {
    return (
      <div className="p-3 text-xs text-[#5a5a70] text-center">
        Select a layer to set parent-child relationships
      </div>
    );
  }

  const currentParent = layer.parentId ? project.layers[layer.parentId] : null;
  const allLayers = Object.values(project.layers).filter(l => l.id !== layer.id);

  const setParent = (parentId) => {
    saveHistory('Set Parent');
    updateLayer(layer.id, {
      parentId: parentId || null,
      parentFollowPosition: true,
      parentFollowRotation: true,
      parentFollowScale: false,
      parentDelay: followDelay,
    });
  };

  const unparent = () => {
    saveHistory('Unparent');
    updateLayer(layer.id, { parentId: null });
  };

  return (
    <div className="p-3 space-y-3">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Parent layers control child layer transformations. The child inherits position, rotation, and scale from the parent.
      </div>

      {/* Current parent */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Current Parent</label>
        <div className="flex items-center gap-2 p-2 rounded border border-[#2e2e3a] bg-[#22222a]">
          {currentParent ? (
            <>
              <div className="w-2 h-2 rounded-full" style={{ background: currentParent.colorLabel || '#7b68ee' }} />
              <span className="text-xs text-[#f0f0f5] flex-1">{currentParent.name}</span>
              <button
                className="btn-icon w-5 h-5 text-[#f04060]"
                onClick={unparent}
                title="Remove parent"
              >
                <Unlink size={11} />
              </button>
            </>
          ) : (
            <span className="text-xs text-[#5a5a70] flex-1">None</span>
          )}
        </div>
      </div>

      {/* Set parent */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Set Parent Layer</label>
        <select
          value={layer.parentId || ''}
          onChange={e => setParent(e.target.value || null)}
          className="input w-full text-xs"
        >
          <option value="">No Parent</option>
          {allLayers.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
          ))}
        </select>
      </div>

      {/* Follow options */}
      {layer.parentId && (
        <div className="space-y-2">
          <p className="text-2xs text-[#5a5a70] font-semibold uppercase tracking-wider">Follow</p>

          <div className="space-y-1.5">
            {[
              { key: 'parentFollowPosition', label: 'Follow Position' },
              { key: 'parentFollowRotation', label: 'Follow Rotation' },
              { key: 'parentFollowScale', label: 'Follow Scale' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layer[opt.key] ?? true}
                  onChange={e => updateLayer(layer.id, { [opt.key]: e.target.checked })}
                  className="accent-[#7b68ee]"
                />
                <span className="text-xs text-[#9090a8]">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Delay */}
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Follow Delay (frames)</label>
            <input
              type="range" min={0} max={30} step={1}
              value={layer.parentDelay ?? 0}
              onChange={e => updateLayer(layer.id, { parentDelay: parseInt(e.target.value) })}
              className="w-full h-1" style={{ accentColor: '#7b68ee' }}
            />
            <div className="text-right text-2xs text-[#5a5a70]">{layer.parentDelay ?? 0} frames</div>
          </div>
        </div>
      )}

      {/* Children list — layers that have this layer as parent */}
      {(() => {
        const children = Object.values(project.layers).filter(l => l.parentId === layer.id);
        if (children.length === 0) return null;
        return (
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Child Layers ({children.length})</label>
            <div className="space-y-0.5">
              {children.map(child => (
                <div key={child.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#22222a] text-xs text-[#9090a8]">
                  <ChevronRight size={10} className="text-[#5a5a70]"/>
                  <span className="flex-1">{child.name}</span>
                  <span className="text-2xs text-[#5a5a70]">{child.type}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Attach point config */}
      <div>
        <label className="text-2xs text-[#5a5a70] block mb-1">Attachment Points</label>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'Anchor',       key: 'anchor' },
            { label: 'Pivot',        key: 'pivot' },
            { label: 'Hang Point',   key: 'hangPoint' },
            { label: 'Follow Point', key: 'followPoint' },
            { label: 'Growth Origin',key: 'growthOrigin' },
            { label: 'Path Start',   key: 'pathStart' },
          ].map(({ label, key }) => {
            const hasPoint = !!(layer.attachmentPoints?.[key]);
            return (
              <button key={key}
                className={`py-1 text-2xs border rounded transition-colors ${hasPoint ? 'border-[#7b68ee]/40 text-[#a08fff] bg-[#7b68ee]/8' : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8] hover:border-[#5a5a70]'}`}
                onClick={() => {
                  const layerId = selectedLayerIds[0];
                  if (!layerId) return;
                  const l = project.layers[layerId];
                  if (!l) return;
                  // Set to current layer's position
                  const pos = l.transform?.position || { x: 0, y: 0 };
                  useEditorStore.getState().setAttachmentPoint(layerId, key, pos);
                }}
                title={`Set ${label} at current layer position. ${hasPoint ? '(Set: ' + JSON.stringify(layer.attachmentPoints[key]) + ')' : ''}`}
              >
                {hasPoint ? '✓' : '+'} {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
