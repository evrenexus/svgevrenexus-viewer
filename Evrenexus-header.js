/* Evren Nexus — external Blogfa header */
(function(){
"use strict";

var css = `
#Evrenxus-header{width:850px;max-width:100%;height:75px;margin:0 auto;position:relative;z-index:1000;background:#fff;border-bottom:1px solid #d7d7d7;font-family:Tahoma,Arial,sans-serif;box-sizing:border-box}
#Evrenxus-header *{box-sizing:border-box}
#Evrenxus-header-row1{height:30px;background:#10232e;position:relative;overflow:hidden}
.Evrenxus-header-brand{position:absolute;right:0;top:0;width:130px;height:30px;display:flex;align-items:center;justify-content:center;background:#0c1b24;z-index:3}
.Evrenxus-brand{color:#fff;text-decoration:none;font-size:14px;font-weight:bold}
#Evrenxus-market-tickers{position:absolute;left:130px;right:130px;top:0;height:30px}
.Evrenxus-ticker{height:30px;position:relative;background:#10232e;color:#fff;display:flex;align-items:center;font-size:11px;font-weight:bold;overflow:visible}
.Evrenxus-ticker-window{position:absolute;left:0;right:0;height:30px;overflow:hidden;white-space:nowrap}
.Evrenxus-ticker-track{display:inline-flex;height:30px;align-items:center;white-space:nowrap;animation:EvrenxusTickerMove 45s linear infinite}
.Evrenxus-ticker-track:hover{animation-play-state:paused}
.Evrenxus-ticker-item{display:inline-flex;align-items:center;margin-left:28px;height:30px;white-space:nowrap}
.Evrenxus-ticker-item .symbol{color:#ddd;margin-left:5px}
.Evrenxus-ticker-item .price{color:#fff}
.Evrenxus-up{color:#70d690;margin-right:5px}
.Evrenxus-down{color:#ff8585;margin-right:5px}
@keyframes EvrenxusTickerMove{from{transform:translateX(0)}to{transform:translateX(50%)}}
.Evrenxus-datetime{position:absolute;left:-130px;top:0;width:130px;height:30px;display:flex;align-items:center;justify-content:center;gap:5px;background:#0c1b24;color:#fff;font-size:10px;white-space:nowrap}
#Evrenxus-header-row2{height:45px;display:flex;align-items:center;direction:rtl;background:#fff}
#Evrenxus-main-menu{height:45px;display:flex;align-items:center;justify-content:flex-start;direction:rtl;overflow:hidden;white-space:nowrap;flex:1;min-width:0}
#Evrenxus-main-menu a{height:100%;padding:0 5px;display:flex;align-items:center;color:#333;text-decoration:none;font-size:11px;font-weight:bold;border-left:1px solid #eee;flex-shrink:0}
#Evrenxus-main-menu a:hover{color:#147a9c;background:#f7f9fa}
#Evrenxus-property-search{width:215px;height:32px;flex:0 0 215px;margin:0 4px;padding:0 3px;border:1px solid #d6dde1;border-right:4px solid #10232e;background:#f8fafb;display:flex;align-items:center;gap:4px;direction:rtl;white-space:nowrap}
#Evrenxus-property-search-title{font-size:10px;font-weight:bold;white-space:nowrap}
#Evrenxus-property-search-title a{color:#17252d;text-decoration:none}
#Evrenxus-property-search-form{display:flex;align-items:center;gap:4px;direction:rtl}
#Evrenxus-property-budget{width:52px;height:24px;border:1px solid #c8d0d5;text-align:center;direction:ltr;font-family:Tahoma;font-size:10px}
#Evrenxus-property-search-button{height:24px;padding:0 7px;border:1px solid #10232e;background:#10232e;color:#fff;font-size:10px;font-weight:bold;cursor:pointer}
#Evrenxus-property-search-error{display:none;position:absolute;right:5px;top:36px;color:#b23a3a;font-size:9px;white-space:nowrap}
@media(max-width:700px){
#Evrenxus-header{width:100%;max-width:100%;margin:0;height:73px}
#Evrenxus-header-row1{height:28px}
.Evrenxus-header-brand{width:105px;height:28px}
.Evrenxus-brand{font-size:11px}
#Evrenxus-market-tickers{left:105px;right:105px;height:28px}
.Evrenxus-ticker,.Evrenxus-ticker-window,.Evrenxus-ticker-track{height:28px}
.Evrenxus-datetime{left:-105px;width:105px;height:28px;font-size:8px}
#Evrenxus-header-row2{height:45px}
#Evrenxus-main-menu{height:45px}
#Evrenxus-main-menu a{padding:0 6px;font-size:9px}
#Evrenxus-property-search{margin:0 3px;padding:0 4px;gap:4px}
#Evrenxus-property-search-title{font-size:8px}
#Evrenxus-property-budget{width:50px}
#Evrenxus-property-search-button{padding:0 6px;font-size:8px}
}
`;

var style=document.createElement("style");
style.id="Evrenxus-header-style";
style.textContent=css;
document.head.appendChild(style);

var wrap=document.createElement("div");
wrap.innerHTML=`
<header id="Evrenxus-header" dir="rtl">
<div id="Evrenxus-header-row1">
<div class="Evrenxus-header-brand"><a href="https://evrenexus.blogfa.com/" target="_top" class="Evrenxus-brand">Evren Nexus</a></div>
<div id="Evrenxus-market-tickers">
<div class="Evrenxus-ticker">
<div class="Evrenxus-ticker-window"><div id="Evrenxus-global-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت بازارهای جهانی...</span></div></div>
<div class="Evrenxus-datetime"><span id="Evrenxus-shamsi"></span><span>|</span><span id="Evrenxus-time"></span></div>
</div>
</div>
</div>
<div id="Evrenxus-header-row2">
<nav id="Evrenxus-main-menu">
<a target="_top" href="https://evrenexus.blogfa.com/">خانه</a><a target="_top" href="https://evrenexus.blogfa.com/profile">درباره من</a><a href="#">اقتصاد</a><a href="#">طلا</a><a href="#">ارز</a><a href="#">مسکن</a><a href="#">بورس</a><a href="#">کریپتو</a><a href="#">خودرو</a><a href="#">تحلیل بازار</a>
</nav>
<div id="Evrenxus-property-search">
<div id="Evrenxus-property-search-title"><a target="_blank" href="https://evrenexus.blogfa.com/post/5">موتور جستجوی املاک</a></div>
<div id="Evrenxus-property-search-form"><input id="Evrenxus-property-budget" type="text" inputmode="decimal" autocomplete="off" placeholder="1-9999"><button id="Evrenxus-property-search-button" type="button">بیاب</button></div>
<div id="Evrenxus-property-search-error">رقم را بر پایه میلیارد تومان وارد کنید</div>
</div>
</div>
</header>`;

var header=wrap.firstElementChild;
var target=document.getElementById("Evrenxus-header");
if(target) target.replaceWith(header);
else document.body.insertBefore(header,document.body.firstChild);

(function(){
var input=document.getElementById("Evrenxus-property-budget"),button=document.getElementById("Evrenxus-property-search-button"),error=document.getElementById("Evrenxus-property-search-error");
function norm(v){return String(v).replace(/[۰-۹]/g,function(d){return"۰۱۲۳۴۵۶۷۸۹".indexOf(d)}).replace(/[٠-٩]/g,function(d){return"٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/,/g,".").trim()}
function search(){var v=norm(input.value),b=Number(v);if(!v||!isFinite(b)||b<1||b>9999){error.style.display="block";input.focus();return}error.style.display="none";window.open("https://evrenexus.github.io/avrin-property-advisor/?budget="+encodeURIComponent(b),"_blank")}
button.onclick=search;
input.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();search()}};
input.oninput=function(){error.style.display="none"};
})();

(function(){
var symbols=["XAUUSD","XAGUSD","USOIL","XCUUSD","XPDUSD","DXY","BTCUSD","ETHUSD"],names={XAUUSD:"طلا",XAGUSD:"نقره",USOIL:"نفت",XCUUSD:"مس",XPDUSD:"پالادیوم",DXY:"شاخص دلار",BTCUSD:"بیت‌کوین",ETHUSD:"اتریوم"},track=document.getElementById("Evrenxus-global-track");
function price(v){var n=Number(v);return isFinite(n)?new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n):"-"}
function load(){var out=[];Promise.all(symbols.map(function(s){return fetch("https://biquote.io/api/"+s).then(function(r){return r.ok?r.json():null}).then(function(d){if(d&&d.mid!==undefined)out.push({s:s,d:d})}).catch(function(){})})).then(function(){if(!out.length){track.innerHTML='<span class="Evrenxus-ticker-item">دریافت بازارهای جهانی امکان‌پذیر نیست</span>';return}var html="";out.forEach(function(x){var d=Number(x.d.dayDiffPercent),dir=d>0?'<span class="Evrenxus-up">▲ '+d.toFixed(2)+"%</span>":d<0?'<span class="Evrenxus-down">▼ '+Math.abs(d).toFixed(2)+"%</span>":"";html+='<span class="Evrenxus-ticker-item"><span class="symbol">'+names[x.s]+'</span><span class="price">'+(x.s==="DXY"?"":"$")+price(x.d.mid)+"</span>"+dir+"</span>"});track.innerHTML=html+html})}
load();setInterval(load,120000)
})();

(function(){
function update(){var n=new Date();document.getElementById("Evrenxus-shamsi").textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"long",day:"numeric"}).format(n);document.getElementById("Evrenxus-time").textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(n)}
update();setInterval(update,1000)
})();
})();