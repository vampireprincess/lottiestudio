import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import {
  Play, Pause, SkipBack, SkipForward, Square,
  ChevronRight, ChevronDown, Eye, Lock,
  ZoomIn, ZoomOut, Flag, Plus, Copy, Clipboard,
  ChevronLeft, ChevronsLeft, ChevronsRight,
  Layers, AlignLeft, Maximize2
} from 'lucide-react';
import { EasingPresetGrid } from '../easing/GraphEditor.jsx';

const FRAME_W = 8;

export function TimelinePanel() {
  const {
    project, currentFrame, setFrame, isPlaying, togglePlay, setPlaying,
    selectedLayerIds, selectLayers,
    workAreaStart, workAreaEnd, setWorkArea,
    timelineZoom, updateCanvasSettings,
    addMarker, autoKey, toggleAutoKey,
    loopMode, playbackSpeed,
    onionSkin, toggleOnionSkin, updateOnionSkin,
    selectedKeyframeIds, selectKeyframes, removeKeyframe,
    updateKeyframeEasing, moveKeyframes, saveHistory,
  } = useEditorStore();

  const timelineBodyRef = useRef(null);
  const [expandedLayers, setExpandedLayers] = useState({});
  const [showEasingPopup, setShowEasingPopup] = useState(false);
  const [showOnionSettings, setShowOnionSettings] = useState(false);
  const [copyBuffer, setCopyBuffer] = useState([]);
  // Box-select state
  const [kfBoxSelect, setKfBoxSelect] = useState(null);

  const fps = project.fps || 30;
  const totalFrames = project.totalFrames || 180;
  const zoom = timelineZoom || 1;
  const fw = FRAME_W * zoom;

  const frameToX = f => f * fw;

  // ── Playback loop ──────────────────────────────────────────────────────────
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }
    const tick = ts => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const elapsed = (ts - lastTimeRef.current) * (playbackSpeed || 1);
      const framesElapsed = Math.floor(elapsed / (1000 / fps));
      if (framesElapsed > 0) {
        lastTimeRef.current = ts - (elapsed % (1000 / fps));
        setFrame(prev => {
          const next = prev + framesElapsed;
          if (next >= workAreaEnd) {
            if (loopMode === 'loop') return workAreaStart;
            if (loopMode === 'pingpong') return workAreaStart;
            setPlaying(false);
            return workAreaEnd;
          }
          return next;
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isPlaying, fps, playbackSpeed, workAreaStart, workAreaEnd, loopMode]);

  // ── Ruler drag ─────────────────────────────────────────────────────────────
  const handleRulerMouseDown = useCallback(e => {
    const rect = timelineBodyRef.current?.getBoundingClientRect();
    if (!rect) return;
    const getF = me => Math.max(0, Math.min(totalFrames-1, Math.round((me.clientX - rect.left + (timelineBodyRef.current?.scrollLeft || 0)) / fw)));
    setFrame(getF(e));
    const onMove = me => setFrame(getF(me));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [fw, totalFrames]);

  // ── KF operations ──────────────────────────────────────────────────────────
  const copyKeyframes = () => {
    const kfs = project.keyframes.filter(kf => selectedKeyframeIds.includes(kf.id));
    setCopyBuffer(kfs);
  };

  const pasteKeyframes = () => {
    if (!copyBuffer.length) return;
    saveHistory('Paste Keyframes');
    const minFrame = Math.min(...copyBuffer.map(k => k.frame));
    const offset = currentFrame - minFrame;
    const store = useEditorStore.getState();
    copyBuffer.forEach(kf => store.setKeyframe(kf.layerId, kf.property, kf.frame + offset, kf.value, kf.easing));
  };

  const reverseKeyframes = () => {
    const kfs = project.keyframes.filter(kf => selectedKeyframeIds.includes(kf.id));
    if (!kfs.length) return;
    saveHistory('Reverse Keyframes');
    const minF = Math.min(...kfs.map(k => k.frame));
    const maxF = Math.max(...kfs.map(k => k.frame));
    const store = useEditorStore.getState();
    kfs.forEach(kf => {
      const newFrame = maxF - (kf.frame - minF);
      store.setKeyframe(kf.layerId, kf.property, newFrame, kf.value, kf.easing);
    });
    // Remove originals that were displaced (keep only new positions)
    // Note: setKeyframe will overwrite existing frame+prop combos
  };

  // Stretch: scale keyframe timing by factor around workAreaStart
  const stretchKeyframes = factor => {
    const kfs = project.keyframes.filter(kf => selectedKeyframeIds.includes(kf.id));
    if (!kfs.length) return;
    saveHistory('Stretch Keyframes');
    const pivot = Math.min(...kfs.map(k => k.frame));
    const store = useEditorStore.getState();
    kfs.forEach(kf => {
      const newFrame = Math.round(pivot + (kf.frame - pivot) * factor);
      store.setKeyframe(kf.layerId, kf.property, Math.max(0, newFrame), kf.value, kf.easing);
    });
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copyKeyframes(); }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteKeyframes(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKeyframeIds, copyBuffer, currentFrame]);

  const rootLayers = [...(project.rootLayers || [])].reverse();

  return (
    <div className="flex flex-col h-full select-none overflow-hidden" style={{ background: '#16161a' }}>
      {/* Toolbar */}
      <TimelineToolbar
        fps={fps} totalFrames={totalFrames} currentFrame={currentFrame}
        isPlaying={isPlaying} togglePlay={togglePlay} setFrame={setFrame} setPlaying={setPlaying}
        workAreaStart={workAreaStart} workAreaEnd={workAreaEnd} setWorkArea={setWorkArea}
        loopMode={loopMode} playbackSpeed={playbackSpeed} updateCanvasSettings={updateCanvasSettings}
        autoKey={autoKey} toggleAutoKey={toggleAutoKey}
        onionSkin={onionSkin} toggleOnionSkin={toggleOnionSkin}
        showOnionSettings={showOnionSettings} setShowOnionSettings={setShowOnionSettings}
        addMarker={addMarker} zoom={zoom}
        onCopy={copyKeyframes} onPaste={pasteKeyframes} onReverse={reverseKeyframes}
        onStretch={stretchKeyframes}
        copyBuffer={copyBuffer}
        selectedKfCount={selectedKeyframeIds.length}
        showEasing={showEasingPopup} toggleEasing={() => setShowEasingPopup(p => !p)}
        project={project}
      />

      {/* Onion Skin settings popup */}
      {showOnionSettings && (
        <OnionSkinSettings onionSkin={onionSkin} updateOnionSkin={updateOnionSkin}
          onClose={() => setShowOnionSettings(false)} />
      )}

      {/* Easing popup */}
      {showEasingPopup && selectedKeyframeIds.length > 0 && (
        <div className="absolute bottom-full mb-1 right-4 w-72 rounded-xl shadow-popup z-50 overflow-hidden"
          style={{ background: '#1a1a22', border: '1px solid #3a3a50' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a]">
            <span className="text-xs font-semibold text-[#9090a8]">Easing — {selectedKeyframeIds.length} KF</span>
            <button className="btn-icon w-5 h-5" onClick={() => setShowEasingPopup(false)}>✕</button>
          </div>
          <div className="p-3">
            <EasingPresetGrid
              selectedEasing={project.keyframes.find(kf => selectedKeyframeIds.includes(kf.id))?.easing}
              onSelect={ez => {
                saveHistory('Update Easing');
                updateKeyframeEasing(selectedKeyframeIds, ez);
                setShowEasingPopup(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-[#2e2e3a] flex flex-col overflow-hidden" style={{ background: '#12121a' }}>
          <div className="h-7 border-b border-[#2e2e3a] flex items-center px-2 gap-1">
            <span className="text-2xs text-[#5a5a70] uppercase tracking-wide flex-1">Layer</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rootLayers.map(id => (
              <TimelineSidebarRow key={id} layerId={id} project={project}
                expanded={expandedLayers[id]}
                onToggle={() => setExpandedLayers(p => ({ ...p, [id]: !p[id] }))}
                selectedLayerIds={selectedLayerIds}
                onSelect={id => selectLayers([id])}
                updateLayer={useEditorStore.getState().updateLayer}
              />
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-auto relative" ref={timelineBodyRef}
          style={{ scrollbarWidth: 'thin' }}>
          <div style={{ width: Math.max(frameToX(totalFrames) + 120, 500), minHeight: '100%', position: 'relative' }}>
            {/* Ruler */}
            <div className="sticky top-0 z-20 h-7 border-b border-[#2e2e3a] cursor-pointer"
              style={{ background: '#12121a', width: '100%' }}
              onMouseDown={handleRulerMouseDown}>
              <TimelineRuler totalFrames={totalFrames} fps={fps} fw={fw} />

              {/* Work area */}
              <div className="absolute top-0 h-full pointer-events-none" style={{
                left: frameToX(workAreaStart), width: frameToX(workAreaEnd - workAreaStart),
                background: 'rgba(123,104,238,0.06)',
                borderLeft: '1px solid rgba(123,104,238,0.4)', borderRight: '1px solid rgba(123,104,238,0.4)',
              }} />

              {/* Markers */}
              {project.markers.map(m => (
                <div key={m.id} className="absolute top-0 h-full pointer-events-none flex flex-col items-start"
                  style={{ left: frameToX(m.frame) }}>
                  <div className="w-0 h-0 mt-0.5" style={{
                    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                    borderBottom: `7px solid ${m.color || '#f0a030'}`,
                  }} />
                  {fw > 4 && <span className="text-2xs ml-1 whitespace-nowrap" style={{ color: m.color || '#f0a030' }}>{m.name}</span>}
                </div>
              ))}

              {/* Playhead triangle */}
              <div className="absolute top-0 h-full pointer-events-none" style={{ left: frameToX(currentFrame) }}>
                <div className="w-0 h-0" style={{
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderBottom: '8px solid #f04060',
                }} />
                <div className="w-px h-full bg-[#f04060]/80 absolute left-0 top-2" />
              </div>
            </div>

            {/* Layer tracks */}
            {rootLayers.map(id => (
              <TimelineTrack key={id} layerId={id} project={project}
                expanded={expandedLayers[id]}
                fw={fw} frameToX={frameToX}
                currentFrame={currentFrame} totalFrames={totalFrames}
                selectedKfIds={selectedKeyframeIds}
                onSelectKf={(id, add) => selectKeyframes([id], add)}
                onRemoveKf={removeKeyframe}
              />
            ))}

            {/* Playhead line full height */}
            <div className="absolute top-7 bottom-0 w-px bg-[#f04060]/50 pointer-events-none"
              style={{ left: frameToX(currentFrame) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function TimelineToolbar({
  fps, totalFrames, currentFrame, isPlaying, togglePlay, setFrame, setPlaying,
  workAreaStart, workAreaEnd, setWorkArea,
  loopMode, playbackSpeed, updateCanvasSettings,
  autoKey, toggleAutoKey, onionSkin, toggleOnionSkin,
  showOnionSettings, setShowOnionSettings,
  addMarker, zoom, onCopy, onPaste, onReverse, onStretch, copyBuffer,
  selectedKfCount, showEasing, toggleEasing, project,
}) {
  const currentTime = (currentFrame / fps).toFixed(2);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[#2e2e3a] flex-shrink-0 flex-wrap"
      style={{ background: '#12121a' }}>

      {/* Playback controls */}
      <button className="btn-icon w-6 h-6" onClick={() => setFrame(workAreaStart)} title="Go to Start (Home)"><SkipBack size={11}/></button>
      <button className="btn-icon w-6 h-6" onClick={() => setFrame(Math.max(0, currentFrame - 1))} title="Previous Frame (←)"><ChevronLeft size={11}/></button>
      <button className={`btn-icon w-6 h-6 ${isPlaying ? 'active' : ''}`} onClick={togglePlay} title="Play/Pause (Space)">
        {isPlaying ? <Pause size={11}/> : <Play size={11}/>}
      </button>
      <button className="btn-icon w-6 h-6" onClick={() => setFrame(Math.min(totalFrames-1, currentFrame + 1))} title="Next Frame (→)"><ChevronRight size={11}/></button>
      <button className="btn-icon w-6 h-6" onClick={() => { setPlaying(false); setFrame(workAreaStart); }} title="Stop"><Square size={11}/></button>
      <button className="btn-icon w-6 h-6" onClick={() => setFrame(workAreaEnd)} title="Go to End (End)"><SkipForward size={11}/></button>

      {/* Time display */}
      <div className="font-mono text-xs text-[#9090a8] px-1">
        <span className="text-[#f0f0f5]">{currentFrame}</span>
        <span className="text-[#3a3a50]">/{totalFrames-1}</span>
        <span className="text-[#5a5a70] ml-1 hidden sm:inline">({currentTime}s)</span>
      </div>

      <div className="w-px h-4 bg-[#2e2e3a]"/>

      {/* Loop + speed */}
      <select value={loopMode||'loop'} onChange={e => updateCanvasSettings({loopMode:e.target.value})}
        className="text-2xs bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-[#9090a8] outline-none">
        <option value="loop">Loop</option>
        <option value="pingpong">Ping-Pong</option>
        <option value="once">Once</option>
      </select>
      <select value={playbackSpeed||1} onChange={e => updateCanvasSettings({playbackSpeed:parseFloat(e.target.value)})}
        className="text-2xs bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-[#9090a8] outline-none">
        {[0.25,0.5,1,2,4].map(s=><option key={s} value={s}>{s}×</option>)}
      </select>

      <div className="flex-1"/>

      {/* Work area */}
      <div className="flex items-center gap-1 text-2xs text-[#5a5a70]">
        <span>In</span>
        <input type="number" value={workAreaStart}
          onChange={e => setWorkArea(parseInt(e.target.value)||0, workAreaEnd)}
          className="w-10 bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-xs text-[#9090a8] outline-none" min={0}/>
        <span>Out</span>
        <input type="number" value={workAreaEnd}
          onChange={e => setWorkArea(workAreaStart, parseInt(e.target.value)||totalFrames)}
          className="w-10 bg-[#22222a] border border-[#2e2e3a] rounded px-1 py-0.5 text-xs text-[#9090a8] outline-none" max={totalFrames}/>
      </div>

      <div className="w-px h-4 bg-[#2e2e3a]"/>

      {/* KF operations */}
      {selectedKfCount > 0 && (
        <>
          <button className="btn-icon w-6 h-6" onClick={onCopy} title="Copy Keyframes (Ctrl+C)"><Copy size={11}/></button>
          <button className="btn-icon w-6 h-6" onClick={onReverse} title="Reverse Selected Keyframes" style={{ fontSize: 11 }}>⇄</button>
          {/* Stretch buttons */}
          <button
            className="px-1.5 py-0.5 text-2xs text-[#5a5a70] border border-[#2e2e3a] rounded hover:text-[#9090a8] hover:border-[#5a5a70]"
            onClick={() => onStretch(0.5)} title="Compress timing to 50%">½×</button>
          <button
            className="px-1.5 py-0.5 text-2xs text-[#5a5a70] border border-[#2e2e3a] rounded hover:text-[#9090a8] hover:border-[#5a5a70]"
            onClick={() => onStretch(2)} title="Stretch timing to 200%">2×</button>
          <button
            className={`px-1.5 py-0.5 text-2xs rounded border transition-colors ${showEasing ? 'border-[#7b68ee] text-[#a08fff] bg-[#7b68ee]/10' : 'border-[#2e2e3a] text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={toggleEasing} title="Edit Easing">Easing ▲</button>
          <div className="w-px h-4 bg-[#2e2e3a]"/>
        </>
      )}
      {copyBuffer?.length > 0 && (
        <button className="btn-icon w-6 h-6" onClick={onPaste} title="Paste Keyframes (Ctrl+V)"><Clipboard size={11}/></button>
      )}

      {/* Auto-key */}
      <button
        className={`px-1.5 py-0.5 text-2xs rounded font-semibold ${autoKey?'bg-[#f04060]/20 text-[#f04060] border border-[#f04060]/40':'text-[#5a5a70] border border-[#2e2e3a]'}`}
        onClick={toggleAutoKey} title="Auto-Key (K)">K</button>

      {/* Onion Skin */}
      <div className="relative">
        <button
          className={`btn-icon w-6 h-6 ${onionSkin.enabled ? 'active' : ''}`}
          onClick={toggleOnionSkin} title="Onion Skin">
          <Layers size={11}/>
        </button>
        {onionSkin.enabled && (
          <button
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7b68ee] text-white text-2xs flex items-center justify-center"
            onClick={e => { e.stopPropagation(); setShowOnionSettings(p=>!p); }}
            title="Onion Skin settings"
          >⚙</button>
        )}
      </div>

      {/* Add marker */}
      <button className="btn-icon w-6 h-6"
        onClick={() => addMarker({ frame: useEditorStore.getState().currentFrame, name: 'M', color: '#f0a030' })}
        title="Add Marker at Current Frame"><Flag size={11}/></button>

      {/* Zoom */}
      <button className="btn-icon w-6 h-6"
        onClick={() => updateCanvasSettings({ timelineZoom: Math.max(0.25, (zoom)*0.7) })}><ZoomOut size={11}/></button>
      <button className="btn-icon w-6 h-6"
        onClick={() => updateCanvasSettings({ timelineZoom: Math.min(10, (zoom)*1.4) })}><ZoomIn size={11}/></button>
    </div>
  );
}

// ─── Onion Skin Settings Popup ────────────────────────────────────────────────
function OnionSkinSettings({ onionSkin, updateOnionSkin, onClose }) {
  return (
    <div className="border-b border-[#2e2e3a] px-3 py-2 flex items-center gap-3 flex-wrap"
      style={{ background: '#1a1a26' }}>
      <span className="text-2xs font-semibold text-[#9090a8] uppercase tracking-wider">Onion Skin</span>

      <label className="text-2xs text-[#5a5a70] flex items-center gap-1">
        Past
        <input type="number" min={0} max={10} value={onionSkin.pastCount}
          onChange={e => updateOnionSkin({ pastCount: parseInt(e.target.value)||0 })}
          className="w-8 bg-[#22222a] border border-[#2e2e3a] rounded px-1 text-[#f0f0f5] outline-none text-xs text-center"/>
      </label>

      <label className="text-2xs text-[#5a5a70] flex items-center gap-1">
        Future
        <input type="number" min={0} max={10} value={onionSkin.futureCount}
          onChange={e => updateOnionSkin({ futureCount: parseInt(e.target.value)||0 })}
          className="w-8 bg-[#22222a] border border-[#2e2e3a] rounded px-1 text-[#f0f0f5] outline-none text-xs text-center"/>
      </label>

      <label className="text-2xs text-[#5a5a70] flex items-center gap-1">
        Opacity
        <input type="range" min={0.05} max={0.8} step={0.05} value={onionSkin.opacity}
          onChange={e => updateOnionSkin({ opacity: parseFloat(e.target.value) })}
          className="w-20 h-1" style={{ accentColor: '#7b68ee' }}/>
        <span className="w-8 text-right">{Math.round(onionSkin.opacity * 100)}%</span>
      </label>

      <div className="flex items-center gap-1">
        <span className="text-2xs text-[#5a5a70]">Past:</span>
        <input type="color" value={onionSkin.pastColor || '#0070ff'}
          onChange={e => updateOnionSkin({ pastColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-[#3a3a50]"/>
        <span className="text-2xs text-[#5a5a70]">Future:</span>
        <input type="color" value={onionSkin.futureColor || '#ff4000'}
          onChange={e => updateOnionSkin({ futureColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-[#3a3a50]"/>
      </div>

      <label className="flex items-center gap-1 cursor-pointer">
        <input type="checkbox" checked={onionSkin.selectedLayersOnly}
          onChange={e => updateOnionSkin({ selectedLayersOnly: e.target.checked })}
          className="accent-[#7b68ee]"/>
        <span className="text-2xs text-[#9090a8]">Selected only</span>
      </label>

      <button className="btn-icon w-5 h-5 ml-auto" onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Ruler ────────────────────────────────────────────────────────────────────
function TimelineRuler({ totalFrames, fps, fw }) {
  const majorInterval = fw >= 8 ? fps : fw >= 4 ? fps * 2 : fps * 5;
  const minorInterval = Math.max(1, Math.round(majorInterval / 5));
  const ticks = [];

  for (let f = 0; f <= totalFrames; f += minorInterval) {
    const x = f * fw;
    const isMajor = f % majorInterval === 0;
    ticks.push(
      <React.Fragment key={f}>
        <div className="absolute top-0" style={{
          left: x, width: 1, height: isMajor ? 12 : 5,
          background: isMajor ? '#5a5a70' : '#2e2e3a',
        }}/>
        {isMajor && fw > 2 && (
          <div className="absolute text-2xs text-[#5a5a70] pointer-events-none" style={{ left: x+2, top: 3, fontSize: 9 }}>
            {fw >= 6 ? f : f % fps === 0 ? `${(f/fps|0)}s` : ''}
          </div>
        )}
      </React.Fragment>
    );
  }

  return <div className="relative w-full h-full overflow-hidden">{ticks}</div>;
}

// ─── Sidebar row ──────────────────────────────────────────────────────────────
function TimelineSidebarRow({ layerId, project, expanded, onToggle, selectedLayerIds, onSelect, updateLayer }) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  const isSelected = selectedLayerIds.includes(layerId);
  const layerKfs = project.keyframes.filter(kf => kf.layerId === layerId);
  const animProps = [...new Set(layerKfs.map(kf => kf.property))];

  return (
    <>
      <div
        className={`flex items-center gap-1 px-1 border-b border-[#1a1a22] cursor-pointer ${isSelected?'bg-[#2a2a35]':'hover:bg-[#1e1e26]'}`}
        style={{ height: 28 }}
        onClick={() => onSelect(layerId)}
      >
        <button className="w-4 h-4 flex items-center justify-center text-[#5a5a70]"
          onClick={e => { e.stopPropagation(); onToggle(); }}>
          {animProps.length > 0 ? (expanded ? <ChevronDown size={9}/> : <ChevronRight size={9}/>) : <span className="w-4"/>}
        </button>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: layer.colorLabel||'#5a5a70' }}/>
        <span className="text-xs truncate flex-1" style={{ color: isSelected?'#f0f0f5':'#9090a8' }}>{layer.name}</span>
        <button className={`w-4 h-4 flex items-center justify-center ${layer.visible?'text-[#5a5a70]':'text-[#3a3a50]'}`}
          onClick={e => { e.stopPropagation(); updateLayer(layerId,{visible:!layer.visible}); }}><Eye size={10}/></button>
        <button className={`w-4 h-4 flex items-center justify-center ${layer.locked?'text-[#f0a030]':'text-[#3a3a50]'}`}
          onClick={e => { e.stopPropagation(); updateLayer(layerId,{locked:!layer.locked}); }}><Lock size={10}/></button>
      </div>

      {expanded && animProps.map(prop => (
        <div key={prop} className="flex items-center px-5 border-b border-[#1a1a22] bg-[#14141a]" style={{ height: 22 }}>
          <span className="text-2xs text-[#5a5a70] truncate">{formatProp(prop)}</span>
        </div>
      ))}
    </>
  );
}

// ─── Track ────────────────────────────────────────────────────────────────────
function TimelineTrack({ layerId, project, expanded, fw, frameToX, currentFrame, totalFrames, selectedKfIds, onSelectKf, onRemoveKf }) {
  const layer = project.layers[layerId];
  if (!layer) return null;

  const layerKfs = project.keyframes.filter(kf => kf.layerId === layerId);
  const animProps = [...new Set(layerKfs.map(kf => kf.property))];
  const inX = (layer.inFrame ?? 0) * fw;
  const outX = (layer.outFrame ?? totalFrames) * fw;

  return (
    <>
      <div className="relative border-b border-[#1a1a22]"
        style={{ height: 28, minWidth: frameToX(totalFrames)+80 }}>
        {/* Duration bar */}
        <div className="absolute top-[5px] rounded-sm" style={{
          left: inX, width: Math.max(0, outX-inX), height: 18,
          background: layer.colorLabel ? `${layer.colorLabel}22` : 'rgba(123,104,238,0.1)',
          borderLeft: `2px solid ${layer.colorLabel||'#7b68ee'}`,
        }}/>
        {/* Keyframes */}
        {layerKfs.map(kf => (
          <KfDiamond key={kf.id} kf={kf} fw={fw}
            selected={selectedKfIds.includes(kf.id)}
            rowHeight={28}
            onSelect={add => onSelectKf(kf.id, add)}
            onRemove={() => onRemoveKf(kf.id)}/>
        ))}
      </div>

      {expanded && animProps.map(prop => {
        const propKfs = layerKfs.filter(kf => kf.property === prop);
        return (
          <div key={prop} className="relative border-b border-[#1a1a22] bg-[#14141a]"
            style={{ height: 22, minWidth: frameToX(totalFrames)+80 }}>
            {propKfs.map(kf => (
              <KfDiamond key={kf.id} kf={kf} fw={fw}
                selected={selectedKfIds.includes(kf.id)}
                rowHeight={22}
                onSelect={add => onSelectKf(kf.id, add)}
                onRemove={() => onRemoveKf(kf.id)}
                small/>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ─── Keyframe Diamond ─────────────────────────────────────────────────────────
function KfDiamond({ kf, fw, selected, rowHeight, onSelect, onRemove, small }) {
  const size = small ? 6 : 8;
  const [dragging, setDragging] = useState(false);

  const startDrag = useCallback(e => {
    e.stopPropagation();
    const startX = e.clientX;
    const origFrame = kf.frame;
    let lastFrame = origFrame;

    const onMove = me => {
      const dx = me.clientX - startX;
      const delta = Math.round(dx / fw);
      const newFrame = Math.max(0, origFrame + delta);
      if (newFrame !== lastFrame) {
        useEditorStore.getState().moveKeyframes([kf.id], newFrame - lastFrame);
        lastFrame = newFrame;
      }
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    setDragging(true);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [kf, fw]);

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
      style={{ left: kf.frame * fw }}
      onClick={e => { e.stopPropagation(); onSelect(e.shiftKey || e.ctrlKey); }}
      onMouseDown={startDrag}
      onContextMenu={e => { e.preventDefault(); onRemove(); }}
      title={`Frame ${kf.frame} · ${formatProp(kf.property)} · ${kf.easing?.type || 'linear'}`}
    >
      <div style={{
        width: size, height: size,
        background: selected ? '#a08fff' : kf.hold ? '#f04060' : '#f0a030',
        transform: 'rotate(45deg)',
        borderRadius: 1,
        boxShadow: selected ? '0 0 6px rgba(160,143,255,0.8)' : '0 0 3px rgba(240,160,48,0.3)',
        transition: dragging ? 'none' : 'transform 0.1s',
      }}
      className="group-hover:scale-125"
      />
    </div>
  );
}

function formatProp(p) {
  const m = { 'transform.position':'Pos','transform.scale':'Scale','transform.rotation':'Rot',
    'transform.skew':'Skew','opacity':'Opacity','trimStart':'Trim↑','trimEnd':'Trim↓',
    'trimOffset':'Trim⟳','pathData':'Path' };
  return m[p] || p.split('.').pop();
}
