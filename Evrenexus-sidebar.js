/* Evren Nexus — SHARED SIDEBAR */
(function(){
"use strict";
if(document.getElementById("Evrenxus-sidebar")) return;
var css=`
#Evrenxus-sidebar{width:200px;min-width:200px;max-width:200px;position:sticky;top:158px;align-self:flex-start;z-index:900;font-family:Vazir,Tahoma,Arial,sans-serif;direction:rtl}
#Evrenxus-sidebar .Evrenxus-sidebar-box{width:200px;margin-bottom:16px;background:#fff;border:1px solid #dfe2e4}
#Evrenxus-sidebar .Evrenxus-sidebar-menu{border-top:3px solid #202c35}
#Evrenxus-sidebar .Evrenxus-sidebar-title{position:relative;padding:9px 10px;border-bottom:1px solid #e1e4e6;color:#202c35;font-size:12px;font-weight:700}
#Evrenxus-sidebar .Evrenxus-sidebar-title:before{content:"";display:inline-block;width:4px;height:14px;margin-left:7px;vertical-align:-2px;background:#d9232e}
#Evrenxus-sidebar a{color:#333;text-decoration:none}
#Evrenxus-sidebar .Evrenxus-menu-link{display:block;padding:9px 10px;border-bottom:1px solid #edf0f1;font-size:11px;font-weight:700;line-height:1.8}
#Evrenxus-sidebar .Evrenxus-menu-link:last-child{border-bottom:0}
#Evrenxus-sidebar .Evrenxus-menu-link:hover,#Evrenxus-sidebar .Evrenxus-latest-item:hover{background:#fafafa;color:#d9232e}
#Evrenxus-sidebar .Evrenxus-latest-item{display:block;padding:9px;border-bottom:1px solid #edf0f1;color:#343b40;font-size:10px;line-height:1.85}
#Evrenxus-sidebar .Evrenxus-latest-item:last-child{border-bottom:0}
@media(max-width:700px){#Evrenxus-sidebar{width:100%;min-width:0;max-width:none;position:static;margin-top:20px}#Evrenxus-sidebar .Evrenxus-sidebar-box{width:100%;margin-bottom:12px}.Evrenxus-menu-link{font-size:11px}.Evrenxus-latest-item{font-size:10.5px}}
`;
var s=document.createElement("style");s.id="Evrenxus-sidebar-style";s.textContent=css;document.head.appendChild(s);
var box=document.createElement("aside");box.id="Evrenxus-sidebar";box.innerHTML=`
<div class="Evrenxus-sidebar-box Evrenxus-sidebar-menu">
<div class="Evrenxus-sidebar-title">منوی سایت</div>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/">صفحه اصلی</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/">درباره من</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/archive">آرشیو مطالب</a>
<a class="Evrenxus-menu-link" target="_top" href="https://evrenexus.blogfa.com/posts/">عناوین نوشته‌ها</a>
</div>
<div class="Evrenxus-sidebar-box">
<div class="Evrenxus-sidebar-title">آخرین مطالب</div>
<div id="Evrenxus-sidebar-latest"><div style="padding:12px;font-size:10px;color:#888">در حال دریافت...</div></div>
</div>`;
var host=document.getElementById("Evrenxus-sidebar-host");if(host){host.replaceWith(box)}else document.body.appendChild(box);
function render(items){var el=document.getElementById("Evrenxus-sidebar-latest");if(!el)return;el.innerHTML="";(items||[]).slice(0,10).forEach(function(x){var a=document.createElement("a");a.className="Evrenxus-latest-item";a.target="_top";a.href=x.link||x.url||"https://evrenexus.blogfa.com/";a.textContent=x.title||"";el.appendChild(a)})}
fetch("https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent("https://evrenexus.blogfa.com/rss.aspx")+"&count=10",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){render(d.items||[])}).catch(function(){render([])});
})();
