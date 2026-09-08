import {inRightBank} from "./region";
import type {Report,ReportKind} from "./routing";

export type SourceId="bicycle"|"dogs"|"toilets";
export type SourceData={id:SourceId;name:string;url:string;fetched_at:string;updated_at?:string;features:Report[];status:"live"|"cache"|"snapshot"|"unavailable";error?:string;skipped:number};
export const CITY_SOURCES = {
 bicycle:{name:"КМДА · велосипедна мережа",url:"https://data.kyivcity.gov.ua/dataset/velosypedna-merezha-kyieva-dep-transport"},
 dogs:{name:"КМДА · вигул і догляд за тваринами",url:"https://data.kyivcity.gov.ua/dataset/dani-pro-mistseznakhodzhennia-zon-dlia-vyhulu-domashnikh-tvaryn-dep-ecology"},
 toilets:{name:"ІАС «Майно» · громадські вбиральні",url:"https://gisserver.kyivcity.gov.ua/mayno/rest/services/KYIV_API/WC/MapServer/0"}
} as const;
const API="https://gisserver.kyivcity.gov.ua/mayno/rest/services/KYIV_API/";
const AGENT="DostupnyiMarshrutKyiv/2.0 (public open-data importer)";
const clean=(v:unknown)=>v===null||v===undefined||String(v).toLowerCase()==="null"?"":String(v).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,1200);
const date=(v:unknown)=>{const n=typeof v==="number"?v:Date.parse(String(v));return Number.isFinite(n)?new Date(n).toISOString():undefined;};
async function textFrom(url:string,limit=8_000_000){
 const r=await fetch(url,{headers:{"User-Agent":AGENT,"Accept":"application/json,text/csv,application/geo+json"},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`Джерело відповіло HTTP ${r.status}`);
 if(Number(r.headers.get("content-length"))>limit)throw new Error("Набір перевищує ліміт розміру");
 const t=await r.text();if(t.length>limit)throw new Error("Набір перевищує ліміт розміру");return t;
}
type Feature={id?:string|number;properties:Record<string,unknown>;geometry:{type:string;coordinates:unknown}};
async function arcgis(service:string):Promise<Feature[]>{
 const result:Feature[]=[];
 for(let offset=0;offset<10000;offset+=1000){
  const qs=new URLSearchParams({f:"geojson",outFields:"*",outSR:"4326",where:"1=1",resultOffset:String(offset),resultRecordCount:"1000",orderByFields:"objectid"});
  const data=JSON.parse(await textFrom(`${API}${service}/MapServer/0/query?${qs}`));
  if(data.error||!Array.isArray(data.features))throw new Error("Некоректна відповідь міського API");
  result.push(...data.features);
  if(data.features.length<1000&&!data.exceededTransferLimit)return result;
 }
 throw new Error("Міський набір неповний: перевищено ліміт сторінок");
}
// RFC 4180, including quoted commas, escaped quotes, and embedded newlines.
export function parseCSV(input:string):Record<string,string>[] {
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 const s=input.replace(/^\uFEFF/,"");
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===","&&!quoted){row.push(cell);cell="";}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&s[i+1]==="\n")i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell="";}
  else cell+=c;
 }
 if(quoted)throw new Error("Незавершений CSV");
 if(cell||row.length){row.push(cell);rows.push(row);}
 const headers=rows.shift();if(!headers?.includes("lat")||!headers.includes("lon"))throw new Error("У міському CSV немає географічних координат");
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function report(id:SourceId,key:string,kind:ReportKind,lat:number,lng:number,title:string,description:string,fetched:string,updated?:string):Report{
 return {id:`city-${id}-${key}`,kind,lat,lng,title:title.slice(0,160),description,created_at:fetched,updated_at:updated,role:CITY_SOURCES[id].name,source:CITY_SOURCES[id].url,confirmations:0,resolved:0};
}
export async function fetchCitySource(id:SourceId):Promise<SourceData>{
 const fetched=new Date().toISOString(),features:Report[]=[];let skipped=0,updated:string|undefined;
 if(id==="dogs"){
  const slug="dani-pro-mistseznakhodzhennia-zon-dlia-vyhulu-domashnikh-tvaryn-dep-ecology";
  const data=JSON.parse(await textFrom(`https://data.kyivcity.gov.ua/api/action/package_show?id=${slug}`,500000));
  if(!data.success||!Array.isArray(data.result?.resources))throw new Error("Не вдалося прочитати каталог даних про вигул");
  updated=date(data.result.metadata_modified);
  const resources=data.result.resources.filter((r:{name:string})=>/^animal(Playgrounds|Infrastructure)/.test(r.name));
  if(resources.length!==2)throw new Error("Набір даних про тварин неповний");
  for(const resource of resources){
   const url=new URL(resource.url);if(url.protocol!=="https:"||url.hostname!=="data.kyivcity.gov.ua")throw new Error("Джерело CSV змінило адресу");
   const playground=resource.name.startsWith("animalPlaygrounds");
   for(const r of parseCSV(await textFrom(url.href,1_000_000))){
    const lat=Number(r.lat),lng=Number(r.lon);if(!inRightBank({lat,lng})){skipped++;continue;}
    const address=[clean(r.addressThoroughfare),clean(r.addressLocatorDesignator)].filter(Boolean).join(", ");
    const info=[clean(r.addressDescription),playground&&r.area&&r.area!=="null"?`Площа: ${clean(r.area)} м².`:"",
     playground?`Огорожа за джерелом: ${r.fance==="TRUE"?"є":r.fance==="FALSE"?"немає":"невідомо"}.`:"",
     clean(r.trainingInfrastructure)?`Обладнання: ${clean(r.trainingInfrastructure)}.`:"",clean(r.workingHours)?`Години: ${clean(r.workingHours)}.`:"",
     "Міські відкриті дані. Фактичний стан, координати й доступність входу потребують перевірки."].filter(Boolean).join(" ");
    features.push(report(id,`${playground?"play":"infra"}-${r.uid}`,playground?"dog_park":"pet_supply",lat,lng,
      `${playground?"Майданчик для собак":clean(r.label)||"Інфраструктура для тварин"}${address?` · ${address}`:""}`,info,fetched,date(resource.last_modified)||updated));
   }
  }
 }else{
  const raw=await arcgis(id==="bicycle"?"velomap":"WC");
  for(const f of raw){
   const p=f.properties;if(p.actual!==undefined&&Number(p.actual)!==1){skipped++;continue;}
   const edit=date(p.last_edited_date);if(edit&&(!updated||edit>updated))updated=edit;
   if(id==="bicycle"){
    const geometry=f.geometry;const rawLines=geometry.type==="LineString"?[geometry.coordinates]:geometry.type==="MultiLineString"?geometry.coordinates:[];
    const lines:[number,number][][]=[];
    for(const rawLine of rawLines as number[][][]){let line:[number,number][]=[];for(const coord of rawLine){const [lng,lat]=coord;if(inRightBank({lat,lng})){line.push([lat,lng]);}else{if(line.length>1)lines.push(line);line=[];}}if(line.length>1)lines.push(line);}
    if(!lines.length){skipped++;continue;}
    const mid=lines[0][Math.floor(lines[0].length/2)];
    const r=report(id,String(p.objectid??f.id),"cycleway",mid[0],mid[1],`${clean(p.objectname)||"Велодоріжка"} · ${clean(p.addressdescription)}`,
     [clean(p.direction),clean(p.info_link),"Міська веломережа. Шар показує інфраструктуру; напрямок маршруту визначається зв’язною мережею OSM. Поточний стан не перевірено."].filter(Boolean).join(". "),fetched,edit);
    r.lines=lines;features.push(r);
   }else{
    if(f.geometry.type!=="Point"){skipped++;continue;}
    const [lng,lat]=f.geometry.coordinates as number[];if(!inRightBank({lat,lng})){skipped++;continue;}
    features.push(report(id,String(p.objectid??f.id),"toilet",lat,lng,`Туалет · ${clean(p.location)||clean(p.address)}`,
     [`Адреса: ${clean(p.address)}.`,clean(p.status)?`Статус у джерелі: ${clean(p.status)}.`:"",clean(p.workschedule),clean(p.workingdays),clean(p.price),
      clean(p.reasonforclosing),"Доступність для крісла колісного не підтверджена. Це відомості міського реєстру, а не перевірка на місці."].filter(Boolean).join(" "),fetched,edit));
   }
  }
 }
 if(!features.length)throw new Error("У відповіді немає придатних об’єктів правого берега");
 return {id,...CITY_SOURCES[id],fetched_at:fetched,updated_at:updated,features,status:"live",skipped};
}
