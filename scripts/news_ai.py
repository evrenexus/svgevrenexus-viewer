#!/usr/bin/env python3
import json, os, time, hashlib, random, re
from difflib import SequenceMatcher
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "data" / "news.json"
OUT = ROOT / "data" / "news-ai.json"
EDITORIAL = ROOT / "data" / "editorial.json"
ARTICLES = ROOT / "data" / "articles.json"

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
BATCH_SIZE = 40
CANDIDATE_LIMIT = 40
RECENT_HOURS = 4
DAILY_REQUEST_BUDGET = 12
ARTICLE_LIMIT = 5
MIN_ANALYSIS_INTERVAL_SECONDS = 30 * 60
MAX_RETRIES = 3
MAX_CONSECUTIVE_BATCH_FAILURES = 2
POLICY_VERSION = 5
RETRY_DELAYS = [8, 20, 45]
QUOTA_DEFAULT_COOLDOWN_SECONDS = 6 * 60 * 60

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
            candidate = (data.get("candidates") or [{}])[0]
            finish_reason = candidate.get("finishReason", "")
            if finish_reason:
                print(f"Gemini finishReason: {finish_reason}")
            text = "".join(
                p.get("text", "")
                for c in data.get("candidates", [])
                for p in c.get("content", {}).get("parts", [])
            ).strip()
            if not text:
                preview = json.dumps(data, ensure_ascii=False)[:500]
                raise RuntimeError(f"Empty Gemini response; response={preview}")
            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                print(f"Gemini JSON parse error: {e}; response preview: {text[:500]}")
                raise RuntimeError(f"Invalid Gemini JSON: {e}")
        except HTTPError as e:
            body = ""
            try: body = e.read().decode("utf-8", "ignore")[:2000]
            except Exception: pass
            last = f"HTTP {e.code}: {body}"
            print(last)
            if e.code == 429:
                # Quota/rate-limit errors must never be retried: a retry can only
                # waste time and may keep the workflow in a failed state.
                raise RuntimeError("GEMINI_QUOTA_EXHAUSTED " + last)
            if e.code not in (500,502,503,504):
                raise RuntimeError(last)
        except (URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            print("Gemini temporary error:", last)
        if attempt + 1 < MAX_RETRIES:
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0,4)
            print(f"Retry {attempt+1}/{MAX_RETRIES} in {delay:.1f}s...")
            time.sleep(delay)
    raise RuntimeError(last)


STOPWORDS = {
    "از","به","در","برای","با","که","این","آن","را","و","یا","یک","های","است","شد",
    "خواهد","کرد","کرده","می","شود","درباره","روی","بر","تا","اما","اگر","the","a","an",
    "of","to","in","for","with","and","or","is","was","on","at","by","from"
}

STRONG_KEYWORDS = {
    "جنگ":4,"حمله":4,"موشک":4,"تحریم":3,"بانک مرکزی":4,"دلار":3,"ارز":3,
    "طلا":3,"تورم":3,"نرخ بهره":4,"بودجه":3,"زلزله":4,"آتش سوزی":3,
    "انفجار":4,"فوت":2,"درگذشت":2,"هوش مصنوعی":3,"ai":2,"اپل":2,
    "گوگل":2,"مایکروسافت":2,"خودرو":2,"مسکن":3,"ملک":3,"نفت":3,"بورس":3,
    "شاخص کل":4,"عرضه اولیه":4,"ورشکستگی":4,"کاهش قیمت":2,"افزایش قیمت":2,
    "قطع برق":3,"خاموشی":3,"سیل":4,"آتش‌سوزی":3
}

