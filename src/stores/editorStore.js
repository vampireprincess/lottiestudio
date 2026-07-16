import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { createProject, createLayer, createKeyframe, addLayer, removeLayer, updateLayer } from '../engine/project.js';

const MAX_HISTORY = 50; // Reduced for performance

// Fast shallow clone helper - avoids full JSON.parse/stringify on every keystroke
// Only deep-clones the parts that actually change
function fastProjectSnapshot(project) {
  return {
    ...project,
    layers: { ...project.layers },
    rootLayers: [...project.rootLayers],
    keyframes: project.keyframes ? [...project.keyframes] : [],
    markers: project.markers ? [...project.markers] : [],
    globalColors: project.globalColors ? [...project.globalColors] : [],
    motionPaths: project.motionPaths ? [...project.motionPaths] : [],
  };
}

function restoreProjectSnapshot(snapshot) {
  return {
    ...snapshot,
    layers: { ...snapshot.layers },
    rootLayers: [...snapshot.rootLayers],
    keyframes: [...(snapshot.keyframes || [])],
    markers: [...(snapshot.markers || [])],
    globalColors: [...(snapshot.globalColors || [])],
    motionPaths: [...(snapshot.motionPaths || [])],
  };
}

/**
 * Main editor store - manages all editor state
 */
