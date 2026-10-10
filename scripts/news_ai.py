#!/usr/bin/env python3
import json, os, time, hashlib, random, re, html
from difflib import SequenceMatcher
from pathlib import Path
from content_policy import out_of_scope
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "data" / "news.json"
OUT = ROOT / "data" / "news-ai.json"
EDITORIAL = ROOT / "data" / "editorial.json"
ARTICLES = ROOT / "data" / "articles.json"

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
BATCH_SIZE = 40
CANDIDATE_LIMIT = 40
RECENT_HOURS = 4
DAILY_REQUEST_BUDGET = 24
ARTICLE_LIMIT = 4
ARTICLE_CANDIDATE_POOL = 20
MIN_ANALYSIS_INTERVAL_SECONDS = 30 * 60
MAX_RETRIES = 3
MAX_CONSECUTIVE_BATCH_FAILURES = 2
POLICY_VERSION = 9
IMPORTANT_SCORE_MIN = 13
SLIDER_SCORE_MIN = 15
TICKER_SCORE_MIN = 14
RETRY_DELAYS = [8, 20, 45]
QUOTA_DEFAULT_COOLDOWN_SECONDS = 6 * 60 * 60
GEMINI_QUOTA_BLOCKED = False

TOPICS = [
    "economy","markets","crypto","currency-gold","real-estate","technology",
    "ai","health","auto","science-life"
]

TOPIC_KEYWORDS = {
    "economy": ["اقتصاد","اقتصادی","تورم","تولید","تولیدکننده","بودجه","مالیات","رشد اقتصادی","درآمد","هزینه تولید","انرژی","نفت"],
    "markets": ["بورس","بازار سرمایه","بازار سهام","سهام","شاخص کل","فرابورس","عرضه اولیه","سرمایه گذاری","سرمایه‌گذاری","اوراق"],
    "currency-gold": ["دلار","یورو","درهم","پوند","لیر","طلا","سکه","نرخ ارز","بازار ارز","قیمت طلا","قیمت دلار"],
    "crypto": ["ارز دیجیتال","ارزهای دیجیتال","رمزارز","رمز ارز","کریپتو","کریپتوکارنسی","بیت کوین","بیت‌کوین","بیتکوین","اتریوم","تتر","بایننس","بلاک چین","بلاک‌چین","بلاکچین","دیفای","سولانا","ریپل","دوج کوین","دوج‌کوین","توکن","web3","bitcoin","ethereum","crypto","cryptocurrency","blockchain","solana","ripple","dogecoin","binance","token","defi"],
    "real-estate": ["مسکن","آپارتمان","اجاره","خانه","ساختمان","املاک","رهن"],
    "technology": ["فناوری","تکنولوژی","اینترنت","موبایل","گوشی","نرم افزار","نرم‌افزار","سخت افزار","سخت‌افزار","اپل","مایکروسافت","گوگل","هوش مصنوعی","یادگیری ماشین","یادگیری ماشینی","مدل زبانی","chatgpt","openai","gemini","claude","copilot"],
    "ai": ["هوش مصنوعی","یادگیری ماشین","یادگیری ماشینی","چت جی پی تی","chatgpt","gemini","claude","مدل زبانی"],
    "health": ["پزشکی","سلامت","بیماری","بیمار","درمان","دارو","پزشک","بیمارستان","اپیدمی","کرونا"],
    "auto": ["خودرو","ماشین","ایران خودرو","ایران‌خودرو","سایپا","خودروساز","خودروسازی","قطعه خودرو","بنزین"],
    "science-life": ["علم","پژوهش","دانشگاه","فضا","محیط زیست","محیط‌زیست","آزمایش","سبک زندگی","تغذیه","نجوم"]
}


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


def call_OpenRouter(prompt, key):
    """Call OpenRouter's OpenAI-compatible API and require a JSON object response."""
    payload = json.dumps({
        "model": os.environ.get("OPENROUTER_MODEL", "openrouter/free"),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_completion_tokens": 8192,
        "response_format": {"type": "json_object"}
    }, ensure_ascii=False).encode("utf-8")
    last = ""
    for attempt in range(MAX_RETRIES):
        req = Request("https://openrouter.ai/api/v1/chat/completions", data=payload, headers={
            "Authorization": "Bearer " + key, "Content-Type": "application/json",
            "HTTP-Referer": "https://evrenexus.github.io/svgevrenexus-viewer/",
            "X-Title": "Evren Nexus"
        }, method="POST")
        try:
            with urlopen(req, timeout=120) as r:
                data = json.load(r)
            text = str((((data.get("choices") or [{}])[0]).get("message") or {}).get("content") or "").strip()
            if not text:
                raise RuntimeError("Empty OpenRouter response")
            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Invalid OpenRouter JSON: {e}; response preview: {text[:500]}")
        except HTTPError as e:
            body = ""
            try: body = e.read().decode("utf-8", "ignore")[:2000]
            except Exception: pass
            last = f"HTTP {e.code}: {body}"
            print("OpenRouter error:", last)
            if e.code == 429:
                raise RuntimeError("OpenRouter_RATE_LIMIT " + last)
            if e.code not in (500, 502, 503, 504):
                raise RuntimeError(last)
        except (URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            print("OpenRouter temporary error:", last)
        if attempt + 1 < MAX_RETRIES:
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0, 4)
            print(f"OpenRouter retry {attempt+1}/{MAX_RETRIES} in {delay:.1f}s...")
            time.sleep(delay)
    raise RuntimeError(last)


