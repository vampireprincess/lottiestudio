import { detectVideoUrl } from '../lib/platform.js';

const HOST = 'com.framekeeper.downloader';
const MENU = 'framekeeper-download-video';
const DEFAULT_SETTINGS = { quality: 'best', cookies: 'none', theme: 'system', notifications: true };
const TERMINAL = new Set(['complete', 'error', 'canceled']);
const ports = new Map();
const contextTargets = new Map();
let storageQueue = Promise.resolve();

// The content script must not be able to read local history or settings.
chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});

async function settings() {
  const stored = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (/host not found|specified native messaging host|not registered/i.test(message)) {
    return 'Local helper not found. Install it with your extension ID (see README), then restart Chrome.';
  }
  if (/native.*host.*exited|native.*host.*disconnected/i.test(message)) {
    return 'The local helper stopped unexpectedly. Check its Python dependencies and FFmpeg, then try again.';
  }
  return message;
}

function sendOnce(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST, message, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(normalizeError(chrome.runtime.lastError)));
      if (response?.type === 'error') return reject(new Error(response.message || 'The helper could not extract this video.'));
      if (!response) return reject(new Error('The helper returned no response. Check that yt-dlp is installed.'));
      resolve(response);
    });
  });
}

// Only the worker writes jobs/history. Serialize writes so progress and completion
// cannot race one another while the popup opens/closes.
function updateState(transform) {
  const work = storageQueue.catch(() => {}).then(async () => {
    const stored = await chrome.storage.local.get(['jobs', 'history', 'latestJobId']);
    const state = { jobs: stored.jobs || {}, history: stored.history || [], latestJobId: stored.latestJobId || null };
    const value = transform(state);
    await chrome.storage.local.set(state);
    return value;
  });
  storageQueue = work.catch(() => {});
  return work;
}

async function saveJob(id, change) {
  return updateState((state) => {
    const previous = state.jobs[id] || {};
    const job = { ...previous, ...change, id };
    state.jobs[id] = job;
    state.latestJobId = id;
    if (TERMINAL.has(job.status) && !TERMINAL.has(previous.status)) {
      state.history = [job, ...state.history.filter((entry) => entry.id !== id)].slice(0, 50);
    } else if (TERMINAL.has(job.status)) {
      state.history = state.history.map((entry) => entry.id === id ? job : entry);
    }
    const ordered = Object.values(state.jobs).sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    if (ordered.length > 60) {
      const keep = new Set(ordered.slice(0, 60).map((entry) => entry.id));
      state.jobs = Object.fromEntries(Object.entries(state.jobs).filter(([key]) => keep.has(key) || ports.has(key)));
    }
    return job;
  });
}

async function badge() {
  await chrome.action.setBadgeBackgroundColor({ color: '#7dba73' });
  await chrome.action.setBadgeText({ text: ports.size ? String(ports.size) : '' });
}

async function notify(title, message, id) {
  const options = await settings();
  if (!options.notifications) return;
  await chrome.notifications.create(id, {
    type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title, message,
  });
}

function validatedVideo(raw) {
  const parsed = detectVideoUrl(raw);
  if (!parsed?.isVideo) throw new Error('Open an individual TikTok, Instagram or Facebook video, or paste its direct link.');
  return parsed;
}

async function startDownload(raw, preferred = {}) {
  const video = validatedVideo(raw);
  const options = await settings();
  const id = crypto.randomUUID().replaceAll('-', '');
  const port = chrome.runtime.connectNative(HOST);
  let settled = false;
  ports.set(id, port);
  badge();
  port.onMessage.addListener(async (message) => {
    if (message?.id !== id || settled) return;
    if (message.type === 'progress') {
      await saveJob(id, {
        status: message.phase, phase: message.phase, percent: message.percent,
        downloadedBytes: message.downloadedBytes || 0, totalBytes: message.totalBytes || null,
        speed: message.speed || null, eta: message.eta ?? null,
      });
    } else if (message.type === 'complete' || message.type === 'error' || message.type === 'canceled') {
      settled = true;
      ports.delete(id);
      badge();
      const job = await saveJob(id, {
        status: message.type,
        phase: message.type,
        percent: message.type === 'complete' ? 100 : null,
        ...message.result,
        error: message.type === 'error' ? message.message : null,
        finishedAt: new Date().toISOString(),
      });
      if (message.type === 'complete') {
        await notify('Saved for later', `${job.filename} is ready in your Framekeeper folder.`, `saved-${id}`);
      } else if (message.type === 'error') {
        await notify('Download failed', message.message || 'Check the link and try again.', `failed-${id}`);
      }
    }
  });
  port.onDisconnect.addListener(async () => {
    ports.delete(id);
    badge();
    if (!settled) {
      settled = true;
      const detail = chrome.runtime.lastError?.message;
      const error = detail ? normalizeError(new Error(detail)) : 'The helper disconnected. Check your installation and try again.';
      await saveJob(id, { status: 'error', phase: 'error', error, finishedAt: new Date().toISOString() });
      await notify('Download interrupted', error, `failed-${id}`);
    }
  });
  const job = await saveJob(id, {
    id, url: video.url, platform: video.platform, quality: preferred.quality || options.quality,
    title: (preferred.title || '').slice(0, 150) || `${video.platform} video`,
    thumbnail: /^https:\/\//.test(preferred.thumbnail || '') ? preferred.thumbnail.slice(0, 2048) : null,
    status: 'extracting', phase: 'extracting', percent: null,
    startedAt: new Date().toISOString(),
  });
  try {
    port.postMessage({
      type: 'download', id, url: video.url, quality: job.quality,
      filename: preferred.filename || null, cookies: options.cookies,
    });
  } catch (error) {
    if (!settled) {
      settled = true;
      ports.delete(id);
      badge();
      await saveJob(id, { status: 'error', error: normalizeError(error), finishedAt: new Date().toISOString() });
    }
  }
  return job;
}

