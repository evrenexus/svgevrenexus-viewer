#!/usr/bin/env python3
import json, os, time, hashlib, random
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "data" / "news.json"
OUT = ROOT / "data" / "news-ai.json"
EDITORIAL = ROOT / "data" / "editorial.json"

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
BATCH_SIZE = 12
MAX_ITEMS = 60
MAX_RETRIES = 5
POLICY_VERSION = 3
RETRY_DELAYS = [5, 15, 30, 60, 90]

TOPICS = [
    "economy","markets","currency-gold","real-estate","technology",
    "ai","health","auto","science-life","sports","war"
]

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
            try: body = e.read().decode("utf-8", "ignore")[:2000]
            except Exception: pass
            last = f"HTTP {e.code}: {body}"
            print(last)
            if e.code not in (429,500,502,503,504): raise RuntimeError(last)
        except (URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            print("Gemini temporary error:", last)
        if attempt + 1 < MAX_RETRIES:
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0,4)
            print(f"Retry {attempt+1}/{MAX_RETRIES} in {delay:.1f}s...")
            time.sleep(delay)
    raise RuntimeError(last)

def save_ai(ai):
    ai["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    OUT.write_text(json.dumps(ai, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def load_json(path, default):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception: return default

def normalize_result(src, row):
    score = max(0, min(20, int(row.get("importance", 0) or 0)))
    scores = {}
    for t in TOPICS:
        try: scores[t] = max(0, min(20, int((row.get("topic_scores") or {}).get(t, 0) or 0)))
        except Exception: scores[t] = 0
    topics = [t for t in row.get("topics", []) if t in TOPICS]
    if not topics: topics = [t for t in src.get("topics", []) if t in TOPICS]
    if not topics and src.get("category") in TOPICS: topics = [src["category"]]
    important_topics = [t for t in topics if scores.get(t, score) >= 11]
    slider_topics = [t for t in topics if scores.get(t, score) >= 14]
    ticker_topics = [t for t in topics if scores.get(t, score) >= 11]
    publishable = bool(row.get("publishable", True))
    return {
        "title": src.get("title",""),
        "summary": src.get("summary",""),
        "source": src.get("source",""),
        "published": src.get("published",""),
        "topics": topics,
        "topic_scores": scores,
        "importance": score,
        "important": bool(important_topics) and publishable,
        "important_topics": important_topics if publishable else [],
        "slider_topics": slider_topics if publishable else [],
        "ticker_topics": ticker_topics if publishable else [],
        "publishable": publishable,
        "exclude_reason": str(row.get("exclude_reason",""))[:300],
        "group_id": str(row.get("group_id","")),
        "representative": bool(row.get("representative", True)),
        "reason": str(row.get("reason",""))[:300]
    }

def rebuild_groups(ai):
    groups = {}
    members = {}
    for k,v in ai["items"].items():
        gid = v.get("group_id","")
        if gid: members.setdefault(gid, []).append((k,v))
    for gid, rows in members.items():
        rows.sort(key=lambda kv: (
            max(kv[1].get("topic_scores",{}).values() or [0]),
            kv[1].get("importance",0),
            kv[1].get("published","")
        ), reverse=True)
        rep = rows[0][0]
        groups[gid] = {"representative_id": rep}
        for k,v in rows:
            v["representative"] = (k == rep)
    ai["groups"] = groups

def write_editorial(ai, old):
    old = old if isinstance(old,dict) else {}
    out = {"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "_schema": 1, "items": {}}
    # Preserve non-AI/manual fields, but AI owns importance/slider publication flags.
    for nid,e in (old.get("items",{}) if isinstance(old.get("items",{}),dict) else {}).items():
        if isinstance(e,dict):
            out["items"][nid] = dict(e)
    for nid,v in ai["items"].items():
        e = out["items"].setdefault(nid,{})
        e["important"] = bool(v.get("important_topics"))
        e["slider"] = bool(v.get("slider_topics"))
        e["published"] = bool(v.get("publishable") and v.get("representative",True))
        e["republish"] = e["published"]
        if v.get("topics"):
            e["ai_topics"] = v["topics"]
        if v.get("important_topics"):
            e["ai_important_topics"] = v["important_topics"]
        else:
            e.pop("ai_important_topics", None)
        if v.get("slider_topics"):
            e["ai_slider_topics"] = v["slider_topics"]
        else:
            e.pop("ai_slider_topics", None)
        e["ai_managed"] = True
        e["updated_at"] = out["updated"]
    EDITORIAL.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main():
    key = os.environ.get("GEMINI_API_KEY","").strip()
    if not key: raise SystemExit("GEMINI_API_KEY is missing")
    news = load_json(NEWS, {})
    items = news.get("items",[]) if isinstance(news,dict) else []
    ai = load_json(OUT, {})
    if ai.get("policy_version") != POLICY_VERSION:
        print(f"Policy changed: {ai.get('policy_version',0)} -> {POLICY_VERSION}; re-analyzing current news.")
        ai = {"version":1,"policy_version":POLICY_VERSION,"updated":"","items":{},"groups":{}}
    ai.setdefault("items",{}); ai["policy_version"] = POLICY_VERSION

    new_items = [x for x in items if item_key(x) not in ai["items"]][:MAX_ITEMS]
    print(f"News total: {len(items)} | Already analyzed: {len(ai['items'])} | This run: {len(new_items)}")

    existing = [{
        "id": k, "title": v.get("title",""), "summary": v.get("summary",""),
        "group_id": v.get("group_id",""), "topics": v.get("topics",[])
    } for k,v in list(ai["items"].items())[-400:]]

    for start in range(0,len(new_items),BATCH_SIZE):
        batch = new_items[start:start+BATCH_SIZE]
        payload = [{
            "id": item_key(x), "title": x.get("title",""),
            "summary": x.get("summary","")[:900], "source": x.get("source",""),
            "published": x.get("published",""), "topics": x.get("topics",[])
        } for x in batch]
        prompt = """تو سردبیر هوشمند ارشد Evren Nexus هستی.
برای هر خبر باید هم «اهمیت کلی» و هم اهمیت آن در هر دسته را تعیین کنی.
دسته‌های مجاز: """ + ",".join(TOPICS) + """.

قواعد:
1) خبرهای چند منبع درباره یک رویداد واقعی را با group_id یکسان گروه‌بندی کن و بهترین/کامل‌ترین گزارش را representative=true کن.
2) صرف اظهارنظر، مصاحبه، پیش‌بینی، هشدار یا وعده بدون تصمیم/رویداد واقعی معمولاً مهم نیست.
3) تصمیم دولت، مجلس، بانک مرکزی، تغییر قانون، جنگ/حمله واقعی، اختلال بزرگ، آمار رسمی مهم و رویداد مؤثر بر بازار می‌تواند اهمیت بالا داشته باشد.
4) اهمیت را برای هر دسته مستقل بسنج؛ یک خبر ممکن است در اقتصاد مهم باشد ولی در فناوری مهم نباشد.
5) امتیاز 0 تا 20: 16-20 بسیار مهم، 11-15 مهم، 6-10 قابل توجه، 1-5 کم‌اهمیت، 0 بی‌اهمیت.
6) فقط دسته‌هایی را در topics قرار بده که واقعاً به محتوای خبر مربوط‌اند.
7) publishable=false برای محتوای تبلیغاتی، حاشیه‌ای یا فاقد ارزش خبری واقعی.
8) اطلاعات موجود را جعل نکن.

JSON فقط:
{"items":[{"id":"...","topics":["economy"],"importance":0,"topic_scores":{"economy":0,"markets":0,"currency-gold":0,"real-estate":0,"technology":0,"ai":0,"health":0,"auto":0,"science-life":0,"sports":0,"war":0},"publishable":true,"group_id":"","representative":true,"reason":"کوتاه"}],
"groups":[{"group_id":"...","representative_id":"..."}]}

خبرهای جدید:
""" + json.dumps(payload,ensure_ascii=False) + """
خبرهای قبلاً تحلیل‌شده برای مقایسه رویدادهای تکراری:
""" + json.dumps(existing,ensure_ascii=False)
        try:
            result = call_gemini(prompt,key)
        except RuntimeError as e:
            print("Batch failed; keeping successful batches:",e)
            break
        by_id = {x["id"]:x for x in payload}
        for row in result.get("items",[]):
            rid=str(row.get("id",""))
            if rid in by_id: ai["items"][rid]=normalize_result(by_id[rid],row)
        for g in result.get("groups",[]):
            gid=str(g.get("group_id",""))
            if gid: ai["groups"][gid]={"representative_id":str(g.get("representative_id",""))}
        save_ai(ai)

    rebuild_groups(ai)
    save_ai(ai)
    old_editorial=load_json(EDITORIAL,{"items":{}})
    write_editorial(ai,old_editorial)
    print(f"AI complete: {len(ai['items'])} items | editorial written: {len(ai['items'])}")

if __name__=="__main__":
    main()
