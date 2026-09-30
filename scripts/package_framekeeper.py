"""Package source + prebuilt MV3 extension for a no-Node installation.

Run from anywhere after: npm --prefix extension ci && npm --prefix extension run build
The generated archive is the user-facing install artifact, not a Python wheel.
"""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
EXTENSION = ROOT / "extension"
BUILT = EXTENSION / "dist"
EXCLUDED_DIRS = {"node_modules", ".venv", ".installed", "__pycache__", ".git", ".vite"}


def main() -> None:
    manifest = json.loads((EXTENSION / "manifest.json").read_text(encoding="utf-8"))
    built_manifest = BUILT / "manifest.json"
    if not built_manifest.is_file() or json.loads(built_manifest.read_text(encoding="utf-8")) != manifest:
        raise SystemExit("Build first: npm --prefix extension ci && npm --prefix extension run build")

    for essential in ("popup.html", "background.js", "content.js", "icons/icon128.png"):
        if not (BUILT / essential).is_file():
            raise SystemExit(f"Incomplete extension/dist: missing {essential}. Rebuild before packaging.")
    if not list((BUILT / "assets").glob("*.js")) or not list((BUILT / "assets").glob("*.css")):
        raise SystemExit("Missing compiled React/CSS assets. Rebuild before packaging.")

    version = manifest["version"]
    archive = ROOT / f"Framekeeper-v{version}.zip"
    files = [ROOT / name for name in ("README.md", "RESEARCH.md", "INSTALACIJA.md", "scripts/package_framekeeper.py")]
    for folder in ("extension", "helper"):
        files.extend(
            path for path in (ROOT / folder).rglob("*")
            if path.is_file() and not any(part in EXCLUDED_DIRS for part in path.relative_to(ROOT).parts)
            and path.suffix not in {".pyc", ".log"} and path.name != ".DS_Store"
        )

    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as package:
        for path in sorted(set(files)):
            package.write(path, arcname=Path("Framekeeper") / path.relative_to(ROOT))

    with ZipFile(archive) as package:
        broken = package.testzip()
        if broken:
            raise SystemExit(f"Invalid ZIP member: {broken}")
        print(f"Created {archive.name} ({archive.stat().st_size // 1024} KiB, {len(package.namelist())} files)")


if __name__ == "__main__":
    main()
