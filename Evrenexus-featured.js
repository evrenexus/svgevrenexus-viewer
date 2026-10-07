/* Evren Nexus — shared featured loader and safe page rendering */
(function(){
"use strict";
var URL_="data/public/featured.json",pending=null,policyPending=null;
function load(){
 if(!pending)pending=fetch(URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("featured.json HTTP "+r.status);return r.json()}).catch(function(e){pending=null;throw e});
 return pending;
}
var FALLBACK_POLICY=["جنگ","جنگی","نظامی","نظامیان","ارتش","سپاه","موشک","موشکی","پهپاد","بمباران","جنگنده","حمله نظامی","حمله موشکی","حمله هوایی","تسلیحات","سلاح","رزمایش","آتش بس","نیروهای مسلح","غزه","حماس","حزب الله","حوثی","شهید","شهادت","رهبر انقلاب","رهبری","انتخابات","نماینده مجلس","مجلس شورای اسلامی","ترامپ","بایدن","نتانیاهو","پوتین"];
function normPolicy(s){return String(s||"").replace(/[\u200c\u200d\u200e\u200f]/g," ").replace(/\u064a/g,"\u06cc").replace(/\u0643/g,"\u06a9").replace(/[\u064b-\u065f\u0670]/g,"").replace(/\s+/g," ").trim().toLowerCase();}
function blockedByPolicy(x){
 var text=normPolicy((x&&x.title||"")+" "+(x&&x.summary||""));
 var terms=(window.EvrenxusPolicyTerms&&Array.isArray(window.EvrenxusPolicyTerms))?window.EvrenxusPolicyTerms:FALLBACK_POLICY;
 return terms.some(function(term){
   var t=normPolicy(term); if(!t)return false;
   var esc=t.replace(/[.*+?^$|[\\]\\\\]/g,"\\$&");
   try{return new RegExp("(?<![\\\\p{L}\\\\p{N}])"+esc+"(?![\\\\p{L}\\\\p{N}])","u").test(text)}catch(e){return text.indexOf(t)!==-1;}
 });
}
function filterItems(items){return (Array.isArray(items)?items:[]).filter(function(x){return !blockedByPolicy(x);});}
function empty(reason){return{ok:false,reason:reason,featured:[],regular:[],page:1,hasPrev:false,hasNext:false};}
function loadPolicy(){
 if(!policyPending)policyPending=fetch("data/public/policy-terms.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){
   if(d&&Array.isArray(d.terms))window.EvrenxusPolicyTerms=d.terms;
   return true;
 }).catch(function(){return true});
 return policyPending;
}
function getTopic(topic,page){
 var key=topic||"home";
 return Promise.all([load(),loadPolicy()]).then(function(parts){var doc=parts[0];
  var t=doc&&doc.topics&&doc.topics[key];
  if(!t||!Array.isArray(t.featured)||!Array.isArray(t.regular)){
   return empty("topic '"+key+"' not found in featured.json (available: "+Object.keys((doc&&doc.topics)||{}).join(", ")+")");
  }
  var per=(doc.config&&doc.config.regularPerPage)||16,p=Math.max(1,parseInt(page,10)||1),start=(p-1)*per;
  var ff=filterItems(t.featured), rr=filterItems(t.regular); return{ok:true,featured:ff,regular:rr.slice(start,start+per),page:p,hasPrev:p>1,hasNext:start+per<rr.length};
 },function(e){return empty(String(e&&e.message||e))});
}
function img(v){return typeof v==="string"&&/^https?:\/\//i.test(v.trim())?v.trim():"";}
function renderOldWay(topic,page,q){
 return loadPolicy().then(function(){return fetch("data/public/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("public/news.json HTTP "+r.status);return r.json()}).catch(function(){return fetch("data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()})}).then(function(d){
  var items=filterItems(Array.isArray(d.items)?d.items:(Array.isArray(d)?d:[]));
  if(topic&&topic!=="home")items=items.filter(function(x){return Array.isArray(x.topics)&&x.topics.indexOf(topic)!==-1});
  if(q)items=items.filter(function(x){return((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(q)!==-1});
  var list=document.getElementById("list");if(!list)return;
  list.innerHTML="";
  items.slice((page-1)*16,page*16).forEach(function(x){
   var a=document.createElement("a");a.className="item";a.href=x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#";a.target="_blank";a.rel="noopener noreferrer";
   var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im)}
   var c=document.createElement("div");c.className="content";var h=document.createElement("div");h.className="title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);list.appendChild(a);
  });
  if(!list.children.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>';
  var total=Math.max(1,Math.ceil(items.length/16)),pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
  if(pg){pg.style.display=total>1?"flex":"none";if(prev){prev.disabled=page<=1;prev.onclick=function(){if(page<=1)return;var u=new URL(location.href);u.searchParams.set("page",String(page-1));location.href=u.href}}if(next){next.disabled=page>=total;next.onclick=function(){if(page>=total)return;var u=new URL(location.href);u.searchParams.set("page",String(page+1));location.href=u.href}}}
 });}).catch(function(e){var list=document.getElementById("list");if(list)list.innerHTML='<div class="error">دریافت اخبار انجام نشد.</div>';console.warn("news.json fallback:",e)});
}
function render(r){
 var F=(r.featured||[]).slice(0,4),list=document.getElementById("list"),important=document.getElementById("important"),ih=document.getElementById("importantList");
 var br=document.getElementById("Evrenxus-breaking-track");
 if(br){br.innerHTML="";if(F.length){var tk=document.createElement("div");tk.className="Evrenxus-breaking-ticker";var g=document.createElement("div");g.className="Evrenxus-breaking-group";F.forEach(function(x){if(!x.articleUrl)return;var a=document.createElement("a");a.href="./"+x.articleUrl;a.textContent=x.title||"";g.appendChild(a)});tk.appendChild(g);tk.appendChild(g.cloneNode(true));br.appendChild(tk)}else br.textContent="فعلاً مطلب مهمی برای این موضوع وجود ندارد."}
 if(important)important.style.display=F.length?"":"none";
 if(ih){ih.innerHTML="";F.forEach(function(x){
   if(!x.articleUrl||!img(x.image))return;
   var a=document.createElement("a");a.className="important-item";a.href="./"+x.articleUrl;
   var im=document.createElement("img");im.src=img(x.image);im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){a.remove()};a.appendChild(im);
   var c=document.createElement("div");c.className="important-content";var h=document.createElement("div");h.className="important-title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="important-summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="important-meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);ih.appendChild(a);
 });}

 var pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
 if(pg){pg.style.display=(r.hasPrev||r.hasNext)?"flex":"none";if(prev){prev.disabled=!r.hasPrev;prev.onclick=function(){if(!r.hasPrev)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page-1));location.href=u.href}}if(next){next.disabled=!r.hasNext;next.onclick=function(){if(!r.hasNext)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page+1));location.href=u.href}}}
}
function renderPage(){
 var qx=new URLSearchParams(location.search),topic=qx.get("topic")||"home",page=Math.max(1,parseInt(qx.get("page"),10)||1),q=(qx.get("q")||"").trim().toLowerCase();
 getTopic(topic,page).then(function(r){if(!r.ok){console.warn("featured.json:",r.reason);return renderOldWay(topic,page,q)}render(r);return renderOldWay(topic,page,q)}).catch(function(e){console.warn("featured.json:",e);renderOldWay(topic,page,q)});
}
window.EvrenFeatured={load:load,getTopic:getTopic,render:renderPage};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderPage,{once:true});else renderPage();
})();