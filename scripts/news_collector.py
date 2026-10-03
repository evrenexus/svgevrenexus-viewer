#!/usr/bin/env python3
import json, re, hashlib, html
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"news.json"
UA="Mozilla/5.0 (compatible; EvrenNexusNewsBot/1.0; +https://evrenexus.github.io/svgevrenexus-viewer/)"

SOURCES=[
 {"name":"دنیای اقتصاد","category":"اقتصاد و سرمایه‌گذاری","site":"https://donya-e-eqtesad.com/","feeds":["https://donya-e-eqtesad.com/feeds/"]},
 {"name":"اقتصادنیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://www.eghtesadnews.com/","feeds":["https://www.eghtesadnews.com/feeds"]},
 {"name":"تجارت‌نیوز","category":"اقتصاد و سرمایه‌گذاری","site":"https://tejaratnews.com/","feeds":["https://tejaratnews.com/feed/"]},
 {"name":"بورس‌نیوز","category":"بورس و بازار سرمایه","site":"https://www.boursenews.ir/","feeds":["https://www.boursenews.ir/rss"]},
 {"name":"صدای بورس","category":"بورس و بازار سرمایه","site":"https://sedayebourse.ir/","feeds":[]},
 {"name":"فردای اقتصاد","category":"بورس و بازار سرمایه","site":"https://www.fardayeeghtesad.com/","feeds":[]},
 {"name":"زومیت","category":"فناوری و علم","site":"https://www.zoomit.ir/","feeds":["https://www.zoomit.ir/feed/"]},
 {"name":"دیجیاتو","category":"فناوری و علم","site":"https://digiato.com/","feeds":["https://digiato.com/feed/"]},
 {"name":"پیوست","category":"فناوری و علم","site":"https://peivast.com/","feeds":["https://peivast.com/feed/"]},
 {"name":"دکترتو","category":"پزشکی و سلامت","site":"https://doctoreto.com/","feeds":[]},
 {"name":"پذیرش۲۴","category":"پزشکی و سلامت","site":"https://www.paziresh24.com/","feeds":[]},
 {"name":"اوما","category":"پزشکی و سلامت","site":"https://ooma.org/","feeds":[]},
]

def fetch(url):
    req=Request(url,headers={"User-Agent":UA,"Accept":"application/rss+xml,application/atom+xml,application/xml,text/html;q=0.9,*/*;q=0.5"})
    with urlopen(req,timeout=20) as r:
        return r.read(), r.headers.get("content-type","")

def discover(home):
    data,_=fetch(home)
    text=data.decode("utf-8","ignore")
    found=[]
    for m in re.finditer(r'<link[^>]+>',text,re.I):
        tag=m.group(0)
        if re.search(r'rel=["\'][^"\']*(alternate|feed)[^"\']*["\']',tag,re.I) and re.search(r'type=["\'][^"\']*(rss|atom|xml)[^"\']*["\']',tag,re.I):
            h=re.search(r'href=["\']([^"\']+)',tag,re.I)
            if h: found.append(urljoin(home,h.group(1)))
    for p in ("/feed/","/feed","/rss","/rss/","/feeds/","/feeds"):
        found.append(urljoin(home,p))
    return list(dict.fromkeys(found))

def txt(v):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", v or ""))).strip()

def parse(data,source):
    root=ET.fromstring(data)
    atom=root.tag.lower().endswith("feed")
    nodes=list(root.findall("item")) if not atom else list(root.findall("{http://www.w3.org/2005/Atom}entry"))
    out=[]
    for n in nodes[:30]:
        def get(tag):
            x=n.find(tag)
            if x is not None and x.text: return x.text.strip()
            return ""
        title=get("title") or get("{http://www.w3.org/2005/Atom}title")
        if atom:
            links=n.findall("{http://www.w3.org/2005/Atom}link")
            link=next((x.attrib.get("href","") for x in links if x.attrib.get("rel","alternate")=="alternate"),"")
            link=link or (links[0].attrib.get("href","") if links else "")
            date=get("{http://www.w3.org/2005/Atom}published") or get("{http://www.w3.org/2005/Atom}updated")
            desc=get("{http://www.w3.org/2005/Atom}summary") or get("{http://www.w3.org/2005/Atom}content")
        else:
            link=get("link")
            date=get("pubDate") or get("date") or get("{http://purl.org/dc/elements/1.1/}date")
            desc=get("description") or get("{http://purl.org/rss/1.0/modules/content/}encoded")
        link=html.unescape(link.strip())
        if link and not re.match(r"^https?://",link):
            link=urljoin(source["site"],link)
        if not title or not link or not re.match(r"^https?://",link): continue
        base=source["site"].rstrip("/")
        if link.rstrip("/") in {base,base+"/feed",base+"/feeds"}: continue
        image=""
        m=re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)',desc,re.I)
        if m: image=urljoin(link,m.group(1))
        out.append({"id":hashlib.sha256(link.encode()).hexdigest()[:20],"title":txt(title),"summary":txt(desc)[:500],"url":link,"image":image,"source":source["name"],"category":source["category"],"published":date})
    return out

def main():
    old=json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"updated":"","items":[],"sources":[]}
    existing={x["id"]:x for x in old.get("items",[])}
    status=[]
    for s in SOURCES:
        candidates=list(s["feeds"])
        # Only try homepage autodiscovery if no explicit feed succeeds.
        got=[]
        for u in dict.fromkeys(candidates):
            try:
                data,ctype=fetch(u)
                if b"<rss" in data[:2000].lower() or b"<feed" in data[:2000].lower() or "xml" in ctype.lower():
                    got=parse(data,s)
                    if got: break
            except Exception:
                continue
        if not got:
            try:
                discovered=discover(s["site"])
            except Exception:
                discovered=[]
            for u in dict.fromkeys(discovered):
                try:
                    data,ctype=fetch(u)
                    if b"<rss" in data[:2000].lower() or b"<feed" in data[:2000].lower() or "xml" in ctype.lower():
                        got=parse(data,s)
                        if got: break
                except Exception:
                    continue
        for item in got:
            existing[item["id"]]=item
        status.append({"name":s["name"],"category":s["category"],"ok":bool(got),"items":len(got)})
    items=list(existing.values())
    items=[x for x in items if x.get("title") and re.match(r"^https?://",x.get("url",""))]
    items.sort(key=lambda x:x.get("published",""),reverse=True)
    items=items[:300]
    if len(items) < 20:
        print("WARNING: fewer than 20 real articles collected:", len(items))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps({"updated":datetime.now(timezone.utc).isoformat(),"items":items,"sources":status},ensure_ascii=False,indent=2),encoding="utf-8")
    print("items:",len(items))
    print("sources:",status)

if __name__=="__main__": main()
