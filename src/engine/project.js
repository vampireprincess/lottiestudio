import { v4 as uuidv4 } from 'uuid';
import { PROJECT_VERSION, DEFAULT_FPS, DEFAULT_DURATION } from '../types/index.js';

/**
 * Creates a new empty project
 */
export function createProject(overrides = {}) {
  const now = Date.now();
  const id = uuidv4();

  return {
    id,
    name: 'Untitled Project',
    width: 1920,
    height: 1080,
    fps: DEFAULT_FPS,
    totalFrames: DEFAULT_DURATION,
    backgroundColor: '#000000',
    backgroundAlpha: 1,
    rootLayers: [],
    layers: {},
    keyframes: [],
    markers: [],
    motionPaths: [],
    globalColors: [],
    exposedProperties: [],    // Array of { id, name, layerId, property, label }
    exportSettings: {
      format: 'lottie',
      quality: 90,
      loop: true,
      transparent: false,
    },
    metadata: {
      author: '',
      description: '',
      tags: [],
    },
    version: PROJECT_VERSION,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a new layer
 */
export function createLayer(overrides = {}) {
  const id = uuidv4();
  return {
    id,
    name: 'Layer',
    type: 'shape',
    visible: true,
    locked: false,
    solo: false,
    colorLabel: null,
    opacity: 1,
    blendMode: 'normal',
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      anchor: { x: 0, y: 0 },
      pivot: { x: 0.5, y: 0.5 },
    },
    fills: [],
    strokes: [],
    masks: [],
    effects: [],
    pathData: null,
    shapeType: null,
    shapeParams: {},
    children: [],
    parentId: null,
    motionPathId: null,
    exposedProperties: [],
    attachmentPoints: {},
    svgContent: null,
    inFrame: 0,
    outFrame: 180,
    ...overrides,
  };
}

/**
 * Creates a keyframe
 */
export function createKeyframe(layerId, property, frame, value, easing = { type: 'easeInOut' }) {
  return {
    id: uuidv4(),
    layerId,
    property,
    frame,
    value,
    easing,
    hold: false,
    selected: false,
  };
}

/**
 * Creates a solid fill
 */
export function createSolidFill(color = { r: 255, g: 255, b: 255, a: 1 }) {
  return {
    enabled: true,
    type: 'solid',
    color,
    opacity: 1,
    blendMode: 'normal',
    globalColorId: null,
  };
}

/**
 * Creates a gradient fill
 */
export function createGradientFill(type = 'linear') {
  return {
    enabled: true,
    type,
    gradient: {
      type,
      stops: [
        { id: uuidv4(), position: 0, color: { r: 123, g: 104, b: 238, a: 1 }, opacity: 1 },
        { id: uuidv4(), position: 1, color: { r: 0, g: 200, b: 255, a: 1 }, opacity: 1 },
      ],
      angle: 90,
      startPoint: { x: 0, y: 0.5 },
      endPoint: { x: 1, y: 0.5 },
      center: { x: 0.5, y: 0.5 },
      radius: 0.5,
      focalPoint: { x: 0.5, y: 0.5 },
      focalRadius: 0,
      spread: 'pad',
    },
    opacity: 1,
    blendMode: 'normal',
  };
}

/**
 * Creates a stroke
 */
export function createStroke(color = { r: 255, g: 255, b: 255, a: 1 }, width = 2) {
  return {
    enabled: true,
    type: 'solid',
    color,
    width,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    dashPattern: '',
    alignment: 'center',
    globalColorId: null,
  };
}

/**
 * Creates a glow effect
 */
export function createGlowEffect(type = 'glow', overrides = {}) {
  return {
    id: uuidv4(),
    type,
    enabled: true,
    color: { r: 123, g: 104, b: 238, a: 1 },
    coreColor: { r: 200, g: 180, b: 255, a: 1 },
    blur: 20,
    spread: 0,
    opacity: 0.8,
    copies: 3,
    innerStrength: 0.5,
    outerStrength: 0.8,
    scalePerCopy: 1.0,
    offsetX: 0,
    offsetY: 0,
    flickerAmount: 0,
    flickerSpeed: 1,
    flickerSeed: 42,
    expanded: false,
    ...overrides,
  };
}

/**
 * Add layer to project (returns new project state)
 */
export function addLayer(project, layer, parentId = null) {
  const newLayers = { ...project.layers, [layer.id]: layer };
  
  if (parentId && project.layers[parentId]) {
    newLayers[parentId] = {
      ...project.layers[parentId],
      children: [...project.layers[parentId].children, layer.id],
    };
    newLayers[layer.id] = { ...layer, parentId };
    return {
      ...project,
      layers: newLayers,
      updatedAt: Date.now(),
    };
  }
  
  return {
    ...project,
    layers: newLayers,
    rootLayers: [...project.rootLayers, layer.id],
    updatedAt: Date.now(),
  };
}

/**
 * Remove layer from project
 */
export function removeLayer(project, layerId) {
  const layer = project.layers[layerId];
  if (!layer) return project;
  
  const newLayers = { ...project.layers };
  
  // Recursively remove children
  const removeChildren = (lid) => {
    const l = newLayers[lid];
    if (!l) return;
    if (l.children) {
      l.children.forEach(childId => removeChildren(childId));
    }
    delete newLayers[lid];
  };
  
  removeChildren(layerId);
  
  // Remove from parent
  let newRootLayers = project.rootLayers.filter(id => id !== layerId);
  
  if (layer.parentId && newLayers[layer.parentId]) {
    newLayers[layer.parentId] = {
      ...newLayers[layer.parentId],
      children: newLayers[layer.parentId].children.filter(id => id !== layerId),
    };
  }
  
  // Remove keyframes for this layer
  const newKeyframes = project.keyframes.filter(kf => kf.layerId !== layerId);
  
  return {
    ...project,
    layers: newLayers,
    rootLayers: newRootLayers,
    keyframes: newKeyframes,
    updatedAt: Date.now(),
  };
}

/**
 * Update a layer's property
 */
export function updateLayer(project, layerId, updates) {
  if (!project.layers[layerId]) return project;
  return {
    ...project,
    layers: {
      ...project.layers,
      [layerId]: { ...project.layers[layerId], ...updates },
    },
    updatedAt: Date.now(),
  };
}

/**
 * Get layer value at frame (interpolated)
 */
export function getLayerValueAtFrame(project, layerId, property, frame) {
  const keyframes = project.keyframes
    .filter(kf => kf.layerId === layerId && kf.property === property)
    .sort((a, b) => a.frame - b.frame);
  
  if (keyframes.length === 0) {
    // Return static value from layer
    const layer = project.layers[layerId];
    return getStaticProperty(layer, property);
  }
  
  if (keyframes.length === 1) return keyframes[0].value;
  
  // Find surrounding keyframes
  const before = keyframes.filter(kf => kf.frame <= frame);
  const after = keyframes.filter(kf => kf.frame > frame);
  
  if (before.length === 0) return keyframes[0].value;
  if (after.length === 0) return keyframes[keyframes.length - 1].value;
  
  const k1 = before[before.length - 1];
  const k2 = after[0];
  
  if (k1.hold) return k1.value;
  
  const t = (frame - k1.frame) / (k2.frame - k1.frame);
  const easedT = applyEasing(t, k1.easing);
  
  return interpolateValues(k1.value, k2.value, easedT);
}

function getStaticProperty(layer, property) {
  const parts = property.split('.');
  let val = layer;
  for (const p of parts) {
    if (val == null) return null;
    val = val[p];
  }
  return val;
}

function applyEasing(t, easing) {
  if (!easing) return t;
  const { type, bezier } = easing;
  
  switch (type) {
    case 'linear': return t;
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'smooth': return t * t * (3 - 2 * t);
    case 'strongSmooth': return t * t * t * (t * (6 * t - 15) + 10);
    case 'overshoot': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'bounce': {
      const n1 = 7.5625, d1 = 2.75;
      let bt = t;
      if (bt < 1 / d1) return n1 * bt * bt;
      if (bt < 2 / d1) { bt -= 1.5 / d1; return n1 * bt * bt + 0.75; }
      if (bt < 2.5 / d1) { bt -= 2.25 / d1; return n1 * bt * bt + 0.9375; }
      bt -= 2.625 / d1;
      return n1 * bt * bt + 0.984375;
    }
    case 'elastic': {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
    }
    case 'custom': {
      if (bezier) return cubicBezier(bezier[0], bezier[1], bezier[2], bezier[3])(t);
      return t;
    }
    default: return t;
  }
}

function cubicBezier(x1, y1, x2, y2) {
  return function(t) {
    // Newton's method approximation
    let st = t;
    for (let i = 0; i < 8; i++) {
      const ct = 3 * st * (1 - st) * (1 - st) * x1 + 3 * st * st * (1 - st) * x2 + st * st * st;
      const dt = 3 * (1 - st) * (1 - st) * x1 + 6 * st * (1 - st) * x2 + 3 * st * st;
      if (Math.abs(dt) < 1e-6) break;
      st -= (ct - t) / dt;
    }
    return 3 * st * (1 - st) * (1 - st) * y1 + 3 * st * st * (1 - st) * y2 + st * st * st;
  };
}

function interpolateValues(v1, v2, t) {
  if (typeof v1 === 'number' && typeof v2 === 'number') {
    return v1 + (v2 - v1) * t;
  }
  if (v1 && v2 && typeof v1 === 'object' && !Array.isArray(v1)) {
    const result = {};
    for (const key of Object.keys(v1)) {
      result[key] = interpolateValues(v1[key], v2[key] !== undefined ? v2[key] : v1[key], t);
    }
    return result;
  }
  if (Array.isArray(v1) && Array.isArray(v2)) {
    return v1.map((val, i) => interpolateValues(val, v2[i] !== undefined ? v2[i] : val, t));
  }
  return t < 0.5 ? v1 : v2;
}
