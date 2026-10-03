const fs = require("fs");
const cheerio = require("cheerio");

const SOURCES = {
  gold: "https://www.tgju.org/gold-global/1000",
  base: "https://www.tgju.org/basemetal",
  energy: "https://www.tgju.org/energy/1000",
  currency: "https://www.tgju.org/currency/1236"
};

const digits = s => String(s || "")
  .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
  .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

function numberFrom(s) {
  const x = digits(s).replace(/,/g, "").replace(/٬/g, "").match(/-?\d+(?:\.\d+)?/);
  return x ? Number(x[0]) : null;
}

function percentFrom(s) {
  const x = digits(s).match(/\(([+-]?[\d.]+)\s*%\)/);
  return x ? Number(x[1]) : null;
}

async function page(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"
    }
  });
  if (!r.ok) throw new Error("TGJU HTTP " + r.status + " " + url);
  return await r.text();
}

function rows(html) {
  const $ = cheerio.load(html);
  const out = [];
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("th,td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length >= 2) out.push(cells);
  });
  return out;
}

function findRow(allRows, names) {
  for (const row of allRows) {
    const title = row[0] || "";
    const hit = names.find(n => title === n || title.startsWith(n + " "));
    if (!hit) continue;
    const price = numberFrom(row[1]);
    if (price == null) continue;
    return { name: hit, price, changePercent: percentFrom(row.slice(1,3).join(" ")) };
  }
  return null;
}

const wanted = {
  gold: [
    ["انس طلا", "انس طلا"],
    ["انس نقره", "انس نقره"],
    ["انس پلاتین", "انس پلاتین"],
    ["انس پالادیوم", "انس پالادیوم"],
    ["طلای 18 عیار", "طلای ۱۸"],
    ["گرم نقره ۹۹۹", "نقره 999"]
  ],
  base: [
    ["آلومینیوم", "آلومینیوم"],
    ["سرب", "سرب"],
    ["روی", "روی"],
    ["مس", "مس"],
    ["نیکل", "نیکل"],
    ["قلع", "قلع"],
    ["سنگ آهن", "سنگ آهن"]
  ],
  energy: [
    ["نفت برنت", "نفت برنت"],
    ["نفت خام (WTI)", "WTI"],
    ["گاز طبیعی", "گاز طبیعی"],
    ["بنزین (RBOB)", "بنزین RBOB"],
    ["نفت کوره", "نفت کوره"],
    ["گازوییل", "گازوییل"]
  ],
  currency: [
    ["دلار", "دلار"],
    ["یورو", "یورو"],
    ["درهم امارات", "درهم"],
    ["پوند انگلیس", "پوند"],
    ["لیر ترکیه", "لیر"],
    ["فرانک سوئیس", "فرانک"],
    ["یوان چین", "یوان"],
    ["ین ژاپن (100 ین)", "ین ژاپن"],
    ["دلار کانادا", "دلار کانادا"],
    ["دلار استرالیا", "دلار استرالیا"],
    ["روبل روسیه", "روبل"],
    ["منات آذربایجان", "منات"]
  ]
};

async function collect(group) {
  const html = await page(SOURCES[group]);
  const all = rows(html);
  const result = [];
  for (const [needle, label] of wanted[group]) {
    const r = findRow(all, [needle]);
    if (r) result.push({ name: label, price: r.price, changePercent: r.changePercent });
  }
  if (!result.length) throw new Error("No usable TGJU rows found for " + group);
  return result;
}

(async () => {
  const [gold, base, energy, currency] = await Promise.all([
    collect("gold"), collect("base"), collect("energy"), collect("currency")
  ]);

  const payload = {
    source: "TGJU",
    scrapedAt: new Date().toISOString(),
    scrapedAtTimezone: "UTC",
    gold, baseMetals: base, energy, currency
  };

  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync("market-data/tgju.json", JSON.stringify(payload, null, 2) + "\n");
  console.log("TGJU updated:", payload.scrapedAt);
})();