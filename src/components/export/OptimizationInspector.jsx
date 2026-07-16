import React, { useMemo, useState } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { analyzeOptimization, optimizeSafely, optimizeAggressively } from '../../engine/export/optimizationEngine.js';
import { CheckCircle, AlertCircle, Info, Zap, Shield } from 'lucide-react';

const SEVERITY_STYLES = {
  info:   { icon: Info,          color: 'text-[#9090a8]', bg: 'bg-[#9090a8]/8',  border: 'border-[#9090a8]/20' },
  low:    { icon: Info,          color: 'text-[#30a0f0]', bg: 'bg-[#30a0f0]/8',  border: 'border-[#30a0f0]/20' },
  medium: { icon: AlertCircle,   color: 'text-[#f0a030]', bg: 'bg-[#f0a030]/8',  border: 'border-[#f0a030]/20' },
  high:   { icon: AlertCircle,   color: 'text-[#f04060]', bg: 'bg-[#f04060]/8',  border: 'border-[#f04060]/20' },
};

export function OptimizationInspector({ inline = false, onOptimized }) {
  const { project, saveHistory } = useEditorStore();
  const [showDetails, setShowDetails] = useState(false);

  const analysis = useMemo(() => analyzeOptimization(project), [project]);

  const doOptimize = (aggressive = false) => {
    saveHistory(aggressive ? 'Optimize Aggressively' : 'Optimize Safely');
    const store = useEditorStore.getState();
    const optimized = aggressive ? optimizeAggressively(project) : optimizeSafely(project);
    store.loadProject(optimized);
    if (onOptimized) onOptimized(optimized);
  };

  const scoreColor = analysis.score >= 80 ? '#30d060' : analysis.score >= 50 ? '#f0a030' : '#f04060';

  return (
    <div className={inline ? '' : 'p-3'} style={{ background: inline ? 'transparent' : undefined }}>
      {/* Score */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="transform -rotate-90 w-12 h-12">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#2e2e3a" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke={scoreColor} strokeWidth="3"
              strokeDasharray={`${analysis.score * 0.942} 94.2`}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: scoreColor }}>
            {analysis.score}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Optimization Score</p>
          <p className="text-xs text-[#5a5a70]">{analysis.totalLayers} layers · {analysis.totalKeyframes} keyframes</p>
          {analysis.estimatedSavingsKB > 0 && (
            <p className="text-xs text-[#30d060]">~{analysis.estimatedSavingsKB}KB potential savings</p>
          )}
        </div>
      </div>

      {/* Issues */}
      {analysis.issues.length === 0 ? (
        <div className="flex items-center gap-2 p-2 rounded bg-[#30d060]/8 border border-[#30d060]/20 mb-3">
          <CheckCircle size={13} className="text-[#30d060]"/>
          <span className="text-xs text-[#30d060]">No optimization issues found!</span>
        </div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {analysis.issues.map((issue, i) => {
            const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
            const Icon = style.icon;
            return (
              <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${style.color} ${style.bg} ${style.border}`}>
                <Icon size={12} className="flex-shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <span>{issue.message}</span>
                  {issue.saving > 0 && <span className="ml-1 text-[#30d060]">(-{issue.saving}KB)</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Optimize buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #30d060, #20a040)' }}
          onClick={() => doOptimize(false)}
        >
          <Shield size={12}/> Safe Optimize
        </button>
        <button
          className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #f0a030, #c07010)' }}
          onClick={() => doOptimize(true)}
          title="Warning: may slightly alter visual appearance (removes hidden layers, reduces precision)"
        >
          <Zap size={12}/> Aggressive
        </button>
      </div>

      {analysis.issues.length > 0 && (
        <button className="w-full mt-2 text-2xs text-[#5a5a70] hover:text-[#9090a8]" onClick={() => setShowDetails(p=>!p)}>
          {showDetails ? '▲ Hide' : '▼ Show'} fix details
        </button>
      )}

      {showDetails && (
        <div className="mt-2 space-y-1 border-t border-[#2e2e3a] pt-2">
          {analysis.issues.map((issue, i) => (
            <div key={i} className="text-2xs text-[#5a5a70]">
              <span className="text-[#9090a8]">{issue.fix}:</span> {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
