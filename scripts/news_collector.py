#!/usr/bin/env python3
# manual refresh trigger 2026-10-04
#!/usr/bin/env python3
import json, re, hashlib, html, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urljoin
from difflib import SequenceMatcher
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"news.json"
UA="Mozilla/5.0 (compatible; EvrenNexusNewsBot/1.0; +https://evrenexus.github.io/svgevrenexus-viewer/)"
LATEST_PER_SOURCE=14
FEED_SCAN_LIMIT=50
IMAGE_ENRICH_LIMIT=50
IMAGE_FETCH_TIMEOUT=3
SOURCE_FETCH_TIMEOUT=8
SOURCE_FETCH_RETRIES=2
RETRY_BACKOFF_SECONDS=1
TEHRAN_TZ=ZoneInfo("Asia/Tehran")
DUPLICATE_WINDOW_HOURS=48

SOURCES=[
 {"name":"دنیای اقتصاد","category":"اقتصاد و سرمایه‌گذاری","site":"https://donya-e-eqtesad.com/","feeds":["https://donya-e-eqtesad.com/feeds/"],"allow_internal_republish":True},
 {"name":"اقتصادنیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://www.eghtesadnews.com/","feeds":["https://www.eghtesadnews.com/feeds"],"allow_internal_republish":True},
 {"name":"تجارت‌نیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://tejaratnews.com/","feeds":["https://tejaratnews.com/feed/"],"allow_internal_republish":True},
 {"name":"بورس‌نیوز","category":"بورس و بازار سرمایه","site":"https://www.boursenews.ir/","feeds":["https://www.boursenews.ir/rss"],"allow_internal_republish":True},
 {"name":"صدای بورس","category":"بورس و بازار سرمایه","site":"https://sedayebourse.ir/","feeds":[],"allow_internal_republish":True},
 {"name":"فردای اقتصاد","category":"بورس و بازار سرمایه","site":"https://www.fardayeeghtesad.com/","feeds":[],"allow_internal_republish":True},
 {"name":"پیوست","category":"فناوری و علم","site":"https://peivast.com/","feeds":["https://peivast.com/feed/"],"allow_internal_republish":True},
 {"name":"سلامت نیوز","category":"پزشکی و سلامت","site":"https://www.salamatnews.com/","feeds":["https://www.salamatnews.com/rss.xml"],"allow_internal_republish":True},
 {"name":"پزشک سایت","category":"پزشکی و سلامت","site":"https://www.pezeshk-site.ir/","feeds":["https://www.pezeshk-site.ir/feed/"],"allow_internal_republish":True},
 {"name":"انتخاب","category":"اقتصاد و سرمایه‌گذاری","site":"https://www.entekhab.ir/","feeds":["https://www.entekhab.ir/fa/rss/1"],"allow_internal_republish":True},
 {"name":"فرارو","category":"اقتصاد و سرمایه‌گذاری","site":"https://fararu.com/","feeds":["https://fararu.com/fa/rss"],"allow_internal_republish":True},
]

