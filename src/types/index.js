/**
 * Core type definitions for Lottie Studio
 * Using JSDoc for documentation (no TypeScript required)
 */

/**
 * @typedef {Object} Vec2
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Color
 * @property {number} r - 0-255
 * @property {number} g - 0-255
 * @property {number} b - 0-255
 * @property {number} a - 0-1
 */

/**
 * @typedef {'none'|'solid'|'linear'|'radial'|'angular'|'diamond'|'reflected'} FillType
 */

/**
 * @typedef {Object} GradientStop
 * @property {string} id
 * @property {number} position - 0-1
 * @property {Color} color
 * @property {number} opacity - 0-1
 * @property {number} [midpoint] - 0-1 position of midpoint to next stop
 */

/**
 * @typedef {Object} GradientFill
 * @property {FillType} type
 * @property {GradientStop[]} stops
 * @property {Vec2} [startPoint]
 * @property {Vec2} [endPoint]
 * @property {Vec2} [center]
 * @property {number} [radius]
 * @property {number} [angle]
 * @property {Vec2} [focalPoint]
 * @property {number} [focalRadius]
 * @property {'pad'|'repeat'|'reflect'} [spread]
 * @property {string} [transform]
 */

/**
 * @typedef {Object} Fill
 * @property {boolean} enabled
 * @property {FillType} type
 * @property {Color} [color]
 * @property {GradientFill} [gradient]
 * @property {number} opacity
 * @property {string} [blendMode]
 * @property {string} [globalColorId]
 */

/**
 * @typedef {Object} Stroke
 * @property {boolean} enabled
 * @property {FillType} type
 * @property {Color} [color]
 * @property {GradientFill} [gradient]
 * @property {number} width
 * @property {number} opacity
 * @property {'butt'|'round'|'square'} lineCap
 * @property {'miter'|'round'|'bevel'} lineJoin
 * @property {string} [dashPattern]
 * @property {'inside'|'center'|'outside'} [alignment]
 * @property {string} [globalColorId]
 */

/**
 * @typedef {Object} Transform
 * @property {Vec2} position
 * @property {Vec2} scale
 * @property {number} rotation - degrees
 * @property {Vec2} skew
 * @property {Vec2} anchor
 * @property {Vec2} pivot
 */

/**
 * @typedef {Object} MaskData
 * @property {string} id
 * @property {string} name
 * @property {'add'|'subtract'|'intersect'|'difference'} mode
 * @property {boolean} inverted
 * @property {number} feather
 * @property {number} expansion
 * @property {number} opacity
 * @property {string} pathData
 * @property {boolean} animated
 */

/**
 * @typedef {Object} GlowEffect
 * @property {string} id
 * @property {'glow'|'neon'|'shadow'|'innerGlow'|'outerGlow'|'neonTube'|'sparkle'} type
 * @property {boolean} enabled
 * @property {Color} color
 * @property {Color} [coreColor]
 * @property {number} blur
 * @property {number} spread
 * @property {number} opacity
 * @property {number} copies
 * @property {number} [innerStrength]
 * @property {number} [outerStrength]
 * @property {number} [scalePerCopy]
 * @property {number} [offsetX]
 * @property {number} [offsetY]
 * @property {number} [flickerAmount]
 * @property {number} [flickerSpeed]
 * @property {number} [flickerSeed]
 * @property {boolean} expanded
 */

/**
 * @typedef {'shape'|'group'|'svg'|'mask'|'precomp'|'guide'|'null'} LayerType
 */

/**
 * @typedef {'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten'|'colorDodge'|'colorBurn'|'hardLight'|'softLight'|'difference'|'exclusion'|'hue'|'saturation'|'color'|'luminosity'} BlendMode
 */

/**
 * @typedef {Object} Layer
 * @property {string} id
 * @property {string} name
 * @property {LayerType} type
 * @property {boolean} visible
 * @property {boolean} locked
 * @property {boolean} solo
 * @property {string} [colorLabel]
 * @property {number} opacity
 * @property {BlendMode} blendMode
 * @property {Transform} transform
 * @property {Fill[]} fills
 * @property {Stroke[]} strokes
 * @property {MaskData[]} masks
 * @property {GlowEffect[]} effects
 * @property {string} [pathData]
 * @property {string} [shapeType]
 * @property {Object} [shapeParams]
 * @property {string[]} children
 * @property {string} [parentId]
 * @property {boolean} [parentFollowPosition]
 * @property {boolean} [parentFollowRotation]
 * @property {boolean} [parentFollowScale]
 * @property {number} [parentDelay]
 * @property {string} [motionPathId]
 * @property {string[]} [exposedProperties]
 * @property {Object} [attachmentPoints]
 * @property {string} [svgContent]
 * @property {number} inFrame
 * @property {number} outFrame
 */

