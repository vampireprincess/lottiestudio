import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from './stores/editorStore.js';
import { MainLayout } from './components/MainLayout.jsx';
import { WelcomeScreen, useWelcomeScreen } from './components/onboarding/WelcomeScreen.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { createAutosave, getLatestAutosave, getPref } from './db/index.js';

export default function App() {
  const { project, darkMode, saveHistory, loadProject } = useEditorStore();
  const autosaveRef = useRef(null);
  const projectRef = useRef(project);
  const { show: showWelcome, close: closeWelcome } = useWelcomeScreen();
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);

  useEffect(() => { projectRef.current = project; }, [project]);

  // Apply dark/light class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Autosave — configurable interval, applies immediately when changed
  useEffect(() => {
    const doSave = () => {
      const p = projectRef.current;
      if (p?.id) createAutosave(p.id, p, 'autosave').catch(console.warn);
    };

    const startInterval = (ms) => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
      autosaveRef.current = setInterval(doSave, ms);
    };

    // Load preference and start
    getPref('autosaveInterval', 30).then(secs => {
      startInterval(Math.max(10, Number(secs) || 30) * 1000);
    }).catch(() => startInterval(30000));

    // Listen for immediate interval changes from PreferencesModal
    const handleIntervalChange = (e) => {
      const secs = Math.max(10, e.detail?.seconds || 30);
      startInterval(secs * 1000);
    };
    window.addEventListener('lottie-studio:autosave-interval', handleIntervalChange);

    return () => {
      clearInterval(autosaveRef.current);
      window.removeEventListener('lottie-studio:autosave-interval', handleIntervalChange);
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const store = useEditorStore.getState();
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey)  { e.preventDefault(); store.undo(); return; }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); store.openModal('saveProject'); return; }
      if (ctrl && e.key === 'o') { e.preventDefault(); store.openModal('openProject'); return; }
      if (ctrl && e.key === 'e') { e.preventDefault(); store.openModal('export'); return; }
      if (ctrl && e.key === 'd') { e.preventDefault(); const s = store.selectedLayerIds; if (s.length) store.duplicateLayer(s[0]); return; }
      if (ctrl && e.key === 'g') { e.preventDefault(); if (store.selectedLayerIds.length > 1) store.groupLayers(store.selectedLayerIds); return; }
      if (ctrl && e.key === 'a') { e.preventDefault(); store.selectLayers(Object.keys(store.project.layers)); return; }

      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedLayerIds.length > 0) {
        e.preventDefault();
        store.removeLayers(store.selectedLayerIds);
        return;
      }

      if (ctrl) return; // don't intercept other ctrl combos

      switch (e.key) {
        case 'v': case 'V': store.setTool('select'); break;
        case 'a': case 'A': store.setTool('editPoints'); break;
        case 'p': case 'P': store.setTool('pen'); break;
        case 'n': case 'N': store.setTool('pencil'); break;
        case 'r': case 'R': store.setTool('rect'); break;
        case 'o': case 'O': store.setTool('ellipse'); break;
        case 'l': case 'L': store.setTool('line'); break;
        case 'z': case 'Z': store.setTool('zoom'); break;
        case 'h': case 'H': store.setTool('hand'); break;
        case 'k': case 'K': store.toggleAutoKey(); break;
        case ' ':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.setFrame(store.currentFrame - (e.shiftKey ? 10 : 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.setFrame(store.currentFrame + (e.shiftKey ? 10 : 1));
          break;
        case 'Home': store.setFrame(0); break;
        case 'End': store.setFrame(store.project.totalFrames - 1); break;
        case 'Escape':
          store.deselectAll();
          store.closeModal();
          break;
        default: break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Save initial history snapshot
  useEffect(() => {
    saveHistory('Initial State');
  }, []); // eslint-disable-line

  // Check for autosave recovery on startup
  useEffect(() => {
    const checkRecovery = async () => {
      try {
        const latest = await getLatestAutosave(projectRef.current.id);
        if (latest && latest.timestamp > Date.now() - 86400000) { // within 24h
          const data = typeof latest.data === 'string' ? JSON.parse(latest.data) : latest.data;
          // Only show if autosave has more content than current empty project
          const savedLayerCount = Object.keys(data?.layers || {}).length;
          const currentLayerCount = Object.keys(projectRef.current.layers || {}).length;
          if (savedLayerCount > currentLayerCount && savedLayerCount > 0) {
            setRecoveryData({ save: latest, project: data });
            setShowRecoveryPrompt(true);
          }
        }
      } catch (e) {
        // No autosave found — normal for new users
      }
    };

    // Delay check so app renders first
    const timer = setTimeout(checkRecovery, 2000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  return (
    <div
      className="w-full h-full"
      style={{
        background: darkMode ? '#0f0f11' : '#f5f5fa',
        color: darkMode ? '#f0f0f5' : '#1a1a2e',
      }}
    >
      <ErrorBoundary name="MainLayout">
        <MainLayout />
      </ErrorBoundary>

      {showWelcome && (
        <ErrorBoundary name="WelcomeScreen">
          <WelcomeScreen onClose={closeWelcome} />
        </ErrorBoundary>
      )}

      {/* Autosave Recovery Prompt */}
      {showRecoveryPrompt && recoveryData && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-xl shadow-popup p-4 max-w-sm animate-fade-in"
          style={{ background: '#1a1a22', border: '1px solid #7b68ee' }}
        >
          <p className="text-sm font-semibold text-[#f0f0f5] mb-1">🛡️ Autosave Found</p>
          <p className="text-xs text-[#9090a8] mb-3">
            Found an autosave with {Object.keys(recoveryData.project?.layers || {}).length} layers
            from {new Date(recoveryData.save.timestamp).toLocaleTimeString()}. Restore it?
          </p>
          <div className="flex gap-2">
            <button
              className="flex-1 py-1.5 rounded text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
              onClick={() => {
                loadProject(recoveryData.project);
                setShowRecoveryPrompt(false);
              }}
            >
              Restore
            </button>
            <button
              className="flex-1 py-1.5 rounded text-xs text-[#9090a8] border border-[#2e2e3a] hover:text-[#f0f0f5]"
              onClick={() => setShowRecoveryPrompt(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