TOPIC_RULES={
 "economy":{"strong":["اقتصاد","اقتصادی","تورم","رشد اقتصادی","بودجه","مالیات","بانک مرکزی","نرخ بهره","نقدینگی","تجارت خارجی","صادرات","واردات","رکود اقتصادی","اشتغال","دستمزد","معیشت","کسب و کار","کسب‌وکار","بازرگانی","سیاست اقتصادی","تولید ناخالص داخلی","gdp","شاخص قیمت","تورم سالانه","تورم نقطه‌ای","تورم ماهانه","درآمد سرانه"],"medium":["تولید","صنعت","کشاورزی","نفت","گاز","انرژی","تجارت","رکود","بازار کار","هزینه تولید","قیمت کالا","قیمت محصولات","زنجیره تامین","سرمایه‌گذاری خارجی","اقتصاد ایران"]},
 "markets":{"strong":["بورس","بازار سرمایه","شاخص کل","شاخص هم‌وزن","فرابورس","سهام","نماد معاملاتی","عرضه اولیه","پذیره‌نویسی","بورس کالا","صندوق سرمایه‌گذاری","اوراق بهادار","حق تقدم","مجمع شرکت","کدال","پرتفوی","معاملات بورس","بازار سهام","شاخص بورس","ارزش معاملات","حجم معاملات","صف خرید","صف فروش","افزایش سرمایه"],"medium":["سرمایه‌گذاری","سهم","بازدهی بورس","معاملات سهام","بازار مالی","بازار پول","بازده","سهامداران","شرکت بورسی"]},
 "currency-gold":{"strong":["دلار","یورو","درهم","پوند","لیر","یوان","روبل","دینار","نرخ ارز","بازار ارز","طلا","سکه","طلای آبشده","آبشده","اونس طلا","انس طلا","نقره","قیمت طلا","قیمت سکه","قیمت دلار","قیمت یورو","قیمت درهم","حواله ارزی","مرکز مبادله","بازار متشکل ارزی"],"medium":["ارز","اونس","انس","حواله","نرخ دلار","نرخ یورو","نرخ لیر"]},
 "real-estate":{"strong":["مسکن","بازار مسکن","املاک","ملک","املاک و مستغلات","آپارتمان","واحد مسکونی","اجاره مسکن","بازار اجاره","اجاره‌بها","اجاره بها","رهن و اجاره","رهن کامل","مستاجر","موجر","زمین مسکونی","قیمت مسکن","قیمت آپارتمان","قیمت ملک","معاملات مسکن","معاملات ملکی","خرید خانه","فروش خانه","خرید و فروش ملک","وام مسکن","تسهیلات مسکن","بانک مسکن","وام ودیعه","ودیعه مسکن","نهضت ملی مسکن","مسکن ملی","طرح جامع مسکن","بافت فرسوده","مشاور املاک","بنگاه املاک","کمیسیون املاک","انبوه‌ساز","انبوه ساز","ساخت مسکن","سرمایه‌گذاری در مسکن"],"medium":["خانه","زمین","ساختمان","ساخت‌وساز","ساخت و ساز","سازنده","ساختمان‌سازی","ساختمان سازی","شهرسازی","عمران","پروانه ساختمانی","پروانه ساخت","تراکم ساختمانی","کاربری زمین","اراضی","قطعه زمین","واحد","ملک مسکونی","خانه‌دار","خانه دار","اجاره‌نشینی","اجاره نشینی"]},
 "technology":{"strong":["فناوری","تکنولوژی","اینترنت","گوشی هوشمند","لپ‌تاپ","رایانه","کامپیوتر","گجت","نرم‌افزار","سخت‌افزار","سیستم‌عامل","اپلیکیشن","امنیت سایبری","شبکه کامپیوتری","استارتاپ فناوری","هوش مصنوعی در فناوری","پردازنده","تراشه","چیپ","داده‌های دیجیتال","فضای ابری","رایانش ابری","پلتفرم دیجیتال","شبکه اجتماعی","پیام‌رسان"],"medium":["وب","موبایل","شبکه","داده","استارتاپ","دیجیتال","آنلاین","اپ","پردازنده","دوربین","نمایشگر","باتری"]},
 "ai":{"strong":["هوش مصنوعی","هوش مصنوعی مولد","مدل زبانی","مدل بزرگ زبانی","llm","chatgpt","openai","gemini","claude","copilot","یادگیری ماشین","یادگیری عمیق","ماشین لرنینگ","ربات هوشمند","مدل هوش مصنوعی","مدل مولد","عامل هوش مصنوعی","ایجنت هوش مصنوعی"],"medium":["مولد","مدل زبانی","چت‌بات","چت بات","ربات گفتگو","پردازش زبان طبیعی","بینایی ماشین","هوش مصنوعی در کسب‌وکار"]},
 "health":{"strong":["پزشکی","سلامت","درمان","بیماری","پزشک","دارو","دارویی","بیمارستان","کلینیک","جراحی","سرطان","دیابت","فشار خون","واکسن","ویروس","بیماری قلبی","پزشکی بالینی","پزشکی قانونی","داروخانه","بیماران","علائم بیماری","پیشگیری از بیماری"],"medium":["بیمار","قلب","تغذیه","بهداشت","سلامت روان","روانشناسی","بارداری","کودک","سالمندان","واکسن","عفونت","سردرد","تب","فشارخون"]},
 "auto":{"strong":["خودرو","اتومبیل","خودروساز","خودروسازی","خودرو برقی","خودروهای برقی","خودروی برقی","موتورسیکلت","قطعه خودرو","قیمت خودرو","بازار خودرو","خرید خودرو","فروش خودرو","خودروی وارداتی","واردات خودرو","خودرو داخلی","خودروهای داخلی","خودروهای چینی","تولید خودرو"],"medium":["ماشین","بنزین","سوخت","قطعات خودرو","لاستیک خودرو","تایر","گیربکس","موتور خودرو","پلاک","معاینه فنی"]},
 "science-life":{"strong":["علم","پژوهش","دانشگاه","دانش‌آموز","کنکور","نتایج آزمون","محیط زیست","آلودگی هوا","اقلیم","آب و هوا","فضا","نجوم","ستاره","سیاره","زیست‌شناسی","فیزیک","شیمی","سبک زندگی","گردشگری","زمین‌شناسی","باستان‌شناسی","حیات وحش","حیوانات","کتاب","فرهنگ","هنر","سینما","موسیقی"],"medium":["آموزش","آزمون","کتاب","فرهنگ","گردشگری","سفر","هنرمند","بازیگر","فیلم","سریال","موزه","میراث فرهنگی","دانشجو","مدرسه"]}
}
GENERIC_TOPIC_WORDS={"economy":["تولید","صنعت","کشاورزی","تجارت","اشتغال"],"markets":["سرمایه‌گذاری","سهم","بازده"],"currency-gold":["ارز","اونس","انس","حواله"],"real-estate":["خانه","زمین","ساختمان","ساخت‌وساز","ساخت و ساز","واحد","ساخت"],"technology":["وب","موبایل","شبکه","داده","استارتاپ","دیجیتال"],"health":["بیمار","قلب","تغذیه","بهداشت","کودک"],"auto":["ماشین","بنزین","سوخت","موتور"],"science-life":["آموزش","آزمون","کتاب","فرهنگ","سفر","فیلم","هنر"]}
POLITICAL_HINTS=["انتخابات","نماینده مجلس","مجلس شورای اسلامی","رئیس جمهور","رییس جمهور","وزیر","وزارت کشور","سیاست خارجی","دیپلماسی","تحریم","حزب","رأی‌گیری","رای‌گیری","کابینه","مذاکره سیاسی"]
BLOCKED_TITLE_TERMS=["اسرائیل","اسراییل","اسرائیلی","اسراییلی","جنگ","جنگی","جنگ‌ها","جنگها","درگیری","درگیری‌ها","درگیریها","رژیم صهیونیستی","رژیم صهیونیست","صهیونیست","صهیونیستی","فلسطین","فلسطینی","غزه","یمن","حوثی ها","حوثی‌ها","حوثی","طالبان","طالبانی","کره شمالی","کره‌شمالی","موشک","موشکی","بالستیک","بالستیکی","شهید","شهدا","شهیدان","شهادت","شهادت‌طلب","شهیدانه","رهبر","رهبری","مقام معظم رهبری","مقام معظم","خامنه‌ای","خامنه ای","خامنه‌ئی","آیت‌الله خامنه‌ای","آیت الله خامنه ای","آیت‌الله خامنه ای","آیت الله خامنه‌ای","حضرت آیت‌الله خامنه‌ای","حضرت آیت الله خامنه ای","امام خامنه‌ای","امام خامنه ای","رهبر انقلاب","رهبری انقلاب","آقا","آقای خامنه‌ای","آقای خامنه ای","جان فدا","جان‌فدا","جانفدا","بسیج","بسیجی","بسیجیان","بسیج مردمی","سپاه","سپاهی","سپاهیان","سپاه پاسداران","سپاه پاسداران انقلاب اسلامی","ترامپ","ترامپِ","ترامپ‌ها","ترامپها","هگست","پیت هگست","پیت‌هگست","نتانیاهو","بنیامین نتانیاهو","روبیو","مارکو روبیو","مارکو‌روبیو"]