export const useEditorStore = create(
  immer((set, get) => ({
    // ── Project State ──────────────────────────────────────────────────────────
    project: createProject(),
    
    // ── UI State ───────────────────────────────────────────────────────────────
    tool: 'select', // select, editPoints, pen, pencil, rect, ellipse, polygon, star, line, etc.
    
    // Canvas view
    canvasZoom: 1,
    canvasPanX: 0,
    canvasPanY: 0,
    showRulers: true,
    showGrid: false,
    gridSize: 20,
    showGuides: true,
    snapToGrid: false,
    snapToObjects: true,
    showCheckerboard: true,
    showGuides: true,
    snapToGrid: false,
    snapToObjects: true,
    canvasBackground: 'checkerboard',
    previewMode: 'normal',
    
    // Selection
    selectedLayerIds: [],
    selectedKeyframeIds: [],
    hoveredLayerId: null,
    
    // Timeline
    currentFrame: 0,
    isPlaying: false,
    playbackSpeed: 1,
    loopMode: 'loop',
    workAreaStart: 0,
    workAreaEnd: 180,
    timelineZoom: 1,
    timelineScrollX: 0,
    
    // Auto-Key
    autoKey: false,
    
    // Panels
    panels: {
      layers: { visible: true, collapsed: false, width: 240 },
      properties: { visible: true, collapsed: false, width: 280 },
      timeline: { visible: true, collapsed: false, height: 220 },
      assets: { visible: true, collapsed: false, width: 240 },
      gradients: { visible: false, collapsed: false },
      colors: { visible: false, collapsed: false },
      presets: { visible: false, collapsed: false },
      export: { visible: false, collapsed: false },
    },
    
    // Active workspace layout
    workspaceLayout: 'animation',
    
    // UI modals
    activeModal: null,
    modalData: null,
    
    // Dark mode
    darkMode: true,
    
    // Onion skin
    onionSkin: {
      enabled: false,
      pastCount: 2,
      futureCount: 2,
      opacity: 0.3,
      pastColor: '#0070ff',
      futureColor: '#ff4000',
      selectedLayersOnly: false,
    },
    
    // Floating toolbar
    floatingToolbar: {
      visible: false,
      x: 100,
      y: 100,
      docked: false,
    },

    // Attachment Points mode — set when user clicks "Set Anchor/Pivot/Hang/Follow Point"
    attachmentPointMode: null, // null | 'anchor' | 'pivot' | 'hangPoint' | 'followPoint' | 'growthOrigin'
    
    // Clipboard
    clipboard: null,
    styleClipboard: null,   // { fills, strokes, effects, opacity, blendMode }
    
    // Active gradient swatch panel
    gradientSwatchCategory: 'All',
    
    // ── Undo/Redo ─────────────────────────────────────────────────────────────
    history: [],
    historyIndex: -1,
    
    // ── Actions ───────────────────────────────────────────────────────────────
    
    /** Set active tool */
    setTool(tool) {
      set(state => { state.tool = tool; });
    },
    
    /** Set canvas zoom */
    setZoom(zoom) {
      set(state => { state.canvasZoom = Math.max(0.05, Math.min(20, zoom)); });
    },
    
    /** Pan canvas */
    setPan(x, y) {
      set(state => { state.canvasPanX = x; state.canvasPanY = y; });
    },
    
    /** Select layers */
    selectLayers(ids, additive = false) {
      set(state => {
        if (additive) {
          const current = new Set(state.selectedLayerIds);
          ids.forEach(id => {
            if (current.has(id)) current.delete(id);
            else current.add(id);
          });
          state.selectedLayerIds = [...current];
        } else {
          state.selectedLayerIds = ids;
        }
      });
    },
    
    /** Deselect all */
    deselectAll() {
      set(state => { state.selectedLayerIds = []; });
    },
    
    /** Set current frame — supports function updater for playback loop */
    setFrame(frameOrFn) {
      set(state => {
        const frame = typeof frameOrFn === 'function' ? frameOrFn(state.currentFrame) : frameOrFn;
        state.currentFrame = Math.max(0, Math.min(state.project.totalFrames - 1, frame));
      });
    },
    
    /** Toggle playback */
    togglePlay() {
      set(state => { state.isPlaying = !state.isPlaying; });
    },
    
    /** Set playback state */
    setPlaying(playing) {
      set(state => { state.isPlaying = playing; });
    },
    
    /** Set attachment point mode */
    setAttachmentPointMode(mode) {
      set(state => { state.attachmentPointMode = mode; });
    },

    /** Set attachment point on layer at canvas position */
    setAttachmentPoint(layerId, pointType, pos) {
      set(state => {
        const layer = state.project.layers[layerId];
        if (!layer) return;
        state.project.layers[layerId].attachmentPoints = {
          ...(layer.attachmentPoints || {}),
          [pointType]: pos,
        };
      });
    },

    /** Toggle dark mode */
    toggleDarkMode() {
      set(state => { state.darkMode = !state.darkMode; });
    },
    
    /** Toggle panel visibility */
    togglePanel(name) {
      set(state => {
        if (state.panels[name]) {
          state.panels[name].visible = !state.panels[name].visible;
        }
      });
    },
    
    /** Collapse/expand panel */
    collapsePanel(name, collapsed) {
      set(state => {
        if (state.panels[name]) {
          state.panels[name].collapsed = collapsed;
        }
      });
    },
    
    /** Set workspace layout */
    setWorkspaceLayout(layout) {
      set(state => {
        state.workspaceLayout = layout;
        // Apply layout presets
        switch(layout) {
          case 'animation':
            state.panels.layers.visible = true;
            state.panels.properties.visible = true;
            state.panels.timeline.visible = true;
            state.panels.assets.visible = false;
            state.panels.export.visible = false;
            break;
          case 'svgEditing':
            state.panels.layers.visible = true;
            state.panels.properties.visible = true;
            state.panels.timeline.visible = false;
            state.panels.assets.visible = true;
            break;
          case 'timelineFocus':
            state.panels.layers.visible = true;
            state.panels.properties.visible = false;
            state.panels.timeline.visible = true;
            state.panels.timeline.height = 360;
            break;
          case 'export':
            state.panels.layers.visible = false;
            state.panels.properties.visible = false;
            state.panels.export.visible = true;
            state.panels.timeline.visible = false;
            break;
          case 'compact':
            state.panels.layers.visible = true;
            state.panels.properties.visible = true;
            state.panels.timeline.visible = true;
            state.panels.assets.visible = false;
            state.panels.panels = { height: 160, width: 200 };
            break;
        }
      });
    },
    
    /** Open modal */
    openModal(name, data = null) {
      set(state => { state.activeModal = name; state.modalData = data; });
    },
    
    /** Close modal */
    closeModal() {
      set(state => { state.activeModal = null; state.modalData = null; });
    },
    
    /** Toggle auto-key */
    toggleAutoKey() {
      set(state => { state.autoKey = !state.autoKey; });
    },
    
    /** Toggle onion skin */
    toggleOnionSkin() {
      set(state => { state.onionSkin.enabled = !state.onionSkin.enabled; });
    },
    
    /** Update onion skin settings */
    updateOnionSkin(updates) {
      set(state => { Object.assign(state.onionSkin, updates); });
    },
    
    /** Update canvas display settings */
    updateCanvasSettings(updates) {
      set(state => { Object.assign(state, updates); });
    },
    
    /** Set work area */
    setWorkArea(start, end) {
      set(state => { state.workAreaStart = start; state.workAreaEnd = end; });
    },
    
    /** ─── History/Undo System ─────────────────────────────────────────────── */
    
    /** Save state to history — uses fast structural snapshot instead of deep clone */
    saveHistory(actionName) {
      set(state => {
        const snapshot = {
          id: uuidv4(),
          name: actionName || 'Action',
          timestamp: Date.now(),
          project: fastProjectSnapshot(state.project),
        };
        
        // Remove any forward history
        const trimmed = state.history.slice(0, state.historyIndex + 1);
        trimmed.push(snapshot);
        
        if (trimmed.length > MAX_HISTORY) {
          state.history = trimmed.slice(trimmed.length - MAX_HISTORY);
        } else {
          state.history = trimmed;
        }
        
        state.historyIndex = state.history.length - 1;
      });
    },
    
    /** Undo */
    undo() {
      set(state => {
        if (state.historyIndex <= 0) return;
        state.historyIndex--;
        const snapshot = state.history[state.historyIndex];
        if (snapshot) {
          state.project = restoreProjectSnapshot(snapshot.project);
          state.selectedLayerIds = state.selectedLayerIds.filter(
            id => state.project.layers[id]
          );
        }
      });
    },
    
    /** Redo */
    redo() {
      set(state => {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex++;
        const snapshot = state.history[state.historyIndex];
        if (snapshot) {
          state.project = restoreProjectSnapshot(snapshot.project);
        }
      });
    },
    
    /** ─── Project Operations ─────────────────────────────────────────────── */
    
    /** Load project */
    loadProject(project) {
      set(state => {
        state.project = project;
        state.selectedLayerIds = [];
        state.selectedKeyframeIds = [];
        state.currentFrame = 0;
        state.isPlaying = false;           // ← stop playback on project switch
        state.history = [];
        state.historyIndex = -1;
        // Sync work area with new project duration
        state.workAreaStart = 0;
        state.workAreaEnd = Math.max(0, (project.totalFrames || 180) - 1);
      });
      get().saveHistory('Load Project');
    },
    
    /** Update project settings */
    updateProjectSettings(updates) {
      get().saveHistory('Update Project Settings');
      set(state => {
        Object.assign(state.project, updates);
        state.project.updatedAt = Date.now();
        // Sync workAreaEnd with totalFrames when it changes
        if (updates.totalFrames !== undefined) {
          state.workAreaEnd = Math.min(state.workAreaEnd, updates.totalFrames - 1);
          if (state.workAreaEnd <= state.workAreaStart) {
            state.workAreaEnd = updates.totalFrames - 1;
          }
        }
      });
    },
    
    /** ─── Layer Operations ───────────────────────────────────────────────── */
    
    /** Add a new layer */
    addLayer(layerData, parentId = null) {
      get().saveHistory(`Add ${layerData.type || 'Layer'}`);
      set(state => {
        const layer = createLayer(layerData);
        const newProject = addLayer(state.project, layer, parentId);
        state.project = newProject;
        state.selectedLayerIds = [layer.id];
      });
    },
    
    /** Remove layer(s) */
    removeLayers(ids) {
      get().saveHistory('Delete Layer(s)');
      set(state => {
        let p = state.project;
        for (const id of ids) {
          p = removeLayer(p, id);
        }
        state.project = p;
        state.selectedLayerIds = state.selectedLayerIds.filter(id => !ids.includes(id));
      });
    },
    
    /** Update layer */
    updateLayer(layerId, updates) {
      set(state => {
        if (state.project.layers[layerId]) {
          Object.assign(state.project.layers[layerId], updates);
          state.project.updatedAt = Date.now();
        }
      });
    },
    
    /** Update layer with history */
    updateLayerWithHistory(layerId, updates, actionName = 'Update Layer') {
      get().saveHistory(actionName);
      get().updateLayer(layerId, updates);
    },
    
    /** Duplicate layer */
    duplicateLayer(layerId) {
      get().saveHistory('Duplicate Layer');
      set(state => {
        const layer = state.project.layers[layerId];
        if (!layer) return;
        
        // Fast shallow copy — preserves fills/strokes/effects references (safe for immutable data)
        const newLayer = {
          ...layer,
          id: uuidv4(),
          name: layer.name + ' Copy',
          children: [],
          fills: layer.fills ? layer.fills.map(f => ({ ...f })) : [],
          strokes: layer.strokes ? layer.strokes.map(s => ({ ...s })) : [],
          effects: layer.effects ? layer.effects.map(e => ({ ...e })) : [],
          masks: layer.masks ? layer.masks.map(m => ({ ...m })) : [],
          transform: layer.transform ? { ...layer.transform, position: { ...layer.transform.position } } : {},
        };
        
        state.project.layers[newLayer.id] = newLayer;
        
        // Insert after original in rootLayers or parent
        if (layer.parentId && state.project.layers[layer.parentId]) {
          const parent = state.project.layers[layer.parentId];
          const idx = parent.children.indexOf(layerId);
          parent.children.splice(idx + 1, 0, newLayer.id);
          newLayer.parentId = layer.parentId;
        } else {
          const idx = state.project.rootLayers.indexOf(layerId);
          state.project.rootLayers.splice(idx + 1, 0, newLayer.id);
          newLayer.parentId = null;
        }
        
        state.selectedLayerIds = [newLayer.id];
      });
    },
    
    /** Reorder layer */
    reorderLayer(layerId, newIndex, parentId = null) {
      get().saveHistory('Reorder Layer');
      set(state => {
        const layer = state.project.layers[layerId];
        if (!layer) return;
        
        const list = parentId
          ? state.project.layers[parentId]?.children
          : state.project.rootLayers;
        
        if (!list) return;
        
        const oldIdx = list.indexOf(layerId);
        if (oldIdx === -1) return;
        
        list.splice(oldIdx, 1);
        list.splice(newIndex, 0, layerId);
      });
    },
    
    /** Group selected layers */
    groupLayers(ids) {
      if (ids.length < 1) return;
      get().saveHistory('Group Layers');
      set(state => {
        const groupId = uuidv4();
        const group = createLayer({
          id: groupId,
          name: 'Group',
          type: 'group',
          children: [],
        });
        
        // Find insertion point (min index in rootLayers)
        const indices = ids
          .map(id => state.project.rootLayers.indexOf(id))
          .filter(i => i !== -1);
        
        const minIdx = indices.length > 0 ? Math.min(...indices) : state.project.rootLayers.length;
        
        // Remove from rootLayers
        state.project.rootLayers = state.project.rootLayers.filter(id => !ids.includes(id));
        state.project.rootLayers.splice(minIdx, 0, groupId);
        
        // Set group as parent
        group.children = ids;
        ids.forEach(id => {
          if (state.project.layers[id]) {
            state.project.layers[id].parentId = groupId;
          }
        });
        
        state.project.layers[groupId] = group;
        state.selectedLayerIds = [groupId];
      });
    },
    
    /** Ungroup */
    ungroupLayer(groupId) {
      get().saveHistory('Ungroup');
      set(state => {
        const group = state.project.layers[groupId];
        if (!group || group.type !== 'group') return;
        
        const children = group.children || [];
        const idx = state.project.rootLayers.indexOf(groupId);
        
        state.project.rootLayers.splice(idx, 1, ...children);
        children.forEach(id => {
          if (state.project.layers[id]) {
            state.project.layers[id].parentId = null;
          }
        });
        
        delete state.project.layers[groupId];
        state.selectedLayerIds = children;
      });
    },
    
    /** Move layers up/down/to front/back */
    moveLayerUp(layerId) {
      set(state => {
        const list = state.project.rootLayers;
        const idx = list.indexOf(layerId);
        if (idx > 0) {
          [list[idx], list[idx-1]] = [list[idx-1], list[idx]];
        }
      });
    },
    
    moveLayerDown(layerId) {
      set(state => {
        const list = state.project.rootLayers;
        const idx = list.indexOf(layerId);
        if (idx < list.length - 1) {
          [list[idx], list[idx+1]] = [list[idx+1], list[idx]];
        }
      });
    },
    
    /** ─── Keyframe Operations ───────────────────────────────────────────── */
    
    /** Add or update keyframe */
    setKeyframe(layerId, property, frame, value, easing) {
      set(state => {
        const existing = state.project.keyframes.findIndex(
          kf => kf.layerId === layerId && kf.property === property && kf.frame === frame
        );
        
        if (existing !== -1) {
          state.project.keyframes[existing].value = value;
          if (easing) state.project.keyframes[existing].easing = easing;
        } else {
          state.project.keyframes.push(
            createKeyframe(layerId, property, frame, value, easing)
          );
        }
        
        state.project.updatedAt = Date.now();
      });
    },
    
    /** Remove keyframe */
    removeKeyframe(keyframeId) {
      get().saveHistory('Delete Keyframe');
      set(state => {
        state.project.keyframes = state.project.keyframes.filter(kf => kf.id !== keyframeId);
      });
    },
    
    /** Select keyframes */
    selectKeyframes(ids, additive = false) {
      set(state => {
        if (additive) {
          const current = new Set(state.selectedKeyframeIds);
          ids.forEach(id => {
            if (current.has(id)) current.delete(id);
            else current.add(id);
          });
          state.selectedKeyframeIds = [...current];
        } else {
          state.selectedKeyframeIds = ids;
        }
      });
    },
    
    /** Move keyframes by delta frames */
    moveKeyframes(ids, deltaFrames) {
      set(state => {
        state.project.keyframes = state.project.keyframes.map(kf => {
          if (ids.includes(kf.id)) {
            return { ...kf, frame: Math.max(0, kf.frame + deltaFrames) };
          }
          return kf;
        });
      });
    },
    
    /** Update keyframe easing */
    updateKeyframeEasing(ids, easing) {
      get().saveHistory('Update Easing');
      set(state => {
        state.project.keyframes = state.project.keyframes.map(kf => {
          if (ids.includes(kf.id)) {
            return { ...kf, easing };
          }
          return kf;
        });
      });
    },
    
    /** ─── Marker Operations ─────────────────────────────────────────────── */
    
    addMarker(marker) {
      get().saveHistory('Add Marker');
      set(state => {
        const frame = get().currentFrame;
        state.project.markers.push({
          id: uuidv4(),
          name: 'Marker',
          frame,
          color: '#f0a030',
          endFrame: frame + 30,  // default 1s segment
          isLoop: false,
          exportFlag: false,
          ...marker,
        });
      });
    },
    
    removeMarker(id) {
      get().saveHistory('Remove Marker');
      set(state => {
        state.project.markers = state.project.markers.filter(m => m.id !== id);
      });
    },
    
    updateMarker(id, updates) {
      set(state => {
        const m = state.project.markers.find(m => m.id === id);
        if (m) Object.assign(m, updates);
      });
    },
    
    /** ─── SVG Import ─────────────────────────────────────────────────────── */
    
    importSVG(svgContent, importOptions = {}) {
      get().saveHistory('Import SVG');
      set(state => {
        const layerId = uuidv4();
        const layer = createLayer({
          id: layerId,
          name: importOptions.name || 'SVG Import',
          type: 'svg',
          svgContent,
          visible: true,
        });
        
        state.project.layers[layerId] = layer;
        state.project.rootLayers.push(layerId);
        state.selectedLayerIds = [layerId];
        state.project.updatedAt = Date.now();
      });
    },
    
    /** ─── Global Colors ─────────────────────────────────────────────────── */
    
    addGlobalColor(color) {
      set(state => {
        state.project.globalColors.push({
          id: uuidv4(),
          name: 'Color',
          color,
          linkedLayers: [],
          linkedProperties: [],
          locked: false,
        });
      });
    },
    
    updateGlobalColor(id, updates) {
      set(state => {
        const gc = state.project.globalColors.find(c => c.id === id);
        if (gc) Object.assign(gc, updates);
      });
    },
    
    /** ─── UI helper ──────────────────────────────────────────────────────── */
    
    /** Get selected layer (first one) */
    getSelectedLayer() {
      const state = get();
      const id = state.selectedLayerIds[0];
      return id ? state.project.layers[id] : null;
    },
    
    /** Get all selected layers */
    getSelectedLayers() {
      const state = get();
      return state.selectedLayerIds
        .map(id => state.project.layers[id])
        .filter(Boolean);
    },
    
    /** Get keyframes for selected layer */
    getSelectedLayerKeyframes() {
      const state = get();
      const id = state.selectedLayerIds[0];
      if (!id) return [];
      return state.project.keyframes.filter(kf => kf.layerId === id);
    },
  }))
);
