import Dexie from 'dexie';

/**
 * IndexedDB database using Dexie.js
 * All persistent local data is stored here
 */
export const db = new Dexie('LottieStudio');

db.version(1).stores({
  // Projects metadata and full data
  projects: '++id, name, updatedAt, createdAt, thumbnail',
  
  // Autosave snapshots
  autosaves: '++id, projectId, timestamp, label',
  
  // Recovery checkpoints
  recoveryPoints: '++id, projectId, timestamp, type',
  
  // User preferences
  preferences: 'key',
  
  // Color swatches (individual colors)
  colorSwatches: '++id, name, category, isFavorite, createdAt',
  
  // Color palettes (named collections)
  colorPalettes: '++id, name, category, isFavorite, createdAt',
  
  // Gradient swatches
  gradientSwatches: '++id, name, category, isFavorite, createdAt',
  
  // Animation presets (user-created)
  animationPresets: '++id, name, category, compatibleTypes, createdAt',
  
  // Easing presets
  easingPresets: '++id, name, isFavorite',
  
  // Export presets
  exportPresets: '++id, name, format, createdAt',
  
  // Asset library entries
  assets: '++id, name, type, category, tags, isFavorite, path, createdAt',
  
  // Recent files
  recentFiles: '++id, projectId, name, path, openedAt',
  
  // Glow/Shadow presets
  effectPresets: '++id, name, type, isFavorite, createdAt',
  
  // History for undo in permanent storage (not used for in-memory undo)
  // This is for named save points only
  savePoints: '++id, projectId, name, timestamp, data',
});

// ─── Project Operations ───────────────────────────────────────────────────────

export async function saveProject(project) {
  const existing = await db.projects.where('id').equals(project.id).first();
  if (existing) {
    await db.projects.put({ ...project, dbId: existing.dbId });
  } else {
    await db.projects.add(project);
  }
  return project;
}

export async function loadProject(id) {
  return await db.projects.where('id').equals(id).first();
}

