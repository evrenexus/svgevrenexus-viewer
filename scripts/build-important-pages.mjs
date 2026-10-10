import fs from "node:fs";
import path from "node:path";
import * as C from "./featured-config.mjs";
import {ROOT,imageOf,imageUsable} from "./featured-lib.mjs";
import {outOfScope} from "./content-policy.mjs";

const OUT=path.join(ROOT,"articles");
const MAX_BODY_CHARS=4000;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const safeUrl=v=>{try{const u=new URL(String(v||""));return /^https?:$/i.test(u.protocol)?u.href:""}catch{return""}};
const rich=v=>String(v||"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<iframe[\s\S]*?<\/iframe>/gi,"");
const cleanArticleHtml=value=>{
  let s=rich(value)
    .replace(/(?:با پایین‌ترین کارمزد|با کمترین کارمزد)[^<\n]{0,180}(?:دیجی.?کالا|معامله امن)[^<\n]*/gi,"")
    .replace(/(?:سرمایه‌گذاری|معامله)\s+(?:طلا|طلا و نقره)[^<\n]{0,180}/gi,"");
  // Drop duplicated text blocks and scraped metadata/ad-only blocks.
  const seen=new Set();
  s=s.replace(/<(p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi,(whole,tag,inner)=>{
    const plain=inner.replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/\s+/g," ").trim();
    if(!plain)return "";
    if(/^(?:کد خبر|شنبه|یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه|جمعه)\s*[:：-]?\s*(?:\d|$)/i.test(plain))return "";
    const key=plain.replace(/[\s\p{P}\p{S}]/gu,"");
    if(key.length>25&&seen.has(key))return "";
    seen.add(key);
    return whole;
  });
  return s;
};
const clipHtml=(value,max=MAX_BODY_CHARS)=>{
  const tokens=cleanArticleHtml(value).match(/<[^>]*>|[^<]+/g)||[];
  const stack=[];let out="",count=0,truncated=false;
  for(const token of tokens){
    if(token[0]==="<"){
      const close=token.match(/^<\s*\/\s*([a-z0-9]+)/i);
      const open=token.match(/^<\s*([a-z0-9]+)/i);
      // Permit only simple formatting tags; remove attributes and active/embed elements.
      const tag=(close?.[1]||open?.[1]||"").toLowerCase();
      if(!["p","h2","h3","ul","ol","li","strong","em","b","i","br"].includes(tag))continue;
      out+=close?("</"+tag+">"):(tag==="br"?"<br>":"<"+tag+">");
      if(close){for(let i=stack.length-1;i>=0;i--){const found=stack.pop();if(found===tag)break;}}
      else if(tag!=="br")stack.push(tag);
      continue;
    }
    if(count+token.length<=max){out+=esc(token);count+=token.length;continue;}
    const remain=Math.max(0,max-count);if(remain)out+=esc(token.slice(0,remain));out+="…";truncated=true;break;
  }
  if(truncated)for(let i=stack.length-1;i>=0;i--)out+="</"+stack[i]+">";
  return out;
};
const page=a=>{
 const titleText=String(a.title||""), summaryText=String(a.summary||"");
 const title=esc(titleText), image=safeUrl(a.image), summary=esc(summaryText);
 const contentLimit=Math.max(0,MAX_BODY_CHARS-titleText.length-summaryText.length);
 const content=clipHtml(rich(a.content),contentLimit);
 const date=esc(new Date(a.updated_at||a.published_at||Date.now()).toLocaleString("fa-IR"));
 const source=a.sources&&a.sources[0]||{};
 const originalUrl=safeUrl(source.url);
 const readerUrl=originalUrl?"../viewer.html?url="+encodeURIComponent(originalUrl):"";
 return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Evren Nexus</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f2f3;color:#20272d;font-family:Tahoma,Arial,sans-serif}
#page{width:850px;max-width:100%;margin:auto;padding:123px 10px 25px;display:flex;gap:10px;direction:rtl}#content{width:610px;min-width:0;background:#fff;border:1px solid #dfe2e4;padding:18px}#sidebar-host{width:200px}
.back{display:inline-block;margin-bottom:14px;background:#202c35;color:#fff;text-decoration:none;padding:7px 12px;font-size:10px}h1{font-size:21px;line-height:1.9;margin:0 0 8px}.meta{font-size:9px;color:#8a9196;margin-bottom:15px;border-bottom:1px solid #edf0f1;padding-bottom:10px}.article-image{width:100%;max-height:360px;object-fit:cover;display:block;margin:0 0 16px}.summary{font-size:11px;line-height:2;color:#596168;background:#f7f8f8;border-right:3px solid #d9232e;padding:10px;margin-bottom:18px}.ai-notice{background:#c91520;color:#fff;padding:11px 13px;margin:0 0 18px;font-size:10px;line-height:2.15;border-radius:2px}.ai-notice a{color:#fff;text-decoration:underline;font-weight:bold}.long-read{margin-top:24px;padding:14px;background:#f8f2e8;border:1px solid #ead9bd;border-right:4px solid #b51f29;border-radius:3px;font-size:11px;line-height:2.1;color:#343b40}.long-read a{color:#b51f29;font-weight:bold;text-decoration:underline}.article-body{font-size:12px;line-height:2.25;color:#30383e}.article-body h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #e5e7e9;padding-bottom:5px}.article-body p{margin:0 0 13px}.article-body ul{padding-right:22px}.article-body li{margin-bottom:6px}.sources{margin-top:22px;padding-top:12px;border-top:1px solid #dfe2e4;font-size:9px;color:#697177}.sources a{color:#b51f29;text-decoration:none}@media(max-width:700px){#page{display:block;width:100%;padding:112px 8px 20px}#content{width:100%;padding:13px}#sidebar-host{display:none}h1{font-size:17px}.article-body{font-size:11px;line-height:2.2}}
</style></head><body><main id="page"><section id="content"><a class="back" href="../">بازگشت به خانه</a><article>
<h1>${title}</h1>${image?'<img class="article-image" src="'+esc(image)+'" alt="'+title+'" loading="eager" referrerpolicy="no-referrer">':''}
<div class="ai-notice">این مطلب توسط هوش مصنوعی Evren Nexus بر اساس گزارش‌های خبری موجود در وب بازنشر و تنظیم شده است.${readerUrl?` <a href="${esc(readerUrl)}">مشاهده خبر اصلی در خبرخوان Evren Nexus</a>`:""}</div>
<div class="meta">Evren Nexus • ${date}</div>${summary?'<div class="summary">'+summary+'</div>':''}
<div class="article-body">${content}</div>
${readerUrl?'<div class="long-read">این مطلب توسط هوش مصنوعی در سایت بازنشر و تنظیم شده است. برای خواندن متن کامل <a href="'+esc(readerUrl)+'">اینجا کلیک کنید</a>.</div>':''}
${source.name?'<div class="sources">منبع: '+(readerUrl?'<a href="'+esc(readerUrl)+'">'+esc(source.name)+'</a>':esc(source.name))+'</div>':''}
</article></section><aside id="sidebar-host"></aside></main>
<script src="../Evrenexus-sidebar.js?v=1"><\\/script><script src="../Evrenexus-header.js?v=20261007-10"><\\/script></body></html>`;
};

export function generateImportantPages(rows){
 fs.mkdirSync(OUT,{recursive:true});
 const selected=new Map();
 for(const r of rows){
   if(!r?.article||r.article.status!=="published"||!String(r.article.content||"").trim())continue;
   // Publication requires a positive AI decision, not a stale/manual editorial flag.
   if(r.ai?.important!==true||r.ai?.publishable!==true||r.ai?.political===true)continue;
   if(r.ed?.auto_important!==true)continue;
   if(outOfScope(r.n)!==null)continue;
   if(!Array.isArray(r.n?.topics)||!r.n.topics.some(t=>C.TOPICS.includes(t)))continue;
   const id=String(r.article.id??r.article.slug??r.article.__key??"");
   if(id)selected.set(id,r.article);
 }
 for(const [id,a] of selected){
   const file=path.join(OUT,encodeURIComponent(id)+".html");
   fs.writeFileSync(file,page(a),"utf8");
 }
 console.log("generated AI-approved important article pages: "+selected.size+" (body limit "+MAX_BODY_CHARS+" characters)");
 return selected.size;
}
