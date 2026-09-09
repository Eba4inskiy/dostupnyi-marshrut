import type {Point} from "./routing";
import {inRightBank} from "./region";

// This is a browser key, visible in the published JavaScript. Restrict it to
// the site's HTTP referrers and the enabled Maps/Places UI Kit APIs in Google.
export const GOOGLE_MAPS_KEY=(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
export const GOOGLE_MAPS_ENABLED=GOOGLE_MAPS_KEY.length>0;

export type GooglePlace={id:string;location?:{lat:number|(()=>number);lng:number|(()=>number)}};
export type GoogleSearchElement=HTMLElement&{places:GooglePlace[];selectable:boolean};
export type GoogleTextRequest=HTMLElement&{textQuery:string;locationBias:{lat:number;lng:number};maxResultCount:number};
export type GoogleDetailsRequest=HTMLElement&{place:GooglePlace|string};
type GoogleWindow=Window&{
  google?:{maps?:{importLibrary:(name:string)=>Promise<unknown>}};
  gm_authFailure?:()=>void;
};
let library:Promise<void>|undefined;
let callbackNumber=0;

export function pointFromGooglePlace(place:GooglePlace):Point {
  const location=place.location;
  const lat=typeof location?.lat==="function"?location.lat():location?.lat;
  const lng=typeof location?.lng==="function"?location.lng():location?.lng;
  if(typeof lat!=="number"||typeof lng!=="number"||!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error("Для цього місця Google не повернув координати.");
  if(!inRightBank({lat,lng}))throw new Error("Це місце поза правим берегом Києва. Картку можна переглянути, але маршрут сюди поки недоступний.");
  return {lat,lng,label:`Google Maps · ${lat.toFixed(4)}, ${lng.toFixed(4)}`,googlePlaceId:place.id};
}

export function loadGooglePlaces():Promise<void> {
  if(!GOOGLE_MAPS_ENABLED)return Promise.reject(new Error("Google Maps ще не підключено власником сайту."));
  if(library)return library;
  const target=window as GoogleWindow;
  library=new Promise<void>((resolve,reject)=>{
    const callback=`__dostupnyiGoogleReady${++callbackNumber}`;
    const callbacks=target as unknown as Record<string,unknown>;
    const script=document.createElement("script");
    const previousAuthFailure=target.gm_authFailure;
    let settled=false;
    const timer=window.setTimeout(()=>finish(new Error("Google Maps не відповідає. Перевірте інтернет і спробуйте ще раз.")),25000);
    function finish(error?:Error) {
      if(settled)return;settled=true;window.clearTimeout(timer);
      // A timed-out script can still finish downloading. Keep its callback inert.
      callbacks[callback]=()=>{};
      if(target.gm_authFailure===authFailure)target.gm_authFailure=previousAuthFailure;
      if(error){script.remove();reject(error);}else resolve();
    }
    function authFailure(){finish(new Error("Google Maps відхилив підключення. Власнику сайту потрібно перевірити ключ, дозволені адреси та налаштування Google Cloud."));previousAuthFailure?.();}
    target.gm_authFailure=authFailure;
    callbacks[callback]=async()=>{
      try{
        if(!target.google?.maps?.importLibrary)throw new Error("Не вдалося завантажити бібліотеку Google Maps.");
        await target.google.maps.importLibrary("places");
        if(!customElements.get("gmp-place-search")||!customElements.get("gmp-place-details"))throw new Error("Компоненти Google Places недоступні. Спробуйте оновити сторінку.");
        finish();
      }catch(error){finish(error instanceof Error?error:new Error("Google Maps тимчасово недоступний."));}
    };
    if(target.google?.maps?.importLibrary){void (callbacks[callback] as ()=>Promise<void>)();return;}
    const url=new URL("https://maps.googleapis.com/maps/api/js");
    url.search=new URLSearchParams({key:GOOGLE_MAPS_KEY,v:"weekly",loading:"async",callback,language:"uk",region:"UA"}).toString();
    script.src=url.href;script.async=true;
    script.onerror=()=>finish(new Error("Не вдалося завантажити Google Maps. Перевірте інтернет або блокувальник запитів."));
    document.head.appendChild(script);
  }).catch(error=>{library=undefined;throw error;});
  return library;
}
