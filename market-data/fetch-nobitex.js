// Direct page scraper
const fs = require("fs");
const cheerio = require("cheerio");

const URLS = ["https://nobitex.ir/price/","https://nobitex.company/price/"];

const wanted = [
  ["BTC","بیت‌کوین"],
  ["ETH","اتریوم"],
  ["LTC","لایت‌کوین"],
  ["USDT","تتر"],
  ["XRP","ریپل"],
  ["BNB","بایننس‌کوین"],
  ["DOGE","دوج‌کوین"],
  ["TRX","ترون"],
  ["ADA","کاردانو"],
  ["SOL","سولانا"]
];

function digits(s){
  return String(s || "")
    .replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function clean(s){
  return digits(s).replace(/\s+/g," ").trim();
}

function priceFrom(s){
  const text=clean(s).replace(/٬/g,",");
  const m=text.match(/irt\s*([\d,]+(?:\.\d+)?)/i);
  if(!m) return null;
  return Number(m[1].replace(/,/g,""));
}

function changePercent(s){
  const m=clean(s).match(/([+-]?\d+(?:\.\d+)?)\s*[٪%]/);
  return m ? Number(m[1]) : null;
}

async function main(){
  let html="";
  let lastError=null;
  for(const URL of URLS){
    try{
      const r=await fetch(URL,{
    headers:{
      "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language":"fa-IR,fa;q=0.9,en;q=0.8"
    }
  });

      if(!r.ok) throw new Error("HTTP "+r.status);
      html=await r.text();
      if(html.length>1000) break;
    }catch(e){ lastError=e; }
  }
  if(!html) throw new Error("Nobitex page fetch failed: "+(lastError?.message||"unknown"));
  const $=cheerio.load(html);
  const result=[];

  $("table tr").each((_,tr)=>{
    const cells=$(tr).find("th,td")
      .map((_,c)=>clean($(c).text()))
      .get();

    if(cells.length<3) return;

    const first=cells[0] || "";
    const match=wanted.find(([symbol])=>{
      return new RegExp("(^|\\s)"+symbol+"(\\s|$)","i").test(first);
    });

    if(!match || result.some(x=>x.symbol===match[0])) return;

    const price=priceFrom(cells[1] || "");
    if(price==null) return;

    result.push({
      symbol:match[0],
      name:match[1],
      priceIRT:price,
      changePercent24h:changePercent(cells[2] || "")
    });
  });

  if(result.length<5){
    throw new Error("Nobitex page yielded too few markets: "+result.length);
  }

  const payload={
    source:"Nobitex",
    sourcePage:"Nobitex price page",
    scrapedAt:new Date().toISOString(),
    scrapedAtTimezone:"UTC",
    quoteCurrency:"IRT",
    markets:result
  };

  fs.mkdirSync("market-data",{recursive:true});
  fs.writeFileSync("market-data/nobitex.json",JSON.stringify(payload,null,2)+"\n");

  console.log("Nobitex updated:",result.length,"markets");
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});