def call_groq(prompt, key):
    """Call Groq's OpenAI-compatible API; used only after Gemini fails."""
    payload = json.dumps({
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"}
    }, ensure_ascii=False).encode("utf-8")
    last = ""
    for attempt in range(MAX_RETRIES):
        req = Request(GROQ_API, data=payload, headers={
            "Authorization": "Bearer " + key, "Content-Type": "application/json"
        }, method="POST")
        try:
            with urlopen(req, timeout=120) as r:
                data = json.load(r)
            response_text = str((((data.get("choices") or [{}])[0]).get("message") or {}).get("content") or "").strip()
            if not response_text:
                raise RuntimeError("Empty Groq response")
            return json.loads(response_text)
        except HTTPError as e:
            body = ""
            try: body = e.read().decode("utf-8", "ignore")[:2000]
            except Exception: pass
            last = f"HTTP {e.code}: {body}"
            print("Groq error:", last)
            if e.code not in (408, 429, 500, 502, 503, 504):
                raise RuntimeError(last)
        except (URLError, TimeoutError, ValueError, RuntimeError) as e:
            last = str(e)
            print("Groq temporary error:", last)
        if attempt + 1 < MAX_RETRIES:
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)-1)] + random.uniform(0, 4)
            time.sleep(delay)
    raise RuntimeError(last)


def call_ai(prompt, gemini_key, groq_key, OpenRouter_key):
    """Sequential provider priority: Gemini, then Groq, then OpenRouter."""
    global GEMINI_QUOTA_BLOCKED
    errors = []
    if gemini_key and not GEMINI_QUOTA_BLOCKED:
        try:
            result = call_gemini(prompt, gemini_key)
            print("AI provider used: Gemini")
            return result
        except Exception as e:
            msg = str(e)
            errors.append("Gemini: " + msg)
            print("Gemini failed; trying Groq:", msg[:500])
            if "GEMINI_QUOTA_EXHAUSTED" in msg or "HTTP 429" in msg:
                GEMINI_QUOTA_BLOCKED = True
    if groq_key:
        try:
            result = call_groq(prompt, groq_key)
            print("AI provider used: Groq")
            return result
        except Exception as e:
            errors.append("Groq: " + str(e))
            print("Groq failed; trying OpenRouter:", str(e)[:500])
    if OpenRouter_key:
        try:
            result = call_OpenRouter(prompt, OpenRouter_key)
            print("AI provider used: OpenRouter")
            return result
        except Exception as e:
            errors.append("OpenRouter: " + str(e))
            print("OpenRouter fallback failed:", str(e)[:500])
    if not gemini_key and not groq_key and not OpenRouter_key:
        raise RuntimeError("GEMINI_API_KEY, GROQ_API_KEY, and OPENROUTER_API_KEY are all missing")
    raise RuntimeError("All configured AI providers failed. " + " | ".join(errors))


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
    "اپوزیسیون","پارلمان اروپا","مقام سیاسی","دولت","حکومت",
    "رئیس","رییس","وزیر","قاضی","دادگاه","دیوان","دیوان کیفری",
    "مقام دولتی","مقام حکومتی","تحریم قضات","انتخابات میان دوره ای",
    "انتخابات میان‌دوره‌ای",
    # Political figures / political personalities whose routine personal
    # appearances or comments are not useful news for Evren Nexus.
    "ترامپ","دونالد ترامپ","جی دی ونس","جی‌دی ونس","j d vance","jd vance",
    "ونس","اوشا ونس","اوشا","ساداتیان",
    # Political/military commentary and horse-race framing.
    "پشت پرده","آرایش جنگی","آستانه جنگ","نمایش قدرت","تهدیدهای مکرر",
    "تهدید نظامی","فشار نظامی","محاصره","امتیاز پیش از انتخابات",
    "موضع‌گیری سیاسی","اظهارنظر سیاسی","تحلیل سیاسی","کارشناس سیاسی",
    "اعتراض","اعتراضات","اعتراض دانش‌آموزی","اعتراضات دانش‌آموزی","جنبش اعتراضی","تظاهرات",
    "قوه قضائیه","قوه قضاییه","قرار وثیقه","وثیقه","بازداشت","بازداشت شد","بازداشت شده",
    "زندانی سیاسی","فعال سیاسی","اتهام سیاسی","محکومیت سیاسی","حکم قضایی","پرونده قضایی",
    "زندانی","حبس سیاسی","دادستان","دادسرا","دادگاه انقلاب"
]
BREAKING_TERMS = [
    "حمله","انفجار","زلزله","سیل","آتش سوزی","آتش‌سوزی","موشک",
    "قطع برق","خاموشی","سقوط","کشته","درگذشت","فوت","توقف پرواز",
    "تعطیلی","ورشکستگی","تعلیق","فوری","لغو شد","اعلام شد"
]

