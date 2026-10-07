// scripts/check-images.mjs — probes candidate images before article/featured builds.
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadAll, linkAll, isBlocked } from "./featured-lib.mjs";

const TIMEOUT_MS=8000, CONCURRENCY=8, MAX_BYTES=262144, MAX_PROBES=600;
const MIN_W=400, MIN_H=225;
const ALLOW_HTTP=process.env.IMAGE_CHECK_ALLOW_HTTP==="1";
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export function dims(buf) {
  if(buf.length>24&&buf.readUInt32BE(0)===0x89504e47)return{type:"png",w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)};
  if(buf.length>10&&buf.toString("ascii",0,3)==="GIF")return{type:"gif",w:buf.readUInt16LE(6),h:buf.readUInt16LE(8)};
  if(buf.length>4&&buf[0]===0xff&&buf[1]===0xd8){
    let i=2;
    while(i+9<buf.length){
      if(buf[i]!==0xff){i++;continue}
      const m=buf[i+1];
      if(m===0xd8||m===0x01||(m>=0xd0&&m<=0xd7)){i+=2;continue}
      if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc)return{type:"jpeg",h:buf.readUInt16BE(i+5),w:buf.readUInt16BE(i+7)};
      i+=2+buf.readUInt16BE(i+2);
    }
    return{type:"jpeg",w:0,h:0};
  }
  if(buf.length>30&&buf.toString("ascii",0,4)==="RIFF"&&buf.toString("ascii",8,12)==="WEBP"){
    const f=buf.toString("ascii",12,16);
    if(f==="VP8 ")return{type:"webp",w:buf.readUInt16LE(26)&0x3fff,h:buf.readUInt16LE(28)&0x3fff};
    if(f==="VP8L"){const b=buf.readUInt32LE(21);return{type:"webp",w:(b&0x3fff)+1,h:((b>>14)&0x3fff)+1}};
    if(f==="VP8X")return{type:"webp",w:1+buf.readUIntLE(24,3),h:1+buf.readUIntLE(27,3)};
    return{type:"webp",w:0,h:0};
  }
  return null;
}
export async function probe(url){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{"User-Agent":UA,Accept:"image/avif,image/webp,image/*,*/*;q=0.8"},redirect:"follow",signal:ctl.signal});
    if(!res.ok)return{ok:false,reason:"http "+res.status};
    const ct=(res.headers.get("content-type")||"").toLowerCase(),chunks=[];let n=0,reader=res.body.getReader();
    while(n<MAX_BYTES){const{done,value}=await reader.read();if(done)break;chunks.push(Buffer.from(value));n+=value.length}
    try{await reader.cancel()}catch{}
    const d=dims(Buffer.concat(chunks));
    if(!d)return{ok:false,reason:"not an image (content-type "+(ct||"none")+")"};
    if(d.w&&(d.w<MIN_W||d.h<MIN_H))return{ok:false,reason:"too small "+d.w+"x"+d.h,w:d.w,h:d.h};
    return{ok:true,type:d.type,w:d.w,h:d.h};
  }catch(e){return{ok:false,reason:e.name==="AbortError"?"timeout":String(e.message).slice(0,80)}}finally{clearTimeout(timer)}
}
async function main(){
  const{rows}=linkAll(loadAll()),wanted=new Set();
  for(const r of rows){
    if(isBlocked(r))continue;
    for(const u of [r.article?.image,r.ed?.image,r.n.image]){
      if(typeof u==="string"&&(/^https:\/\//i.test(u.trim())||(ALLOW_HTTP&&/^http:\/\//i.test(u.trim()))))wanted.add(u.trim());
    }
  }
  const out=path.join(ROOT,"data","public","image-health.json");let prev={};
  try{prev=JSON.parse(fs.readFileSync(out,"utf8")).items||{}}catch{}
  const now=Date.now(),items={},todo=[];
  for(const u of [...wanted].slice(0,MAX_PROBES)){
    const p=prev[u],age=p?now-Date.parse(p.checked):Infinity;
    if(p&&age<(p.ok?86400000:10800000))items[u]=p;else todo.push(u);
  }
  let idx=0;
  await Promise.all(Array.from({length:CONCURRENCY},async()=>{
    while(idx<todo.length){const u=todo[idx++];items[u]={...(await probe(u)),checked:new Date().toISOString()}}
  }));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify({generated:new Date().toISOString(),items})+"\n");
  const reasons={};let ok=0;
  for(const v of Object.values(items)){if(v.ok)ok++;else{const k=v.reason.replace(/\d+x\d+/,"WxH");reasons[k]=(reasons[k]||0)+1}}
  console.log("image health: "+ok+"/"+Object.keys(items).length+" ok (probed "+todo.length+", cached "+(Object.keys(items).length-todo.length)+")");
  console.table(reasons);
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)await main();
