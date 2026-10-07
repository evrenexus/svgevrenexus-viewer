/* Evren Nexus — shared featured loader and safe page rendering */
(function(){
"use strict";
var URL_="data/public/featured.json",pending=null;
function load(){
 if(!pending)pending=fetch(URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("featured.json HTTP "+r.status);return r.json()}).catch(function(e){pending=null;throw e});
 return pending;
}
function empty(reason){return{ok:false,reason:reason,featured:[],regular:[],page:1,hasPrev:false,hasNext:false};}
function getTopic(topic,page){
 var key=topic||"home";
 return load().then(function(doc){
  var t=doc&&doc.topics&&doc.topics[key];
  if(!t||!Array.isArray(t.featured)||!Array.isArray(t.regular)){
   return empty("topic '"+key+"' not found in featured.json (available: "+Object.keys((doc&&doc.topics)||{}).join(", ")+")");
  }
  var per=(doc.config&&doc.config.regularPerPage)||16,p=Math.max(1,parseInt(page,10)||1),start=(p-1)*per;
  return{ok:true,featured:t.featured,regular:t.regular.slice(start,start+per),page:p,hasPrev:p>1,hasNext:start+per<t.regular.length};
 },function(e){return empty(String(e&&e.message||e))});
}
function img(v){return typeof v==="string"&&/^https?:\/\//i.test(v.trim())?v.trim():"";}
function renderOldWay(topic,page,q){
 return fetch("data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()}).then(function(d){
  var items=Array.isArray(d.items)?d.items:(Array.isArray(d)?d:[]);
  if(topic&&topic!=="home")items=items.filter(function(x){return Array.isArray(x.topics)&&x.topics.indexOf(topic)!==-1});
  if(q)items=items.filter(function(x){return((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(q)!==-1});
  var list=document.getElementById("list");if(!list)return;
  list.innerHTML="";
  items.slice((page-1)*16,page*16).forEach(function(x){
   var a=document.createElement("a");a.className="item";a.href=x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#";a.target="_blank";a.rel="noopener noreferrer";
   var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im)}
   var c=document.createElement("div");c.className="content";var h=document.createElement("div");h.className="title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var s=document.createElement("div");s.className="summary";s.textContent=x.summary;c.appendChild(s)}
   var m=document.createElement("div");m.className="meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);list.appendChild(a);
  });
  if(!list.children.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>';
 }).catch(function(e){var list=document.getElementById("list");if(list)list.innerHTML='<div class="error">دریافت اخبار انجام نشد.</div>';console.warn("news.json fallback:",e)});
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
 if(list){list.innerHTML="";(r.regular||[]).forEach(function(x){
   var a=document.createElement("a");a.className="item";a.href=x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#";a.target="_blank";a.rel="noopener noreferrer";
   var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im)}
   var c=document.createElement("div");c.className="content";var h=document.createElement("div");h.className="title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);list.appendChild(a);
 });if(!r.regular.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>'}
 var pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
 if(pg){pg.style.display=(r.hasPrev||r.hasNext)?"flex":"none";if(prev){prev.disabled=!r.hasPrev;prev.onclick=function(){if(!r.hasPrev)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page-1));location.href=u.href}}if(next){next.disabled=!r.hasNext;next.onclick=function(){if(!r.hasNext)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page+1));location.href=u.href}}}
}
function renderPage(){
 var qx=new URLSearchParams(location.search),topic=qx.get("topic")||"home",page=Math.max(1,parseInt(qx.get("page"),10)||1),q=(qx.get("q")||"").trim().toLowerCase();
 getTopic(topic,page).then(function(r){if(!r.ok){console.warn("featured.json:",r.reason);return renderOldWay(topic,page,q)}render(r)}).catch(function(e){console.warn("featured.json:",e);renderOldWay(topic,page,q)});
}
window.EvrenFeatured={load:load,getTopic:getTopic,render:renderPage};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderPage,{once:true});else renderPage();
})();