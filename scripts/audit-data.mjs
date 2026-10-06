// Evren Nexus data audit v2: active news -> AI group -> permanent article group.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."), DATA=path.join(ROOT,"data");
const read=f=>JSON.parse(fs.readFileSync(path.join(DATA,f),"utf8"));
const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const entries=d=>{
  if(Array.isArray(d)) return d.filter(obj);
  if(!obj(d)) return [];
  for(const k of ["items","articles"]) {
    if(Array.isArray(d[k])) return d[k].filter(obj);
    if(obj(d[k])) return Object.entries(d[k]).map(([id,v])=>({__key:id,...(obj(v)?v:{})}));
  }
  return Object.entries(d).filter(([,v])=>obj(v)).map(([id,v])=>({__key:id,...v}));
};
const key=(o,...ks)=>{for(const k of ks) if(o?.[k]!=null&&String(o[k]).trim()) return String(o[k]).trim();return ""};
const url=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
const text=v=>typeof v==="string"&&v.trim().length>=200;
const news=entries(read("news.json")), ai=entries(read("news-ai.json")), articles=entries(read("articles.json")), editorial=entries(read("editorial.json"));
console.log("\n== SCHEMA news.json ==",Object.keys(news[0]||{}));
console.log("== SCHEMA news-ai.json ==",Object.keys(ai[0]||{}));
console.log("== SCHEMA articles.json ==",Object.keys(articles[0]||{}));
console.log("== SCHEMA editorial.json ==",Object.keys(editorial[0]||{}));

const aiByGroup=new Map(), artByGroup=new Map();
for(const a of ai){const g=key(a,"group_id","groupId","group");if(g&&!aiByGroup.has(g))aiByGroup.set(g,a);}
for(const a of articles){const g=key(a,"group_id","groupId","group");if(g&&!artByGroup.has(g))artByGroup.set(g,a);}

const linked=news.map(n=>{const g=key(n,"group_id","groupId","group");return {n,g,a:g?aiByGroup.get(g):null,ar:g?artByGroup.get(g):null};});
console.log("\n== LINKING ==");
console.log({
 active_news:news.length, ai_items:ai.length, ai_groups:aiByGroup.size,
 permanent_articles:articles.length, article_groups:artByGroup.size,
 news_with_ai:linked.filter(x=>x.a).length,
 news_with_published_article:linked.filter(x=>x.ar?.status==="published").length,
 news_with_article_image:linked.filter(x=>x.ar?.status==="published"&&url(x.ar.image)).length
});

const topics=[...new Set(news.flatMap(n=>Array.isArray(n.topics)?n.topics:[]))].sort(), rows={};
for(const t of topics){
  const s=linked.filter(x=>Array.isArray(x.n.topics)&&x.n.topics.includes(t));
  const withImage=s.filter(x=>url(x.ar?.image)||url(x.n.image));
  const withArticle=s.filter(x=>x.ar?.status==="published");
  const valid=s.filter(x=>x.ar?.status==="published"&&(url(x.ar?.image)||url(x.n.image)));
  const groups=new Set(valid.map(x=>x.g).filter(Boolean));
  rows[t]={total:s.length,image:withImage.length,article:withArticle.length,valid:valid.length,distinct_valid_groups:groups.size,enough_for_4:groups.size>=4};
}
console.log("\n== PER TOPIC ==");
console.table(rows);

const imp=linked.filter(x=>x.a?.important===true), validImp=imp.filter(x=>x.ar?.status==="published"&&(url(x.ar?.image)||url(x.n.image)));
console.log("\n== CURRENT IMPORTANT LINKING ==",{
 ai_important_active_news:imp.length,
 important_with_published_article:imp.filter(x=>x.ar?.status==="published").length,
 important_valid_with_image:validImp.length,
 distinct_valid_groups:new Set(validImp.map(x=>x.g).filter(Boolean)).size
});
console.log("\n== COUNTS ==",{
 news:news.length,ai_items:ai.length,articles:articles.length,editorial:editorial.length,
 article_published:articles.filter(a=>a.status==="published").length,
 article_images:articles.filter(a=>url(a.image)).length
});