SPORT_TERMS = ["ورزش","فوتبال","بسکتبال","والیبال","تنیس","لیگ برتر","تیم ملی","مسابقه ورزشی","قهرمانی","المپیک","جام جهانی","گلزنی","مربی تیم","بازیکن فوتبال"]
MILITARY_TERMS = ["جنگ","درگیری مسلحانه","حمله نظامی","عملیات نظامی","موشک","بمباران","ارتش","نیروهای مسلح","نیروی هوایی","نیروی دریایی","نیروی زمینی","نظامی","نظامیان","پهپاد نظامی","رزمایش","تسلیحات","سلاح","جنگنده","فرمانده نظامی","تلفات نظامی","آتش بس","حمله هوایی","حمله موشکی","پدافند","پایگاه نظامی","سرباز","یگان نظامی"]

def is_forbidden_content(x):
    if out_of_scope(x):
        return "blocked topic/subject is excluded"
    text = text_for_filter(x)
    if is_political(x):
        return "political content is excluded"
    if any(normalize_title(term) in text for term in SPORT_TERMS):
        return "sports content is excluded"
    if any(normalize_title(term) in text for term in MILITARY_TERMS):
        return "military content is excluded"
    return ""

def normalize_title(s):
    s = str(s or "").lower()
    s = re.sub(r"[\u200c\u200f\u202a-\u202e]", " ", s)
    s = re.sub(r"[^0-9a-zA-Zآ-ی\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def keyword_present(text, keyword):
    phrase = normalize_title(keyword)
    if not phrase:
        return False
    if " " in phrase:
        return phrase in text
    return re.search(r"(?<!\\w)" + re.escape(phrase) + r"(?!\\w)", text, re.UNICODE) is not None

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
    return normalize_title(f"{x.get('title','')} {x.get('summary','')} {x.get('content','')}")

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
    raw_summary=str(src.get("summary","") or "")
    raw_summary=re.sub(r"^[^:]{1,50}:\s*","",raw_summary)
    text=normalize_title(f"{src.get('title','')} {raw_summary}")
    base_topics=[t for t in (src.get("topics") or []) if t in TOPICS]
    if src.get("category") in TOPICS and src.get("category") not in base_topics:
        base_topics.append(src["category"])

    topic_scores={}
    hit_counts={}
    base=int(meta.get("local_score",0))
    for topic,keywords in TOPIC_KEYWORDS.items():
        hits=sum(1 for kw in keywords if keyword_present(text,kw))
        if hits:
            hit_counts[topic]=hits
            topic_scores[topic]=min(20,base+min(12,hits*5))

    # Collector labels are only a fallback when they were actually
    # classified from the story. Source-publisher categories are never topics.
    if not topic_scores:
        for topic in base_topics:
            topic_scores[topic]=base
    else:
        top_score=max(topic_scores.values())
        topic_scores={t:v for t,v in topic_scores.items() if v>=max(8,top_score*0.85)}

    topics=sorted(topic_scores,key=lambda t:(topic_scores[t],t),reverse=True)
    if "ai" in topics and "technology" not in topics:
        topics.append("technology")
        topic_scores["technology"]=max(topic_scores.get("technology",0),topic_scores.get("ai",0))
    score=max(topic_scores.values()) if topic_scores else base
    forbidden=is_forbidden_content(src)
    political=bool(meta.get("political")) or bool(forbidden)
    return {
        "title":src.get("title",""),"summary":src.get("summary",""),
        "source":src.get("source",""),"published":src.get("published",""),
        "topics":topics,"topic_scores":topic_scores,
        "importance":score,"important":False,"important_topics":[],
        "slider_topics":[],"ticker_topics":[],"breaking":False,
        "breaking_topics":[],"publishable":not political and not forbidden,
        "exclude_reason":forbidden or ("political content is excluded" if political else ""),
        "group_id":meta.get("group_id",""),
        "representative":meta.get("duplicate_count",1)==1,
        "reason":"local rule-based classification","analysis_mode":"local",
        "local_score":int(meta.get("local_score",0)),
        "political":political,
        "breaking_signal":bool(meta.get("breaking_signal")),
        "age_hours":float(meta.get("age_hours",99))
    }

def apply_local_selection(ai):
    items=ai.get("items",{}) if isinstance(ai.get("items",{}),dict) else {}

    # Reset automatic editorial flags first.
    for _,v in items.items():
        if not isinstance(v,dict):
            continue
        v["important"]=False
        v["important_topics"]=[]
        v["slider_topics"]=[]
        v["breaking"]=False
        v["breaking_topics"]=[]
        v["ticker_topics"]=[]
        if v.get("political"):
            v["publishable"]=False
            v["exclude_reason"]="political content is excluded"

    # Editorial selection is performed independently for every topic.
    # This keeps the homepage global while making every topic page local.
    for topic in TOPICS:
        candidates=[]
        for nid,v in items.items():
            if not isinstance(v,dict):
                continue
            if not v.get("publishable",True) or v.get("political",False) or is_forbidden_content(v):
                continue
            if not v.get("representative",True):
                continue
            if topic not in (v.get("topics") or []):
                continue
            score=int((v.get("topic_scores") or {}).get(topic, v.get("importance",0)) or 0)
            candidates.append((nid,v,score))

        candidates.sort(key=lambda row: (
            row[2],
            int(row[1].get("local_score",0) or 0),
            published_ts(row[1].get("published",""))
        ), reverse=True)

        seen=set()
        for nid,v,score in candidates:
            if score < IMPORTANT_SCORE_MIN:
                continue
            gid=v.get("group_id") or nid
            if gid in seen:
                continue
            v["important_topics"]=list(dict.fromkeys((v.get("important_topics") or [])+[topic]))[:6]
            v["important"]=True
            seen.add(gid)
            if len(seen)>=4:
                break

        seen=set()
        for nid,v,score in candidates:
            if score < SLIDER_SCORE_MIN:
                continue
            gid=v.get("group_id") or nid
            if gid in seen:
                continue
            v["slider_topics"]=list(dict.fromkeys((v.get("slider_topics") or [])+[topic]))[:6]
            seen.add(gid)
            if len(seen)>=5:
                break

        seen=set()
        for nid,v,score in candidates:
            if score < TICKER_SCORE_MIN or not v.get("breaking_signal"):
                continue
            if float(v.get("age_hours",99)) > 3:
                continue
            gid=v.get("group_id") or nid
            if gid in seen:
                continue
            v["breaking"]=True
            v["breaking_topics"]=list(dict.fromkeys((v.get("breaking_topics") or [])+[topic]))[:6]
            v["ticker_topics"]=list(dict.fromkeys((v.get("ticker_topics") or [])+[topic]))[:6]
            seen.add(gid)
            if len(seen)>=3:
                break

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
    if "ai" in topics and "technology" not in topics:
        topics.append("technology")
        scores["technology"] = max(scores.get("technology", 0), scores.get("ai", 0), score)
    important_topics = [t for t in topics if scores.get(t, score) >= IMPORTANT_SCORE_MIN]
    slider_topics = [t for t in topics if scores.get(t, score) >= SLIDER_SCORE_MIN]
    ticker_topics = [t for t in topics if scores.get(t, score) >= TICKER_SCORE_MIN]
    forbidden = is_forbidden_content(src)
    publishable = bool(row.get("publishable", True)) and not forbidden
    content_type = str(row.get("content_type", "") or "").strip()[:60]
    reject_reason = str(row.get("reject_reason", row.get("exclude_reason", "")) or "").strip()[:300]
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
        "exclude_reason": str(forbidden or row.get("exclude_reason", reject_reason))[:300],
        "content_type": content_type,
        "reject_reason": reject_reason,
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
        if v.get("permanent_article") and v.get("article_id"):
            e["permanent_article"]=True
            e["article_id"]=str(v["article_id"])
        else:
            e.pop("permanent_article",None)
            e.pop("article_id",None)
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

def find_commons_image(query, article_id):
    """Find and download a relevant openly licensed image from Wikimedia Commons."""
    q = str(query or "").strip()
    if not q:
        return ""
    try:
        import urllib.parse
        import urllib.request
        api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": q, "gsrnamespace": 6, "gsrlimit": 8,
            "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": 1200
        })
        req = urllib.request.Request(api, headers={"User-Agent": "EvrenNexus/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
        pages = list((data.get("query", {}).get("pages", {}) or {}).values())
        allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
        chosen = None
        for page in pages:
            info = (page.get("imageinfo") or [{}])[0]
            mime = info.get("mime", "")
            thumb = info.get("thumburl") or info.get("url")
            if thumb and mime in allowed:
                chosen = (thumb, allowed[mime])
                break
        if not chosen:
            return ""
        url, ext = chosen
        out_dir = ROOT / "assets" / "articles"
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / ("article-" + re.sub(r"[^a-zA-Z0-9_-]", "", str(article_id)) + ext)
        req = urllib.request.Request(url, headers={"User-Agent": "EvrenNexus/1.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            blob = r.read()
        if len(blob) < 5000:
            return ""
        path.write_bytes(blob)
        return "./assets/articles/" + path.name
    except Exception as exc:
        print("Article image search failed:", exc)
        return ""

def generate_permanent_articles(all_news, ai, key, groq_key="", OpenRouter_key=""):
    db = load_json(ARTICLES, {"updated": "", "schema": 1, "items": {}})
    if not isinstance(db, dict):
        db = {"updated": "", "schema": 1, "items": {}}
    db.setdefault("items", {})
    by_id = {item_key(x): x for x in all_news}
    by_title = {}
    for x in all_news:
        t = normalize_title(x.get("title", ""))
        if t:
            by_title[t] = x
    ranked = []
    completed_groups = {
        str(article.get("group_id"))
        for article in db["items"].values()
        if isinstance(article, dict)
        and article.get("status") == "published"
        and str(article.get("content", "")).strip()
        and str(article.get("title", "")).strip()
        and article.get("group_id")
    }
    cutoff = time.time() - RECENT_HOURS * 3600
    for nid, row in ai.get("items", {}).items():
        if not row.get("publishable", True) or row.get("political"):
            continue
        if not row.get("representative", True) or not row.get("important"):
            continue
        gid = str(row.get("group_id") or nid)
        if gid in completed_groups:
            continue
        src = by_id.get(nid) or by_title.get(normalize_title(row.get("title", "")))
        if src and (published_ts(src.get("published", "")) == 0 or published_ts(src.get("published", "")) >= cutoff):
            ranked.append((int(row.get("importance", 0) or 0), nid, row, src))
    ranked.sort(key=lambda z: (z[0], z[3].get("published", "")), reverse=True)

    candidates, seen = [], set()
    for score, nid, row, src in ranked[:ARTICLE_CANDIDATE_POOL]:
        gid = row.get("group_id") or nid
        if gid in seen:
            continue
        seen.add(gid)
        members = []
        for mid, mr in ai.get("items", {}).items():
            if mr.get("group_id") != gid:
                continue
            ms = by_id.get(mid) or by_title.get(normalize_title(mr.get("title", "")))
            if not ms:
                continue
            members.append({
                "id": mid, "title": ms.get("title", ""),
                "summary": ms.get("summary", "")[:1200],
                "content": str(ms.get("content", "") or ms.get("description", "") or "")[:3500],
                "source": ms.get("source", ""), "url": ms.get("url", ""),
                "image": ms.get("image", ""),
                "published": ms.get("published", "")
            })
        members.sort(key=lambda x: x.get("published", ""), reverse=True)
        candidates.append({"group_id": gid, "importance": score,
                           "topics": row.get("important_topics", []), "sources": members[:3]})

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
- متن فارسی روان، مستقل و ویراستاری‌شده باشد؛ متن خام منبع را عیناً بازنشر نکن.
- پیش از نوشتن، متن منابع را پاک‌سازی کن: کد خبر، تاریخ/ساعت تکراری، URL خراب، نام دسته‌بندی و مسیرهای ناوبری، تبلیغات و پیام‌های اسپانسری، دعوت به خرید/سرمایه‌گذاری، واترمارک، کپشن نامرتبط، پاراگراف‌ها و جمله‌های تکراری را حذف کن.
- اگر تبلیغ وسط یک پاراگراف آمده، تبلیغ را حذف و جمله‌های معتبر قبل و بعد آن را طبیعی به هم وصل کن.
- تیترها و میان‌تیترهای واقعی، اطلاعات پزشکی/ایمنی مهم، اعداد و نقل‌قول‌های مرتبط را حفظ کن؛ واقعیت یا نقل‌قول جعل نکن و معنای منبع را تغییر نده.
- هر پاراگراف فقط یک بار بیاید؛ خلاصه را دوباره به عنوان پاراگراف اول متن تکرار نکن.
- content فقط HTML ساده: <p>، <h2>، <ul>، <li>، <strong>.
- content باید خلاصه واقعی و مستقل از متن کامل منابع باشد، نه بریدن ابتدا یا انتهای متن؛ هدف 3000 تا 3800 کاراکتر متن خالص و سقف قطعی 4000 کاراکتر پس از حذف HTML است. نکات کلیدی، اعداد و نتیجه اصلی را حفظ کن و متن را کامل و طبیعی تمام کن.
- summary حداکثر 300 کاراکتر و بدون تبلیغ یا تکرار متن باشد.
- پیش از تحویل، خروجی نهایی را دوباره بازبینی کن و هر تبلیغ، تکرار یا متن ناوبری باقی‌مانده را حذف کن.
- category یکی از economy,markets,crypto,currency-gold,real-estate,technology,ai,health,auto,science-life باشد.
- sources فقط از منابع ورودی انتخاب شوند.
- اگر گروه خبر تصویر مناسبی ندارد، image_query یک عبارت کوتاه و دقیق برای جستجوی تصویر مرتبط در Wikimedia Commons بده؛ اگر تصویر مناسب از ورودی وجود دارد image_query را خالی بگذار.
- از بین گروه‌های ورودی حداکثر ۴ مقاله تولید کن؛ اولویت با اهمیت بیشتر و تازگی بیشتر است، اما اگر تصویر یک گروه پیدا نشد، سراغ گروه بعدی برو تا در نهایت ۴ مقاله قابل انتشار با تصویر ساخته شود.\n- action یکی از create, update, skip باشد.
- JSON فقط.

ساختار:
{"articles":[{"action":"create","article_id":"...","group_id":"...","category":"economy","title":"...","summary":"...","content":"<p>...</p>","image_query":"...","source_ids":["..."],"sources":[{"name":"...","url":"..."}]}]}

مطالب دائمی موجود:
""" + json.dumps(existing, ensure_ascii=False) + """

گروه‌های مهم جدید:
""" + json.dumps(candidates, ensure_ascii=False)

    try:
        result = call_ai(prompt, key, groq_key, OpenRouter_key)
        rows = result.get("articles", []) if isinstance(result, dict) else []
    except Exception as exc:
        # Never publish raw source text as fallback: it may contain ads,
        # duplicate paragraphs, navigation debris, or scraped artifacts.
        print(f"AI article writing failed; skipping permanent-article creation instead of copying raw text: {exc}")
        return db

    changed = 0
    for row in rows:
        if not isinstance(row, dict) or row.get("action") == "skip":
            continue
        title, content = str(row.get("title", "")).strip(), str(row.get("content", "")).strip()
        if not title or not content:
            continue
        # If the first draft is too long, request a genuine summary; never clip it.
        plain = lambda value: re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", " ", str(value or "")))).strip()
        if len(plain(content)) > 4000:
            summary_prompt = """متن HTML زیر را به خلاصه‌ای واقعی و مستقل به فارسی بازنویسی کن. متن را از ابتدا قطع نکن؛ نکات اصلی و اعداد مهم را حفظ کن، تبلیغ و تکرار را حذف کن و جمله پایانی کامل باشد. متن خالص باید حداکثر 4000 کاراکتر داشته باشد. فقط JSON با کلید content و HTML ساده برگردان.
متن:
""" + content
            try:
                summarized = call_ai(summary_prompt, key, groq_key, OpenRouter_key)
                candidate = str(summarized.get("content", "") if isinstance(summarized, dict) else "").strip()
                if candidate and len(plain(candidate)) <= 4000:
                    content = candidate
                else:
                    print(f"Permanent article skipped: AI summary exceeds 4000 characters: {title}")
                    continue
            except Exception as exc:
                print(f"Permanent article skipped: AI summary failed: {title}: {exc}")
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
        existing_image = str(row.get("image", "") or (old.get("image", "") if isinstance(old, dict) else ""))
        if not existing_image:
            for cand in candidates:
                if str(cand.get("group_id", "")) == str(row.get("group_id", "")):
                    for src_item in cand.get("sources", []):
                        if isinstance(src_item, dict) and src_item.get("image"):
                            existing_image = str(src_item.get("image"))
                            break
                    break
        if not existing_image:
            existing_image = find_commons_image(row.get("image_query", ""), aid)

        # A permanent Evren Nexus article is publishable only when it has a usable image.
        # If neither the source group nor Wikimedia Commons provides one, do not publish it.
        if not existing_image:
            print(f"Permanent article skipped (no image found): {title}")
            continue

        db["items"][aid] = {
            "id": aid, "title": title, "summary": str(row.get("summary", "")).strip()[:400],
            "content": content, "category": str(row.get("category", "economy")),
            "group_id": str(row.get("group_id", "")), "source_ids": source_ids,
            "sources": row_sources,
            "image": existing_image,
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

def attach_permanent_article_links(ai, db):
    """Link AI-selected important stories to their permanent Evren Nexus article."""
    if not isinstance(db, dict):
        return
    items = db.get("items", {}) if isinstance(db.get("items", {}), dict) else {}
    by_group = {}
    for aid, article in items.items():
        if not isinstance(article, dict) or article.get("status") != "published" or not article.get("image"):
            continue
        gid = str(article.get("group_id", "") or "")
        if gid:
            by_group[gid] = str(aid)

    for _, row in ai.get("items", {}).items():
        if not isinstance(row, dict):
            continue
        aid = by_group.get(str(row.get("group_id", "") or ""))
        if aid and row.get("important") and row.get("publishable", True) and not row.get("political"):
            row["permanent_article"] = True
            row["article_id"] = aid
            article_image = db.get("items", {}).get(aid, {}).get("image", "")
            if article_image:
                row["image"] = article_image
        else:
            row.pop("permanent_article", None)
            row.pop("article_id", None)


def main():
    global GEMINI_QUOTA_BLOCKED
    key = os.environ.get("GEMINI_API_KEY","").strip()
    groq_key = os.environ.get("GROQ_API_KEY","").strip()
    OpenRouter_key = os.environ.get("OPENROUTER_API_KEY","").strip()
    if not key and not groq_key and not OpenRouter_key:
        raise SystemExit("GEMINI_API_KEY, GROQ_API_KEY, and OPENROUTER_API_KEY are all missing")
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
    policy_changed = ai.get("policy_version") != POLICY_VERSION
    if policy_changed:
        print(f"Policy changed: {ai.get('policy_version',0)} -> {POLICY_VERSION}; preserving prior records and refreshing recent news.")
        previous_usage = ai.get("usage") if isinstance(ai.get("usage"),dict) else {}
        previous_items = ai.get("items") if isinstance(ai.get("items"),dict) else {}
        previous_groups = ai.get("groups") if isinstance(ai.get("groups"),dict) else {}
        ai={"version":1,"policy_version":POLICY_VERSION,"updated":"",
            "items":previous_items,"groups":previous_groups,"usage":previous_usage}
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
        print(f"Gemini quota cooldown active for about {wait} more hour(s); OpenRouter remains available for AI work.")
        key = ""
        GEMINI_QUOTA_BLOCKED = True
    if requests_used >= DAILY_REQUEST_BUDGET:
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
        if policy_changed and isinstance(ai["items"].get(k),dict):
            ai["items"][k]["analysis_mode"] = "local"
        if not ai["items"].get(k) or ai["items"][k].get("analysis_mode") != "ai":
            local_row=dict(x); local_row["_local_score"]=m.get("local_score",0)
            ai["items"][k]=make_local_result(local_row,m)

    apply_local_selection(ai)
    rebuild_groups(ai)
    save_ai(ai)
    if not gemini_allowed:
        try:
            article_db = generate_permanent_articles(items, ai, key, groq_key, OpenRouter_key)
            attach_permanent_article_links(ai, article_db)
        except Exception as e:
            print(f"Local permanent article generation failed: {e}")
            attach_permanent_article_links(ai, load_json(ARTICLES, {"items": {}}))
        save_ai(ai)
        write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
        print("Local editorial engine completed while Gemini was unavailable, including permanent-article fallback.")
        return

    unresolved=[x for x in recent if ai["items"].get(item_key(x),{}).get("analysis_mode") != "ai"]
    unresolved.sort(key=lambda x:local_meta.get(item_key(x),{}).get("local_score",0),reverse=True)
    candidates=unresolved[:CANDIDATE_LIMIT]

    if not candidates:
        rebuild_groups(ai); save_ai(ai)
        # Keep processing important stories even when no fresh AI classification is needed.
        if int(usage.get("requests", 0) or 0) < DAILY_REQUEST_BUDGET:
            try:
                article_db = generate_permanent_articles(items, ai, key, groq_key, OpenRouter_key)
                usage["requests"] = int(usage.get("requests", 0) or 0) + 1
                usage["last_article_generation"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                ai["usage"] = usage
                attach_permanent_article_links(ai, article_db)
                save_ai(ai)
            except Exception as e:
                print(f"Queued permanent article generation failed: {e}")
                attach_permanent_article_links(ai, load_json(ARTICLES, {"items": {}}))
        else:
            attach_permanent_article_links(ai, load_json(ARTICLES, {"items": {}}))
        save_ai(ai)
        write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
        print("No new AI candidates; permanent-article queue checked.")
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

        prompt="""تو سردبیر ارشد و سخت‌گیر Evren Nexus هستی. هدف، انتخاب «خبر واقعی و ارزشمند» برای یک سایت خبری اقتصادی/فناوری/سلامت/علم/خودرو است؛ نه بازنشر هر چیزی که خبرگزاری‌ها منتشر کرده‌اند.
دسته‌های مجاز: """ + ",".join(TOPICS) + """.

سیاست تحریریه:
1) چند گزارش درباره یک رویداد واقعی را با group_id یکسان گروه‌بندی کن و بهترین گزارش را representative=true کن.
2) فقط دسته‌های واقعاً مرتبط را در topics قرار بده.
3) importance امتیاز کلی 0 تا 20 است و باید ارزش خبری واقعی را بسنجد، نه صرفاً وجود کلمات کلیدی.
4) publishable=false برای تبلیغات، رپورتاژ، حاشیه، شایعه، کلیک‌بیت، محتوای زرد، خبر تکراری یا محتوایی که رویداد/تصمیم واقعی و ارزشمند ندارد.
5) اظهارنظر، مصاحبه، سخنرانی، وعده، تهدید، پیش‌بینی، تحلیل، تفسیر، «پشت پرده»، «کارشناس می‌گوید»، «مقام اعلام کرد» و حرف‌های مشابه را اگر خودِ آن حرف یک رویداد یا تصمیم مهم و قابل‌سنجش نیست، publishable=false کن.
6) خبرهایی که فقط درباره زندگی شخصی، ظاهر، لباس، سفر، زمین خوردن، خانواده، رفتار روزمره یا حاشیه یک سیاستمدار/مقام نظامی هستند publishable=false.
7) صرف اینکه فرد «نماینده مجلس»، «وزیر»، «مقام دولتی»، «مقام نظامی»، «ژنرال»، «فرمانده»، «سناتور» یا سیاستمدار است، دلیل انتشار نیست. اظهارات معمولی این افراد را حذف کن.
8) اظهارات و مصاحبه‌های مقامات نظامی داخلی و خارجی را، وقتی صرفاً حرف/موضع‌گیری/تهدید/تحلیل است و رویداد واقعی جدیدی پشت آن نیست، حذف کن.
9) اظهارات نمایندگان مجلس و چهره‌های سیاسی را اگر فقط نظر، واکنش، انتقاد، وعده یا موضع‌گیری است حذف کن.
10) در موضوع جنگ نیز تحلیل روانی/سیاسی، تهدید لفظی و «آرایش جنگی» را حذف کن؛ اما حمله واقعی، شلیک/اصابت موشک، عملیات نظامی واقعی، انفجار مهم، تلفات واقعی یا تصمیم اجرایی با اثر جدی را می‌توان publishable=true کرد.
11) پزشکیان استثناست: خبر را فقط به خاطر نام «پزشکیان» حذف نکن. درباره او هم همان معیار ارزش خبری را اعمال کن؛ اگر رویداد واقعی و مهم باشد منتشر شود.
12) فقط خبرهای اقتصادی، بازار، ارز و طلا، مسکن، فناوری، هوش مصنوعی، پزشکی و سلامت، خودرو و علم را بر اساس اثر و اهمیت واقعی ارزیابی کن. خبر سیاسی، نظامی یا ورزشی در هر شرایطی publishable=false است.
13) برای امتیازدهی اهمیت از این مقیاس ثابت استفاده کن: 0 تا 7 کم‌اهمیت؛ 8 تا 12 معمولی؛ 13 تا 15 مهم و دارای اثر ملموس؛ 16 تا 20 بسیار مهم و دارای اثر گسترده/فوری.
14) فقط به کلمات تحریک‌آمیز عنوان، عبارت‌هایی مثل «اعلام شد»، «رسید» یا وجود یک درصد بزرگ امتیاز بالا نده؛ اثر واقعی، تازگی، اندازه پیامد، تعداد افراد/بازارهای متأثر و اعتبار اطلاعات را بسنج.
15) خبر دارای عدد مشخص و اثر اقتصادی/اجتماعی قابل‌توجه، مثل جهش بزرگ هزینه یا تورم مصالح، می‌تواند مهم باشد؛ خبر تکراری، جزئی، تبلیغاتی یا صرفاً نقل‌قولی نباید مهم شود.
16) امتیاز کلی importance و امتیازهای topic_scores باید با هم سازگار باشند؛ امتیاز هر موضوع فقط وقتی بالا باشد که خبر هم واقعاً به آن موضوع مربوط باشد و هم اثر قابل‌توجهی داشته باشد.
17) از هر رویداد فقط نمایندهٔ اصلی را مهم علامت بزن؛ گزارش‌های تکراری همان رویداد را به‌عنوان خبر مهم جداگانه انتخاب نکن.
18) اطلاعات را جعل نکن و از متن ورودی چیزی اضافه نکن.
19) content_type را یکی از این مقادیر کوتاه انتخاب کن: real_event, economic_news, market_news, technology_news, health_news, science_news, auto_news, political_statement, military_statement, parliamentary_statement, commentary, personal_fluff, advertising, rumor, duplicate, other.
15) اگر publishable=false است، reject_reason کوتاه و مشخص بنویس.
16) JSON فقط و بدون توضیح اضافی.

