// scripts/content-policy.mjs — shared out-of-scope matcher.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const OUT_OF_SCOPE_TERMS = JSON.parse(fs.readFileSync(new URL("./policy-terms.json", import.meta.url), "utf8")).terms;
const norm = (s) => String(s ?? "")
  .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
  .replace(/\u064a/g, "\u06cc").replace(/\u0643/g, "\u06a9")
  .replace(/[\u064b-\u065f\u0670]/g, "")
  .replace(/\s+/g, " ").trim().toLowerCase();
const esc = (s) => s.replace(/[.*+?^$(){}|]/g, "\\$&").replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
const RULES = OUT_OF_SCOPE_TERMS.map((t) => ({
  term: t,
  re: new RegExp("(?<![\\p{L}\\p{N}])" + esc(norm(t)) + "(?![\\p{L}\\p{N}])", "u")
}));
export function outOfScope(item) {
  const text = norm(String(item?.title ?? "") + " " + String(item?.summary ?? ""));
  for (const r of RULES) if (r.re.test(text)) return r.term;
  return null;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes("--scan")) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const load = (f) => {
    const p = path.join(ROOT, "data", f); if (!fs.existsSync(p)) return [];
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.articles)) return d.articles;
    const o = d?.items ?? d?.articles ?? d;
    return o && typeof o === "object" ? Object.entries(o).map(([k,v]) => ({id:k,...(v&&typeof v==="object"?v:{})})) : [];
  };
  for (const f of ["news.json","articles.json"]) {
    const list=load(f),hits=list.map(x=>({id:x.id,title:x.title,term:outOfScope(x)})).filter(x=>x.term);
    console.log("\n== "+f+": "+hits.length+" out-of-scope of "+list.length+" ==");
    const byTerm={}; for(const h of hits) byTerm[h.term]=(byTerm[h.term]||0)+1; console.table(byTerm);
    for(const h of hits.slice(0,25)) console.log(h.id+" | "+h.term+" | "+String(h.title).slice(0,90));
  }
}
