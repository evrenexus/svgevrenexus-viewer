#!/usr/bin/env python3
"""Copy public website files to the configured document root without deleting anything."""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {
    ".git", ".github", "hosting", "scripts", "node_modules",
    ".venv", "venv", "__pycache__", "workers",
}
EXCLUDED_FILES = {".gitignore", ".nvmrc", "package.json", "package-lock.json"}
EXCLUDED_PREFIXES = (".env",)
EXCLUDED_SUFFIXES = (".pyc",)

def excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return True
    if path.name in EXCLUDED_FILES:
        return True
    if path.name.startswith(EXCLUDED_PREFIXES):
        return True
    if path.suffix in EXCLUDED_SUFFIXES:
        return True
    return False

def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: deploy_static.py /absolute/path/to/document-root", file=sys.stderr)
        return 2
    target = Path(sys.argv[1]).expanduser().resolve()
    if not target.is_dir():
        print(f"Document root does not exist: {target}", file=sys.stderr)
        return 2
    if target == ROOT or ROOT in target.parents:
        print("Refusing to deploy into the source repository or one of its subdirectories.", file=sys.stderr)
        return 2

    copied = 0
    for source in ROOT.iterdir():
        if excluded(source):
            continue
        destination = target / source.name
        if source.is_dir():
            shutil.copytree(
                source, destination, dirs_exist_ok=True,
                ignore=lambda directory, names: [
                    name for name in names
                    if name in EXCLUDED_DIRS
                    or name.startswith(EXCLUDED_PREFIXES)
                    or name.endswith(EXCLUDED_SUFFIXES)
                ],
            )
        elif source.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        else:
            continue
        copied += 1

    print(f"Copied/updated {copied} top-level website entries into {target}.")
    print("Existing destination-only files were intentionally left untouched.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
