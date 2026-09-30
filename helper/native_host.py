"""Chrome native messaging (length-prefixed JSON over stdin/stdout).

One process handles a ping or information request; a persistent port handles one
video download. Chrome launches the host on demand, so no server is required.
"""

from __future__ import annotations

import json
import struct
import sys
import threading
import time
from typing import BinaryIO

from helper.config import output_directory
from helper.downloader import DownloadCancelled, Downloader, YT_DLP_VERSION, explain_error

MAX_INPUT = 16 * 1024
MAX_OUTPUT = 256 * 1024  # Chrome rejects messages above 1 MB.


def read_frame(stream: BinaryIO) -> dict | None:
    prefix = stream.read(4)
    if not prefix:
        return None
    if len(prefix) != 4:
        raise ValueError("Incomplete native message header")
    size = struct.unpack("@I", prefix)[0]
    if size > MAX_INPUT or size == 0:
        raise ValueError("Native request is too large")
    body = stream.read(size)
    if len(body) != size:
        raise ValueError("Incomplete native message")
    message = json.loads(body.decode("utf-8"))
    if not isinstance(message, dict):
        raise ValueError("Expected a JSON object")
    return message


class Writer:
    def __init__(self, stream: BinaryIO):
        self.stream = stream
        self.lock = threading.Lock()

    def send(self, message: dict):
        body = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(body) > MAX_OUTPUT:
            raise ValueError("Native response is too large")
        with self.lock:
            self.stream.write(struct.pack("@I", len(body)) + body)
            self.stream.flush()


def serve(first: dict, reader: BinaryIO, writer: Writer, downloader: Downloader):
    command = first.get("type")
    job_id = first.get("id")
    if command not in {"hello", "info", "download"}:
        writer.send({"type": "error", "id": job_id, "message": "Unknown helper command."})
        return
    if command == "hello":
        writer.send({
            "type": "hello", "ytDlpVersion": YT_DLP_VERSION,
            "ffmpeg": downloader.has_ffmpeg(), "outputDir": str(downloader.output_dir),
        })
        return
    if command == "info":
        try:
            info = downloader.info(first.get("url"), first.get("cookies", "none"))
            writer.send({"type": "info", "info": info})
        except Exception as exc:
            writer.send({"type": "error", "message": explain_error(exc)})
        return

    if not isinstance(job_id, str) or len(job_id) != 32:
        writer.send({"type": "error", "id": job_id, "message": "Invalid download ID."})
        return
    canceled = threading.Event()

    def listen_for_cancel():
        try:
            while True:
                message = read_frame(reader)
                if message is None:
                    canceled.set()  # Chrome closed the port; stop on the next hook.
                    return
                if message.get("type") == "cancel" and message.get("id") == job_id:
                    canceled.set()
        except (OSError, ValueError, json.JSONDecodeError):
            canceled.set()

    threading.Thread(target=listen_for_cancel, daemon=True).start()
    last_update = 0.0
    last_phase = None

    def progress(data):
        nonlocal last_update, last_phase
        now = time.monotonic()
        if data.get("phase") != last_phase or now - last_update >= 0.3:
            writer.send({"type": "progress", "id": job_id, **data})
            last_phase, last_update = data.get("phase"), now

    try:
        writer.send({"type": "progress", "id": job_id, "phase": "extracting", "percent": None})
        result = downloader.download(first.get("url"), first.get("quality", "best"),
                                     first.get("filename"), first.get("cookies", "none"),
                                     job_id, progress, canceled.is_set)
        writer.send({"type": "complete", "id": job_id, "result": result})
    except Exception as exc:
        if canceled.is_set() or isinstance(exc, DownloadCancelled):
            writer.send({"type": "canceled", "id": job_id})
        else:
            writer.send({"type": "error", "id": job_id, "message": explain_error(exc)})


def main():
    reader = sys.stdin.buffer
    writer = Writer(sys.stdout.buffer)
    try:
        first = read_frame(reader)
        if first is not None:
            serve(first, reader, writer, Downloader(output_directory()))
    except (BrokenPipeError, OSError):
        # The browser/port disappeared while we were responding.
        pass
    except Exception as exc:
        try:
            writer.send({"type": "error", "message": explain_error(exc)})
        except (BrokenPipeError, OSError):
            pass


if __name__ == "__main__":
    main()
