/* Evren Nexus — shared featured loader and safe page rendering */
(function(){
"use strict";
var URL_="data/public/featured.json",pending=null,policyPending=null,activeTopic="home";
function load(){
 if(!pending)pending=fetch(URL_+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("featured.json HTTP "+r.status);return r.json()}).catch(function(e){pending=null;throw e});
 return pending;
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
function getTopic(topic,page){
 var key=topic||"home";
 return Promise.all([load(),loadPolicy()]).then(function(parts){var doc=parts[0];
  var t=doc&&doc.topics&&doc.topics[key];
  if(!t||!Array.isArray(t.featured)||!Array.isArray(t.regular)){
   return buildClientFallback(key,Math.max(1,parseInt(page,10)||1),"");
  }
  var per=(doc.config&&doc.config.regularPerPage)||16,p=Math.max(1,parseInt(page,10)||1),start=(p-1)*per;
  var ff=filterItems(t.featured).filter(function(x){return topicMatches(x,key)}), rr=filterItems(t.regular).filter(function(x){return topicMatches(x,key)}); var imp=filterItems(t.important||[]).filter(function(x){return topicMatches(x,key)}); var ranked=function(items){return items.slice().sort(function(a,b){return (Number(b.score||b.importance_score||0)-Number(a.score||a.importance_score||0))||String(b.published||"").localeCompare(String(a.published||""));});}; if(!imp.length)imp=ranked(rr.filter(function(x){return !!x.articleUrl;})).slice(0,20); if(!ff.length)ff=(imp.length?imp:ranked(rr)).slice(0,4); return{ok:true,featured:ff,important:imp,regular:rr.slice(start,start+per),page:p,hasPrev:p>1,hasNext:start+per<rr.length};
 },function(e){
  return buildClientFallback(key,Math.max(1,parseInt(page,10)||1),"").catch(function(){return empty(String(e&&e.message||e))});
 });
}
function img(v){return typeof v==="string"&&/^https?:\/\//i.test(v.trim())?v.trim():"";}
function isCryptoItem(x){var z=normPolicy((x&&x.title||"")+" "+(x&&x.summary||"")+" "+(x&&x.source||""));return /(ارز دیجیتال|رمزارز|رمز ارز|بیت ?کوین|اتریوم|تتر|بایننس|کریپتو|کریپتوکارنسی|دوج ?کوین|ریپل|سولانا|کاردانو|ترون|لایت ?کوین|توکن|بلاک ?چین|بلاکچین|دیفای|وب ?۳|web3|bitcoin|ethereum|crypto|cryptocurrency|blockchain|altcoin|defi|solana|ripple|dogecoin|binance|stablecoin|token)/i.test(z);}
function isSportsItem(x){var z=normPolicy((x&&x.title||"")+" "+(x&&x.summary||""));return /(فوتبال|فوتبالی|لیگ برتر|ورزشگاه|پرسپولیس|استقلال تهران|به مصاف|والیبال|بسکتبال|گلزنی|گل زد|قهرمانی لیگ|جام حذفی|تیم ملی|مسابقه فوتبال|نتیجه بازی|بازی را با پیروزی|دیدار تیم های|دیدار تیم‌های)/i.test(z);}
function topicMatches(x,topic){var ts=Array.isArray(x&&x.topics)?x.topics:[];if(topic==="economy-investment"){if(isSportsItem(x))return false;return ts.indexOf("economy")!==-1||ts.indexOf("markets")!==-1||ts.indexOf("economy-investment")!==-1;}if(topic==="crypto")return ts.indexOf("crypto")!==-1||isCryptoItem(x);if(topic==="technology-ai")return ts.indexOf("technology")!==-1||ts.indexOf("ai")!==-1||ts.indexOf("technology-ai")!==-1;if(topic!=="home"&&isSportsItem(x))return false;return topic==="home"||ts.indexOf(topic)!==-1;}
function renderOldWay(topic,page,q){
 return loadPolicy().then(function(){return fetch("data/public/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("public/news.json HTTP "+r.status);return r.json()}).catch(function(){return fetch("data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()})}).then(function(d){
  var items=filterItems(Array.isArray(d.items)?d.items:(Array.isArray(d)?d:[]));
  if(topic&&topic!=="home")items=items.filter(function(x){return topicMatches(x,topic)});
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
 var F=(r.featured||[]).slice(0,4),I=(r.important||[]).filter(function(x){return !!x.articleUrl;}).slice(0,4),list=document.getElementById("list"),important=document.getElementById("important"),ih=document.getElementById("importantList");
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
 if(ih){var ia=document.createElement("a");ia.href="./important-archive.html"+(activeTopic&&activeTopic!=="home"?"?topic="+encodeURIComponent(activeTopic):"");ia.textContent="مشاهده آرشیو مطالب مهم";ia.style.cssText="display:block;text-align:center;padding:10px;background:#f7f7f7;color:#d9232e;text-decoration:none;font-size:10px;font-weight:700;border-top:1px solid #edf0f1";ih.appendChild(ia);}

 var regular=(r.regular||[]).slice(0,16),list=document.getElementById("list");
 if(list){
   list.innerHTML="";
   regular.forEach(function(x){
     var a=document.createElement("a");a.className="item";a.href=x.url?"./viewer.html?url="+encodeURIComponent(x.url):"#";a.target="_blank";a.rel="noopener noreferrer";
     var u=img(x.image);if(u){var im=document.createElement("img");im.src=u;im.alt=x.title||"";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=function(){this.remove()};a.appendChild(im)}
     var cc=document.createElement("div");cc.className="content";
     var h2=document.createElement("div");h2.className="title";h2.textContent=x.title||"";cc.appendChild(h2);
     if(x.summary){
       var summaryText=String(x.summary).replace(/\s+/g," ").trim();
       var titleText=String(x.title||"").replace(/\s+/g," ").trim();
       var prefix=summaryText.indexOf("پست ")===0?"پست ":"";
       if(titleText && prefix && summaryText.slice(prefix.length,prefix.length+titleText.length)===titleText){summaryText=summaryText.slice(prefix.length+titleText.length).replace(/^\s*[/|:؛—–-]?\s*/,"").trim();}
       else if(titleText && summaryText.indexOf(titleText)===0){summaryText=summaryText.slice(titleText.length).replace(/^\s*[/|:؛—–-]?\s*/,"").trim();}
       if(summaryText && summaryText!==titleText){var sm2=document.createElement("div");sm2.className="summary";sm2.textContent=summaryText;cc.appendChild(sm2)}
     }
     var m2=document.createElement("div");m2.className="meta";m2.textContent=(x.source||"")+" • "+(x.published?new Date(x.published).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"");cc.appendChild(m2);
     a.appendChild(cc);list.appendChild(a);
   });
   if(!list.children.length)list.innerHTML='<div class="error">فعلاً مطلبی در این بخش پیدا نشد.</div>';
 }
 var pg=document.getElementById("news-pagination"),prev=document.getElementById("news-prev"),next=document.getElementById("news-next");
 if(pg){pg.style.display=(r.hasPrev||r.hasNext)?"flex":"none";if(prev){prev.disabled=!r.hasPrev;prev.onclick=function(){if(!r.hasPrev)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page-1));location.href=u.href}}if(next){next.disabled=!r.hasNext;next.onclick=function(){if(!r.hasNext)return;var u=new URL(location.href);u.searchParams.set("page",String(r.page+1));location.href=u.href}}}
}
function buildClientFallback(topic,page,q){
 return Promise.all([
  fetch("data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()}),
  fetch("data/editorial.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("editorial.json HTTP "+r.status);return r.json()}).catch(function(){return {items:{}}}),
  fetch("data/articles.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("articles.json HTTP "+r.status);return r.json()}).catch(function(){return {items:{}}}),
  fetch("data/news-ai.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news-ai.json HTTP "+r.status);return r.json()}).catch(function(){return {items:{}}})
 ]).then(function(parts){
  var raw=parts[0], ed=parts[1]||{}, ad=parts[2]||{}, aiDoc=parts[3]||{}, items=Array.isArray(raw)?raw:(Array.isArray(raw.items)?raw.items:[]);
  var em=ed.items||{}, rawArts=ad.items||ad.articles||ad, arts=Array.isArray(rawArts)?rawArts:Object.entries(rawArts).filter(function(kv){return kv[1]&&typeof kv[1]==="object"}).map(function(kv){return Object.assign({id:kv[0]},kv[1])}), rawAi=aiDoc.items||aiDoc, ais=Object.values(rawAi), rows=[];
  items.forEach(function(n){
   if(!n||!n.id||blockedByPolicy(n))return;
   var e=em[n.id]||{};
   if(e.ai_political===true||e.auto_publishable===false)return;
   var article=arts.find(function(a){return String(a.original_news_id||"")===String(n.id)||(n.group_id&&a.group_id&&String(a.group_id)===String(n.group_id))});
   var ai=ais.find(function(a){return a&&a.group_id&&((n.group_id&&String(a.group_id)===String(n.group_id))||(article&&article.group_id&&String(a.group_id)===String(article.group_id)))});
   var permanent=article&&article.status==="published"&&String(article.content||"").trim().length>0&&ai&&ai.important===true&&ai.publishable===true&&ai.political!==true&&e.auto_important===true&&Array.isArray(n.topics)&&n.topics.length>0;
   var articleId=permanent?String(article.id||article.slug||""):"";
   var articleUrl=permanent&&articleId?"articles/"+encodeURIComponent(articleId)+".html":"";
   rows.push({
    id:n.id,title:e.title||n.title,summary:e.summary||n.summary||"",image:e.image||n.image||"",
    source:n.source||"",published:n.published||"",url:n.url||"",
    articleId:articleId,articleUrl:articleUrl,
    topics:Array.from(new Set([].concat(Array.isArray(n.topics)?n.topics:[],Array.isArray(e.ai_topics)?e.ai_topics:[]).filter(Boolean))),
    important:!!articleUrl,score:Number(e.ai_importance)||Number(ai&&ai.importance)||0
   });
  });
  var filtered=topic&&topic!=="home"?rows.filter(function(x){return topicMatches(x,topic)}):rows.slice();
  filtered.sort(function(a,b){return (Number(b.important)-Number(a.important))||(b.score-a.score)||(new Date(b.published)-new Date(a.published));});
  var important=filtered.filter(function(x){return x.important});
  var featured=important.slice(0,4);
  var used={};featured.forEach(function(x){used[x.id]=true});
  if(featured.length<4){
    filtered.forEach(function(x){
      if(featured.length>=4||used[x.id])return;
      featured.push(x);used[x.id]=true;
    });
  }
  var regular=filtered.filter(function(x){return !used[x.id]}).slice((Math.max(1,page)-1)*16,Math.max(1,page)*16);
  return {ok:true,featured:featured,important:important,regular:regular,page:Math.max(1,page),hasPrev:page>1,hasNext:Math.max(1,page)*16<filtered.length};
 });
}
function renderPage(){
 var qx=new URLSearchParams(location.search),topic=qx.get("topic")||"home",page=Math.max(1,parseInt(qx.get("page"),10)||1),q=(qx.get("q")||"").trim().toLowerCase();activeTopic=topic;
 getTopic(topic,page).then(function(r){if(!r.ok){console.warn("featured.json:",r.reason);return buildClientFallback(topic,page,q).then(render).catch(function(e){console.warn("client fallback:",e);return renderOldWay(topic,page,q)})}render(r)}).catch(function(e){console.warn("featured.json:",e);buildClientFallback(topic,page,q).then(render).catch(function(){renderOldWay(topic,page,q)});});
}
window.EvrenFeatured={load:load,getTopic:getTopic,render:renderPage};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderPage,{once:true});else renderPage();
})();