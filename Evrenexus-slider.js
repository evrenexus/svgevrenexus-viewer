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
#Evrenxus-slider .Evrenxus-slide img{display:block;width:100%;height:100%;object-fit:cover;object-position:center center;image-rendering:auto;background:#202428}
#Evrenxus-slider .Evrenxus-slide:after{content:"";position:absolute;right:0;left:0;bottom:0;height:55%;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.88))}
#Evrenxus-slider .Evrenxus-slide-caption{position:absolute;right:0;bottom:0;z-index:3;width:100%;padding:55px 20px 20px;color:#fff;font-size:19px;font-weight:700;line-height:1.8}
#Evrenxus-slider .Evrenxus-slider-prev,#Evrenxus-slider .Evrenxus-slider-next{position:absolute;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:52px;padding:0;border:0;background:rgba(0,0,0,.48);color:#fff;font-family:Arial;font-size:28px;cursor:pointer}
#Evrenxus-slider .Evrenxus-slider-prev{left:0}#Evrenxus-slider .Evrenxus-slider-next{right:0}
#Evrenxus-slider .Evrenxus-slider-prev:hover,#Evrenxus-slider .Evrenxus-slider-next:hover{background:#d9232e}
#Evrenxus-slider .Evrenxus-slider-dots{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:15;display:flex;gap:5px}
#Evrenxus-slider .Evrenxus-slider-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);cursor:pointer}
#Evrenxus-slider .Evrenxus-slider-dot.active{background:#fff}
@media(max-width:700px){#Evrenxus-slider{width:100%!important;max-width:100%!important;height:auto!important;aspect-ratio:16/9;max-height:300px;margin:0 0 14px;border-radius:0;overflow:hidden;box-sizing:border-box}.Evrenxus-slide{width:100%!important;height:100%!important}.Evrenxus-slide a{width:100%!important;height:100%!important}.Evrenxus-slide img{width:100%!important;height:100%!important;object-fit:cover}.Evrenxus-slide-caption{box-sizing:border-box;width:100%!important;max-width:100%!important;padding:34px 10px 11px!important;font-size:13px!important;line-height:1.6!important}.Evrenxus-slider-prev,.Evrenxus-slider-next{width:28px!important;height:40px!important;font-size:21px!important}}
@media(max-width:380px){#Evrenxus-slider{aspect-ratio:16/9}.Evrenxus-slide-caption{font-size:11px!important;padding:30px 8px 9px!important;line-height:1.55!important}}
`;
var s=document.createElement("style");s.id="Evrenxus-slider-style";s.textContent=css;document.head.appendChild(s);
var host=document.getElementById("Evrenxus-slider-host");if(!host)return;
host.outerHTML='<div id="Evrenxus-slider"><div id="Evrenxus-slides"></div><button type="button" class="Evrenxus-slider-prev" id="Evrenxus-slider-prev">‹</button><button type="button" class="Evrenxus-slider-next" id="Evrenxus-slider-next">›</button><div id="Evrenxus-slider-dots" class="Evrenxus-slider-dots"></div></div>';
var slider=document.getElementById("Evrenxus-slider"),slidesContainer=document.getElementById("Evrenxus-slides"),dotsContainer=document.getElementById("Evrenxus-slider-dots"),current=0;
function proxy(v){return v?"https://images.weserv.nl/?url="+encodeURIComponent(v)+"&w=1200&q=88&output=webp":""}
function render(items,aiForFn){
items=items.slice(0,4);if(!items.length){slider.style.display="none";return}
items.forEach(function(x,i){
var slide=document.createElement("div");slide.className="Evrenxus-slide"+(i===0?" active":"");
var a=document.createElement("a");var es=(window.EVREN_EDITORIAL||{})[x.id]||{},aix=aiForFn(x),edited=es.edited===true,data=Object.assign({},x);if(edited){if(es.title!==undefined)data.title=es.title;if(es.image!==undefined)data.image=es.image}if(!data.image&&aix&&aix.image)data.image=aix.image;var permanentId=(aix&&aix.article_id)?String(aix.article_id):"";var internal=!!permanentId;if(permanentId){a.href="./article.html?id="+encodeURIComponent(permanentId)}else{internal=es.published===true&&data.content;a.href=internal?"./news-article.html?id="+encodeURIComponent(x.id):"./viewer.html?url="+encodeURIComponent(x.url)}if(!internal){a.target="_blank";a.rel="noopener noreferrer"}
if(data.image){var im=document.createElement("img");im.src=proxy(data.image);im.alt=data.title||"";im.loading=i===0?"eager":"lazy";im.referrerPolicy="no-referrer";im.onerror=function(){if(!this.dataset.p){this.dataset.p="1";this.src=data.image}else if(!this.dataset.p2){this.dataset.p2="1";this.src=proxy(data.image)}else{slide.remove();dot.remove();var left=slider.querySelectorAll(".Evrenxus-slide");if(!left.length){slider.style.display="none";return}current=Math.min(current,left.length-1);show(current)}};im.onload=function(){slide.classList.remove("no-image")};a.appendChild(im)}else{return}
var cap=document.createElement("div");cap.className="Evrenxus-slide-caption";cap.textContent=data.title||"";a.appendChild(cap);slide.appendChild(a);slidesContainer.appendChild(slide);
var dot=document.createElement("span");dot.className="Evrenxus-slider-dot"+(i===0?" active":"");dot.onclick=function(){show(i)};dotsContainer.appendChild(dot);
});
var slides=slider.querySelectorAll(".Evrenxus-slide"),dots=slider.querySelectorAll(".Evrenxus-slider-dot");
function show(i){if(!slides.length)return;if(i>=slides.length)i=0;if(i<0)i=slides.length-1;slides[current].classList.remove("active");dots[current].classList.remove("active");current=i;slides[current].classList.add("active");dots[current].classList.add("active")}
document.getElementById("Evrenxus-slider-prev").onclick=function(){show(current-1)};document.getElementById("Evrenxus-slider-next").onclick=function(){show(current+1)};
if(slides.length>1)setInterval(function(){show(current+1)},5000);
}
var q=new URLSearchParams(location.search),topic=q.get("topic")||(location.pathname.endsWith("/index.html")||location.pathname.endsWith("/")?"all":"economy");
Promise.all([
fetch("./data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():{} }).catch(function(){return{}}),
fetch("./data/editorial.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():{} }).catch(function(){return{}}),
fetch("./data/news-ai.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():{} }).catch(function(){return{}})
]).then(function(ds){
var d=ds[0]||{},ed=ds[1]||{},ai=ds[2]||{},ei=ed.items||{},aii=ai.items||{};window.EVREN_EDITORIAL=ei;
var aiByTitle={};Object.keys(aii).forEach(function(id){var z=aii[id];if(z&&z.title)aiByTitle[z.title]=z;});
var edByTitle={};Object.keys(ei).forEach(function(id){var z=ei[id];if(z&&z.title)edByTitle[z.title]=z;});
function aiFor(x){return aii[x.id]||aiByTitle[x.title]||{};}
function edFor(x){return ei[x.id]||edByTitle[x.title]||{};}
var all=(d.items||[]).filter(function(x){
return x&&x.title&&x.published&&x.url;
});
var items=all.filter(function(x){
var s=edFor(x),a=aiFor(x);
var permanentId=a.article_id||(s&&s.article_id);
var publishedArticle=!!(a.status==="published"||s.status==="published"||s.published===true);
var imageAvailable=!!(x.image||(a&&a.image)||(s&&s.image));
if(s.deleted===true||a.auto_publishable===false||a.publishable===false||a.political===true||s.ai_political===true||a.auto_political===true||!permanentId||!publishedArticle||!imageAvailable)return false;
var text=((x.title||"")+" "+(x.summary||"")).replace(/\u200c/g," ").toLowerCase();
var bad=["انتخابات","انتخاباتی","مجلس","نماینده مجلس","پارلمان","سناتور","رئیس جمهور","رییس جمهور","وزیر","سیاستمدار","دیپلمات","مقام سیاسی","مقام دولتی","اعتراض","اعتراضات","جنبش اعتراضی","تظاهرات","بازداشت","وثیقه","قوه قضائیه","قوه قضاییه","دادگاه","دادسرا","دادستان","زندانی سیاسی","رئیس سازمان زندان","سازمان زندان ها","سازمان زندان‌ها","اظهارات","سخنان","تهدید","مذاکرات سیاسی","موضع گیری","موضع‌گیری"];
if(a.auto_publishable!==true&&a.publishable!==true&&bad.some(function(k){return text.indexOf(k.toLowerCase())!==-1}))return false;
var important=s.manual_important===true||s.auto_important===true||a.important===true;
if(!important)return false;
var importantTopics=Array.isArray(a.important_topics)?a.important_topics:[];
var chosenTopic=s.category||x.category||topic;
var imageAvailable=!!(x.image||(a&&a.image)||(s&&s.image));
if(!imageAvailable)return false;
return topic==="all"||importantTopics.indexOf(topic)!==-1||chosenTopic===topic;
});
items.sort(function(a,b){return new Date(b.published)-new Date(a.published)});

// Last-resort recovery: if editorial/AI metadata is temporarily unavailable,
// keep the slider visible instead of hiding the entire component.
render(items,aiFor);
}).catch(function(){slider.style.display="none"});
})();