export async function listProjects() {
  return await db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function deleteProject(id) {
  await db.projects.where('id').equals(id).delete();
  await db.autosaves.where('projectId').equals(id).delete();
  await db.recoveryPoints.where('projectId').equals(id).delete();
}

// ─── Autosave Operations ──────────────────────────────────────────────────────

export async function createAutosave(projectId, data, label = 'autosave') {
  const id = await db.autosaves.add({
    projectId,
    timestamp: Date.now(),
    label,
    data: JSON.stringify(data),
  });
  
  // Keep only last 20 autosaves per project
  const saves = await db.autosaves
    .where('projectId').equals(projectId)
    .sortBy('timestamp');
  
  if (saves.length > 20) {
    const toDelete = saves.slice(0, saves.length - 20).map(s => s.id);
    await db.autosaves.bulkDelete(toDelete);
  }
  
  return id;
}

export async function getLatestAutosave(projectId) {
  const saves = await db.autosaves
    .where('projectId').equals(projectId)
    .sortBy('timestamp');
  return saves[saves.length - 1] || null;
}

export async function getAutosaves(projectId) {
  return await db.autosaves
    .where('projectId').equals(projectId)
    .sortBy('timestamp');
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getPref(key, defaultValue = null) {
  const record = await db.preferences.get(key);
  return record ? record.value : defaultValue;
}

export async function setPref(key, value) {
  await db.preferences.put({ key, value });
}

export async function getAllPrefs() {
  const prefs = await db.preferences.toArray();
  return prefs.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {});
}

// ─── Gradient Swatches ────────────────────────────────────────────────────────

export async function getGradientSwatches(category = null) {
  if (category) {
    return await db.gradientSwatches.where('category').equals(category).toArray();
  }
  return await db.gradientSwatches.toArray();
}

export async function saveGradientSwatch(swatch) {
  if (swatch.id && swatch.id > 0) {
    await db.gradientSwatches.put(swatch);
    return swatch.id;
  }
  const id = await db.gradientSwatches.add({
    ...swatch,
    createdAt: Date.now(),
    isFavorite: false,
  });
  return id;
}

export async function deleteGradientSwatch(id) {
  await db.gradientSwatches.delete(id);
}

// ─── Color Swatches ───────────────────────────────────────────────────────────

export async function getColorSwatches() {
  return await db.colorSwatches.toArray();
}

export async function saveColorSwatch(swatch) {
  if (swatch.id) {
    await db.colorSwatches.put(swatch);
    return swatch.id;
  }
  return await db.colorSwatches.add({ ...swatch, createdAt: Date.now() });
}

// ─── Animation Presets ────────────────────────────────────────────────────────

export async function getAnimationPresets() {
  return await db.animationPresets.toArray();
}

export async function saveAnimationPreset(preset) {
  if (preset.id) {
    await db.animationPresets.put(preset);
    return preset.id;
  }
  return await db.animationPresets.add({ ...preset, createdAt: Date.now() });
}

// ─── Export Presets ───────────────────────────────────────────────────────────

export async function getExportPresets() {
  return await db.exportPresets.toArray();
}

export async function saveExportPreset(preset) {
  if (preset.id) {
    await db.exportPresets.put(preset);
    return preset.id;
  }
  return await db.exportPresets.add({ ...preset, createdAt: Date.now() });
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function getAssets(type = null) {
  if (type) {
    return await db.assets.where('type').equals(type).toArray();
  }
  return await db.assets.toArray();
}

export async function saveAsset(asset) {
  if (asset.id) {
    await db.assets.put(asset);
    return asset.id;
  }
  return await db.assets.add({ ...asset, createdAt: Date.now() });
}

export async function deleteAsset(id) {
  await db.assets.delete(id);
}

// ─── Recent Files ─────────────────────────────────────────────────────────────

export async function addRecentFile(projectId, name) {
  // Remove existing entry for this project
  await db.recentFiles.where('projectId').equals(projectId).delete();
  
  await db.recentFiles.add({
    projectId,
    name,
    openedAt: Date.now(),
  });
  
  // Keep only last 20
  const all = await db.recentFiles.orderBy('openedAt').toArray();
  if (all.length > 20) {
    const toDelete = all.slice(0, all.length - 20).map(f => f.id);
    await db.recentFiles.bulkDelete(toDelete);
  }
}

export async function getRecentFiles() {
  return await db.recentFiles.orderBy('openedAt').reverse().limit(20).toArray();
}

// ─── Seed built-in gradient swatches ─────────────────────────────────────────

export async function seedBuiltinGradients() {
  const existing = await db.gradientSwatches.count();
  if (existing > 0) return;
  
  const builtins = [
    // Pastel
    { name: 'Soft Pink', category: 'Pastel', stops: [
      { id: '1', position: 0, color: { r: 255, g: 182, b: 193, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 255, g: 228, b: 225, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 135 },
    { name: 'Lavender Dream', category: 'Pastel', stops: [
      { id: '1', position: 0, color: { r: 196, g: 181, b: 253, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 221, g: 214, b: 254, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 135 },
    { name: 'Mint Cream', category: 'Pastel', stops: [
      { id: '1', position: 0, color: { r: 167, g: 243, b: 208, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 209, g: 250, b: 229, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 135 },
    // Neon
    { name: 'Neon Purple', category: 'Neon', stops: [
      { id: '1', position: 0, color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 0, g: 255, b: 255, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 90 },
    { name: 'Neon Pink', category: 'Neon', stops: [
      { id: '1', position: 0, color: { r: 255, g: 0, b: 128, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 255, g: 0, b: 255, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 90 },
    { name: 'Electric Blue', category: 'Neon', stops: [
      { id: '1', position: 0, color: { r: 0, g: 100, b: 255, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 0, g: 200, b: 255, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 90 },
    // Sunset
    { name: 'Sunset Fire', category: 'Sunset', stops: [
      { id: '1', position: 0, color: { r: 255, g: 65, b: 108, a: 1 }, opacity: 1 },
      { id: '2', position: 0.5, color: { r: 255, g: 150, b: 40, a: 1 }, opacity: 1 },
      { id: '3', position: 1, color: { r: 255, g: 220, b: 60, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 180 },
    { name: 'Dusk Purple', category: 'Sunset', stops: [
      { id: '1', position: 0, color: { r: 60, g: 20, b: 100, a: 1 }, opacity: 1 },
      { id: '2', position: 0.5, color: { r: 200, g: 60, b: 120, a: 1 }, opacity: 1 },
      { id: '3', position: 1, color: { r: 255, g: 150, b: 80, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 135 },
    // Ocean
    { name: 'Deep Ocean', category: 'Ocean', stops: [
      { id: '1', position: 0, color: { r: 0, g: 32, b: 96, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 0, g: 160, b: 200, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 180 },
    { name: 'Tropical Wave', category: 'Ocean', stops: [
      { id: '1', position: 0, color: { r: 0, g: 180, b: 180, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 0, g: 120, b: 255, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 90 },
    // Metallic
    { name: 'Gold', category: 'Metallic', stops: [
      { id: '1', position: 0, color: { r: 180, g: 130, b: 20, a: 1 }, opacity: 1 },
      { id: '2', position: 0.3, color: { r: 255, g: 220, b: 80, a: 1 }, opacity: 1 },
      { id: '3', position: 0.6, color: { r: 200, g: 160, b: 40, a: 1 }, opacity: 1 },
      { id: '4', position: 1, color: { r: 255, g: 230, b: 100, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 45 },
    { name: 'Silver', category: 'Metallic', stops: [
      { id: '1', position: 0, color: { r: 160, g: 160, b: 170, a: 1 }, opacity: 1 },
      { id: '2', position: 0.4, color: { r: 230, g: 230, b: 240, a: 1 }, opacity: 1 },
      { id: '3', position: 1, color: { r: 180, g: 180, b: 190, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 45 },
    // Dark
    { name: 'Dark Matter', category: 'Dark', stops: [
      { id: '1', position: 0, color: { r: 10, g: 10, b: 20, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 40, g: 30, b: 60, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 135 },
    { name: 'Night Sky', category: 'Dark', stops: [
      { id: '1', position: 0, color: { r: 5, g: 10, b: 30, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 20, g: 40, b: 80, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 180 },
    // Transparent Fade
    { name: 'Fade to Transparent', category: 'Transparent Fade', stops: [
      { id: '1', position: 0, color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 0, g: 0, b: 0, a: 0 }, opacity: 0 }
    ], type: 'linear', angle: 0 },
    { name: 'White Vignette', category: 'Transparent Fade', stops: [
      { id: '1', position: 0, color: { r: 255, g: 255, b: 255, a: 0 }, opacity: 0 },
      { id: '2', position: 1, color: { r: 255, g: 255, b: 255, a: 1 }, opacity: 1 }
    ], type: 'radial' },
    // Rainbow
    { name: 'Rainbow', category: 'Candy', stops: [
      { id: '1', position: 0, color: { r: 255, g: 0, b: 0, a: 1 }, opacity: 1 },
      { id: '2', position: 0.17, color: { r: 255, g: 150, b: 0, a: 1 }, opacity: 1 },
      { id: '3', position: 0.33, color: { r: 255, g: 255, b: 0, a: 1 }, opacity: 1 },
      { id: '4', position: 0.5, color: { r: 0, g: 200, b: 0, a: 1 }, opacity: 1 },
      { id: '5', position: 0.67, color: { r: 0, g: 100, b: 255, a: 1 }, opacity: 1 },
      { id: '6', position: 0.83, color: { r: 100, g: 0, b: 200, a: 1 }, opacity: 1 },
      { id: '7', position: 1, color: { r: 255, g: 0, b: 180, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 90 },
    // Forest
    { name: 'Forest', category: 'Forest', stops: [
      { id: '1', position: 0, color: { r: 20, g: 60, b: 20, a: 1 }, opacity: 1 },
      { id: '2', position: 1, color: { r: 80, g: 160, b: 60, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 180 },
    // Holographic
    { name: 'Holographic', category: 'Holographic', stops: [
      { id: '1', position: 0, color: { r: 255, g: 0, b: 200, a: 1 }, opacity: 1 },
      { id: '2', position: 0.25, color: { r: 0, g: 200, b: 255, a: 1 }, opacity: 1 },
      { id: '3', position: 0.5, color: { r: 100, g: 255, b: 100, a: 1 }, opacity: 1 },
      { id: '4', position: 0.75, color: { r: 255, g: 200, b: 0, a: 1 }, opacity: 1 },
      { id: '5', position: 1, color: { r: 200, g: 0, b: 255, a: 1 }, opacity: 1 }
    ], type: 'linear', angle: 45 },
  ];
  
  for (const swatch of builtins) {
    await db.gradientSwatches.add({
      ...swatch,
      createdAt: Date.now(),
      isFavorite: false,
      isBuiltin: true,
    });
  }
}