def normalize_text(value):
    value=str(value or "").replace("ي","ی").replace("ى","ی").replace("ك","ک").replace("ۀ","ه")
    value=value.replace("‌"," ").replace("‏"," ").replace("‎"," ")
    return re.sub(r"\s+"," ",value).strip().lower()

def is_blocked_title(item):
    title=normalize_text(item.get("title",""))
    return any(_contains(title,term) for term in BLOCKED_TITLE_TERMS)

def _contains(text, phrase):
    phrase=normalize_text(phrase)
    if not phrase: return False
    if " " not in phrase:
        if re.fullmatch(r"[a-z0-9]+", phrase):
            return re.search(r"(?<![a-z0-9])"+re.escape(phrase)+r"(?![a-z0-9])", text) is not None
        return re.search(r"(?<!\w)"+re.escape(phrase)+r"(?!\w)", text, re.UNICODE) is not None
    return phrase in text

def fallback_topic(item):
    return {"اقتصاد و سرمایه‌گذاری":"economy","بورس و بازار سرمایه":"markets","فناوری و علم":"technology","پزشکی و سلامت":"health"}.get(item.get("category",""))

def classify_topics(item):
    title=normalize_text(item.get("title","")); summary=normalize_text(item.get("summary","")); scores={}; strong_hits={}
    for topic,groups in TOPIC_RULES.items():
        score=0; hits=0; title_strong=0
        for kw in groups["strong"]:
            if _contains(title,kw): score+=10; hits+=1; title_strong+=1
            elif _contains(summary,kw): score+=5; hits+=1
        medium_title=sum(1 for kw in groups["medium"] if _contains(title,kw)); medium_summary=sum(1 for kw in groups["medium"] if _contains(summary,kw))
        score += medium_title*4 + medium_summary; hits += medium_title + medium_summary
        generic_hits=sum(1 for kw in GENERIC_TOPIC_WORDS.get(topic,[]) if _contains(title,kw)); generic_summary=sum(1 for kw in GENERIC_TOPIC_WORDS.get(topic,[]) if _contains(summary,kw))
        if generic_hits+generic_summary>=2: score+=2; hits+=1
        scores[topic]=score; strong_hits[topic]=title_strong
    source_hint={"پزشکی و سلامت":"health","فناوری و علم":"technology","بورس و بازار سرمایه":"markets","اقتصاد و سرمایه‌گذاری":"economy"}.get(item.get("category",""))
    if source_hint and scores.get(source_hint,0)>=3: scores[source_hint]+=1
    political=sum(2 if _contains(title,k) else 1 for k in POLITICAL_HINTS if _contains(title+" "+summary,k))
    ranked=sorted(scores.items(),key=lambda x:x[1],reverse=True)
    if political>=4 and (not ranked or ranked[0][1]<political): return []
    eligible=[(topic,score) for topic,score in ranked if score>=5]
    if not eligible: return []
    best_topic,best_score=eligible[0]; second_score=eligible[1][1] if len(eligible)>1 else 0
    if strong_hits.get(best_topic,0)==0 and best_score<7 and best_score-second_score<3: return []
    topics=[best_topic]
    for topic,score in eligible[1:]:
        if score>=10 and best_score-score<=8: topics.append(topic)
        if len(topics)>=2: break
    return topics

