/* Evren Nexus — compact important-news card beside homepage slider */
(function(){
"use strict";
var slot=document.getElementById("Evrenxus-slider-card-items");
if(!slot)return;
function text(v){return String(v==null?"":v).replace(/\s+/g," ").trim();}
function date(v){if(!v)return "";var d=new Date(v);if(isNaN(d.getTime()))return "";try{return d.toLocaleString("fa-IR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch(e){return "";}}
Promise.all([
 fetch("./data/editorial.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("editorial "+r.status);return r.json()}),
 fetch("./data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news "+r.status);return r.json()})
]).then(function(p){
 var ed=p[0]&&p[0].items||{},raw=p[1],news=Array.isArray(raw)?raw:(Array.isArray(raw.items)?raw.items:(Array.isArray(raw.news)?raw.news:[])),byId={};
 news.forEach(function(n){if(n&&n.id!=null)byId[String(n.id)]=n;});
 var items=Object.keys(ed).map(function(id){var s=ed[id]||{},n=byId[String(id)]||{};if(s.manual_important!==true||s.deleted===true||s.hidden===true)return null;return {title:text(s.title||n.title),url:s.article_url?("./"+String(s.article_url).replace(/^\.\//,"")):(n.url?"./viewer.html?url="+encodeURIComponent(n.url):""),published:n.published||s.updated_at||""};}).filter(function(x){return x&&x.title&&x.url;});
 items.sort(function(a,b){return (Date.parse(b.published)||0)-(Date.parse(a.published)||0);});
 slot.textContent="";
 if(!items.length){var empty=document.createElement("div");empty.textContent="مطالب مهمی برای نمایش انتخاب نشده است.";empty.style.cssText="padding:10px;color:#8998a3;font:10px/1.8 Tahoma,Arial,sans-serif";slot.appendChild(empty);return;}
 items.slice(0,3).forEach(function(x){var a=document.createElement("a");a.className="Evrenxus-slider-card-item";a.href=x.url;var t=document.createElement("span");t.textContent=x.title;a.appendChild(t);var dt=date(x.published);if(dt){var tm=document.createElement("span");tm.className="Evrenxus-slider-card-time";tm.textContent=dt;a.appendChild(tm);}slot.appendChild(a);});
}).catch(function(e){console.warn("Slider adjacent card failed:",e);slot.textContent="دریافت مطالب مهم انجام نشد.";});
})();
