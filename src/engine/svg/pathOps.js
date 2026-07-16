/**
 * SVG Path Operations — Boolean ops, simplify, normalize
 * Faza 2
 */

// ─── Path normalization ───────────────────────────────────────────────────────

export function normalizePath(d) {
  if (!d) return '';
  return d.trim().replace(/\s+/g, ' ').replace(/,\s*/g, ',');
}

/**
 * Parse SVG path into array of commands
 */
export function parsePath(d) {
  if (!d) return [];
  const commands = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])\s*([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    const type = match[1];
    const nums = match[2].trim()
      ? match[2].trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
      : [];
    commands.push({ type, nums });
  }
  return commands;
}

/**
 * Convert relative path commands to absolute
 */
export function absolutizePath(d) {
  const cmds = parsePath(d);
  let x = 0, y = 0, x0 = 0, y0 = 0;
  const result = [];

  for (const cmd of cmds) {
    const t = cmd.type;
    const n = cmd.nums;

    switch (t) {
      case 'M': x = n[0]; y = n[1]; x0 = x; y0 = y;
        result.push(`M ${x},${y}`); break;
      case 'm': x += n[0]; y += n[1]; x0 = x; y0 = y;
        result.push(`M ${x},${y}`); break;
      case 'L': x = n[0]; y = n[1]; result.push(`L ${x},${y}`); break;
      case 'l': x += n[0]; y += n[1]; result.push(`L ${x},${y}`); break;
      case 'H': x = n[0]; result.push(`L ${x},${y}`); break;
      case 'h': x += n[0]; result.push(`L ${x},${y}`); break;
      case 'V': y = n[0]; result.push(`L ${x},${y}`); break;
      case 'v': y += n[0]; result.push(`L ${x},${y}`); break;
      case 'C':
        result.push(`C ${n[0]},${n[1]} ${n[2]},${n[3]} ${n[4]},${n[5]}`);
        x = n[4]; y = n[5]; break;
      case 'c':
        result.push(`C ${x+n[0]},${y+n[1]} ${x+n[2]},${y+n[3]} ${x+n[4]},${y+n[5]}`);
        x += n[4]; y += n[5]; break;
      case 'S':
        result.push(`S ${n[0]},${n[1]} ${n[2]},${n[3]}`);
        x = n[2]; y = n[3]; break;
      case 's':
        result.push(`S ${x+n[0]},${y+n[1]} ${x+n[2]},${y+n[3]}`);
        x += n[2]; y += n[3]; break;
      case 'Q':
        result.push(`Q ${n[0]},${n[1]} ${n[2]},${n[3]}`);
        x = n[2]; y = n[3]; break;
      case 'q':
        result.push(`Q ${x+n[0]},${y+n[1]} ${x+n[2]},${y+n[3]}`);
        x += n[2]; y += n[3]; break;
      case 'A':
        result.push(`A ${n[0]},${n[1]} ${n[2]} ${n[3]} ${n[4]} ${n[5]},${n[6]}`);
        x = n[5]; y = n[6]; break;
      case 'a':
        result.push(`A ${n[0]},${n[1]} ${n[2]} ${n[3]} ${n[4]} ${x+n[5]},${y+n[6]}`);
        x += n[5]; y += n[6]; break;
      case 'Z': case 'z':
        result.push('Z'); x = x0; y = y0; break;
    }
  }

  return result.join(' ');
}

/**
 * Get bounding box of a path (simple approximation)
 */
