#!/usr/bin/env python3
import json, os, time, hashlib
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "data" / "news.json"
OUT = ROOT / "data" / "news-ai.json"

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
BATCH_SIZE = 25
MAX_RETRIES = 3
RETRY_SECONDS = 8

def item_key(x):
    raw = x.get("id") or x.get("url") or x.get("title") or ""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

def call_gemini(prompt, key):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }, ensure_ascii=False).encode("utf-8")

    req = Request(API, data=payload, headers={
        "x-goog-api-key": key,
        "Content-Type": "application/json"
    }, method="POST")

    last = ""
    for attempt in range(MAX_RETRIES):
        try:
            with urlopen(req, timeout=90) as r:
                data = json.load(r)
            text = "".join(
                p.get("text", "")
                for c in data.get("candidates", [])
                for p in c.get("content", {}).get("parts", [])
            ).strip()
            if not text:
                raise RuntimeError(json.dumps(data, ensure_ascii=False))
            return json.loads(text)
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            if attempt + 1 < MAX_RETRIES:
                time.sleep(RETRY_SECONDS * (attempt + 1))
    raise RuntimeError(last)

def main():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise SystemExit("GEMINI_API_KEY is missing")

    with NEWS.open(encoding="utf-8") as f:
        news = json.load(f)
    items = news.get("items", [])

    if OUT.exists():
        try:
            with OUT.open(encoding="utf-8") as f:
                ai = json.load(f)
        except Exception:
            ai = {}
    else:
        ai = {}

    ai.setdefault("version", 1)
    ai.setdefault("updated", "")
    ai.setdefault("items", {})
    ai.setdefault("groups", {})

    new_items = [x for x in items if item_key(x) not in ai["items"]]
    print(f"News total: {len(items)}")
    print(f"Already analyzed: {len(ai['items'])}")
    print(f"New for AI: {len(new_items)}")

    # Existing titles are supplied as a compact reference so new stories can
    # be matched against the existing 300-item AI database without reprocessing.
    existing = []
    for k, v in ai["items"].items():
        existing.append({
            "id": k,
            "title": v.get("title", ""),
            "summary": v.get("summary", ""),
            "group_id": v.get("group_id", "")
        })
    existing = existing[-300:]

    for start in range(0, len(new_items), BATCH_SIZE):
        batch = new_items[start:start+BATCH_SIZE]
        payload_items = [{
            "id": item_key(x),
            "title": x.get("title", ""),
            "summary": x.get("summary", "")[:700],
            "source": x.get("source", ""),
            "published": x.get("published", ""),
            "topics": x.get("topics", [])
        } for x in batch]

        prompt = """تو سردبیر ارشد Evren Nexus هستی.
خبرهای فارسی زیر را از نظر «اهمیت واقعی» و «تکراری بودن رویداد» ارزیابی کن.

معیار اهمیت:
- 16 تا 20: رویداد بسیار مهم با اثر گسترده ملی/اقتصادی/بازاری یا تصمیم مهم دولت، بانک مرکزی، مجلس یا تغییر مهم در سیاست.
- 11 تا 15: خبر مهم با اثر قابل توجه بر بازار، اقتصاد، مسکن، بورس، ارز، خودرو، فناوری یا زندگی مردم.
- 6 تا 10: خبر قابل توجه اما محدودتر.
- 1 تا 5: خبر کم‌اهمیت، محلی، حاشیه‌ای، مصاحبه/اظهارنظر یا گزارش عادی.
- 0: بی‌اهمیت، سرگرمی/تصویر/تبلیغاتی یا خارج از ارزش خبری Evren Nexus.
صرف وجود کلمات «دلار»، «مسکن»، «بورس» و مانند آن دلیل اهمیت بالا نیست.
خبرهای تحلیلی و پیش‌بینی بدون تصمیم یا داده مهم امتیاز پایین‌تری بگیرند.

تکراری:
- اگر دو خبر درباره یک رویداد مشخص هستند، یک group_id یکسان بده.
- اگر خبر جدید ادامه/واکنش مستقیم همان رویداد است، فقط وقتی واقعاً همان رویداد محسوب می‌شود گروه مشترک بده.
- برای هر گروه، بهترین و کامل‌ترین خبر را representative=true کن.
- اگر رویداد مشابه نیست، group_id خالی و representative=true باشد.
- گروه‌بندی را نسبت به خبرهای قبلی هم انجام بده.

فقط JSON معتبر:
{
  "items":[
    {
      "id":"...",
      "importance":0,
      "important":false,
      "group_id":"g001",
      "representative":true,
      "reason":"کوتاه"
    }
  ],
  "groups":[
    {"group_id":"g001","representative_id":"..."}
  ]
}

خبرهای جدید:
""" + json.dumps(payload_items, ensure_ascii=False) + """

خبرهای قبلاً تحلیل‌شده برای مقایسه:
""" + json.dumps(existing, ensure_ascii=False) 

        print(f"Processing batch {start//BATCH_SIZE + 1}: {len(batch)} items")
        result = call_gemini(prompt, key)

        by_id = {x["id"]: x for x in payload_items}
        for row in result.get("items", []):
            rid = str(row.get("id", ""))
            if rid not in by_id:
                continue
            src = by_id[rid]
            score = max(0, min(20, int(row.get("importance", 0))))
            ai["items"][rid] = {
                "title": src["title"],
                "summary": src["summary"],
                "source": src["source"],
                "published": src["published"],
                "importance": score,
                "important": bool(row.get("important", score >= 11)),
                "group_id": str(row.get("group_id", "")),
                "representative": bool(row.get("representative", True)),
                "reason": str(row.get("reason", ""))[:300]
            }

        for g in result.get("groups", []):
            gid = str(g.get("group_id", ""))
            rep = str(g.get("representative_id", ""))
            if gid:
                ai["groups"][gid] = {"representative_id": rep}

        with OUT.open("w", encoding="utf-8") as f:
            json.dump(ai, f, ensure_ascii=False, indent=2)

        existing = [{
            "id": k,
            "title": v.get("title", ""),
            "summary": v.get("summary", ""),
            "group_id": v.get("group_id", "")
        } for k, v in ai["items"].items()][-300:]

    ai["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(ai, f, ensure_ascii=False, indent=2)

    print(f"Saved: {OUT}")
    print(f"AI database items: {len(ai['items'])}")

if __name__ == "__main__":
    main()
