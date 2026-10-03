/* Evren Nexus — Unified News River */
(function(){
"use strict";
function init(){
 var content=document.getElementById("content"), slider=document.getElementById("Evrenxus-slider");
 if(!content||document.getElementById("Evrenxus-donya-box")) return;
 var style=document.createElement("style");
 style.textContent=
 "#Evrenxus-donya-box{width:610px;max-width:610px;box-sizing:border-box;margin:20px 0 25px;background:#fff;border:1px solid #dfe2e4;overflow:hidden;display:block}"+
 "#Evrenxus-donya-box .Evrenxus-donya-heading{padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}"+
 "#Evrenxus-donya-box .Evrenxus-donya-heading:before{content:'';display:inline-block;width:4px;height:14px;margin-left:7px;vertical-align:-2px;background:#d9232e}"+
 ".Evrenxus-donya-item{display:flex;width:100%;box-sizing:border-box;padding:10px;border-bottom:1px solid #edf0f1;color:#343b40;text-decoration:none;font-size:10px;line-height:1.9;direction:rtl;gap:10px;align-items:flex-start}"+
 ".Evrenxus-donya-item:hover{background:#fafafa;color:#d9232e}"+
 ".Evrenxus-donya-image{display:block;width:130px;min-width:130px;height:80px;object-fit:cover;background:#eee;margin:0}"+
 ".Evrenxus-donya-content{flex:1;min-width:0}"+
 ".Evrenxus-donya-title{font-weight:700;color:#20272d;margin:0 0 4px}"+
 ".Evrenxus-donya-meta{font-size:9px;color:#888;margin-top:5px}"+
 ".Evrenxus-donya-summary{color:#737a7f;font-weight:400}"+
 ".Evrenxus-news-loading,.Evrenxus-news-error{padding:18px 8px;text-align:center;color:#777;font-size:10px}";
 document.head.appendChild(style);
 var box=document.createElement("div"); box.id="Evrenxus-donya-box";
 box.innerHTML='<div class="Evrenxus-donya-heading">آخرین مطالب</div><div id="Evrenxus-donya-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';
 if(slider&&slider.parentNode===content) slider.parentNode.insertBefore(box,slider.nextSibling); else content.appendChild(box);
 var list=document.getElementById("Evrenxus-donya-list");
 var viewer="https://evrenexus.github.io/svgevrenexus-viewer/viewer.html";
 // Asriran sidebar — kept independent from the unified news river
 var sidebar=document.getElementById("sidebar");
 if(sidebar && !document.getElementById("Evrenxus-asriran-box")){
  var sc=document.createElement("style");
  sc.textContent=
   "#Evrenxus-asriran-box{width:200px;margin:0 0 16px;background:#fff;border:1px solid #dfe2e4;overflow:hidden}"+
   "#Evrenxus-asriran-box .Evrenxus-section-title{padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}"+
   ".Evrenxus-asriran-item{display:block;padding:9px;border-bottom:1px solid #edf0f1;color:#343b40;text-decoration:none;font-size:10px;line-height:1.9;direction:rtl}"+
   ".Evrenxus-asriran-item:hover{background:#fafafa;color:#d9232e}"+
   ".Evrenxus-asriran-image{display:block;width:180px;height:105px;object-fit:cover;background:#eee;margin:0 0 7px}"+
   ".Evrenxus-asriran-title{font-weight:700;color:#20272d;margin-bottom:4px}"+
   ".Evrenxus-asriran-summary{color:#737a7f;font-weight:400}";
  document.head.appendChild(sc);
  var ab=document.createElement("div");
  ab.id="Evrenxus-asriran-box";
  ab.innerHTML='<div class="Evrenxus-section-title">عصرایران</div><div id="Evrenxus-asriran-list"><div class="Evrenxus-news-loading">در حال دریافت مطالب...</div></div>';
  var menu=sidebar.querySelector(".menu");
  if(menu) menu.insertAdjacentElement("afterend",ab); else sidebar.insertBefore(ab,sidebar.firstChild);
  var al=document.getElementById("Evrenxus-asriran-list");
  var afeed="https://www.asriran.com/fa/rss/allnews";
  function at(v){var d=document.createElement("div");d.innerHTML=v||"";return(d.textContent||d.innerText||"").replace(/\s+/g," ").trim()}
  function ai(v){if(!v)return"";v=String(v).trim().replace(/&amp;/g,"&").replace(/&quot;/g,'"');if(/^\/\//.test(v))v="https:"+v;return/^https?:\/\//i.test(v)?v:""}
  function aimg(item){
   var v=ai(item.thumbnail); if(v)return v;
   if(item.enclosure){v=ai(item.enclosure.link||item.enclosure.url);if(v)return v}
   var m=item.media||item["media:content"]; if(m){if(!Array.isArray(m))m=[m];for(var i=0;i<m.length;i++){v=ai(m[i]&&(m[i].url||m[i]["@url"]||m[i].link));if(v)return v}}
   var d=document.createElement("div");d.innerHTML=item["content:encoded"]||item.content||item.description||"";
   var imgs=d.getElementsByTagName("img");for(var j=0;j<imgs.length;j++){v=ai(imgs[j].getAttribute("src"))||ai(imgs[j].getAttribute("data-src"))||ai(imgs[j].getAttribute("data-original"));if(v)return v}
   return"";
  }
  function adate(item){var a=[item.pubDate,item.isoDate,item.published,item.updated,item["dc:date"]];for(var i=0;i<a.length;i++){if(a[i]){var t=Date.parse(String(a[i]));if(!isNaN(t))return t}}return 0}
  function aload(){
   var cb="EvrenxusAsriran_"+Date.now()+"_"+Math.floor(Math.random()*100000),s=document.createElement("script"),done=false;
   function finish(ok,v){if(done)return;done=true;try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.parentNode.removeChild(s);ok?renderAsriran(v):failAsriran()}
   window[cb]=function(d){if(d&&d.status==="ok"&&d.items&&d.items.length)finish(true,d.items);else finish(false)};
   s.onerror=function(){finish(false)};s.src="https://api.rss2json.com/v1/api.json?callback="+cb+"&rss_url="+encodeURIComponent(afeed)+"&count=10";document.head.appendChild(s);
   setTimeout(function(){finish(false)},12000);
  }
  function failAsriran(){al.innerHTML='<div class="Evrenxus-news-error">مطالب دریافت نشد.</div>'}
  function renderAsriran(items){
   al.innerHTML="";items.slice(0,10).sort(function(a,b){return adate(b)-adate(a)}).forEach(function(item){
    var a=document.createElement("a");a.className="Evrenxus-asriran-item";a.href=viewer+"?url="+encodeURIComponent(item.link||"");a.target="_blank";a.rel="noopener noreferrer";
    var im=aimg(item);if(im){var img=document.createElement("img");img.className="Evrenxus-asriran-image";img.src=im;img.alt=at(item.title);img.loading="lazy";img.onerror=function(){this.style.display="none"};a.appendChild(img)}
    var t=document.createElement("div");t.className="Evrenxus-asriran-title";t.textContent=at(item.title);a.appendChild(t);
    var sum=at(item.description||item.content);if(sum){var x=document.createElement("div");x.className="Evrenxus-asriran-summary";x.textContent=sum;a.appendChild(x)}
    al.appendChild(a);
   });
  }
  aload();
  setInterval(aload,600000);
 }

 function clean(v){var d=document.createElement("div");d.innerHTML=v||"";return(d.textContent||d.innerText||"").replace(/\s+/g," ").trim()}
 function imageProxy(v){return v?"https://images.weserv.nl/?url="+encodeURIComponent(v):""}
 function render(items){
  list.innerHTML="";
  if(!items.length){list.innerHTML='<div class="Evrenxus-news-error">مطالبی دریافت نشد.</div>';return}
  items.forEach(function(item){
   var a=document.createElement("a");
   a.className="Evrenxus-donya-item";
   a.href=viewer+"?url="+encodeURIComponent(item.url);
   a.target="_blank"; a.rel="noopener noreferrer";
   if(item.image){
    var img=document.createElement("img"); img.className="Evrenxus-donya-image"; img.alt=item.title||""; img.loading="lazy"; img.referrerPolicy="no-referrer";
    img.onerror=function(){if(this.dataset.proxyTried!=="1"){this.dataset.proxyTried="1";this.src=imageProxy(item.image)}else{this.remove()}};
    img.src=item.image; a.appendChild(img);
   }
   var c=document.createElement("div"); c.className="Evrenxus-donya-content";
   var t=document.createElement("div"); t.className="Evrenxus-donya-title"; t.textContent=item.title||"";
   var s=document.createElement("div"); s.className="Evrenxus-donya-summary"; s.textContent=item.summary||"";
   var m=document.createElement("div"); m.className="Evrenxus-donya-meta"; m.textContent=(item.source||"")+" • "+(item.category||"");
   c.appendChild(t); if(s.textContent)c.appendChild(s); c.appendChild(m); a.appendChild(c); list.appendChild(a);
  });
 }
 fetch("https://evrenexus.github.io/svgevrenexus-viewer/data/news.json?v="+Date.now(),{cache:"no-store"})
 .then(function(r){if(!r.ok)throw new Error("news");return r.json()})
 .then(function(data){render((data.items||[]).filter(function(x){return x&&x.title&&x.published&&/^https?:\\/\\//i.test(x.url||"")&&x.url!==x.source}).sort(function(a,b){return new Date(b.published)-new Date(a.published)}).slice(0,50))})
 .catch(function(){list.innerHTML='<div class="Evrenxus-news-error">دریافت خبرها انجام نشد.</div>'});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();