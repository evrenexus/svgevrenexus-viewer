/* Evren Nexus — single source for important ticker, slider and boxes */
(function(){
"use strict";
var URL_="data/public/featured.json", pending=null;
function load(){
 if(!pending) pending=fetch(URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("featured.json HTTP "+r.status);return r.json()});
 return pending;
}
function getTopic(topic,page){
 return load().then(function(doc){
  var t=doc.topics&&doc.topics[topic||"home"],per=(doc.config&&doc.config.regularPerPage)||16,p=Math.max(1,parseInt(page,10)||1);
  if(!t)return{featured:[],regular:[],page:1,hasPrev:false,hasNext:false};
  var start=(p-1)*per;
  return{featured:Array.isArray(t.featured)?t.featured:[],regular:(t.regular||[]).slice(start,start+per),allRegular:t.regular||[],page:p,hasPrev:p>1,hasNext:start+per<(t.regular||[]).length};
 });
}
function img(v){return typeof v==="string"&&/^https?:\/\//i.test(v)?v:""}
function article(x){return x&&x.articleUrl?x.articleUrl:""}
function render(){
 var topic=new URLSearchParams(location.search).get("topic")||"home", page=Math.max(1,parseInt(new URLSearchParams(location.search).get("page"),10)||1);
 load().then(function(doc){
  var t=doc.topics&&doc.topics[topic];if(!t)return;
  var F=Array.isArray(t.featured)?t.featured.slice(0,4):[], R=Array.isArray(t.regular)?t.regular:[], q=(new URLSearchParams(location.search).get("q")||"").trim().toLowerCase();
  window.EVREN_FEATURED_ITEMS=F.slice();
  var br=document.getElementById("Evrenxus-breaking-track");
  if(br){br.innerHTML="";if(F.length){var tk=document.createElement("div");tk.className="Evrenxus-breaking-ticker";var g=document.createElement("div");g.className="Evrenxus-breaking-group";F.forEach(function(x){if(!article(x))return;var a=document.createElement("a");a.href="./"+article(x);a.textContent=x.title||"";g.appendChild(a)});tk.appendChild(g);tk.appendChild(g.cloneNode(true));br.appendChild(tk)}else br.textContent="فعلاً مطلب مهمی برای این موضوع وجود ندارد."}
  var ih=document.getElementById("importantList");
  if(ih){ih.innerHTML="";F.forEach(function(x){var a=document.createElement("a");a.className="important-item";a.href="./"+article(x);var im=img(x.image);if(im){var i=document.createElement("img");i.src=im;i.alt=x.title||"";i.loading="lazy";a.appendChild(i)}var c=document.createElement("div");c.className="important-content";var h=document.createElement("div");h.className="important-title";h.textContent=x.title||"";c.appendChild(h);if(x.summary){var s=document.createElement("div");s.className="important-summary";s.textContent=x.summary;c.appendChild(s)}var m=document.createElement("div");m.className="important-meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);ih.appendChild(a)});if(!F.length)ih.innerHTML='<div class="error">فعلاً مطلب مهمی برای این موضوع انتخاب نشده است.</div>'}
  var filtered=q?R.filter(function(x){return ((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(q)!==-1}):R;
  var per=(doc.config&&doc.config.regularPerPage)||16,total=Math.max(1,Math.ceil(filtered.length/per));if(page>total)page=total;
  var list=document.getElementById("list");if(list){list.innerHTML="";filtered.slice((page-1)*per,page*per).forEach(function(x){var a=document.createElement("a");a.className="item";var u=x.url||"";a.href=u?"./viewer.html?url="+encodeURIComponent(u):"#";a.target="_blank";a.rel="noopener noreferrer";if(img(x.image)){var i=document.createElement("img");i.src=x.image;i.alt=x.title||"";i.loading="lazy";a.appendChild(i)}var c=document.createElement("div");c.className="content";var h=document.createElement("div");h.className="title";h.textContent=x.title||"";c.appendChild(h);if(x.summary){var s=document.createElement("div");s.className="summary";s.textContent=x.summary;c.appendChild(s)}var m=document.createElement("div");m.className="meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);list.appendChild(a)});if(!filtered.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>'}
  var pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");if(pg){pg.style.display=total>1?"flex":"none";if(prev){prev.disabled=page<=1;prev.onclick=function(){if(page>1){var u=new URL(location.href);u.searchParams.set("page",page-1);location.href=u.href}}}if(next){next.disabled=page>=total;next.onclick=function(){if(page<total){var u=new URL(location.href);u.searchParams.set("page",page+1);location.href=u.href}}}}
  window.dispatchEvent(new CustomEvent("EvrenFeaturedReady",{detail:{featured:F,topic:topic,doc:doc}}));
 }).catch(function(e){console.error("EvrenFeatured:",e)});
}
window.EvrenFeatured={load:load,getTopic:getTopic};
window.EVREN_FEATURED_READY=load();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();