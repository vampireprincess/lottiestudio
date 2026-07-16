/**
 * Motion Path Engine — Faza 6
 */
import { v4 as uuidv4 } from 'uuid';
import { parsePath, absolutizePath } from '../svg/pathOps.js';
import { applyEasing } from '../animation/easingEngine.js';

/**
 * Create a motion path from SVG path data
 */
export function createMotionPath(pathData, options = {}) {
  return {
    id: uuidv4(),
    pathData: absolutizePath(pathData),
    orientToPath: options.orientToPath ?? true,
    rotationOffset: options.rotationOffset ?? 0,
    constantSpeed: options.constantSpeed ?? true,
    loopMode: options.loopMode ?? 'loop',
    reverse: options.reverse ?? false,
    startOffset: options.startOffset ?? 0,
    easing: options.easing ?? { type: 'linear' },
  };
}

/**
 * Get position along a motion path at t (0→1)
 */
export function getPositionAlongPath(pathData, t) {
  if (!pathData) return { x: 0, y: 0, angle: 0 };

  try {
    // Use SVG path length API via a temporary SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);

    const totalLength = path.getTotalLength();
    const clampedT = Math.max(0, Math.min(1, t));
    const point = path.getPointAtLength(clampedT * totalLength);

    // Get angle by comparing two close points
    const delta = 0.001;
    const p1 = path.getPointAtLength(Math.max(0, clampedT - delta) * totalLength);
    const p2 = path.getPointAtLength(Math.min(1, clampedT + delta) * totalLength);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

    document.body.removeChild(svg);
    return { x: point.x, y: point.y, angle };
  } catch (e) {
    // Fallback: linear interpolation through path points
    const pts = parsePath(pathData);
    if (!pts.length) return { x: 0, y: 0, angle: 0 };

    const moveCmd = pts.find(c => c.type === 'M');
    return moveCmd ? { x: moveCmd.nums[0] || 0, y: moveCmd.nums[1] || 0, angle: 0 }
                   : { x: 0, y: 0, angle: 0 };
  }
}

/**
 * Generate keyframes for a layer following a motion path
 */
export function generateMotionPathKeyframes(motionPath, layerId, startFrame, endFrame, fps = 30) {
  const keyframes = [];
  const totalFrames = endFrame - startFrame;
  const step = Math.max(1, Math.round(fps / 10)); // Sample every ~0.1 seconds

  for (let f = 0; f <= totalFrames; f += step) {
    let t = f / totalFrames;
    if (motionPath.reverse) t = 1 - t;
    t = (t + motionPath.startOffset) % 1;

    const eased = applyEasing(t, motionPath.easing);
    const pos = getPositionAlongPath(motionPath.pathData, eased);

    keyframes.push({
      id: uuidv4(),
      layerId,
      property: 'transform.position',
      frame: startFrame + f,
      value: { x: pos.x, y: pos.y },
      easing: { type: 'linear' },
      hold: false,
      selected: false,
    });

    if (motionPath.orientToPath) {
      keyframes.push({
        id: uuidv4(),
        layerId,
        property: 'transform.rotation',
        frame: startFrame + f,
        value: pos.angle + (motionPath.rotationOffset || 0),
        easing: { type: 'linear' },
        hold: false,
        selected: false,
      });
    }
  }

  return keyframes;
}
