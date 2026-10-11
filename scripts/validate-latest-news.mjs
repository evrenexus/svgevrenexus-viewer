// Validate the independent latest-news feed without reading any AI/editorial artifacts.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as C from "./featured-config.mjs";
import {outOfScope} from "./content-policy.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8"));
const raw=read("data/news.json");
const source=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:Array.isArray(raw?.news)?raw.news:Array.isArray(raw?.articles)?raw.articles:[]);
const doc=read("data/public/latest-news.json");
const errors=[];
const err=s=>errors.push(s);
if(doc.source!=="data/news.json")err("source must be data/news.json");
if(!doc.topics||typeof doc.topics!=="object")err("topics object missing");
if(!Array.isArray(doc.topics?.[C.HOME]?.items)||doc.topics[C.HOME].items.length===0)err("home latest-news feed is empty");
const IRRELEVANT_HEADLINE_RE=/(?:قتل|قاتل|جنایی|قاچاقچی|سارق|سرقت|دستگیری|زندانی|زندان|چوگان|فوتبال|فوتسال|بسکتبال|والیبال|هندبال|تنیس|کشتی|سرمربی|بازیکن|لیگ برتر|مسابقه ورزشی|قهرمانی|جام جهانی|ورزشکار|ورزشی|مهدوی[‌ ]?کیا|گل[‌ ]?محمدی|تجارت رنج|استخوان کودکان|کتاب برتر حقوقی|خط نصر|خوشنویسی|معارف قرآنی|جشنواره گردشگری پیاز|صلح[‌ ]?یاران|همکاری‌های فرهنگی|پنجره هنر|نقدی به فیلم|داریوش عیاری|مسعود کیمیایی|مرد عنکبوتی|دل تورو|علیرضا خمسه|مریم سعادت|تماشاخانه سنگلج|خانه تئاتر|دوربین ۳۶۰ درجه صحنه جرم|اتصال لوله پلی‌اتیلن|کاهش سطح آب دریای خزر|کشف بیش از ۴ تن خاک طلا|چین و روسیه همچنان پشت سر قدرت‌های غربی|بلیط هواپیما چارتر|توزیع سه هزار وعده صبحانه|مدیرکل استاندارد.*فرهنگ‌سازی|پرسه علنی و راحت موش‌ها|شرکت ملی پست در تحقق سرشماری|بازنگری در سرفصل‌های آموزش رانندگی)/u;
const rawIds=new Set(source.filter(n=>n&&n.id&&n.title&&/^https?:\/\//i.test(String(n.url||""))&&Array.isArray(n.topics)&&n.topics.some(t=>C.TOPICS.includes(t))&&!IRRELEVANT_HEADLINE_RE.test(String(n.title||"").replace(/[\u200c\u200d\u200e\u200f]/g," "))&&outOfScope({title:n.title})===null).map(n=>String(n.id)));
const keys=[C.HOME,...C.PAGE_TOPICS];
for(const topic of keys){
  const list=doc.topics?.[topic]?.items;
  if(!Array.isArray(list)){err("["+topic+"] items array missing");continue;}
  const ids=new Set();let last=Infinity;
  for(const n of list){
    if(!n||!n.id||!n.title||!n.url)err("["+topic+"] item missing required fields");
    if(!rawIds.has(String(n.id)))err("["+topic+"] item not present in eligible raw news: "+n.id);
    if(ids.has(String(n.id)))err("["+topic+"] duplicate id: "+n.id);
    ids.add(String(n.id));
    const ts=Date.parse(n.published)||0;
    if(ts>last)err("["+topic+"] items are not newest-first");
    last=ts;
    for(const forbidden of ["ai","editorial","articleId","articleUrl","score","importance","important"])if(Object.prototype.hasOwnProperty.call(n,forbidden))err("["+topic+"] forbidden derived field "+forbidden+" on "+n.id);
    if(topic!==C.HOME){
      const tsArr=Array.isArray(n.topics)?n.topics:[];
      const match=topic==="economy-investment"?(tsArr.includes("economy")||tsArr.includes("markets")):topic==="technology-ai"?(tsArr.includes("technology")||tsArr.includes("ai")):tsArr.includes(topic);
      if(!match)err("["+topic+"] item does not match rule-based topics: "+n.id);
    }
  }
}
if(errors.length){errors.forEach(e=>console.error("ERROR "+e));process.exit(1);}
console.log("OK: latest-news.json is structurally valid and derived only from data/news.json.");
