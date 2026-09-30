import test from 'node:test';
import assert from 'node:assert/strict';
import { detectVideoUrl, firstVideoLink } from './platform.js';

test('detects individual videos on all three sites, including short links', () => {
  for (const [url, platform] of [
    ['https://www.tiktok.com/@me/video/729123456789', 'TikTok'],
    ['https://vm.tiktok.com/ZM123abc/', 'TikTok'],
    ['https://www.instagram.com/reel/Dabc_123/?igsh=hello', 'Instagram'],
    ['https://www.instagram.com/p/Dabc_123/', 'Instagram'],
    ['https://m.facebook.com/watch/?v=123456', 'Facebook'],
    ['https://www.facebook.com/reel/123456', 'Facebook'],
    ['https://www.facebook.com/user/videos/a-video-title/123456', 'Facebook'],
    ['https://fb.watch/x_123/', 'Facebook'],
  ]) {
    assert.equal(detectVideoUrl(url)?.platform, platform, url);
    assert.equal(detectVideoUrl(url)?.isVideo, true, url);
  }
});

test('recognizes a supported site without treating its feed as a video', () => {
  assert.deepEqual(detectVideoUrl('https://www.instagram.com/'), {
    platform: 'Instagram', isVideo: false, url: 'https://www.instagram.com/',
  });
  assert.equal(detectVideoUrl('https://www.tiktok.com/@me').isVideo, false);
  assert.equal(detectVideoUrl('https://www.facebook.com/watch/').isVideo, false);
});

test('rejects lookalikes, credentials, ports and non-web URLs', () => {
  for (const url of [
    'https://www.tiktok.com.evil.test/@me/video/123',
    'https://instagram.com@evil.test/reel/123',
    'https://user:pass@www.instagram.com/p/abc/',
    'http://127.0.0.1:8080/',
    'https://facebook.com:444/watch?v=12',
    'javascript:alert(1)',
  ]) assert.equal(detectVideoUrl(url), null, url);
});

test('finds a link in copied share text but not an unrelated page', () => {
  assert.equal(firstVideoLink('See this! https://www.instagram.com/reel/Dabc/?igsh=hey.' )?.platform, 'Instagram');
  assert.equal(firstVideoLink('https://example.com/test'), null);
});
