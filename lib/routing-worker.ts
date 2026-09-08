import {calculateRoute,type RouteResult} from "./routing";
import type {RouteJob} from "./network-client";
self.onmessage=(event:MessageEvent<RouteJob>)=>{
 try{
  const {network,start,end,profile,prefs,reports}=event.data;
  const adapted=calculateRoute(network,start,end,profile,prefs,reports),routes:RouteResult[]=[adapted];
  try{const short=calculateRoute(network,start,end,profile,prefs,reports,"shortest");if(Math.abs(short.distance-adapted.distance)>30)routes.push(short);}catch{}
  self.postMessage({routes});
 }catch(e){self.postMessage({error:e instanceof Error?e.message:"Не вдалося обчислити маршрут"});}
};
