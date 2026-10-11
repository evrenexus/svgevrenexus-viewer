import fs from "node:fs";
import path from "node:path";
import * as C from "./featured-config.mjs";
import{ROOT,loadAll,linkAll,isBlocked,imageOf,imageUsable,pinned,ts,inTopic,scoreFor,loadArticleResolver}from "./featured-lib.mjs";
import{outOfScope}from "./content-policy.mjs";
import{generateImportantPages}from "./build-important-pages.mjs";
const data=loadAll();const Article=loadArticleResolver();if(data.editorialError)console.warn("WARNING editorial.json ignored: "+data.editorialError);
const{rows,scheme,linked}=linkAll(data);console.log("link scheme: "+scheme+" | linked "+linked+"/"+rows.length+" news to news-ai");
// Build permanent pages before generating editorial boxes and sliders.
const generatedImportantArticleIds=generateImportantPages(rows);
console.log("important-page prerequisite completed: "+generatedImportantArticleIds.size);
const clip=(s,n)=>{s=String(s??"").trim();return s.length>n?s.slice(0,n-1)+"…":s};
const compact=(r,t)=>({id:String(r.n.id),title:String((r.ed?.title&&String(r.ed.title).trim())||r.article?.title||r.n.title||"").trim(),summary:clip(r.ed?.summary??r.article?.summary??r.n.summary,200),image:imageOf(r),source:r.n.source??"",published:r.n.published??"",selectedAt:String(r.article?.created_at??r.article?.published_at??r.n.first_seen_at??r.n.published??""),url:r.n.url??"",articleId:r.article?String(r.article.id??r.article.slug??r.article.__key):"",articleUrl:r.article?C.articleUrl(r.article):"",group:r.group,topics:Array.isArray(r.n.topics)?r.n.topics:[],score:scoreFor(r,t)});
const previousFeaturedDoc=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,"data/public/featured.json"),"utf8"))}catch{return {}}})();
const previouslyImportantIds=(()=>{const ids=new Set();for(const topic of Object.values(previousFeaturedDoc.topics||{}))for(const item of (topic.important||[]))if(item?.articleId)ids.add(String(item.articleId));return ids})();
const PROMOTION_WINDOW_MS=2*60*60*1000;
const aiSelectionWindow=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,"data/news-ai.json"),"utf8"))}catch{return {}}})();
const manualSelection=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,"data/manual-important-selection.json"),"utf8"))}catch{return {}}})();
const parsedWindowEnd=Date.parse(aiSelectionWindow.selection_window_end||aiSelectionWindow.updated||"");
const promotionWindowStart=Number.isFinite(parsedWindowEnd)?parsedWindowEnd:Date.now();
const parsedWindowStart=Date.parse(aiSelectionWindow.selection_window_start||"");
const promotionWindow=new Date(promotionWindowStart).toISOString();
const completedWindowStart=Number.isFinite(parsedWindowStart)?parsedWindowStart:promotionWindowStart-PROMOTION_WINDOW_MS;

