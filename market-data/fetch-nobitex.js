const fs = require("fs");
const cheerio = require("cheerio");

const URL = "https://nobitex.ir/price/";
const wanted = [
  ["BTC", "بیت‌کوین"], ["ETH", "اتریوم"], ["USDT", "تتر"],
  ["XRP", "ریپل"], ["BNB", "بایننس‌کوین"], ["DOGE", "دوج‌کوین"],
  ["TRX", "ترون"], ["ADA", "کاردانو"], ["SOL", "سولانا"], ["LTC", "لایت‌کوین"]
];

function digits(s) {
  return String(s || "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}
function changePercent(s) {
  const m = digits(s).match(/([+-]?\d+(?:\.\d+)?)\s*[٪%]/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const r = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"
    }
  });
  if (!r.ok) throw new Error("Nobitex HTTP " + r.status);
  const html = await r.text();
  const $ = cheerio.load(html);
  const result = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("th,td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length < 3) return;
    const match = wanted.find(([symbol]) => new RegExp("\\b" + symbol + "\\b", "i").test(cells[0] || ""));
    if (!match || result.some(x => x.symbol === match[0])) return;

    const irt = (cells[1] || "").match(/irt\s*([\d,]+(?:\.\d+)?)/i);
    const price = irt ? Number(irt[1].replace(/,/g, "")) : null;
    if (price == null) return;

    result.push({
      symbol: match[0],
      name: match[1],
      priceIRT: price,
      changePercent24h: changePercent(cells[2] || "")
    });
  });

  if (result.length < 5) throw new Error("Nobitex page yielded too few markets: " + result.length);

  const payload = {
    source: "Nobitex",
    sourcePage: URL,
    scrapedAt: new Date().toISOString(),
    scrapedAtTimezone: "UTC",
    quoteCurrency: "IRT",
    markets: result
  };

  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync("market-data/nobitex.json", JSON.stringify(payload, null, 2) + "\n");
  console.log("Nobitex updated:", result.length, "markets");
}
main().catch(err => { console.error(err); process.exit(1); });