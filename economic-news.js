/* Evren Nexus — Economic News */
(function(){
"use strict";

function isHomePage(){
    var posts=document.querySelectorAll(".post");
    var path=location.pathname.replace(/\/+$/,"");
    if(!posts.length) return true;
    for(var i=0;i<posts.length;i++){
        var a=posts[i].querySelector(".post-title a");
        if(!a) continue;
        try{
            var p=new URL(a.href,location.href).pathname.replace(/\/+$/,"");
            if(p && p===path) return false;
        }catch(e){}
    }
    return true;
}

function init(){
    if(!isHomePage()) return;
    if(document.getElementById("Evrenxus-economic-box")) return;

    var css=document.createElement("style");
    css.textContent=
    "#Evrenxus-economic-box{width:610px;margin:0 0 22px;background:#fff}"+
    "#Evrenxus-economic-box .Evrenxus-section-title{position:relative;margin:0 0 12px;padding:0 10px 8px 0;border-bottom:2px solid #202c35;color:#202c35;font-size:14px;font-weight:700;line-height:1.8}"+
    "#Evrenxus-economic-box .Evrenxus-section-title:before{content:'';position:absolute;right:0;bottom:-2px;width:55px;height:2px;background:#d9232e}"+
    "#Evrenxus-asriran-list{border-top:1px solid #dfe2e4}"+
    ".Evrenxus-asriran-item{display:flex;width:100%;padding:10px 0;border-bottom:1px solid #e2e5e7;color:#222;text-decoration:none;direction:rtl;gap:10px}"+
    ".Evrenxus-asriran-item:hover{background:#fafafa}"+
    ".Evrenxus-asriran-image{width:105px;min-width:105px;height:78px;object-fit:cover;background:#e9ebed}"+
    ".Evrenxus-asriran-content{min-width:0;flex:1}"+
    ".Evrenxus-asriran-title{margin:0 0 6px;color:#20272d;font-size:12px;font-weight:700;line-height:1.8}"+
    ".Evrenxus-asriran-summary{color:#737a7f;font-size:10px;line-height:1.9;white-space:normal;overflow:visible}"+
    "#Evrenxus-donya-box{width:200px;margin:0 0 16px;background:#fff;border:1px solid #dfe2e4;overflow:hidden}"+
    "#Evrenxus-donya-box .Evrenxus-section-title{position:relative;margin:0;padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}"+
    "#Evrenxus-donya-box .Evrenxus-section-title:before{content:'';display:inline-block;width:4px;height:14px;margin-left:7px;vertical-align:-2px;background:#d9232e}"+
    ".Evrenxus-donya-item{display:block;padding:9px;border-bottom:1px solid #edf0f1;color:#343b40;text-decoration:none;font-size:10px;line-height:1.9}"+
    ".Evrenxus-donya-item:hover{background:#fafafa;color:#d9232e}"+
    ".Evrenxus-donya-title{font-weight:700;color:#20272d;margin-bottom:5px}"+
    ".Evrenxus-donya-summary{color:#737a7f;font-weight:400}"+
    ".Evrenxus-news-loading,.Evrenxus-news-error{padding:20px 8px;text-align:center;color:#777;font-size:10px}";
    document.head.appendChild(css);

    var contentBox=document.getElementById("content");
    var sidebar=document.getElementById("sidebar");
    if(!contentBox||!sidebar) return;

    var asriranBox=document.createElement("div");
    asriranBox.id="Evrenxus-economic-box";
    asriranBox.innerHTML='<div class="Evrenxus-section-title">عصر ایران</div><div id="Evrenxus-asriran-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';
    var breaking=document.getElementById("Evrenxus-breaking");
    if(breaking) breaking.insertAdjacentElement("afterend",asriranBox);
    else contentBox.insertBefore(asriranBox,contentBox.firstChild);

    var donyaBox=document.createElement("div");
    donyaBox.id="Evrenxus-donya-box";
    donyaBox.innerHTML='<div class="Evrenxus-section-title">دنیای اقتصاد</div><div id="Evrenxus-donya-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';
    sidebar.insertBefore(donyaBox,sidebar.firstChild);

    var asriranList=document.getElementById("Evrenxus-asriran-list");
    var donyaList=document.getElementById("Evrenxus-donya-list");
    var viewer="https://evrenexus.github.io/svgevrenexus-viewer/viewer.html";

    var feeds={
        asriran:[
            "https://www.asriran.com/fa/rss/allnews",
            "https://www.asriran.com/fa/rss/1",
            "https://news.google.com/rss/search?q=site%3Aasriran.com&hl=fa&gl=IR&ceid=IR%3Afa"
        ],
        donya:[
            "https://www.donya-e-eqtesad.com/rss",
            "https://news.google.com/rss/search?q=site%3Adonya-e-eqtesad.com&hl=fa&gl=IR&ceid=IR%3Afa"
        ]
    };

    function text(v){
        var d=document.createElement("div");
        d.innerHTML=v||"";
        return (d.textContent||d.innerText||"").replace(/\s+/g," ").trim();
    }

    function image(v){
        if(!v) return "";
        v=String(v).trim().replace(/&amp;/g,"&").replace(/&#38;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
        if(/^\/\//.test(v)) v="https:"+v;
        return /^https?:\/\//i.test(v)?v:"";
    }

    function itemImage(item){
        var v=image(item.thumbnail);
        if(v) return v;
        if(item.enclosure){
            v=image(item.enclosure.link||item.enclosure.url);
            if(v) return v;
        }
        var m=item.media||item["media:content"];
        if(m){
            if(!Array.isArray(m)) m=[m];
            for(var i=0;i<m.length;i++){
                v=image(m[i]&&(m[i].url||m[i]["@url"]||m[i].link));
                if(v) return v;
            }
        }
        var html=item["content:encoded"]||item.content||item.description||"";
        var d=document.createElement("div");
        d.innerHTML=html;
        var imgs=d.getElementsByTagName("img");
        for(var j=0;j<imgs.length;j++){
            v=image(imgs[j].getAttribute("src"))||image(imgs[j].getAttribute("data-src"))||image(imgs[j].getAttribute("data-original"));
            if(v) return v;
        }
        return "";
    }

    function dateOf(item){
        var a=[item.pubDate,item.isoDate,item.published,item.updated,item.created,item.date,item["dc:date"]];
        for(var i=0;i<a.length;i++){
            if(a[i]){
                var t=Date.parse(String(a[i]));
                if(!isNaN(t)) return t;
            }
        }
        return 0;
    }

    function rss2json(url){
        return fetch("https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(url),{cache:"no-store"})
        .then(function(r){if(!r.ok) throw Error("rss2json");return r.json()})
        .then(function(d){if(!d||!d.items||!d.items.length) throw Error("empty");return d.items});
    }

    function allorigins(url){
        return fetch("https://api.allorigins.win/raw?url="+encodeURIComponent(url),{cache:"no-store"})
        .then(function(r){if(!r.ok) throw Error("proxy");return r.text()})
        .then(function(xml){
            var doc=new DOMParser().parseFromString(xml,"text/xml");
            var nodes=[].slice.call(doc.querySelectorAll("item"));
            if(!nodes.length) throw Error("no items");
            return nodes.map(function(n){
                var get=function(tag){
                    var e=n.getElementsByTagName(tag)[0];
                    return e?e.textContent:"";
                };
                var en=n.getElementsByTagName("enclosure")[0];
                return {
                    title:get("title"),
                    link:get("link"),
                    description:get("description"),
                    content:get("content:encoded"),
                    pubDate:get("pubDate"),
                    thumbnail:"",
                    enclosure:en?{url:en.getAttribute("url")} : null
                };
            });
        });
    }

    function loadOne(url){
        return rss2json(url).catch(function(){return allorigins(url)});
    }

    function loadSource(urls){
        var p=Promise.reject();
        urls.forEach(function(u){p=p.catch(function(){return loadOne(u)})});
        return p.catch(function(){return []});
    }

    function link(item){
        var u=item.link||"";
        return viewer+"?url="+encodeURIComponent(u);
    }

    function renderAsriran(items){
        asriranList.innerHTML="";
        if(!items.length){
            asriranList.innerHTML='<div class="Evrenxus-news-error">مطالب عصر ایران دریافت نشد.</div>';
            return;
        }
        items.slice(0,10).forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-asriran-item";
            a.href=link(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var im=itemImage(item);
            if(im){
                var img=document.createElement("img");
                img.className="Evrenxus-asriran-image";
                img.src=im;
                img.alt=text(item.title);
                img.loading="lazy";
                img.onerror=function(){this.style.display="none"};
                a.appendChild(img);
            }

            var w=document.createElement("div");
            w.className="Evrenxus-asriran-content";
            var t=document.createElement("div");
            t.className="Evrenxus-asriran-title";
            t.textContent=text(item.title);
            var s=document.createElement("div");
            s.className="Evrenxus-asriran-summary";
            s.textContent=text(item.description||item.content);
            w.appendChild(t);
            if(s.textContent) w.appendChild(s);
            a.appendChild(w);
            asriranList.appendChild(a);
        });
    }

    function renderDonya(items){
        donyaList.innerHTML="";
        if(!items.length){
            donyaList.innerHTML='<div class="Evrenxus-news-error">مطالب دنیای اقتصاد دریافت نشد.</div>';
            return;
        }
        items.slice(0,10).forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-donya-item";
            a.href=link(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var t=document.createElement("div");
            t.className="Evrenxus-donya-title";
            t.textContent=text(item.title);
            var s=document.createElement("div");
            s.className="Evrenxus-donya-summary";
            s.textContent=text(item.description||item.content);
            a.appendChild(t);
            if(s.textContent) a.appendChild(s);
            donyaList.appendChild(a);
        });
    }

    Promise.all([
        loadSource(feeds.asriran),
        loadSource(feeds.donya)
    ]).then(function(r){
        var a=r[0].map(function(x){x._date=dateOf(x);return x}).sort(function(x,y){return y._date-x._date});
        var d=r[1].map(function(x){x._date=dateOf(x);return x}).sort(function(x,y){return y._date-x._date});
        renderAsriran(a);
        renderDonya(d);
    });

    setInterval(function(){
        loadSource(feeds.asriran).then(function(x){renderAsriran(x.sort(function(a,b){return dateOf(b)-dateOf(a)}))});
        loadSource(feeds.donya).then(function(x){renderDonya(x.sort(function(a,b){return dateOf(b)-dateOf(a)}))});
    },600000);
}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
}else{
    init();
}
})();