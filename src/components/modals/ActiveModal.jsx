import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ImportSVGModal } from './ImportSVGModal.jsx';
import { ImportLottieModal } from '../import/ImportLottieModal.jsx';
import { ExportModalFull } from '../export/ExportModalFull.jsx';
import { AboutModal } from './AboutModal.jsx';
import { NewProjectModal } from './NewProjectModal.jsx';
import { ShortcutsModal } from './ShortcutsModal.jsx';
import { HelpModal } from './HelpModal.jsx';
import { RecoveryModal } from './RecoveryModal.jsx';
import { OpenProjectModal } from './OpenProjectModal.jsx';
import { SaveProjectModal } from './SaveProjectModal.jsx';
import { PreferencesModal } from './PreferencesModal.jsx';
import { AssetLibraryModal } from './AssetLibraryModal.jsx';

export function ActiveModal() {
  const { activeModal, closeModal } = useEditorStore();
  if (!activeModal) return null;

  const modals = {
    importSVG:    ImportSVGModal,
    importLottie: ImportLottieModal,
    export:       ExportModalFull,
    about:        AboutModal,
    newProject:   NewProjectModal,
    shortcuts:    ShortcutsModal,
    help:         HelpModal,
    recovery:     RecoveryModal,
    openProject:  OpenProjectModal,
    saveProject:  SaveProjectModal,
    preferences:        PreferencesModal,
    assetLibraryPopup:  AssetLibraryModal,
  };

  const ModalComponent = modals[activeModal];
  if (!ModalComponent) {
    return (
      <ModalBackdrop onClose={closeModal}>
        <div className="p-6">
          <h2 className="text-base font-semibold text-[#f0f0f5] mb-2">{activeModal}</h2>
          <p className="text-sm text-[#9090a8]">Coming soon.</p>
          <button className="btn-primary mt-4" onClick={closeModal}>Close</button>
        </div>
      </ModalBackdrop>
    );
  }

  return <ModalComponent onClose={closeModal}/>;
}

export function ModalBackdrop({ onClose, children, width = 'max-w-lg' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative ${width} w-full mx-4 rounded-xl shadow-popup animate-fade-in`}
        style={{ background: '#1a1a22', border: '1px solid #3a3a50' }}
      >
        {children}
      </div>
    </div>
  );
}
