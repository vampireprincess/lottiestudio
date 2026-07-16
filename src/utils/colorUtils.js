/**
 * Color utility functions
 */

/** Convert color object {r,g,b,a} to CSS string */
export function colorToCSS(color) {
  if (!color) return 'transparent';
  const { r = 0, g = 0, b = 0, a = 1 } = color;
  if (a >= 1) return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

/** Convert color object to hex string */
export function colorToHex(color) {
  if (!color) return '#000000';
  const { r = 0, g = 0, b = 0, a = 1 } = color;
  const toHex = v => Math.round(v).toString(16).padStart(2, '0');
  if (a >= 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
}

/** Parse hex string to color object */
export function hexToColor(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b, a: 1 };
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Convert RGB to HSL */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convert HSL to RGB */
export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** Convert RGB to HSV */
export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h, s = max === 0 ? 0 : d / max, v = max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

/** Convert HSV to RGB */
export function hsvToRgb(h, s, v) {
  h /= 360; s /= 100; v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** Interpolate between two colors */
export function interpolateColors(c1, c2, t) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
    a: (c1.a ?? 1) + ((c2.a ?? 1) - (c1.a ?? 1)) * t,
  };
}

/** Get random color within hue range */
export function randomColorInRange({ hue, hueRange = 30, satMin = 60, satMax = 100, briMin = 50, briMax = 100 }) {
  const h = (hue + (Math.random() - 0.5) * hueRange * 2 + 360) % 360;
  const s = satMin + Math.random() * (satMax - satMin);
  const l = briMin + Math.random() * (briMax - briMin);
  return { ...hslToRgb(h, s, l), a: 1 };
}

/** CSS gradient string from gradient fill definition */
export function gradientToCSS(gradient, width = 100, height = 100) {
  if (!gradient) return 'transparent';
  
  const stops = (gradient.stops || [])
    .sort((a, b) => a.position - b.position)
    .map(stop => `${colorToCSS(stop.color)} ${stop.position * 100}%`)
    .join(', ');

  switch (gradient.type) {
    case 'linear':
      return `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
    case 'radial':
      return `radial-gradient(circle at ${(gradient.center?.x || 0.5) * 100}% ${(gradient.center?.y || 0.5) * 100}%, ${stops})`;
    case 'angular':
      return `conic-gradient(from ${gradient.angle || 0}deg at ${(gradient.center?.x || 0.5) * 100}% ${(gradient.center?.y || 0.5) * 100}%, ${stops})`;
    default:
      return `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
  }
}

/** Fill to CSS fill attribute */
export function fillToCSS(fill, layerId, fillIndex) {
  if (!fill || !fill.enabled) return 'none';
  if (fill.type === 'solid') return colorToCSS(fill.color);
  if (fill.type === 'linear' || fill.type === 'radial') return `url(#grad-${layerId}-${fillIndex})`;
  return 'none';
}

/** Stroke to CSS properties */
export function strokeToCSS(stroke) {
  if (!stroke || !stroke.enabled) return {};
  return {
    stroke: colorToCSS(stroke.color),
    strokeWidth: stroke.width,
    strokeLinecap: stroke.lineCap || 'round',
    strokeLinejoin: stroke.lineJoin || 'round',
    strokeDasharray: stroke.dashPattern || undefined,
    strokeOpacity: stroke.opacity ?? 1,
  };
}

/** Seeded random number generator */
export function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
