import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const isObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
export const isUrl=v=>typeof v==="string"&&/^https?:\/\//i.test(v.trim());
export const sha256=s=>createHash("sha256").update(String(s)).digest("hex").slice(0,24);
export function readJson(rel,required=true){const p=path.join(ROOT,rel);if(!fs.existsSync(p)){if(required)throw Error(rel+": missing");return null}try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch(e){throw Error(rel+": invalid JSON ("+e.message+")")}}
export function entries(d){if(Array.isArray(d))return d.filter(isObj);if(!isObj(d))return[];for(const k of["items","articles"]){const v=d[k];if(Array.isArray(v))return v.filter(isObj);if(isObj(v))return Object.entries(v).map(([k,x])=>({__key:k,...x}))}return Object.entries(d).filter(([,x])=>isObj(x)).map(([k,x])=>({__key:k,...x}))}
export const gid=o=>{const v=o?.group_id??o?.groupId??o?.group;return v==null||v===""?null:String(v)};
export function loadAll(){const news=entries(readJson("data/news.json",true)),aiRaw=readJson("data/news-ai.json",true),articles=entries(readJson("data/articles.json",true));const aiItems=new Map();if(isObj(aiRaw?.items))for(const[k,v]of Object.entries(aiRaw.items))if(isObj(v))aiItems.set(k,v);let editorial=new Map(),editorialError=null;try{editorial=new Map(entries(readJson("data/editorial.json",true)).map(e=>[String(e.__key??e.id??""),e]))}catch(e){editorialError=String(e.message)}return{news,aiItems,articles,editorial,editorialError}}
const schemes={"news.id":n=>String(n.id??""),"sha256(news.id)":n=>sha256(n.id??""),"sha256(news.url)":n=>sha256(n.url??"")};
export function linkAll({news,aiItems,articles,editorial}){const fn=schemes[C.LINK_SCHEME];if(!fn)throw Error("Unknown LINK_SCHEME: "+C.LINK_SCHEME);const articleByGroup=new Map();for(const a of articles){const g=gid(a);if(g&&!articleByGroup.has(g))articleByGroup.set(g,a)}const rows=news.map(n=>{const ai=aiItems.get(fn(n))??null,g=gid(ai)??gid(n);return{n,ai,ed:editorial.get(String(n.id))??null,group:g??"id:"+n.id,article:g?articleByGroup.get(g)??null:null}});return{rows,scheme:C.LINK_SCHEME,linked:rows.filter(r=>r.ai).length}}
export const isBlocked=r=>r.ai?.publishable===false||r.ed?.deleted===true||r.ed?.hidden===true;
export const imageOf=r=>[r.article?.image,r.ed?.image,r.ai?.image,r.n.image].find(isUrl)??"";
export const pinned=r=>r.ed?.important===true||r.ed?.featured===true;
export const ts=r=>Date.parse(r.n.published)||0;
export const inTopic=(r,t)=>t===C.HOME||(Array.isArray(r.n.topics)&&r.n.topics.includes(t));
const num=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
export const scoreFor=(r,t)=>num(r.ai?.topic_importance?.[t])??num(r.ai?.importance_by_topic?.[t])??num(r.ai?.topic_scores?.[t])??num(r.ai?.importance)??num(r.ai?.importance_score)??num(r.n.importance_score)??0;