import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { Flag, Trash2, Play, Edit3, Repeat, Download, Plus } from 'lucide-react';

const SEGMENT_COLORS = ['#f0a030','#7b68ee','#30d060','#f04060','#30a0f0','#f06030'];

export function MarkersPanel() {
  const {
    project, currentFrame, setFrame, setWorkArea,
    addMarker, removeMarker, updateMarker,
  } = useEditorStore();

  const [editingId, setEditingId] = useState(null);
  const markers = [...(project.markers || [])].sort((a,b) => a.frame - b.frame);

  const handlePreviewSegment = (marker) => {
    setWorkArea(marker.frame, marker.endFrame ?? marker.frame + 30);
    setFrame(marker.frame);
  };

  const addNamedSegment = (name, isLoop = false) => {
    addMarker({
      name,
      frame: currentFrame,
      endFrame: Math.min(project.totalFrames - 1, currentFrame + 30),
      color: isLoop ? '#30d060' : '#7b68ee',
      isLoop,
      exportFlag: true,
    });
  };

  return (
    <div className="space-y-2 p-3">
      {/* Quick add */}
      <div className="flex gap-1 flex-wrap">
        {[
          { name: 'Intro', color: '#30a0f0' },
          { name: 'Loop',  color: '#30d060', isLoop: true },
          { name: 'Outro', color: '#f04060' },
          { name: 'Idle',  color: '#7b68ee' },
          { name: 'Hover', color: '#f0a030' },
        ].map(s => (
          <button key={s.name}
            className="px-2 py-0.5 text-2xs rounded border border-[#2e2e3a] hover:border-[#5a5a70] transition-colors"
            style={{ color: s.color }}
            onClick={() => addNamedSegment(s.name, s.isLoop)}
          >
            + {s.name}
          </button>
        ))}
        <button className="btn-icon w-6 h-6" onClick={() => addMarker({ name: 'Marker', exportFlag: false })} title="Add blank marker">
          <Plus size={11}/>
        </button>
      </div>

      {markers.length === 0 && (
        <div className="text-center py-4 text-xs text-[#5a5a70]">
          No markers yet. Add named segments above or use the Flag button in the timeline toolbar.
        </div>
      )}

      {/* Marker list */}
      {markers.map(marker => (
        <div key={marker.id} className="rounded border border-[#2e2e3a] overflow-hidden">
          {editingId === marker.id ? (
            <MarkerEditor marker={marker} onUpdate={updates => { updateMarker(marker.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} totalFrames={project.totalFrames}/>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5">
              {/* Color dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: marker.color || '#f0a030' }}/>

              {/* Name + frame */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#f0f0f5] font-medium truncate">{marker.name}</span>
                  {marker.isLoop && <span className="text-2xs text-[#30d060] bg-[#30d060]/10 px-1 rounded">Loop</span>}
                  {marker.exportFlag && <span className="text-2xs text-[#7b68ee] bg-[#7b68ee]/10 px-1 rounded">Export</span>}
                </div>
                <div className="text-2xs text-[#5a5a70]">
                  {marker.frame}–{marker.endFrame ?? marker.frame} fr
                  {' · '}{((marker.endFrame ?? marker.frame) - marker.frame) / project.fps}s
                </div>
              </div>

              {/* Actions */}
              <button className="btn-icon w-6 h-6 text-[#30a0f0]" title="Preview segment"
                onClick={() => handlePreviewSegment(marker)}>
                <Play size={10}/>
              </button>
              <button className="btn-icon w-6 h-6" title="Edit marker" onClick={() => setEditingId(marker.id)}>
                <Edit3 size={10}/>
              </button>
              <button className="btn-icon w-6 h-6 text-[#f04060]" title="Delete marker"
                onClick={() => removeMarker(marker.id)}>
                <Trash2 size={10}/>
              </button>
            </div>
          )}
        </div>
      ))}

      {markers.length > 0 && (
        <div className="text-2xs text-[#5a5a70] text-center pt-1">
          {markers.filter(m => m.exportFlag).length} segment(s) marked for export
        </div>
      )}
    </div>
  );
}

function MarkerEditor({ marker, onUpdate, onCancel, totalFrames }) {
  const [name, setName] = useState(marker.name);
  const [frame, setFrame] = useState(marker.frame);
  const [endFrame, setEndFrame] = useState(marker.endFrame ?? marker.frame + 30);
  const [color, setColor] = useState(marker.color || '#f0a030');
  const [isLoop, setIsLoop] = useState(marker.isLoop || false);
  const [exportFlag, setExportFlag] = useState(marker.exportFlag || false);

  return (
    <div className="p-2 space-y-2 bg-[#1a1a22]">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        className="input w-full text-xs" placeholder="Segment name"/>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-0.5">Start Frame</label>
          <input type="number" value={frame} min={0} max={totalFrames-1}
            onChange={e => setFrame(parseInt(e.target.value)||0)}
            className="input w-full text-xs"/>
        </div>
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-0.5">End Frame</label>
          <input type="number" value={endFrame} min={frame} max={totalFrames-1}
            onChange={e => setEndFrame(parseInt(e.target.value)||frame)}
            className="input w-full text-xs"/>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <label className="text-2xs text-[#5a5a70]">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-5 rounded cursor-pointer border border-[#3a3a50]"/>
        </div>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={isLoop} onChange={e => setIsLoop(e.target.checked)} className="accent-[#7b68ee]"/>
          <span className="text-2xs text-[#9090a8] flex items-center gap-0.5"><Repeat size={9}/> Loop</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={exportFlag} onChange={e => setExportFlag(e.target.checked)} className="accent-[#7b68ee]"/>
          <span className="text-2xs text-[#9090a8] flex items-center gap-0.5"><Download size={9}/> Export</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary flex-1 py-1 text-2xs"
          onClick={() => onUpdate({ name, frame, endFrame, color, isLoop, exportFlag })}>Save</button>
        <button className="btn-ghost flex-1 py-1 text-2xs border border-[#2e2e3a] rounded" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
