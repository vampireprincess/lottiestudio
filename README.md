# Framekeeper — personal video saver

**Prebuilt ZIP install (no Node.js required):** see [INSTALACIJA.md](INSTALACIJA.md). The ZIP contains `extension/dist` ready for Chrome’s **Load unpacked**; the steps below are for building from source.

A **Chrome Manifest V3 extension** (React + Tailwind CSS) paired with a small **Python native-messaging helper** that uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) and FFmpeg. Save individual TikTok videos, Instagram videos/Reels, and Facebook videos to your own computer. No paid API, account with a third-party downloader, background web server, or cloud processing.

> **Personal use:** Only save media you own or have permission to download. The tool does not bypass DRM, private-account permissions, geographic restrictions, or a platform's terms. Whether a particular post works depends on the installed yt-dlp extractor, availability, and authentication. See [research and current limitations](RESEARCH.md).

## What works

- Detects a supported URL from the active tab, including navigation within single-page apps; alternatively paste a share link.
- Shows title, author, duration, available resolutions, and thumbnail when the extractor/page supplies them.
- Saves **Best**, **up to 1080p**, **up to 720p**, or **Audio only (MP3)**. Quality caps are selections, not upscaling. FFmpeg merges separate streams and converts audio.
- Custom filename (plain text, safely sanitized) or original title, plus the post ID and a unique job ID to prevent overwrites.
- Live extraction/download/processing progress, cancellation, finished/failed notifications, and a persistent local history (Chrome `storage.local`). Downloads continue when the popup closes, as long as Chrome remains running.
- Right-click **“Download this video”** on a supported page/video/link. Feed videos work when the post has a discoverable individual link; otherwise open the post itself.
- System/light/dark themes, settings for optional browser cookies, and configurable save folder through the helper installer.

## Install — Chrome “Load unpacked”

**Requirements:** Google Chrome 120+, Node.js 22.12+ (to build), Python 3.11+, and FFmpeg on your PATH. Only Chrome, Python, yt-dlp, and FFmpeg are needed after the extension is built. Keep this repository in the same folder after registering the helper.

1. **Build the extension** from the repository root:

   ```bash
   npm --prefix extension ci
   npm --prefix extension run build
   ```

2. Open **`chrome://extensions`** → enable **Developer mode** → **Load unpacked** → choose **`extension/dist`** (not `extension` or the repo root). Pin Framekeeper if desired. Copy the **32-character extension ID** shown on its card. The ID is needed so only your extension can start the local helper.

3. **Install FFmpeg** (examples):

   | OS | Command |
   | --- | --- |
   | macOS (Homebrew) | `brew install ffmpeg` |
   | Windows (PowerShell/winget) | `winget install Gyan.FFmpeg` |
   | Debian / Ubuntu | `sudo apt install ffmpeg` |

   Check `ffmpeg -version` in a **new terminal**. On Windows restart Chrome after adding FFmpeg to PATH. macOS Homebrew paths are added by the generated helper launcher. If your OS/package manager differs, install a build from the official FFmpeg site and put it on PATH.

4. **Install and register the helper.** It starts **automatically when the extension needs it**; do not run a web server or leave a terminal open.

   **macOS / Linux** (run from the repo root; replace the ID):

   ```bash
   python3 -m venv helper/.venv
   helper/.venv/bin/python -m pip install --upgrade pip
   helper/.venv/bin/python -m pip install --upgrade -r helper/requirements.txt
   helper/.venv/bin/python -m helper.install --extension-id YOUR_EXTENSION_ID
   ```

   **Windows PowerShell** (run from the repo root; replace the ID):

   ```powershell
   py -3 -m venv helper\.venv
   .\helper\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\helper\.venv\Scripts\python.exe -m pip install --upgrade -r helper\requirements.txt
   .\helper\.venv\Scripts\python.exe -m helper.install --extension-id YOUR_EXTENSION_ID
   ```

   The installer registers a **per-user native messaging host** for that exact extension ID (a manifest under your Chrome profile on macOS/Linux, or a per-user registry entry on Windows). It generates a launcher referencing this repo and the venv; no administrator privileges are needed for helper registration. For Chromium, add `--browser chromium` to the installer command.

5. **Restart Chrome** and open the popup. The green **LOCAL / READY** badge means the helper was found; Settings also displays the installed yt-dlp version and FFmpeg status. Open a single post/video page, choose quality, and select **Save video locally**. Files land in **`~/Downloads/Framekeeper/TikTok`**, **`Instagram`**, or **`Facebook`** (Windows: your user Downloads folder) unless configured otherwise. Chrome's *Downloads* list does not track files written by the helper; use **Open Downloads** or **Copy file path** in the popup.

### Optional: a different output folder

