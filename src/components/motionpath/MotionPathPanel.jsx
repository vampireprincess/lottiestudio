import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { createMotionPath, generateMotionPathKeyframes } from '../../engine/motionpath/motionPathEngine.js';
import { v4 as uuidv4 } from 'uuid';
import { NumericInput } from '../shared/NumericInput.jsx';
import { Spline, Play, RefreshCw } from 'lucide-react';

export function MotionPathPanel({ onClose }) {
  const { project, selectedLayerIds, currentFrame, saveHistory } = useEditorStore();
  const [pathData, setPathData] = useState('');
  const [orientToPath, setOrientToPath] = useState(true);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(project.totalFrames - 1);
  const [loopMode, setLoopMode] = useState('loop');
  const [reverse, setReverse] = useState(false);
  const [useSelectedPath, setUseSelectedPath] = useState(false);

  const layer = project.layers[selectedLayerIds[0]];

  // Get path from selected layer if it has one
  const getPathFromLayer = () => {
    const pathLayer = selectedLayerIds
      .map(id => project.layers[id])
      .find(l => l?.pathData);
    if (pathLayer) {
      setPathData(pathLayer.pathData);
    }
  };

  const applyMotionPath = () => {
    if (!selectedLayerIds[0] || !pathData.trim()) return;
    saveHistory('Apply Motion Path');

    const motionPath = createMotionPath(pathData, {
      orientToPath,
      rotationOffset,
      loopMode,
      reverse,
    });

    const kfs = generateMotionPathKeyframes(
      motionPath,
      selectedLayerIds[0],
      startFrame,
      endFrame,
      project.fps,
    );

    const store = useEditorStore.getState();

    // Add motion path to project
    store.loadProject({
      ...project,
      motionPaths: [...(project.motionPaths || []), motionPath],
      layers: {
        ...project.layers,
        [selectedLayerIds[0]]: {
          ...project.layers[selectedLayerIds[0]],
          motionPathId: motionPath.id,
        },
      },
      keyframes: [
        ...project.keyframes.filter(kf =>
          !(kf.layerId === selectedLayerIds[0] &&
           (kf.property === 'transform.position' || kf.property === 'transform.rotation') &&
           kf.frame >= startFrame && kf.frame <= endFrame)
        ),
        ...kfs,
      ],
    });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="text-2xs text-[#5a5a70] bg-[#1a1a22] rounded p-2 border border-[#2e2e3a]">
        💡 Motion Paths move a layer along an SVG path. Draw a path with the Pen tool, then apply it here.
      </div>

      {!selectedLayerIds[0] && (
        <div className="text-xs text-[#f0a030] text-center">Select a layer to apply a motion path</div>
      )}

      {/* Path input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-2xs text-[#5a5a70]">SVG Path Data</label>
          <button
            className="text-2xs text-[#7b68ee] hover:text-[#a08fff]"
            onClick={getPathFromLayer}
            title="Use path from selected layer"
          >
            From Layer
          </button>
        </div>
        <textarea
          value={pathData}
          onChange={e => setPathData(e.target.value)}
          placeholder="M 100,200 C 300,50 600,350 800,200 ..."
          className="input w-full text-xs font-mono h-16 resize-none"
          style={{ lineHeight: 1.4 }}
        />
      </div>

      {/* Frame range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Start Frame</label>
          <NumericInput value={startFrame} onChange={setStartFrame} min={0} step={1} />
        </div>
        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">End Frame</label>
          <NumericInput value={endFrame} onChange={v => setEndFrame(Math.min(project.totalFrames-1, v))} min={1} step={1} />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={orientToPath} onChange={e => setOrientToPath(e.target.checked)} className="accent-[#7b68ee]" />
          <span className="text-xs text-[#9090a8]">Orient to Path (rotate along direction)</span>
        </label>

        {orientToPath && (
          <div>
            <label className="text-2xs text-[#5a5a70] block mb-1">Rotation Offset</label>
            <NumericInput value={rotationOffset} onChange={setRotationOffset} min={-360} max={360} step={1} suffix="°" />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)} className="accent-[#7b68ee]" />
          <span className="text-xs text-[#9090a8]">Reverse Direction</span>
        </label>

        <div>
          <label className="text-2xs text-[#5a5a70] block mb-1">Loop Mode</label>
          <select value={loopMode} onChange={e => setLoopMode(e.target.value)} className="input w-full text-xs">
            <option value="loop">Loop</option>
            <option value="pingpong">Ping-Pong</option>
            <option value="once">Once</option>
          </select>
        </div>
      </div>

      <button
        className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white ${pathData.trim() && selectedLayerIds[0] ? '' : 'opacity-40 cursor-not-allowed'}`}
        style={{ background: pathData.trim() && selectedLayerIds[0] ? 'linear-gradient(135deg, #7b68ee, #5c4de0)' : '#2e2e3a' }}
        onClick={applyMotionPath}
        disabled={!pathData.trim() || !selectedLayerIds[0]}
      >
        <Spline size={13} /> Apply Motion Path
      </button>
    </div>
  );
}
