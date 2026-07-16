import React, { useState } from 'react';
import { useEditorStore } from '../stores/editorStore.js';
import { Film, Download, Play, Pause, SkipBack, SkipForward, Sun, Moon, Palette, Zap, Library, BookOpen, Settings } from 'lucide-react';

const WORKSPACES = [
  { id: 'animation', label: 'Animation' },
  { id: 'svgEditing', label: 'SVG Editing' },
  { id: 'timelineFocus', label: 'Timeline Focus' },
  { id: 'export', label: 'Export' },
  { id: 'compact', label: 'Compact' },
];

export function TopMenuBar({ onToggleColorPanel, onToggleAnimPanel }) {
  const {
    project, darkMode, toggleDarkMode, undo, redo,
    historyIndex, history, workspaceLayout, setWorkspaceLayout,
    isPlaying, togglePlay, currentFrame, setFrame,
    togglePanel, panels, openModal, autoKey, toggleAutoKey,
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState(null);
  const close = () => setActiveMenu(null);

  const menus = {
    File: [
      { label: 'New Project', shortcut: 'Ctrl+N', action: () => { openModal('newProject'); close(); } },
      { label: 'Open Project...', shortcut: 'Ctrl+O', action: () => { openModal('openProject'); close(); } },
      { sep: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: () => { openModal('saveProject'); close(); } },
      { sep: true },
      { label: 'Import SVG...', action: () => { openModal('importSVG'); close(); } },
      { label: 'Import Lottie...', action: () => { openModal('importLottie'); close(); } },
      { sep: true },
      { label: 'Export...', shortcut: 'Ctrl+E', action: () => { openModal('export'); close(); } },
      { sep: true },
      { label: 'Recover Autosave...', action: () => { openModal('recovery'); close(); } },
      { label: 'Preferences...', action: () => { openModal('preferences'); close(); } },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { undo(); close(); }, disabled: historyIndex <= 0 },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: () => { redo(); close(); }, disabled: historyIndex >= history.length - 1 },
      { sep: true },
      { label: 'Duplicate', shortcut: 'Ctrl+D', action: close },
      { label: 'Select All', shortcut: 'Ctrl+A', action: close },
    ],
    View: [
      { label: 'Layers', action: () => { togglePanel('layers'); close(); }, checked: panels.layers.visible },
      { label: 'Properties', action: () => { togglePanel('properties'); close(); }, checked: panels.properties.visible },
      { label: 'Timeline', action: () => { togglePanel('timeline'); close(); }, checked: panels.timeline.visible },
      { label: 'Assets', action: () => { togglePanel('assets'); close(); }, checked: panels.assets.visible },
      { sep: true },
      { label: 'Color & Gradients', action: () => { onToggleColorPanel?.(); close(); } },
      { label: 'Animation Tools', action: () => { onToggleAnimPanel?.(); close(); } },
      { sep: true },
      { label: 'Dark Mode', action: () => { toggleDarkMode(); close(); }, checked: darkMode },
    ],
    Animation: [
      { label: 'Play / Pause', shortcut: 'Space', action: () => { togglePlay(); close(); } },
      { label: 'Go to Start', shortcut: 'Home', action: () => { setFrame(0); close(); } },
      { label: 'Go to End', shortcut: 'End', action: () => { setFrame(project.totalFrames-1); close(); } },
      { sep: true },
      { label: 'Auto-Key', shortcut: 'K', action: () => { toggleAutoKey(); close(); }, checked: autoKey },
      { sep: true },
      { label: 'Animation Presets', action: () => { onToggleAnimPanel?.(); close(); } },
      { label: 'Easing Editor', action: () => { onToggleAnimPanel?.(); close(); } },
    ],
    Help: [
      { label: 'Help Documentation', action: () => { openModal('help'); close(); } },
      { label: 'Keyboard Shortcuts', action: () => { openModal('shortcuts'); close(); } },
      { sep: true },
      { label: 'About', action: () => { openModal('about'); close(); } },
    ],
  };

  return (
    <div className="flex items-center h-10 border-b border-[#2e2e3a] select-none flex-shrink-0 z-50" style={{ background: '#12121a' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mr-1 flex-shrink-0">
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7b68ee, #00c8ff)' }}>
          <Film size={13} color="white"/>
        </div>
        <span className="text-xs font-bold text-[#f0f0f5] hidden md:block">Lottie Studio</span>
      </div>

      {/* Menus */}
      {Object.entries(menus).map(([name, items]) => (
        <div key={name} className="relative">
          <button
            className={`px-2.5 h-10 text-xs transition-colors ${activeMenu===name?'bg-[#7b68ee]/20 text-[#a08fff]':'text-[#9090a8] hover:text-[#f0f0f5] hover:bg-[#22222a]'}`}
            onMouseDown={e => { e.stopPropagation(); setActiveMenu(activeMenu===name?null:name); }}
          >{name}</button>

          {activeMenu===name && (
            <>
              <div className="fixed inset-0 z-40" onClick={close}/>
              <div className="absolute top-full left-0 mt-0.5 py-1 rounded-lg shadow-popup z-50 min-w-[190px] animate-fade-in" style={{ background:'#1a1a22', border:'1px solid #3a3a50' }}>
                {items.map((item, i) => item.sep
                  ? <div key={i} className="my-1 mx-2 border-t border-[#2e2e3a]"/>
                  : (
                    <button key={i}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left ${item.disabled?'text-[#3a3a50] cursor-not-allowed':'text-[#d0d0e0] hover:bg-[#7b68ee]/20 hover:text-white'}`}
                      onClick={item.disabled?undefined:item.action}
                      disabled={item.disabled}
                    >
                      <span className="flex items-center gap-2">
                        {item.checked!==undefined && <span className={`w-1.5 h-1.5 rounded-full ${item.checked?'bg-[#7b68ee]':'border border-[#5a5a70]'}`}/>}
                        {item.label}
                      </span>
                      {item.shortcut && <span className="text-2xs text-[#5a5a70] ml-4">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex-1"/>

      {/* Workspaces */}
      <div className="flex items-center gap-0.5 px-2">
        {WORKSPACES.map(w => (
          <button key={w.id}
            className={`px-1.5 py-0.5 text-2xs rounded transition-colors ${workspaceLayout===w.id?'bg-[#7b68ee]/20 text-[#a08fff]':'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setWorkspaceLayout(w.id)}
          >{w.label}</button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#2e2e3a] mx-1"/>

      {/* Playback */}
      <div className="flex items-center gap-0.5 px-1">
        <button className="btn-icon w-6 h-6" onClick={() => setFrame(0)}><SkipBack size={12}/></button>
        <button className={`btn-icon w-6 h-6 ${isPlaying?'active':''}`} onClick={togglePlay}>
          {isPlaying ? <Pause size={12}/> : <Play size={12}/>}
        </button>
        <button className="btn-icon w-6 h-6" onClick={() => setFrame(project.totalFrames-1)}><SkipForward size={12}/></button>
        <div className="flex items-center gap-1 ml-1 font-mono">
          <input type="number" value={currentFrame} onChange={e => setFrame(parseInt(e.target.value)||0)}
            className="w-11 text-center bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-xs text-[#f0f0f5] outline-none focus:border-[#7b68ee]"
            min={0} max={project.totalFrames-1}/>
          <span className="text-2xs text-[#5a5a70]">/ {project.totalFrames-1}</span>
        </div>
      </div>

      <div className="w-px h-5 bg-[#2e2e3a] mx-1"/>

      <button
        className={`px-1.5 py-0.5 text-2xs rounded font-bold mr-1 ${autoKey?'bg-[#f04060]/20 text-[#f04060] border border-[#f04060]/40':'text-[#5a5a70] border border-[#2e2e3a]'}`}
        onClick={toggleAutoKey} title="Auto-Key (K)">K</button>

      {/* Project Quick Settings badge */}
      <button
        title="Project Settings (click to open)"
        className="flex items-center gap-1 px-2 py-0.5 rounded text-2xs text-[#5a5a70] hover:text-[#a08fff] hover:bg-[#22222a] transition-colors border border-[#2e2e3a] mx-1"
        onClick={() => openModal('newProject')}
      >
        <Settings size={10}/>
        <span className="font-mono text-[#7b68ee]">{project.width}×{project.height}</span>
        <span className="text-[#3a3a50]">·</span>
        <span className="font-mono">{project.fps}fps</span>
      </button>
      <button className="btn-icon w-7 h-7" onClick={onToggleAnimPanel} title="Animation Tools"><Zap size={13}/></button>
      <button className="btn-icon w-7 h-7" onClick={onToggleColorPanel} title="Color Panel"><Palette size={13}/></button>
      <button className="btn-icon w-7 h-7" onClick={() => openModal('assetLibraryPopup')} title="Asset Library"><Library size={13}/></button>
      <button className="btn-icon w-7 h-7" onClick={() => openModal('help')} title="Help Documentation"><BookOpen size={13}/></button>
      <button className="btn-icon w-7 h-7 mr-1" onClick={toggleDarkMode} title="Theme">{darkMode?<Sun size={13}/>:<Moon size={13}/>}</button>

      <button
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded mr-2 text-white flex-shrink-0"
        style={{ background:'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
        onClick={() => openModal('export')}
      ><Download size={12}/> Export</button>
    </div>
  );
}
