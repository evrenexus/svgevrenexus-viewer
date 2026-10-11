// Fetch all tradable Nobitex crypto markets, global ranks, and 15-minute price changes.
const fs = require("fs");
const cheerio = require("cheerio");

const API = "https://apiv2.nobitex.ir";
const COINGECKO = "https://api.coingecko.com/api/v3";
const DATA_FILE = "market-data/nobitex.json";

const persianNames = {
  btc:"بیت‌کوین", eth:"اتریوم", ltc:"لایت‌کوین", usdt:"تتر", xrp:"ریپل",
  bnb:"بایننس‌کوین", doge:"دوج‌کوین", trx:"ترون", ada:"کاردانو", sol:"سولانا",
  ton:"تون‌کوین", shib:"شیبا اینو", link:"چین‌لینک", dot:"پولکادات", avax:"آوالانچ",
  xlm:"استلار", atom:"کازماس", uni:"یونی‌سواپ", etc:"اتریوم کلاسیک", bch:"بیت‌کوین کش",
  near:"نیر پروتکل", apt:"اپتوس", arb:"آربیتروم", op:"آپتیمیسم", fil:"فایل‌کوین",
  vet:"وی‌چین", xmr:"مونرو", eos:"ایاس", algo:"الگوراند", aave:"آوه",
  trx:"ترون", ftm:"فانتوم", cake:"پنکیک‌سواپ", mana:"دیسنترالند", sand:"سندباکس",
  pepe:"پپه", wif:"داگ‌ویف‌هت", not:"نات‌کوین", hmstr:"همستر کامبت",
  btc:"بیت‌کوین", usdc:"یو‌اس‌دی کوین", dai:"دای", tusd:"ترو یو‌اس‌دی",
  slvon:"توکن‌شده صندوق نقره", grvt:"جی‌آر‌وی‌تی", dos:"دپ‌اواس"
};

