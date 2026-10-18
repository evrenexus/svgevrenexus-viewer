/* Evren Nexus — shared featured loader and safe page rendering */
(function(){
"use strict";
var URL_="data/public/featured.json",LATEST_URL_="data/public/latest-news.json",pending=null,latestPending=null,policyPending=null,editorialPending=null,deletedEditorial={},activeTopic="home";
function loadEditorial(){
 if(!editorialPending)editorialPending=fetch("data/editorial.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("editorial.json HTTP "+r.status);return r.json()}).then(function(d){deletedEditorial={};Object.keys(d&&d.items||{}).forEach(function(id){if(d.items[id]&&d.items[id].deleted===true)deletedEditorial[String(id)]=true});return deletedEditorial}).catch(function(e){editorialPending=null;console.warn("Editorial status unavailable:",e);return deletedEditorial});
 return editorialPending;
}
function hideDeleted(doc){if(!doc||!doc.topics)return doc;Object.keys(doc.topics).forEach(function(k){var t=doc.topics[k];["items","featured","important","regular"].forEach(function(key){if(Array.isArray(t[key]))t[key]=t[key].filter(function(x){return !deletedEditorial[String(x&&x.id||"")]})})});return doc;}
function load(){
 if(!pending)pending=Promise.all([fetch(URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("featured.json HTTP "+r.status);return r.json()}),loadEditorial()]).then(function(parts){return hideDeleted(parts[0])}).catch(function(e){pending=null;throw e});
 return pending;
}
function loadLatest(){
 if(!latestPending)latestPending=Promise.all([fetch(LATEST_URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("latest-news.json HTTP "+r.status);return r.json()}),loadEditorial()]).then(function(parts){return hideDeleted(parts[0])}).catch(function(e){latestPending=null;throw e});
 return latestPending;
}
var FALLBACK_POLICY=["جنگ","جنگی","جنگ افزار","درگیری","درگیری مسلحانه","مسلحانه","نظامی","نظامیان","ارتش","سپاه","نیروهای مسلح","نیروی انتظامی","موشک","موشکی","پهپاد","بمباران","جنگنده","حمله","حمله مسلحانه","حمله نظامی","حمله موشکی","حمله هوایی","تسلیحات","سلاح","رزمایش","آتش بس","انفجار","تیراندازی","ترور","تروریستی","غزه","حماس","حزب الله","حوثی","اسرائیل","رژیم صهیونیستی","صهیونیستی","صهیونیست","نتانیاهو","ترامپ","بایدن","پوتین","شهید","شهادت","رهبر انقلاب","رهبری","انتخابات","انتخاباتی","نماینده مجلس","مجلس شورای اسلامی","مجلس","سیاست","سیاسی","سیاستمدار","مقام سیاسی","حادثه","حوادث","تصادف","آتش سوزی","زلزله","زمین لرزه","پس لرزه","فروریختن","فرو ریختن","ریزش ساختمان","فروپاشی ساختمان","رانش زمین","آواربرداری"];
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
function loadWordPressItems(){
 if(!window.EvrenWordPress||typeof window.EvrenWordPress.getPosts!=="function")return Promise.resolve([]);
 return window.EvrenWordPress.getPosts().then(function(posts){return Array.isArray(posts)?posts:[];}).catch(function(e){console.warn("WordPress posts unavailable in news list:",e);return[];});
}
function mergeWordPressItems(items,posts,topic,query){
 var key=topic||"home",q=String(query||"").trim().toLowerCase(),out=[],seen=Object.create(null);
 (Array.isArray(posts)?posts:[]).filter(function(x){return x&&x.wordpress&&x.title&&x.url&&topicMatches(x,key);}).forEach(function(x){
  if(q&&((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(q)===-1)return;
  var k=String(x.url||"").replace(/\/$/,"").toLowerCase()||String(x.title||"").toLowerCase();
  if(seen[k])return;seen[k]=true;out.push(x);
 });
 (Array.isArray(items)?items:[]).forEach(function(x){
  var k=String(x.url||"").replace(/\/$/,"").toLowerCase()||String(x.title||"").toLowerCase();
  if(seen[k])return;
  if(q&&((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(q)===-1)return;
  seen[k]=true;out.push(x);
 });
 out.sort(function(a,b){return (Date.parse(b.published)||0)-(Date.parse(a.published)||0)||String(a.id||"").localeCompare(String(b.id||""));});
 return out;
}
function getTopic(topic,page,q){
 var key=topic||"home",query=String(q||"").trim().toLowerCase();
 return Promise.all([loadLatest(),loadPolicy(),loadWordPressItems()]).then(function(parts){
  var latest=parts[0],lt=latest&&latest.topics&&latest.topics[key];
  if(!lt||!Array.isArray(lt.items))throw Error("latest-news.json topic missing: "+key);
  var per=21,p=Math.max(1,parseInt(page,10)||1);
  var base=filterItems(lt.items).filter(function(x){return topicMatches(x,key);});
  var rr=mergeWordPressItems(base,parts[2],key,query);
  var start=(p-1)*per;
  return{ok:true,featured:[],important:[],regular:rr.slice(start,start+per),page:p,hasPrev:p>1,hasNext:start+per<rr.length};
 });
}
function img(v){return typeof v==="string"&&/^https?:\/\//i.test(v.trim())?v.trim():"";}
function isCryptoItem(x){var z=normPolicy((x&&x.title||"")+" "+(x&&x.summary||"")+" "+(x&&x.source||""));return /(ارز دیجیتال|رمزارز|رمز ارز|بیت ?کوین|اتریوم|تتر|بایننس|کریپتو|کریپتوکارنسی|دوج ?کوین|ریپل|سولانا|کاردانو|ترون|لایت ?کوین|توکن|بلاک ?چین|بلاکچین|دیفای|وب ?۳|web3|bitcoin|ethereum|crypto|cryptocurrency|blockchain|altcoin|defi|solana|ripple|dogecoin|binance|stablecoin|token)/i.test(z);}
function isSportsItem(x){var z=normPolicy((x&&x.title||"")+" "+(x&&x.summary||""));return /(فوتبال|فوتبالی|لیگ برتر|ورزشگاه|پرسپولیس|استقلال تهران|به مصاف|والیبال|بسکتبال|گلزنی|گل زد|قهرمانی لیگ|جام حذفی|تیم ملی|مسابقه فوتبال|نتیجه بازی|بازی را با پیروزی|دیدار تیم های|دیدار تیم‌های)/i.test(z);}
function topicMatches(x,topic){var ts=Array.isArray(x&&x.topics)?x.topics:[];if(topic==="economy-investment"){if(isSportsItem(x))return false;return ts.indexOf("economy")!==-1||ts.indexOf("markets")!==-1||ts.indexOf("economy-investment")!==-1;}if(topic==="crypto")return ts.indexOf("crypto")!==-1||isCryptoItem(x);if(topic==="technology-ai")return ts.indexOf("technology")!==-1||ts.indexOf("ai")!==-1||ts.indexOf("technology-ai")!==-1;if(topic!=="home"&&isSportsItem(x))return false;return topic==="home"||ts.indexOf(topic)!==-1;}
function renderOldWay(topic,page,q){
 return fetch("data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()}).then(function(d){
  var items=Array.isArray(d)?d:(Array.isArray(d.items)?d.items:(Array.isArray(d.news)?d.news:[]));
  items=filterItems(items.filter(function(x){return x&&x.id&&x.title&&x.url;}));
  if(topic&&topic!=="home")items=items.filter(function(x){return topicMatches(x,topic)});
  if(q)items=items.filter(function(x){return((x.title||"")+" "+(x.summary||"")+" "+(x.source||"")).toLowerCase().indexOf(String(q).toLowerCase())!==-1});
  items.sort(function(a,b){return (Date.parse(b.published)||0)-(Date.parse(a.published)||0)||String(a.id||"").localeCompare(String(b.id||""));});
  var list=document.getElementById("list");if(!list)return;
  list.innerHTML="";
  items.slice((page-1)*21,page*21).forEach(function(x){
   var a=document.createElement("a");a.className="item";a.href=x.articleUrl?"./"+String(x.articleUrl).replace(/^\.\//,""):(x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#");if(!x.articleUrl){a.target="_blank";a.rel="noopener noreferrer";}
   var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im)}
   var c=document.createElement("div");c.className="content";var h=document.createElement("div");h.className="title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);list.appendChild(a);
  });
  if(!list.children.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>';
  var total=Math.max(1,Math.ceil(items.length/21)),pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
  if(pg){pg.style.display=total>1?"flex":"none";if(prev){prev.disabled=page<=1;prev.onclick=function(){if(page<=1)return;var u=new URL(location.href);u.searchParams.set("page",String(page-1));location.href=u.href}}if(next){next.disabled=page>=total;next.onclick=function(){if(page>=total)return;var u=new URL(location.href);u.searchParams.set("page",String(page+1));location.href=u.href}}}
 }).catch(function(e){var list=document.getElementById("list");if(list)list.innerHTML='<div class="error">دریافت آخرین مطالب انجام نشد.</div>';console.warn("latest-news fallback:",e)});
}
function recentImportant(items,topic){var now=Date.now(),cutoff=now-10*60*60*1000;return filterItems(items).filter(function(x){var selected=Date.parse(x&& (x.selectedAt||x.published)||"");return !!(x&&x.articleUrl)&&Number.isFinite(selected)&&selected>=cutoff&&selected<=now+5*60*1000&&topicMatches(x,topic||"home")}).sort(function(a,b){return String(b.selectedAt||b.published||"").localeCompare(String(a.selectedAt||a.published||""))||Number(b.score||0)-Number(a.score||0)}).slice(0,20)}
function renderAiBoxes(doc,topic){
 var key=topic||"home",t=doc&&doc.topics&&doc.topics[key]||{};
 var F=filterItems(t.featured||[]).filter(function(x){return topicMatches(x,key)}).slice(0,4);
 var I=recentImportant(t.important||[],key);
 var important=document.getElementById("important"),ih=document.getElementById("importantList"),br=document.getElementById("Evrenxus-breaking-track");
 if(br){br.innerHTML="";if(F.length){var tk=document.createElement("div");tk.className="Evrenxus-breaking-ticker";var g=document.createElement("div");g.className="Evrenxus-breaking-group";F.forEach(function(x){if(!x.articleUrl)return;var a=document.createElement("a");a.href="./"+x.articleUrl;a.textContent=x.title||"";g.appendChild(a)});tk.appendChild(g);tk.appendChild(g.cloneNode(true));br.appendChild(tk)}else br.textContent="فعلاً مطلب مهمی برای این موضوع وجود ندارد."}
 if(important)important.style.display="";
 if(ih){ih.innerHTML="";I.forEach(function(x){
   var a=document.createElement("a");a.className="important-item";a.href="./"+x.articleUrl;
   var iu=img(x.image);if(iu){var im=document.createElement("img");im.src=iu;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im);}
   var c=document.createElement("div");c.className="important-content";var h=document.createElement("div");h.className="important-title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="important-summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="important-meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);ih.appendChild(a);
 });}
 if(ih){var ia=document.createElement("a");ia.href="./important-archive.html"+(key&&key!=="home"?"?topic="+encodeURIComponent(key):"");ia.textContent="مطالب مهم";ia.style.cssText="display:block;text-align:center;padding:10px;background:#f8fafb;color:#d64c43;text-decoration:none;font-size:10px;font-weight:700;border-top:1px solid #e8edf1";ih.appendChild(ia);}
}
function render(r){
 var F=(r.featured||[]).slice(0,4),I=recentImportant(r.important||[],activeTopic),list=document.getElementById("list"),important=document.getElementById("important"),ih=document.getElementById("importantList");
 var br=document.getElementById("Evrenxus-breaking-track");
 if(br){br.innerHTML="";if(F.length){var tk=document.createElement("div");tk.className="Evrenxus-breaking-ticker";var g=document.createElement("div");g.className="Evrenxus-breaking-group";F.forEach(function(x){if(!x.articleUrl)return;var a=document.createElement("a");a.href="./"+x.articleUrl;a.textContent=x.title||"";g.appendChild(a)});tk.appendChild(g);tk.appendChild(g.cloneNode(true));br.appendChild(tk)}else br.textContent="فعلاً مطلب مهمی برای این موضوع وجود ندارد."}
 if(important)important.style.display="";
 if(ih){ih.innerHTML="";I.forEach(function(x){
   if(!x.articleUrl)return;
   var a=document.createElement("a");a.className="important-item";a.href="./"+x.articleUrl;
   var iu=img(x.image);if(iu){var im=document.createElement("img");im.src=iu;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im);}
   var c=document.createElement("div");c.className="important-content";var h=document.createElement("div");h.className="important-title";h.textContent=x.title||"";c.appendChild(h);
   if(x.summary){var sm=document.createElement("div");sm.className="important-summary";sm.textContent=x.summary;c.appendChild(sm)}
   var m=document.createElement("div");m.className="important-meta";m.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");c.appendChild(m);a.appendChild(c);ih.appendChild(a);
 });}
 if(ih){var ia=document.createElement("a");ia.href="./important-archive.html"+(activeTopic&&activeTopic!=="home"?"?topic="+encodeURIComponent(activeTopic):"");ia.textContent="مشاهده آرشیو مطالب مهم";ia.style.cssText="display:block;text-align:center;padding:10px;background:#f8fafb;color:#d64c43;text-decoration:none;font-size:10px;font-weight:700;border-top:1px solid #e8edf1";ih.appendChild(ia);}

 var regular=(r.regular||[]).slice(0,21),list=document.getElementById("list");
 if(list){
   list.innerHTML="";
   regular.forEach(function(x){
     var card=document.createElement("div");card.className="item";
     var fullUrl=x.wordpress&&x.url?x.url:(x.articleUrl?"./"+String(x.articleUrl).replace(/^\.\//,""):(x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#"));
     var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};card.appendChild(im)}
     var cc=document.createElement("div");cc.className="content";
     var h2=document.createElement("div");h2.className="title";
     var titleLink=document.createElement("a");titleLink.href=fullUrl;titleLink.textContent=x.title||"";titleLink.style.cssText="color:inherit;text-decoration:none";
     if(!x.articleUrl&&!x.wordpress){titleLink.target="_blank";titleLink.rel="noopener noreferrer"}
     h2.appendChild(titleLink);cc.appendChild(h2);
     if(x.summary){
       var summaryText=String(x.summary).replace(/\s+/g," ").trim();
       var titleText=String(x.title||"").replace(/\s+/g," ").trim();
       var prefix=summaryText.indexOf("پست ")===0?"پست ":"";
       if(titleText && prefix && summaryText.slice(prefix.length,prefix.length+titleText.length)===titleText){summaryText=summaryText.slice(prefix.length+titleText.length).replace(/^\s*[/|:؛—–-]?\s*/,"").trim();}
       else if(titleText && summaryText.indexOf(titleText)===0){summaryText=summaryText.slice(titleText.length).replace(/^\s*[/|:؛—–-]?\s*/,"").trim();}
       if(summaryText && summaryText!==titleText){var sm2=document.createElement("div");sm2.className="summary";sm2.textContent=summaryText;cc.appendChild(sm2)}
     }
     if(x.articleUrl){var full=document.createElement("a");full.href=fullUrl;full.className="Evrenxus-read-full";full.textContent="متن کامل ←";full.style.cssText="display:inline-block;margin-top:7px;color:#d64c43;font-size:10px;font-weight:700;text-decoration:none";cc.appendChild(full)}
     var m2=document.createElement("div");m2.className="meta";m2.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");cc.appendChild(m2);
     card.appendChild(cc);list.appendChild(card);
   });
   if(!list.children.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>';
 }
 var pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
 if(pg){pg.style.display=(r.hasPrev||r.hasNext)?"flex":"none";if(prev){prev.disabled=!r.hasPrev;prev.onclick=function(){if(!r.hasPrev)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page-1));location.href=u.href}}if(next){next.disabled=!r.hasNext;next.onclick=function(){if(!r.hasNext)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page+1));location.href=u.href}}}
}
function buildClientFallback(topic,page,q){
 return Promise.all([loadLatest(),loadPolicy(),loadWordPressItems()]).then(function(parts){
  var latest=parts[0],key=topic||"home",t=latest&&latest.topics&&latest.topics[key];
  if(!t||!Array.isArray(t.items))throw Error("latest-news.json topic missing: "+key);
  var items=filterItems(t.items).filter(function(x){return topicMatches(x,key);});
  items=mergeWordPressItems(items,parts[2],key,q);
  var p=Math.max(1,parseInt(page,10)||1),per=21,start=(p-1)*per;
  return{ok:true,featured:[],important:[],regular:items.slice(start,start+per),page:p,hasPrev:p>1,hasNext:start+per<items.length};
 });
}
function renderPage(){
 var qx=new URLSearchParams(location.search),topic=qx.get("topic")||"home",page=Math.max(1,parseInt(qx.get("page"),10)||1),q=(qx.get("q")||"").trim().toLowerCase();activeTopic=topic;
 function showLatest(r){render(r);load().then(function(doc){renderAiBoxes(doc,topic)}).catch(function(e){console.warn("important boxes unavailable; latest-news remains independent",e);});}
 getTopic(topic,page,q).then(showLatest).catch(function(e){console.warn("latest-news.json:",e);buildClientFallback(topic,page,q).then(showLatest).catch(function(e2){console.warn("latest-news fallback:",e2);renderOldWay(topic,page,q)});});
}
window.EvrenFeatured={load:load,getTopic:getTopic,render:renderPage};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderPage,{once:true});else renderPage();
})();