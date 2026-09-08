import type {Network,Point,OSMElement,Mobility,Preferences,Report,RouteResult} from "./routing";
import {assetUrl} from "./app-runtime";
export type NetworkIndex={bounds:number[];osm_timestamp:string;retrieved_at:string;districts:string[];ways:number;nodes:number;tiles:{url:string;bounds:number[];bytes:number}[]};
let indexPromise:Promise<NetworkIndex>|undefined;
const tiles=new Map<string,Promise<Network>>();
export function loadNetworkIndex(){
 if(!indexPromise)indexPromise=fetch(assetUrl("data/network-index.json"),{cache:"no-cache"}).then(async r=>{if(!r.ok)throw new Error("Не вдалося відкрити мережу правого берега");return r.json() as Promise<NetworkIndex>;}).catch(e=>{indexPromise=undefined;throw e;});
 return indexPromise;
}
export async function loadNetwork(start:Point,end:Point,all=false):Promise<Network>{
 const index=await loadNetworkIndex();
 const box=all?index.bounds:[Math.min(start.lat,end.lat)-.025,Math.min(start.lng,end.lng)-.04,Math.max(start.lat,end.lat)+.025,Math.max(start.lng,end.lng)+.04];
 const wanted=index.tiles.filter(t=>t.bounds[0]<=box[2]&&t.bounds[2]>=box[0]&&t.bounds[1]<=box[3]&&t.bounds[3]>=box[1]);
 const data:Network[]=[];
 for(let i=0;i<wanted.length;i+=4){
  const batch=await Promise.all(wanted.slice(i,i+4).map(t=>{
   const url=`${assetUrl(t.url)}?v=${encodeURIComponent(index.osm_timestamp)}`;
   if(!tiles.has(url))tiles.set(url,fetch(url).then(async r=>{if(!r.ok)throw new Error("Частину мережі шляхів не завантажено. Спробуйте ще раз.");return r.json() as Promise<Network>;}).catch(e=>{tiles.delete(url);throw e;}));
   return tiles.get(url)!;
  }));data.push(...batch);
 }
 const elements=new Map<string,OSMElement>();
 for(const tile of data)for(const e of tile.elements){const key=`${e.type}-${e.id}`,prev=elements.get(key);elements.set(key,prev?{...prev,...e,tags:{...prev.tags,...e.tags}}:e);}
 return {elements:[...elements.values()],osm3s:{timestamp_osm_base:index.osm_timestamp},prototype_meta:{bounds:box,retrieved_at:index.retrieved_at,scope:"kyiv-right-bank"}};
}
export type RouteJob={network:Network;start:Point;end:Point;profile:Mobility;prefs:Preferences;reports:Report[]};
export async function routeInWorker(job:RouteJob):Promise<RouteResult[]>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL("./routing-worker.ts",import.meta.url),{type:"module"});
  const timer=setTimeout(()=>{worker.terminate();reject(new Error("Розрахунок триває надто довго. Спробуйте коротший маршрут."));},45000);
  const stop=()=>{clearTimeout(timer);worker.terminate();};
  worker.onmessage=e=>{stop();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.routes);};
  worker.onerror=()=>{stop();reject(new Error("Не вдалося запустити розрахунок маршруту. Оновіть сторінку."));};
  worker.postMessage(job);
 });
}
export async function planLocalRoute(start:Point,end:Point,profile:Mobility,prefs:Preferences,reports:Report[]){
 let network=await loadNetwork(start,end);
 try{return {network,routes:await routeInWorker({network,start,end,profile,prefs,reports})};}
 catch(e){
  if(!(e instanceof Error)||!e.message.includes("зв’язний маршрут"))throw e;
  // A detour may leave the initial corridor. Retry on the complete right bank.
  network=await loadNetwork(start,end,true);
  return {network,routes:await routeInWorker({network,start,end,profile,prefs,reports})};
 }
}
