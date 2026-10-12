#!/usr/bin/env python3
"""One-time reset of previous automatic editorial selections; manual panel is authoritative."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = ROOT / "data" / "reset-editorial-selections.json"
STAMP = datetime.now(timezone.utc).isoformat(timespec="seconds")

def read(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")

def main():
    marker = read(MARKER, {"pending": False})
    if marker.get("pending") is not True:
        print("Editorial selection reset already completed; no changes.")
        return

    editorial_path = ROOT / "data" / "editorial.json"
    editorial = read(editorial_path, {"items": {}})
    if not isinstance(editorial, dict) or not isinstance(editorial.get("items"), dict):
        raise RuntimeError("data/editorial.json has an unexpected structure; refusing to reset.")
    selection_fields = {
        "important", "manual_important", "slider", "manual_slider",
        "auto_important", "auto_slider", "ai_important_topics", "ai_slider_topics",
        "important_topics", "slider_topics", "article_url", "published"
    }
    cleared = 0
    for item in editorial["items"].values():
        if not isinstance(item, dict):
            continue
        had_selection = any(k in item for k in selection_fields)
        for key in selection_fields:
            item.pop(key, None)
        if had_selection:
            cleared += 1
    editorial["updated"] = STAMP
    write(editorial_path, editorial)

    manual_path = ROOT / "data" / "manual-important-selection.json"
    manual = read(manual_path, {})
    manual.update({"window_start": STAMP, "window_end": STAMP, "news_ids": [],
                   "source": "manual-only", "reason": "Automatic AI/editorial selection disabled; only editorial-panel selections are allowed."})
    write(manual_path, manual)

    important_path = ROOT / "data" / "public" / "important-posts.json"
    important = read(important_path, {})
    important.update({"version": 3, "updated": STAMP, "windowHours": 2,
                      "batchSize": 4, "batchCount": 4, "batches": [], "items": []})
    write(important_path, important)

    featured_path = ROOT / "data" / "public" / "featured.json"
    featured = read(featured_path, {})
    featured["generated"] = STAMP
    featured["promotionSelection"] = {"source": "manual-only", "newsIds": []}
    featured["promotionWindow"] = ""
    topics = featured.get("topics", {})
    if isinstance(topics, dict):
        for section in topics.values():
            if isinstance(section, dict):
                section["important"] = []
                section["featured"] = []
    write(featured_path, featured)

    ai_path = ROOT / "data" / "news-ai.json"
    ai = read(ai_path, {})
    def clear_ai_selections(value):
        if isinstance(value, dict):
            for key in ("important", "important_topics", "slider_topics", "auto_important",
                        "auto_slider", "ai_important_topics", "ai_slider_topics"):
                value.pop(key, None)
            for child in value.values():
                clear_ai_selections(child)
        elif isinstance(value, list):
            for child in value:
                clear_ai_selections(child)
    clear_ai_selections(ai)
    if isinstance(ai, dict):
        ai["editorial_selection_mode"] = "manual-only"
        ai["editorial_selection_reset_at"] = STAMP
    write(ai_path, ai)

    marker.update({"pending": False, "completed_at": STAMP, "cleared_entries": cleared})
    write(MARKER, marker)
    print(f"Cleared prior important/slider selection metadata from {cleared} editorial entries; automatic selection feeds emptied.")

if __name__ == "__main__":
    main()
