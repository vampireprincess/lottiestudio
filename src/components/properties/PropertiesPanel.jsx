import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { TransformSection } from './TransformSection.jsx';
import { FillsSection } from './FillsSection.jsx';
import { StrokesSection } from './StrokesSection.jsx';
import { EffectsSection } from './EffectsSection.jsx';
import { MasksSection } from './MasksSection.jsx';
import { TrimPathsSection } from './TrimPathsSection.jsx';
import { ProjectSettings } from './ProjectSettings.jsx';
import { Move, Droplets, Layers, Zap, Grid, Settings, Scissors, ChevronDown } from 'lucide-react';

const TABS = [
  { id: 'transform', icon: Move, label: 'Transform' },
  { id: 'fill', icon: Droplets, label: 'Fill' },
  { id: 'stroke', icon: Layers, label: 'Stroke' },
  { id: 'effects', icon: Zap, label: 'FX' },
  { id: 'masks', icon: Grid, label: 'Mask' },
  { id: 'trim', icon: Scissors, label: 'Trim' },
];

export function PropertiesPanel() {
  const { selectedLayerIds, project } = useEditorStore();
  const [activeTab, setActiveTab] = useState('transform');
  const [showAllTabs, setShowAllTabs] = useState(false);

  const selectedLayer = selectedLayerIds[0] ? project.layers[selectedLayerIds[0]] : null;

  if (!selectedLayer) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
          <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Properties</span>
        </div>
        <ProjectSettings />
      </div>
    );
  }

  // Highlight tabs with data
  const hasEffects = (selectedLayer.effects||[]).some(e => e.enabled);
  const hasMasks = (selectedLayer.masks||[]).length > 0;
  const hasTrim = selectedLayer.trimStart !== undefined || project.keyframes.some(kf=>kf.layerId===selectedLayerIds[0]&&kf.property==='trimStart');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#16161a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedLayer.colorLabel || '#7b68ee' }} />
          <span className="text-xs font-semibold text-[#f0f0f5] truncate" title={selectedLayer.name}>{selectedLayer.name}</span>
        </div>
        <span className="text-2xs text-[#5a5a70] capitalize flex-shrink-0 ml-1">{selectedLayer.type}</span>
      </div>

      {/* Multiple selection info */}
      {selectedLayerIds.length > 1 && (
        <div className="px-3 py-1 text-2xs text-[#9090a8] bg-[#7b68ee]/10 border-b border-[#2e2e3a] flex-shrink-0">
          {selectedLayerIds.length} layers selected — editing first layer
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-[#2e2e3a] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const hasData = (tab.id === 'effects' && hasEffects) || (tab.id === 'masks' && hasMasks) || (tab.id === 'trim' && hasTrim);
          return (
            <button key={tab.id}
              className={`flex items-center gap-1 px-2 py-2 text-2xs whitespace-nowrap transition-colors relative ${activeTab === tab.id ? 'text-[#a08fff] border-b-2 border-[#7b68ee]' : 'text-[#5a5a70] hover:text-[#9090a8]'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={11} />
              {tab.label}
              {hasData && <span className="absolute top-1 right-0 w-1.5 h-1.5 rounded-full bg-[#7b68ee]" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'transform' && <TransformSection layerId={selectedLayerIds[0]} />}
        {activeTab === 'fill' && <FillsSection layerId={selectedLayerIds[0]} />}
        {activeTab === 'stroke' && <StrokesSection layerId={selectedLayerIds[0]} />}
        {activeTab === 'effects' && <EffectsSection layerId={selectedLayerIds[0]} />}
        {activeTab === 'masks' && <MasksSection layerId={selectedLayerIds[0]} />}
        {activeTab === 'trim' && <TrimPathsSection layerId={selectedLayerIds[0]} />}
      </div>
    </div>
  );
}
