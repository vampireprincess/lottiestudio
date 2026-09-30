// The UI recognizes page URLs; the Python helper independently validates them.
// Neither layer accepts arbitrary CDN URLs, localhost, or profile/feed pages.
const HOSTS = {
  TikTok: new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']),
  Instagram: new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']),
  Facebook: new Set(['facebook.com', 'www.facebook.com', 'web.facebook.com', 'm.facebook.com', 'mbasic.facebook.com', 'fb.watch', 'www.fb.watch']),
};

export function detectVideoUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const platform = Object.keys(HOSTS).find((name) => HOSTS[name].has(host));
  if (!platform) return null;
  const path = url.pathname;
  let isVideo = false;
  if (platform === 'TikTok') {
    isVideo = /^(?:\/@[^/]+)?\/video\/\d+\/?$/i.test(path) ||
      (['vm.tiktok.com', 'vt.tiktok.com'].includes(host) && path !== '/') ||
      /^\/t\/[\w-]+\/?$/i.test(path);
  } else if (platform === 'Instagram') {
    isVideo = /^\/(?:reel|reels|p|tv)\/[\w-]+\/?$/i.test(path) ||
      /^\/stories\/[^/]+\/\d+\/?$/i.test(path) ||
      /^\/share\/(?:reel|p)\/[\w-]+\/?$/i.test(path);
  } else {
    isVideo = (['fb.watch', 'www.fb.watch'].includes(host) && path !== '/') ||
      /^\/reel\/\d+\/?$|^\/(?:[^/]+\/)?videos\/(?:[^/]+\/)?\d+\/?$/i.test(path) ||
      /^\/share\/(?:v|r)\/[\w-]+\/?$/i.test(path) ||
      (['/watch', '/watch/live', '/video.php'].includes(path.replace(/\/$/, '').toLowerCase()) && !!url.searchParams.get('v')) ||
      (['/story.php', '/permalink.php'].includes(path.replace(/\/$/, '').toLowerCase()) && !!url.searchParams.get('story_fbid'));
  }
  url.protocol = 'https:';
  url.hash = '';
  return { platform, isVideo, url: url.toString() };
}

export function firstVideoLink(text) {
  if (typeof text !== 'string') return null;
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const match of matches) {
    const parsed = detectVideoUrl(match.replace(/[),.;!?\]}]+$/, ''));
    if (parsed?.isVideo) return parsed;
  }
  return null;
}
