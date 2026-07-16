/**
 * Loop Maker — Faza 4
 * Creates seamless animation loops
 */

/**
 * Analyze loop compatibility — check if first and last keyframes match
 */
export function analyzeLoop(keyframes, totalFrames) {
  const properties = [...new Set(keyframes.map(kf => `${kf.layerId}::${kf.property}`))];
  const issues = [];
  const ok = [];

  for (const propKey of properties) {
    const kfs = keyframes
      .filter(kf => `${kf.layerId}::${kf.property}` === propKey)
      .sort((a, b) => a.frame - b.frame);

    if (kfs.length < 2) continue;

    const first = kfs[0];
    const last = kfs[kfs.length - 1];

    const firstIsAtZero = first.frame === 0;
    const lastIsAtEnd = last.frame === totalFrames - 1;
    const valuesMatch = valuesEqual(first.value, last.value);

    const propName = propKey.split('::')[1].split('.').pop();

    if (!firstIsAtZero || !lastIsAtEnd) {
      issues.push({ key: propKey, propName, type: 'range', message: `"${propName}" doesn't span full duration` });
    } else if (!valuesMatch) {
      issues.push({ key: propKey, propName, type: 'mismatch', message: `"${propName}" start ≠ end value — visible jump` });
    } else {
      ok.push({ key: propKey, propName });
    }
  }

  return { issues, ok, isSeamless: issues.length === 0 };
}

/**
 * Make loop seamless by copying first keyframe values to last frame
 */
export function makeSeamlessLoop(keyframes, totalFrames) {
  const result = [...keyframes];
  const properties = [...new Set(keyframes.map(kf => `${kf.layerId}::${kf.property}`))];

  for (const propKey of properties) {
    const [layerId, property] = propKey.split('::');
    const kfs = keyframes
      .filter(kf => kf.layerId === layerId && kf.property === property)
      .sort((a, b) => a.frame - b.frame);

    if (kfs.length < 1) continue;

    const firstKf = kfs[0];

    // Check if last frame keyframe exists
    const lastKf = result.find(kf => kf.layerId === layerId && kf.property === property && kf.frame === totalFrames - 1);

    if (lastKf) {
      // Update value to match first
      const idx = result.indexOf(lastKf);
      result[idx] = { ...lastKf, value: firstKf.value };
    } else {
      // Add new keyframe at end matching first
      result.push({
        ...firstKf,
        id: `${firstKf.id}-loop-end`,
        frame: totalFrames - 1,
      });
    }

    // Also ensure first keyframe at frame 0
    const hasFirst = result.find(kf => kf.layerId === layerId && kf.property === property && kf.frame === 0);
    if (!hasFirst && kfs[0]) {
      result.push({ ...kfs[0], id: `${kfs[0].id}-loop-start`, frame: 0 });
    }
  }

  return result;
}

/**
 * Create ping-pong loop (duplicate and reverse)
 */
export function createPingPongLoop(keyframes, totalFrames) {
  const result = [...keyframes];
  const halfFrames = Math.floor(totalFrames / 2);

  // Mirror all keyframes in the second half
  const firstHalf = keyframes.filter(kf => kf.frame <= halfFrames);

  firstHalf.forEach(kf => {
    const mirroredFrame = totalFrames - 1 - kf.frame;
    if (mirroredFrame !== kf.frame) {
      result.push({
        ...kf,
        id: `${kf.id}-mirror`,
        frame: mirroredFrame,
      });
    }
  });

  return result.sort((a, b) => a.frame - b.frame);
}

/**
 * Detect visible jump in loop
 */
export function detectLoopJump(keyframes, totalFrames, threshold = 2) {
  const properties = [...new Set(keyframes.map(kf => `${kf.layerId}::${kf.property}`))];
  const jumps = [];

  for (const propKey of properties) {
    const kfs = keyframes
      .filter(kf => `${kf.layerId}::${kf.property}` === propKey)
      .sort((a, b) => a.frame - b.frame);

    if (kfs.length < 2) continue;

    const first = kfs[0];
    const last = kfs[kfs.length - 1];

    if (!valuesEqual(first.value, last.value, threshold)) {
      const propName = propKey.split('::')[1].split('.').pop();
      jumps.push({
        property: propName,
        firstValue: first.value,
        lastValue: last.value,
      });
    }
  }

  return jumps;
}

function valuesEqual(v1, v2, threshold = 0.01) {
  if (typeof v1 === 'number' && typeof v2 === 'number') return Math.abs(v1 - v2) <= threshold;
  if (v1 === null || v2 === null) return v1 === v2;
  if (typeof v1 === 'object' && typeof v2 === 'object') {
    return Object.keys(v1).every(k => valuesEqual(v1[k], v2[k], threshold));
  }
  return v1 === v2;
}
