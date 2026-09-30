"""The only extraction engine is yt-dlp. No site scraping lives in this project."""

from __future__ import annotations

import re
import shutil
import unicodedata
from pathlib import Path
from urllib.parse import parse_qs, urlsplit, urlunsplit

import yt_dlp
from yt_dlp.version import __version__ as YT_DLP_VERSION


class DownloadProblem(Exception):
    """An error safe to display to the user."""


class DownloadCancelled(Exception):
    """Raised from a yt-dlp progress hook when the user cancels."""


QUALITY_FORMATS = {
    "best": "bv*+ba/b",
    "1080": "bv[height<=1080]+ba/b[height<=1080]/bv[height<=1080]",
    "720": "bv[height<=720]+ba/b[height<=720]/bv[height<=720]",
    "audio": "ba/b",
}
COOKIE_SOURCES = {"none", "chrome", "firefox", "edge", "brave"}
HOSTS = {
    "TikTok": {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"},
    "Instagram": {"instagram.com", "www.instagram.com", "m.instagram.com"},
    "Facebook": {"facebook.com", "www.facebook.com", "web.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.watch", "www.fb.watch"},
}
VIDEO_EXTENSIONS = {"mp4", "m4v", "webm", "mov", "mkv", "flv"}


def validate_url(raw: str) -> tuple[str, str]:
    """Accept only individual posts/video pages on supported hosts, never a feed or CDN URL."""
    if not isinstance(raw, str) or not raw.strip() or len(raw) > 2048:
        raise DownloadProblem("Enter a single TikTok, Instagram or Facebook video link.")
    try:
        url = urlsplit(raw.strip())
        host = (url.hostname or "").lower().rstrip(".")
        port = url.port
    except ValueError as exc:
        raise DownloadProblem("That link is not a valid web address.") from exc
    if url.scheme not in {"http", "https"} or url.username or url.password or port is not None:
        raise DownloadProblem("Only regular HTTPS video links are supported.")
    platform = next((name for name, domains in HOSTS.items() if host in domains), None)
    if not platform:
        raise DownloadProblem("Only TikTok, Instagram and Facebook links are supported.")

    path = url.path or "/"
    query = parse_qs(url.query)
    if platform == "TikTok":
        valid = bool(re.match(r"^(?:/@[^/]+)?/video/\d+/?$", path, re.I))
        valid |= host in {"vm.tiktok.com", "vt.tiktok.com"} and bool(path.strip("/"))
        valid |= bool(re.match(r"^/t/[\w-]+/?$", path, re.I))
    elif platform == "Instagram":
        valid = bool(re.match(r"^/(?:reel|reels|p|tv)/[\w-]+/?$", path, re.I))
        valid |= bool(re.match(r"^/stories/[^/]+/\d+/?$", path, re.I))
        valid |= bool(re.match(r"^/share/(?:reel|p)/[\w-]+/?$", path, re.I))
    else:
        valid = host in {"fb.watch", "www.fb.watch"} and bool(path.strip("/"))
        valid |= bool(re.match(r"^/reel/\d+/?$|^/(?:[^/]+/)?videos/(?:[^/]+/)?\d+/?$", path, re.I))
        valid |= bool(re.match(r"^/share/(?:v|r)/[\w-]+/?$", path, re.I))
        valid |= path.rstrip("/").lower() in {"/watch", "/watch/live", "/video.php"} and bool(query.get("v"))
        valid |= path.rstrip("/").lower() in {"/story.php", "/permalink.php"} and bool(query.get("story_fbid"))
    if not valid:
        raise DownloadProblem(f"Open an individual {platform} video, or paste its direct link (not a profile/feed).")
    return urlunsplit(("https", host, path, url.query, "")), platform


def clean_filename(value: str | None) -> str | None:
    """Custom names are plain text, never yt-dlp templates or filesystem paths."""
    if value is None or value == "":
        return None
    if not isinstance(value, str) or len(value) > 150:
        raise DownloadProblem("The filename must be at most 90 characters.")
    value = "".join(ch for ch in value if not unicodedata.category(ch).startswith("C"))
    value = re.sub(r'[<>:"/\\|?*%]+', "-", value)
    value = re.sub(r"\s+", " ", value).strip(" .")[:90].rstrip(" .")
    # A 90-character emoji filename can exceed filesystem byte limits. Leave room
    # for the site ID, unique job suffix, and extension on ext4/APFS/NTFS.
    while len(value.encode("utf-8")) > 120:
        value = value[:-1]
    if not any(ch.isalnum() for ch in value) or value.upper().split(".")[0] in {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}:
        raise DownloadProblem("Choose a different filename.")
    return value


def _text(value: object, length: int = 150) -> str:
    return str(value or "").strip()[:length]


def _first_video(info: dict) -> dict:
    if info.get("_type") in {"playlist", "multi_video"}:
        entries = info.get("entries") or []
        info = next((item for item in entries if isinstance(item, dict)), None)
        if not info:
            raise DownloadProblem("This post does not contain a downloadable video.")
    if info.get("ext") in {"jpg", "jpeg", "png", "webp", "avif"}:
        raise DownloadProblem("This post is a photo, not a video. Only videos are supported.")
    return info


def summarize(info: dict, platform: str) -> dict:
    item = _first_video(info)
    heights = sorted({int(f["height"]) for f in (item.get("formats") or [])
                      if isinstance(f, dict) and isinstance(f.get("height"), (int, float)) and f["height"] > 0}, reverse=True)
    thumbnail = item.get("thumbnail") or next((t.get("url") for t in reversed(item.get("thumbnails") or []) if isinstance(t, dict) and t.get("url")), None)
    if not isinstance(thumbnail, str) or not thumbnail.startswith("https://") or len(thumbnail) > 2048:
        thumbnail = None
    return {
        "platform": platform,
        "title": _text(item.get("title") or info.get("title") or "Untitled video"),
        "uploader": _text(item.get("uploader") or item.get("channel") or item.get("creator"), 80),
        "duration": item.get("duration") if isinstance(item.get("duration"), (int, float)) else None,
        "thumbnail": thumbnail,
        "heights": heights,
        "id": _text(item.get("id"), 100),
    }


class QuietLogger:
    """yt-dlp's CLI messages must never enter native messaging stdout."""

    def debug(self, message):
        pass

    def warning(self, message):
        pass

    def error(self, message):
        pass


class Downloader:
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir).expanduser().resolve()

    @staticmethod
    def has_ffmpeg() -> bool:
        return shutil.which("ffmpeg") is not None

    def _options(self, cookie_source: str) -> dict:
        if cookie_source not in COOKIE_SOURCES:
            raise DownloadProblem("Choose a supported browser for cookies, or select No cookies.")
        options = {
            "quiet": True,
            "no_warnings": True,
            "logger": QuietLogger(),
            "noplaylist": True,
            "playlist_items": "1",
            "socket_timeout": 25,
            "retries": 3,
            "fragment_retries": 3,
            "ignoreerrors": False,
        }
        if cookie_source != "none":
            # yt-dlp reads this browser's cookie store locally. Nothing is sent to Chrome
            # by the helper and no cookie values are written to extension storage.
            options["cookiesfrombrowser"] = (cookie_source, None, None, None)
        return options

    def info(self, raw_url: str, cookie_source: str = "none") -> dict:
        url, platform = validate_url(raw_url)
        with yt_dlp.YoutubeDL(self._options(cookie_source)) as ydl:
            data = ydl.extract_info(url, download=False)
        if not isinstance(data, dict):
            raise DownloadProblem("No video was found at this address.")
        return summarize(data, platform)

    def download(self, raw_url: str, quality: str, filename: str | None,
                 cookie_source: str, job_id: str, on_progress, is_cancelled) -> dict:
        url, platform = validate_url(raw_url)
        if quality not in QUALITY_FORMATS:
            raise DownloadProblem("Choose Best, 1080p, 720p or Audio only.")
        name = clean_filename(filename)
        if not re.fullmatch(r"[a-f0-9]{32}", job_id):
            raise DownloadProblem("Invalid download request.")
        if not self.has_ffmpeg():
            raise DownloadProblem("FFmpeg is missing. Install it and restart Chrome before downloading.")
        if is_cancelled():
            raise DownloadCancelled()

        folder = self.output_dir / platform
        folder.mkdir(parents=True, exist_ok=True)
        # Always append the site ID and a short job ID, preventing collisions and making
        # the final output discoverable even after audio conversion or stream merging.
        template = f"{name or '%(title).45s'} [%(id)s] {job_id[:8]}.%(ext)s"
        options = self._options(cookie_source)
        options.update({
            "format": QUALITY_FORMATS[quality],
            "outtmpl": {"default": str(folder / template)},
            "merge_output_format": "mp4/mkv",
        })
        if quality == "audio":
            options["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}]
        final_from_hook = None

        def download_hook(data):
            if is_cancelled():
                raise DownloadCancelled()
            if data.get("status") == "downloading":
                total = data.get("total_bytes") or data.get("total_bytes_estimate")
                amount = data.get("downloaded_bytes") or 0
                on_progress({
                    "phase": "downloading",
                    "percent": min(99, round(amount / total * 100)) if total else None,
                    "downloadedBytes": amount,
                    "totalBytes": total,
                    "speed": data.get("speed"),
                    "eta": data.get("eta"),
                })
            elif data.get("status") == "finished":
                on_progress({"phase": "processing", "percent": 99})

        def postprocessor_hook(data):
            nonlocal final_from_hook
            if is_cancelled():
                raise DownloadCancelled()
            if data.get("status") == "started":
                on_progress({"phase": "processing", "percent": 99})
            if data.get("status") == "finished":
                path = data.get("info_dict", {}).get("filepath")
                if path:
                    final_from_hook = path

        options["progress_hooks"] = [download_hook]
        options["postprocessor_hooks"] = [postprocessor_hook]
        with yt_dlp.YoutubeDL(options) as ydl:
            result = ydl.extract_info(url, download=True)
        if not isinstance(result, dict):
            raise DownloadProblem("yt-dlp returned no video. Try updating it and retrying.")
        path = self._output_path(folder, job_id, result, final_from_hook)
        return {**summarize(result, platform), "path": str(path), "filename": path.name, "url": url}

    @staticmethod
    def _output_path(folder: Path, job_id: str, result: dict, from_hook: str | None) -> Path:
        entry = _first_video(result)
        candidates = [from_hook, entry.get("filepath")]
        candidates.extend(f.get("filepath") for f in entry.get("requested_downloads") or [] if isinstance(f, dict))
        candidates.extend(str(p) for p in folder.glob(f"* {job_id[:8]}.*") if p.suffix not in {".part", ".ytdl"})
        for candidate in candidates:
            if candidate:
                path = Path(candidate).resolve()
                if path.is_file() and path.is_relative_to(folder.resolve()) and f" {job_id[:8]}." in path.name:
                    return path
        raise DownloadProblem("The transfer ended but the output file could not be found. Check the download folder.")


def explain_error(exc: Exception) -> str:
    if isinstance(exc, DownloadProblem):
        return str(exc)
    # yt-dlp often provides a useful platform-specific error (login, rate limit, format).
    message = re.sub(r"[\x00-\x1f\x7f\x1b]", " ", str(exc)).strip()
    message = re.sub(r"\s+", " ", message).removeprefix("ERROR: ")[:320]
    if "Requested format is not available" in message:
        return "This quality is not available for the video. Try Best quality instead."
    return message or "Extraction failed. Update yt-dlp, then retry or check the link in your browser."
