// Fetch USDT spot prices and multi-timeframe changes from LBank.
const fs = require("fs");

const API = "https://api.lbkex.com/v2";
const DATA_FILE = "market-data/lbank.json";
const LIMIT = 60;
const CONCURRENCY = 3;
const FRAMES = [
  { key: "5m", type: "minute5", seconds: 5 * 60 },
  { key: "15m", type: "minute15", seconds: 15 * 60 },
  { key: "4h", type: "hour4", seconds: 4 * 60 * 60 },
  { key: "1d", type: "day1", seconds: 24 * 60 * 60 }
];

function n(v) {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function pct(now, before) {
  return now != null && before != null && before !== 0
    ? Number(((now - before) / before * 100).toFixed(6))
    : null;
}
async function json(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "EvrenNexusMarketData/1.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
  const data = await r.json();
  if (data && Number(data.error_code) !== 0 && data.error_code != null) {
    throw new Error("LBank error " + data.error_code + " for " + url);
  }
  return data;
}
async function pool(items, limit, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { await worker(items[i], i); }
      catch (e) { console.warn("Market data item failed:", e.message); }
    }
  }));
}
async function frameChange(symbol, frame, latest, nowSeconds) {
  const from = nowSeconds - frame.seconds * 3;
  const url = API + "/kline.do?symbol=" + encodeURIComponent(symbol) +
    "&type=" + encodeURIComponent(frame.type) + "&size=3&time=" + from;
  const payload = await json(url);
  const bars = Array.isArray(payload.data) ? payload.data : [];
  const valid = bars.filter(b => Array.isArray(b) && n(b[1]) != null && n(b[4]) != null)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!valid.length) return null;
  // Compare the latest market price with the open of the current/latest candle.
  return pct(latest, n(valid[valid.length - 1][1]));
}
async function main() {
  const payload = await json(API + "/ticker/24hr.do?symbol=all");
  const tickers = Array.isArray(payload.data) ? payload.data : [];
  const markets = tickers.map(row => {
    const symbol = String(row.symbol || "").toLowerCase();
    const ticker = row.ticker || row;
    return {
      symbol: symbol.replace(/_usdt$/i, "").toUpperCase(),
      pair: symbol,
      priceUSDT: n(ticker.latest),
      turnover24hUSDT: n(ticker.turnover),
      changePercent24hUSDT: n(ticker.change),
      changePercent5mUSDT: null,
      changePercent15mUSDT: null,
      changePercent4hUSDT: null,
      changePercent1dUSDT: null
    };
  }).filter(x => /_usdt$/.test(x.pair) && x.symbol && x.priceUSDT > 0)
    .sort((a, b) => (b.turnover24hUSDT || 0) - (a.turnover24hUSDT || 0))
    .slice(0, LIMIT);

  if (markets.length < 5) throw new Error("LBank returned too few USDT spot markets: " + markets.length);

  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  await pool(markets, CONCURRENCY, async market => {
    for (const frame of FRAMES) {
      try {
        market["changePercent" + frame.key.replace("m", "m").replace("h", "h").replace("d", "d") + "USDT"] =
          await frameChange(market.pair, frame, market.priceUSDT, nowSeconds);
      } catch (e) {
        console.warn("LBank " + market.pair + " " + frame.key + " unavailable:", e.message);
      }
    }
  });

  const output = {
    source: "LBank",
    sourceUrl: "https://www.lbank.com/",
    quoteCurrency: "USDT",
    scrapedAt: new Date(now).toISOString(),
    marketCount: markets.length,
    markets
  };
  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log("LBank updated:", markets.length, "USDT spot markets.");
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
