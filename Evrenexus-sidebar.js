/* Evren Nexus — sidebar: important titles first, site links below */
(function(){
"use strict";
if(document.getElementById("Evrenxus-sidebar")) return;
var css=`
#Evrenxus-sidebar{width:200px;min-width:200px;max-width:200px;position:static;z-index:900;font-family:Vazir,Tahoma,Arial,sans-serif;direction:rtl}
#Evrenxus-sidebar .Evrenxus-sidebar-box{width:200px;margin-bottom:16px;background:#fff;border:1px solid #dfe2e4;overflow:hidden}
#Evrenxus-sidebar .Evrenxus-sidebar-menu{border-top:3px solid #202c35}
#Evrenxus-sidebar .Evrenxus-sidebar-title{padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}
#Evrenxus-sidebar .Evrenxus-sidebar-title:before{content:"";display:inline-block;width:4px;height:14px;margin-left:7px;vertical-align:-2px;background:#d9232e}
#Evrenxus-sidebar a{color:#333;text-decoration:none}
#Evrenxus-sidebar .Evrenxus-menu-link{display:block;padding:9px 10px;border-bottom:1px solid #edf0f1;font-size:11px;font-weight:700;line-height:1.8}
#Evrenxus-sidebar .Evrenxus-menu-link:hover,#Evrenxus-sidebar .Evrenxus-important-link:hover{background:#fafafa;color:#d9232e}
#Evrenxus-sidebar .Evrenxus-important-link{display:block;padding:8px 9px;border-bottom:1px solid #edf0f1;color:#343b40;font-size:10px;line-height:1.9}
#Evrenxus-sidebar .Evrenxus-important-link:last-child{border-bottom:0}
@media(max-width:700px){#Evrenxus-sidebar{width:100%;min-width:0;max-width:none;position:static;margin-top:0}#Evrenxus-sidebar .Evrenxus-sidebar-box{width:100%;margin-bottom:12px}#Evrenxus-sidebar .Evrenxus-important-link{font-size:11px}}
`;
var style=document.createElement("style");style.id="Evrenxus-sidebar-style";style.textContent=css;document.head.appendChild(style);
var box=document.createElement("aside");box.id="Evrenxus-sidebar";
box.innerHTML=`
<div class="Evrenxus-sidebar-box">
<div class="Evrenxus-sidebar-title">مطالب مهم</div>
<div id="Evrenxus-sidebar-important"><div style="padding:12px;font-size:10px;color:#888">در حال دریافت مطالب...</div></div>
</div>
<div class="Evrenxus-sidebar-box Evrenxus-sidebar-menu">
<a class="Evrenxus-menu-link" target="_top" href="./">صفحه اصلی</a>
<a class="Evrenxus-menu-link" target="_top" href="./news-river.html">آخرین مطالب</a>
<a class="Evrenxus-menu-link" target="_top" href="./important-archive.html">آرشیو مطالب مهم</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/archive">آرشیو وبلاگ</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/posts/">عناوین نوشته‌های وبلاگ</a>
</div>`;
var host=document.getElementById("sidebar-host")||document.getElementById("Evrenxus-sidebar-host");
if(host){host.innerHTML="";host.appendChild(box)}else document.body.appendChild(box);
function uniquePush(out,seen,x,score){
 if(!x||!String(x.title||"").trim())return;
 var title=String(x.title).trim(),key=title.toLowerCase();
 if(seen[key])return;
 var href="";
 if(x.articleUrl)href="./"+String(x.articleUrl).replace(/^\.\//,"");
 else if(x.url)href="./viewer.html?url="+encodeURIComponent(x.url);
 if(!href)return;
 seen[key]=true;out.push({title:title,href:href,score:Number(score||x.score||x.importance_score||0),published:x.published||""});
}
function render(items){
 var el=document.getElementById("Evrenxus-sidebar-important");if(!el)return;
 var seen={},out=[];
 (items||[]).forEach(function(x){uniquePush(out,seen,x,x.score||x.importance_score)});
 out.sort(function(a,b){return b.score-a.score||String(b.published).localeCompare(String(a.published))});
 out=out.slice(0,20);el.innerHTML="";
 if(!out.length){el.innerHTML='<div style="padding:12px;font-size:10px;color:#888">مطالبی برای نمایش پیدا نشد.</div>';return}
 out.forEach(function(x){var a=document.createElement("a");a.className="Evrenxus-important-link";a.target="_top";a.href=x.href;a.textContent=x.title;el.appendChild(a)});
}
function load(){
 Promise.all([
  fetch("./data/public/featured.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}),
  fetch("./data/public/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})
 ]).then(function(data){
  var out=[],seen={},featured=data[0],news=data[1];
  var topics=featured&&featured.topics?featured.topics:{};
  Object.keys(topics).forEach(function(k){
   var t=topics[k]||{};
   ["important","featured","regular"].forEach(function(group){(Array.isArray(t[group])?t[group]:[]).forEach(function(x){uniquePush(out,seen,x,x.score||x.importance_score)})});
  });
  if(news&&Array.isArray(news.items)){
   news.items.slice().sort(function(a,b){return Number(b.importance_score||0)-Number(a.importance_score||0)||String(b.published||"").localeCompare(String(a.published||""))}).forEach(function(x){uniquePush(out,seen,x,x.importance_score)});
  }
  render(out);
 }).catch(function(){render([])});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();