/**
 * @typedef {'linear'|'easeIn'|'easeOut'|'easeInOut'|'smooth'|'strongSmooth'|'back'|'overshoot'|'bounce'|'elastic'|'anticipation'|'spring'|'custom'} EasingType
 */

/**
 * @typedef {Object} Easing
 * @property {EasingType} type
 * @property {number[]} [bezier] - [x1,y1,x2,y2] for custom
 */

/**
 * @typedef {Object} Keyframe
 * @property {string} id
 * @property {string} layerId
 * @property {string} property
 * @property {number} frame
 * @property {*} value
 * @property {Easing} easing
 * @property {boolean} [hold]
 * @property {boolean} selected
 */

/**
 * @typedef {Object} TimelineMarker
 * @property {string} id
 * @property {string} name
 * @property {number} frame
 * @property {string} [color]
 * @property {number} [endFrame]
 * @property {boolean} [isLoop]
 * @property {boolean} [exportFlag]
 */

/**
 * @typedef {Object} MotionPath
 * @property {string} id
 * @property {string} pathData
 * @property {boolean} orientToPath
 * @property {number} rotationOffset
 * @property {boolean} constantSpeed
 * @property {'loop'|'pingpong'|'once'} loopMode
 * @property {boolean} reverse
 * @property {number} startOffset
 */

/**
 * @typedef {Object} GlobalColor
 * @property {string} id
 * @property {string} name
 * @property {Color} color
 * @property {string[]} linkedLayers
 * @property {string[]} linkedProperties
 * @property {boolean} locked
 * @property {string} [category]
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} totalFrames
 * @property {string} backgroundColor
 * @property {string[]} rootLayers
 * @property {Object.<string, Layer>} layers
 * @property {Keyframe[]} keyframes
 * @property {TimelineMarker[]} markers
 * @property {MotionPath[]} motionPaths
 * @property {GlobalColor[]} globalColors
 * @property {Object} exportSettings
 * @property {Object} metadata
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} version
 */

export const PROJECT_VERSION = 1;

export const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 180; // frames = 6 seconds

export const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'colorDodge', 'colorBurn',
  'hardLight', 'softLight', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity'
];

export const EASING_PRESETS = {
  linear: { type: 'linear', bezier: [0, 0, 1, 1] },
  easeIn: { type: 'easeIn', bezier: [0.42, 0, 1, 1] },
  easeOut: { type: 'easeOut', bezier: [0, 0, 0.58, 1] },
  easeInOut: { type: 'easeInOut', bezier: [0.42, 0, 0.58, 1] },
  smooth: { type: 'smooth', bezier: [0.25, 0.1, 0.25, 1] },
  strongSmooth: { type: 'strongSmooth', bezier: [0.45, 0.05, 0.55, 0.95] },
  back: { type: 'back', bezier: [0.36, 0, 0.66, -0.56] },
  overshoot: { type: 'overshoot', bezier: [0.34, 1.56, 0.64, 1] },
  anticipation: { type: 'anticipation', bezier: [0.36, -0.56, 0.66, 0] },
};

export const CANVAS_PRESETS = [
  { name: 'HD 1920×1080', width: 1920, height: 1080 },
  { name: '4K 3840×2160', width: 3840, height: 2160 },
  { name: 'Square 1080×1080', width: 1080, height: 1080 },
  { name: 'Portrait 1080×1920', width: 1080, height: 1920 },
  { name: 'Story 1080×1920', width: 1080, height: 1920 },
  { name: 'Twitter 1200×675', width: 1200, height: 675 },
  { name: 'OBS Source 1920×1080', width: 1920, height: 1080 },
  { name: 'OBS Overlay 1280×720', width: 1280, height: 720 },
  { name: 'Sticker 512×512', width: 512, height: 512 },
  { name: 'Icon 256×256', width: 256, height: 256 },
  { name: 'Small Icon 128×128', width: 128, height: 128 },
  { name: 'Thumbnail 320×180', width: 320, height: 180 },
];

export const FPS_OPTIONS = [12, 15, 24, 25, 30, 50, 60];

export const LAYER_COLORS = [
  '#f04060', '#f07020', '#f0c020', '#40c040',
  '#20b0f0', '#7b68ee', '#c040c0', '#f04090',
  '#909090'
];
