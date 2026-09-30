"""Native message framing, command dispatch and installer registration."""

import io
import json
import os
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from helper.install import HOST_NAME, install, launcher_text, manifest_directory
from helper.native_host import Writer, read_frame, serve


def framed(message):
    data = json.dumps(message).encode('utf-8')
    return struct.pack('@I', len(data)) + data


class FrameTests(unittest.TestCase):
    def test_message_round_trip(self):
        out = io.BytesIO()
        Writer(out).send({'type': 'hello', 'text': 'café'})
        self.assertEqual(read_frame(io.BytesIO(out.getvalue())), {'type': 'hello', 'text': 'café'})
        self.assertIsNone(read_frame(io.BytesIO()))

    def test_rejects_large_or_malformed_frames(self):
        for data in [b'\x00', struct.pack('@I', 99999999), framed([])]:
            with self.subTest(data=data[:8]), self.assertRaises(ValueError):
                read_frame(io.BytesIO(data))

    def test_helper_subprocess_speaks_only_framed_json(self):
        process = subprocess.run([sys.executable, '-m', 'helper.native_host'], input=framed({'type': 'hello'}), capture_output=True, timeout=10)
        self.assertEqual(process.returncode, 0, process.stderr.decode())
        result = read_frame(io.BytesIO(process.stdout))
        self.assertEqual(result['type'], 'hello')
        self.assertIn('ytDlpVersion', result)
        self.assertIn('outputDir', result)
        self.assertEqual(len(process.stdout), 4 + len(json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8')))

    def test_info_errors_are_returned_in_protocol(self):
        class FakeDownloader:
            def info(self, *args):
                raise ValueError('Video not found')
        buffer = io.BytesIO()
        serve({'type': 'info', 'url': 'https://instagram.com/reel/a/'}, io.BytesIO(), Writer(buffer), FakeDownloader())
        self.assertEqual(read_frame(io.BytesIO(buffer.getvalue()))['message'], 'Video not found')

    def test_download_sends_progress_and_completed_file(self):
        class FakeDownloader:
            def download(self, url, quality, name, cookies, id, on_progress, is_cancelled):
                self_test.assertEqual((quality, name, cookies), ('best', 'A clip', 'none'))
                on_progress({'phase': 'downloading', 'percent': 45, 'downloadedBytes': 450})
                on_progress({'phase': 'processing', 'percent': 99})
                return {'title': 'Saved clip', 'path': '/Downloads/Saved clip.mp4', 'filename': 'Saved clip.mp4'}
        self_test = self
        id = 'b' * 32
        out = io.BytesIO()
        serve({'type': 'download', 'id': id, 'quality': 'best', 'filename': 'A clip', 'cookies': 'none'}, io.BytesIO(), Writer(out), FakeDownloader())
        stream = io.BytesIO(out.getvalue())
        self.assertEqual(read_frame(stream)['phase'], 'extracting')
        self.assertEqual(read_frame(stream)['percent'], 45)
        self.assertEqual(read_frame(stream)['phase'], 'processing')
        self.assertEqual(read_frame(stream)['result']['filename'], 'Saved clip.mp4')

    def test_cancel_message_interrupts_active_download(self):
        class FakeDownloader:
            def download(self, _url, _quality, _name, _cookies, _id, _progress, is_cancelled):
                import time
                for _ in range(100):
                    if is_cancelled():
                        raise RuntimeError('Stopped')
                    time.sleep(0.002)
                raise AssertionError('Cancellation was not delivered')
        id = 'a' * 32
        out = io.BytesIO()
        serve({'type': 'download', 'id': id, 'url': 'https://x/'}, io.BytesIO(framed({'type': 'cancel', 'id': id})), Writer(out), FakeDownloader())
        stream = io.BytesIO(out.getvalue())
        self.assertEqual(read_frame(stream)['type'], 'progress')
        self.assertEqual(read_frame(stream)['type'], 'canceled')


class InstallerTests(unittest.TestCase):
    def test_per_user_manifest_and_launcher(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'repository'
            (root / 'helper').mkdir(parents=True)
            home = Path(tmp) / 'home'
            manifest = install('a' * 32, platform='linux', home=home, root=root, python=Path(sys.executable))
            self.assertEqual(manifest, home / '.config/google-chrome/NativeMessagingHosts' / f'{HOST_NAME}.json')
            data = json.loads(manifest.read_text())
            self.assertEqual(data['allowed_origins'], ['chrome-extension://' + 'a' * 32 + '/'])
            launcher = Path(data['path'])
            self.assertTrue(os.access(launcher, os.X_OK))
            self.assertIn(str(root), launcher.read_text())
            self.assertIn(str(Path(sys.executable).absolute()), launcher.read_text())
            if os.name != 'nt':
                # Run Chrome's generated launcher from an unrelated directory.
                # A venv interpreter must not be resolved to the system Python.
                env = {**os.environ, 'PYTHONPATH': str(Path(__file__).resolve().parents[2])}
                probe = subprocess.run([str(launcher)], input=framed({'type': 'hello'}),
                                       cwd=home, env=env, capture_output=True, timeout=10)
                self.assertEqual(probe.returncode, 0, probe.stderr.decode())
                self.assertEqual(read_frame(io.BytesIO(probe.stdout))['type'], 'hello')
            self.assertEqual(install('a' * 32, platform='linux', home=home, root=root), manifest)

    def test_windows_and_macos_paths(self):
        self.assertIn('NativeMessagingHosts', str(manifest_directory('chrome', 'darwin', Path('/Users/me'))))
        self.assertIsNone(manifest_directory('chrome', 'win32', Path('C:/Users/me')))
        wrapper = launcher_text(Path('C:/Program Files/Python/python.exe'), Path('C:/My Repo'), True)
        self.assertIn('cd /d "C:/My Repo"', wrapper)
        self.assertIn('python.exe" -u -m helper.native_host', wrapper)
        with self.assertRaises(ValueError):
            install('not-a-chrome-id')
