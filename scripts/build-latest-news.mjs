// Build the "آخرین مطالب" feed exclusively from collected, rule-classified news.
// Deliberately does not read news-ai.json, editorial.json, articles.json, or featured.json.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";
import {outOfScope} from "./content-policy.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const readJson=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8"));
const raw=readJson("data/news.json");
const source=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:Array.isArray(raw?.news)?raw.news:Array.isArray(raw?.articles)?raw.articles:[]);
if(!source.length) throw new Error("data/news.json contains no collected news items");

const valid=source.filter(n=>{
  if(!n||typeof n!=="object"||!String(n.id||"").trim()||!String(n.title||"").trim()||!/^https?:\/\//i.test(String(n.url||"").trim())) return false;
  return outOfScope({title:n.title,summary:n.summary,content:n.content})===null;
}).map(n=>({
  id:String(n.id),
  title:String(n.title||"").trim(),
  summary:String(n.summary||"").trim(),
  image:/^https:\/\//i.test(String(n.image||"").trim())?String(n.image).trim():"",
  source:String(n.source||"").trim(),
  published:String(n.published||""),
  url:String(n.url).trim(),
  topics:Array.isArray(n.topics)?[...new Set(n.topics.filter(t=>typeof t==="string"&&C.TOPICS.includes(t)))]:[]
})).sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0)||a.id.localeCompare(b.id));

const seen=new Set();
const items=valid.filter(n=>{if(seen.has(n.id))return false;seen.add(n.id);return true;});
if(!items.length) throw new Error("No eligible news items; refusing to publish an empty latest-news feed");
const inTopic=(n,topic)=>{
  if(topic===C.HOME)return true;
  if(topic==="economy-investment")return n.topics.includes("economy")||n.topics.includes("markets");
  if(topic==="technology-ai")return n.topics.includes("technology")||n.topics.includes("ai");
  return n.topics.includes(topic);
};
const topics={};
for(const topic of [C.HOME,...C.PAGE_TOPICS]) topics[topic]={items:items.filter(n=>inTopic(n,topic))};
const doc={version:1,generated:new Date().toISOString(),source:"data/news.json",config:{regularPerPage:C.REGULAR_PER_PAGE},topics};
const out=path.join(ROOT,"data/public/latest-news.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(doc)+"\n");
console.log("wrote data/public/latest-news.json from data/news.json only: "+items.length+" unique items across "+Object.keys(topics).length+" feeds");
