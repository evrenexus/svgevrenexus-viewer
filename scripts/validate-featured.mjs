import fs from "node:fs";
import * as C from "./featured-config.mjs";
import {readJson,loadAll,linkAll,isBlocked,imageUsable,inTopic,loadArticleResolver,isUrl} from "./featured-lib.mjs";
import {outOfScope} from "./content-policy.mjs";

const Article=loadArticleResolver();
const articlesDoc=readJson("data/articles.json",true);
const errors=[],warnings=[];
const err=m=>errors.push(m),warn=m=>warnings.push(m);

let doc;
try{doc=readJson("data/public/featured.json",true)}
catch(e){console.error("FAIL "+e.message);process.exit(1)}

const data=loadAll();
if(data.editorialError)warn("editorial.json ignored: "+data.editorialError);

const{rows,scheme,linked}=linkAll(data);
const byId=new Map(rows.map(r=>[String(r.n.id),r]));
const rate=data.news.length?linked/data.news.length:0;
if(rate<C.LINK_RATE_MIN)err("news->news-ai link rate "+(rate*100).toFixed(1)+"% ("+linked+"/"+data.news.length+") below "+(C.LINK_RATE_MIN*100)+"% using "+scheme);

// Permanent article integrity. Legacy AI/manual articles may contain old HTML;
// newly generated internal articles must always be plain text.
const seenArticleIds=new Set();
for(const a of data.articles){
 const id=String(a?.id||"");
 if(!id)err("articles.json contains article without id");
 if(seenArticleIds.has(id))err("duplicate article id: "+id);
 seenArticleIds.add(id);
 if(!String(a?.title||"").trim())err("article "+(id||"(no id)")+" has empty title");
 if(!String(a?.content||"").trim())err("article "+(id||"(no id)")+" has empty content");
 if(!isUrl(a?.image))err("article "+(id||"(no id)")+" has no valid image");
 const src=a?.sources?.[0];
 if(!src?.name||!isUrl(src.url))err("article "+(id||"(no id)")+" has no valid source");
 if(a?.status!=="published")warn("article "+id+" is not published");
 if(a?.generated_by==="internal-republish-v1"){
  if(/<\/?[a-z][^>]*>/i.test(String(a.content||"")))err("generated article "+id+" contains HTML");
  if(!a.original_news_id)err("generated article "+id+" has no original_news_id");
 }
}
console.log("article integrity: "+seenArticleIds.size+" articles checked");

const table={};
for(const topic of[C.HOME,...C.TOPICS]){
 const t=doc.topics?.[topic];
 if(!t){err("["+topic+"] missing in featured.json");continue}
 const F=Array.isArray(t.featured)?t.featured:[],R=Array.isArray(t.regular)?t.regular:[];
 const row={featured:F.length,regular:R.length,dupFeatured:0,dupRegular:0,overlap:0,noImage:0,noArticle:0,badLink:0,other:0};
 if(F.length>C.FEATURED_COUNT)err("["+topic+"] more than "+C.FEATURED_COUNT+" featured");

 const fIds=new Set(),fGroups=new Set();
 for(const f of F){
  const r=byId.get(String(f.id));
  if(!r){err("["+topic+"] featured "+f.id+" missing from news/articles");row.other++;continue}
  if(fIds.has(String(f.id))||fGroups.has(r.group)){err("["+topic+"] duplicate featured "+f.id);row.dupFeatured++}
  fIds.add(String(f.id));fGroups.add(r.group);
  if(!imageUsable(f.image)){err("["+topic+"] featured "+f.id+" has no usable image");row.noImage++;}
  const art=Article.find(articlesDoc,f.articleId);
  const res=Article.featuredReady(art,{imageUsable,outOfScope});
  if(!res.ok){err("["+topic+"] featured "+f.id+" article "+f.articleId+": "+res.problems.join("; "));row.noArticle++;}
  else if(/viewer\.html/i.test(f.articleUrl)){err("["+topic+"] featured "+f.id+" links to the reader");row.badLink++;}
  if(isBlocked(r))err("["+topic+"] featured "+f.id+" is blocked/unpublishable");
  if(!inTopic(r,topic))err("["+topic+"] featured "+f.id+" is not in topic");
 }

 const rIds=new Set(),rGroups=new Set();
 for(const x of R){
  const r=byId.get(String(x.id));
  if(!r){err("["+topic+"] regular "+x.id+" missing from news");continue}
  if(!r.activeNews){err("["+topic+"] regular "+x.id+" is not active news");row.other++}
  if(rIds.has(String(x.id))||rGroups.has(r.group)){err("["+topic+"] duplicate regular "+x.id);row.dupRegular++}
  rIds.add(String(x.id));rGroups.add(r.group);
  if(fIds.has(String(x.id))||fGroups.has(r.group)){err("["+topic+"] regular "+x.id+" repeats featured");row.overlap++}
  if(isBlocked(r)||!inTopic(r,topic))err("["+topic+"] invalid regular "+x.id),row.other++;
 }
 if(F.length<C.FEATURED_COUNT)warn("["+topic+"] only "+F.length+"/"+C.FEATURED_COUNT+" featured");
 if(R.length<C.REGULAR_PER_PAGE)warn("["+topic+"] only "+R.length+"/"+C.REGULAR_PER_PAGE+" regular");
 table[topic]=row;
}

console.log("link scheme "+scheme+": "+linked+"/"+data.news.length);
console.table(table);
warnings.forEach(w=>console.log("WARNING "+w));
errors.forEach(e=>console.log("ERROR "+e));

if(process.env.GITHUB_STEP_SUMMARY){
 let md="### Featured validation\nlink scheme: "+scheme+" ("+linked+"/"+data.news.length+")\n\n";
 md+="| topic | featured | regular | dupFeatured | dupRegular | overlap | noImage | noArticle | badLink | other |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n";
 for(const[t,r]of Object.entries(table))md+="| "+t+" | "+r.featured+" | "+r.regular+" | "+r.dupFeatured+" | "+r.dupRegular+" | "+r.overlap+" | "+r.noImage+" | "+r.noArticle+" | "+r.badLink+" | "+r.other+" |\n";
 md+="\nArticles checked: "+seenArticleIds.size+"\nErrors: "+errors.length+" | Warnings: "+warnings.length+"\n";
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(errors.length){console.error("\nFAILED: "+errors.length+" error(s)");process.exit(1)}
console.log("\nOK: no structural errors ("+warnings.length+" warning(s))");