export function getPathBBox(d) {
  const cmds = parsePath(d);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0;

  const updateBounds = (px, py) => {
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  };

  for (const cmd of cmds) {
    const n = cmd.nums;
    switch (cmd.type) {
      case 'M': case 'L': x = n[0]; y = n[1]; updateBounds(x, y); break;
      case 'm': case 'l': x += n[0]; y += n[1]; updateBounds(x, y); break;
      case 'H': x = n[0]; updateBounds(x, y); break;
      case 'h': x += n[0]; updateBounds(x, y); break;
      case 'V': y = n[0]; updateBounds(x, y); break;
      case 'v': y += n[0]; updateBounds(x, y); break;
      case 'C': updateBounds(n[4], n[5]); x = n[4]; y = n[5]; break;
      case 'c': updateBounds(x+n[4], y+n[5]); x += n[4]; y += n[5]; break;
    }
  }

  if (!isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Extract individual points from a path for node editing
 */
export function extractPathPoints(d) {
  if (!d) return [];
  const abs = absolutizePath(d);
  const cmds = parsePath(abs);
  const points = [];
  let x = 0, y = 0;
  let pi = 0;

  for (const cmd of cmds) {
    const n = cmd.nums;
    switch (cmd.type) {
      case 'M':
        x = n[0]; y = n[1];
        points.push({ id: uuidv4_simple(pi++), x, y, type: 'corner', inHandle: null, outHandle: null, cmdIndex: cmds.indexOf(cmd) });
        break;
      case 'L':
        x = n[0]; y = n[1];
        points.push({ id: uuidv4_simple(pi++), x, y, type: 'corner', inHandle: null, outHandle: null, cmdIndex: cmds.indexOf(cmd) });
        break;
      case 'C':
        points.push({ id: uuidv4_simple(pi++), x: n[4], y: n[5], type: 'smooth',
          inHandle: { x: n[2], y: n[3] },
          outHandle: null,
          cmdIndex: cmds.indexOf(cmd) });
        x = n[4]; y = n[5];
        break;
    }
  }

  return points;
}

// Simple sequential ID for points
let _pidCounter = 0;
function uuidv4_simple(i) {
  return `pt-${Date.now()}-${i}`;
}

/**
 * Rebuild path string from point array
 */
export function pointsToPath(points, closed = false) {
  if (!points.length) return '';

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (prev.outHandle && curr.inHandle) {
      d += ` C ${prev.outHandle.x},${prev.outHandle.y} ${curr.inHandle.x},${curr.inHandle.y} ${curr.x},${curr.y}`;
    } else if (prev.outHandle) {
      const ctrl2 = { x: curr.x, y: curr.y };
      d += ` C ${prev.outHandle.x},${prev.outHandle.y} ${ctrl2.x},${ctrl2.y} ${curr.x},${curr.y}`;
    } else if (curr.inHandle) {
      const ctrl1 = { x: prev.x, y: prev.y };
      d += ` C ${ctrl1.x},${ctrl1.y} ${curr.inHandle.x},${curr.inHandle.y} ${curr.x},${curr.y}`;
    } else {
      d += ` L ${curr.x},${curr.y}`;
    }
  }

  if (closed) {
    const last = points[points.length - 1];
    const first = points[0];
    if (last.outHandle && first.inHandle) {
      d += ` C ${last.outHandle.x},${last.outHandle.y} ${first.inHandle.x},${first.inHandle.y} ${first.x},${first.y}`;
    }
    d += ' Z';
  }

  return d;
}

/**
 * Simplify path by reducing points (Ramer-Douglas-Peucker)
 */
export function simplifyPath(d, tolerance = 2) {
  const points = extractPathPoints(d);
  if (points.length < 3) return d;

  const simplified = rdp(points, tolerance);
  return pointsToPath(simplified, d.includes('Z') || d.includes('z'));
}

function rdp(points, eps) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointLineDistance(points[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > eps) {
    const left = rdp(points.slice(0, maxIdx + 1), eps);
    const right = rdp(points.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function pointLineDistance(pt, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((pt.x - a.x) ** 2 + (pt.y - a.y) ** 2);
  return Math.abs((dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x) / len);
}

/**
 * Reverse path direction
 */
export function reversePath(d) {
  const pts = extractPathPoints(d);
  const reversed = pts.reverse().map(pt => ({
    ...pt,
    inHandle: pt.outHandle,
    outHandle: pt.inHandle,
  }));
  return pointsToPath(reversed, d.toUpperCase().includes('Z'));
}

/**
 * Close path
 */
export function closePath(d) {
  const trimmed = d.trim();
  if (trimmed.toUpperCase().endsWith('Z')) return trimmed;
  return trimmed + ' Z';
}

/**
 * Open path (remove Z)
 */
export function openPath(d) {
  return d.replace(/\s*[Zz]\s*$/, '');
}

/**
 * Smooth path by adding bezier handles
 */
export function smoothPath(d, strength = 0.4) {
  const pts = extractPathPoints(d);
  if (pts.length < 3) return d;

  const smoothed = pts.map((pt, i) => {
    if (i === 0 || i === pts.length - 1) return pt;
    const prev = pts[i - 1];
    const next = pts[i + 1];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;

    return {
      ...pt,
      type: 'smooth',
      inHandle: { x: pt.x - dx * strength, y: pt.y - dy * strength },
      outHandle: { x: pt.x + dx * strength, y: pt.y + dy * strength },
    };
  });

  return pointsToPath(smoothed, d.toUpperCase().includes('Z'));
}

/**
 * Clean SVG path (remove redundant points, normalize)
 */
export function cleanPath(d) {
  return normalizePath(absolutizePath(d));
}

/**
 * Outline stroke (convert stroke to fill path) — simplified
 */
export function outlineStroke(d, width) {
  // Simplified: returns two offset paths
  // Full implementation requires Clipper or paper.js
  return d; // Placeholder — full in future
}
