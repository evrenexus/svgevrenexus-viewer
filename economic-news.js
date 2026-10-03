/* Evren Nexus — Economic News */
(function(){
"use strict";

function init(){
    if(!document.body.classList.contains("Evrenxus-home")) return;
    if(document.getElementById("Evrenxus-economic-box")) return;

    var style=document.createElement("style");
    style.textContent=`
#Evrenxus-economic-box{width:610px;margin-bottom:22px;background:#fff}
#Evrenxus-economic-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border-top:1px solid #dfe2e4}
.Evrenxus-economic-card{display:flex;min-width:0;height:116px;padding:10px 0;border-bottom:1px solid #e2e5e7;color:#222;text-decoration:none;overflow:hidden;transition:.15s;direction:rtl}
.Evrenxus-economic-card:nth-child(odd){padding-left:8px}
.Evrenxus-economic-card:nth-child(even){padding-right:8px;padding-left:0}
.Evrenxus-economic-card:hover{background:#fafafa}
.Evrenxus-economic-image{width:108px;min-width:108px;height:96px;object-fit:cover;display:block;background:#e9ebed}
.Evrenxus-economic-content{min-width:0;padding:1px 9px;overflow:hidden}
.Evrenxus-economic-title{margin-bottom:5px;color:#20272d;font-size:12px;font-weight:700;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.Evrenxus-economic-summary{color:#737a7f;font-size:10px;line-height:1.75;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.Evrenxus-economic-loading,.Evrenxus-economic-error{grid-column:1 / 3;padding:25px;text-align:center;color:#777;font-size:11px}
@media screen and (max-width:700px){
#Evrenxus-economic-box{width:100%;margin-bottom:18px}
#Evrenxus-economic-grid{grid-template-columns:1fr}
.Evrenxus-economic-card,.Evrenxus-economic-card:nth-child(odd),.Evrenxus-economic-card:nth-child(even){width:100%;height:103px;padding:8px 0;border-bottom:1px solid #e2e5e7}
.Evrenxus-economic-image{width:94px;min-width:94px;height:87px}
.Evrenxus-economic-content{padding:0 8px}
.Evrenxus-economic-title{font-size:11px;line-height:1.7}
.Evrenxus-economic-summary{font-size:9.5px;line-height:1.7;-webkit-line-clamp:3}
.Evrenxus-economic-loading,.Evrenxus-economic-error{grid-column:1;padding:20px 8px}
}
`;
    document.head.appendChild(style);

    var box=document.createElement("div");
    box.id="Evrenxus-economic-box";
    box.innerHTML='<div class="Evrenxus-section-title">جدیدترین ها</div><div id="Evrenxus-economic-grid"><div class="Evrenxus-economic-loading">در حال دریافت مطالب...</div></div>';

    var content=document.getElementById("content");
    var breaking=document.getElementById("Evrenxus-breaking");
    if(!content) return;
    if(breaking && breaking.parentNode===content) breaking.insertAdjacentElement("afterend",box);
    else content.insertBefore(box,content.firstChild);

    var grid=document.getElementById("Evrenxus-economic-grid");
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

    function limitText(text,length){
        text=cleanText(text);
        return text.length<=length ? text : text.substring(0,length).trim()+"...";
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
        if(!/^https?:\\/\\//i.test(url)) return "";
        return url;
    }

    function findImageInHTML(html){
        if(!html) return "";
        var div=document.createElement("div");
        div.innerHTML=html;
        var images=div.getElementsByTagName("img");

        for(var i=0;i<images.length;i++){
            var src=cleanImageUrl(images[i].getAttribute("src"));
            if(src) return src;
        }
        for(var j=0;j<images.length;j++){
            var dataSrc=cleanImageUrl(images[j].getAttribute("data-src"));
            if(dataSrc) return dataSrc;
        }
        for(var k=0;k<images.length;k++){
            var original=cleanImageUrl(images[k].getAttribute("data-original"));
            if(original) return original;
        }
        return "";
    }

    function getImage(item){
        var image="";

        if(item.thumbnail){
            image=cleanImageUrl(item.thumbnail);
            if(image) return image;
        }

        if(item.enclosure){
            image=cleanImageUrl(item.enclosure.link || item.enclosure.url);
            if(image) return image;
        }

        var media=item.media && item.media.content ? item.media.content : item["media:content"];
        if(media){
            if(!Array.isArray(media)) media=[media];
            for(var i=0;i<media.length;i++){
                if(media[i]){
                    image=cleanImageUrl(media[i].url || media[i]["@url"] || media[i].link);
                    if(image) return image;
                }
            }
        }

        image=findImageInHTML(item["content:encoded"] || "");
        if(image) return image;

        image=findImageInHTML(item.content || "");
        if(image) return image;

        image=findImageInHTML(item.description || "");
        if(image) return image;

        return "";
    }

    function normalizeDigits(value){
        return String(value || "")
            .replace(/[۰-۹]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹".indexOf(d)})
            .replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d)});
    }

    function getDate(item){
        var fields=[
            item.pubDate,item.isoDate,item.published,item.updated,
            item.created,item.date,item["dc:date"]
        ];
        for(var i=0;i<fields.length;i++){
            var value=fields[i];
            if(value===null || value===undefined) continue;
            if(typeof value==="object"){
                value=value.$t || value.value || value._ || value["#text"] || "";
            }
            value=normalizeDigits(value).replace(/\u200c/g," ").trim();
            if(!value) continue;
            var timestamp=Date.parse(value);
            if(!isNaN(timestamp)) return timestamp;
        }
        return -Infinity;
    }

    function createCard(item){
        var link=document.createElement("a");
        link.className="Evrenxus-economic-card";
        link.href=viewerUrl+"?url="+encodeURIComponent(item.link || "");
        link.target="_blank";
        link.rel="noopener noreferrer";

        var imageUrl=getImage(item);
        if(imageUrl){
            var image=document.createElement("img");
            image.className="Evrenxus-economic-image";
            image.src=imageUrl;
            image.alt=item.title || "خبر";
            image.loading="lazy";
            image.onerror=function(){this.style.display="none"};
            link.appendChild(image);
        }

        var content=document.createElement("div");
        content.className="Evrenxus-economic-content";

        var title=document.createElement("div");
        title.className="Evrenxus-economic-title";
        title.textContent=cleanText(item.title || "");

        var summary=document.createElement("div");
        summary.className="Evrenxus-economic-summary";
        summary.textContent=limitText(item.description || item.content || "",120);

        content.appendChild(title);
        content.appendChild(summary);
        link.appendChild(content);
        return link;
    }

    function loadFeed(feed){
        var proxy="https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(feed.rss);
        return fetch(proxy)
            .then(function(response){
                if(!response.ok) throw new Error("HTTP error");
                return response.json();
            })
            .then(function(data){
                if(!data || !data.items || !data.items.length) throw new Error("No news");
                return data.items.map(function(item,index){
                    item.EvrenxusSource=feed.name;
                    item.EvrenxusDate=getDate(item);
                    item.EvrenxusOrder=index;
                    return item;
                });
            })
            .catch(function(error){
                console.log("Evrenxus Feed Error:",feed.name,error);
                return [];
            });
    }

    function loadEconomicNews(){
        Promise.all(feeds.map(loadFeed))
            .then(function(results){
                var allItems=[];
                results.forEach(function(items){
                    if(Array.isArray(items)) allItems=allItems.concat(items);
                });

                allItems.forEach(function(item,index){item.EvrenxusGlobalOrder=index});

                allItems.sort(function(a,b){
                    var dateA=a.EvrenxusDate,dateB=b.EvrenxusDate;
                    if(dateA===-Infinity && dateB!==-Infinity) return 1;
                    if(dateB===-Infinity && dateA!==-Infinity) return -1;
                    if(dateB!==dateA) return dateB-dateA;
                    return a.EvrenxusGlobalOrder-b.EvrenxusGlobalOrder;
                });

                var items=allItems.slice(0,16);
                if(!items.length) throw new Error("No news");

                grid.innerHTML="";
                items.forEach(function(item){grid.appendChild(createCard(item))});
            })
            .catch(function(error){
                console.log("Evrenxus News Error:",error);
                grid.innerHTML='<div class="Evrenxus-economic-error">دریافت مطالب در حال حاضر امکان‌پذیر نیست</div>';
            });
    }

    loadEconomicNews();
    setInterval(loadEconomicNews,600000);
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0)});
else setTimeout(init,0);

})();