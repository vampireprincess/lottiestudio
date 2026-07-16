/**
 * Optimization Engine — Faza 9
 * Analyze and optimize Lottie JSON for size and performance
 */

/**
 * Analyze a project for optimization opportunities
 */
export function analyzeOptimization(project) {
  const issues = [];
  const layers = Object.values(project.layers);
  const keyframes = project.keyframes || [];
  let estimatedSavings = 0;

  // Check hidden layers
  const hiddenLayers = layers.filter(l => !l.visible);
  if (hiddenLayers.length > 0) {
    issues.push({
      type: 'hiddenLayers', severity: 'medium',
      message: `${hiddenLayers.length} hidden layer(s) included in export`,
      saving: hiddenLayers.length * 2,
      fix: 'removeHiddenLayers',
      layerIds: hiddenLayers.map(l => l.id),
    });
    estimatedSavings += hiddenLayers.length * 2;
  }

  // Check excessive keyframes (many keyframes on same frame)
  const kfByFrameProp = {};
  keyframes.forEach(kf => {
    const key = `${kf.layerId}::${kf.property}::${kf.frame}`;
    if (!kfByFrameProp[key]) kfByFrameProp[key] = 0;
    kfByFrameProp[key]++;
  });
  const duplicateKfs = Object.values(kfByFrameProp).filter(c => c > 1).length;
  if (duplicateKfs > 0) {
    issues.push({
      type: 'duplicateKeyframes', severity: 'low',
      message: `${duplicateKfs} duplicate keyframe(s) on same frame+property`,
      saving: duplicateKfs * 0.1,
      fix: 'deduplicateKeyframes',
    });
    estimatedSavings += duplicateKfs * 0.1;
  }

  // Check static layers with no keyframes
  const staticLayersWithKf = layers.filter(l => {
    const lkf = keyframes.filter(kf => kf.layerId === l.id);
    return lkf.length === 0 && (l.fills?.length > 0 || l.pathData || l.shapeType);
  });
  // These are fine — just note they could be simplified

  // Check glow copies count
  layers.forEach(layer => {
    (layer.effects || []).forEach(effect => {
      if (effect.enabled && effect.copies > 5) {
        issues.push({
          type: 'highGlowCopies', severity: 'medium',
          message: `Layer "${layer.name}" has ${effect.copies} glow copies (>5 = heavy)`,
          saving: (effect.copies - 3) * 0.5,
          fix: 'reduceGlowCopies',
          layerId: layer.id,
        });
        estimatedSavings += (effect.copies - 3) * 0.5;
      }
    });
  });

  // Check path complexity
  layers.forEach(layer => {
    if (layer.pathData && layer.pathData.length > 5000) {
      issues.push({
        type: 'complexPath', severity: 'low',
        message: `Layer "${layer.name}" has a very long path (${(layer.pathData.length/1000).toFixed(1)}KB)`,
        saving: 1,
        fix: 'simplifyPath',
        layerId: layer.id,
      });
      estimatedSavings += 1;
    }
  });

  // Check decimal precision
  const sampleKf = keyframes.find(kf => typeof kf.value === 'number' && !Number.isInteger(kf.value));
  if (sampleKf) {
    const decimals = (String(sampleKf.value).split('.')[1] || '').length;
    if (decimals > 3) {
      issues.push({
        type: 'highPrecision', severity: 'low',
        message: `Keyframe values have high decimal precision (${decimals} decimal places)`,
        saving: Math.min(5, keyframes.length * 0.01),
        fix: 'reduceDecimalPrecision',
      });
      estimatedSavings += Math.min(5, keyframes.length * 0.01);
    }
  }

  // Check unused layers (not visible, no children referenced)
  const referencedIds = new Set([
    ...layers.flatMap(l => l.children || []),
    ...(project.rootLayers || []),
  ]);
  const orphanedLayers = layers.filter(l =>
    !referencedIds.has(l.id) &&
    !project.rootLayers.includes(l.id)
  );
  if (orphanedLayers.length > 0) {
    issues.push({
      type: 'orphanedLayers', severity: 'medium',
      message: `${orphanedLayers.length} orphaned layer(s) not connected to scene`,
      saving: orphanedLayers.length * 1.5,
      fix: 'removeOrphanedLayers',
      layerIds: orphanedLayers.map(l => l.id),
    });
    estimatedSavings += orphanedLayers.length * 1.5;
  }

  // Check long empty frame ranges at start/end
  if (keyframes.length > 0) {
    const minFrame = Math.min(...keyframes.map(kf => kf.frame));
    const maxFrame = Math.max(...keyframes.map(kf => kf.frame));
    const emptyStart = minFrame;
    const emptyEnd = project.totalFrames - 1 - maxFrame;
    if (emptyStart > 10) {
      issues.push({
        type: 'emptyStart', severity: 'info',
        message: `${emptyStart} empty frames at beginning`,
        saving: 0.2, fix: 'trimEmptyFrames',
      });
    }
    if (emptyEnd > 10) {
      issues.push({
        type: 'emptyEnd', severity: 'info',
        message: `${emptyEnd} empty frames at end`,
        saving: 0.2, fix: 'trimEmptyFrames',
      });
    }
  }

  return {
    issues,
    estimatedSavingsKB: Math.round(estimatedSavings * 10) / 10,
    totalLayers: layers.length,
    totalKeyframes: keyframes.length,
    score: Math.max(0, 100 - issues.filter(i => i.severity !== 'info').length * 15),
  };
}

/**
 * Apply safe optimizations to project
 */
export function optimizeSafely(project) {
  let p = { ...project, layers: { ...project.layers }, keyframes: [...project.keyframes] };

  // 1. Remove duplicate keyframes (same frame+prop+layer, keep last)
  const kfMap = new Map();
  p.keyframes.forEach(kf => {
    const key = `${kf.layerId}::${kf.property}::${kf.frame}`;
    kfMap.set(key, kf);
  });
  p.keyframes = [...kfMap.values()];

  // 2. Reduce decimal precision to 3 places
  p.keyframes = p.keyframes.map(kf => ({
    ...kf,
    value: roundValue(kf.value, 3),
  }));

  return p;
}

/**
 * Apply aggressive optimizations
 */
export function optimizeAggressively(project) {
  let p = optimizeSafely(project);

  // Remove hidden layers
  const hiddenIds = Object.values(p.layers).filter(l => !l.visible).map(l => l.id);
  hiddenIds.forEach(id => {
    delete p.layers[id];
    p.rootLayers = p.rootLayers.filter(lid => lid !== id);
    p.keyframes = p.keyframes.filter(kf => kf.layerId !== id);
  });

  // Reduce glow copies to max 4
  Object.keys(p.layers).forEach(id => {
    const layer = p.layers[id];
    if (layer.effects?.some(e => e.copies > 4)) {
      p.layers[id] = {
        ...layer,
        effects: layer.effects.map(e => ({ ...e, copies: Math.min(4, e.copies) })),
      };
    }
  });

  // Reduce precision to 2 places
  p.keyframes = p.keyframes.map(kf => ({ ...kf, value: roundValue(kf.value, 2) }));

  return p;
}

function roundValue(v, decimals) {
  if (typeof v === 'number') return parseFloat(v.toFixed(decimals));
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const r = {};
    for (const k of Object.keys(v)) r[k] = roundValue(v[k], decimals);
    return r;
  }
  if (Array.isArray(v)) return v.map(x => roundValue(x, decimals));
  return v;
}
