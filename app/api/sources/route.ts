import {env} from "cloudflare:workers";
import {CITY_SOURCES,fetchCitySource,type SourceData,type SourceId} from "@/lib/city-data";
export const dynamic="force-dynamic";
const inFlight=new Map<SourceId,Promise<SourceData>>();
const TTL=6*60*60*1000;
async function getSource(id:SourceId,origin:string):Promise<SourceData>{
 const key=`city-data/v3-kyiv/${id}.json`;let cached:SourceData|undefined;
 try{const stored=await env.BUCKET.get(key);if(stored)cached=await new Response(stored.body).json() as SourceData;}catch{}
 if(cached&&Date.now()-Date.parse(cached.fetched_at)<TTL)return {...cached,status:"cache"};
 try{
  const fresh=await fetchCitySource(id);
  try{await env.BUCKET.put(key,new TextEncoder().encode(JSON.stringify(fresh)),{httpMetadata:{contentType:"application/json"}});}catch{}
  return fresh;
 }catch(e){
  const error=e instanceof Error?e.message:"Не вдалося оновити джерело";
  if(cached)return {...cached,status:"cache",error};
  try{const r=await env.ASSETS.fetch(`${origin}/data/city-${id}.json`);if(r.ok){const data=await r.json() as SourceData;return {...data,status:"snapshot",error};}}catch{}
  return {id,...CITY_SOURCES[id],features:[],fetched_at:"",status:"unavailable",error,skipped:0};
 }
}
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 const sources=await Promise.all((Object.keys(CITY_SOURCES) as SourceId[]).map(id=>{
  let pending=inFlight.get(id);if(!pending){pending=getSource(id,origin).finally(()=>inFlight.delete(id));inFlight.set(id,pending);}return pending;
 }));
 return Response.json({sources,checked_at:new Date().toISOString(),cache_hours:6},{headers:{"Cache-Control":"no-store"}});
}
