import React, { useState } from 'react';
import { AnimationPresetsPanel } from '../presets/AnimationPresetsPanel.jsx';
import { StaggerPanel } from '../stagger/StaggerPanel.jsx';
import { LoopMakerPanel } from '../presets/LoopMakerPanel.jsx';
import { MotionPathPanel } from '../motionpath/MotionPathPanel.jsx';
import { ParentChildPanel } from './ParentChildPanel.jsx';
import { EasingPanel } from '../easing/EasingPanel.jsx';
import { OrganicMotionPanel } from '../organic/OrganicMotionPanel.jsx';
import { ColorRandomizerPanel } from '../randomizer/ColorRandomizerPanel.jsx';
import { QuickAnimationsPanel } from '../presets/QuickAnimationsPanel.jsx';
import { Zap, GitBranch, Repeat, Spline, Link2, Activity, Leaf, Shuffle, Flag, Clock, Star, Sparkles } from 'lucide-react';
import { MarkersPanel } from '../timeline/MarkersPanel.jsx';
import { HistoryPanel } from './HistoryPanel.jsx';
import { CustomPresetsPanel } from '../presets/CustomPresetsPanel.jsx';

const TABS = [
  { id: 'presets',  label: 'Presets',  icon: Zap },
  { id: 'quick',    label: 'Quick',    icon: Sparkles },
  { id: 'custom',   label: 'Custom',   icon: Star },
  { id: 'organic',  label: 'Organic',  icon: Leaf },
  { id: 'easing',   label: 'Easing',   icon: Activity },
  { id: 'stagger',  label: 'Stagger',  icon: GitBranch },
  { id: 'loop',     label: 'Loop',     icon: Repeat },
  { id: 'markers',  label: 'Markers',  icon: Flag },
  { id: 'path',     label: 'Motion',   icon: Spline },
  { id: 'parent',   label: 'Parent',   icon: Link2 },
  { id: 'random',   label: 'Random',   icon: Shuffle },
  { id: 'history',  label: 'History',  icon: Clock },
];

export function AnimationPanel() {
  const [tab, setTab] = useState('presets');

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#16161a' }}>
      {/* Vertical tab sidebar */}
      <div className="flex flex-col border-r border-[#2e2e3a] flex-shrink-0 overflow-y-auto"
        style={{ width: 44, minWidth: 44 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`flex flex-col items-center justify-center py-2.5 px-1 text-2xs transition-colors relative flex-shrink-0 ${
                tab === t.id
                  ? 'text-[#a08fff] bg-[#7b68ee]/15 border-l-2 border-[#7b68ee]'
                  : 'text-[#5a5a70] hover:text-[#9090a8] hover:bg-[#1e1e26] border-l-2 border-transparent'
              }`}
              onClick={() => setTab(t.id)}
              title={t.label}
              style={{ minHeight: 48 }}
            >
              <Icon size={13} />
              <span className="mt-1 leading-tight" style={{ fontSize: 9, writingMode: 'horizontal-tb' }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden min-w-0">
        {tab === 'presets'  && <div className="h-full overflow-y-auto"><AnimationPresetsPanel /></div>}
        {tab === 'quick'    && <div className="h-full overflow-hidden"><QuickAnimationsPanel /></div>}
        {tab === 'custom'   && <div className="h-full overflow-hidden"><CustomPresetsPanel /></div>}
        {tab === 'history'  && <div className="h-full overflow-hidden"><HistoryPanel /></div>}
        {tab === 'organic'  && <div className="h-full overflow-y-auto"><OrganicMotionPanel /></div>}
        {tab === 'easing'   && <div className="h-full overflow-y-auto"><EasingPanel /></div>}
        {tab === 'stagger'  && <div className="h-full overflow-y-auto p-3"><StaggerPanel /></div>}
        {tab === 'loop'     && <div className="h-full overflow-y-auto p-3"><LoopMakerPanel /></div>}
        {tab === 'markers'  && <div className="h-full overflow-y-auto"><MarkersPanel /></div>}
        {tab === 'path'     && <div className="h-full overflow-y-auto p-3"><MotionPathPanel /></div>}
        {tab === 'parent'   && <div className="h-full overflow-y-auto"><ParentChildPanel /></div>}
        {tab === 'random'   && <div className="h-full overflow-y-auto"><ColorRandomizerPanel /></div>}
      </div>
    </div>
  );
}
