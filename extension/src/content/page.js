import { detectVideoUrl } from '../lib/platform.js';

// Read only page metadata. No site API calls, cookie access or CDN scraping.
function meta(...names) {
  for (const name of names) {
    const value = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
    if (value) return value;
  }
  return '';
}

function pageContext() {
  const image = meta('og:image', 'twitter:image') || document.querySelector('video[poster]')?.poster || '';
  return {
    url: location.href,
    title: (meta('og:title', 'twitter:title') || document.title || '').slice(0, 180),
    thumbnail: /^https:\/\//i.test(image) ? image.slice(0, 2048) : null,
    uploader: (meta('author') || '').slice(0, 80),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_PAGE_CONTEXT') {
    sendResponse(pageContext());
  }
});

let lastSignature = '';
let timer;
function notifyChange() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const context = pageContext();
    const signature = `${context.url}|${context.title}|${context.thumbnail}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    chrome.runtime.sendMessage({ type: 'PAGE_CHANGED', url: context.url }).catch(() => {});
  }, 250);
}

// TikTok/Instagram/Facebook often navigate without a full page load.
new MutationObserver(notifyChange).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['content', 'href'] });
window.addEventListener('popstate', notifyChange);
window.addEventListener('hashchange', notifyChange);
notifyChange();

function nearestVideoLink(target) {
  if (!(target instanceof Element)) return null;
  const direct = target.closest('a[href]');
  const directUrl = detectVideoUrl(direct?.href);
  if (directUrl?.isVideo) return directUrl.url;
  // Only inspect the surrounding post, never the entire feed/body. Otherwise a
  // right-click on one video could accidentally download a different post.
  const post = target.closest('article, [role="article"], [data-e2e="feed-video"]');
  if (post) {
    for (const anchor of [...post.querySelectorAll('a[href]')].slice(0, 40)) {
      const parsed = detectVideoUrl(anchor.href);
      if (parsed?.isVideo) return parsed.url;
    }
  }
  return null;
}

document.addEventListener('contextmenu', (event) => {
  chrome.runtime.sendMessage({ type: 'CONTEXT_TARGET', url: nearestVideoLink(event.target) }).catch(() => {});
}, { capture: true });
