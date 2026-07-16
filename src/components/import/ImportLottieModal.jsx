import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { ModalBackdrop } from '../modals/ActiveModal.jsx';
import { importLottieJSON } from '../../engine/import/lottieImporter.js';
import {
  Upload, AlertCircle, CheckCircle, Film,
  Play, Pause, Square, SkipBack, SkipForward
} from 'lucide-react';
import lottie from 'lottie-web';

/**
 * Lottie Preview Player component
 * Uses lottie-web to render the animation for accurate preview
 */
function LottiePreviewPlayer({ lottieData, analysis }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef(null);

  const totalFrames = analysis?.totalFrames || 0;
  const fps = analysis?.frameRate || 30;
  const duration = analysis?.duration || 0;
  const currentTime = fps > 0 ? (currentFrame / fps).toFixed(2) : '0.00';

  useEffect(() => {
    if (!containerRef.current || !lottieData) return;

    // Destroy existing
    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    try {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        animationData: lottieData,
      });

      animRef.current.addEventListener('enterFrame', () => {
        if (animRef.current) {
          setCurrentFrame(Math.round(animRef.current.currentFrame));
        }
      });

      animRef.current.addEventListener('complete', () => {
        setIsPlaying(false);
      });

      setCurrentFrame(0);
      setIsPlaying(false);
    } catch (e) {
      console.warn('Lottie preview error:', e);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [lottieData]);

  // Sync speed
  useEffect(() => {
    if (animRef.current) {
      animRef.current.setSpeed(speed);
    }
  }, [speed]);

  const handlePlay = () => {
    if (!animRef.current) return;
    animRef.current.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!animRef.current) return;
    animRef.current.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!animRef.current) return;
    animRef.current.stop();
    animRef.current.goToAndStop(0, true);
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleGoToStart = () => {
    if (!animRef.current) return;
    animRef.current.goToAndStop(0, true);
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleGoToEnd = () => {
    if (!animRef.current) return;
    animRef.current.goToAndStop(totalFrames - 1, true);
    setCurrentFrame(totalFrames - 1);
    setIsPlaying(false);
  };

  const handleScrub = (e) => {
    if (!animRef.current) return;
    const val = parseInt(e.target.value);
    animRef.current.goToAndStop(val, true);
    setCurrentFrame(val);
  };

  return (
    <div className="space-y-3">
      {/* Preview canvas */}
      <div
        className="rounded-lg overflow-hidden border border-[#2e2e3a] flex items-center justify-center"
        style={{ background: '#111118', minHeight: 200 }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>

      {/* Scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(totalFrames - 1, 0)}
          step={1}
          value={currentFrame}
          onChange={handleScrub}
          className="w-full h-1.5 rounded"
          style={{ accentColor: '#7b68ee' }}
        />
        <div className="flex justify-between text-2xs text-[#5a5a70]">
          <span>Frame {currentFrame} / {totalFrames}</span>
          <span>{currentTime}s / {duration.toFixed(2)}s</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-1.5">
        <button className="btn-icon w-7 h-7" onClick={handleGoToStart} title="Go to Start">
          <SkipBack size={13}/>
        </button>
        {isPlaying ? (
          <button className="btn-icon w-7 h-7 active" onClick={handlePause} title="Pause">
            <Pause size={13}/>
          </button>
        ) : (
          <button className="btn-icon w-7 h-7" onClick={handlePlay} title="Play">
            <Play size={13}/>
          </button>
        )}
        <button className="btn-icon w-7 h-7" onClick={handleStop} title="Stop">
          <Square size={11}/>
        </button>
        <button className="btn-icon w-7 h-7" onClick={handleGoToEnd} title="Go to End">
          <SkipForward size={13}/>
        </button>

        <div className="flex-1"/>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="text-2xs text-[#5a5a70]">Speed:</span>
          <div className="flex gap-0.5">
            {[0.5, 1, 1.5, 2, 2.5].map(s => (
              <button
                key={s}
                className={`px-1.5 py-0.5 text-2xs rounded transition-colors ${
                  speed === s ? 'bg-[#7b68ee]/20 text-[#a08fff]' : 'text-[#5a5a70] hover:text-[#9090a8]'
                }`}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-3 text-2xs text-[#5a5a70] bg-[#1a1a22] rounded px-2 py-1.5 border border-[#2e2e3a]">
        <span><span className="text-[#9090a8]">{fps}</span> fps</span>
        <span><span className="text-[#9090a8]">{analysis?.width}×{analysis?.height}</span></span>
        <span><span className="text-[#9090a8]">{totalFrames}</span> frames</span>
        <span><span className="text-[#9090a8]">{duration.toFixed(2)}s</span> total</span>
        <span className="ml-auto text-[#30a0f0]">Lottie-web preview</span>
      </div>
    </div>
  );
}

export function ImportLottieModal({ onClose }) {
  const { loadProject, saveHistory } = useEditorStore();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [rawJson, setRawJson] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setFileName(file.name.replace(/\.(json|lottie)$/i, ''));
        setError(null);
        setRawJson(json);

        const { project, analysis } = importLottieJSON(json);
        setData({ project, json });
        setAnalysis(analysis);
      } catch (err) {
        setError(`Could not parse file: ${err.message}`);
        setData(null);
        setAnalysis(null);
        setRawJson(null);
      }
    };
    reader.readAsText(file);
  };

  const doImport = () => {
    if (!data) return;
    saveHistory('Import Lottie');
    loadProject({ ...data.project, name: fileName || data.project.name });
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-2xl">
      <div className="p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#f0f0f5] flex items-center gap-2">
            <Film size={16} className="text-[#7b68ee]"/> Import Lottie Animation
          </h2>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>

        {!data ? (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-[#2e2e3a] hover:border-[#5a5a70]'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault(); setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <Upload size={32} className="mx-auto text-[#5a5a70] mb-3"/>
            <p className="text-sm text-[#9090a8] mb-1">Drop a Lottie JSON file here or click to browse</p>
            <p className="text-xs text-[#5a5a70]">Supports .json and .lottie files</p>
            {error && <p className="text-xs text-[#f04060] mt-2">{error}</p>}
            <input
              ref={fileRef}
              type="file"
              accept=".json,.lottie"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {/* Left: Preview */}
            <div>
              <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-2">Preview</p>
              {rawJson && (
                <LottiePreviewPlayer lottieData={rawJson} analysis={analysis} />
              )}
            </div>

            {/* Right: Info & settings */}
            <div className="space-y-3">
              {/* File info */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#22222a] border border-[#2e2e3a]">
                <Film size={18} className="text-[#7b68ee] flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f0f5] truncate">{fileName}</p>
                  <p className="text-2xs text-[#5a5a70]">
                    Lottie v{analysis?.version} · {analysis?.width}×{analysis?.height}
                  </p>
                </div>
                <button className="text-xs text-[#7b68ee] hover:text-[#a08fff] flex-shrink-0"
                  onClick={() => { setData(null); setAnalysis(null); setRawJson(null); }}>
                  Change
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Layers', value: analysis?.layerCount },
                  { label: 'Assets', value: analysis?.assetCount },
                  { label: 'Markers', value: analysis?.markerCount },
                  { label: 'FPS', value: analysis?.frameRate },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 rounded bg-[#1a1a22] border border-[#2e2e3a] text-center">
                    <div className="text-base font-bold text-[#7b68ee]">{value ?? '—'}</div>
                    <div className="text-2xs text-[#5a5a70]">{label}</div>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {analysis?.warnings?.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {analysis.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-[#f0a030] bg-[#f0a030]/8 rounded p-1.5">
                      <AlertCircle size={11} className="flex-shrink-0 mt-0.5"/>{w}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[#30d060] bg-[#30d060]/8 rounded p-1.5 border border-[#30d060]/20">
                  <CheckCircle size={12}/> Compatible — ready to import
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-2xs text-[#5a5a70] block mb-1">Project Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>

              <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a] leading-relaxed">
                The preview uses the same Lottie renderer as the canvas and export.
                If it looks correct here, it will look correct after import.
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 py-2 text-sm" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary flex-1 py-2 text-sm"
                  onClick={doImport}
                >
                  Import to Canvas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}
