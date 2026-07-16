import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { RotateCcw, RotateCw, Clock } from 'lucide-react';

export function HistoryPanel() {
  const { history, historyIndex, undo, redo } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider flex items-center gap-1">
          <Clock size={11}/> History
        </span>
        <div className="flex items-center gap-1">
          <button
            className={`btn-icon w-6 h-6 ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <RotateCcw size={11}/>
          </button>
          <button
            className={`btn-icon w-6 h-6 ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <RotateCw size={11}/>
          </button>
        </div>
      </div>

      <div className="text-2xs text-[#5a5a70] px-3 py-1 border-b border-[#2e2e3a] flex-shrink-0">
        {historyIndex + 1} / {history.length} steps · max 100
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 && (
          <div className="text-center py-8 text-xs text-[#5a5a70]">No history yet</div>
        )}
        {[...history].reverse().map((entry, revIdx) => {
          const idx = history.length - 1 - revIdx;
          const isCurrent = idx === historyIndex;
          const isFuture = idx > historyIndex;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors border-l-2 ${
                isCurrent
                  ? 'bg-[#7b68ee]/15 border-[#7b68ee] text-[#f0f0f5]'
                  : isFuture
                  ? 'border-transparent text-[#3a3a50] opacity-50'
                  : 'border-transparent text-[#9090a8] hover:bg-[#22222a] hover:text-[#f0f0f5]'
              }`}
              onClick={() => {
                if (isCurrent) return;
                const store = useEditorStore.getState();
                const delta = idx - historyIndex;
                if (delta < 0) {
                  for (let i = 0; i < Math.abs(delta); i++) store.undo();
                } else {
                  for (let i = 0; i < delta; i++) store.redo();
                }
              }}
              title={`Jump to: ${entry.name}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-[#7b68ee]' : isFuture ? 'bg-[#3a3a50]' : 'bg-[#5a5a70]'}`}/>
              <span className="text-xs truncate flex-1">{entry.name}</span>
              {isCurrent && <span className="text-2xs text-[#7b68ee] font-semibold flex-shrink-0">Current</span>}
              <span className="text-2xs text-[#3a3a50] flex-shrink-0">#{idx}</span>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-[#2e2e3a] flex-shrink-0">
        <p className="text-2xs text-[#5a5a70] text-center">
          Click any step to jump to that state
        </p>
      </div>
    </div>
  );
}
