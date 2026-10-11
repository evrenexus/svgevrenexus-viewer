// Build the "آخرین مطالب" feed exclusively from collected, rule-classified news.
// Deliberately does not read news-ai.json, editorial.json, articles.json, or featured.json.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";
import {outOfScope} from "./content-policy.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const readJson=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8"));
const raw=readJson("data/news.json");
const source=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:Array.isArray(raw?.news)?raw.news:Array.isArray(raw?.articles)?raw.articles:[]);
if(!source.length) throw new Error("data/news.json contains no collected news items");

const IRRELEVANT_HEADLINE_RE=/(?:قتل|قاتل|جنایی|قاچاقچی|سارق|سرقت|دستگیری|زندانی|زندان|چوگان|فوتبال|فوتسال|بسکتبال|والیبال|هندبال|تنیس|کشتی|سرمربی|بازیکن|لیگ برتر|مسابقه ورزشی|قهرمانی|جام جهانی|ورزشکار|ورزشی|مهدوی[‌ ]?کیا|گل[‌ ]?محمدی|تجارت رنج|استخوان کودکان|کتاب برتر حقوقی|خط نصر|خوشنویسی|معارف قرآنی|جشنواره گردشگری پیاز|صلح[‌ ]?یاران|همکاری[‌ ]های فرهنگی|پنجره هنر|نقدی به فیلم|داریوش عیاری|مسعود کیمیایی|مرد عنکبوتی|دل تورو|علیرضا خمسه|مریم سعادت|تماشاخانه سنگلج|خانه تئاتر|دوربین ۳۶۰ درجه صحنه جرم|اتصال لوله پلی[‌ ]?اتیلن|کاهش سطح آب دریای خزر|کشف بیش از ۴ تن خاک طلا|چین و روسیه همچنان پشت سر قدرت‌های غربی|بلیط هواپیما چارتر|توزیع سه هزار وعده صبحانه|مدیرکل استاندارد.*فرهنگ‌سازی|پرسه علنی و راحت موش‌ها|شرکت ملی پست در تحقق سرشماری|بازنگری در سرفصل‌های آموزش رانندگی|میرسلیم|تصویر میرسلیم سوار بر تویوتا)/u;
const valid=source.filter(n=>{
  if(!n||typeof n!=="object"||!String(n.id||"").trim()||!String(n.title||"").trim()||!/^https?:\/\//i.test(String(n.url||"").trim())) return false;
  const topics=Array.isArray(n.topics)?n.topics.filter(t=>C.TOPICS.includes(t)):[];
  if(!topics.length||IRRELEVANT_HEADLINE_RE.test(String(n.title||"").replace(/[\u200c\u200d\u200e\u200f]/g," "))) return false;
  return outOfScope({title:n.title})===null;
}).map(n=>({
  id:String(n.id),
  title:String(n.title||"").trim(),
  summary:String(n.summary||"").trim(),
  image:/^https:\/\//i.test(String(n.image||"").trim())?String(n.image).trim():"",
  source:String(n.source||"").trim(),
  published:String(n.published||""),
  url:String(n.url).trim(),
  topics:Array.isArray(n.topics)?[...new Set(n.topics.filter(t=>typeof t==="string"&&C.TOPICS.includes(t)))]:[]
})).sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0)||a.id.localeCompare(b.id));

const seen=new Set();
const items=valid.filter(n=>{if(seen.has(n.id))return false;seen.add(n.id);return true;});
if(!items.length) throw new Error("No eligible news items; refusing to publish an empty latest-news feed");
const inTopic=(n,topic)=>{
  if(topic===C.HOME)return true;
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
