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
 fetch("https://evrenexus.github.io/svgevrenexus-viewer/data/news.json?ts="+Date.now(),{cache:"no-store"})
 .then(function(r){if(!r.ok)throw new Error("news");return r.json()})
 .then(function(data){render((data.items||[]).sort(function(a,b){return String(b.published||"").localeCompare(String(a.published||""))}).slice(0,50))})
 .catch(function(){list.innerHTML='<div class="Evrenxus-news-error">دریافت خبرها انجام نشد.</div>'});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();