ساختار:
{"items":[{"id":"...","topics":["economy"],"importance":0,"topic_scores":{"economy":0},"publishable":true,"content_type":"economic_news","reject_reason":"","group_id":"...","representative":true,"reason":"کوتاه"}],"groups":[{"group_id":"...","representative_id":"..."}]}

خبرهای نامزد:
""" + json.dumps(payload,ensure_ascii=False) + """

خبرهای قبلاً تحلیل‌شده برای تشخیص تکراری‌های بین اجراها:
""" + json.dumps(existing,ensure_ascii=False)

        try:
            result=call_ai(prompt,key,groq_key,OpenRouter_key)
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
        if GEMINI_QUOTA_BLOCKED and float(usage.get("quota_block_until_epoch",0) or 0) <= time.time():
            block_until = time.time() + QUOTA_DEFAULT_COOLDOWN_SECONDS
            usage["quota_block_until_epoch"] = block_until
            usage["quota_block_until"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(block_until))
            print(f"Gemini quota cooldown recorded until {usage['quota_block_until']}; OpenRouter will remain enabled.")
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

    if GEMINI_QUOTA_BLOCKED and float(usage.get("quota_block_until_epoch",0) or 0) <= time.time():
        block_until = time.time() + QUOTA_DEFAULT_COOLDOWN_SECONDS
        usage["quota_block_until_epoch"] = block_until
        usage["quota_block_until"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(block_until))
    ai["usage"]=usage
    if candidates and successful_batches==0:
        if float(usage.get("quota_block_until_epoch",0) or 0) > time.time():
            print("Gemini quota exhausted; continuing with local editorial/article engine.")
        else:
            print(f"::warning::No news were analyzed successfully; continuing with local editorial/article engine.")

    if failed_batches:
        print(f"::warning::{failed_batches} batch(es) failed; successful batches were preserved.")

    rebuild_groups(ai)
    apply_local_selection(ai)
    save_ai(ai)
    if int(usage.get("requests", 0) or 0) < DAILY_REQUEST_BUDGET:
        try:
            article_db = generate_permanent_articles(items, ai, key, groq_key, OpenRouter_key)
            usage["requests"] = int(usage.get("requests", 0) or 0) + 1
            usage["last_article_generation"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            ai["usage"] = usage
            attach_permanent_article_links(ai, article_db)
            save_ai(ai)
        except Exception as e:
            print(f"Permanent article generation failed: {e}")
            attach_permanent_article_links(ai, load_json(ARTICLES, {"items": {}}))
            save_ai(ai)
    else:
        attach_permanent_article_links(ai, load_json(ARTICLES, {"items": {}}))
        save_ai(ai)
    write_editorial(ai,load_json(EDITORIAL,{"items":{}}))
    print(f"AI complete: {len(ai['items'])} items | successful batches: {successful_batches} | failed batches: {failed_batches} | daily requests: {int(usage.get('requests',0) or 0)}/{DAILY_REQUEST_BUDGET} | editorial written: {len(ai['items'])}")


if __name__=="__main__":
    main()