def assign_topics(item):
    topics=classify_topics(item)
    if topics: return topics
    fb=fallback_topic(item)
    return [fb] if fb else []

# ---------- duplicate-news detection ----------
DEDUP_STOPWORDS=set("از با به در برای که و یا یک این آن این‌که است شد شده هستند را راى روی رویِ درباره توسط بر تا نیز اما اگر پس علیه پس از خبر اخبار اعلام گزارش گزارشگر گفت گفتند کرد کرده کردند خواهد می‌شود شد".split())
DEDUP_SUFFIXES=("‌های","های","‌ها","ها","‌ات","ات","‌ان","ان","‌ای","ای","ی")

def dedup_stem(token):
    token=normalize_text(token).strip(".,:;!?؟،؛()[]{}'\"«»")
    if len(token)<3 or token in DEDUP_STOPWORDS: return ""
    for suffix in DEDUP_SUFFIXES:
        if token.endswith(suffix) and len(token)-len(suffix)>=3:
            token=token[:-len(suffix)]
            break
    # Common Persian inflection that otherwise splits «استعفا» / «استعفای».
    if token.endswith("ی") and len(token)>4: token=token[:-1]
    return token

def dedup_tokens(item):
    title=normalize_text(item.get("title",""))
    # Keep meaningful title words only; the event is primarily represented by the headline.
    return {t for t in (dedup_stem(x) for x in re.findall(r"[\w؀-ۿ]+",title,re.UNICODE)) if t}

