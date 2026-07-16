import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore.js';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { TopMenuBar } from './TopMenuBar.jsx';
import { Toolbar } from './toolbar/Toolbar.jsx';
import { Canvas } from './canvas/Canvas.jsx';
import { LayersPanel } from './layers/LayersPanel.jsx';
import { PropertiesPanel } from './properties/PropertiesPanel.jsx';
import { TimelinePanel } from './timeline/TimelinePanel.jsx';
import { AssetsPanel } from './panels/AssetsPanel.jsx';
import { ExportPanel } from './panels/ExportPanel.jsx';
import { ColorPanel } from './panels/ColorPanel.jsx';
import { AnimationPanel } from './panels/AnimationPanel.jsx';
import { FloatingToolbar } from './toolbar/FloatingToolbar.jsx';
import { ActiveModal } from './modals/ActiveModal.jsx';
import { StatusBar } from './StatusBar.jsx';

function useDragH(init, min, max) {
  const [size, setSize] = useState(init);
  const onDrag = useCallback((e) => {
    e.preventDefault();
    const sx = e.clientX, ss = size;
    const mv = me => setSize(Math.max(min, Math.min(max, ss + me.clientX - sx)));
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }, [size, min, max]);
  return { size, onDrag };
}

function useDragV(init, min, max) {
  const [size, setSize] = useState(init);
  const onDrag = useCallback((e) => {
    e.preventDefault();
    const sy = e.clientY, ss = size;
    const mv = me => setSize(Math.max(min, Math.min(max, ss - (me.clientY - sy))));
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }, [size, min, max]);
  return { size, onDrag };
}

const HD = ({ onMouseDown }) => (
  <div className="w-[3px] flex-shrink-0 bg-transparent hover:bg-[#7b68ee] transition-colors cursor-col-resize z-10" onMouseDown={onMouseDown}/>
);
const VD = ({ onMouseDown }) => (
  <div className="h-[3px] flex-shrink-0 bg-transparent hover:bg-[#7b68ee] transition-colors cursor-row-resize z-10" onMouseDown={onMouseDown}/>
);

export function MainLayout() {
  const { panels, workspaceLayout } = useEditorStore();
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showAnimPanel, setShowAnimPanel] = useState(false);

  const layers   = useDragH(240, 160, 440);
  const rightW   = useDragH(290, 200, 520);
  const timeline = useDragV(220, 100, 540);
  const colorW   = useDragH(290, 200, 440);
  const animW    = useDragH(290, 200, 440);

  // Workspace layout presets
  const showLayers = panels.layers.visible;
  const showTimeline = panels.timeline.visible;
  const showRight = panels.properties.visible || panels.assets.visible || panels.export.visible;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#0f0f11' }}>
      <TopMenuBar
        onToggleColorPanel={() => setShowColorPanel(p => !p)}
        onToggleAnimPanel={() => setShowAnimPanel(p => !p)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Layers */}
          {showLayers && (
            <>
              <div style={{ width: layers.size, flexShrink: 0 }} className="overflow-hidden flex flex-col border-r border-[#2e2e3a]">
                <LayersPanel />
              </div>
              <HD onMouseDown={layers.onDrag}/>
            </>
          )}

          {/* Center: Canvas + Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-hidden relative" style={{ minHeight: 160 }}>
              <ErrorBoundary name="Canvas">
                <Canvas />
              </ErrorBoundary>
              <FloatingToolbar />
            </div>
            {showTimeline && (
              <>
                <VD onMouseDown={timeline.onDrag}/>
                <div style={{ height: timeline.size, flexShrink: 0 }} className="overflow-hidden border-t border-[#2e2e3a]">
                  <ErrorBoundary name="Timeline">
                    <TimelinePanel />
                  </ErrorBoundary>
                </div>
              </>
            )}
          </div>

          {/* Right: Properties + Assets + Export */}
          {showRight && (
            <>
              <HD onMouseDown={rightW.onDrag}/>
              <div style={{ width: rightW.size, flexShrink: 0 }} className="flex flex-col overflow-hidden border-l border-[#2e2e3a]">
                {panels.properties.visible && (
                  <div className={panels.assets.visible || panels.export.visible ? 'flex-1 overflow-hidden min-h-0' : 'flex-1 overflow-hidden'}>
                    <ErrorBoundary name="Properties">
                      <PropertiesPanel />
                    </ErrorBoundary>
                  </div>
                )}
                {panels.assets.visible && (
                  <div className={`${panels.properties.visible?'h-44 border-t border-[#2e2e3a] flex-shrink-0':'flex-1'} overflow-hidden`}>
                    <AssetsPanel />
                  </div>
                )}
                {panels.export.visible && (
                  <div className={`${panels.properties.visible?'h-64 border-t border-[#2e2e3a] flex-shrink-0':'flex-1'} overflow-hidden`}>
                    <ExportPanel />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Animation Panel */}
          {showAnimPanel && (
            <>
              <HD onMouseDown={animW.onDrag}/>
              <div style={{ width: animW.size, flexShrink: 0 }} className="overflow-hidden border-l border-[#2e2e3a]">
                <ErrorBoundary name="AnimationPanel">
                  <AnimationPanel />
                </ErrorBoundary>
              </div>
            </>
          )}

          {/* Color Panel */}
          {showColorPanel && (
            <>
              <HD onMouseDown={colorW.onDrag}/>
              <div style={{ width: colorW.size, flexShrink: 0 }} className="overflow-hidden border-l border-[#2e2e3a]">
                <ColorPanel />
              </div>
            </>
          )}
        </div>
      </div>

      <StatusBar showAnimPanel={showAnimPanel} showColorPanel={showColorPanel} />
      <ActiveModal />
    </div>
  );
}
