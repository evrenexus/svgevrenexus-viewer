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
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/archive">آرشیو وبلاگ</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/posts/">عناوین نوشته‌های وبلاگ</a>
</div>`;
var host=document.getElementById("sidebar-host")||document.getElementById("Evrenxus-sidebar-host");
if(host){host.innerHTML="";host.appendChild(box)}else document.body.appendChild(box);

})();