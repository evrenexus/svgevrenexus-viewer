const fs = require("fs");

const SOURCE_URL = "https://www.tgju.org/";
const OUTPUT = "market-data/prices.json";

function faToEn(value) {
  return String(value)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function cleanText(value) {
  return faToEn(String(value))
    .replace(/&nbsp;/g, " ")
    .replace(/&#x200c;/gi, "")
    .replace(/&zwnj;/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(value) {
  const s = cleanText(value).replace(/[,٬]/g, "");
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function rowsFromHtml(html) {
  const rows = [];
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cells = [];
    const cre = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let c;
    while ((c = cre.exec(m[1]))) cells.push(cleanText(c[1]));
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}

function findSingleRetail(rows, label) {
  const wanted = label + " تک فروشی";

  for (const row of rows) {
    const rowText = row.join(" | ");
    if (!rowText.includes(wanted)) continue;

    // Expected TGJU order:
    // نام | قیمت زنده | تغییر | کمترین | بیشترین | زمان
    const price = numberFrom(row[1]);
    const changeText = row[2] || "";
    const change = numberFrom(changeText);
    const percentMatch = cleanText(changeText).match(/\\((-?\\d+(?:\\.\\d+)?)%\\)/);
    const changePercent = percentMatch ? Number(percentMatch[1]) : null;
    const low = numberFrom(row[3]);
    const high = numberFrom(row[4]);
    const time = row[5] || null;

    if (price !== null) {
      return { price, change, changePercent, low, high, time };
    }
  }

  return null;
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EvrenNexusMarketBot/1.0)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  if (!res.ok) throw new Error(`TGJU HTTP ${res.status}`);

  const html = await res.text();
  const rows = rowsFromHtml(html);

  const labels = {
    emami: "سکه امامی",
    bahar: "سکه بهار آزادی",
    half: "نیم سکه",
    quarter: "ربع سکه",
    gram: "سکه گرمی"
  };

  const rial = {};
  for (const [key, label] of Object.entries(labels)) {
    rial[key] = findSingleRetail(rows, label);
  }

  const missing = Object.entries(rial)
    .filter(([, v]) => !v)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error("Missing TGJU single-retail fields: " + missing.join(", "));
  }

  // TGJU publishes these domestic values in rial.
  // Evren Nexus stores and displays them in toman.
  const prices = {};
  for (const [key, value] of Object.entries(rial)) {
    prices[key] = {
      price: Math.round(value.price / 10),
      change: value.change === null ? null : Math.round(value.change / 10),
      changePercent: value.changePercent,
      low: value.low === null ? null : Math.round(value.low / 10),
      high: value.high === null ? null : Math.round(value.high / 10),
      time: value.time
    };
  }

  const currencyLabels = {
    dollar: "دلار",
    euro: "یورو",
    aed: "درهم امارات",
    gbp: "پوند انگلیس",
    try: "لیر ترکیه",
    chf: "فرانک سوئیس",
    cny: "یوان چین",
    jpy: "ین ژاپن",
    krw: "وون کره جنوبی",
    cad: "دلار کانادا",
    aud: "دلار استرالیا",
    nzd: "دلار نیوزیلند",
    sgd: "دلار سنگاپور",
    inr: "روپیه هند",
    pkr: "روپیه پاکستان",
    iqd: "دینار عراق",
    sar: "ریال عربستان",
    qar: "ریال قطر",
    omr: "ریال عمان",
    kwd: "دینار کویت",
    myr: "رینگیت مالزی",
    thb: "بات تایلند",
    rub: "روبل روسیه",
    azn: "منات آذربایجان",
    amd: "درام ارمنستان",
    gel: "لاری گرجستان",
    afn: "افغانی"
  };

  const currenciesRial = {};
  for (const [key, label] of Object.entries(currencyLabels)) {
    currenciesRial[key] = findSingleRetail(rows, label);
  }

  const missingCurrencies = Object.entries(currenciesRial)
    .filter(([, v]) => !v)
    .map(([key]) => key);

  if (missingCurrencies.length) {
    throw new Error("Missing TGJU currency fields: " + missingCurrencies.join(", "));
  }

  const currencies = {};
  for (const [key, value] of Object.entries(currenciesRial)) {
    currencies[key] = {
      price: Math.round(value.price / 10),
      change: value.change === null ? null : Math.round(value.change / 10),
      changePercent: value.changePercent,
      low: value.low === null ? null : Math.round(value.low / 10),
      high: value.high === null ? null : Math.round(value.high / 10),
      time: value.time
    };
  }

  const output = {
    source: "TGJU",
    sourceUrl: SOURCE_URL,
    market: "tgju",
    unit: "toman",
    fetchedAt: new Date().toISOString(),
    prices,
    currencies
  };

  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