POLITICAL_TERMS = [
    "انتخابات","انتخاباتی","رأی گیری","رای گیری","حزب سیاسی","حزب",
    "مجلس","نماینده مجلس","نماینده پارلمان","پارلمان","سناتور",
    "رئیس جمهور","رییس جمهور","رئیس‌جمهور","رییس‌جمهور","نخست وزیر",
    "نخست‌وزیر","وزیر","کابینه","استیضاح","رأی اعتماد","رای اعتماد",
    "سیاستمدار","سیاست خارجی","سیاست داخلی","مذاکرات سیاسی","مذاکره سیاسی",
    "دیپلمات","سفیر","کاخ سفید","کنگره آمریکا","کمپین انتخاباتی",
    "نامزد انتخابات","رئیس دولت","رییس دولت","رهبر حزب","ائتلاف سیاسی",
    "اپوزیسیون","پارلمان اروپا","مقام سیاسی"
]
BREAKING_TERMS = [
    "حمله","انفجار","زلزله","سیل","آتش سوزی","آتش‌سوزی","موشک",
    "قطع برق","خاموشی","سقوط","کشته","درگذشت","فوت","توقف پرواز",
    "تعطیلی","ورشکستگی","تعلیق","فوری","لغو شد","اعلام شد"
]

def normalize_title(s):
    s = str(s or "").lower()
    s = re.sub(r"[\u200c\u200f\u202a-\u202e]", " ", s)
    s = re.sub(r"[^0-9a-zA-Zآ-ی\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def title_tokens(s):
    return {t for t in normalize_title(s).split() if len(t) > 2 and t not in STOPWORDS}

def published_ts(s):
    if not s: return 0
    try:
        from datetime import datetime
        return datetime.fromisoformat(str(s).replace("Z","+00:00")).timestamp()
    except Exception:
        return 0

def local_similarity(a,b):
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb: return 0
    seq = SequenceMatcher(None, na, nb).ratio()
    ta, tb = title_tokens(na), title_tokens(nb)
    jac = len(ta & tb) / max(1, len(ta | tb))
    return max(seq, jac)

def text_for_filter(x):
    return normalize_title(f"{x.get('title','')} {x.get('summary','')}")

def is_political(x):
    text = text_for_filter(x)
    return any(normalize_title(term) in text for term in POLITICAL_TERMS)

def has_breaking_signal(x):
    text = text_for_filter(x)
    return any(normalize_title(term) in text for term in BREAKING_TERMS)

def local_prepare(items):
    now = time.time()
    cutoff = now - RECENT_HOURS * 3600
    recent = [x for x in items if not published_ts(x.get("published","")) or published_ts(x.get("published","")) >= cutoff]
    groups, meta = [], {}

    for x in sorted(recent, key=lambda z: published_ts(z.get("published","")), reverse=True):
        title = x.get("title","")
        ts = published_ts(x.get("published","")) or now
        chosen, best = None, 0
        for g in groups:
            if abs(ts-g["ts"]) > 36*3600: continue
            sim = local_similarity(title,g["title"])
            if sim > best: best, chosen = sim, g
        if chosen and (best >= .72 or (best >= .48 and len(title_tokens(title)&title_tokens(chosen["title"])) >= 3)):
            gid = chosen["gid"]; chosen["count"] += 1
        else:
            gid = "local-" + hashlib.sha1(normalize_title(title).encode("utf-8")).hexdigest()[:12]
            chosen = {"gid":gid,"title":title,"ts":ts,"count":1}
            groups.append(chosen)
        meta[item_key(x)] = {"group_id":gid}

    for x in recent:
        k = item_key(x); m = meta[k]
        text = text_for_filter(x)
        political = is_political(x)
        keyword_score = min(10, sum(v for k2,v in STRONG_KEYWORDS.items() if normalize_title(k2) in text))
        ts = published_ts(x.get("published","")) or now
        age_hours = max(0, (now-ts)/3600)
        freshness = max(0, 7-int(age_hours/3))
        dup_count = next((g["count"] for g in groups if g["gid"]==m["group_id"]),1)
        local_score = max(0,min(20,freshness+keyword_score+min(3,max(0,dup_count-1))))
        if political: local_score = min(local_score,4)
        m.update({"local_score":local_score,"duplicate_count":dup_count,
                  "political":political,"breaking_signal":has_breaking_signal(x),
                  "age_hours":age_hours})
    return recent, meta

def make_local_result(src,meta):
    topics = [t for t in (src.get("topics") or []) if t in TOPICS]
    if not topics and src.get("category") in TOPICS: topics=[src["category"]]
    score=int(meta.get("local_score",0))
    political=bool(meta.get("political"))
    return {
        "title":src.get("title",""),"summary":src.get("summary",""),
        "source":src.get("source",""),"published":src.get("published",""),
        "topics":topics,"topic_scores":{t:score for t in topics},
        "importance":score,"important":False,"important_topics":[],
        "slider_topics":[],"ticker_topics":[],"breaking":False,
        "breaking_topics":[],"publishable":not political,
        "exclude_reason":"political content is excluded" if political else "",
        "group_id":meta.get("group_id",""),
        "representative":meta.get("duplicate_count",1)==1,
        "reason":"local rule-based classification","analysis_mode":"local",
        "local_score":score,"political":political,
        "breaking_signal":bool(meta.get("breaking_signal")),
        "age_hours":float(meta.get("age_hours",99))
    }

def apply_local_selection(ai):
    rows=[(nid,v) for nid,v in ai.get("items",{}).items()
          if isinstance(v,dict) and v.get("publishable",True)
          and v.get("representative",True) and not v.get("political",False)]
    rows.sort(key=lambda kv:(int(kv[1].get("importance",0) or 0),
                             int(kv[1].get("local_score",0) or 0),
                             published_ts(kv[1].get("published",""))),reverse=True)
    for _,v in ai.get("items",{}).items():
        if not isinstance(v,dict): continue
        v["important"]=False;v["important_topics"]=[];v["slider_topics"]=[]
        v["breaking"]=False;v["breaking_topics"]=[];v["ticker_topics"]=[]
        if v.get("political"):
            v["publishable"]=False
            v["exclude_reason"]="political content is excluded"
    seen=set()
    for nid,v in rows:
        if int(v.get("importance",0) or 0)<12: continue
        gid=v.get("group_id") or nid
        if gid in seen: continue
        v["important"]=True;v["important_topics"]=list(v.get("topics") or [])[:3];seen.add(gid)
        if len(seen)>=4: break
    seen=set()
    for nid,v in rows:
        if int(v.get("importance",0) or 0)<11: continue
        gid=v.get("group_id") or nid
        if gid in seen: continue
        v["slider_topics"]=list(v.get("topics") or [])[:3];seen.add(gid)
        if len(seen)>=5: break
    for nid,v in rows:
        if int(v.get("importance",0) or 0)>=14 and v.get("breaking_signal") and float(v.get("age_hours",99))<=3:
            v["breaking"]=True;v["breaking_topics"]=list(v.get("topics") or [])[:3]
            v["ticker_topics"]=v["breaking_topics"]


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
        "reason": str(row.get("reason",""))[:300],
        "analysis_mode": "ai",
        "local_score": int(src.get("_local_score",0) or 0)
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
    out = {"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "_schema": 2, "items": {}}
    for nid,e in (old.get("items",{}) if isinstance(old.get("items",{}),dict) else {}).items():
        if isinstance(e,dict): out["items"][nid]=dict(e)
    for nid,v in ai["items"].items():
        e=out["items"].setdefault(nid,{})
        e["auto_important"]=bool(v.get("important")) and not v.get("political",False)
        e["auto_slider"]=bool(v.get("slider_topics")) and not v.get("political",False)
        e["auto_breaking"]=bool(v.get("breaking")) and not v.get("political",False)
        e["auto_publishable"]=bool(v.get("publishable",True)) and not v.get("political",False)
        e["ai_importance"]=int(v.get("importance",0) or 0)
        e["ai_political"]=bool(v.get("political",False))
        e["ai_reason"]=str(v.get("reason",""))[:300]
        if v.get("topics"): e["ai_topics"]=v["topics"]
        if v.get("important_topics"): e["ai_important_topics"]=v["important_topics"]
        else: e.pop("ai_important_topics",None)
        if v.get("slider_topics"): e["ai_slider_topics"]=v["slider_topics"]
        else: e.pop("ai_slider_topics",None)
        if v.get("breaking_topics"): e["ai_breaking_topics"]=v["breaking_topics"]
        else: e.pop("ai_breaking_topics",None)
        if "manual_important" not in e and "important" in e:
            e["manual_important"]=bool(e["important"]);e.pop("important",None)
        if "manual_slider" not in e and "slider" in e:
            e["manual_slider"]=bool(e["slider"]);e.pop("slider",None)
        if "manual_breaking" not in e and "breaking" in e:
            e["manual_breaking"]=bool(e["breaking"]);e.pop("breaking",None)
        e.pop("ai_managed",None)
        e["updated_at"]=out["updated"]
    EDITORIAL.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def generate_permanent_articles(all_news, ai, key):
    db = load_json(ARTICLES, {"updated": "", "schema": 1, "items": {}})
    if not isinstance(db, dict):
        db = {"updated": "", "schema": 1, "items": {}}
    db.setdefault("items", {})
    by_id = {item_key(x): x for x in all_news}
    ranked = []
    cutoff = time.time() - RECENT_HOURS * 3600
    for nid, row in ai.get("items", {}).items():
        if row.get("analysis_mode") != "ai" or not row.get("publishable", True) or row.get("political"):
            continue
        if not row.get("representative", True) or not row.get("important"):
            continue
        src = by_id.get(nid)
        if src and (published_ts(src.get("published", "")) == 0 or published_ts(src.get("published", "")) >= cutoff):
            ranked.append((int(row.get("importance", 0) or 0), nid, row, src))
    ranked.sort(key=lambda z: (z[0], z[3].get("published", "")), reverse=True)

    candidates, seen = [], set()
    for score, nid, row, src in ranked:
        gid = row.get("group_id") or nid
        if gid in seen:
            continue
        seen.add(gid)
        members = []
        for mid, mr in ai.get("items", {}).items():
            if mr.get("group_id") != gid:
                continue
            ms = by_id.get(mid)
            if not ms:
                continue
            members.append({
                "id": mid, "title": ms.get("title", ""),
                "summary": ms.get("summary", "")[:1200],
                "content": str(ms.get("content", "") or ms.get("description", "") or "")[:3500],
                "source": ms.get("source", ""), "url": ms.get("url", ""),
                "published": ms.get("published", "")
            })
        members.sort(key=lambda x: x.get("published", ""), reverse=True)
        candidates.append({"group_id": gid, "importance": score,
                           "topics": row.get("important_topics", []), "sources": members[:3]})
        if len(candidates) >= ARTICLE_LIMIT:
            break

    if not candidates:
        print("No important story groups selected for permanent articles.")
        return db

    existing = []
    for aid, article in list(db["items"].items())[-30:]:
        if isinstance(article, dict):
            existing.append({"id": aid, "title": article.get("title", ""),
                             "summary": article.get("summary", ""),
                             "category": article.get("category", ""),
                             "updated_at": article.get("updated_at", "")})

    prompt = """تو سردبیر ارشد Evren Nexus هستی.
از خبرهای خام زیر برای مهم‌ترین رویدادها «مطلب دائمی اختصاصی Evren Nexus» تولید یا به‌روزرسانی کن.
- خروجی خبرخوان نیست؛ مقاله مستقل و ماندگار است.
- چند گزارش درباره یک رویداد را در یک مقاله واحد ادغام کن.
- اگر موضوعی قبلاً در articles موجود است UPDATE کن، مقاله تکراری نساز.
- فقط بر اساس اطلاعات ورودی بنویس و هیچ واقعیت، عدد یا نقل‌قولی را جعل نکن.
- متن فارسی روان و اختصاصی باشد؛ کپی‌برداری از متن منابع ممنوع.
- content فقط HTML ساده: <p>، <h2>، <ul>، <li>، <strong>.
- مقاله حدود 500 تا 900 کلمه باشد، مگر اینکه اطلاعات کافی نباشد.
- summary حداکثر 300 کاراکتر.
- category یکی از economy,markets,currency-gold,real-estate,technology,ai,health,auto,science-life,sports,war باشد.
- sources فقط از منابع ورودی انتخاب شوند.
- action یکی از create, update, skip باشد.
- JSON فقط.

ساختار:
{"articles":[{"action":"create","article_id":"...","group_id":"...","category":"economy","title":"...","summary":"...","content":"<p>...</p>","source_ids":["..."],"sources":[{"name":"...","url":"..."}]}]}

مطالب دائمی موجود:
""" + json.dumps(existing, ensure_ascii=False) + """

گروه‌های مهم جدید:
""" + json.dumps(candidates, ensure_ascii=False)

    result = call_gemini(prompt, key)
    rows = result.get("articles", []) if isinstance(result, dict) else []
    changed = 0
    for row in rows:
        if not isinstance(row, dict) or row.get("action") == "skip":
            continue
        title, content = str(row.get("title", "")).strip(), str(row.get("content", "")).strip()
        if not title or not content:
            continue
        aid = str(row.get("article_id", "")).strip()
        if not aid:
            aid = "article-" + hashlib.sha1(normalize_title(title).encode("utf-8")).hexdigest()[:16]
        old = db["items"].get(aid, {})
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        # Always retain source attribution from the grouped raw reports.
        row_sources = row.get("sources", [])
        if not isinstance(row_sources, list):
            row_sources = []
        source_ids = row.get("source_ids", [])
        if not isinstance(source_ids, list):
            source_ids = []
        if not row_sources:
            candidate_sources = []
            gid = str(row.get("group_id", ""))
            for cand in candidates:
                if str(cand.get("group_id", "")) != gid:
                    continue
                candidate_sources = cand.get("sources", [])
                break
            if candidate_sources:
                row_sources = [{
                    "name": s.get("source", "") or s.get("name", ""),
                    "url": s.get("url", "")
                } for s in candidate_sources[:3] if isinstance(s, dict) and (s.get("source") or s.get("name"))]
        db["items"][aid] = {
            "id": aid, "title": title, "summary": str(row.get("summary", "")).strip()[:400],
            "content": content, "category": str(row.get("category", "economy")),
            "group_id": str(row.get("group_id", "")), "source_ids": source_ids,
            "sources": row_sources,
            "image": str(row.get("image", "") or (old.get("image", "") if isinstance(old, dict) else "")),
            "created_at": old.get("created_at", now_iso) if isinstance(old, dict) else now_iso,
            "updated_at": now_iso,
            "published_at": old.get("published_at", now_iso) if isinstance(old, dict) else now_iso,
            "status": "published", "ai_managed": True
        }
        changed += 1
    db["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ARTICLES.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Permanent articles changed: {changed}")
    return db

def main():
    key = os.environ.get("GEMINI_API_KEY","").strip()
    if not key: raise SystemExit("GEMINI_API_KEY is missing")
    if not NEWS.exists(): raise SystemExit(f"news.json not found: {NEWS}")
    try:
        news=json.loads(NEWS.read_text(encoding="utf-8"))
    except Exception as e:
        raise SystemExit(f"news.json is invalid JSON: {e}")
    if not isinstance(news,dict) or not isinstance(news.get("items"),list):
        raise SystemExit("news.json has no valid items array")
    items=news["items"]
    if not items: raise SystemExit("news.json contains zero news items")

    ai=load_json(OUT,{})
    if not isinstance(ai,dict): ai={}
    if ai.get("policy_version") != POLICY_VERSION:
        print(f"Policy changed: {ai.get('policy_version',0)} -> {POLICY_VERSION}; rebuilding recent AI state.")
        previous_usage = ai.get("usage") if isinstance(ai.get("usage"),dict) else {}
        ai={"version":1,"policy_version":POLICY_VERSION,"updated":"","items":{},"groups":{},
            "usage":previous_usage}
    ai.setdefault("items",{}); ai.setdefault("groups",{}); ai["policy_version"]=POLICY_VERSION

    usage=ai.get("usage") if isinstance(ai.get("usage"),dict) else {}
    today=time.strftime("%Y-%m-%d",time.gmtime())
    if usage.get("date") != today:
        usage={"date":today,"requests":0,"last_success":usage.get("last_success","")}
    requests_used=int(usage.get("requests",0) or 0)
    last_success=float(usage.get("last_success_epoch",0) or 0)
    now=time.time()
    quota_block_until=float(usage.get("quota_block_until_epoch",0) or 0)
    gemini_allowed=True
    if quota_block_until > now:
        wait=int((quota_block_until-now)/3600)+1
        print(f"Gemini quota cooldown active. Local editorial engine continues; AI skipped for about {wait} more hour(s).")
        gemini_allowed=False
    elif requests_used >= DAILY_REQUEST_BUDGET:
        print(f"AI budget reached: {requests_used}/{DAILY_REQUEST_BUDGET}. Local editorial engine continues.")
        gemini_allowed=False
    elif last_success and now-last_success < MIN_ANALYSIS_INTERVAL_SECONDS:
        wait=int((MIN_ANALYSIS_INTERVAL_SECONDS-(now-last_success))/60)+1
        print(f"Analysis interval lock active. Local editorial engine continues; AI next in about {wait} minutes.")
        gemini_allowed=False

    recent,local_meta=local_prepare(items)
    print(f"News total: {len(items)} | Recent ({RECENT_HOURS}h): {len(recent)}")

    for x in recent:
        k=item_key(x); m=local_meta.get(k,{})
        if not ai["items"].get(k) or ai["items"][k].get("analysis_mode") != "ai":
            local_row=dict(x); local_row["_local_score"]=m.get("local_score",0)
            ai["items"][k]=make_local_result(local_row,m)

    apply_local_selection(ai)
    rebuild_groups(ai)
    save_ai(ai)
    if not gemini_allowed:
        write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
        print("Local editorial engine completed while Gemini was unavailable.")
        return

    unresolved=[x for x in recent if ai["items"].get(item_key(x),{}).get("analysis_mode") != "ai"]
    unresolved.sort(key=lambda x:local_meta.get(item_key(x),{}).get("local_score",0),reverse=True)
    candidates=unresolved[:CANDIDATE_LIMIT]

    if not candidates:
        rebuild_groups(ai); save_ai(ai)
        write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
        print("No AI candidates in the recent window.")
        return

    max_requests=min(DAILY_REQUEST_BUDGET-requests_used,(len(candidates)+BATCH_SIZE-1)//BATCH_SIZE)
    candidates=candidates[:max_requests*BATCH_SIZE]
    print(f"AI candidates: {len(candidates)} | Planned requests: {(len(candidates)+BATCH_SIZE-1)//BATCH_SIZE} | Budget left: {DAILY_REQUEST_BUDGET-requests_used}")

    existing=[{"id":k,"title":v.get("title",""),"summary":v.get("summary",""),
               "group_id":v.get("group_id",""),"topics":v.get("topics",[])}
              for k,v in list(ai["items"].items())[-300:]]

    successful_batches=failed_batches=consecutive_failures=0

    for start in range(0,len(candidates),BATCH_SIZE):
        batch=candidates[start:start+BATCH_SIZE]
        batch_no=start//BATCH_SIZE+1
        total_batches=(len(candidates)+BATCH_SIZE-1)//BATCH_SIZE
        print(f"Batch {batch_no}/{total_batches}: {len(batch)} news items")

        payload=[{"id":item_key(x),"title":x.get("title",""),
                  "summary":x.get("summary","")[:700],"source":x.get("source",""),
                  "published":x.get("published",""),"topics":x.get("topics",[])}
                 for x in batch]

        prompt="""تو سردبیر هوشمند ارشد Evren Nexus هستی.
برای هر خبر فقط تصمیم‌های ضروری را بده تا خروجی فشرده بماند.
دسته‌های مجاز: """ + ",".join(TOPICS) + """.

قواعد:
1) خبرهای چند منبع درباره یک رویداد واقعی را با group_id یکسان گروه‌بندی کن و بهترین گزارش را representative=true کن.
2) فقط دسته‌های واقعاً مرتبط را در topics قرار بده.
3) importance امتیاز کلی 0 تا 20 است.
4) topic_scores فقط برای دسته‌های موجود در topics مقدار بده؛ امتیاز هر دسته مستقل است.
5) publishable=false برای تبلیغات، حاشیه یا محتوای فاقد ارزش خبری واقعی.
6) صرف اظهارنظر، مصاحبه، پیش‌بینی یا وعده بدون رویداد/تصمیم واقعی معمولاً اهمیت پایین دارد.
7) اطلاعات را جعل نکن.
8) JSON فقط و بدون توضیح اضافی.

ساختار:
{"items":[{"id":"...","topics":["economy"],"importance":0,"topic_scores":{"economy":0},"publishable":true,"group_id":"...","representative":true,"reason":"کوتاه"}],"groups":[{"group_id":"...","representative_id":"..."}]}

خبرهای نامزد:
""" + json.dumps(payload,ensure_ascii=False) + """

خبرهای قبلاً تحلیل‌شده برای تشخیص تکراری‌های بین اجراها:
""" + json.dumps(existing,ensure_ascii=False)

        try:
            result=call_gemini(prompt,key)
            rows=result.get("items",[]) if isinstance(result,dict) else []
            if not rows: raise RuntimeError("Gemini returned no items for this batch")
        except RuntimeError as e:
            failed_batches+=1; consecutive_failures+=1
            msg=str(e); print(f"Batch {batch_no}/{total_batches} failed: {msg}")
            if "GEMINI_QUOTA_EXHAUSTED" in msg or "HTTP 429" in msg:
                import re as _re
                m = _re.search(r'"retryDelay"\s*:\s*"([0-9]+)s"', msg)
                retry_seconds = int(m.group(1)) if m else QUOTA_DEFAULT_COOLDOWN_SECONDS
                # Never let a bad/missing retryDelay create an immediate retry loop.
                retry_seconds = max(60, retry_seconds)
                block_until = time.time() + retry_seconds
                usage["quota_block_until_epoch"] = block_until
                usage["quota_block_until"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(block_until))
                ai["usage"] = usage
                save_ai(ai)
                print(f"Gemini quota exhausted. Cooldown recorded until {usage['quota_block_until']}.")
                print("Quota exhaustion is a normal skip condition; exiting successfully.")
                break
            print(f"Consecutive batch failures: {consecutive_failures}/{MAX_CONSECUTIVE_BATCH_FAILURES}")
            if consecutive_failures>=MAX_CONSECUTIVE_BATCH_FAILURES:
                print("Stopping after consecutive batch failures.")
                break
            continue

        usage["requests"]=int(usage.get("requests",0) or 0)+1
        requests_used=usage["requests"]
        consecutive_failures=0
        by_id={x["id"]:x for x in payload}
        matched=0
        for row in rows:
            rid=str(row.get("id",""))
            if rid in by_id:
                src=dict(by_id[rid]); src["_local_score"]=local_meta.get(rid,{}).get("local_score",0)
                ai["items"][rid]=normalize_result(src,row); matched+=1

        for g in result.get("groups",[]):
            gid=str(g.get("group_id",""))
            if gid: ai["groups"][gid]={"representative_id":str(g.get("representative_id",""))}

        if matched==0:
            failed_batches+=1
            print(f"Batch {batch_no}/{total_batches} returned no matching news IDs.")
            continue

        successful_batches+=1
        usage["last_success"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
        usage["last_success_epoch"]=time.time()
        ai["usage"]=usage
        save_ai(ai)
        print(f"Batch {batch_no}/{total_batches} succeeded: {matched}/{len(batch)} matched | daily requests: {requests_used}/{DAILY_REQUEST_BUDGET}")

    ai["usage"]=usage
    if candidates and successful_batches==0:
        if float(usage.get("quota_block_until_epoch",0) or 0) > time.time():
            print("Gemini quota exhausted; cooldown recorded. No AI analysis was completed in this run, but the workflow will exit successfully.")
            return
        print(f"::warning::No news were analyzed successfully. {failed_batches} batch(es) failed.")
        return

    if failed_batches:
        print(f"::warning::{failed_batches} batch(es) failed; successful batches were preserved.")

    rebuild_groups(ai)
    apply_local_selection(ai)
    save_ai(ai)
    if successful_batches > 0 and int(usage.get("requests", 0) or 0) < DAILY_REQUEST_BUDGET:
        try:
            generate_permanent_articles(items, ai, key)
            usage["requests"] = int(usage.get("requests", 0) or 0) + 1
            usage["last_article_generation"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            ai["usage"] = usage
            save_ai(ai)
        except Exception as e:
            print(f"Permanent article generation failed: {e}")
    write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
    print(f"AI complete: {len(ai['items'])} items | successful batches: {successful_batches} | failed batches: {failed_batches} | daily requests: {int(usage.get('requests',0) or 0)}/{DAILY_REQUEST_BUDGET} | editorial written: {len(ai['items'])}")


if __name__=="__main__":
    main()
