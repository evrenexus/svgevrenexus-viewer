// Build the "آخرین مطالب" feed from collected, rule-classified news,
// excluding items explicitly hidden by the editorial panel.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";
import {outOfScope} from "./content-policy.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const readJson=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8"));
const raw=readJson("data/news.json");
const editorialData=readJson("data/editorial.json");
if(!editorialData||typeof editorialData!=="object"||!editorialData.items||typeof editorialData.items!=="object"||Array.isArray(editorialData.items)) throw new Error("data/editorial.json has an invalid items object");
const editorial=editorialData.items;
const EDITOR_TOPICS=["economy-investment","crypto","currency-gold","real-estate","auto","technology-ai","health"];
const source=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:Array.isArray(raw?.news)?raw.news:Array.isArray(raw?.articles)?raw.articles:[]);
if(!source.length) throw new Error("data/news.json contains no collected news items");

function correctKnownHeadline(value){
  let title=String(value||"").trim();
  if(title.includes("طاعون")&&title.includes("ماسک")&&title.includes("منقاردار")) title=title.replaceAll("پزشکیان","پزشکان");
  return title;
}
function titleKey(value){
  return correctKnownHeadline(value).toLowerCase()
    .replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[‌\u200c\u200d\u200e\u200f]/g," ")
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
}

const IRRELEVANT_HEADLINE_RE=/(?:قتل|قاتل|جنایی|قاچاقچی|سارق|سرقت|دستگیری|زندانی|زندان|چوگان|فوتبال|فوتسال|بسکتبال|والیبال|هندبال|تنیس|کشتی|سرمربی|بازیکن|لیگ برتر|مسابقه ورزشی|قهرمانی|جام جهانی|ورزشکار|ورزشی|مهدوی[‌ ]?کیا|گل[‌ ]?محمدی|تجارت رنج|استخوان کودکان|کتاب برتر حقوقی|خط نصر|خوشنویسی|معارف قرآنی|جشنواره گردشگری پیاز|صلح[‌ ]?یاران|همکاری[‌ ]های فرهنگی|پنجره هنر|نقدی به فیلم|داریوش عیاری|مسعود کیمیایی|مرد عنکبوتی|دل تورو|علیرضا خمسه|مریم سعادت|تماشاخانه سنگلج|خانه تئاتر|دوربین ۳۶۰ درجه صحنه جرم|اتصال لوله پلی[‌ ]?اتیلن|کاهش سطح آب دریای خزر|کشف بیش از ۴ تن خاک طلا|چین و روسیه همچنان پشت سر قدرت‌های غربی|بلیط هواپیما چارتر|توزیع سه هزار وعده صبحانه|مدیرکل استاندارد.*فرهنگ‌سازی|پرسه علنی و راحت موش‌ها|شرکت ملی پست در تحقق سرشماری|بازنگری در سرفصل‌های آموزش رانندگی|میرسلیم|تصویر میرسلیم سوار بر تویوتا)/u;
const valid=source.filter(n=>{
  if(!n||typeof n!=="object"||!String(n.id||"").trim()||!String(n.title||"").trim()||!/^https?:\/\//i.test(String(n.url||"").trim())) return false;
  const editorialState=editorial[String(n.id)]||{};
  if(editorialState.deleted===true||editorialState.hidden===true||editorialState.reject===true) return false;
  const autoTopics=Array.isArray(n.topics)?n.topics.filter(t=>C.TOPICS.includes(t)):[];
  const manualTopics=editorialState.topics_manual===true&&Array.isArray(editorialState.topics)
    ? [...new Set(editorialState.topics.filter(t=>EDITOR_TOPICS.includes(t)))]
    : null;
  const topics=manualTopics===null?autoTopics:manualTopics;
  if((!topics.length&&manualTopics===null)||IRRELEVANT_HEADLINE_RE.test(String(n.title||"").replace(/[\u200c\u200d\u200e\u200f]/g," "))) return false;
  return outOfScope({title:n.title})===null;
}).map(n=>({
  id:String(n.id),
  title:correctKnownHeadline(n.title),
  summary:String(n.summary||"").trim(),
  image:/^https:\/\//i.test(String(n.image||"").trim())?String(n.image).trim():"",
  source:String(n.source||"").trim(),
  published:String(n.published||""),
  url:String(n.url).trim(),
  topics:(()=>{const s=editorial[String(n.id)]||{};if(s.topics_manual===true&&Array.isArray(s.topics))return [...new Set(s.topics.filter(t=>typeof t==="string"&&EDITOR_TOPICS.includes(t)))];return Array.isArray(n.topics)?[...new Set(n.topics.filter(t=>typeof t==="string"&&C.TOPICS.includes(t)))]:[]})()
})).sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0)||a.id.localeCompare(b.id));

const seen=new Set(), seenTitles=new Set();
const items=valid.filter(n=>{
  const key=titleKey(n.title);
  if(seen.has(n.id)||(key&&seenTitles.has(key)))return false;
  seen.add(n.id);
  if(key)seenTitles.add(key);
  return true;
});
if(!items.length) throw new Error("No eligible news items; refusing to publish an empty latest-news feed");
const inTopic=(n,topic)=>{
  if(topic===C.HOME)return true;
  if(n.topics.includes(topic))return true;
  if(topic==="economy-investment")return n.topics.includes("economy")||n.topics.includes("markets");
  if(topic==="technology-ai")return n.topics.includes("technology")||n.topics.includes("ai");
  return n.topics.includes(topic);
};
const topics={};
for(const topic of [C.HOME,...C.PAGE_TOPICS]) topics[topic]={items:items.filter(n=>inTopic(n,topic))};
const doc={version:1,generated:new Date().toISOString(),source:"data/news.json",config:{regularPerPage:C.REGULAR_PER_PAGE},topics};
const out=path.join(ROOT,"data/public/latest-news.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(doc)+"\n");
console.log("wrote data/public/latest-news.json from data/news.json only: "+items.length+" unique items across "+Object.keys(topics).length+" feeds");
