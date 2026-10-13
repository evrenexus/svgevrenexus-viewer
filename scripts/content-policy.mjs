// scripts/content-policy.mjs — shared out-of-scope matcher.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const OUT_OF_SCOPE_TERMS = JSON.parse(
  fs.readFileSync(new URL("./policy-terms.json", import.meta.url), "utf8")
).terms;

const norm = (s) => String(s ?? "")
  .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
  .replace(/\u064a/g, "\u06cc")
  .replace(/\u0643/g, "\u06a9")
  .replace(/[\u064b-\u065f\u0670]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RULES = OUT_OF_SCOPE_TERMS.map((term) => ({
  term,
  re: new RegExp("(?<![\\p{L}\\p{N}])" + esc(norm(term)) + "(?![\\p{L}\\p{N}])", "u")
}));

const DAILY_MARKET_PRICE_TITLE = /^(?:قیمت|نرخ)\s+(?:(?:روز|امروز|لحظه‌ای|لحظه ای)\s+)*(?:پوند(?:\s+انگلیس)?|دلار(?:\s+آمریکا)?|یورو|درهم(?:\s+امارات)?|لیر(?:\s+ترکیه)?|دینار(?:\s+عراق)?|روبل|یوآن|فرانک|طلا|سکه|نیم\s+سکه|ربع\s+سکه|ارز)/u;
const DAILY_MARKET_DATE_CUE = /(?:امروز|جدول|قیمت روز|نرخ روز|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند|شنبه|یکشنبه|دوشنبه|سه\s+شنبه|چهارشنبه|پنجشنبه|جمعه|[۰-۹0-9]{1,2}\s*(?:مهر|آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور))/u;

const plain = (value) => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&");

export function outOfScope(item) {
  const title = norm(plain(item?.title));
  if (DAILY_MARKET_PRICE_TITLE.test(title) && DAILY_MARKET_DATE_CUE.test(title)) {
    return "daily-market-price";
  }
  const text = norm([item?.title, item?.summary, item?.content]
    .map(plain)
    .filter(Boolean)
    .join(" "));
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.term;
  }
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes("--scan")) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const load = (filename) => {
    const file = path.join(ROOT, "data", filename);
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.articles)) return data.articles;
    const entries = data?.items ?? data?.articles ?? data;
    return entries && typeof entries === "object"
      ? Object.entries(entries).map(([id, value]) => ({ id, ...(value && typeof value === "object" ? value : {}) }))
      : [];
  };

  for (const filename of ["news.json", "articles.json"]) {
    const items = load(filename);
    const hits = items
      .map((item) => ({ id: item.id, title: item.title, term: outOfScope(item) }))
      .filter((item) => item.term);
    console.log("\n== " + filename + ": " + hits.length + " out-of-scope of " + items.length + " ==");
    const counts = {};
    for (const hit of hits) counts[hit.term] = (counts[hit.term] || 0) + 1;
    console.table(counts);
    for (const hit of hits.slice(0, 25)) {
      console.log(hit.id + " | " + hit.term + " | " + String(hit.title).slice(0, 90));
    }
  }
}
