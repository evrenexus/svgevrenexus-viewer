// Read-only audit of Evren Nexus data files. Changes nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["news.json", "news-ai.json", "editorial.json", "articles.json"];

function load(name) {
  const p = path.join(ROOT, "data", name);
  if (!fs.existsSync(p)) return { missing: true };
  const raw = fs.readFileSync(p, "utf8");
  try { return { data: JSON.parse(raw), bytes: Buffer.byteLength(raw) }; }
  catch (e) { return { error: String(e.message), bytes: Buffer.byteLength(raw) }; }
}
const short = (v) =>
  typeof v === "string" ? (v.length > 100 ? v.slice(0,100) + "…" : v) :
  Array.isArray(v) ? `[array:${v.length}]` :
  v && typeof v === "object" ? `{object:${Object.keys(v).length} keys}` : v;
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

function entries(d) {
  if (Array.isArray(d)) return d;
  if (!isObj(d)) return [];
  for (const k of ["items","articles"]) {
    if (Array.isArray(d[k])) return d[k];
    if (isObj(d[k])) return Object.entries(d[k]).map(([id,v]) => ({__key:id, ...(isObj(v)?v:{value:v})}));
  }
  return Object.entries(d).filter(([,v])=>isObj(v)).map(([id,v])=>({__key:id,...v}));
}
function shape(name,d) {
  const list=entries(d), freq={};
  for(const it of list.slice(0,500)) if(isObj(it)) for(const k of Object.keys(it)) freq[k]=(freq[k]||0)+1;
  console.log(`\n== ${name} ==`);
  console.log("top-level:", Array.isArray(d)?`array(${d.length})`:Object.keys(d||{}).map(k=>`${k}=${short(d[k])}`).join(" | "));
  console.log("entries:",list.length);
  console.log("key frequency (first 500 entries):",freq);
  if(isObj(list[0])) console.log("sample entry:",Object.fromEntries(Object.entries(list[0]).map(([k,v])=>[k,short(v)])));
  return list;
}
const text=(v,n=1)=>typeof v==="string"&&v.trim().length>=n;
const url=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
const idOf=a=>String(a.id??a.news_id??a.newsId??a.source_id??a.__key??"");

const loaded=Object.fromEntries(FILES.map(f=>[f,load(f)]));
for(const f of FILES){const r=loaded[f];if(r.missing)console.log(`\n== ${f} == MISSING`);else if(r.error)console.log(`\n== ${f} == INVALID JSON (${r.bytes} bytes): ${r.error}`);}
const lists={};
for(const f of FILES) if(loaded[f].data!==undefined) lists[f]=shape(f,loaded[f].data);

const news=(lists["news.json"]||[]).filter(isObj);
if(news.length){
  const rows={};
  const bump=(topic,key)=>{rows[topic]??={total:0,image:0,content200:0,republish:0,important:0,eligible:0};rows[topic][key]++;};
  for(const it of news){
    const img=url(it.image), body=text(it.content,200), rep=it.allow_internal_republish===true;
    const topics=Array.isArray(it.topics)&&it.topics.length?it.topics:["(no-topic)"];
    for(const t of topics){bump(t,"total");if(img)bump(t,"image");if(body)bump(t,"content200");if(rep)bump(t,"republish");if(it.important===true)bump(t,"important");if(img&&body&&rep)bump(t,"eligible");}
  }
  console.log("\n== news.json per topic (an item can count in several topics) ==");
  console.table(rows);
}
const articles=(lists["articles.json"]||[]).filter(isObj);
if(articles.length&&news.length){
  const articleIds=new Set(articles.map(idOf).filter(Boolean));
  const matched=news.filter(n=>articleIds.has(String(n.id)));
  console.log("\n== articles.json vs news.json ==");
  console.log({articles:articles.length,articlesWithImage:articles.filter(a=>url(a.image)).length,newsIdsFoundInArticles:matched.length,matchedWithImage:matched.filter(n=>url(n.image)).length});
}
const editorial=(lists["editorial.json"]||[]).filter(isObj);
if(editorial.length) console.log("\n== editorial.json ==",{overrides:editorial.length,republishTrue:editorial.filter(e=>e.republish===true||e.published===true).length,withImage:editorial.filter(e=>url(e.image)).length,withContent:editorial.filter(e=>text(e.content,200)).length});
const ai=loaded["news-ai.json"].data;
if(isObj(ai)) console.log("\n== news-ai.json ==",{version:ai.version,policy_version:ai.policy_version,items:isObj(ai.items)?Object.keys(ai.items).length:Array.isArray(ai.items)?ai.items.length:0,groups:isObj(ai.groups)?Object.keys(ai.groups).length:0});
