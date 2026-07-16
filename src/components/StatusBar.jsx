import React from 'react';
import { useEditorStore } from '../stores/editorStore.js';
import { Save, Circle, Zap, Palette } from 'lucide-react';

export function StatusBar({ showAnimPanel, showColorPanel }) {
  const { project, currentFrame, canvasZoom, tool, selectedLayerIds, autoKey } = useEditorStore();
  const selectedLayer = selectedLayerIds[0] ? project.layers[selectedLayerIds[0]] : null;
  const kfCount = project.keyframes?.length || 0;

  return (
    <div className="flex items-center gap-4 px-3 py-0.5 border-t border-[#2e2e3a] text-2xs flex-shrink-0 overflow-hidden"
      style={{ background: '#0a0a10', color: '#5a5a70' }}>
      <span>Tool: <span className="text-[#9090a8] capitalize">{tool}</span></span>
      {selectedLayer && (
        <span>
          <span className="text-[#9090a8]">{selectedLayer.name}</span>
          {selectedLayerIds.length > 1 && <span className="text-[#5a5a70]"> +{selectedLayerIds.length-1}</span>}
        </span>
      )}
      <span>Frame: <span className="text-[#9090a8] font-mono">{currentFrame}</span>/<span className="font-mono">{project.totalFrames-1}</span></span>
      <span>Zoom: <span className="text-[#9090a8]">{Math.round(canvasZoom*100)}%</span></span>
      <span>{kfCount} keyframes</span>
      {autoKey && <span className="text-[#f04060] flex items-center gap-1"><Circle size={6} fill="#f04060"/> AUTO-KEY</span>}
      <div className="flex-1"/>
      {showAnimPanel && <span className="flex items-center gap-1 text-[#7b68ee]"><Zap size={9}/>Anim</span>}
      {showColorPanel && <span className="flex items-center gap-1 text-[#7b68ee]"><Palette size={9}/>Color</span>}
      <span>{project.fps}fps</span>
      <span>{project.width}×{project.height}</span>
      <span>{Object.keys(project.layers).length} layers</span>
      <span className="flex items-center gap-1 text-[#30d060]"><Save size={9}/> Autosave</span>
    </div>
  );
}