def dedup_text(item):
    return "".join(sorted(dedup_tokens(item)))

def is_duplicate_news(a,b):
    if a.get("source")==b.get("source"): return False
    ta=dedup_tokens(a); tb=dedup_tokens(b)
    if not ta or not tb: return False
    shared=len(ta & tb); union=len(ta | tb)
    jaccard=shared/union if union else 0
    ratio=SequenceMatcher(None,normalize_text(a.get("title","")),normalize_text(b.get("title",""))).ratio()
    # Very similar headlines are duplicates even when one source changes word order.
    if ratio>=0.76: return True
    # Two or more meaningful shared terms plus reasonable title overlap catches
    # variants such as «استعفای وزیر نفت» / «وزیر نفت استعفا داد».
    if shared>=2 and (jaccard>=0.50 or ratio>=0.52): return True
    # A compact event headline can be worded quite differently; require three
    # shared meaningful terms to avoid merging generic stories.
    if shared>=3 and jaccard>=0.42: return True
    return False

def deduplicate_news(items):
    items=sorted(items,key=lambda x:date_key(x.get("published","")),reverse=True)
    kept=[]; duplicate_count=0
    for item in items:
        item_ts=date_key(item.get("published",""))
        duplicate=False
        for winner in kept:
            winner_ts=date_key(winner.get("published",""))
            if item_ts<=0 or winner_ts<=0: continue
            if abs(winner_ts-item_ts)>DUPLICATE_WINDOW_HOURS*3600: continue
            if is_duplicate_news(item,winner):
                duplicate=True
                duplicate_count+=1
                break
        if not duplicate: kept.append(item)
    return kept,duplicate_count

def fetch(url):
    req=Request(url,headers={"User-Agent":UA,"Accept":"application/rss+xml,application/atom+xml,application/xml,text/html;q=0.9,*/*;q=0.5"})
    last=None
    for attempt in range(SOURCE_FETCH_RETRIES):
        try:
            with urlopen(req,timeout=SOURCE_FETCH_TIMEOUT) as r: return r.read(),r.headers.get("content-type","")
        except Exception as e:
            last=e
            if isinstance(e,HTTPError) and e.code in (403,404,410): break
            if attempt+1<SOURCE_FETCH_RETRIES: time.sleep(RETRY_BACKOFF_SECONDS)
    raise last

