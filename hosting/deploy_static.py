#!/usr/bin/env python3
"""Deploy only confirmed public website assets; never copy source data or scripts."""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Public root-level files used by the site's HTML pages.
PUBLIC_SUFFIXES = {".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg",
                   ".webp", ".gif", ".ico", ".xml", ".txt", ".webmanifest",
                   ".woff", ".woff2", ".ttf", ".pdf"}
PUBLIC_DIRS = ("articles", "assets")
PUBLIC_DATA_FILES = {
    "featured.json", "important-posts.json", "image-health.json",
    "latest-news.json", "meta.json", "news.json", "editorial.json",
    "policy-terms.json",
}
MARKET_DATA_FILES = {"lbank.json", "lbank-futures.json", "nobitex.json", "tgju.json"}

def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)

def copy_tree(source: Path, destination: Path) -> int:
    copied = 0
    for item in source.rglob("*"):
        if not item.is_file() or item.is_symlink():
            continue
        rel = item.relative_to(source)
        if any(part in {".git", "__pycache__", "node_modules", ".venv", "venv"} for part in rel.parts):
            continue
        copy_file(item, destination / rel)
        copied += 1
    return copied

def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: deploy_static.py /absolute/path/to/document-root", file=sys.stderr)
        return 2
    target = Path(sys.argv[1]).expanduser().resolve()
    if not target.is_dir():
        print(f"Document root does not exist: {target}", file=sys.stderr)
        return 2
    if target == ROOT or ROOT in target.parents or target in ROOT.parents:
        print("Refusing unsafe deployment path (source repository or its parent).", file=sys.stderr)
        return 2

    copied_files = 0
    for item in ROOT.iterdir():
        if item.is_file() and item.suffix.lower() in PUBLIC_SUFFIXES and not item.name.startswith("."):
            copy_file(item, target / item.name)
            copied_files += 1

    for dirname in PUBLIC_DIRS:
        source = ROOT / dirname
        if source.is_dir():
            copied_files += copy_tree(source, target / dirname)

    public_data = ROOT / "data" / "public"
    if public_data.is_dir():
        for name in PUBLIC_DATA_FILES:
            source = public_data / name
            if source.is_file():
                copy_file(source, target / "data" / "public" / name)
                copied_files += 1

    market_data = ROOT / "market-data"
    for name in MARKET_DATA_FILES:
        source = market_data / name
        if source.is_file():
            copy_file(source, target / "market-data" / name)
            copied_files += 1

    car_prices = ROOT / "car-data" / "car-prices.json"
    if car_prices.is_file():
        copy_file(car_prices, target / "car-data" / car_prices.name)
        copied_files += 1

    print(f"Copied/updated {copied_files} confirmed public files into {target}.")
    print("No source scripts, private configuration, raw news database, or repository metadata were deployed.")
    print("Destination-only files were left untouched; nothing was deleted.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
