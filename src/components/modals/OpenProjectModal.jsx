import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { listProjects, getRecentFiles } from '../../db/index.js';
import { Film, Clock, Folder, Plus, Trash2 } from 'lucide-react';

export function OpenProjectModal({ onClose }) {
  const { loadProject, openModal, project } = useEditorStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recent');

  useEffect(() => {
    listProjects().then(list => {
      setProjects(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const [pendingProject, setPendingProject] = useState(null);

  const openProject = (proj) => {
    if (Object.keys(project.layers).length > 0) {
      setPendingProject(proj);
      return;
    }
    loadProject(proj);
    onClose();
  };

  const confirmOpen = () => {
    if (pendingProject) {
      loadProject(pendingProject);
      onClose();
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-2xl">
      <div className="p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Open Project</h2>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2e2e3a] flex-shrink-0 mb-3">
          {[{id:'recent',label:'Recent',icon:Clock},{id:'all',label:'All Projects',icon:Folder}].map(t => (
            <button key={t.id}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${tab===t.id?'text-[#a08fff] border-b-2 border-[#7b68ee]':'text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={() => setTab(t.id)}>
              <t.icon size={12}/>{t.label}
            </button>
          ))}
        </div>

        {/* Confirm open */}
        {pendingProject && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f0a030]/10 border border-[#f0a030]/30 rounded-lg mb-2 flex-shrink-0">
            <span className="text-xs text-[#f0a030] flex-1">
              Open "{pendingProject.name}"? Unsaved changes will be lost.
            </span>
            <button className="px-2 py-0.5 text-2xs font-semibold rounded bg-[#f0a030] text-white" onClick={confirmOpen}>Open</button>
            <button className="px-2 py-0.5 text-2xs rounded border border-[#3a3a50] text-[#9090a8]" onClick={() => setPendingProject(null)}>Cancel</button>
          </div>
        )}

        {/* Project list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <div className="text-center py-8 text-xs text-[#5a5a70]">Loading projects...</div>}

          {!loading && projects.length === 0 && (
            <div className="text-center py-12">
              <Film size={32} className="mx-auto text-[#3a3a50] mb-3"/>
              <p className="text-sm text-[#5a5a70]">No saved projects yet</p>
              <p className="text-xs text-[#3a3a50] mt-1">Create a new project to get started</p>
              <button className="btn-primary mt-4 px-4 py-2 text-sm flex items-center gap-2 mx-auto"
                onClick={() => { onClose(); openModal('newProject'); }}>
                <Plus size={13}/> New Project
              </button>
            </div>
          )}

          {!loading && projects.map(proj => (
            <div key={proj.id}
              className="flex items-center gap-3 p-3 rounded border border-[#2e2e3a] hover:border-[#7b68ee]/40 hover:bg-[#7b68ee]/5 cursor-pointer transition-colors group"
              onClick={() => openProject(proj)}>

              {/* Thumbnail placeholder */}
              <div className="w-16 h-10 rounded border border-[#2e2e3a] bg-[#22222a] flex items-center justify-center flex-shrink-0">
                <Film size={16} className="text-[#5a5a70]"/>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f5] font-medium truncate">{proj.name || 'Untitled'}</p>
                <p className="text-2xs text-[#5a5a70]">
                  {proj.width}×{proj.height} · {proj.fps}fps · {((proj.totalFrames||180)/(proj.fps||30)).toFixed(1)}s
                </p>
                <p className="text-2xs text-[#3a3a50]">
                  {Object.keys(proj.layers||{}).length} layers · Updated {formatDate(proj.updatedAt)}
                </p>
              </div>

              <button
                className="btn-primary px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={e => { e.stopPropagation(); openProject(proj); }}>
                Open
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#2e2e3a] flex-shrink-0 mt-3">
          <button className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1"
            onClick={() => { onClose(); openModal('newProject'); }}>
            <Plus size={11}/> New Project
          </button>
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
