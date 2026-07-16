/**
 * Easing Engine — Faza 4
 * Sve easing funkcije + Graph Editor support
 */

// ─── Easing functions ────────────────────────────────────────────────────────

export const EASING_LIBRARY = {
  linear:       { label: 'Linear',          bezier: [0.000, 0.000, 1.000, 1.000], category: 'basic' },
  easeIn:       { label: 'Ease In',         bezier: [0.420, 0.000, 1.000, 1.000], category: 'basic' },
  easeOut:      { label: 'Ease Out',        bezier: [0.000, 0.000, 0.580, 1.000], category: 'basic' },
  easeInOut:    { label: 'Ease In-Out',     bezier: [0.420, 0.000, 0.580, 1.000], category: 'basic' },
  smooth:       { label: 'Smooth',          bezier: [0.250, 0.100, 0.250, 1.000], category: 'smooth' },
  strongSmooth: { label: 'Strong Smooth',   bezier: [0.450, 0.050, 0.550, 0.950], category: 'smooth' },
  softSmooth:   { label: 'Soft Smooth',     bezier: [0.390, 0.575, 0.565, 1.000], category: 'smooth' },
  back:         { label: 'Back',            bezier: [0.360, 0.000, 0.660,-0.560], category: 'expressive' },
  backIn:       { label: 'Back In',         bezier: [0.600,-0.280, 0.735, 0.045], category: 'expressive' },
  backOut:      { label: 'Back Out',        bezier: [0.175, 0.885, 0.320, 1.275], category: 'expressive' },
  overshoot:    { label: 'Overshoot',       bezier: [0.340, 1.560, 0.640, 1.000], category: 'expressive' },
  anticipation: { label: 'Anticipation',    bezier: [0.360,-0.560, 0.660, 0.000], category: 'expressive' },
  bounce:       { label: 'Bounce',          fn: 'bounce',                          category: 'spring' },
  bounceIn:     { label: 'Bounce In',       fn: 'bounceIn',                        category: 'spring' },
  elastic:      { label: 'Elastic',         fn: 'elastic',                         category: 'spring' },
  elasticIn:    { label: 'Elastic In',      fn: 'elasticIn',                       category: 'spring' },
  spring:       { label: 'Spring',          bezier: [0.500, 0.000, 0.000, 1.400], category: 'spring' },
  snappy:       { label: 'Snappy',          bezier: [0.100, 0.900, 0.200, 1.000], category: 'smooth' },
  cinematic:    { label: 'Cinematic',       bezier: [0.650, 0.005, 0.350, 1.000], category: 'smooth' },
  decelerate:   { label: 'Decelerate',      bezier: [0.000, 0.000, 0.200, 1.000], category: 'basic' },
  accelerate:   { label: 'Accelerate',      bezier: [0.400, 0.000, 1.000, 1.000], category: 'basic' },
  custom:       { label: 'Custom',          bezier: [0.420, 0.000, 0.580, 1.000], category: 'custom' },
};

export const EASING_CATEGORIES = ['basic', 'smooth', 'expressive', 'spring', 'custom'];

/**
 * Apply easing function to t (0→1)
 */
export function applyEasing(t, easing) {
  if (!easing) return t;
  const type = easing.type || 'linear';

  // Custom bezier
  if (easing.bezier || (easing.type === 'custom' && easing.bezier)) {
    return cubicBezier(...(easing.bezier || [0.42, 0, 0.58, 1]))(t);
  }

  const lib = EASING_LIBRARY[type];
  if (!lib) return t;

  if (lib.bezier) return cubicBezier(...lib.bezier)(t);
  if (lib.fn) return specialFunctions[lib.fn](t);

  return t;
}

// Special non-bezier functions
const specialFunctions = {
  bounce(t) {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  },
  bounceIn(t) { return 1 - specialFunctions.bounce(1 - t); },
  elastic(t) {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3));
  },
  elasticIn(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  },
};

/**
 * Cubic bezier implementation (Newton's method)
 */
export function cubicBezier(x1, y1, x2, y2) {
  return function(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Solve for parameter using Newton's method
    let s = t;
    for (let i = 0; i < 8; i++) {
      const ct = 3*s*(1-s)*(1-s)*x1 + 3*s*s*(1-s)*x2 + s*s*s;
      const dt = 3*(1-s)*(1-s)*x1 + 6*s*(1-s)*x2 + 3*s*s;
      if (Math.abs(dt) < 1e-8) break;
      s -= (ct - t) / dt;
      s = Math.max(0, Math.min(1, s));
    }
    return 3*s*(1-s)*(1-s)*y1 + 3*s*s*(1-s)*y2 + s*s*s;
  };
}

/**
 * Sample easing curve for preview (returns array of {x,y} points)
 */
export function sampleEasing(easing, samples = 64) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push({ x: t, y: applyEasing(t, easing) });
  }
  return pts;
}

/**
 * Get easing bezier handles for Lottie export
 */
export function easingToLottie(easing) {
  const lib = EASING_LIBRARY[easing?.type] || EASING_LIBRARY.easeInOut;
  const bz = easing?.bezier || lib?.bezier || [0.42, 0, 0.58, 1];
  return {
    i: { x: [bz[2]], y: [bz[3]] },
    o: { x: [bz[0]], y: [bz[1]] },
  };
}

/**
 * Interpolate between two values with easing
 */
export function interpolateWithEasing(v1, v2, t, easing) {
  const easedT = applyEasing(t, easing);
  return interpolate(v1, v2, easedT);
}

function interpolate(v1, v2, t) {
  if (typeof v1 === 'number' && typeof v2 === 'number') return v1 + (v2 - v1) * t;
  if (v1 && v2 && typeof v1 === 'object' && !Array.isArray(v1)) {
    const r = {};
    for (const k of Object.keys(v1)) r[k] = interpolate(v1[k], v2[k] ?? v1[k], t);
    return r;
  }
  if (Array.isArray(v1) && Array.isArray(v2)) return v1.map((val, i) => interpolate(val, v2[i] ?? val, t));
  return t < 0.5 ? v1 : v2;
}
