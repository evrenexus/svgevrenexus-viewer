#!/usr/bin/env python3
"""Maintain four rolling two-hour batches of important published news."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "news.json"
OUTPUT = ROOT / "data" / "public" / "important-posts.json"
BATCH_SIZE = 4
BATCH_COUNT = 4
TOTAL = BATCH_SIZE * BATCH_COUNT


def parse_date(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0


def normalized_title(value):
    return " ".join(str(value or "").lower().replace("\u200c", " ").split())


def clean_item(item):
    return {
        "id": str(item.get("id") or item.get("url") or ""),
        "title": str(item.get("title") or "").strip(),
        "summary": str(item.get("summary") or "").strip(),
        "url": str(item.get("url") or "").strip(),
        "image": str(item.get("image") or "").strip(),
        "source": str(item.get("source") or "").strip(),
        "published": str(item.get("published") or ""),
        "topics": item.get("topics") if isinstance(item.get("topics"), list) else [],
        "importance_score": int(item.get("importance_score") or 0),
    }


def eligible_items():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    source_items = data.get("items", [])
    result = []
    seen_ids = set()
    seen_titles = set()
    for raw in source_items:
        if raw.get("important") is not True:
            continue
        item = clean_item(raw)
        if not item["id"] or not item["title"] or not item["url"] or not item["topics"]:
            continue
        title_key = normalized_title(item["title"])
        if item["id"] in seen_ids or title_key in seen_titles:
            continue
        seen_ids.add(item["id"])
        seen_titles.add(title_key)
        result.append(item)
    result.sort(key=lambda x: (parse_date(x["published"]), x["importance_score"]), reverse=True)
    return result


def main():
    candidates = eligible_items()
    if len(candidates) < BATCH_SIZE:
        print(f"Only {len(candidates)} eligible important posts; keeping the existing selection.")
        return

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    previous = {"batches": []}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except Exception:
            previous = {"batches": []}

    batches = previous.get("batches", [])
    if not isinstance(batches, list):
        batches = []

    if not batches:
        seed = candidates[:TOTAL]
        batches = []
        for offset in range(0, len(seed), BATCH_SIZE):
            group = seed[offset:offset + BATCH_SIZE]
            if len(group) == BATCH_SIZE:
                batches.append({
                    "selectedAt": now,
                    "items": group,
                })
        if not batches:
            print("Not enough eligible posts to initialize four batches.")
            return
    else:
        history_ids = {
            str(item.get("id"))
            for batch in batches[:BATCH_COUNT]
            for item in batch.get("items", [])
        }
        fresh = [item for item in candidates if item["id"] not in history_ids]
        if len(fresh) < BATCH_SIZE:
            print(f"Only {len(fresh)} new important posts since the previous selection; keeping the existing four batches.")
            return
        batches = [{
            "selectedAt": now,
            "items": fresh[:BATCH_SIZE],
        }] + batches[:BATCH_COUNT - 1]

    # Keep newest batch first and build a unique 16-item sidebar list.
    items = []
    seen = set()
    for batch in batches:
        for item in batch.get("items", []):
            item_id = str(item.get("id") or "")
            if item_id and item_id not in seen:
                seen.add(item_id)
                items.append(item)
            if len(items) >= TOTAL:
                break
        if len(items) >= TOTAL:
            break

    # If an older batch contained repeats, top up from eligible news not already shown.
    for item in candidates:
        if len(items) >= TOTAL:
            break
        if item["id"] not in seen:
            seen.add(item["id"])
            items.append(item)

    payload = {
        "version": 1,
        "updated": now,
        "batchSize": BATCH_SIZE,
        "batchCount": BATCH_COUNT,
        "batches": batches[:BATCH_COUNT],
        "items": items[:TOTAL],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['items'])} sidebar items in {len(payload['batches'])} two-hour batches.")


if __name__ == "__main__":
    main()
