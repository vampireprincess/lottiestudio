"""Tiny, read-only download page for the Framekeeper ZIP preview.

This serves ONLY the prepared archive and a landing page. It is not the
extension's downloader helper and must not be installed on the user's machine.
"""

from __future__ import annotations

import hashlib
import html
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ARCHIVE = Path(__file__).resolve().parent.parent / "Framekeeper-v0.1.0.zip"
PORT = int(os.environ.get("PORT", "8765"))


class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.respond(head_only=True)

    def do_GET(self):
        self.respond(head_only=False)

    def respond(self, head_only: bool):
        route = self.path.split("?", 1)[0]
        if route == "/":
            if not ARCHIVE.is_file():
                self.send_error(503, "ZIP package is not available")
                return
            digest = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
            page = f"""<!doctype html><html lang=\"bs\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Preuzmi Framekeeper ZIP</title><style>
            :root {{ color-scheme: light dark; font-family: system-ui, sans-serif; }}
            body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101712; color: #eff5ed; padding: 24px; box-sizing: border-box; }}
            main {{ max-width: 550px; width: 100%; background: #1a251d; border: 1px solid #3b5140; border-radius: 22px; padding: 30px; box-sizing: border-box; box-shadow: 0 20px 60px #0005; }}
            h1 {{ font-size: 26px; margin: 0 0 6px; }} p,li {{ color: #bfd0c0; line-height: 1.55; }}
            .label {{ color: #bce58d; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }}
            .button {{ display: block; text-align: center; background: #bce58d; color: #142015; text-decoration: none; border-radius: 12px; padding: 16px; margin: 24px 0 16px; font-weight: 800; }}
            .button:hover {{ background: #d2f3af; }} code {{ overflow-wrap: anywhere; color: #d5e9cb; }}
            small {{ color: #9fb1a0; }}
            </style></head><body><main><div class=\"label\">Framekeeper 0.1.0 · instalacijski paket</div><h1>Preuzmi ZIP paket</h1><p>Ovo je pravi ZIP s gotovom Chrome ekstenzijom, izvornim kodom i Python helperom — nije <code>.patch</code> datoteka.</p><a class=\"button\" href=\"/Framekeeper-v0.1.0.zip\" download=\"Framekeeper-v0.1.0.zip\">⬇ Preuzmi Framekeeper-v0.1.0.zip ({ARCHIVE.stat().st_size // 1024} KB)</a><p>Ako klik ne počne preuzimanje: desni klik na dugme → <b>Save link as / Spremi vezu kao</b>. Ne koristi opciju <em>Download all changes</em> — ona daje <code>.patch</code>.</p><ol><li>Raspakuj ZIP na stalno mjesto.</li><li>U Chromeu otvori <code>chrome://extensions</code> → Developer mode → Load unpacked → odaberi <code>Framekeeper/extension/dist</code>.</li><li>Prati <code>INSTALACIJA.md</code> iz ZIP-a za Python helper i FFmpeg.</li></ol><small>SHA-256: <code>{html.escape(digest)}</code></small></main></body></html>""".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if not head_only:
                self.wfile.write(page)
            return
        if route != "/Framekeeper-v0.1.0.zip":
            self.send_error(404, "Not found")
            return
        if not ARCHIVE.is_file():
            self.send_error(503, "ZIP package is not available")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", 'attachment; filename="Framekeeper-v0.1.0.zip"')
        self.send_header("Content-Length", str(ARCHIVE.stat().st_size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head_only:
            with ARCHIVE.open("rb") as stream:
                while chunk := stream.read(64 * 1024):
                    self.wfile.write(chunk)


if __name__ == "__main__":
    print(f"Framekeeper ZIP download page listening on 0.0.0.0:{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
