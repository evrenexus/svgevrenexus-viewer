// scripts/featured-lib.mjs — shared loading + linking for build and validate.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const isObj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
export const isUrl=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
export const sha256=s=>createHash("sha256").update(String(s)).digest("hex");

export function readJson(rel,required){
 const p=path.join(ROOT,rel);
 if(!fs.existsSync(p)){if(required)throw new Error(rel+": missing");return null}
 try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch(e){throw new Error(rel+": invalid JSON ("+e.message+")")}
}
export function entries(d){
 if(Array.isArray(d))return d.filter(isObj);
 if(!isObj(d))return [];
 for(const k of["items","articles"]){
  const v=d[k];
  if(Array.isArray(v))return v.filter(isObj);
  if(isObj(v))return Object.entries(v).filter(([,x])=>isObj(x)).map(([key,x])=>({__key:key,...x}));
 }
 return Object.entries(d).filter(([,x])=>isObj(x)).map(([key,x])=>({__key:key,...x}));
}
export function loadAll(){
 const news=entries(readJson("data/news.json",true));
 const aiRaw=readJson("data/news-ai.json",false);
 const aiItems=new Map();
 for(const v of entries(aiRaw)){
  if(!isObj(v))continue;
  const k=String(v.__key??v.id??v.item_id??"");
  if(k)aiItems.set(k,v);
 }
 const articles=entries(readJson("data/articles.json",true));
 let editorial=new Map(),editorialError=null;
 try{editorial=new Map(entries(readJson("data/editorial.json",false)).map(e=>[String(e.__key),e]))}
 catch(e){editorialError=String(e.message)}
 return{news,aiItems,articles,editorial,editorialError};
}
const SCHEMES={
 "news.id":n=>String(n.id??""),
 "sha256(news.id)":n=>sha256(n.id??"").slice(0,24),
 "sha256(news.url)":n=>sha256(n.url??"")
};
export const gid=o=>{const v=o?.group_id??o?.groupId??o?.group;return v==null||v===""?null:String(v)};
export function linkAll({news,aiItems,articles,editorial}){
 let best=null;
 if(C.LINK_SCHEME&&SCHEMES[C.LINK_SCHEME])best={name:C.LINK_SCHEME,fn:SCHEMES[C.LINK_SCHEME],matched:news.filter(n=>aiItems.has(SCHEMES[C.LINK_SCHEME](n))).length};
 else for(const[nm,fn]of Object.entries(SCHEMES)){const matched=news.filter(n=>aiItems.has(fn(n))).length;if(!best||matched>best.matched)best={name:nm,fn,matched}}
 const articleByGroup=new Map(),articleByOriginalId=new Map();
 for(const a of articles){
  const g=gid(a);if(g&&!articleByGroup.has(g))articleByGroup.set(g,a);
  if(a.original_news_id&&!articleByOriginalId.has(String(a.original_news_id)))articleByOriginalId.set(String(a.original_news_id),a);
 }
 const rows=[],activeIds=new Set();
 for(const n of news){
  const ai=aiItems.get(best.fn(n))??null,g=gid(ai)??gid(n);
  const article=(g?articleByGroup.get(g):null)??articleByOriginalId.get(String(n.id))??null;
  rows.push({n,ai,ed:editorial.get(String(n.id))??null,group:g??"id:"+n.id,article,activeNews:true});
  activeIds.add(String(n.id));
 }
 // Permanent generated articles survive the rolling news window and can remain Featured.
 // They are added only for Featured selection; regular news still comes only from news.json.
 for(const a of articles){
  if(a?.status!=="published"||!a.original_news_id||activeIds.has(String(a.original_news_id)))continue;
  const n={
   id:String(a.original_news_id),title:a.title||"",summary:a.summary||"",content:a.content||"",
   image:a.image||"",source:a.sources?.[0]?.name||"",url:a.sources?.[0]?.url||"",
   published:a.published_at||a.created_at||"",topics:Array.isArray(a.topics)?a.topics:[],
   importance_score:Number(a.importance_score)||0
  };
  rows.push({n,ai:null,ed:null,group:gid(a)??"article:"+a.id,article:a,activeNews:false});
 }
 return{rows,scheme:best.name,linked:best.matched};
}
export const isBlocked=r=>r.ai?.publishable===false||r.ed?.deleted===true||r.ed?.hidden===true;
export const imageOf=r=>[r.article?.image,r.ed?.image,r.n.image].find(isUrl)??"";
export const pinned=r=>r.ed?.important===true||r.ed?.featured===true;
export const ts=r=>Date.parse(r.n.published||r.article?.published_at||r.article?.created_at)||0;
export const inTopic=(r,topic)=>topic===C.HOME||(Array.isArray(r.n.topics)&&r.n.topics.includes(topic));
const num=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
export function scoreFor(r,topic){
 const a=r.ai;
 return num(a?.topic_importance?.[topic])??num(a?.importance_by_topic?.[topic])??num(a?.topic_scores?.[topic])??num(a?.importance)??num(r.n.importance_score)??num(r.article?.importance_score)??0;
}