def discover(home):
    data,_=fetch(home); text=data.decode("utf-8","ignore"); found=[]
    for m in re.finditer(r'<link[^>]+>',text,re.I):
        tag=m.group(0)
        if re.search(r'rel=["\'][^"\']*(alternate|feed)[^"\']*["\']',tag,re.I) and re.search(r'type=["\'][^"\']*(rss|atom|xml)[^"\']*["\']',tag,re.I):
            h=re.search(r'href=["\']([^"\']+)',tag,re.I)
            if h: found.append(urljoin(home,h.group(1)))
    for p in ("/feed/","/feed","/rss","/rss/","/feeds/","/feeds"): found.append(urljoin(home,p))
    return list(dict.fromkeys(found))

def txt(v):
    return re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]+>"," ",v or ""))).strip()

def parse_date(value):
    value=txt(value)
    if not value: return ""
    try:
        dt=parsedate_to_datetime(value)
        if dt.tzinfo is None: dt=dt.replace(tzinfo=TEHRAN_TZ)
        return dt.astimezone(TEHRAN_TZ).isoformat()
    except Exception: pass
    try:
        dt=datetime.fromisoformat(value.replace("Z","+00:00"))
        if dt.tzinfo is None: dt=dt.replace(tzinfo=TEHRAN_TZ)
        return dt.astimezone(TEHRAN_TZ).isoformat()
    except Exception: return ""

def normalize_published(value): return parse_date(value)

def date_key(value):
    try: return datetime.fromisoformat(value.replace("Z","+00:00")).timestamp()
    except Exception: return 0.0

def first_image_from_html(value,base_url):
    if not value: return ""
    patterns=[
        r'<meta\b[^>]*(?:property|name)=["\'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["\'][^>]*content=["\']([^"\']+)["\']',
        r'<meta\b[^>]*content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["\']',
        r'<img\b[^>]*(?:src|data-src|data-lazy-src)=["\']([^"\']+)'
    ]
    for pattern in patterns:
        m=re.search(pattern,value,re.I)
        if m:
            candidate=urljoin(base_url,html.unescape(m.group(1).strip()))
            if re.match(r"^https?://",candidate,re.I): return candidate
    return ""

def parse(data,source):
    root=ET.fromstring(data); atom=root.tag.lower().endswith("feed")
    nodes=[n for n in root.iter() if n.tag.split("}")[-1].lower()==("entry" if atom else "item")]
    out=[]
    for n in nodes[:FEED_SCAN_LIMIT]:
        def get(tag):
            wanted=tag.split("}")[-1].lower()
            for x in n.iter():
                if x.tag.split("}")[-1].lower()==wanted and x.text: return x.text.strip()
            return ""
        title=get("title")
        if atom:
            links=[x for x in n.iter() if x.tag.split("}")[-1].lower()=="link"]
            link=next((x.attrib.get("href","") for x in links if x.attrib.get("rel","alternate")=="alternate"),"") or (links[0].attrib.get("href","") if links else "")
            date=get("published") or get("updated"); desc=get("summary") or get("content")
        else:
            link=get("link"); date=get("pubDate") or get("date") or get("{http://purl.org/dc/elements/1.1/}date"); desc=get("description") or get("{http://purl.org/rss/1.0/modules/content/}encoded")
        link=html.unescape(link.strip())
        if link and not re.match(r"^https?://",link): link=urljoin(source["site"],link)
        if not title or not link or not re.match(r"^https?://",link): continue
        base=source["site"].rstrip("/")
        if link.rstrip("/") in {base,base+"/feed",base+"/feeds"}: continue
        image=first_image_from_html(desc,link)
        if not image:
            for x in n.iter():
                tag=x.tag.split("}")[-1].lower()
                if tag in {"content","thumbnail","image"}:
                    candidate=x.attrib.get("url") or x.attrib.get("href") or (x.text.strip() if x.text else "")
                    candidate=urljoin(link,html.unescape(candidate))
                    if re.match(r"^https?://",candidate,re.I): image=candidate; break
                if tag=="enclosure":
                    candidate=x.attrib.get("url","")
                    if re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)",candidate,re.I):
                        image=urljoin(link,candidate); break
        out.append({"id":hashlib.sha256(link.encode()).hexdigest()[:20],"title":txt(title),"summary":txt(desc)[:300],"content":"","url":link,"image":image,"source":source["name"],"source_site":source["site"],"allow_internal_republish":bool(source.get("allow_internal_republish")),"category":source["category"],"published":parse_date(date),"topics":[]})
    out.sort(key=lambda x:date_key(x.get("published","")),reverse=True)
    return out[:LATEST_PER_SOURCE]

