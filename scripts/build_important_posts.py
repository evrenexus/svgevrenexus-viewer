#!/usr/bin/env python3
"""Maintain four rolling two-hour batches of important published news."""
import json
from collections import Counter
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
    result, seen_ids, seen_titles = [], set(), set()
    for raw in data.get("items", []):
        if raw.get("important") is not True:
            continue
        item = clean_item(raw)
        title_key = normalized_title(item["title"])
        if not item["id"] or not item["title"] or not item["url"] or not item["topics"]:
            continue
        if item["id"] in seen_ids or title_key in seen_titles:
            continue
        seen_ids.add(item["id"])
        seen_titles.add(title_key)
        result.append(item)
    result.sort(key=lambda x: (parse_date(x["published"]), x["importance_score"]), reverse=True)
    return result


def choose_batch(candidates, excluded_ids, source_counts):
    """Prefer fresh stories and diversify sources/topics, relaxing caps only if needed."""
    selected = []
    selected_ids = set()
    selected_sources = Counter()
    selected_topics = Counter()
    passes = [
        (1, 2, 3),   # one source per batch when possible; max three per source in the 16
        (2, 3, 4),
        (3, 4, 5),
        (None, None, None),
    ]
    for source_cap, topic_cap, rolling_source_cap in passes:
        for item in candidates:
            if len(selected) >= BATCH_SIZE:
                break
            if item["id"] in excluded_ids or item["id"] in selected_ids:
                continue
            source = item["source"] or "نامشخص"
            topic = (item["topics"] or ["unknown"])[0]
            if source_cap is not None and selected_sources[source] >= source_cap:
                continue
            if topic_cap is not None and selected_topics[topic] >= topic_cap:
                continue
            if rolling_source_cap is not None and source_counts[source] + selected_sources[source] >= rolling_source_cap:
                continue
            selected.append(item)
            selected_ids.add(item["id"])
            selected_sources[source] += 1
            selected_topics[topic] += 1
        if len(selected) >= BATCH_SIZE:
            return selected
    return selected


def source_counts_for(batches):
    return Counter(
        str(item.get("source") or "نامشخص")
        for batch in batches
        for item in batch.get("items", [])
    )


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
        batches = []
        excluded_ids = set()
        rolling_sources = Counter()
        for _ in range(BATCH_COUNT):
            group = choose_batch(candidates, excluded_ids, rolling_sources)
            if len(group) != BATCH_SIZE:
                print("Not enough unique important posts to initialize four full batches.")
                return
            batches.append({"selectedAt": now, "items": group})
            excluded_ids.update(item["id"] for item in group)
            rolling_sources.update(item["source"] or "نامشخص" for item in group)
    else:
        batches = batches[:BATCH_COUNT]
        history_ids = {
            str(item.get("id"))
            for batch in batches
            for item in batch.get("items", [])
        }
        fresh = [item for item in candidates if item["id"] not in history_ids]
        rolling_sources = source_counts_for(batches)
        group = choose_batch(fresh, set(), rolling_sources)
        if len(group) < BATCH_SIZE:
            print(f"Only {len(group)} new important posts available; keeping the existing four batches.")
            return
        batches = [{"selectedAt": now, "items": group}] + batches[:BATCH_COUNT - 1]

    items, seen = [], set()
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
