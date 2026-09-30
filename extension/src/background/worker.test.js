import test from 'node:test';
import assert from 'node:assert/strict';

function event() {
  const handlers = [];
  return { addListener(fn) { handlers.push(fn); }, removeListener(fn) { const index = handlers.indexOf(fn); if (index >= 0) handlers.splice(index, 1); }, fire(...args) { for (const fn of [...handlers]) fn(...args); }, handlers };
}

function fakeChrome() {
  const data = {};
  const ports = [];
  const alerts = [];
  const messages = event();
  const chrome = {
    runtime: {
      id: 'a'.repeat(32), lastError: null,
      onMessage: messages, onInstalled: event(), onStartup: event(),
      getURL: (path) => `chrome-extension://${'a'.repeat(32)}/${path}`,
      sendMessage: async () => {},
      sendNativeMessage: (_host, message, callback) => callback(message.type === 'hello' ? { type: 'hello', ytDlpVersion: '2026.08.19', ffmpeg: true } : { type: 'info', info: { title: 'Real video', heights: [720] } }),
      connectNative: () => {
        const port = { onMessage: event(), onDisconnect: event(), sent: [], postMessage(message) { this.sent.push(message); }, disconnect() { this.onDisconnect.fire(); } };
        ports.push(port);
        return port;
      },
    },
    storage: {
      local: {
        setAccessLevel: async () => {},
        get: async (keys) => Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map((key) => [key, data[key]])),
        set: async (values) => { Object.assign(data, values); },
      },
    },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    contextMenus: { onClicked: event(), removeAll: (callback) => callback(), create: () => {} },
    notifications: { create: async (id, options) => { alerts.push({ id, options }); return id; } },
  };
  return { chrome, data, ports, alerts, messages };
}

function send(messages, chrome, type, extra = {}, fromContent = false) {
  return new Promise((resolve) => {
    const sender = { id: chrome.runtime.id, url: fromContent ? 'https://www.tiktok.com/@creator/video/123' : chrome.runtime.getURL('popup.html') };
    const handled = messages.handlers[0]({ type, ...extra }, sender, resolve);
    if (!handled) resolve({ blocked: true });
  });
}

async function flush() { await new Promise((resolve) => setTimeout(resolve, 30)); }

test('worker validates URLs, streams progress, saves history and rejects content-script requests', async () => {
  const mock = fakeChrome();
  globalThis.chrome = mock.chrome;
  await import('./worker.js?test=1');
  assert.equal((await send(mock.messages, mock.chrome, 'GET_STATE')).data.history.length, 0);
  assert.equal((await send(mock.messages, mock.chrome, 'HELLO')).data.ffmpeg, true);
  assert.equal((await send(mock.messages, mock.chrome, 'INFO', { url: 'https://evil.test/video' })).ok, false);
  assert.equal((await send(mock.messages, mock.chrome, 'DOWNLOAD', { url: 'https://www.tiktok.com/@x/video/123' }, true)).blocked, true);
  const url = 'https://www.tiktok.com/@creator/video/1234567890';
  const response = await send(mock.messages, mock.chrome, 'DOWNLOAD', { url, quality: '720', filename: 'Saved clip' });
  assert.equal(response.ok, true);
  const job = response.data;
  assert.equal(mock.ports[0].sent[0].quality, '720');
  assert.equal(mock.ports[0].sent[0].filename, 'Saved clip');
  mock.ports[0].onMessage.fire({ type: 'progress', id: job.id, phase: 'downloading', percent: 42, downloadedBytes: 1024 });
  mock.ports[0].onMessage.fire({ type: 'complete', id: job.id, result: { title: 'Real video', path: '/Downloads/Real video.mp4', filename: 'Real video.mp4' } });
  mock.ports[0].onDisconnect.fire(); // Expected exit after a completed download.
  await flush();
  assert.equal(mock.data.jobs[job.id].status, 'complete');
  assert.equal(mock.data.history.length, 1);
  assert.equal(mock.data.history[0].percent, 100);
  assert.equal(mock.alerts.length, 1);
  assert.equal((await send(mock.messages, mock.chrome, 'GET_STATE')).data.history[0].id, job.id);

  const next = (await send(mock.messages, mock.chrome, 'DOWNLOAD', { url })).data;
  const canceled = await send(mock.messages, mock.chrome, 'CANCEL', { id: next.id });
  assert.equal(canceled.ok, true);
  assert.equal(mock.ports[1].sent[1].type, 'cancel');
  mock.ports[1].onMessage.fire({ type: 'canceled', id: next.id });
  await flush();
  assert.equal(mock.data.jobs[next.id].status, 'canceled');
  assert.equal(mock.data.history.length, 2);
  const cleared = await send(mock.messages, mock.chrome, 'CLEAR_HISTORY');
  assert.equal(cleared.data.history.length, 0);
});
