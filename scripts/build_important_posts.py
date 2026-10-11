#!/usr/bin/env python3
"""Select a fresh, deduplicated batch of important news from the last two hours."""
import json
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "news.json"
OUTPUT = ROOT / "data" / "public" / "important-posts.json"
WINDOW_HOURS = 2
BATCH_SIZE = 4
BATCH_COUNT = 4
TOTAL = BATCH_SIZE * BATCH_COUNT
# Canonical topics that map to one of the seven categories in Evrenexus-header.js.
ALLOWED_TOPICS = {"economy", "markets", "crypto", "currency-gold", "real-estate",
                  "technology", "ai", "health", "auto", "science-life"}


def parse_date(value):
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except Exception:
        return None


def norm(value):
    value = str(value or "").lower()
    value = value.replace("\u200c", " ").replace("\u200f", " ").replace("\u200e", " ")
    value = re.sub(r"[\W_]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


def title_tokens(value):
    return set(norm(value).split())


def near_duplicate(a, b):
    if a.get("url") == b.get("url") or a.get("id") == b.get("id"):
        return True
    ta, tb = norm(a.get("title")), norm(b.get("title"))
    if not ta or not tb:
        return False
    if ta == tb or SequenceMatcher(None, ta, tb).ratio() >= 0.82:
        return True
    aa, bb = title_tokens(ta), title_tokens(tb)
    similarity = len(aa & bb) / len(aa | bb) if aa and bb else 0.0
    # Headlines from the same publisher often differ by only a few words.
    if str(a.get("source") or "").strip() == str(b.get("source") or "").strip() and similarity >= 0.40:
        return True
    return similarity >= 0.72


def clean_item(raw):
    try:
        score = int(raw.get("importance_score") or 0)
    except (TypeError, ValueError):
        score = 0
    return {
        "id": str(raw.get("id") or raw.get("url") or "").strip(),
        "title": str(raw.get("title") or "").strip(),
        "summary": str(raw.get("summary") or "").strip(),
        "url": str(raw.get("url") or "").strip(),
        "image": str(raw.get("image") or "").strip(),
        "source": str(raw.get("source") or "").strip(),
        "published": str(raw.get("published") or ""),
        "topics": [t for t in raw.get("topics", []) if isinstance(t, str) and t in ALLOWED_TOPICS]
                  if isinstance(raw.get("topics"), list) else [],
        "importance_score": score,
        "_timestamp": parse_date(raw.get("published")),
    }


def eligible_items(data, now):
    cutoff = now - timedelta(hours=WINDOW_HOURS)
    candidates = []
    for raw in data.get("items", []):
        if raw.get("important") is not True:
            continue
        item = clean_item(raw)
        dt = item.pop("_timestamp")
        if not item["id"] or not item["title"] or not item["url"] or not item["topics"] or not dt:
            continue
        if dt < cutoff or dt > now + timedelta(minutes=5):
            continue
        item["_published_dt"] = dt
        candidates.append(item)
    candidates.sort(key=lambda x: (x["importance_score"], x["_published_dt"]), reverse=True)

    # Deduplicate copies/syndicated stories before ranking the shortlist.
    unique = []
    for item in candidates:
        if any(near_duplicate(item, prior) for prior in unique):
            continue
        unique.append(item)
    return unique


def choose_batch(candidates, count=BATCH_SIZE):
    """Rank fresh items while strongly preferring distinct sources and topics."""
    selected = []
    remaining = list(candidates)
    source_counts, topic_counts = Counter(), Counter()
    passes = [
        (1, 1),       # try one source and one topic each
        (1, 2),       # allow a second story in a topic
        (1, None),    # still prefer distinct sources
        (2, 2),
        (2, None),
        (None, None),
    ]
    while remaining and len(selected) < count:
        best = None
        for source_cap, topic_cap in passes:
            eligible = []
            for item in remaining:
                source = item.get("source") or "نامشخص"
                topics = item.get("topics") or ["unknown"]
                topic = topics[0]
                if source_cap is not None and source_counts[source] >= source_cap:
                    continue
                if topic_cap is not None and topic_counts[topic] >= topic_cap:
                    continue
                eligible.append(item)
            if eligible:
                # candidates are already ordered by importance then publication time.
                best = eligible[0]
                break
        if best is None:
            break
        selected.append(best)
        remaining.remove(best)
        source_counts[best.get("source") or "نامشخص"] += 1
        topic_counts[(best.get("topics") or ["unknown"])[0]] += 1
    for item in selected:
        item.pop("_published_dt", None)
    return selected

def main():
    now = datetime.now(timezone.utc)
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    candidates = eligible_items(data, now)

    previous = {"batches": []}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except Exception:
            pass
    batches = previous.get("batches", [])
    if not isinstance(batches, list):
        batches = []

    # The previous initializer stamped four batches with the same selectedAt.
    # Those were not four real two-hour cycles, so discard that artificial history.
    stamps = [str(b.get("selectedAt") or "") for b in batches if isinstance(b, dict)]
    if len(stamps) > 1 and len(set(stamps)) == 1:
        batches = []

    now_text = now.isoformat(timespec="seconds")
    previous_top_ids = {
        str(item.get("id"))
        for batch in batches
        if isinstance(batch, dict)
        for item in batch.get("items", [])
    }
    fresh = [item for item in candidates if item["id"] not in previous_top_ids]
    group = choose_batch(fresh)
    if group:
        batches = [{"selectedAt": now_text, "windowHours": WINDOW_HOURS, "items": group}] + batches[:BATCH_COUNT - 1]
    elif not batches:
        # Never backfill with stale stories; publish an empty current batch instead.
        batches = [{"selectedAt": now_text, "windowHours": WINDOW_HOURS, "items": []}]

    items, seen = [], set()
    for batch in batches[:BATCH_COUNT]:
        for item in batch.get("items", []):
            key = str(item.get("id") or "")
            if key and key not in seen:
                seen.add(key)
                items.append(item)
            if len(items) >= TOTAL:
                break
        if len(items) >= TOTAL:
            break

    payload = {"version": 2, "updated": now_text, "windowHours": WINDOW_HOURS,
               "batchSize": BATCH_SIZE, "batchCount": BATCH_COUNT,
               "batches": batches[:BATCH_COUNT], "items": items[:TOTAL]}
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Selected {len(group)} posts published in the last {WINDOW_HOURS} hours; sidebar total: {len(payload['items'])}.")


if __name__ == "__main__":
    main()
