import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { getLatestAutosave, getAutosaves } from '../../db/index.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { Shield, Clock, RotateCcw } from 'lucide-react';

export function RecoveryModal({ onClose }) {
  const { loadProject, project } = useEditorStore();
  const [autosaves, setAutosaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAutosaves(project.id).then(saves => {
      // Show most recent first
      setAutosaves([...saves].reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [project.id]);

  const restoreAutosave = (save) => {
    try {
      const data = typeof save.data === 'string' ? JSON.parse(save.data) : save.data;
      loadProject(data);
      onClose();
    } catch (e) {
      console.error('Restore failed:', e);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-md">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#7b68ee]/20 flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-[#7b68ee]"/>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#f0f0f5]">Recovery & Autosaves</h2>
            <p className="text-xs text-[#5a5a70]">Restore a previous version of your project</p>
          </div>
        </div>

        {loading && <div className="text-xs text-[#5a5a70] text-center py-6">Loading autosaves...</div>}

        {!loading && autosaves.length === 0 && (
          <div className="text-center py-6">
            <Clock size={24} className="mx-auto text-[#3a3a50] mb-2"/>
            <p className="text-xs text-[#5a5a70]">No autosaves found for this project</p>
            <p className="text-2xs text-[#3a3a50] mt-1">Autosaves are created every 30 seconds automatically</p>
          </div>
        )}

        {!loading && autosaves.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {autosaves.map((save, i) => {
              let projectData;
              try { projectData = typeof save.data === 'string' ? JSON.parse(save.data) : save.data; } catch(e) {}
              const layerCount = projectData ? Object.keys(projectData.layers || {}).length : '?';
              const kfCount = projectData?.keyframes?.length || 0;
              return (
                <div key={save.id} className="flex items-center gap-3 p-2.5 rounded border border-[#2e2e3a] hover:border-[#5a5a70] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#f0f0f5]">{formatTime(save.timestamp)}</span>
                      {i === 0 && <span className="text-2xs bg-[#30d060]/15 text-[#30d060] px-1.5 py-0.5 rounded">Latest</span>}
                    </div>
                    <p className="text-2xs text-[#5a5a70] mt-0.5">
                      {layerCount} layers · {kfCount} keyframes · {save.label}
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
                    onClick={() => restoreAutosave(save)}
                  >
                    <RotateCcw size={11}/> Restore
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
