#!/usr/bin/env python3
import json, re, hashlib, html, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"news.json"
UA="Mozilla/5.0 (compatible; EvrenNexusNewsBot/1.0; +https://evrenexus.github.io/svgevrenexus-viewer/)"
LATEST_PER_SOURCE=50
FEED_SCAN_LIMIT=50
IMAGE_ENRICH_LIMIT=20
IMAGE_FETCH_TIMEOUT=3

SOURCES=[
 {"name":"دنیای اقتصاد","category":"اقتصاد و سرمایه‌گذاری","site":"https://donya-e-eqtesad.com/","feeds":["https://donya-e-eqtesad.com/feeds/"]},
 {"name":"اقتصادنیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://www.eghtesadnews.com/","feeds":["https://www.eghtesadnews.com/feeds"]},
 {"name":"تجارت‌نیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://tejaratnews.com/","feeds":["https://tejaratnews.com/feed/"]},
 {"name":"بورس‌نیوز","category":"بورس و بازار سرمایه","site":"https://www.boursenews.ir/","feeds":["https://www.boursenews.ir/rss"]},
 {"name":"صدای بورس","category":"بورس و بازار سرمایه","site":"https://sedayebourse.ir/","feeds":[]},
 {"name":"فردای اقتصاد","category":"بورس و بازار سرمایه","site":"https://www.fardayeeghtesad.com/","feeds":[]},
 {"name":"دیجیاتو","category":"فناوری و علم","site":"https://digiato.com/","feeds":["https://digiato.com/feed/"]},
 {"name":"پیوست","category":"فناوری و علم","site":"https://peivast.com/","feeds":["https://peivast.com/feed/"]},
 {"name":"سلامت نیوز","category":"پزشکی و سلامت","site":"https://www.salamatnews.com/","feeds":["https://www.salamatnews.com/rss.xml"]},
 {"name":"پزشک سایت","category":"پزشکی و سلامت","site":"https://www.pezeshk-site.ir/","feeds":["https://www.pezeshk-site.ir/feed/"]},
]

TOPIC_RULES={
 "economy":["اقتصاد","اقتصادی","تورم","رشد اقتصادی","بودجه","مالیات","بانک مرکزی","نرخ بهره","نقدینگی","تجارت","صادرات","واردات","تولید","رکود","اشتغال","دستمزد","معیشت","کسب و کار","کسب‌وکار","بازرگانی","صنعت","کشاورزی","نفت","گاز","انرژی"],
 "markets":["بورس","بازار سرمایه","شاخص کل","شاخص هم‌وزن","فرابورس","سهام","نماد معاملاتی","عرضه اولیه","پذیره‌نویسی","بورس کالا","صندوق سرمایه‌گذاری","اوراق","حق تقدم","مجمع شرکت","کدال","پرتفوی","سرمایه‌گذاری"],
 "currency-gold":["دلار","یورو","درهم","پوند","لیر","یوان","روبل","ارز","نرخ ارز","بازار ارز","طلا","سکه","طلای آبشده","آبشده","اونس","انس طلا","نقره"],
 "real-estate":["مسکن","املاک","ملک","آپارتمان","خانه","اجاره","رهن","زمین","ساختمان","ساخت‌وساز","ساخت و ساز","پروانه ساختمانی","نهضت ملی مسکن","وام مسکن","قیمت مسکن"],
 "technology":["فناوری","تکنولوژی","اینترنت","وب","موبایل","گوشی هوشمند","لپ‌تاپ","رایانه","کامپیوتر","گجت","نرم‌افزار","سخت‌افزار","سیستم‌عامل","اپلیکیشن","شبکه","امنیت سایبری","داده","استارتاپ"],
 "ai":["هوش مصنوعی","هوش مصنوعی مولد","مدل زبانی","مدل بزرگ زبانی","LLM","AI","ChatGPT","OpenAI","Gemini","Claude","Copilot","ماشین لرنینگ","یادگیری ماشین","یادگیری عمیق","ربات هوشمند"],
 "health":["پزشکی","سلامت","درمان","بیماری","بیمار","پزشک","دارو","دارویی","بیمارستان","کلینیک","جراحی","سرطان","قلب","دیابت","فشار خون","تغذیه","بهداشت","واکسن","ویروس"],
 "auto":["خودرو","اتومبیل","ماشین","خودروساز","خودروسازی","خودرو برقی","خودروهای برقی","خودروی برقی","بنزین","موتورسیکلت","قطعه خودرو","قیمت خودرو"],
 "science-life":["علم","پژوهش","دانشگاه","دانش‌آموز","آموزش","کنکور","آزمون","نتایج آزمون","محیط زیست","آلودگی هوا","اقلیم","آب و هوا","فضا","نجوم","ستاره","سیاره","زیست‌شناسی","فیزیک","شیمی","سبک زندگی","گردشگری","کتاب","فرهنگ"]
}
POLITICAL_HINTS=["انتخابات","نماینده مجلس","مجلس شورای اسلامی","رئیس جمهور","رییس جمهور","وزیر","وزارت کشور","سیاست خارجی","دیپلماسی","تحریم","حزب","رأی‌گیری","رای‌گیری","کابینه","مذاکره سیاسی"]\nBLOCKED_TITLE_TERMS=["اسرائیل","اسراییل","جنگ","رژیم صهیونیستی","فلسطین","یمن","حوثی ها","حوثی‌ها","طالبان"]

