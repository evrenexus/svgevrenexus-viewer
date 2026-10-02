/* Evren Nexus — SINGLE SHARED HEADER */
(function(){
"use strict";
if(document.getElementById("Evrenxus-header")) return;

var css=`
#Evrenxus-header{width:850px;max-width:100%;height:144px;position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:100000;background:#fff;border-bottom:1px solid #d9dfe3;font-family:Vazir,Tahoma,Arial,sans-serif;box-sizing:border-box;direction:rtl;box-shadow:0 1px 5px rgba(0,0,0,.04)}
#Evrenxus-header *{box-sizing:border-box}
#Evrenxus-header-row1{height:93px;background:#17232d;position:relative;overflow:hidden;direction:rtl}
.Evrenxus-header-brand{position:absolute;right:0;top:0;width:132px;height:93px;display:flex;align-items:center;justify-content:center;background:#101b23;border-left:1px solid rgba(255,255,255,.08);z-index:5}
.Evrenxus-brand{color:#fff;text-decoration:none;font-size:14px;font-weight:700}
#Evrenxus-market-tickers{height:93px;margin-right:132px}
.Evrenxus-ticker{height:31px;position:relative;background:#17232d;color:#fff;display:flex;align-items:center;font-size:10px;font-weight:700;overflow:hidden}
.Evrenxus-ticker-window{position:absolute;right:0;left:0;height:31px;overflow:hidden;white-space:nowrap}
.Evrenxus-ticker-track{display:inline-flex;height:31px;align-items:center;white-space:nowrap;animation:EvrenxusTickerMove 42s linear infinite}
.Evrenxus-ticker-track:hover{animation-play-state:paused}
.Evrenxus-ticker-item{display:inline-flex;align-items:center;margin-left:30px;height:31px;white-space:nowrap}
.Evrenxus-ticker-item .symbol{color:#aeb9c1;margin-left:6px}.Evrenxus-ticker-item .price{color:#fff;direction:ltr}
.Evrenxus-up{color:#55cf8a;margin-right:5px}.Evrenxus-down{color:#ff7474;margin-right:5px}
.Evrenxus-row-label{position:absolute;left:0;top:0;width:78px;height:31px;display:flex;align-items:center;justify-content:center;background:#101b23;color:#aeb9c1;font-size:8px;z-index:4;direction:rtl}
@keyframes EvrenxusTickerMove{from{transform:translateX(0)}to{transform:translateX(50%)}}
.Evrenxus-datetime{position:absolute;left:0;top:0;width:105px;height:31px;display:flex;align-items:center;justify-content:center;gap:4px;background:#101b23;color:#fff;font-size:8px;white-space:nowrap;z-index:4}
#Evrenxus-header-row2{height:51px;display:flex;align-items:center;direction:rtl;background:#fff}
#Evrenxus-main-menu{height:51px;display:flex;align-items:stretch;justify-content:flex-start;direction:rtl;overflow:hidden;white-space:nowrap;flex:1;min-width:0}
#Evrenxus-main-menu a{height:51px;padding:0 7px;display:flex;align-items:center;color:#303a41;text-decoration:none;font-size:10.5px;font-weight:700;border-left:1px solid #edf0f2;flex-shrink:0;position:relative}
#Evrenxus-main-menu a:first-child{color:#d9232e}
#Evrenxus-main-menu a:hover{color:#d9232e;background:#fafafa}
#Evrenxus-main-menu a:hover:after,#Evrenxus-main-menu a.active:after{content:"";position:absolute;right:7px;left:7px;bottom:0;height:3px;background:#d9232e}
#Evrenxus-property-search{width:225px;height:34px;flex:0 0 225px;margin:0 4px;padding:0 4px;border:1px solid #d7dde1;border-right:3px solid #d9232e;background:#fafbfc;display:flex;align-items:center;gap:5px;direction:rtl;white-space:nowrap}
#Evrenxus-property-search-title{font-size:9px;font-weight:700;white-space:nowrap}#Evrenxus-property-search-title a{color:#26333b;text-decoration:none}
#Evrenxus-property-search-form{display:flex;align-items:center;gap:4px}#Evrenxus-property-budget{width:49px;height:24px;border:1px solid #cbd3d8;background:#fff;text-align:center;direction:ltr;font-size:10px;outline:none}
#Evrenxus-property-search-button{height:24px;padding:0 7px;border:0;background:#d9232e;color:#fff;font-family:Vazir,Tahoma,sans-serif;font-size:9px;font-weight:700;cursor:pointer}
#Evrenxus-property-search-error{display:none;position:absolute;right:5px;top:38px;color:#c3212b;font-size:9px;white-space:nowrap;background:#fff;padding:3px 6px;border:1px solid #ead0d3;z-index:20}
@media(max-width:700px){#Evrenxus-header{width:100%;left:0;transform:none;height:133px}#Evrenxus-header-row1{height:86px}.Evrenxus-header-brand{width:92px;height:86px}.Evrenxus-brand{font-size:10px}#Evrenxus-market-tickers{height:86px;margin-right:92px}.Evrenxus-ticker,.Evrenxus-ticker-window,.Evrenxus-ticker-track{height:28.66px}.Evrenxus-datetime{width:82px;height:28.66px;font-size:7px}.Evrenxus-row-label{width:58px;height:28.66px;font-size:7px}#Evrenxus-header-row2{height:47px}#Evrenxus-main-menu{height:47px;overflow-x:auto}#Evrenxus-main-menu a{height:47px;padding:0 8px;font-size:9px;background:#d9232e;color:#fff}#Evrenxus-property-search{width:190px;flex-basis:190px;height:32px}}
@media(max-width:430px){#Evrenxus-header{height:128px}#Evrenxus-header-row1{height:82px}.Evrenxus-header-brand{width:82px;height:82px}#Evrenxus-market-tickers{height:82px;margin-right:82px}.Evrenxus-ticker,.Evrenxus-ticker-window,.Evrenxus-ticker-track{height:27.33px}.Evrenxus-datetime,.Evrenxus-row-label{height:27.33px}.Evrenxus-row-label{width:52px;font-size:6.5px}#Evrenxus-header-row2{height:46px}#Evrenxus-main-menu{height:46px}#Evrenxus-main-menu a{height:46px;padding:0 7px;font-size:8.5px}#Evrenxus-property-search{width:166px;flex-basis:166px}}
`;
var style=document.createElement("style");style.id="Evrenxus-header-style";style.textContent=css;document.head.appendChild(style);

var wrap=document.createElement("div");wrap.innerHTML=`
<header id="Evrenxus-header" dir="rtl">
<div id="Evrenxus-header-row1">
<div class="Evrenxus-header-brand"><a href="https://evrenexus.blogfa.com/" target="_top" class="Evrenxus-brand">Evren Nexus</a></div>
<div id="Evrenxus-market-tickers">
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-metals-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت طلا، فلزات و انرژی...</span></div></div><div class="Evrenxus-datetime"><span id="Evrenxus-metals-date"></span><span>|</span><span id="Evrenxus-metals-time"></span></div></div>
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-currency-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت ارزهای خارجی...</span></div></div><div class="Evrenxus-datetime"><span id="Evrenxus-currency-date"></span><span>|</span><span id="Evrenxus-currency-time"></span></div></div>
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-crypto-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت ارزهای دیجیتال...</span></div></div><div class="Evrenxus-datetime"><span id="Evrenxus-crypto-date"></span><span>|</span><span id="Evrenxus-crypto-time"></span></div></div>
</div></div>
<div id="Evrenxus-header-row2">
<nav id="Evrenxus-main-menu"><a class="active" target="_top" href="https://evrenexus.blogfa.com/">خانه</a><a target="_top" href="https://evrenexus.blogfa.com/profile">درباره من</a><a href="#">اقتصاد</a><a href="#">طلا</a><a href="#">ارز</a><a href="#">مسکن</a><a href="#">بورس</a><a href="#">کریپتو</a><a href="#">خودرو</a><a href="#">تحلیل بازار</a></nav>
<div id="Evrenxus-property-search"><div id="Evrenxus-property-search-title"><a target="_blank" href="https://evrenexus.blogfa.com/post/5">موتور جستجوی املاک</a></div><div id="Evrenxus-property-search-form"><input id="Evrenxus-property-budget" type="text" inputmode="decimal" autocomplete="off" placeholder="1-9999"><button id="Evrenxus-property-search-button" type="button">بیاب</button></div><div id="Evrenxus-property-search-error">رقم را بر پایه میلیارد تومان وارد کنید</div></div>
</div></header>`;
document.body.insertBefore(wrap.firstElementChild,document.body.firstChild);

(function(){
var input=document.getElementById("Evrenxus-property-budget"),button=document.getElementById("Evrenxus-property-search-button"),error=document.getElementById("Evrenxus-property-search-error");
function norm(v){return String(v).replace(/[۰-۹]/g,function(d){return"۰۱۲۳۴۵۶۷۸۹".indexOf(d)}).replace(/[٠-٩]/g,function(d){return"٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/,/g,".").trim()}
function search(){var v=norm(input.value),b=Number(v);if(!v||!isFinite(b)||b<1||b>9999){error.style.display="block";input.focus();return}error.style.display="none";window.open("https://evrenexus.github.io/avrin-property-advisor/?budget="+encodeURIComponent(b),"_blank")}
button.onclick=search;input.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();search()}};input.oninput=function(){error.style.display="none"}
})();

(function(){
var metal=document.getElementById("Evrenxus-metals-track"),cur=document.getElementById("Evrenxus-currency-track"),crypto=document.getElementById("Evrenxus-crypto-track");
function stamp(prefix){var n=new Date(),d=document.getElementById("Evrenxus-"+prefix+"-date"),t=document.getElementById("Evrenxus-"+prefix+"-time");if(!d||!t)return;d.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(n);t.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",hour12:false}).format(n)}
var url="https://evrenexus.github.io/svgevrenexus-viewer/market-data/prices.json";
var globals=["XAUUSD","XAGUSD","XCUUSD","XPDUSD","XPTUSD","USOIL","DIESEL"];
var globalNames={XAUUSD:"طلا",XAGUSD:"نقره",XCUUSD:"مس",XPDUSD:"پالادیوم",XPTUSD:"پلاتین",USOIL:"نفت",DIESEL:"دیزل"};
var cryptoIds=["bitcoin","ethereum","tether","binancecoin","solana","ripple","dogecoin","cardano","tron","polkadot"];
var cryptoNames={bitcoin:"بیت‌کوین",ethereum:"اتریوم",tether:"تتر",binancecoin:"BNB",solana:"سولانا",ripple:"XRP",dogecoin:"دوج‌کوین",cardano:"کاردانو",tron:"ترون",polkadot:"پولکادات"};

function fmt(v){var n=Number(v);return isFinite(n)?new Intl.NumberFormat("fa-IR",{maximumFractionDigits:2}).format(n):"-"}
function item(label,price,unit,change){if(price==null)return "";var c=Number(change)>0?"Evrenxus-up":Number(change)<0?"Evrenxus-down":"";var a=Number(change)>0?"▲":Number(change)<0?"▼":"";return '<span class="Evrenxus-ticker-item"><span class="symbol">'+label+'</span><span class="price">'+fmt(price)+(unit?" "+unit:"")+'</span><span class="'+c+'">'+a+(change!=null&&change!==""?fmt(change)+"%":"")+'</span></span>'}
function globalItem(name,data){if(!data)return "";return item(name,data.mid,"USD",data.dayDiffPercent)}

function loadGlobals(){
var out=[],done=0;
globals.forEach(function(symbol){
fetch("https://biquote.io/api/"+symbol).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)out.push(globalItem(globalNames[symbol],d))}).catch(function(){}).finally(function(){done++;if(done===globals.length){stamp("metals");metal.innerHTML=out.length?out.join("")+out.join(""):"<span class='Evrenxus-ticker-item'>اطلاعات بازار جهانی در دسترس نیست</span>"}})
})
}

function loadLocal(){
fetch(url+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
var p=d.prices||{},c=d.currencies||{};
function val(x){return x&&typeof x==="object"?(x.price!=null?x.price:x.value):x}
function chg(x){return x&&typeof x==="object"?(x.changePercent!=null?x.changePercent:(x.change!=null?x.change:null)):null}
var coins=item("سکه امامی",val(p.emami),"تومان",chg(p.emami))+item("سکه بهار آزادی",val(p.bahar),"تومان",chg(p.bahar))+item("نیم سکه",val(p.half),"تومان",chg(p.half))+item("ربع سکه",val(p.quarter),"تومان",chg(p.quarter))+item("سکه گرمی",val(p.gram),"تومان",chg(p.gram))+item("طلای ۱۸",val(p.gold18),"تومان",chg(p.gold18));
var curr=item("دلار",val(c.dollar),"تومان",chg(c.dollar))+item("یورو",val(c.euro),"تومان",chg(c.euro))+item("درهم",val(c.aed),"تومان",chg(c.aed))+item("پوند",val(c.gbp),"تومان",chg(c.gbp))+item("لیر",val(c.try),"تومان",chg(c.try))+item("فرانک",val(c.chf),"تومان",chg(c.chf))+item("یوان",val(c.cny),"تومان",chg(c.cny));
metal.innerHTML=(coins?coins:"")+ (metal.innerHTML||"");
stamp("metals");
stamp("currency");
cur.innerHTML=curr?curr+curr:"<span class='Evrenxus-ticker-item'>اطلاعات ارز در دسترس نیست</span>";
}).catch(function(){cur.innerHTML="<span class='Evrenxus-ticker-item'>خطا در دریافت ارزهای خارجی</span>"})
}

function loadCrypto(){
var q=cryptoIds.join(",");
fetch("https://api.coingecko.com/api/v3/simple/price?ids="+encodeURIComponent(q)+"&vs_currencies=usd&include_24hr_change=true").then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
var out=cryptoIds.map(function(id){var x=d[id];return x?item(cryptoNames[id],x.usd,"USD",x.usd_24h_change):""}).join("");
stamp("crypto");
crypto.innerHTML=out?out+out:"<span class='Evrenxus-ticker-item'>اطلاعات رمزارزها در دسترس نیست</span>";
}).catch(function(){crypto.innerHTML="<span class='Evrenxus-ticker-item'>خطا در دریافت ارزهای دیجیتال</span>"})
}
function load(){loadGlobals();loadLocal();loadCrypto()}
load();setInterval(load,300000);
})();

(function(){
function update(){var n=new Date(),d=document.getElementById("Evrenxus-shamsi"),t=document.getElementById("Evrenxus-time");if(!d||!t)return;d.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"long",day:"numeric"}).format(n);t.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(n)}
update();setInterval(update,1000);
})();
})();