def extract_article_text(url):
    try:
        req=Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.5"})
        with urlopen(req,timeout=SOURCE_FETCH_TIMEOUT) as r:
            data=r.read(1800000)
        raw=data.decode("utf-8","ignore")
        raw=re.sub(r"(?is)<(script|style|noscript|svg|iframe|nav|footer|header)[^>]*>.*?</\1>"," ",raw)
        # Prefer the semantic article/main container, then fall back to the full body.
        candidates=[]
        for pat in (r"(?is)<article\b[^>]*>(.*?)</article>",r"(?is)<main\b[^>]*>(.*?)</main>",r"(?is)<div[^>]+(?:class|id)=[\"'][^\"']*(?:article|post|news|content)[^\"']*[\"'][^>]*>(.*?)</div>"):
            candidates.extend(re.findall(pat,raw))
        body=max(candidates,key=len) if candidates else raw
        body=re.sub(r"(?is)<(p|br|li|h[1-6])[^>]*>", "\n", body)
        body=re.sub(r"(?is)</(p|br|li|h[1-6])>", "\\n", body)
        text=txt(body)
        text=re.sub(r"\n{3,}","\\n\\n",text)
        # Drop very short extraction results that are probably navigation/error pages.
        return text[:30000] if len(text)>=300 else ""
    except Exception:
        return ""

def enrich_content(items,limit=50):
    targets=[x for x in sorted(items,key=lambda x:date_key(x.get("published","")),reverse=True)
             if x.get("allow_internal_republish") and not x.get("content")][:limit]
    changed=0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures={pool.submit(extract_article_text,item.get("url","")):item for item in targets}
        for future in as_completed(futures):
            item=futures[future]
            try: content=future.result()
            except Exception: content=""
            if content:
                item["content"]=content
                changed+=1
    return changed

def fetch_article_image(url):
    try:
        req=Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.5"})
        with urlopen(req,timeout=IMAGE_FETCH_TIMEOUT) as r: data=r.read(700000)
        return first_image_from_html(data.decode("utf-8","ignore"),url)
    except Exception: return ""

def enrich_images(items,limit=IMAGE_ENRICH_LIMIT):
    targets=[]
    for item in sorted(items,key=lambda x:date_key(x.get("published","")),reverse=True):
        current=str(item.get("image") or "")
        needs=(not current or "/thumbnail/" in current.lower() or "thumb" in current.lower()) and item.get("image_tries",0)<3
        if needs:
            targets.append(item)
            if len(targets)>=limit: break
    changed=0
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures={pool.submit(fetch_article_image,item.get("url","")):item for item in targets}
        for future in as_completed(futures):
            item=futures[future]
            try: better=future.result()
            except Exception: better=""
            if better and better!=item.get("image",""): item["image"]=better; changed+=1
            else: item["image_tries"]=item.get("image_tries",0)+1
    return changed

def is_valid_item(item,now_ts):
    url=str(item.get("url","")).strip(); title=str(item.get("title","")).strip(); published=str(item.get("published","")).strip()
    if not title or not re.match(r"^https?://",url): return False
    if is_blocked_title(item): return False
    for s in SOURCES:
        base=s["site"].rstrip("/")
        if url.rstrip("/") in {base,base+"/feed",base+"/feeds",base+"/rss"}: return False
    ts=date_key(published)
    if ts<=0 or ts>now_ts+300: return False
    return True

