/* Evren Nexus — shared sidebar with 20 important article titles */
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
@media(max-width:700px){#Evrenxus-sidebar{width:100%;min-width:0;max-width:none;position:static;margin-top:0}#Evrenxus-sidebar .Evrenxus-sidebar-box{width:100%;margin-bottom:12px}.Evrenxus-important-link{font-size:11px}}
`;
var s=document.createElement("style");s.id="Evrenxus-sidebar-style";s.textContent=css;document.head.appendChild(s);
var box=document.createElement("aside");box.id="Evrenxus-sidebar";box.innerHTML=`
<div class="Evrenxus-sidebar-box Evrenxus-sidebar-menu">
<div class="Evrenxus-sidebar-title">منوی سایت</div>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.github.io/svgevrenexus-viewer/">صفحه اصلی</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/">درباره من</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/archive">آرشیو مطالب</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/posts/">عناوین نوشته‌ها</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.ir/latest-archive.html">آرشیو آخرین مطالب</a>
</div>
<div class="Evrenxus-sidebar-box">
<div class="Evrenxus-sidebar-title">۲۰ مطلب مهم</div>
<div id="Evrenxus-sidebar-important"><div style="padding:12px;font-size:10px;color:#888">در حال دریافت مطالب مهم...</div></div>
</div>`;
var host=document.getElementById("sidebar-host")||document.getElementById("Evrenxus-sidebar-host");
if(host){host.innerHTML="";host.appendChild(box)}else document.body.appendChild(box);
function render(items){
 var el=document.getElementById("Evrenxus-sidebar-important");if(!el)return;
 el.innerHTML="";
 var used={},clean=(items||[]).filter(function(x){var t=String(x&&x.title||"").trim();if(!t||used[t])return false;used[t]=true;return !!x.articleUrl}).slice(0,20);
 if(!clean.length){el.innerHTML='<div style="padding:12px;font-size:10px;color:#888">مطالب مهمی برای نمایش پیدا نشد.</div>';return}
 clean.forEach(function(x){var a=document.createElement("a");a.className="Evrenxus-important-link";a.target="_top";a.href="./"+String(x.articleUrl).replace(/^\.\//,"");a.textContent=x.title;el.appendChild(a)});
}
function load(){
 if(window.EvrenFeatured&&typeof window.EvrenFeatured.getTopic==="function"){
  window.EvrenFeatured.getTopic("home",1).then(function(r){
   if(r&&r.ok)render((r.important||[]).filter(function(x){return !!x.articleUrl}));
   else render([]);
  }).catch(function(){render([])});
 }else{render([])}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();