def normalize_text(value):
    value=str(value or "").replace("ي","ی").replace("ى","ی").replace("ك","ک").replace("ۀ","ه")
    value=value.replace("\u200c"," ").replace("\u200f"," ").replace("\u200e"," ")
    return re.sub(r"\s+"," ",value).strip().lower()

def classify_topics(item):
    title=normalize_text(item.get("title",""))
    summary=normalize_text(item.get("summary",""))
    text=title+" "+title+" "+summary
    scores={}
    for topic,keywords in TOPIC_RULES.items():
        score=0
        for kw in keywords:
            k=normalize_text(kw)
            if k and k in text: score += 3 if k in title else 1
        scores[topic]=score
    source_boost={"پزشکی و سلامت":{"health":2},"فناوری و علم":{"technology":1,"science-life":1},"بورس و بازار سرمایه":{"markets":2},"اقتصاد و سرمایه‌گذاری":{"economy":2}}
    for topic,boost in source_boost.get(item.get("category",""),{}).items(): scores[topic]=scores.get(topic,0)+boost
    political=sum(2 if normalize_text(k) in title else 1 for k in POLITICAL_HINTS if normalize_text(k) in text)
    ranked=sorted(scores.items(),key=lambda x:x[1],reverse=True)
    topics=[topic for topic,score in ranked if score>=3]
    if political>=4 and (not ranked or ranked[0][1] < political): return []
    return topics[:4]

def fetch(url):
    req=Request(url,headers={"User-Agent":UA,"Accept":"application/rss+xml,application/atom+xml,application/xml,text/html;q=0.9,*/*;q=0.5"})
    last=None
    for attempt in range(2):
        try:
            with urlopen(req,timeout=8) as r: return r.read(), r.headers.get("content-type","")
        except Exception as e:
            last=e
            if attempt < 1: time.sleep(1)
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
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception: pass
    try:
        dt=datetime.fromisoformat(value.replace("Z","+00:00"))
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception: return ""

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
                    if re.match(r"^https?://",candidate,re.I):
                        image=candidate; break
                if tag=="enclosure":
                    candidate=x.attrib.get("url","")
                    if re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)",candidate,re.I):
                        image=urljoin(link,candidate); break
        out.append({"id":hashlib.sha256(link.encode()).hexdigest()[:20],"title":txt(title),"summary":txt(desc)[:500],"url":link,"image":image,"source":source["name"],"category":source["category"],"published":parse_date(date),"topics":[]})
    out.sort(key=lambda x:date_key(x.get("published","")),reverse=True)
    return out[:LATEST_PER_SOURCE]

def fetch_article_image(url):
    try:
        req=Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.5"})
        with urlopen(req,timeout=IMAGE_FETCH_TIMEOUT) as r: data=r.read(700000)
        text=data.decode("utf-8","ignore")
        return first_image_from_html(text,url)
    except Exception: return ""

def enrich_images(items,limit=IMAGE_ENRICH_LIMIT):
    targets=[]
    for item in sorted(items,key=lambda x:date_key(x.get("published","")),reverse=True):
        current=str(item.get("image") or "")
        needs=not current or "/thumbnail/" in current.lower() or "thumb" in current.lower()
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
            if better and better!=item.get("image",""):
                item["image"]=better; changed+=1
    return changed

def is_valid_item(item,now_ts):
    url=str(item.get("url","")).strip(); title=str(item.get("title","")).strip(); published=str(item.get("published","")).strip()
    if not title or not re.match(r"^https?://",url): return False
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
            x["topics"]=classify_topics(x); existing[x["id"]]=x
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
        for item in valid: item["topics"]=classify_topics(item)
        latest=max((date_key(x.get("published","")) for x in valid),default=0)
        info={"name":s["name"],"category":s["category"],"ok":bool(valid),"items":len(valid),"attempted_at":attempted_at,"last_success_at":datetime.now(timezone.utc).isoformat() if valid else "","last_article_published":datetime.fromtimestamp(latest,timezone.utc).isoformat() if latest else "","error":"" if valid else (" | ".join(errors[-3:])[:600] if errors else "no feed found")}
        return valid,info

    status=[]
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:
        futures=[pool.submit(collect_source,s) for s in SOURCES]
        for future in as_completed(futures):
            try:
                items,info=future.result()
                for item in items: existing[item["id"]]=item
                status.append(info)
            except Exception as e:
                status.append({"name":"unknown","category":"","ok":False,"items":0,"attempted_at":now.isoformat(),"last_success_at":"","last_article_published":"","error":type(e).__name__+": "+str(e)[:600]})

    all_items=list(existing.values())
    enrich_images(all_items)
    all_items=[x for x in all_items if is_valid_item(x,now_ts)]
    all_items.sort(key=lambda x:date_key(x.get("published","")),reverse=True)
    all_items=all_items[:300]
    OUT.write_text(json.dumps({"updated":now.isoformat(),"items":all_items,"sources":status},ensure_ascii=False,indent=2),encoding="utf-8")

if __name__=="__main__":
    main()
