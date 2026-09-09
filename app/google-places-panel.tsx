"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Search,Info,LoaderCircle,MapPin,Flag,ArrowUpRight} from "lucide-react";
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {GOOGLE_MAPS_ENABLED,loadGooglePlaces,pointFromGooglePlace,type GooglePlace,type GoogleSearchElement,type GoogleTextRequest,type GoogleDetailsRequest} from "@/lib/google-places";
import type {Point} from "@/lib/routing";
import {assetUrl} from "@/lib/app-runtime";

type Props={open:boolean;onOpenChange:(open:boolean)=>void;anchor:Point;initialQuery:string;onChoose:(point:Point,destination:"start"|"end")=>void};
export default function GooglePlacesPanel({open,onOpenChange,anchor,initialQuery,onChoose}:Props) {
  const [query,setQuery]=useState(initialQuery);
  const [request,setRequest]=useState<{query:string;anchor:Point;attempt:number}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [empty,setEmpty]=useState(false);
  const [chosen,setChosen]=useState<Point|null>(null);
  const [selectedId,setSelectedId]=useState("");
  const [detailsBusy,setDetailsBusy]=useState(false);
  const searchRoot=useRef<HTMLDivElement>(null);
  const detailsRoot=useRef<HTMLDivElement>(null);

  useEffect(()=>{setQuery(initialQuery);setRequest(null);setBusy(false);setError("");setEmpty(false);setChosen(null);setSelectedId("");setDetailsBusy(false);},[open,initialQuery]);
  useEffect(()=>{
    if(!open||!request)return;
    let canceled=false;
    let search:GoogleSearchElement|undefined;
    let details:HTMLElement|undefined;
    let detailsTimer:ReturnType<typeof setTimeout>|undefined;
    let selection=0;
    const clearDetailsTimer=()=>{if(detailsTimer)clearTimeout(detailsTimer);};
    const timer=setTimeout(()=>{if(!canceled){setBusy(false);setError("Пошук Google триває надто довго. Повторіть запит.");}},30000);
    setBusy(true);setError("");setEmpty(false);setChosen(null);setSelectedId("");
    searchRoot.current?.replaceChildren();detailsRoot.current?.replaceChildren();
    loadGooglePlaces().then(()=>{
      if(canceled||!searchRoot.current)return;
      search=document.createElement("gmp-place-search") as GoogleSearchElement;
      search.selectable=true;
      const content=document.createElement("gmp-place-all-content");
      const textRequest=document.createElement("gmp-place-text-search-request") as GoogleTextRequest;
      textRequest.maxResultCount=5;
      textRequest.locationBias={lat:request.anchor.lat,lng:request.anchor.lng};
      textRequest.textQuery=/київ|kyiv/i.test(request.query)?request.query:`${request.query}, Київ`;
      search.append(content,textRequest);
      search.addEventListener("gmp-load",()=>{
        if(canceled)return;clearTimeout(timer);setBusy(false);setError("");setEmpty(search!.places.length===0);
      });
      search.addEventListener("gmp-error",()=>{
        if(canceled)return;clearTimeout(timer);setBusy(false);setError("Google не зміг завантажити місця. Спробуйте ще раз; якщо помилка повторюється, власнику сайту слід перевірити підключення Google Maps.");
      });
      search.addEventListener("gmp-select",event=>{
        const place=(event as Event&{place?:GooglePlace}).place;
        if(canceled||!place?.id||!detailsRoot.current)return;
        const current=++selection;clearDetailsTimer();details?.remove();
        setSelectedId(place.id);setChosen(null);setDetailsBusy(true);setError("");
        try{setChosen(pointFromGooglePlace(place));}catch(error){setError(error instanceof Error?error.message:"Координати цього місця недоступні.");}
        details=document.createElement("gmp-place-details");
        const detailRequest=document.createElement("gmp-place-details-place-request") as GoogleDetailsRequest;
        detailRequest.place=place.id;
        details.append(document.createElement("gmp-place-all-content"),detailRequest);
        details.addEventListener("gmp-load",()=>{if(!canceled&&selection===current){clearDetailsTimer();setDetailsBusy(false);}});
        details.addEventListener("gmp-error",()=>{if(!canceled&&selection===current){clearDetailsTimer();setDetailsBusy(false);setError("Деталі цього місця зараз недоступні в Google Maps.");}});
        detailsTimer=setTimeout(()=>{if(!canceled&&selection===current){setDetailsBusy(false);setError("Не вдалося дочекатися картки Google Maps. Оберіть місце ще раз.");}},25000);
        detailsRoot.current.replaceChildren(details);
      });
      searchRoot.current.replaceChildren(search);
    }).catch(error=>{if(!canceled){clearTimeout(timer);setBusy(false);setError(error instanceof Error?error.message:"Google Maps тимчасово недоступний.");}});
    return()=>{canceled=true;clearTimeout(timer);clearDetailsTimer();search?.remove();details?.remove();};
  },[open,request]);

  function submit(event:FormEvent) {
    event.preventDefault();
    if(!query.trim()||busy||!GOOGLE_MAPS_ENABLED)return;
    setRequest(previous=>({query:query.trim(),anchor,attempt:(previous?.attempt||0)+1}));
  }
  const mapsLink=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query||initialQuery}, Київ`)}`;
  return <Sheet open={open} onOpenChange={onOpenChange} modal={false}><SheetContent className="detail-sheet google-sheet" onInteractOutside={event=>event.preventDefault()}>
    <SheetHeader><p className="eyebrow">ДОДАТКОВЕ ДЖЕРЕЛО</p><SheetTitle>Місця в Google Maps</SheetTitle><SheetDescription>Фото, години роботи та відомості про доступність, якщо вони є у Google.</SheetDescription></SheetHeader>
    <div className="sheet-body google-panel-body">
      {!GOOGLE_MAPS_ENABLED?<div className="google-unavailable"><Info size={22}/><h3>Google Maps ще не підключено</h3><p>Власнику сайту потрібно завершити підключення. Карта Києва й побудова маршрутів доступні.</p><a href={mapsLink} target="_blank" rel="noreferrer">Переглянути місця в Google Maps<ArrowUpRight size={16}/></a></div>:<>
        <form className="google-search-form" onSubmit={submit}><label htmlFor="google-place-query">Назва, адреса або тип місця</label><Input id="google-place-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Наприклад, кафе або веломайстерня" maxLength={200} required/><Button type="submit" className="primary-button" disabled={busy||!query.trim()}>{busy?<LoaderCircle size={18} className="spin"/>:<Search size={18}/>}Знайти в Google Maps</Button></form>
        <p className="small-muted">Пріоритет пошуку — біля «{anchor.label}». Після натискання запит і координати цієї точки передаються Google.</p>
        {busy&&<p className="google-loading" role="status"><LoaderCircle size={18} className="spin"/>Шукаємо місця…</p>}
        {error&&<p className="inline-error" role="alert">{error}</p>}
        {empty&&<p className="google-empty" role="status">Google не знайшов місць за цим запитом. Спробуйте іншу назву або адресу.</p>}
        <div className="google-results" ref={searchRoot}/>
        <section className="google-selection" hidden={!selectedId} aria-label="Картка обраного місця">
          <h3>Обране місце</h3>
          {detailsBusy&&<p className="google-loading" role="status"><LoaderCircle size={17} className="spin"/>Завантажуємо картку…</p>}
          <div className="google-details" ref={detailsRoot}/>
          {chosen&&<div className="google-route-actions"><Button variant="outline" onClick={()=>onChoose(chosen,"start")}><MapPin size={17}/>Старт звідси</Button><Button onClick={()=>onChoose(chosen,"end")}><Flag size={17}/>Маршрут сюди</Button></div>}
        </section>
      </>}
      <div className="data-note"><Info size={17}/><p>Позначка доступного входу описує заклад, а не весь шлях до нього. Відсутність позначки означає, що даних немає. Маршрут розраховується за OSM; стан ліфтів, бордюрів і тимчасових перешкод Google може не відображати.</p></div>
      <nav className="app-info-links" aria-label="Інформація про сервіс"><a href={assetUrl("information.html#privacy")} target="_blank" rel="noreferrer">Приватність</a><a href={assetUrl("information.html#terms")} target="_blank" rel="noreferrer">Умови користування</a></nav>
    </div>
  </SheetContent></Sheet>;
}
