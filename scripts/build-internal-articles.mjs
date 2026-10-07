// scripts/build-internal-articles.mjs
// Creates permanent, non-AI republish articles from explicitly permitted news.
// Existing articles are never overwritten.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const DATA=path.join(ROOT,"data");

const readJson=(name, fallback)=> {
  const p=path.join(DATA,name);
  if(!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p,"utf8"));
};
const entries=(d)=>{
  if(Array.isArray(d)) return d.filter(x=>x&&typeof x==="object");
  if(!d||typeof d!=="object") return [];
  if(Array.isArray(d.items)) return d.items.filter(x=>x&&typeof x==="object");
  if(d.items&&typeof d.items==="object")
    return Object.entries(d.items).filter(([,x])=>x&&typeof x==="object").map(([k,x])=>({__key:k,...x}));
  return Object.entries(d).filter(([,x])=>x&&typeof x==="object").map(([k,x])=>({__key:k,...x}));
};

const newsRaw=readJson("news.json",{items:[]});
const aiRaw=readJson("news-ai.json",{items:{}});
const editorialRaw=readJson("editorial.json",{items:{}});
const articlesRaw=readJson("articles.json",{updated:new Date().toISOString(),schema:1,items:{}});

const news=entries(newsRaw);
const aiItems=aiRaw?.items&&typeof aiRaw.items==="object"&&!Array.isArray(aiRaw.items)?aiRaw.items:{};
const editorialItems=editorialRaw?.items&&typeof editorialRaw.items==="object"&&!Array.isArray(editorialRaw.items)?editorialRaw.items:{};
const articleItems=articlesRaw?.items&&typeof articlesRaw.items==="object"&&!Array.isArray(articlesRaw.items)?articlesRaw.items:{};

const sha256=s=>crypto.createHash("sha256").update(String(s)).digest("hex");
const aiSchemes=[n=>String(n.id||""),n=>sha256(n.id||""),n=>sha256(n.url||"")];
const aiKeyFor=new Map();
for(const key of Object.keys(aiItems)) aiKeyFor.set(key,key);
const articleIdFor=n=>"article-"+sha256(n.id).slice(0,16);
const isUrl=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
const stripHtml=(value)=>{
  let s=String(value??"");
  s=s.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/p\s*>/gi,"\n\n")
    .replace(/<[^>]+>/g," ");
  const entities={
    "&nbsp;":" ","&amp;":"&","&lt;":"<","&gt;":">","&quot;":"\"","&#39;":"'","&#x27;":"'"
  };
  s=s.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&#x27;/gi,m=>entities[m.toLowerCase()]??m);
  s=s.replace(/\u00a0/g," ").replace(/\r/g,"");
  return s.split("\n").map(x=>x.replace(/[ \t]+/g," ").trim()).filter(Boolean).join("\n\n").trim();
};
const clip=(s,n)=>s.length>n?s.slice(0,n-1).trim()+"…":s;
const blocked=(n)=>{
  const a=aiItems[n.id];
  const e=editorialItems[n.id];
  return a?.publishable===false || e?.deleted===true || e?.hidden===true;
};

const existingByGroup=new Map();
for(const a of Object.values(articleItems)){
  if(a?.group_id) existingByGroup.set(String(a.group_id),a);
}

let created=0, skippedExisting=0, skippedNoPermission=0, skippedNoContent=0, skippedNoImage=0, skippedBlocked=0;
const now=new Date().toISOString();

for(const n of news){
  if(!n?.id) continue;
  if(n.allow_internal_republish!==true){skippedNoPermission++;continue;}
  if(blocked(n)){skippedBlocked++;continue;}
  const clean=stripHtml(n.content);
  if(clean.length<300){skippedNoContent++;continue;}
  if(!isUrl(n.image)){skippedNoImage++;continue;}

  const aiKey=linkedAiKey(n), ai=aiKey?aiItems[aiKey]:{};
  const group=String(ai.group_id||n.group_id||"");
  if(group && existingByGroup.has(group)){skippedExisting++;continue;}

  const id=articleIdFor(n);
  if(articleItems[id]){skippedExisting++;continue;}

  const sourceUrl=isUrl(n.url)?n.url:"";
  const title=String(n.title||"").trim();
  if(!title||!sourceUrl) continue;

  articleItems[id]={
    id,
    title,
    summary:clip(stripHtml(n.summary||clean),300),
    content:clean,
    category:String(n.category||""),
    topics:Array.isArray(n.topics)?n.topics.slice():[],
    group_id:group||null,
    original_news_id:String(n.id),
    source_ids:Array.isArray(n.source_ids)?n.source_ids.slice():[],
    sources:[{name:String(n.source||"نامشخص"),url:sourceUrl}],
    image:String(n.image),
    importance_score:Number(n.importance_score)||Number(ai.importance_score)||0,
    created_at:now,
    updated_at:now,
    published_at:n.published||now,
    status:"published",
    ai_managed:false,
    generated_by:"internal-republish-v1",
    manual_locked:false
  };
  created++;
}

articlesRaw.updated=now;
articlesRaw.schema=articlesRaw.schema||1;
articlesRaw.items=articleItems;
fs.writeFileSync(path.join(DATA,"articles.json"),JSON.stringify(articlesRaw,null,2)+"\n");

console.log(JSON.stringify({
  created, total_articles:Object.keys(articleItems).length,
  skippedExisting, skippedNoPermission, skippedNoContent, skippedNoImage, skippedBlocked
},null,2));
