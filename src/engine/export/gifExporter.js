/**
 * GIF Exporter — uses gifenc for real GIF output
 * Loaded dynamically only when needed.
 */
import { exportLottie } from '../exporters/lottieExporter.js';
import lottie from 'lottie-web';

/**
 * Export animation as a real .gif file
 * @param {Object} project
 * @param {Object} options
 * @param {Function} onProgress - (0-100)
 * @returns {Promise<Blob>} GIF blob
 */
export async function exportGIF(project, options = {}, onProgress) {
  const {
    fps = Math.min(project.fps || 30, 24), // GIF max reasonable fps
    width = Math.min(project.width || 800, 800),
    height = Math.min(project.height || 600, 600),
    scale = 1,
    transparent = false,
    startFrame = 0,
    endFrame = (project.totalFrames || 180) - 1,
    quality = 10, // gifenc quality: lower = better quality, slower
  } = options;

  const W = Math.round(width * scale);
  const H = Math.round(height * scale);
  const totalFrames = endFrame - startFrame + 1;
  const delay = Math.round(100 / fps); // gifenc delay in 10ms units

  // Lazy-load gifenc
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const encoder = GIFEncoder();
  const lottieData = exportLottie(project, { fps, loop: true, startFrame, endFrame });

  // Create offscreen canvas and lottie instance
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${W}px;height:${H}px;overflow:hidden;pointer-events:none;`;
  document.body.appendChild(container);

  let anim;
  try {
    anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: lottieData,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(reject, 8000);
      anim.addEventListener('DOMLoaded', () => { clearTimeout(timeout); resolve(); });
    });

    // Render each frame
    for (let fi = 0; fi < totalFrames; fi++) {
      anim.goToAndStop(fi, true);
      await new Promise(r => requestAnimationFrame(r));

      // Capture SVG → canvas
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        if (!transparent) {
          ctx.fillStyle = project.backgroundColor || '#000000';
          ctx.fillRect(0, 0, W, H);
        } else {
          ctx.clearRect(0, 0, W, H);
        }

        const svgStr = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, W, H);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          img.src = url;
        });
      }

      // Get pixel data and quantize to 256-color palette
      const imageData = ctx.getImageData(0, 0, W, H);
      const pixels = imageData.data;

      // Build Uint8Array RGB (gifenc expects RGB, not RGBA)
      const rgb = new Uint8Array(W * H * 3);
      for (let i = 0; i < W * H; i++) {
        rgb[i * 3]     = pixels[i * 4];
        rgb[i * 3 + 1] = pixels[i * 4 + 1];
        rgb[i * 3 + 2] = pixels[i * 4 + 2];
      }

      const palette = quantize(rgb, 256, { format: 'rgb444', oneBitAlpha: transparent });
      const index = applyPalette(rgb, palette, 'rgb444');

      encoder.writeFrame(index, W, H, {
        palette,
        delay,
        repeat: 0, // loop forever
        transparent: transparent ? 0 : undefined,
      });

      if (onProgress) onProgress(Math.round((fi / totalFrames) * 100));
    }

    encoder.finish();
    const buffer = encoder.bytes();
    return new Blob([buffer], { type: 'image/gif' });

  } finally {
    if (anim) anim.destroy();
    document.body.removeChild(container);
  }
}
