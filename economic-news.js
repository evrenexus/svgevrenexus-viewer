/* Evren Nexus — Homepage Economic News */
(function(){
"use strict";

function init(){
    var content=document.getElementById("content");
    var sidebar=document.getElementById("sidebar");
    var slider=document.getElementById("Evrenxus-slider");

    if(!content || !sidebar) return;
    if(document.getElementById("Evrenxus-economic-news")) return;

    var style=document.createElement("style");
    style.textContent=
    "#Evrenxus-economic-news{width:610px;max-width:610px;margin:20px 0 25px;background:#fff;box-sizing:border-box;display:block;clear:none}"+
    "#Evrenxus-asriran-list{border-top:2px solid #202c35}"+
    ".Evrenxus-asriran-item{display:flex;width:100%;box-sizing:border-box;padding:11px 0;border-bottom:1px solid #e2e5e7;color:#222;text-decoration:none;direction:rtl;gap:12px}"+
    ".Evrenxus-asriran-item:hover{background:#fafafa}"+
    ".Evrenxus-asriran-image{width:110px;min-width:110px;height:80px;object-fit:cover;background:#eee}"+
    ".Evrenxus-asriran-content{flex:1;min-width:0}"+
    ".Evrenxus-asriran-title{margin:0 0 5px;color:#20272d;font-size:12px;font-weight:700;line-height:1.8}"+
    ".Evrenxus-asriran-summary{color:#737a7f;font-size:10px;line-height:1.9}"+
    "#Evrenxus-donya-box{width:200px;max-width:200px;box-sizing:border-box;margin:16px 0;background:#fff;border:1px solid #dfe2e4;overflow:hidden;display:block;clear:none}"+
    "#Evrenxus-donya-box .Evrenxus-donya-heading{padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}"+
    "#Evrenxus-donya-box .Evrenxus-donya-heading:before{content:'';display:inline-block;width:4px;height:14px;margin-left:7px;vertical-align:-2px;background:#d9232e}"+
    ".Evrenxus-donya-item{display:block;padding:9px;border-bottom:1px solid #edf0f1;color:#343b40;text-decoration:none;font-size:10px;line-height:1.9}"+
    ".Evrenxus-donya-item:hover{background:#fafafa;color:#d9232e}"+
    ".Evrenxus-donya-title{font-weight:700;color:#20272d;margin-bottom:4px}"+
    ".Evrenxus-donya-summary{color:#737a7f;font-weight:400}"+
    ".Evrenxus-news-loading,.Evrenxus-news-error{padding:18px 8px;text-align:center;color:#777;font-size:10px}";
    document.head.appendChild(style);

    /* Fixed positions: Asriran immediately after slider; Donya immediately after menu. */
    var asBox=document.createElement("div");
    asBox.id="Evrenxus-economic-news";
    asBox.innerHTML='<div id="Evrenxus-asriran-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';

    if(slider && slider.parentNode===content){
        slider.parentNode.insertBefore(asBox,slider.nextSibling);
    }else{
        content.appendChild(asBox);
    }

    var donyaBox=document.createElement("div");
    donyaBox.id="Evrenxus-donya-box";
    donyaBox.innerHTML='<div class="Evrenxus-donya-heading">آخرین مطالب</div><div id="Evrenxus-donya-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';

    var menu=sidebar.querySelector(".menu");
    if(menu && menu.parentNode===sidebar){
        menu.parentNode.insertBefore(donyaBox,menu.nextSibling);
    }else{
        sidebar.appendChild(donyaBox);
    }

    var asList=document.getElementById("Evrenxus-asriran-list");
    var dList=document.getElementById("Evrenxus-donya-list");
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

    function clean(v){
        var d=document.createElement("div");
        d.innerHTML=v||"";
        return (d.textContent||d.innerText||"").replace(/\s+/g," ").trim();
    }

    function image(v){
        if(!v) return "";
        v=String(v).trim().replace(/&amp;/g,"&").replace(/&quot;/g,'"');
        if(/^\/\//.test(v)) v="https:"+v;
        return /^https?:\/\//i.test(v)?v:"";
    }

    function imageProxy(v){
        if(!v) return "";
        return "https://images.weserv.nl/?url="+encodeURIComponent(v);
    }

    function itemImage(item){
        var v=image(item.thumbnail);
        if(v) return v;
        v=image(item.mediaThumbnail);
        if(v) return v;

        if(item.enclosure) {
            v=image(item.enclosure.link||item.enclosure.url);
            if(v) return v;
        }

        var media=item.media||item["media:content"]||item["media:thumbnail"];
        if(media){
            if(!Array.isArray(media)) media=[media];
            for(var i=0;i<media.length;i++){
                var m=media[i];
                v=image(m&&(m.url||m.link||m["@url"]||m["$"]&&m["$"].url));
                if(v) return v;
            }
        }

        var html=item["content:encoded"]||item.content||item.description||"";
        var box=document.createElement("div");
        box.innerHTML=html;
        var imgs=box.querySelectorAll("img");
        for(var j=0;j<imgs.length;j++){
            var img=imgs[j];
            v=image(img.getAttribute("src"))||
              image(img.getAttribute("data-src"))||
              image(img.getAttribute("data-original"))||
              image(img.getAttribute("data-lazy-src"))||
              image(img.getAttribute("data-image"));
            if(v) return v;
        }
        return "";
    }

    function dateOf(item){
        var values=[item.pubDate,item.isoDate,item.published,item.updated,item.created,item.date,item["dc:date"]];
        for(var i=0;i<values.length;i++){
            if(values[i]){
                var t=Date.parse(String(values[i]));
                if(!isNaN(t)) return t;
            }
        }
        return 0;
    }

    function rss(url){
        return new Promise(function(resolve,reject){
            var cb="EvrenxusRSS_"+Date.now()+"_"+Math.floor(Math.random()*99999);
            var s=document.createElement("script");
            var done=false;
            function finish(ok,val){
                if(done)return;
                done=true;
                try{delete window[cb]}catch(e){}
                if(s.parentNode)s.parentNode.removeChild(s);
                ok?resolve(val):reject(val);
            }
            window[cb]=function(data){
                if(data && data.status==="ok" && data.items && data.items.length) finish(true,data.items);
                else finish(false,new Error("empty"));
            };
            s.onerror=function(){finish(false,new Error("network"))};
            s.src="https://api.rss2json.com/v1/api.json?callback="+cb+"&rss_url="+encodeURIComponent(url)+"&count=10";
            document.head.appendChild(s);
            setTimeout(function(){finish(false,new Error("timeout"))},12000);
        });
    }

    function allorigins(url){
        return fetch("https://api.allorigins.win/raw?url="+encodeURIComponent(url),{cache:"no-store"})
        .then(function(r){if(!r.ok) throw new Error("proxy");return r.text()})
        .then(function(xml){
            var doc=new DOMParser().parseFromString(xml,"text/xml");
            var nodes=[].slice.call(doc.querySelectorAll("item"));
            if(!nodes.length) throw new Error("no items");
            return nodes.map(function(n){
                function get(tag){
                    var e=n.getElementsByTagName(tag)[0];
                    return e?e.textContent:"";
                }
                var en=n.getElementsByTagName("enclosure")[0];
                var mc=n.getElementsByTagName("media:content")[0];
                return {
                    title:get("title"),
                    link:get("link"),
                    description:get("description"),
                    content:get("content:encoded"),
                    pubDate:get("pubDate"),
                    thumbnail:mc?(mc.getAttribute("url")||""):"",
                    mediaThumbnail:(function(){
                        var mt=n.getElementsByTagName("media:thumbnail")[0];
                        return mt?(mt.getAttribute("url")||""):"";
                    })(),
                    enclosure:en?{url:en.getAttribute("url")} : null
                };
            });
        });
    }

    function loadOne(url){
        return rss(url).catch(function(){return allorigins(url)});
    }

    function load(urls){
        var p=Promise.reject();
        urls.forEach(function(url){
            p=p.catch(function(){return loadOne(url)});
        });
        return p.catch(function(){return []});
    }

    function openItem(item){
        return viewer+"?url="+encodeURIComponent(item.link||"");
    }

    function renderAsriran(items){
        asList.innerHTML="";
        if(!items.length){
            asList.innerHTML='<div class="Evrenxus-news-error">مطالب دریافت نشد.</div>';
            return;
        }
        items.slice(0,10).forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-asriran-item";
            a.href=openItem(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var im=itemImage(item);
            if(im){
                var img=document.createElement("img");
                img.className="Evrenxus-asriran-image";
                img.alt=clean(item.title);
                img.loading="lazy";
                img.referrerPolicy="no-referrer";
                img.onerror=function(){
                    if(this.dataset.proxyTried!=="1"){
                        this.dataset.proxyTried="1";
                        this.src=imageProxy(im);
                    }else{
                        this.remove();
                    }
                };
                img.src=im;
                a.appendChild(img);
            }

            var c=document.createElement("div");
            c.className="Evrenxus-asriran-content";

            var t=document.createElement("div");
            t.className="Evrenxus-asriran-title";
            t.textContent=clean(item.title);

            var s=document.createElement("div");
            s.className="Evrenxus-asriran-summary";
            s.textContent=clean(item.description||item.content);

            c.appendChild(t);
            if(s.textContent)c.appendChild(s);
            a.appendChild(c);
            asList.appendChild(a);
        });
    }

    function renderDonya(items){
        dList.innerHTML="";
        if(!items.length){
            dList.innerHTML='<div class="Evrenxus-news-error">مطالب دریافت نشد.</div>';
            return;
        }
        items.slice(0,10).forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-donya-item";
            a.href=openItem(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var t=document.createElement("div");
            t.className="Evrenxus-donya-title";
            t.textContent=clean(item.title);

            var s=document.createElement("div");
            s.className="Evrenxus-donya-summary";
            s.textContent=clean(item.description||item.content);

            a.appendChild(t);
            if(s.textContent)a.appendChild(s);
            dList.appendChild(a);
        });
    }

    function refresh(){
        load(feeds.asriran).then(function(items){
            items.sort(function(a,b){return dateOf(b)-dateOf(a)});
            renderAsriran(items);
        });
        load(feeds.donya).then(function(items){
            items.sort(function(a,b){return dateOf(b)-dateOf(a)});
            renderDonya(items);
        });
    }

    refresh();
    setInterval(refresh,600000);
}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
}else{
    init();
}
})();