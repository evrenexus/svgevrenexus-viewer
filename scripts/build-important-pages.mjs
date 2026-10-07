import fs from "node:fs";
import path from "node:path";
import * as C from "./featured-config.mjs";
import {ROOT,imageOf,imageUsable} from "./featured-lib.mjs";

const OUT=path.join(ROOT,"articles");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const safeUrl=v=>{try{const u=new URL(String(v||""));return /^https?:$/i.test(u.protocol)?u.href:""}catch{return""}};
const rich=v=>{
 const box=String(v||"").replace(/<script[\s\S]*?<\/script>/gi,"");
 return box;
};
const page=a=>{
 const title=esc(a.title), image=safeUrl(a.image), summary=esc(a.summary), content=rich(a.content);
 const date=esc(new Date(a.updated_at||a.published_at||Date.now()).toLocaleString("fa-IR"));
 const source=a.sources&&a.sources[0]||{};
 return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Evren Nexus</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f2f3;color:#20272d;font-family:Tahoma,Arial,sans-serif}
#page{width:850px;max-width:100%;margin:auto;padding:123px 10px 25px;display:flex;gap:10px;direction:rtl}#content{width:610px;min-width:0;background:#fff;border:1px solid #dfe2e4;padding:18px}#sidebar-host{width:200px}
.back{display:inline-block;margin-bottom:14px;background:#202c35;color:#fff;text-decoration:none;padding:7px 12px;font-size:10px}h1{font-size:21px;line-height:1.9;margin:0 0 8px}.meta{font-size:9px;color:#8a9196;margin-bottom:15px;border-bottom:1px solid #edf0f1;padding-bottom:10px}.article-image{width:100%;max-height:360px;object-fit:cover;display:block;margin:0 0 16px}.summary{font-size:11px;line-height:2;color:#596168;background:#f7f8f8;border-right:3px solid #d9232e;padding:10px;margin-bottom:18px}.ai-notice{background:#c91520;color:#fff;padding:11px 13px;margin:0 0 18px;font-size:10px;line-height:2.15;border-radius:2px}.article-body{font-size:12px;line-height:2.25;color:#30383e}.article-body h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #e5e7e9;padding-bottom:5px}.article-body p{margin:0 0 13px}.article-body ul{padding-right:22px}.article-body li{margin-bottom:6px}.sources{margin-top:22px;padding-top:12px;border-top:1px solid #dfe2e4;font-size:9px;color:#697177}.sources a{color:#b51f29;text-decoration:none}@media(max-width:700px){#page{display:block;width:100%;padding:112px 8px 20px}#content{width:100%;padding:13px}#sidebar-host{display:none}h1{font-size:17px}.article-body{font-size:11px;line-height:2.2}}
</style></head><body><main id="page"><section id="content"><a class="back" href="../">بازگشت به خانه</a><article>
<h1>${title}</h1>${image?'<img class="article-image" src="'+esc(image)+'" alt="'+title+'" loading="eager" referrerpolicy="no-referrer">':''}
<div class="ai-notice">این مطلب توسط هوش مصنوعی Evren Nexus بر اساس گزارش‌های خبری موجود در وب بازنشر و تنظیم شده است.</div>
<div class="meta">Evren Nexus • ${date}</div>${summary?'<div class="summary">'+summary+'</div>':''}
<div class="article-body">${content}</div>
${source.name?'<div class="sources">منبع: <a href="'+esc(safeUrl(source.url))+'" target="_blank" rel="noopener noreferrer">'+esc(source.name)+'</a></div>':''}
</article></section><aside id="sidebar-host"></aside></main>
<script src="../Evrenexus-sidebar.js?v=1"><\/script><script src="../Evrenexus-header.js?v=20261007-10"><\/script></body></html>`;
};

export function generateImportantPages(rows){
 fs.mkdirSync(OUT,{recursive:true});
 const selected=new Map();
 for(const r of rows){
   if(!r?.article||r.article.status!=="published")continue;
   if(!imageOf(r)||!r.article.content)continue;
   if(!(r.ed?.auto_important===true||r.ed?.important===true||r.ed?.featured===true))continue;
   const id=String(r.article.id??r.article.slug??r.article.__key??"");
   if(id)selected.set(id,r.article);
 }
 for(const [id,a] of selected){
   const file=path.join(OUT,encodeURIComponent(id)+".html");
   fs.writeFileSync(file,page(a),"utf8");
 }
 console.log("generated important article pages: "+selected.size);
 return selected.size;
}
