#!/usr/bin/env python3
import json, os, time, hashlib, random
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "data" / "news.json"
OUT = ROOT / "data" / "news-ai.json"

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
BATCH_SIZE = 12
MAX_ITEMS = 50
MAX_RETRIES = 5
POLICY_VERSION = 2
RETRY_DELAYS = [5, 15, 30, 60, 90]

def item_key(x):
    raw = x.get("id") or x.get("url") or x.get("title") or ""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

def call_gemini(prompt, key):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
    }, ensure_ascii=False).encode("utf-8")

    last = ""
    for attempt in range(MAX_RETRIES):
        req = Request(API, data=payload, headers={
            "x-goog-api-key": key, "Content-Type": "application/json"
        }, method="POST")
        try:
            with urlopen(req, timeout=120) as r:
                data = json.load(r)
            text = "".join(
                p.get("text", "")
                for c in data.get("candidates", [])
                for p in c.get("content", {}).get("parts", [])
            ).strip()
            if not text:
                raise RuntimeError(json.dumps(data, ensure_ascii=False))
            return json.loads(text)
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", "ignore")[:2000]
            except Exception:
                pass
            last = f"HTTP {e.code}: {body}"
            print(f"Gemini HTTP {e.code}: {body}")
            if e.code in (429, 500, 502, 503, 504):
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0, 4)
                print(f"Retry {attempt + 1}/{MAX_RETRIES} in {delay:.1f}s...")
                time.sleep(delay)
                continue
            raise RuntimeError(last)
        except (URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            print(f"Gemini temporary error: {last}")
            if attempt + 1 < MAX_RETRIES:
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0, 4)
                print(f"Retry {attempt + 1}/{MAX_RETRIES} in {delay:.1f}s...")
                time.sleep(delay)

    raise RuntimeError(last)

def save(ai):
    ai["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(ai, f, ensure_ascii=False, indent=2)

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
    if ai.get("policy_version") != POLICY_VERSION:
        print(f"Policy changed: {ai.get('policy_version', 0)} -> {POLICY_VERSION}. Re-analyzing all news.")
        ai = {"version": 1, "policy_version": POLICY_VERSION, "updated": "", "items": {}, "groups": {}}
    ai["policy_version"] = POLICY_VERSION
    ai.setdefault("updated", "")
    ai.setdefault("items", {})
    ai.setdefault("groups", {})

    new_items = [x for x in items if item_key(x) not in ai["items"]]
    new_items = new_items[:MAX_ITEMS]

    print(f"News total: {len(items)}")
    print(f"Already analyzed: {len(ai['items'])}")
    print(f"Selected for this run: {len(new_items)}")

    existing = [{
        "id": k,
        "title": v.get("title", ""),
        "summary": v.get("summary", ""),
        "group_id": v.get("group_id", "")
    } for k, v in ai["items"].items()][-300:]

    start = 0
    while start < len(new_items):
        batch = new_items[start:start + BATCH_SIZE]
        payload_items = [{
            "id": item_key(x),
            "title": x.get("title", ""),
            "summary": x.get("summary", "")[:700],
            "source": x.get("source", ""),
            "published": x.get("published", ""),
            "topics": x.get("topics", [])
        } for x in batch]

        prompt = """تو سردبیر ارشد Evren Nexus هستی.
خبرهای فارسی زیر را از نظر «اهمیت واقعی»، «قابل انتشار بودن» و «تکراری بودن رویداد» ارزیابی کن.

قواعد انتشار:
- اخبار واقعی جنگ و درگیری نظامی، عملیات، حمله، آتش‌بس و تحولات میدانی قابل انتشارند.
- خبرهایی که ارزش اصلی آنها فقط اظهارنظر، مصاحبه، تهدید، هشدار، پیش‌بینی یا وعده یک مقام نظامی است قابل انتشار نیستند و باید publishable=false شوند.
- صرف حضور نام یک مقام نظامی باعث حذف خبر نمی‌شود؛ معیار، ارزش خبری اصلی متن است.
- اخبار سیاسی را به‌طور کلی حذف نکن؛ تصمیم، استعفا، انتصاب یا قانون با اثر مهم اقتصادی/حکومتی قابل انتشار است.

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
{"items":[{"id":"...","importance":0,"important":false,"publishable":true,"exclude_reason":"","group_id":"g001","representative":true,"reason":"کوتاه"}],
"groups":[{"group_id":"g001","representative_id":"..."}]}

خبرهای جدید:
""" + json.dumps(payload_items, ensure_ascii=False) + """
خبرهای قبلاً تحلیل‌شده برای مقایسه:
""" + json.dumps(existing, ensure_ascii=False)

        print(f"Processing batch {start//BATCH_SIZE + 1}: {len(batch)} items")
        try:
            result = call_gemini(prompt, key)
        except RuntimeError as e:
            print(f"Batch failed after retries: {e}")
            print("Stopping cleanly. Successful batches are already saved.")
            save(ai)
            return

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
                "important": bool(row.get("important", score >= 11)) and bool(row.get("publishable", True)),
                "publishable": bool(row.get("publishable", True)),
                "exclude_reason": str(row.get("exclude_reason", ""))[:300],
                "group_id": str(row.get("group_id", "")),
                "representative": bool(row.get("representative", True)),
                "reason": str(row.get("reason", ""))[:300]
            }

        for g in result.get("groups", []):
            gid = str(g.get("group_id", ""))
            if gid:
                ai["groups"][gid] = {
                    "representative_id": str(g.get("representative_id", ""))
                }

        save(ai)
        print(f"Saved batch. AI database items: {len(ai['items'])}")

        existing = [{
            "id": k,
            "title": v.get("title", ""),
            "summary": v.get("summary", ""),
            "group_id": v.get("group_id", "")
        } for k, v in ai["items"].items()][-300:]

        start += len(batch)

    save(ai)
    print(f"Completed. AI database items: {len(ai['items'])}")

if __name__ == "__main__":
    main()
