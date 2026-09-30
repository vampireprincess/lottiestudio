"""User-local configuration; never stored in or committed to the extension."""

import json
import os
from pathlib import Path

APP_DIR = Path.home() / ".framekeeper"
CONFIG_FILE = APP_DIR / "config.json"


def output_directory() -> Path:
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if isinstance(data.get("output_dir"), str) and data["output_dir"].strip():
            return Path(data["output_dir"]).expanduser().resolve()
    except (OSError, ValueError, TypeError):
        pass
    return (Path.home() / "Downloads" / "Framekeeper").resolve()


def set_output_directory(directory: str) -> Path:
    folder = Path(directory).expanduser().resolve()
    folder.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Atomic write to keep settings intact after an interrupted install.
    temp = CONFIG_FILE.with_suffix(".tmp")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        json.dump({"output_dir": str(folder)}, stream)
    temp.replace(CONFIG_FILE)
    return folder
