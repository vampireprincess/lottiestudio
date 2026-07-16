import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { saveProject, addRecentFile } from '../../db/index.js';
import { Save, CheckCircle } from 'lucide-react';

export function SaveProjectModal({ onClose }) {
  const { project, updateProjectSettings } = useEditorStore();
  const [name, setName] = useState(project.name || 'Untitled Project');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = { ...project, name, updatedAt: Date.now() };
      updateProjectSettings({ name });
      await saveProject(updated);
      await addRecentFile(project.id, name);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1500);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-sm">
      <div className="p-5">
        <h2 className="text-base font-semibold text-[#f0f0f5] mb-4">Save Project</h2>

        <div className="mb-4">
          <label className="text-xs text-[#5a5a70] block mb-1">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input w-full text-sm"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a] mb-4">
          Saves to browser IndexedDB (local storage). Project persists between sessions.
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold text-white transition-all"
            style={{ background: saved ? '#30d060' : 'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={14}/> {saving ? 'Saving...' : 'Save'}</>}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
