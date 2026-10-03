/* Evren Nexus — SINGLE SHARED HEADER */
(function(){
"use strict";
if(document.getElementById("Evrenxus-header")) return;

var css=`
#Evrenxus-header{width:850px;max-width:100%;height:123px;position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:100000;background:#fff;border-bottom:1px solid #d9dfe3;font-family:Vazir,Tahoma,Arial,sans-serif;box-sizing:border-box;direction:rtl;box-shadow:0 1px 5px rgba(0,0,0,.04)}
#Evrenxus-header *{box-sizing:border-box}\n
#Evrenxus-header-row1{height:93px;background:#17232d;position:relative;overflow:hidden;direction:rtl}
.Evrenxus-header-brand{position:absolute;right:0;top:0;width:132px;height:93px;display:flex;align-items:center;justify-content:center;background:#101b23;border-left:1px solid rgba(255,255,255,.08);z-index:5}
.Evrenxus-brand{color:#fff;text-decoration:none;font-size:14px;font-weight:700}
#Evrenxus-market-tickers{height:93px;margin-right:132px}
.Evrenxus-ticker{height:31px;position:relative;background:#17232d;color:#fff;display:flex;align-items:center;font-size:10px;font-weight:700;overflow:hidden}
.Evrenxus-ticker-window{position:absolute;right:0;left:0;height:31px;overflow:hidden;white-space:nowrap}
.Evrenxus-ticker-track{display:inline-flex;height:31px;align-items:center;white-space:nowrap;animation:EvrenxusTickerMove 42s linear infinite}
.Evrenxus-ticker-track:hover{animation-play-state:paused}
.Evrenxus-ticker-item{display:inline-flex;align-items:center;margin-left:30px;height:31px;white-space:nowrap;color:#fff;text-decoration:none;cursor:pointer}.Evrenxus-ticker-item:hover{opacity:.88}
.Evrenxus-ticker-item .symbol{color:#aeb9c1;margin-left:6px}.Evrenxus-ticker-item .price{color:#fff;direction:ltr}
.Evrenxus-up{color:#55cf8a;margin-right:5px}.Evrenxus-down{color:#ff7474;margin-right:5px}

@keyframes EvrenxusTickerMove{from{transform:translateX(0)}to{transform:translateX(50%)}}

#Evrenxus-header-row2{height:30px;display:flex;align-items:center;direction:rtl;background:#fff}
#Evrenxus-main-menu{height:30px;display:flex;align-items:stretch;justify-content:flex-start;direction:rtl;overflow:hidden;white-space:nowrap;flex:1;min-width:0}
#Evrenxus-main-menu a{height:30px;padding:0 7px;display:flex;align-items:center;color:#303a41;text-decoration:none;font-size:10.5px;font-weight:700;border-left:1px solid #edf0f2;flex-shrink:0;position:relative}
#Evrenxus-main-menu a:first-child{color:#d9232e}
#Evrenxus-main-menu a:hover{color:#d9232e;background:#fafafa}
#Evrenxus-main-menu a:hover:after,#Evrenxus-main-menu a.active:after{content:"";position:absolute;right:7px;left:7px;bottom:0;height:3px;background:#d9232e}
#Evrenxus-property-search{width:225px;height:28px;flex:0 0 225px;margin:0 4px;padding:0 4px;border:1px solid #d7dde1;border-right:3px solid #d9232e;background:#fafbfc;display:flex;align-items:center;gap:5px;direction:rtl;white-space:nowrap}
#Evrenxus-property-search-title{font-size:9px;font-weight:700;white-space:nowrap}#Evrenxus-property-search-title a{color:#26333b;text-decoration:none}
#Evrenxus-property-search-form{display:flex;align-items:center;gap:4px}#Evrenxus-property-budget{width:49px;height:24px;border:1px solid #cbd3d8;background:#fff;text-align:center;direction:ltr;font-size:10px;outline:none}
#Evrenxus-property-search-button{height:24px;padding:0 7px;border:0;background:#d9232e;color:#fff;font-family:Vazir,Tahoma,sans-serif;font-size:9px;font-weight:700;cursor:pointer}
#Evrenxus-property-search-error{display:none;position:absolute;right:5px;top:38px;color:#c3212b;font-size:9px;white-space:nowrap;background:#fff;padding:3px 6px;border:1px solid #ead0d3;z-index:20}
@media(max-width:700px){#Evrenxus-header{width:100%;left:0;transform:none;height:116px}#Evrenxus-header-row1{height:86px}.Evrenxus-header-brand{width:92px;height:86px}.Evrenxus-brand{font-size:10px}#Evrenxus-market-tickers{height:86px;margin-right:92px}.Evrenxus-ticker,.Evrenxus-ticker-window,.Evrenxus-ticker-track{height:28.66px}#Evrenxus-header-row2{height:30px}#Evrenxus-main-menu{height:30px;overflow-x:auto}#Evrenxus-main-menu a{height:30px;padding:0 8px;font-size:9px;background:#d9232e;color:#fff}#Evrenxus-property-search{width:190px;flex-basis:190px;height:28px}}
@media(max-width:430px){#Evrenxus-header{height:112px}#Evrenxus-header-row1{height:82px}.Evrenxus-header-brand{width:82px;height:82px}#Evrenxus-market-tickers{height:82px;margin-right:82px}.Evrenxus-ticker,.Evrenxus-ticker-window,.Evrenxus-ticker-track{height:27.33px}.Evrenxus-datetime,#Evrenxus-header-row2{height:46px}#Evrenxus-main-menu{height:30px}#Evrenxus-main-menu a{height:30px;padding:0 7px;font-size:8.5px}#Evrenxus-property-search{width:166px;flex-basis:166px;height:28px}}
`;
var style=document.createElement("style");style.id="Evrenxus-header-style";style.textContent=css;document.head.appendChild(style);


// Remove legacy market tickers from the host page.
// The shared header below is the only market ticker source.
(function(){
function removeLegacyTickers(){
  var needles=["در حال دریافت ارزهای خارجی","در حال دریافت ارزهای دیجیتال"];
  document.querySelectorAll("body *").forEach(function(el){
    if(el.id==="Evrenxus-header") return;
    var txt=(el.textContent||"").trim();
    if(!txt || !needles.some(function(n){return txt.indexOf(n)!==-1})) return;
    var target=el;
    for(var i=0;i<6 && target.parentElement;i++){
      var p=target.parentElement;
      var pt=(p.textContent||"").trim();
      if(pt.length<=Math.max(txt.length+180,320)){target=p;}else break;
    }
    if(target && target.id!=="Evrenxus-header") target.remove();
  });
}
removeLegacyTickers();
new MutationObserver(removeLegacyTickers).observe(document.body,{childList:true,subtree:true});
})();

var wrap=document.createElement("div");wrap.innerHTML=`
<header id="Evrenxus-header" dir="rtl">
<div id="Evrenxus-header-row1">
<div class="Evrenxus-header-brand"><a href="https://evrenexus.blogfa.com/" target="_top" class="Evrenxus-brand">Evren Nexus</a></div>
<div id="Evrenxus-market-tickers">
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-metals-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت...</span></div></div></div>
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-currency-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت...</span></div></div></div>
<div class="Evrenxus-ticker"><div class="Evrenxus-ticker-window"><div id="Evrenxus-crypto-track" class="Evrenxus-ticker-track"><span class="Evrenxus-ticker-item">در حال دریافت...</span></div></div></div>
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
function stamp(prefix,iso){var n=iso?new Date(iso):new Date(),d=document.getElementById("Evrenxus-"+prefix+"-date"),t=document.getElementById("Evrenxus-"+prefix+"-time");if(!d||!t)return;d.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(n);t.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",hour12:false}).format(n)}
function fmt(v){return v==null?"-":new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(v))}
var tvMap={"انس طلا":"OANDA:XAUUSD","انس نقره":"OANDA:XAGUSD","انس پلاتین":"OANDA:XPTUSD","انس پالادیوم":"OANDA:XPDUSD","آلومینیوم":"COMEX:ALI1!","سرب":"LME:LEAD1!","روی":"LME:ZINC1!","مس":"COMEX:HG1!","نیکل":"LME:NICKEL1!","قلع":"LME:TIN1!","نفت برنت":"TVC:UKOIL","نفت اپک":"TVC:OPEC","نفت خام":"TVC:USOIL","نفت کوره":"NYMEX:HO1!","بنزین (RBOB)":"NYMEX:RB1!","گاز طبیعی":"NYMEX:NG1!","گازوییل":"NYMEX:HO1!","زغال سنگ":"NYMEX:MTF1!","دلار":"FX_IDC:USDIRR","یورو":"FX_IDC:EURIRR","درهم":"FX_IDC:AEDIRR","پوند":"FX_IDC:GBPIRR","لیر":"FX_IDC:TRYIRR","فرانک":"FX_IDC:CHFIRR","یوان":"FX_IDC:CNYIRR","ین":"FX_IDC:JPYIRR","روبل":"FX_IDC:RUBIRR","منات":"FX_IDC:AZNIRR","بیت‌کوین":"BINANCE:BTCUSDT","اتریوم":"BINANCE:ETHUSDT","لایت‌کوین":"BINANCE:LTCUSDT","تتر":"BINANCE:USDTUSD","ریپل":"BINANCE:XRPUSDT","بایننس‌کوین":"BINANCE:BNBUSDT","دوج‌کوین":"BINANCE:DOGEUSDT","ترون":"BINANCE:TRXUSDT","کاردانو":"BINANCE:ADAUSDT","سولانا":"BINANCE:SOLUSDT"};
function item(x,isCrypto){var v=isCrypto?x.priceIRT:x.price,c=x.changePercent!=null?x.changePercent:x.changePercent24h,unit=isCrypto?" تومان":"",cl=Number(c)>0?"Evrenxus-up":Number(c)<0?"Evrenxus-down":"",ar=Number(c)>0?"▲":Number(c)<0?"▼":"",tv=tvMap[x.name],inner='<span class="symbol">'+x.name+'</span><span class="price">'+fmt(v)+unit+'</span><span class="'+cl+'">'+ar+(Number.isFinite(Number(c))?fmt(c)+"%":"")+'</span>';return tv?'<a class="Evrenxus-ticker-item" href="#market-chart" data-tv-symbol="'+tv+'" data-tv-name="'+x.name+'" onclick="return window.EvrenxusOpenMarketChart(this.getAttribute(\'data-tv-symbol\'),this.getAttribute(\'data-tv-name\'))">'+inner+'</a>':'<span class="Evrenxus-ticker-item">'+inner+'</span>'}
function itemNoLink(x,isCrypto){var v=isCrypto?x.priceIRT:x.price,c=x.changePercent!=null?x.changePercent:x.changePercent24h,unit=isCrypto?" تومان":"",cl=Number(c)>0?"Evrenxus-up":Number(c)<0?"Evrenxus-down":"",ar=Number(c)>0?"▲":Number(c)<0?"▼":"",inner='<span class="symbol">'+x.name+'</span><span class="price">'+fmt(v)+unit+'</span><span class="'+cl+'">'+ar+(Number.isFinite(Number(c))?fmt(c)+"%":"")+"</span>";return '<span class="Evrenxus-ticker-item">'+inner+"</span>"}
function render(track,prefix,groups,iso){var html=groups.flat().map(function(x){return prefix==="currency"?itemNoLink(x,false):item(x,prefix==="crypto")}).join("");track.innerHTML=html||'<span class="Evrenxus-ticker-item">اطلاعات در دسترس نیست</span>';}
window.EvrenxusOpenMarketChart=function(symbol,name){
var url="https://evrenexus.github.io/svgevrenexus-viewer/market-chart.html?symbol="+encodeURIComponent(symbol)+"&name="+encodeURIComponent(name||"");
window.open(url,"_blank");
return false;
}

function loadTGJU(){return fetch("https://raw.githubusercontent.com/evrenexus/svgevrenexus-viewer/main/market-data/tgju.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(t){render(metal,"metals",[t.precious||[],t.baseMetals||[],t.energy||[]],t.scrapedAt);render(cur,"currency",[t.currency||[]],t.scrapedAt)})}
function loadCrypto(){return fetch("https://raw.githubusercontent.com/evrenexus/svgevrenexus-viewer/main/market-data/nobitex.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(n){render(crypto,"crypto",[(n.markets||[]).slice().sort(function(a,b){return a.symbol==="USDT"?-1:b.symbol==="USDT"?1:0})],n.scrapedAt)})}
loadTGJU().catch(function(){stamp("metals");stamp("currency")});
loadCrypto().catch(function(){stamp("crypto")});
function nextTehranHour(){var n=new Date(),t=new Date(n.toLocaleString("en-US",{timeZone:"Asia/Tehran"})),d=new Date(t);d.setMinutes(0,0,0);d.setHours(d.getHours()+1);return Math.max(1000,d.getTime()-t.getTime())}function scheduleTGJU(){setTimeout(function(){loadTGJU().catch(function(){});setInterval(function(){loadTGJU().catch(function(){})},60*60*1000)},nextTehranHour())}scheduleTGJU();
function scheduleCrypto(){var n=new Date(),t=new Date(n.toLocaleString("en-US",{timeZone:"Asia/Tehran"})),m=t.getMinutes(),delay=((15-(m%15))*60-t.getSeconds())*1000-t.getMilliseconds();setTimeout(function(){loadCrypto().catch(function(){});setInterval(function(){loadCrypto().catch(function(){})},15*60*1000)},Math.max(1000,delay))}scheduleCrypto();
})();
(function(){
function update(){var n=new Date(),d=document.getElementById("Evrenxus-shamsi"),t=document.getElementById("Evrenxus-time");if(!d||!t)return;d.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:"Asia/Tehran",year:"numeric",month:"long",day:"numeric"}).format(n);t.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(n)}
update();setInterval(update,1000);
})();
})();