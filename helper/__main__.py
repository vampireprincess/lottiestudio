"""Optional diagnostics: the native host itself is started by Chrome."""

from helper.config import output_directory
from helper.downloader import Downloader, YT_DLP_VERSION

if __name__ == "__main__":
    print(f"Framekeeper helper • yt-dlp {YT_DLP_VERSION}")
    print(f"FFmpeg: {'ready' if Downloader.has_ffmpeg() else 'MISSING (install FFmpeg and restart Chrome)'}")
    print(f"Downloads: {output_directory()}")
    print("The helper is started on demand by Chrome; no server needs to run.")
