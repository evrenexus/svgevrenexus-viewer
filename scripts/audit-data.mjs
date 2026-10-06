// Evren Nexus data audit v3: news -> AI item_key -> group_id -> permanent article.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),DATA=path.join(ROOT,"data");
const read=f=>JSON.parse(fs.readFileSync(path.join(DATA,f),"utf8"));
const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const entries=d=>{if(Array.isArray(d))return d.filter(obj);if(!obj(d))return[];for(const k of["items","articles"]){if(Array.isArray(d[k]))return d[k].filter(obj);if(obj(d[k]))return Object.entries(d[k]).map(([id,v])=>({__key:id,...(obj(v)?v:{})}));}return Object.entries(d).filter(([,v])=>obj(v)).map(([id,v])=>({__key:id,...v}));};
const url=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
const itemKey=n=>crypto.createHash("sha256").update(String(n.id||n.url||n.title||"")).digest("hex").slice(0,24);
const news=entries(read("news.json")),ai=entries(read("news-ai.json")),articles=entries(read("articles.json")),editorial=entries(read("editorial.json"));
console.log("\n== SCHEMA news.json ==",Object.keys(news[0]||{}));
console.log("== SCHEMA news-ai.json ==",Object.keys(ai[0]||{}));
console.log("== SCHEMA articles.json ==",Object.keys(articles[0]||{}));
console.log("== SCHEMA editorial.json ==",Object.keys(editorial[0]||{}));
const aiByKey=new Map(ai.map(a=>[a.__key,a])),artByGroup=new Map();
for(const a of articles){const g=String(a.group_id||"");if(g&&!artByGroup.has(g))artByGroup.set(g,a);}
const linked=news.map(n=>{const k=itemKey(n),a=aiByKey.get(k),g=String(a?.group_id||"");return{n,k,a,g,ar:g?artByGroup.get(g):null};});
console.log("\n== LINKING ==");
console.log({active_news:news.length,ai_items:ai.length,ai_key_matches:linked.filter(x=>x.a).length,ai_groups:new Set(ai.map(a=>a.group_id).filter(Boolean)).size,permanent_articles:articles.length,article_groups:artByGroup.size,news_with_published_article:linked.filter(x=>x.ar?.status==="published").length,news_with_article_image:linked.filter(x=>x.ar?.status==="published"&&url(x.ar.image)).length});
const topics=[...new Set(news.flatMap(n=>Array.isArray(n.topics)?n.topics:[]))].sort(),rows={};
for(const t of topics){const s=linked.filter(x=>x.n.topics?.includes(t)),im=s.filter(x=>url(x.ar?.image)||url(x.n.image)),ac=s.filter(x=>x.ar?.status==="published"),v=s.filter(x=>x.ar?.status==="published"&&url(x.ar.image)),groups=new Set(v.map(x=>x.g).filter(Boolean));rows[t]={total:s.length,image:im.length,article:ac.length,valid_article_with_image:v.length,distinct_valid_groups:groups.size,enough_for_4:groups.size>=4};}
console.log("\n== PER TOPIC ==");console.table(rows);
const imp=linked.filter(x=>x.a?.important===true),validImp=imp.filter(x=>x.ar?.status==="published"&&url(x.ar.image));
console.log("\n== CURRENT IMPORTANT LINKING ==",{ai_important_active_news:imp.length,important_with_published_article:imp.filter(x=>x.ar?.status==="published").length,important_valid_with_image:validImp.length,distinct_valid_groups:new Set(validImp.map(x=>x.g).filter(Boolean)).size});
console.log("\n== COUNTS ==",{news:news.length,ai_items:ai.length,articles:articles.length,editorial:editorial.length,article_published:articles.filter(a=>a.status==="published").length,article_images:articles.filter(a=>url(a.image)).length});
