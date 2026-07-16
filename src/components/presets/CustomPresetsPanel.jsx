import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { getAnimationPresets, saveAnimationPreset, db } from '../../db/index.js';
import { Save, Trash2, Play, Plus, Star } from 'lucide-react';

export function CustomPresetsPanel() {
  const { project, selectedLayerIds, currentFrame, saveHistory } = useEditorStore();
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const all = await getAnimationPresets().catch(() => []);
    setPresets(all);
  };

  const saveCurrentAsPreset = async () => {
    if (!selectedLayerIds.length || !presetName.trim()) return;
    setSaving(true);

    // Extract keyframes for selected layers
    const layerId = selectedLayerIds[0];
    const layerKfs = project.keyframes.filter(kf => kf.layerId === layerId);
    if (!layerKfs.length) {
      alert('No keyframes found on selected layer. Animate first, then save as preset.');
      setSaving(false);
      return;
    }

    // Normalize keyframes (make relative to first KF frame)
    const minFrame = Math.min(...layerKfs.map(k => k.frame));
    const normalizedKfs = layerKfs.map(kf => ({
      ...kf,
      frame: kf.frame - minFrame,
    }));

    const preset = {
      name: presetName.trim(),
      category: 'Custom',
      keyframes: normalizedKfs,
      duration: Math.max(...normalizedKfs.map(k => k.frame)),
      properties: [...new Set(normalizedKfs.map(k => k.property))],
      compatibleTypes: ['shape','svg','group'],
    };

    await saveAnimationPreset(preset);
    setPresetName('');
    await loadPresets();
    setSaving(false);
  };

  const applyPreset = (preset) => {
    if (!selectedLayerIds.length) return;
    saveHistory('Apply Custom Preset: ' + preset.name);

    const store = useEditorStore.getState();
    selectedLayerIds.forEach(layerId => {
      (preset.keyframes || []).forEach(kf => {
        store.setKeyframe(layerId, kf.property, currentFrame + kf.frame, kf.value, kf.easing);
      });
    });
  };

  const [deletingPresetId, setDeletingPresetId] = useState(null);

  const deletePreset = async (id) => {
    if (deletingPresetId === id) {
      await db.animationPresets.delete(id);
      await loadPresets();
      setDeletingPresetId(null);
    } else {
      setDeletingPresetId(id);
      // Auto-reset after 3s
      setTimeout(() => setDeletingPresetId(prev => prev === id ? null : prev), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider flex items-center gap-1">
          <Star size={11}/> Custom Presets
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Save current KFs as preset */}
        <div className="border border-[#2e2e3a] rounded-lg p-2.5 space-y-2">
          <p className="text-2xs font-semibold text-[#9090a8]">Save Selected Layer's Animation</p>
          <p className="text-2xs text-[#5a5a70]">
            Select a layer with keyframes, name it, and save for reuse.
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCurrentAsPreset(); }}
              className="input flex-1 text-xs"
            />
            <button
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white flex-shrink-0 ${
                selectedLayerIds.length && presetName.trim() ? '' : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ background: 'linear-gradient(135deg,#7b68ee,#5c4de0)' }}
              onClick={saveCurrentAsPreset}
              disabled={!selectedLayerIds.length || !presetName.trim() || saving}
            >
              <Save size={11}/> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {selectedLayerIds.length === 0 && (
            <p className="text-2xs text-[#f0a030]">Select a layer first</p>
          )}
        </div>

        {/* Preset list */}
        {presets.length === 0 && (
          <div className="text-center py-6 text-xs text-[#5a5a70]">
            No custom presets yet. Animate a layer and save it above.
          </div>
        )}

        {presets.map(preset => (
          <div key={preset.id} className="rounded border border-[#2e2e3a] overflow-hidden group">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#f0f0f5] truncate font-medium">{preset.name}</p>
                <p className="text-2xs text-[#5a5a70]">
                  {(preset.properties || []).join(', ')} · {preset.duration}fr
                </p>
              </div>
              <button
                className="btn-icon w-6 h-6 text-[#30a0f0]"
                onClick={() => applyPreset(preset)}
                title="Apply to selected layer at current frame"
              >
                <Play size={11}/>
              </button>
              <button
                className={`btn-icon w-6 h-6 ${deletingPresetId === preset.id ? 'text-white bg-[#f04060] rounded' : 'text-[#f04060]'}`}
                onClick={() => deletePreset(preset.id)}
                title={deletingPresetId === preset.id ? 'Click again to confirm delete' : 'Delete preset'}
              >
                <Trash2 size={11}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
