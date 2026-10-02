const fs = require("fs");

const SOURCE_URL = "https://www.tgju.org/";
const OUTPUT = "market-data/prices.json";

const TARGETS = {
  gold18: ["طلای 18 عیار", "طلای 18 عیار / 750"],
  dollar: ["دلار"],
  emami: ["سکه امامی", "سکه امامی (طرح جدید)"],
  half: ["نیم سکه"],
  quarter: ["ربع سکه"],
  gram: ["سکه گرمی"],
  mesghal: ["مثقال طلا"],
  melted: ["آبشده نقدی"]
};

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

function findValue(rows, labels) {
  for (const row of rows) {
    const label = row[0] || "";
    if (!labels.some(x => label.includes(x))) continue;
    for (let i = 1; i < row.length; i++) {
      const n = numberFrom(row[i]);
      if (n !== null) return n;
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

  const rial = {
    gold18: findValue(rows, TARGETS.gold18),
    dollar: findValue(rows, TARGETS.dollar),
    emami: findValue(rows, TARGETS.emami),
    half: findValue(rows, TARGETS.half),
    quarter: findValue(rows, TARGETS.quarter),
    gram: findValue(rows, TARGETS.gram),
    mesghal: findValue(rows, TARGETS.mesghal),
    melted: findValue(rows, TARGETS.melted)
  };

  const missing = Object.entries(rial).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) throw new Error("Missing TGJU fields: " + missing.join(", "));

  const toman = Object.fromEntries(
    Object.entries(rial).map(([key, value]) => [key, Math.round(value / 10)])
  );

  const output = {
    source: "TGJU",
    sourceUrl: SOURCE_URL,
    unit: "toman",
    fetchedAt: new Date().toISOString(),
    prices: toman
  };

  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