function requestJson(url) {
  return fetch(url, {
    headers: {
      "User-Agent": "EvrenNexusMarketData/1.0",
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(25000)
  }).then(async r => {
    if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
    return r.json();
  });
}
function number(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function pct(now, before) {
  return now != null && before != null && before !== 0
    ? Number(((now - before) / before * 100).toFixed(6))
    : null;
}
function persianText(s) {
  return /[\u0600-\u06FF]/.test(String(s || ""));
}
function extractPersianName(label, symbol) {
  const re = new RegExp("(?<![A-Z0-9])" + symbol + "(?![A-Z0-9])", "i");
  const match = re.exec(label);
  if (!match) return null;
  const clean = s => String(s || "").replace(/[()|·•—–-]/g, " ").replace(/\s+/g, " ").trim();
  const before = clean(label.slice(0, match.index));
  const after = clean(label.slice(match.index + match[0].length));
  const beforeFa = persianText(before);
  const afterFa = persianText(after);
  if (beforeFa && afterFa) return before.length <= after.length ? before : after;
  if (beforeFa) return before;
  if (afterFa) return after;
  return null;
}
function parsePairStats(payload) {
  const stats = payload && payload.stats;
  if (!stats || typeof stats !== "object") throw new Error("Nobitex market stats missing");
  return stats;
}
async function fetchPersianNames(symbols) {
  const names = new Map();
  for (const url of ["https://nobitex.ir/price/", "https://nobitex.company/price/"]) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"
        },
        signal: AbortSignal.timeout(20000)
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const $ = cheerio.load(await r.text());
      function scanLabel(label) {
        label = String(label || "").replace(/\s+/g, " ").trim();
        if (!label) return;
        for (const symbol of symbols) {
          const candidate = extractPersianName(label, symbol);
          if (candidate && candidate.length < 80) names.set(symbol, candidate);
        }
      }
      $("table tr").each((_, tr) => {
        const cells = $(tr).find("th,td").map((_, cell) => $(cell).text()).get();
        cells.forEach(scanLabel);
      });
      // The longer market list is also rendered as links on Nobitex.
      $("a").each((_, anchor) => scanLabel($(anchor).text()));
      if (names.size) break;
    } catch (e) {
      console.warn("Nobitex Persian names unavailable:", e.message);
    }
  }
  return names;
}
async function fetchGlobalRanks() {
  const ranks = new Map();
  // CoinGecko's market-cap order supplies global ranks for assets listed on Nobitex.
  // Keep failures non-fatal: local market prices must continue updating.
  for (let page = 1; page <= 4; page++) {
    try {
      const rows = await requestJson(
        COINGECKO + "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=" + page + "&sparkline=false"
      );
      if (!Array.isArray(rows) || !rows.length) break;
      rows.forEach(x => {
        const symbol = String(x.symbol || "").toLowerCase();
        const rank = number(x.market_cap_rank);
        if (symbol && rank != null && !ranks.has(symbol)) ranks.set(symbol, rank);
      });
    } catch (e) {
      console.warn("Global ranking page " + page + " unavailable:", e.message);
      break;
    }
  }
  return ranks;
}
async function main() {
  const previous = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
    : {};
  const now = Date.now();

  const [options, marketPayload, ranks] = await Promise.all([
    requestJson(API + "/v2/options"),
    requestJson(API + "/market/stats"),
    fetchGlobalRanks()
  ]);

  const pairStats = parsePairStats(marketPayload);
  const coins = Array.isArray(options.coins) ? options.coins : [];
  const coinInfo = new Map(coins.map(c => [String(c.coin || "").toLowerCase(), c]));
  const symbols = new Set();

  Object.keys(pairStats).forEach(pair => {
    const m = pair.toLowerCase().match(/^([a-z0-9]+)-(rls|usdt)$/);
    if (m && m[1] !== "rls") symbols.add(m[1]);
  });
  // Include every active currency returned by Nobitex even if one quote pair is temporarily absent.
  const active = options.nobitex && Array.isArray(options.nobitex.activeCurrencies)
    ? options.nobitex.activeCurrencies : [];
  active.forEach(s => {
    const symbol = String(s).toLowerCase();
    if (symbol && symbol !== "rls" && symbol !== "usdt" && symbol !== "irt") symbols.add(symbol);
  });
  symbols.add("usdt");

  const usdtRls = number(pairStats["usdt-rls"] && pairStats["usdt-rls"].latest);
  const usdtToman = usdtRls == null ? null : usdtRls / 10;
  const markets = [];
  const scrapedNames = await fetchPersianNames(symbols);

  for (const symbol of symbols) {
    if (symbol === "rls" || symbol === "irt") continue;
    const rlsStat = pairStats[symbol + "-rls"];
    const usdtStat = pairStats[symbol + "-usdt"];
    const info = coinInfo.get(symbol) || {};
    const rawName = String(info.name || info.stdName || symbol.toUpperCase());
    const name = persianNames[symbol] || scrapedNames.get(symbol) || (persianText(info.stdName) ? info.stdName : rawName);
    const rlsLatestRaw = rlsStat ? number(rlsStat.latest) : null;
    const usdtLatestRaw = usdtStat ? number(usdtStat.latest) : null;
    const rlsLatest = rlsLatestRaw != null && rlsLatestRaw > 0 ? rlsLatestRaw : null;
    const usdtLatest = usdtLatestRaw != null && usdtLatestRaw > 0 ? usdtLatestRaw : null;
    const directIRT = symbol === "usdt" ? usdtToman : (rlsLatest == null ? null : rlsLatest / 10);
    const directUSDT = symbol === "usdt" ? 1 : usdtLatest;
    const priceIRT = directIRT != null ? directIRT : (directUSDT != null && usdtToman ? directUSDT * usdtToman : null);
    const priceUSDT = directUSDT != null ? directUSDT : (directIRT != null && usdtToman ? directIRT / usdtToman : null);
    if (!(priceIRT > 0) && !(priceUSDT > 0)) continue;

    markets.push({
      symbol: symbol.toUpperCase(),
      name,
      rank: ranks.get(symbol) || null,
      priceIRT,
      priceUSDT,
      changePercent15mIRT: null,
      changePercent15mUSDT: null
    });
  }

  if (markets.length < 5) throw new Error("Nobitex returned too few crypto markets: " + markets.length);

  const history = Array.isArray(previous.history) ? previous.history.slice() : [];
  const targetTime = now - 15 * 60 * 1000;
  const baseline = history
    .filter(h => number(h.timestamp) != null && h.timestamp <= targetTime && h.prices)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (baseline) {
    markets.forEach(x => {
      const old = baseline.prices[x.symbol];
      if (!old) return;
      x.changePercent15mIRT = pct(x.priceIRT, number(old.priceIRT));
      x.changePercent15mUSDT = pct(x.priceUSDT, number(old.priceUSDT));
    });
  }

  history.push({
    timestamp: now,
    prices: Object.fromEntries(markets.map(x => [x.symbol, {
      priceIRT: x.priceIRT,
      priceUSDT: x.priceUSDT
    }]))
  });
  const trimmedHistory = history
    .filter(h => number(h.timestamp) != null && h.timestamp >= now - 90 * 60 * 1000)
    .slice(-20);

  const payload = {
    source: "Nobitex",
    rankingSource: "CoinGecko market-cap rank",
    sourcePage: "Nobitex public market API",
    scrapedAt: new Date(now).toISOString(),
    scrapedAtTimezone: "UTC",
    quoteCurrency: "USDT",
    usdtPriceCurrency: "IRT",
    marketCount: markets.length,
    rankingUpdatedAt: ranks.size ? new Date(now).toISOString() : (previous.rankingUpdatedAt || null),
    markets,
    history: trimmedHistory
  };

  fs.mkdirSync("market-data", { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2) + "\n");
  console.log("Nobitex updated:", markets.length, "markets; global ranks:", ranks.size,
    "; 15-minute baseline:", baseline ? new Date(baseline.timestamp).toISOString() : "warming up");
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
