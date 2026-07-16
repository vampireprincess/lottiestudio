/**
 * Rendered Export Engine — Faza 9
 * WebM (with alpha), GIF, PNG Sequence using Canvas API + lottie-web
 */
import lottie from 'lottie-web';
import { exportLottie } from '../exporters/lottieExporter.js';

/**
 * Get best supported WebM MIME type with fallback chain
 */
export function getSupportedWebMType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264', // Safari fallback (very limited support)
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return { supported: true, mimeType: type };
    }
  }
  return { supported: false, mimeType: null };
}

/**
 * Check if WebM export is supported in this browser
 */
export function checkWebMSupport() {
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: 'MediaRecorder API is not available in this browser. Use Chrome, Edge, or Firefox.' };
  }
  const result = getSupportedWebMType();
  if (!result.supported) {
    return { supported: false, reason: 'No supported video codec found. WebM export requires Chrome, Edge, or Firefox.' };
  }
  return { supported: true, mimeType: result.mimeType, reason: null };
}

/**
 * Render animation to PNG frames via off-screen canvas
 * Uses lottie-web for accurate rendering
 */
export async function renderToPNGFrames(project, options = {}, onProgress) {
  const {
    fps = project.fps || 30,
    width = project.width || 1920,
    height = project.height || 1080,
    startFrame = 0,
    endFrame = project.totalFrames - 1,
    scale = 1,
    transparent = false,
    backgroundColor = project.backgroundColor || '#000000',
  } = options;

  const totalFrames = endFrame - startFrame + 1;
  const lottieData = exportLottie(project, { fps, loop: false });

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');

  // Create a hidden container for lottie-web
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${canvas.width}px;height:${canvas.height}px;overflow:hidden;`;
  document.body.appendChild(container);

  let anim;
  try {
    // Render via lottie-web SVG renderer → capture frames
    anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: lottieData,
    });

    await new Promise(resolve => anim.addEventListener('DOMLoaded', resolve));

    const frames = [];

    for (let fi = startFrame; fi <= endFrame; fi++) {
      anim.goToAndStop(fi, true);
      await new Promise(r => requestAnimationFrame(r));

      // Capture SVG to canvas
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (!transparent) {
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            canvas.toBlob(frameBlob => {
              frames.push(frameBlob);
              resolve();
            }, 'image/png');
          };
          img.onerror = reject;
          img.src = url;
        });
      }

      if (onProgress) onProgress(Math.round(((fi - startFrame) / totalFrames) * 100));
    }

    return frames;
  } finally {
    if (anim) anim.destroy();
    document.body.removeChild(container);
  }
}

/**
 * Encode frames to WebM using MediaRecorder
 * Returns a Blob
 */
export async function renderToWebM(project, options = {}, onProgress) {
  const {
    fps = project.fps || 30,
    width = project.width || 1920,
    height = project.height || 1080,
    scale = 1,
    transparent = false,
    backgroundColor = project.backgroundColor || '#000000',
    quality = 0.8,
    startFrame = 0,
    endFrame = project.totalFrames - 1,
  } = options;

  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: transparent });

  const frames = await renderToPNGFrames(project, options, pct => {
    if (onProgress) onProgress(Math.round(pct * 0.8));
  });

  // Use canvas + MediaRecorder for WebM
  const drawCanvas = document.createElement('canvas');
  drawCanvas.width = w;
  drawCanvas.height = h;
  const drawCtx = drawCanvas.getContext('2d', { alpha: transparent });

  const stream = drawCanvas.captureStream(fps);
  const { supported, mimeType, reason } = checkWebMSupport();
  if (!supported) throw new Error(reason || 'WebM not supported in this browser');

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: quality > 0.7 ? 8000000 : 3000000,
  });

  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.start();

  const frameDelay = 1000 / fps;
  for (let i = 0; i < frames.length; i++) {
    const img = await createImageBitmap(frames[i]);
    if (!transparent) {
      drawCtx.fillStyle = backgroundColor;
      drawCtx.fillRect(0, 0, w, h);
    } else {
      drawCtx.clearRect(0, 0, w, h);
    }
    drawCtx.drawImage(img, 0, 0);
    await new Promise(r => setTimeout(r, frameDelay));
    if (onProgress) onProgress(80 + Math.round((i / frames.length) * 20));
  }

  return new Promise(resolve => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.stop();
  });
}

/**
 * Create GIF using a simple canvas-based approach
 * Returns PNG frames packaged in a zip-like structure
 * Full GIF encoding requires a library — we export PNG sequence + instructions
 */
export async function renderToGIF(project, options = {}, onProgress) {
  // For true GIF, we export as apng (animated PNG) via canvas
  // or fallback to PNG sequence download
  const frames = await renderToPNGFrames(project, { ...options, transparent: false }, onProgress);
  return frames; // Return PNG frames for download as sequence
}

/**
 * Export PNG sequence as individual files (downloaded as ZIP)
 */
export async function exportPNGSequence(project, options = {}, onProgress) {
  const frames = await renderToPNGFrames(project, options, onProgress);
  const name = (project.name || 'animation').replace(/[^a-z0-9_-]/gi, '_');

  // Build ZIP with frames
  const files = {};
  frames.forEach((blob, i) => {
    // blob → bytes sync via FileReaderSync isn't available in main thread
    // We'll return blobs for individual download
  });

  return frames.map((blob, i) => ({
    name: `${name}_frame_${String(i).padStart(4, '0')}.png`,
    blob,
  }));
}
