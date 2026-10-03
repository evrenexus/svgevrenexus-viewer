/* Evren Nexus — Economic News
   Donyaye Eqtesad: sidebar text-only
   Asriran: main content with small images
*/
(function(){
"use strict";

function init(){
    if(!document.body.classList.contains("Evrenxus-home")) return;
    if(document.getElementById("Evrenxus-economic-box")) return;

    var css=document.createElement("style");
    css.textContent=`
#Evrenxus-economic-box{width:610px;margin:0 0 22px;background:#fff}
#Evrenxus-economic-box .Evrenxus-section-title,
#Evrenxus-donya-box .Evrenxus-section-title{position:relative;margin:0 0 12px;padding:0 10px 8px 0;border-bottom:2px solid #202c35;color:#202c35;font-size:14px;font-weight:700;line-height:1.8}
#Evrenxus-economic-box .Evrenxus-section-title:before,
#Evrenxus-donya-box .Evrenxus-section-title:before{content:"";position:absolute;right:0;bottom:-2px;width:55px;height:2px;background:#d9232e}
#Evrenxus-asriran-list{border-top:1px solid #dfe2e4}
.Evrenxus-asriran-item{display:flex;width:100%;padding:10px 0;border-bottom:1px solid #e2e5e7;color:#222;text-decoration:none;direction:rtl;gap:10px}
.Evrenxus-asriran-item:hover{background:#fafafa}
.Evrenxus-asriran-image{width:105px;min-width:105px;height:78px;object-fit:cover;background:#e9ebed}
.Evrenxus-asriran-content{min-width:0;flex:1}
.Evrenxus-asriran-title{margin:0 0 6px;color:#20272d;font-size:12px;font-weight:700;line-height:1.8}
.Evrenxus-asriran-summary{color:#737a7f;font-size:10px;line-height:1.9;white-space:normal;overflow:visible}
#Evrenxus-donya-box{width:200px;margin:0 0 16px;background:#fff;border:1px solid #dfe2e4;overflow:hidden}
.Evrenxus-donya-item{display:block;padding:9px;border-bottom:1px solid #edf0f1;color:#343b40;text-decoration:none;font-size:10px;line-height:1.9}
.Evrenxus-donya-item:hover{background:#fafafa;color:#d9232e}
.Evrenxus-donya-title{font-weight:700;color:#20272d;margin-bottom:5px}
.Evrenxus-donya-summary{color:#737a7f;font-weight:400}
.Evrenxus-news-loading,.Evrenxus-news-error{padding:20px 8px;text-align:center;color:#777;font-size:10px}
@media(max-width:700px){
#Evrenxus-economic-box{width:100%;margin-bottom:18px}
.Evrenxus-asriran-item{padding:8px 0;gap:8px}
.Evrenxus-asriran-image{width:94px;min-width:94px;height:78px}
.Evrenxus-asriran-title{font-size:11px}
.Evrenxus-asriran-summary{font-size:9.5px}
#Evrenxus-donya-box{width:100%}
}
`;
    document.head.appendChild(css);

    var content=document.getElementById("content");
    var sidebar=document.getElementById("sidebar");
    if(!content || !sidebar) return;

    var asriranBox=document.createElement("div");
    asriranBox.id="Evrenxus-economic-box";
    asriranBox.innerHTML='<div class="Evrenxus-section-title">عصر ایران</div><div id="Evrenxus-asriran-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';

    var breaking=document.getElementById("Evrenxus-breaking");
    if(breaking && breaking.parentNode===content) breaking.insertAdjacentElement("afterend",asriranBox);
    else content.insertBefore(asriranBox,content.firstChild);

    var donyaBox=document.createElement("div");
    donyaBox.id="Evrenxus-donya-box";
    donyaBox.innerHTML='<div class="Evrenxus-section-title">دنیای اقتصاد</div><div id="Evrenxus-donya-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';
    sidebar.insertBefore(donyaBox,sidebar.firstChild);

    var asriranList=document.getElementById("Evrenxus-asriran-list");
    var donyaList=document.getElementById("Evrenxus-donya-list");
    var viewerUrl="https://evrenexus.github.io/svgevrenexus-viewer/viewer.html";

    var feeds=[
        {name:"دنیای اقتصاد",rss:"https://www.donya-e-eqtesad.com/rss"},
        {name:"عصر ایران",rss:"https://www.asriran.com/fa/rss/allnews"}
    ];

    function cleanText(text){
        var div=document.createElement("div");
        div.innerHTML=text || "";
        return (div.textContent || div.innerText || "").replace(/\\s+/g," ").trim();
    }

    function cleanImageUrl(url){
        if(!url) return "";
        url=String(url).trim()
            .replace(/&amp;/g,"&")
            .replace(/&#38;/g,"&")
            .replace(/&quot;/g,'\"')
            .replace(/&#39;/g,"'");
        if(/^data:image/i.test(url) || /^javascript:/i.test(url)) return "";
        if(url.indexOf("//")===0) url="https:"+url;
        return /^https?:\\/\\//i.test(url) ? url : "";
    }

    function findImage(html){
        if(!html) return "";
        var div=document.createElement("div");
        div.innerHTML=html;
        var imgs=div.getElementsByTagName("img");
        for(var i=0;i<imgs.length;i++){
            var src=cleanImageUrl(imgs[i].getAttribute("src")) ||
                    cleanImageUrl(imgs[i].getAttribute("data-src")) ||
                    cleanImageUrl(imgs[i].getAttribute("data-original"));
            if(src) return src;
        }
        return "";
    }

    function getImage(item){
        var image="";
        if(item.thumbnail) image=cleanImageUrl(item.thumbnail);
        if(image) return image;
        if(item.enclosure) image=cleanImageUrl(item.enclosure.link || item.enclosure.url);
        if(image) return image;
        var media=item.media && item.media.content ? item.media.content : item["media:content"];
        if(media){
            if(!Array.isArray(media)) media=[media];
            for(var i=0;i<media.length;i++){
                image=cleanImageUrl(media[i] && (media[i].url || media[i]["@url"] || media[i].link));
                if(image) return image;
            }
        }
        return findImage(item["content:encoded"] || item.content || item.description || "");
    }

    function getDate(item){
        var fields=[item.pubDate,item.isoDate,item.published,item.updated,item.created,item.date,item["dc:date"]];
        for(var i=0;i<fields.length;i++){
            var value=fields[i];
            if(value===null || value===undefined) continue;
            if(typeof value==="object") value=value.$t || value.value || value._ || value["#text"] || "";
            var t=Date.parse(String(value).replace(/\\u200c/g," ").trim());
            if(!isNaN(t)) return t;
        }
        return -Infinity;
    }

    function loadFeed(feed){
        var proxy="https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(feed.rss);
        return fetch(proxy).then(function(r){
            if(!r.ok) throw new Error("HTTP");
            return r.json();
        }).then(function(data){
            if(!data || !data.items || !data.items.length) throw new Error("No news");
            return data.items.map(function(item,index){
                item.EvrenxusSource=feed.name;
                item.EvrenxusDate=getDate(item);
                item.EvrenxusOrder=index;
                return item;
            });
        }).catch(function(e){
            console.log("Evrenxus Feed Error:",feed.name,e);
            return [];
        });
    }

    function linkFor(item){
        return viewerUrl+"?url="+encodeURIComponent(item.link || "");
    }

    function renderAsriran(items){
        asriranList.innerHTML="";
        if(!items.length){
            asriranList.innerHTML='<div class="Evrenxus-news-error">مطالب عصر ایران دریافت نشد.</div>';
            return;
        }
        items.forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-asriran-item";
            a.href=linkFor(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var imageUrl=getImage(item);
            if(imageUrl){
                var img=document.createElement("img");
                img.className="Evrenxus-asriran-image";
                img.src=imageUrl;
                img.alt=cleanText(item.title || "خبر");
                img.loading="lazy";
                img.onerror=function(){this.style.display="none"};
                a.appendChild(img);
            }

            var wrap=document.createElement("div");
            wrap.className="Evrenxus-asriran-content";

            var title=document.createElement("div");
            title.className="Evrenxus-asriran-title";
            title.textContent=cleanText(item.title || "");

            var summary=document.createElement("div");
            summary.className="Evrenxus-asriran-summary";
            summary.textContent=cleanText(item.description || item.content || "");

            wrap.appendChild(title);
            if(summary.textContent) wrap.appendChild(summary);
            a.appendChild(wrap);
            asriranList.appendChild(a);
        });
    }

    function renderDonya(items){
        donyaList.innerHTML="";
        if(!items.length){
            donyaList.innerHTML='<div class="Evrenxus-news-error">مطالب دنیای اقتصاد دریافت نشد.</div>';
            return;
        }
        items.forEach(function(item){
            var a=document.createElement("a");
            a.className="Evrenxus-donya-item";
            a.href=linkFor(item);
            a.target="_blank";
            a.rel="noopener noreferrer";

            var title=document.createElement("div");
            title.className="Evrenxus-donya-title";
            title.textContent=cleanText(item.title || "");

            var summary=document.createElement("div");
            summary.className="Evrenxus-donya-summary";
            summary.textContent=cleanText(item.description || item.content || "");

            a.appendChild(title);
            if(summary.textContent) a.appendChild(summary);
            donyaList.appendChild(a);
        });
    }

    function load(){
        Promise.all(feeds.map(loadFeed)).then(function(results){
            var all=[];
            results.forEach(function(items){all=all.concat(items)});
            all.sort(function(a,b){
                if(a.EvrenxusDate===-Infinity && b.EvrenxusDate!==-Infinity) return 1;
                if(b.EvrenxusDate===-Infinity && a.EvrenxusDate!==-Infinity) return -1;
                return b.EvrenxusDate-a.EvrenxusDate;
            });

            var donya=all.filter(function(x){return x.EvrenxusSource==="دنیای اقتصاد"}).slice(0,8);
            var asriran=all.filter(function(x){return x.EvrenxusSource==="عصر ایران"}).slice(0,8);

            renderDonya(donya);
            renderAsriran(asriran);
        });
    }

    load();
    setInterval(load,600000);
}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0)});
}else{
    setTimeout(init,0);
}
})();