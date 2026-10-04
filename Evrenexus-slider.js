/* Evren Nexus — SHARED NEWS SLIDER */
(function(){
"use strict";
if(document.getElementById("Evrenxus-slider")) return;
var css=`
#Evrenxus-slider{position:relative;width:100%;height:315px;margin:0 0 20px;background:#15191c;overflow:hidden;box-sizing:border-box;direction:rtl}
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
@media(max-width:700px){#Evrenxus-slider{height:auto;aspect-ratio:1.85/1;margin-bottom:18px}.Evrenxus-slide{height:100%!important}.Evrenxus-slide-caption{padding:45px 12px 14px!important;font-size:14px!important}.Evrenxus-slider-prev,.Evrenxus-slider-next{width:31px!important;height:43px!important;font-size:23px!important}}
@media(max-width:380px){.Evrenxus-slide-caption{font-size:12px!important;padding:35px 9px 11px!important}}
`;
var s=document.createElement("style");s.id="Evrenxus-slider-style";s.textContent=css;document.head.appendChild(s);
var host=document.getElementById("Evrenxus-slider-host");if(!host)return;
host.outerHTML='<div id="Evrenxus-slider"><div id="Evrenxus-slides"></div><button type="button" class="Evrenxus-slider-prev" id="Evrenxus-slider-prev">‹</button><button type="button" class="Evrenxus-slider-next" id="Evrenxus-slider-next">›</button><div id="Evrenxus-slider-dots" class="Evrenxus-slider-dots"></div></div>';
var slider=document.getElementById("Evrenxus-slider"),slidesContainer=document.getElementById("Evrenxus-slides"),dotsContainer=document.getElementById("Evrenxus-slider-dots"),current=0;
function proxy(v){return v?"https://images.weserv.nl/?url="+encodeURIComponent(v)+"&w=1200&q=88&output=webp":""}
function render(items){
items=items.slice(0,5);if(!items.length){slider.style.display="none";return}
items.forEach(function(x,i){
var slide=document.createElement("div");slide.className="Evrenxus-slide"+(i===0?" active":"");
var a=document.createElement("a");a.href="./viewer.html?url="+encodeURIComponent(x.url);a.target="_blank";a.rel="noopener noreferrer";
if(x.image){var im=document.createElement("img");im.src=proxy(x.image);im.alt=x.title||"";im.loading=i===0?"eager":"lazy";im.referrerPolicy="no-referrer";im.onerror=function(){if(!this.dataset.p){this.dataset.p="1";this.src=x.image}else if(!this.dataset.p2){this.dataset.p2="1";this.src=proxy(x.image)}else this.style.display="none"};a.appendChild(im)}
var cap=document.createElement("div");cap.className="Evrenxus-slide-caption";cap.textContent=x.title||"";a.appendChild(cap);slide.appendChild(a);slidesContainer.appendChild(slide);
var dot=document.createElement("span");dot.className="Evrenxus-slider-dot"+(i===0?" active":"");dot.onclick=function(){show(i)};dotsContainer.appendChild(dot);
});
var slides=slider.querySelectorAll(".Evrenxus-slide"),dots=slider.querySelectorAll(".Evrenxus-slider-dot");
function show(i){if(!slides.length)return;if(i>=slides.length)i=0;if(i<0)i=slides.length-1;slides[current].classList.remove("active");dots[current].classList.remove("active");current=i;slides[current].classList.add("active");dots[current].classList.add("active")}
document.getElementById("Evrenxus-slider-prev").onclick=function(){show(current-1)};document.getElementById("Evrenxus-slider-next").onclick=function(){show(current+1)};
if(slides.length>1)setInterval(function(){show(current+1)},5000);
}
var q=new URLSearchParams(location.search),topic=q.get("topic")||(location.pathname.endsWith("/index.html")||location.pathname.endsWith("/")?"all":"economy");
fetch("./data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){var items=(d.items||[]).filter(function(x){return x&&x.title&&x.published&&x.url&&(topic==="all"||Array.isArray(x.topics)&&x.topics.indexOf(topic)!==-1)});items.sort(function(a,b){return new Date(b.published)-new Date(a.published)});render(items)}).catch(function(){slider.style.display="none"});
})();
