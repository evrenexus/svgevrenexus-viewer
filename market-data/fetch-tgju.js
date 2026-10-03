// Direct page scraper
const fs = require("fs");
const cheerio = require("cheerio");

const SOURCES = {
  global: "https://www.tgju.org/global-market/1000",
  currency: "https://www.tgju.org/currency/1236"
};

function digits(s){
  return String(s || "")
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function clean(s){
  return digits(s)
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(s){
  const x = clean(s).replace(/,/g, "").replace(/٬/g, "").match(/-?\d+(?:\.\d+)?/);
  return x ? Number(x[0]) : null;
}

function percentFrom(s){
  const x = clean(s).match(/\(([+-]?[\d.]+)\s*%\)/);
  if(x) return Number(x[1]);
  const y = clean(s).match(/([+-]?[\d.]+)\s*%/);
  return y ? Number(y[1]) : null;
}

function normTitle(s){
  return clean(s)
    .replace(/ي/g,"ی")
    .replace(/ك/g,"ک")
    .replace(/[()]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

async function page(url){
  const r = await fetch(url,{
    headers:{
      "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language":"fa-IR,fa;q=0.9,en;q=0.8"
    }
  });
  if(!r.ok) throw new Error("TGJU HTTP "+r.status+" "+url);
  return await r.text();
}

function rows(html){
  const $=cheerio.load(html);
  const out=[];
  $("table tr").each((_,tr)=>{
    const cells=$(tr).find("th,td").map((_,c)=>$(c).text().replace(/\s+/g," ").trim()).get();
    if(cells.length>=2) out.push(cells);
  });
  return out;
}

function findRow(all,names){
  const wanted=names.map(normTitle);
  for(const row of all){
    const title=normTitle(row[0] || "");
    const hit=wanted.find(n=>title===n || title.startsWith(n+" "));
    if(!hit) continue;
    const price=numberFrom(row[1]);
    if(price==null) continue;
    return {
      name:names[wanted.indexOf(hit)],
      price,
      changePercent:percentFrom(row.slice(1,3).join(" "))
    };
  }
  return null;
}

const wanted={
  precious:[
    ["انس طلا","انس طلا"],
    ["انس نقره","انس نقره"],
    ["انس پلاتین","انس پلاتین"],
    ["انس پالادیوم","انس پالادیوم"]
  ],
  base:[
    ["آلومینیوم","آلومینیوم"],
    ["سرب","سرب"],
    ["روی","روی"],
    ["مس","مس"],
    ["نیکل","نیکل"],
    ["قلع","قلع"]
  ],
  energy:[
    ["نفت برنت","نفت برنت"],
    ["نفت اپک","نفت اپک"],
    ["نفت خام","نفت خام (WTI)"],
    ["نفت کوره","نفت کوره"],
    ["بنزین","بنزین (RBOB)"],
    ["گاز طبیعی","گاز طبیعی"],
    ["گازوییل","گازوییل"],
    ["زغال سنگ","زغال سنگ"]
  ],
  currency:[
    ["دلار","دلار"],
    ["یورو","یورو"],
    ["درهم امارات","درهم"],
    ["پوند انگلیس","پوند"],
    ["لیر ترکیه","لیر"],
    ["فرانک سوئیس","فرانک"],
    ["یوان چین","یوان"],
    ["ین ژاپن","ین"],
    ["روبل روسیه","روبل"],
    ["منات آذربایجان","منات"]
  ]
};

function collectFrom(all,group){
  const result=[];
  for(const [needle,label] of wanted[group]){
    const r=findRow(all,[needle]);
    if(r) result.push({name:label,price:r.price,changePercent:r.changePercent});
  }
  return result;
}

(async()=>{
  const [globalHtml,currencyHtml]=await Promise.all([
    page(SOURCES.global),
    page(SOURCES.currency)
  ]);

  const globalRows=rows(globalHtml);
  const currencyRows=rows(currencyHtml);

  const precious=collectFrom(globalRows,"precious");
  const baseMetals=collectFrom(globalRows,"base");
  const energy=collectFrom(globalRows,"energy");
  const currency=collectFrom(currencyRows,"currency");

  if(precious.length<2 || baseMetals.length<3 || energy.length<3 || currency.length<3){
    throw new Error(
      "TGJU sanity check failed: precious="+precious.length+
      " base="+baseMetals.length+
      " energy="+energy.length+
      " currency="+currency.length
    );
  }

  const payload={
    source:"TGJU",
    scrapedAt:new Date().toISOString(),
    scrapedAtTimezone:"UTC",
    precious,
    baseMetals,
    energy,
    currency
  };

  fs.mkdirSync("market-data",{recursive:true});
  fs.writeFileSync("market-data/tgju.json",JSON.stringify(payload,null,2)+"\n");
  console.log("TGJU updated:",payload.scrapedAt);
  console.log("Counts:",{
    precious:precious.length,
    baseMetals:baseMetals.length,
    energy:energy.length,
    currency:currency.length
  });
})();