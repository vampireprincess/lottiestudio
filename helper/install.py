"""Register Framekeeper as a per-user Chrome/Chromium native messaging host."""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import sys
from pathlib import Path

from helper.config import set_output_directory

HOST_NAME = "com.framekeeper.downloader"
REPO_ROOT = Path(__file__).resolve().parent.parent


def manifest_directory(browser: str, platform: str, home: Path) -> Path | None:
    if platform == "win32":
        return None  # Windows uses a registry entry to locate the manifest.
    if platform == "darwin":
        base = home / "Library" / "Application Support"
        folder = "Google/Chrome" if browser == "chrome" else "Chromium"
        return base / folder / "NativeMessagingHosts"
    base = home / ".config"
    folder = "google-chrome" if browser == "chrome" else "chromium"
    return base / folder / "NativeMessagingHosts"


def launcher_text(python: Path, root: Path, windows: bool) -> str:
    if windows:
        # A .bat wrapper is required for Chrome to invoke a Python module on Windows.
        # %% escapes percent signs within paths in batch source; spaces are quoted.
        def quote(path):
            return '"' + str(path).replace("%", "%%") + '"'
        # Use LF in Python source; Path.write_text translates it to CRLF on Windows.
        return f"@echo off\nchcp 65001 >NUL\ncd /d {quote(root)}\n{quote(python)} -u -m helper.native_host %*\n"
    return f"#!/bin/sh\ncd {shlex.quote(str(root))} || exit 1\nexport PATH=/opt/homebrew/bin:/usr/local/bin:\"$PATH\"\nexec {shlex.quote(str(python))} -u -m helper.native_host \"$@\"\n"


def install(extension_id: str, browser: str = "chrome", output_dir: str | None = None,
            platform: str | None = None, home: Path | None = None, python: Path | None = None,
            root: Path | None = None) -> Path:
    if not re.fullmatch(r"[a-p]{32}", extension_id or ""):
        raise ValueError("The Chrome extension ID must be 32 letters from a to p (from chrome://extensions).")
    if browser not in {"chrome", "chromium"}:
        raise ValueError("Choose chrome or chromium.")
    platform, home = platform or sys.platform, home or Path.home()
    root = (root or REPO_ROOT).resolve()
    # Do NOT resolve symlinks on the interpreter: venv/bin/python often points to
    # /usr/bin/python. Dereferencing it loses the venv and its yt-dlp install.
    python = Path(os.path.abspath(python or sys.executable))
    generated = root / "helper" / ".installed"
    generated.mkdir(parents=True, exist_ok=True)
    windows = platform == "win32"
    launcher = generated / ("run_host.bat" if windows else "run_host.sh")
    launcher.write_text(launcher_text(python, root, windows), encoding="utf-8")
    if not windows:
        launcher.chmod(0o700)
    host = {
        "name": HOST_NAME, "description": "Framekeeper local yt-dlp downloader",
        "path": str(launcher), "type": "stdio",
        "allowed_origins": [f"chrome-extension://{extension_id}/"],
    }
    location = manifest_directory(browser, platform, home)
    if location is None:
        location = generated
    location.mkdir(parents=True, exist_ok=True)
    manifest = location / f"{HOST_NAME}.json"
    manifest.write_text(json.dumps(host, indent=2) + "\n", encoding="utf-8")
    if windows:
        import winreg  # only available on Windows
        vendor = r"Google\Chrome" if browser == "chrome" else "Chromium"
        key_path = rf"Software\{vendor}\NativeMessagingHosts\{HOST_NAME}"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, str(manifest))
    if output_dir:
        set_output_directory(output_dir)
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Install the Framekeeper helper for this Chrome extension ID.")
    parser.add_argument("--extension-id", required=True, help="Copy this from the extension card at chrome://extensions")
    parser.add_argument("--browser", choices=["chrome", "chromium"], default="chrome")
    parser.add_argument("--output-dir", help="Optional local download directory (default: ~/Downloads/Framekeeper)")
    args = parser.parse_args()
    try:
        manifest = install(args.extension_id, args.browser, args.output_dir)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Installation failed: {exc}\n")
    print(f"Registered native host: {manifest}")
    print("Chrome will start the helper automatically. Keep this repository in its current location.")
    print("Restart Chrome, then open the extension to check the connection.")


if __name__ == "__main__":
    main()
