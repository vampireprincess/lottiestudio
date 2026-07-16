/**
 * dotLottie Exporter — Faza 9
 * Creates a .lottie ZIP file (dotLottie format v1)
 */
import { exportLottie } from '../exporters/lottieExporter.js';

/**
 * Export as dotLottie (.lottie) — ZIP with manifest.json + animation JSON
 * Uses native browser ZIP via CompressionStream where available,
 * otherwise falls back to a minimal custom ZIP builder.
 */
export async function exportDotLottie(project, options = {}) {
  if (!project) throw new Error('No project provided');
  const lottieData = exportLottie(project, options);
  const animJson = JSON.stringify(lottieData);
  const animName = (project.name || 'animation').replace(/[^a-z0-9_-]/gi, '_');

  const manifest = {
    version: '1',
    revision: 1,
    keywords: project.metadata?.tags?.join(',') || '',
    author: project.metadata?.author || '',
    generator: 'Lottie Studio',
    animations: [{
      id: animName,
      url: `animations/${animName}.json`,
      themeColor: project.backgroundColor || '#000000',
      speed: 1,
      direction: 1,
      playMode: 'normal',
      loop: options.loop !== false,
      autoplay: true,
      hover: false,
      intermission: 0,
    }],
    themes: options.themes || [],
    states: [],
    markers: (project.markers || []).map(m => ({
      name: m.name, frame: m.frame,
    })),
  };

  // Build minimal ZIP in memory
  const files = {
    'manifest.json': JSON.stringify(manifest),
    [`animations/${animName}.json`]: animJson,
  };

  // Add themes if exposed colors exist
  if (project.globalColors?.length > 0 && options.includeThemes) {
    const theme = {
      id: 'default',
      values: project.globalColors.reduce((acc, gc) => {
        acc[gc.name] = colorToLottie(gc.color);
        return acc;
      }, {}),
    };
    files['themes/default.json'] = JSON.stringify(theme);
  }

  let zipBytes;
  try {
    zipBytes = buildMinimalZip(files);
  } catch (e) {
    throw new Error('Failed to build dotLottie ZIP: ' + e.message);
  }
  return new Blob([zipBytes], { type: 'application/octet-stream' });
}

function colorToLottie(c) {
  if (!c) return [0,0,0,1];
  return [+(c.r/255).toFixed(4), +(c.g/255).toFixed(4), +(c.b/255).toFixed(4), c.a ?? 1];
}

// ─── Minimal ZIP builder (no dependencies) ────────────────────────────────────
function buildMinimalZip(files) {
  const encoder = new TextEncoder();
  const localHeaders = [];
  const centralDir = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);
    const compSize = dataBytes.length;
    const uncompSize = dataBytes.length;
    const date = dosDateTime(new Date());

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x504b0304, true); // signature
    v.setUint16(4, 20, true);          // version needed
    v.setUint16(6, 0, true);           // flags
    v.setUint16(8, 0, true);           // no compression
    v.setUint32(10, date, true);       // mod date
    v.setUint32(14, crc, true);        // CRC32
    v.setUint32(18, compSize, true);   // compressed size
    v.setUint32(22, uncompSize, true); // uncompressed size
    v.setUint16(26, nameBytes.length, true);
    v.setUint16(28, 0, true);          // extra length
    local.set(nameBytes, 30);
    local.set(dataBytes, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);
    cv.setUint32(0, 0x504b0102, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(12, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compSize, true);
    cv.setUint32(24, uncompSize, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true); // file attr: archive
    cv.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);
    centralDir.push(cdEntry);

    offset += local.length;
  }

  const cdStart = offset;
  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x504b0506, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, Object.keys(files).length, true);
  ev.setUint16(10, Object.keys(files).length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);

  const all = [...localHeaders, ...centralDir, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  all.forEach(a => { result.set(a, pos); pos += a.length; });
  return result;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const date = (d.getFullYear() - 1980) << 25 | (d.getMonth() + 1) << 21 | d.getDate() << 16;
  const time = d.getHours() << 11 | d.getMinutes() << 5 | Math.round(d.getSeconds() / 2);
  return date | time;
}
