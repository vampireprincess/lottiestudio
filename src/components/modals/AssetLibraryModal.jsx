import React from 'react';
import { ModalBackdrop } from './ActiveModal.jsx';
import { AssetLibrary } from '../assets/AssetLibrary.jsx';
import { Library } from 'lucide-react';

/**
 * Asset Library as a modal popup — opens from the top menu Library button.
 * Does not occupy permanent panel space.
 */
export function AssetLibraryModal({ onClose }) {
  return (
    <ModalBackdrop onClose={onClose} width="max-w-lg">
      <div className="flex flex-col" style={{ height: '75vh', maxHeight: 650 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e3a] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Library size={15} className="text-[#7b68ee]"/>
            <h2 className="text-sm font-semibold text-[#f0f0f5]">Asset Library</h2>
          </div>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AssetLibrary />
        </div>
      </div>
    </ModalBackdrop>
  );
}
