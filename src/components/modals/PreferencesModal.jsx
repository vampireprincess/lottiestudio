import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from './ActiveModal.jsx';
import { getPref, setPref } from '../../db/index.js';
import { Settings } from 'lucide-react';

export function PreferencesModal({ onClose }) {
  const { darkMode, toggleDarkMode } = useEditorStore();
  const [autosaveInterval, setAutosaveInterval] = useState(30);
  const [showWelcome, setShowWelcome] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPref('autosaveInterval', 30).then(v => setAutosaveInterval(v));
    getPref('hideWelcome', false).then(v => setShowWelcome(!v));
  }, []);

  const savePrefs = async () => {
    await setPref('autosaveInterval', autosaveInterval);
    await setPref('hideWelcome', !showWelcome);

    // Notify App.jsx to update the interval immediately via custom event
    window.dispatchEvent(new CustomEvent('lottie-studio:autosave-interval', {
      detail: { seconds: autosaveInterval }
    }));

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-md">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-[#7b68ee]"/>
          <h2 className="text-base font-semibold text-[#f0f0f5]">Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Autosave */}
          <div>
            <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Autosave</p>
            <div>
              <label className="text-xs text-[#5a5a70] block mb-1">
                Autosave interval: {autosaveInterval}s
              </label>
              <input type="range" min={10} max={300} step={5}
                value={autosaveInterval}
                onChange={e => setAutosaveInterval(parseInt(e.target.value))}
                className="w-full h-1" style={{ accentColor: '#7b68ee' }}/>
              <div className="flex justify-between text-2xs text-[#3a3a50] mt-0.5">
                <span>10s</span><span>5min</span>
              </div>
              <p className="text-2xs text-[#5a5a70] mt-1">
                Note: interval change takes effect after page reload
              </p>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Appearance</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={darkMode}
                onChange={toggleDarkMode} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Dark Mode</span>
            </label>
          </div>

          {/* Onboarding */}
          <div>
            <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Onboarding</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showWelcome}
                onChange={e => setShowWelcome(e.target.checked)} className="accent-[#7b68ee]"/>
              <span className="text-xs text-[#9090a8]">Show Welcome Screen on startup</span>
            </label>
          </div>

          {/* About */}
          <div className="p-2.5 rounded bg-[#1a1a22] border border-[#2e2e3a]">
            <p className="text-2xs text-[#5a5a70]">
              Lottie Studio v1.0 · React + Vite + Tailwind · All data stored locally in IndexedDB
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary px-5 py-2 text-sm"
            onClick={savePrefs}
          >{saved ? '✓ Saved!' : 'Save'}</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