def main():
    now=datetime.now(timezone.utc); now_ts=now.timestamp()
    old=json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"updated":"","items":[],"sources":[]}
    existing={}
    for x in old.get("items",[]):
        if isinstance(x,dict) and is_valid_item(x,now_ts):
            x["published"]=normalize_published(x.get("published",""))
            x["topics"]=assign_topics(x); existing[x["id"]]=x
    def collect_source(s):
        attempted_at=datetime.now(timezone.utc).isoformat(); got=[]; errors=[]
        for u in dict.fromkeys(s["feeds"]):
            try:
                data,ctype=fetch(u)
                if b"<rss" in data[:2000].lower() or b"<feed" in data[:2000].lower() or "xml" in ctype.lower():
                    parsed=parse(data,s)
                    if parsed: got=parsed; break
                    errors.append("feed parsed but contained no articles: "+u)
                else: errors.append("not an RSS/Atom feed: "+u)
            except Exception as e: errors.append(type(e).__name__+": "+str(e)[:180])
        if not got:
            try: discovered=discover(s["site"])
            except Exception as e: discovered=[]; errors.append("discovery: "+type(e).__name__+": "+str(e)[:180])
            for u in dict.fromkeys(discovered):
                try:
                    data,ctype=fetch(u)
                    if b"<rss" in data[:2000].lower() or b"<feed" in data[:2000].lower() or "xml" in ctype.lower():
                        parsed=parse(data,s)
                        if parsed: got=parsed; break
                        errors.append("discovered feed parsed but contained no articles: "+u)
                except Exception as e: errors.append(type(e).__name__+": "+str(e)[:180])
        valid=[x for x in got if is_valid_item(x,now_ts)]
        for item in valid:
            item["published"]=normalize_published(item.get("published","")); item["topics"]=assign_topics(item)
        latest=max((date_key(x.get("published","")) for x in valid),default=0)
        info={"name":s["name"],"category":s["category"],"ok":bool(valid),"items":len(valid),"attempted_at":attempted_at,"last_success_at":datetime.now(timezone.utc).isoformat() if valid else "","last_article_published":datetime.fromtimestamp(latest,TEHRAN_TZ).isoformat() if latest else "","error":"" if valid else (" | ".join(errors[-3:])[:600] if errors else "no feed found")}
        return valid,info
    status=[]
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:
        futures=[pool.submit(collect_source,s) for s in SOURCES]
        for future in as_completed(futures):
            try:
                items,info=future.result()
                for item in items:
                    prev=existing.get(item["id"])
                    if prev:
                        if prev.get("image") and not item.get("image"): item["image"]=prev["image"]
                        if prev.get("image_tries"): item["image_tries"]=prev["image_tries"]
                        if prev.get("content") and not item.get("content"): item["content"]=prev["content"]
                    existing[item["id"]]=item
                status.append(info)
            except Exception as e:
                status.append({"name":"unknown","category":"","ok":False,"items":0,"attempted_at":now.isoformat(),"last_success_at":"","last_article_published":"","error":type(e).__name__+": "+str(e)[:600]})
    all_items=list(existing.values())
    if not status or not any(x.get("ok") for x in status):
        print("All news sources failed; keeping previous news.json unchanged."); return
    enrich_images(all_items)
    enrich_content(all_items)
    all_items=[x for x in all_items if is_valid_item(x,now_ts)]
    all_items.sort(key=lambda x:date_key(x.get("published","")),reverse=True)
    all_items=all_items[:300]
    # Remove cross-source reports of the same event. The newest report wins.
    all_items,duplicate_count=deduplicate_news(all_items)
    all_items=all_items[:300]
    OUT.write_text(json.dumps({"updated":now.isoformat(),"items":all_items,"sources":status,"dedup":{"enabled":True,"window_hours":DUPLICATE_WINDOW_HOURS,"removed":duplicate_count}},ensure_ascii=False,indent=2),encoding="utf-8")

if __name__=="__main__":
    main()
