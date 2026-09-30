"""Offline validation and a real yt-dlp/FFmpeg pipeline test with local fixture media."""

import http.server
import shutil
import subprocess
import tempfile
import threading
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from helper.downloader import (QUALITY_FORMATS, DownloadProblem, Downloader,
                               clean_filename, explain_error, summarize, validate_url)


class UrlTests(unittest.TestCase):
    def test_supported_single_video_links(self):
        examples = {
            'TikTok': ['https://www.tiktok.com/@creator/video/729123456789', 'https://vm.tiktok.com/ZX123/', 'https://vt.tiktok.com/ZZaa/', 'https://www.tiktok.com/t/ZTAabcd/'],
            'Instagram': ['https://www.instagram.com/reel/DA_abc-123/', 'https://instagram.com/p/Dabc/?igsh=abc', 'https://www.instagram.com/stories/creator/123456789/'],
            'Facebook': ['https://www.facebook.com/reel/123456', 'https://m.facebook.com/watch/?v=123456', 'https://fb.watch/abcde/', 'https://facebook.com/share/r/abcDEF/', 'https://www.facebook.com/user/videos/12345/', 'https://www.facebook.com/user/videos/a-great-video/12345/'],
        }
        for platform, links in examples.items():
            for link in links:
                with self.subTest(link=link):
                    self.assertEqual(validate_url(link)[1], platform)

    def test_blocks_feeds_urls_and_host_spoofing(self):
        for link in [
            'https://www.instagram.com/', 'https://www.instagram.com/creator/',
            'https://www.tiktok.com/@creator', 'https://www.facebook.com/watch/',
            'https://facebook.com.evil.test/watch/?v=1234',
            'https://facebook.com@127.0.0.1/watch?v=1234',
            'file:///etc/passwd', 'http://127.0.0.1/test',
            'https://www.instagram.com:8443/p/abc/',
            'https://www.tiktok.com/wrong/@creator/video/12345',
        ]:
            with self.subTest(link=link), self.assertRaises(DownloadProblem):
                validate_url(link)

    def test_normalizes_http_and_removes_fragments(self):
        url, platform = validate_url('http://www.instagram.com/reel/abc/#comments')
        self.assertEqual((url, platform), ('https://www.instagram.com/reel/abc/', 'Instagram'))

    def test_filename_is_plain_text_not_template_or_path(self):
        self.assertEqual(clean_filename('../../%(title)s\\foo.mp4'), '-..-(title)s-foo.mp4')
        self.assertEqual(clean_filename('A\u202eB'), 'AB')
        self.assertLessEqual(len(clean_filename('a' + '😀' * 89).encode('utf-8')), 120)
        self.assertIsNone(clean_filename(''))
        for bad in ['CON', 'NUL.txt', '../', ' ']:
            with self.subTest(bad=bad), self.assertRaises(DownloadProblem):
                clean_filename(bad)

    def test_metadata_summary_filters_non_https_thumbnails(self):
        info = {'title': 'Fixture', 'thumbnail': 'javascript:alert(1)', 'id': 'abc', 'formats': [{'height': 720}, {'height': 1080}, {'height': None}]}
        summary = summarize(info, 'TikTok')
        self.assertEqual(summary['heights'], [1080, 720])
        self.assertIsNone(summary['thumbnail'])
        with self.assertRaises(DownloadProblem):
            summarize({'ext': 'jpg', 'title': 'Still image'}, 'Instagram')

    def test_options_and_quality_validate_before_downloading(self):
        self.assertTrue(all('height<=1080' in part for part in QUALITY_FORMATS['1080'].split('/')))
        self.assertTrue(all('height<=720' in part for part in QUALITY_FORMATS['720'].split('/')))
        engine = Downloader(Path('/tmp/test-output'))
        self.assertEqual(engine._options('chrome')['cookiesfrombrowser'], ('chrome', None, None, None))
        with self.assertRaises(DownloadProblem):
            engine._options('arbitrary-browser')
        with self.assertRaises(DownloadProblem):
            engine.download('https://instagram.com/reel/abc/', '8k', None, 'none', uuid.uuid4().hex, lambda _: None, lambda: False)
        self.assertIn('Best', explain_error(Exception('ERROR: Requested format is not available')))


@unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg is required for the real media pipeline test')
class RealPipelineTests(unittest.TestCase):
    """Exercise actual yt-dlp extraction, progress hooks, file writing and audio conversion.

    The test only patches our URL allowlist to admit its local fixture, not yt-dlp.
    Production retains the strict TikTok/Instagram/Facebook allowlist.
    """

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        subprocess.run([
            'ffmpeg', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=160x90:r=8',
            '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '1',
            '-c:v', 'mpeg4', '-c:a', 'aac', '-y', str(self.root / 'clip.mp4'),
        ], check=True, capture_output=True)
        (self.root / 'index.html').write_text('<html><head><meta property="og:title" content="Local test video"></head><body><video controls src="/clip.mp4"></video></body></html>')
        root = self.root

        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(root), **kwargs)

            def log_message(self, *_args):
                pass

        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}/index.html'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.temp.cleanup()

    def test_video_and_audio_are_saved_with_progress(self):
        engine = Downloader(self.root / 'downloads')
        with patch('helper.downloader.validate_url', return_value=(self.url, 'TikTok')):
            info = engine.info(self.url)
            self.assertIn('test video', info['title'].lower())
            for quality, extension, name in [('best', '.mp4', 'My test file'), ('audio', '.mp3', 'My test file'), ('best', '.mp4', None)]:
                with self.subTest(quality=quality, name=name):
                    events = []
                    result = engine.download(self.url, quality, name, 'none', uuid.uuid4().hex, events.append, lambda: False)
                    file = Path(result['path'])
                    self.assertTrue(file.is_file())
                    self.assertGreater(file.stat().st_size, 1000)
                    self.assertEqual(file.suffix, extension)
                    self.assertEqual(file.parent, self.root / 'downloads' / 'TikTok')
                    self.assertIn(name or 'Local test video', file.name)
                    self.assertTrue(any(event['phase'] == 'downloading' for event in events))
                    self.assertTrue(any(event['phase'] == 'processing' for event in events))
