import { loadAll, linkAll, isBlocked, isUrl, imageOf, inTopic } from "./featured-lib.mjs";
import * as C from "./featured-config.mjs";
const MIN_CONTENT=300; const {rows}=linkAll(loadAll());
const body=r=>typeof r.n.content==="string"&&r.n.content.trim().length>=MIN_CONTENT;
const canGenerate=r=>!r.article&&r.n.allow_internal_republish===true&&body(r)&&isUrl(r.n.image);
const perTopic={};
for(const topic of [C.HOME,...C.TOPICS]){
 const pool=rows.filter(r=>inTopic(r,topic)&&!isBlocked(r));
 const have=new Set(pool.filter(r=>r.article&&imageOf(r)).map(r=>r.group));
 const gen=new Set(pool.filter(canGenerate).map(r=>r.group).filter(g=>!have.has(g)));
 const reachable=Math.min(C.FEATURED_COUNT,have.size+gen.size);
 perTopic[topic]={news:pool.length,groupsWithArticleNow:have.size,groupsGeneratable:gen.size,featuredNow:Math.min(C.FEATURED_COUNT,have.size),featuredIfGenerated:reachable,stillShort:C.FEATURED_COUNT-reachable};
}
console.log("\n== PER TOPIC =="); console.table(perTopic);
const perSource={};
for(const r of rows){const s=r.n.source??"(unknown)",x=perSource[s]??=( {news:0,republishAllowed:0,contentOk:0,imageOk:0,generatable:0,hasArticle:0});x.news++;if(r.n.allow_internal_republish===true)x.republishAllowed++;if(body(r))x.contentOk++;if(isUrl(r.n.image))x.imageOk++;if(canGenerate(r))x.generatable++;if(r.article)x.hasArticle++;}
console.log("\n== PER SOURCE =="); console.table(perSource);