const wasPreviouslyImportant=r=>previouslyImportantIds.has(String(r?.article?.id??r?.article?.slug??r?.article?.__key??""));
const isImportantCandidate=r=>wasPreviouslyImportant(r)||(r.ai?.important===true&&r.ai?.publishable===true&&r.ai?.political!==true&&Array.isArray(r.ai?.important_topics)&&r.ed?.auto_important===true);
const hasPermanentPage=r=>!!r?.article&&!!C.articleUrl(r.article)&&generatedImportantArticleIds.has(String(r.article.id??r.article.slug??r.article.__key??""))&&fs.existsSync(path.join(ROOT,C.articleUrl(r.article)));
const promotionReady=r=>!isBlocked(r)&&isImportantCandidate(r)&&r.ai?.publishable===true&&r.ai?.political!==true&&r.article&&r.article.status==="published"&&r.article.ai_managed===true&&!!imageOf(r)&&hasPermanentPage(r)&&Article.featuredReady(r.article,{imageUsable,outOfScope}).ok;
let promotionRows=[];
let selectionSource="ai";
const manualWindowMatches=String(manualSelection.window_start||"")===new Date(completedWindowStart).toISOString()&&String(manualSelection.window_end||"")===promotionWindow;
if(manualWindowMatches&&Array.isArray(manualSelection.news_ids)&&manualSelection.news_ids.length===C.FEATURED_COUNT){
 const manualRows=manualSelection.news_ids.map(id=>rows.find(r=>String(r.n.id)===String(id)&&promotionReady(r))).filter(Boolean);
 const manualGroups=new Set(manualRows.map(r=>r.group));
 if(manualRows.length===C.FEATURED_COUNT&&manualGroups.size===C.FEATURED_COUNT){
  promotionRows=manualRows;
  selectionSource=String(manualSelection.source||"manual-fallback");
 }
}
const storedWindow=String(previousFeaturedDoc.promotionWindow||"");
const storedIds=Array.isArray(previousFeaturedDoc.promotionSelection?.newsIds)?previousFeaturedDoc.promotionSelection.newsIds.map(String):[];
if(!promotionRows.length&&storedWindow===promotionWindow&&storedIds.length){
 const wanted=new Set(storedIds);
 promotionRows=rows.filter(r=>wanted.has(String(r.n.id))&&promotionReady(r));
 selectionSource="stored-selection";
}else if(!promotionRows.length){
 const candidates=rows.filter(r=>{
   if(!promotionReady(r))return false;
   const firstSeen=Date.parse(r.n.first_seen_at||"");
   return Number.isFinite(firstSeen)&&firstSeen>=completedWindowStart&&firstSeen<promotionWindowStart;
 });
 candidates.sort((a,b)=>(scoreFor(b,C.HOME)-scoreFor(a,C.HOME))||(ts(b)-ts(a)));
 const groups=new Set();
 for(const r of candidates){if(groups.has(r.group))continue;promotionRows.push(r);groups.add(r.group);if(promotionRows.length>=C.FEATURED_COUNT)break;}
 selectionSource="ai-or-local-fallback";
}
if(!promotionRows.length&&storedIds.length){
 const wanted=new Set(storedIds);
 const preserved=storedIds.map(id=>rows.find(r=>String(r.n.id)===id&&promotionReady(r))).filter(Boolean);
 const groups=new Set(preserved.map(r=>r.group));
 if(preserved.length===C.FEATURED_COUNT&&groups.size===C.FEATURED_COUNT){
  promotionRows=preserved;
  selectionSource="previous-selection-preserved";
 }
}
const promotionNewsIds=promotionRows.map(r=>String(r.n.id));
console.log("two-hour promotion window "+new Date(completedWindowStart).toISOString()+" to "+promotionWindow+" | selected "+promotionRows.length+" / "+C.FEATURED_COUNT+" | source "+selectionSource);
const aiTopicMatch=(r,topic)=>{const ts=Array.isArray(r.ai?.important_topics)?r.ai.important_topics:[];if(topic===C.HOME)return ts.length===0;if(topic==="economy-investment")return ts.includes("economy")||ts.includes("markets");if(topic==="technology-ai")return ts.includes("technology")||ts.includes("ai");return ts.includes(topic)};
const aiImportantForTopic=(r,topic)=>{const ts=Array.isArray(r.ai?.important_topics)?r.ai.important_topics:[];if(topic===C.HOME)return ts.length>0;if(topic==="economy-investment")return ts.includes("economy")||ts.includes("markets");if(topic==="technology-ai")return ts.includes("technology")||ts.includes("ai");return ts.includes(topic)};
function pickFeatured(topic){const picked=promotionRows.filter(r=>inTopic(r,topic)).sort((a,b)=>(scoreFor(b,topic)-scoreFor(a,topic))||(ts(b)-ts(a)));return{picked,poolSize:picked.length}}
function repBetter(a,b){const ra=a.ai?.representative===true,rb=b.ai?.representative===true;return ra!==rb?ra:ts(a)>ts(b)}
function pickRegular(topic,featured){const fg=new Set(featured.map(r=>r.group)),fi=new Set(featured.map(r=>String(r.n.id))),best=new Map();for(const r of rows){if(!r.activeNews||!inTopic(r,topic)||isBlocked(r)||fg.has(r.group)||fi.has(String(r.n.id)))continue;const cur=best.get(r.group);if(!cur||repBetter(r,cur))best.set(r.group,r)}return[...best.values()].sort((a,b)=>ts(b)-ts(a)).slice(0,C.REGULAR_MAX)}
const doc={version:3,generated:new Date().toISOString(),linkScheme:scheme,promotionWindow,promotionSelection:{newsIds:promotionNewsIds,count:promotionNewsIds.length,windowStart:new Date(completedWindowStart).toISOString(),windowEnd:promotionWindow,source:selectionSource},config:{featuredCount:C.FEATURED_COUNT,regularPerPage:C.REGULAR_PER_PAGE},topics:{}};
for(const topic of[C.HOME,...C.PAGE_TOPICS]){const{picked,poolSize}=pickFeatured(topic),regular=pickRegular(topic,picked);const importantCandidates=rows.filter(r=>!isBlocked(r)&&isImportantCandidate(r)&&hasPermanentPage(r)&&inTopic(r,topic));const importantRanked=importantCandidates.slice().sort((a,b)=>(scoreFor(b,topic)-scoreFor(a,topic))||(ts(b)-ts(a)));const importantGroups=new Set(importantRanked.map(r=>r.group));const importantCandidatesAll=[...importantRanked,...rows.filter(r=>!isBlocked(r)&&hasPermanentPage(r)&&inTopic(r,topic)&&!importantGroups.has(r.group)).sort((a,b)=>(scoreFor(b,topic)-scoreFor(a,topic))||(ts(b)-ts(a)))];const uniqueImportant=new Map();for(const r of importantCandidatesAll){const aid=String(r?.article?.id??r?.article?.slug??r?.article?.__key??r?.group??r?.n?.id??"");if(aid&&!uniqueImportant.has(aid))uniqueImportant.set(aid,r)}const important=[...uniqueImportant.values()].sort((a,b)=>Number(isImportantCandidate(b))-Number(isImportantCandidate(a))||(scoreFor(b,topic)-scoreFor(a,topic))||(ts(b)-ts(a)));doc.topics[topic]={featured:picked.map(r=>compact(r,topic)),important:important.map(r=>compact(r,topic)),regular:regular.map(r=>compact(r,topic)),stats:{eligibleFeaturedPool:poolSize,featured:picked.length,important:important.length,regular:regular.length}}}
const seen=new Set(rows.flatMap(r=>Array.isArray(r.n.topics)?r.n.topics:[])),missing=C.TOPICS.filter(t=>!seen.has(t)),unknown=[...seen].filter(t=>!C.TOPICS.includes(t));if(missing.length)console.warn("WARNING configured topics with no news: "+missing.join(", "));if(unknown.length)console.warn("WARNING topics not in config: "+unknown.join(", "));
const out=path.join(ROOT,"data/public/featured.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(doc)+"\n");console.log("wrote "+path.relative(ROOT,out)+" ("+fs.statSync(out).size+" bytes)");