async function recoverInterrupted() {
  const recovered = await updateState((state) => {
    for (const [id, job] of Object.entries(state.jobs)) {
      if (!TERMINAL.has(job.status) && !ports.has(id)) {
        const next = { ...job, status: 'error', phase: 'error', error: 'Chrome closed before the download finished. Retry the link; a partial file may remain in Downloads.', finishedAt: new Date().toISOString() };
        state.jobs[id] = next;
        state.history = [next, ...state.history.filter((item) => item.id !== id)].slice(0, 50);
      }
    }
    return { jobs: state.jobs, history: state.history, latestJobId: state.latestJobId };
  });
  badge();
  return recovered;
}

async function handle(message) {
  switch (message.type) {
    case 'HELLO': return sendOnce({ type: 'hello' });
    case 'INFO': {
      const video = validatedVideo(message.url);
      const options = await settings();
      const result = await sendOnce({ type: 'info', url: video.url, cookies: options.cookies });
      return result.info;
    }
    case 'DOWNLOAD': return startDownload(message.url, message);
    case 'CANCEL': {
      const port = ports.get(message.id);
      if (!port) throw new Error('This download is no longer running.');
      port.postMessage({ type: 'cancel', id: message.id });
      return saveJob(message.id, { status: 'canceling', phase: 'canceling' });
    }
    case 'GET_STATE': return recoverInterrupted();
    case 'CLEAR_HISTORY': return updateState((state) => {
      for (const id of Object.keys(state.jobs)) if (TERMINAL.has(state.jobs[id].status)) delete state.jobs[id];
      state.history = [];
      if (!state.jobs[state.latestJobId]) state.latestJobId = Object.keys(state.jobs)[0] || null;
      return { jobs: state.jobs, history: state.history, latestJobId: state.latestJobId };
    });
    default: throw new Error('Unknown request.');
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message?.type) return false;
  if (message.type === 'PAGE_CHANGED' || message.type === 'CONTEXT_TARGET') {
    if (!sender.tab?.id || !detectVideoUrl(sender.tab.url)) return false;
    if (message.type === 'CONTEXT_TARGET') {
      const video = detectVideoUrl(message.url);
      if (video?.isVideo) contextTargets.set(sender.tab.id, { url: video.url, at: Date.now() });
      else contextTargets.delete(sender.tab.id);
    } else {
      chrome.runtime.sendMessage({ type: 'TAB_CHANGED', tabId: sender.tab.id, url: message.url }).catch(() => {});
    }
    return false;
  }
  // Web pages/content scripts cannot start jobs or access the history.
  if (sender.url !== chrome.runtime.getURL('popup.html')) return false;
  handle(message).then((data) => respond({ ok: true, data }), (error) => respond({ ok: false, error: normalizeError(error) }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({
    id: MENU, title: 'Download this video', contexts: ['page', 'video', 'link'],
    documentUrlPatterns: [
      'https://tiktok.com/*', 'https://*.tiktok.com/*',
      'https://instagram.com/*', 'https://*.instagram.com/*',
      'https://facebook.com/*', 'https://*.facebook.com/*',
      'https://fb.watch/*', 'https://*.fb.watch/*',
    ],
  }));
  recoverInterrupted();
});
chrome.runtime.onStartup.addListener(recoverInterrupted);
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU) return;
  const candidate = contextTargets.get(tab?.id);
  contextTargets.delete(tab?.id);
  const link = detectVideoUrl(info.linkUrl);
  const page = detectVideoUrl(info.pageUrl || tab?.url);
  const url = link?.isVideo ? link.url :
    candidate && Date.now() - candidate.at < 8000 ? candidate.url :
    page?.isVideo ? page.url : null;
  if (!url) {
    await chrome.notifications.create({ type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title: 'Open a video first', message: 'Right-click a video link, or open an individual video page and try again.' });
    return;
  }
  try { await startDownload(url); }
  catch (error) {
    await chrome.notifications.create({ type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title: 'Could not start download', message: normalizeError(error) });
  }
});