Re-run the installer with `--output-dir` and an absolute path (or `~` on macOS/Linux), then restart Chrome:

```bash
helper/.venv/bin/python -m helper.install --extension-id YOUR_EXTENSION_ID --output-dir "$HOME/Videos/Framekeeper"
```

The selected directory is stored in `~/.framekeeper/config.json`, **outside the extension and Git**. The Settings page shows the active folder. On Windows use the venv Python path from step 4 and a Windows path for `--output-dir`.

## How it is built

```text
extension/
  manifest.json             MV3 permissions, popup, isolated content script, worker
  src/App.jsx               React popup and interaction state
  src/components/           Preview, quality, progress, history, settings
  src/content/page.js       URL/DOM metadata for tab and right-click target
  src/background/worker.js  Native bridge, jobs, notifications, history
  src/lib/platform.js       Strict supported URL detection
  scripts/build-workers.mjs Vite popup + bundled classic SW/content scripts
  dist/                     Generated Load-unpacked directory (gitignored)
helper/
  downloader.py             yt-dlp API: metadata, format selection, progress, FFmpeg
  native_host.py            Length-prefixed native messaging, cancellation
  install.py                Per-user host registration for Chrome/Chromium
  config.py                 Local output-directory preference
  tests/                   Validation, native protocol, real offline media pipeline
```

**Flow:** popup / right-click → MV3 background worker → Chrome **native messaging** → on-demand Python helper → `yt_dlp.YoutubeDL` → FFmpeg if needed → local file. Progress travels back over the native port; the worker stores it and the last 50 history items in Chrome's **local** storage, so the UI can reopen while the download runs. Chrome keeps the service worker alive during an active native port. The content script reads only a little page metadata for the preview and right-click discovery; **yt-dlp, not page scraping, resolves the actual video**. No browser cookies are requested by the extension. If selected in Settings, the helper asks yt-dlp to read cookies from the browser *on this machine*, without copying them into extension storage.

The helper accepts only individual supported-site URLs, approved quality/cookie modes, and plain filename text. The host manifest allows only the exact extension ID. No HTTP service listens on localhost or the network. The popup may load a thumbnail from the platform's CDN; other network requests are made by yt-dlp to the platform/CDN.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| **Local helper not found** | Make sure you loaded `extension/dist`, copied its current ID into `helper.install`, kept the repo in place, and restarted Chrome. If you move/rebuild into a different unpacked path, check the ID and re-run the installer. Inspect errors at `chrome://extensions` → Framekeeper → service worker. |
| **FFmpeg missing** | Install FFmpeg, check `ffmpeg -version` in a new terminal, restart Chrome, and click Settings → refresh. On Windows, Chrome must see the updated PATH. |
| **No video info / 403 / login required** | Confirm the individual post plays in your browser. Try **Settings → Browser cookies → Chrome** (or the browser you use). Browser encryption/profile locks sometimes prevent cookie reading; Firefox may work better. Login does not guarantee access. |
| **Requested format not available** | Select **Best**. 720p/1080p are strict upper limits; yt-dlp cannot create a resolution the site doesn't serve. |
| **Extractor cannot parse / empty media response** | Update the engine and its extras: `helper/.venv/bin/python -m pip install --upgrade -r helper/requirements.txt` (Windows: use `helper\.venv\Scripts\python.exe`), reopen the popup, and retry. For fixes not yet in stable, upstream also documents `pip install -U --pre "yt-dlp[default,curl-cffi]"` (a pre-release). Platforms change; check the upstream issue tracker. |
| **Preview thumbnail missing** | Some CDNs restrict hotlinking. The title/thumbnail are optional; try the download anyway. |
| **Interrupted or canceled download** | Closing the popup is safe; **closing Chrome is not**. Aborting during extraction may take a few seconds. yt-dlp may leave resumable `.part` files in the output folder; delete those manually if unwanted. |
| **Photo/carousel/profile** | This prototype targets an individual video, not an entire feed or photo gallery. A mixed Instagram carousel processes only the first entry. |

### Verify / develop

```bash
npm --prefix extension run test
npm --prefix extension run build
helper/.venv/bin/python -m unittest discover -s helper/tests -v
helper/.venv/bin/python -m helper   # prints version, FFmpeg check and output folder
```

The Python integration test serves its own tiny media fixture to **real yt-dlp and FFmpeg**; no public social-media account or test download is required. It skips the media-conversion test if FFmpeg isn't installed. `npm --prefix extension run dev` shows a **labeled UI-only preview**; downloads work from the *Load unpacked* build, not the Vite preview.

This repository also contains an unrelated pre-existing Lottie Studio app at the root (`npm install && npm run dev`). The extension and helper are self-contained; that app has not been replaced.
