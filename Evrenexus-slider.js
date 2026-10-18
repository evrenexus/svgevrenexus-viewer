/* Evren Nexus — SHARED NEWS SLIDER */
(function(){
"use strict";
if(document.getElementById("Evrenxus-slider")) return;
var css=`
#Evrenxus-slider{position:relative;width:100%;height:315px;margin:0 0 20px;background:#15191c;overflow:hidden;box-sizing:border-box;direction:rtl}
#Evrenxus-slider .Evrenxus-slide.no-image{background:linear-gradient(135deg,#202c35,#0f1418)}
#Evrenxus-slider .Evrenxus-slide{display:none;position:relative;width:100%;height:315px;overflow:hidden}
#Evrenxus-slider .Evrenxus-slide.active{display:block}
#Evrenxus-slider .Evrenxus-slide a{display:block;width:100%;height:100%;color:#fff;text-decoration:none;overflow:hidden}
#Evrenxus-slider .Evrenxus-slide img{display:block;width:100%;height:100%;object-fit:contain;object-position:center center;image-rendering:auto;background:#10161b}
#Evrenxus-slider .Evrenxus-slide:after{content:"";position:absolute;right:0;left:0;bottom:0;height:55%;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.88))}
#Evrenxus-slider .Evrenxus-slide-caption{position:absolute;top:14px;right:14px;bottom:auto;z-index:3;box-sizing:border-box;width:auto;max-width:82%;padding:12px 17px;background:rgba(13,22,29,.91);border-right:5px solid #d9232e;border-radius:0 0 0 3px;box-shadow:0 4px 18px rgba(0,0,0,.4);color:#fff;text-align:right;text-shadow:0 1px 2px rgba(0,0,0,.8);font-size:18px;font-weight:800;line-height:1.75;overflow-wrap:anywhere;max-height:42%;overflow:hidden}
#Evrenxus-slider .Evrenxus-slider-prev,#Evrenxus-slider .Evrenxus-slider-next{position:absolute;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:52px;padding:0;border:0;background:rgba(0,0,0,.48);color:#fff;font-family:Arial;font-size:28px;cursor:pointer}
#Evrenxus-slider .Evrenxus-slider-prev{left:0}#Evrenxus-slider .Evrenxus-slider-next{right:0}
#Evrenxus-slider .Evrenxus-slider-prev:hover,#Evrenxus-slider .Evrenxus-slider-next:hover{background:#d9232e}
#Evrenxus-slider .Evrenxus-slider-dots{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:15;display:flex;gap:5px}
#Evrenxus-slider .Evrenxus-slider-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);cursor:pointer}
#Evrenxus-slider .Evrenxus-slider-dot.active{background:#fff}
@media(max-width:700px){#Evrenxus-slider{width:100%!important;max-width:100%!important;height:auto!important;aspect-ratio:16/9;max-height:300px;margin:0 0 14px;border-radius:0;overflow:hidden;box-sizing:border-box}.Evrenxus-slide{width:100%!important;height:100%!important}.Evrenxus-slide a{width:100%!important;height:100%!important}.Evrenxus-slide img{width:100%!important;height:100%!important;object-fit:contain;background:#10161b}.Evrenxus-slide-caption{top:10px!important;right:10px!important;bottom:auto!important;box-sizing:border-box;width:auto!important;max-width:88%!important;padding:8px 11px!important;font-size:12.5px!important;line-height:1.75!important;border-right-width:4px!important;box-shadow:0 3px 12px rgba(0,0,0,.45)!important}.Evrenxus-slider-prev,.Evrenxus-slider-next{width:28px!important;height:40px!important;font-size:21px!important}}
@media(max-width:380px){#Evrenxus-slider{aspect-ratio:16/9}.Evrenxus-slide-caption{font-size:11px!important;padding:7px 9px!important;line-height:1.6!important;max-width:90%!important}}
`;
var s=document.createElement("style");s.id="Evrenxus-slider-style";s.textContent=css;document.head.appendChild(s);
var host=document.getElementById("Evrenxus-slider-host");if(!host)return;
host.outerHTML='<div id="Evrenxus-slider"><div id="Evrenxus-slides"></div><button type="button" class="Evrenxus-slider-prev" id="Evrenxus-slider-prev">‹</button><button type="button" class="Evrenxus-slider-next" id="Evrenxus-slider-next">›</button><div id="Evrenxus-slider-dots" class="Evrenxus-slider-dots"></div></div>';
var slider=document.getElementById("Evrenxus-slider"),slidesContainer=document.getElementById("Evrenxus-slides"),dotsContainer=document.getElementById("Evrenxus-slider-dots"),current=0,slideTimer=null;
function proxy(v){return v?"https://images.weserv.nl/?url="+encodeURIComponent(v)+"&w=1200&q=88&output=webp":""}
function render(items,aiForFn){
items=items.filter(function(x){return String(x&&x.title||"").trim().length>0}).slice(0,8);if(!items.length){slider.style.display="none";return}
items.forEach(function(x,i){
var slide=document.createElement("div");slide.className="Evrenxus-slide"+(i===0?" active":"");
var a=document.createElement("a");var es=(window.EVREN_EDITORIAL||{})[x.id]||{},aix=aiForFn(x),edited=es.edited===true,data=Object.assign({},x);if(edited){if(es.title!==undefined)data.title=es.title;if(es.image!==undefined)data.image=es.image}if(!data.image&&aix&&aix.image)data.image=aix.image;var permanentId=(aix&&aix.article_id)?String(aix.article_id):"";var permanentUrl=String(data.articleUrl||x.articleUrl||"").replace(/^\.\//,"");var internal=!!(permanentUrl||permanentId);if(data.wordpress&&data.url){a.href=data.url;internal=true}else if(permanentUrl){a.href="./"+permanentUrl}else if(permanentId){a.href="./article.html?id="+encodeURIComponent(permanentId)}else{internal=es.published===true&&data.content;a.href=internal?"./news-article.html?id="+encodeURIComponent(x.id):"./viewer.html?url="+encodeURIComponent(x.url)}if(!internal){a.target="_blank";a.rel="noopener noreferrer"}
if(data.image){var im=document.createElement("img");im.src=proxy(data.image);im.alt=data.title||"";im.loading=i===0?"eager":"lazy";im.referrerPolicy="no-referrer";im.onerror=function(){if(!this.dataset.p){this.dataset.p="1";this.src=data.image}else if(!this.dataset.p2){this.dataset.p2="1";this.src=proxy(data.image)}else{slide.remove();dot.remove();var left=slider.querySelectorAll(".Evrenxus-slide");if(!left.length){slider.style.display="none";return}current=Math.min(current,left.length-1);show(current)}};im.onload=function(){slide.classList.remove("no-image")};a.appendChild(im)}else{slide.classList.add("no-image")}
var cap=document.createElement("div");cap.className="Evrenxus-slide-caption";cap.textContent=data.title||"";a.appendChild(cap);slide.appendChild(a);slidesContainer.appendChild(slide);
var dot=document.createElement("span");dot.className="Evrenxus-slider-dot"+(i===0?" active":"");dot.onclick=function(){show(i)};dotsContainer.appendChild(dot);
});
var slides=slider.querySelectorAll(".Evrenxus-slide"),dots=slider.querySelectorAll(".Evrenxus-slider-dot");
function show(i){if(!slides.length)return;if(i>=slides.length)i=0;if(i<0)i=slides.length-1;slides[current].classList.remove("active");dots[current].classList.remove("active");current=i;slides[current].classList.add("active");dots[current].classList.add("active")}
document.getElementById("Evrenxus-slider-prev").onclick=function(){show(current-1)};document.getElementById("Evrenxus-slider-next").onclick=function(){show(current+1)};
if(slideTimer)clearInterval(slideTimer);slideTimer=slides.length>1?setInterval(function(){show(current+1)},5000):null;
}
var NEWS_URL="./data/news.json";
var EDITORIAL_URL="./data/editorial.json";
var ALLOWED_TOPICS=["economy","markets","economy-investment","crypto","currency-gold","real-estate","technology","technology-ai","ai","health","auto","science-life"];
function aiFor(){return{}}
function renderFeatured(){
 return Promise.all([
  fetch(NEWS_URL+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("news.json HTTP "+r.status);return r.json()}),
  fetch(EDITORIAL_URL+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("editorial.json HTTP "+r.status);return r.json()})
 ]).then(function(parts){
  var raw=parts[0],editorial=parts[1]&&parts[1].items||{};
  var news=Array.isArray(raw)?raw:(Array.isArray(raw.items)?raw.items:(Array.isArray(raw.news)?raw.news:[]));
  window.EVREN_EDITORIAL=editorial;
  var byId=Object.create(null);news.forEach(function(n){if(n&&n.id!=null)byId[String(n.id)]=n});
  var items=Object.keys(editorial).map(function(id){
   var s=editorial[id]||{},n=byId[String(id)];
   if(s.manual_slider!==true||s.deleted===true||s.hidden===true||s.reject===true||!n)return null;
   var topics=s.topics_manual===true&&Array.isArray(s.topics)?s.topics:(Array.isArray(n.topics)?n.topics:[]);
   return {
    id:String(id),title:String(s.title!==undefined?s.title:(n.title||"")).trim(),
    summary:String(s.summary!==undefined?s.summary:(n.summary||"")),
    image:(/^https?:\/\//i.test(String(s.image||"").trim())?String(s.image).trim():(n.image||"")),
    source:String(n.source||"Evren Nexus"),published:String(n.published||s.updated_at||""),
    url:String(n.url||""),articleUrl:String(s.article_url||"").replace(/^\.\//,""),
    content:String(s.content||""),topics:topics,updated_at:String(s.updated_at||"")
   };
  }).filter(function(x){return x&&x.title&&x.url});
  items.sort(function(a,b){return (Date.parse(b.updated_at)||Date.parse(b.published)||0)-(Date.parse(a.updated_at)||Date.parse(a.published)||0)});
  if(items.length){
   render(items.slice(0,8),aiFor);
  }else{
   console.warn("Evrenexus-slider: no manual selections; using latest available news as fallback.");
   renderFallback(news);
  }
 }).catch(function(e){
  console.warn("Evrenexus-slider manual selection failed; trying public news fallback:",e);
  fetch("./data/public/news.json?v="+Date.now(),{cache:"no-store"})
   .then(function(r){if(!r.ok)throw Error("public news HTTP "+r.status);return r.json()})
   .then(function(d){renderFallback(Array.isArray(d)?d:(d&&Array.isArray(d.items)?d.items:[]))})
   .catch(function(fallbackError){
    console.error("Evrenexus-slider fallback failed:",fallbackError);
    slider.style.display="none";
   });
 });
}
function renderFallback(news){
 var items=(Array.isArray(news)?news:[]).map(function(n){
  if(!n)return null;
  return {
   id:String(n.id||n.article_id||n.url||""),
   title:String(n.title||"").trim(),
   summary:String(n.summary||""),
   image:String(n.image||n.image_url||""),
   source:String(n.source||"Evren Nexus"),
   published:String(n.published||n.updated_at||""),
   updated_at:String(n.updated_at||n.published||""),
   url:String(n.url||n.source_url||""),
   articleUrl:String(n.articleUrl||n.article_url||""),
   content:String(n.content||""),
   topics:Array.isArray(n.topics)?n.topics:[]
  };
 }).filter(function(x){return x&&x.title&&(x.url||x.articleUrl)});
 items.sort(function(a,b){return (Date.parse(b.updated_at)||Date.parse(b.published)||0)-(Date.parse(a.updated_at)||Date.parse(a.published)||0)});
 if(items.length)render(items.slice(0,8),aiFor);
 else{console.error("Evrenexus-slider: no usable news items for fallback.");slider.style.display="none";}
}
function renderWordPressPosts(posts){
 slidesContainer.innerHTML="";dotsContainer.innerHTML="";current=0;slider.style.display="";
 var items=(Array.isArray(posts)?posts:[]).map(function(p){return{
  id:String(p.id),title:p.title,summary:p.summary,image:p.image,url:p.url,articleUrl:"",
  source:p.source||"Evren Nexus",published:p.published,updated_at:p.updated_at,
  content:"",topics:p.topics||[],wordpress:true
 }});
 if(items.length){render(items.slice(0,8),aiFor)}else{slider.style.display="none"}
}
if(window.EvrenWordPress&&typeof window.EvrenWordPress.getPosts==="function"){
 window.EvrenWordPress.getPosts(true).then(function(posts){
  if(posts&&posts.length)renderWordPressPosts(posts);else renderFeatured();
 }).catch(function(e){console.warn("WordPress slider feed unavailable:",e);slidesContainer.innerHTML="";dotsContainer.innerHTML="";slider.style.display="none"});
 window.setInterval(function(){window.EvrenWordPress.getPosts(true).then(renderWordPressPosts).catch(function(e){console.warn("WordPress slider refresh failed:",e);});},120000);
}else{renderFeatured()}
})();
