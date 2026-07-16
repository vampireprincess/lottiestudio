/**
 * Tauri File System Bridge — Tauri v2 compatible
 * Provides native file operations when running in Tauri,
 * falls back to browser patterns otherwise.
 *
 * Uses /* @vite-ignore * / to allow dynamic imports of Tauri plugins
 * which are only available inside the Tauri runtime, not in browser builds.
 */

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Lazy Tauri plugin loaders ─────────────────────────────────────────────

async function loadPlugin(name) {
  if (!isTauri()) return null;
  try {
    // vite-ignore: these packages exist only in Tauri runtime
    return await import(/* @vite-ignore */ name);
  } catch {
    return null;
  }
}

// ─── Open File ────────────────────────────────────────────────────────────────

export async function openFile(options = {}) {
  const { filters = [], multiple = false } = options;

  if (isTauri()) {
    const dialog = await loadPlugin('@tauri-apps/plugin-dialog');
    const fs = await loadPlugin('@tauri-apps/plugin-fs');
    if (dialog && fs) {
      const selected = await dialog.open({
        multiple,
        filters: filters.length > 0 ? filters : [{ name: 'All Files', extensions: ['*'] }],
      });
      if (!selected) return null;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      const content = await fs.readTextFile(filePath);
      return { path: filePath, content, name: filePath.split(/[/\\]/).pop() };
    }
  }

  // Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (filters.length > 0) {
      input.accept = filters.flatMap(f => (f.extensions || []).map(e => '.' + e)).join(',');
    }
    input.onchange = (e) => {
      const file = e.target?.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (re) => resolve({ path: file.name, content: re.target.result, name: file.name });
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── Save File ────────────────────────────────────────────────────────────────

export async function saveFile(content, options = {}) {
  const { defaultName = 'file.json', filters = [], mimeType = 'application/octet-stream' } = options;

  if (isTauri()) {
    const dialog = await loadPlugin('@tauri-apps/plugin-dialog');
    const fs = await loadPlugin('@tauri-apps/plugin-fs');
    if (dialog && fs) {
      const filePath = await dialog.save({
        defaultPath: defaultName,
        filters: filters.length > 0 ? filters : [{ name: 'All Files', extensions: ['*'] }],
      });
      if (!filePath) return null;

      if (content instanceof Blob) {
        const buf = await content.arrayBuffer();
        await fs.writeBinaryFile(filePath, new Uint8Array(buf));
      } else if (content instanceof Uint8Array || content instanceof ArrayBuffer) {
        await fs.writeBinaryFile(filePath, content instanceof ArrayBuffer ? new Uint8Array(content) : content);
      } else {
        await fs.writeTextFile(filePath, String(content));
      }
      return filePath;
    }
  }

  // Browser fallback — trigger download
  let blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof Uint8Array || content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([String(content)], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);
  return defaultName;
}

// ─── Reveal in Explorer ───────────────────────────────────────────────────────

export async function revealInExplorer(filePath) {
  if (!filePath || !isTauri()) return false;
  try {
    const opener = await loadPlugin('@tauri-apps/plugin-opener');
    if (opener?.revealItemInDir) {
      await opener.revealItemInDir(filePath);
      return true;
    }
    // Fallback: open parent folder
    const shell = await loadPlugin('@tauri-apps/plugin-shell');
    if (shell?.open) {
      const dir = filePath.split(/[/\\]/).slice(0, -1).join('/');
      await shell.open(dir);
      return true;
    }
  } catch (e) {
    console.warn('revealInExplorer failed:', e);
  }
  return false;
}
