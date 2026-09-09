export type Point = {lat:number; lng:number; label:string; googlePlaceId?:string};
export type Mobility = "wheelchair"|"stroller"|"walking"|"dog"|"bicycle";
export type Preferences = {noSteps:boolean; gentleSlopes:boolean; noUnderpasses:boolean; smoothSurface:boolean; quietWays?:boolean;allowDismount?:boolean};
export type OSMElement = {type:"node"|"way"; id:number; lat?:number; lon?:number; nodes?:number[]; tags?:Record<string,string>; in_region?:boolean};
export type Network = {elements:OSMElement[]; osm3s?:{timestamp_osm_base?:string}; prototype_meta?:{bounds:number[];retrieved_at?:string;coverage?:number[][];scope?:string}};
export type ReportKind = "steps"|"kerb"|"lift"|"underpass"|"surface"|"temporary"|"toilet"|"bench"|"dog_park"|"pet_supply"|"bike_parking"|"bike_repair"|"water"|"park"|"cycleway";
export type Report = {id:string;kind:ReportKind;title:string;description:string;lat:number;lng:number;created_at:string;photo_key?:string|null;role:string;confirmations:number;resolved:number;my_vote?:string|null;demo?:boolean;source?:string;updated_at?:string;lines?:[number,number][][]};
export type RouteStep = {name:string;distance:number;coords:[number,number][];unknown:boolean;warning?:string;group?:number;dismount?:boolean};
export type RouteResult = {coords:[number,number][];distance:number;minutes:number;unknownPercent:number;walkDistance:number;steps:RouteStep[];startGap:number;endGap:number;warnings:string[];mode:"adapted"|"shortest";profile:Mobility};
export const KYIV_BOUNDS = {south:50.17,north:50.67,west:30.17,east:30.88};
export const PLACES:Point[] = [
 {label:"Золоті ворота",lat:50.44899,lng:30.51336},
 {label:"Парк імені Тараса Шевченка",lat:50.44149,lng:30.51354},
 {label:"Софійська площа",lat:50.45376,lng:30.51684},
 {label:"Майдан Незалежності",lat:50.45010,lng:30.52343},
 {label:"Поштова площа",lat:50.45920,lng:30.52562},
 {label:"Контрактова площа",lat:50.46468,lng:30.51844},
 {label:"Бессарабська площа",lat:50.44268,lng:30.52184},
 {label:"Оперний театр",lat:50.44613,lng:30.51256},
 {label:"Михайлівська площа",lat:50.45503,lng:30.52170},
 {label:"Маріїнський парк",lat:50.44782,lng:30.53998},
 {label:"Київ-Пасажирський",lat:50.44016,lng:30.48983},
 {label:"Арсенальна",lat:50.44303,lng:30.54506},
 {label:"Площа Українських Героїв",lat:50.43914,lng:30.51694},
 {label:"НСК «Олімпійський»",lat:50.43301,lng:30.51849},
 {label:"Оболонська набережна",lat:50.50190,lng:30.51796},
 {label:"ВДНГ, головний вхід",lat:50.38158,lng:30.47677},
 {label:"Парк «Наталка»",lat:50.49083,lng:30.51749},
 {label:"Парк «Нивки»",lat:50.45648,lng:30.40795},
 {label:"Сирецький парк",lat:50.47697,lng:30.44551},
 {label:"Метро «Академмістечко»",lat:50.46485,lng:30.35509},
 {label:"Метро «Житомирська»",lat:50.45598,lng:30.36459},
 {label:"Метро «Героїв Дніпра»",lat:50.52265,lng:30.49881},
 {label:"Парк «Виноградар»",lat:50.51480,lng:30.42800},
 {label:"Пуща-Водиця, 5-та лінія",lat:50.54421,lng:30.35008},
 {label:"Солом’янський ландшафтний парк",lat:50.42830,lng:30.48572},
 {label:"Парк імені Максима Рильського",lat:50.39495,lng:30.50900},
 {label:"Феофанія, вхід",lat:50.34162,lng:30.48677},
 {label:"Пирогів, музей просто неба",lat:50.35434,lng:30.51238},
 {label:"Метро «Теремки»",lat:50.36732,lng:30.45428},
];
export function inKyiv(p:{lat:number;lng:number}) {return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=KYIV_BOUNDS.south&&p.lat<=KYIV_BOUNDS.north&&p.lng>=KYIV_BOUNDS.west&&p.lng<=KYIV_BOUNDS.east;}
export function distance(a:{lat:number;lng:number},b:{lat:number;lng:number}) {const r=Math.PI/180;const x=(b.lng-a.lng)*r*Math.cos((a.lat+b.lat)/2*r),y=(b.lat-a.lat)*r;return Math.hypot(x,y)*6371000;}
export function formatDistance(m:number) {return m<1000?`${Math.round(m/10)*10} м`:`${(m/1000).toFixed(1).replace(".",",")} км`;}
export const KIND_LABELS:Record<ReportKind,string>={steps:"Сходи",kerb:"Високий бордюр",lift:"Ліфт не працює",underpass:"Підземний перехід",surface:"Нерівне покриття",temporary:"Тимчасова перешкода",toilet:"Туалет",bench:"Місце відпочинку",dog_park:"Майданчик для собак",pet_supply:"Інфраструктура для тварин",bike_parking:"Велопарковка",bike_repair:"Велоремонт",water:"Питна вода",park:"Парк",cycleway:"Велодоріжка"};
export const isObstacle=(kind:ReportKind)=>["steps","kerb","lift","underpass","surface","temporary"].includes(kind);
export function unknownLabel(profile:Mobility) {return profile==="dog"?"дозволу на вигул":profile==="bicycle"?"велоінфраструктури":"доступності";}
const HIGHWAY_NAMES:Record<string,string>={footway:"Пішохідна доріжка",path:"Стежка",pedestrian:"Пішохідна вулиця",steps:"Сходи",service:"Проїзд",residential:"Житлова вулиця",cycleway:"Велодоріжка",living_street:"Житлова зона",elevator:"Ліфт",track:"Ґрунтова дорога"};
type Edge={to:number;length:number;weight:number;name:string;unknown:boolean;warning?:string;group:number;dismount?:boolean};
class Heap {
 q:{id:number;cost:number}[]=[];
 push(v:{id:number;cost:number}){let i=this.q.push(v)-1;while(i>0){const p=(i-1)>>1;if(this.q[p].cost<=v.cost)break;this.q[i]=this.q[p];i=p;}this.q[i]=v;}
 pop(){const top=this.q[0],last=this.q.pop();if(this.q.length&&last){let i=0;while(i*2+1<this.q.length){let c=i*2+1;if(c+1<this.q.length&&this.q[c+1].cost<this.q[c].cost)c++;if(this.q[c].cost>=last.cost)break;this.q[i]=this.q[c];i=c;}this.q[i]=last;}return top;}
}
const yes=(v?:string)=>/^(yes|designated|permissive|official)$/.test(v||"");
const no=(v?:string)=>/^(no|private|military|customers|permit)$/.test(v||"");
const one=(v?:string)=>/^(yes|true|1)$/.test(v||"");
function metres(v?:string){if(!v)return NaN;const n=parseFloat(v.replace(",","."));return v.includes("cm")?n/100:v.includes("mm")?n/1000:n;}
function incline(v?:string){if(!v)return NaN;const n=Math.abs(parseFloat(v));return v.includes("°")?Math.tan(n*Math.PI/180)*100:n;}
function forbidden(t:Record<string,string>,profile:Mobility,p:Preferences) {
 const bike=profile==="bicycle",access=bike?t.bicycle:t.foot;
 if(no(access)||(no(t.access)&&!yes(access))||access==="use_sidepath")return true;
 if(bike&&(no(t.vehicle)&&!yes(t.bicycle)||t.motorroad==="yes"||t.bicycle==="dismount"&&p.allowDismount===false))return true;
 if(t.smoothness==="impassable"||/^(construction|proposed|motorway|trunk)/.test(t.highway||""))return true;
 if((profile==="wheelchair"||bike||p.noSteps)&&t.highway==="steps")return true;
 if(profile==="dog"&&no(t.dog))return true;
 if(profile==="wheelchair"&&(t.wheelchair==="no"||t.kerb==="raised"||metres(t["kerb:height"])>.03||metres(t.width)<.8||incline(t.incline)>8))return true;
 if(profile==="stroller"&&(metres(t.width)<.6||t.stroller==="no"))return true;
 if((profile==="wheelchair"||profile==="stroller"||bike)&&(/^(stile|turnstile|kissing_gate)$/.test(t.barrier||"")||t.highway==="elevator"||t.conveying&&t.conveying!=="no"))return true;
 if(p.noUnderpasses&&(t.tunnel==="yes"||t.tunnel==="building_passage"))return true;
 if(profile==="wheelchair"&&(/^(sand|mud|deep_gravel)$/.test(t.surface||"")||/^(very_bad|horrible|very_horrible)$/.test(t.smoothness||"")))return true;
 // Time-dependent restrictions cannot be evaluated in this planning pilot.
 if([t["access:conditional"],t[bike?"bicycle:conditional":"foot:conditional"],...(profile==="dog"?[t["dog:conditional"]]:[])].some(v=>v&&/\b(no|private|dismount)\b/.test(v)))return true;
 return false;
}
export function segmentDistance(p:{lat:number;lng:number},a:{lat:number;lng:number},b:{lat:number;lng:number}) {return project(p,a,b).gap;}
function project(p:{lat:number;lng:number},a:{lat:number;lng:number},b:{lat:number;lng:number}) {
 const c=Math.cos(p.lat*Math.PI/180),ax=(a.lng-p.lng)*c,ay=a.lat-p.lat,bx=(b.lng-p.lng)*c,by=b.lat-p.lat,dx=bx-ax,dy=by-ay;
 const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
 return {t,lat:a.lat+t*(b.lat-a.lat),lng:a.lng+t*(b.lng-a.lng),gap:Math.hypot(ax+t*dx,ay+t*dy)*111195};
}
function reportIndex(reports:Report[]) {
 const grid=new Map<string,Report[]>();
 for(const r of reports){const key=`${Math.floor(r.lat/.002)},${Math.floor(r.lng/.003)}`;const cell=grid.get(key)||[];cell.push(r);grid.set(key,cell);}
 return (a:{lat:number;lng:number},b:{lat:number;lng:number})=>{
  const found:Report[]=[];
  for(let row=Math.floor((Math.min(a.lat,b.lat)-.00015)/.002);row<=Math.floor((Math.max(a.lat,b.lat)+.00015)/.002);row++)
   for(let col=Math.floor((Math.min(a.lng,b.lng)-.00025)/.003);col<=Math.floor((Math.max(a.lng,b.lng)+.00025)/.003);col++)found.push(...(grid.get(`${row},${col}`)||[]));
  return found;
 };
}
export function calculateRoute(network:Network,start:Point,end:Point,profile:Mobility,prefs:Preferences,reports:Report[],mode:"adapted"|"shortest"="adapted"):RouteResult {
 if(distance(start,end)<25)throw new Error("Оберіть дві різні точки щонайменше за 25 м одна від одної.");
 const bike=profile==="bicycle",dog=profile==="dog";
 const nodes=new Map<number,OSMElement>();for(const e of network.elements)if(e.type==="node"&&e.lat!==undefined)nodes.set(e.id,{...nodes.get(e.id),...e,tags:{...nodes.get(e.id)?.tags,...e.tags}});
 const graph=new Map<number,Edge[]>();
 const constraints=mode==="shortest"?{noSteps:false,gentleSlopes:false,noUnderpasses:false,smoothSurface:false,quietWays:false,allowDismount:prefs.allowDismount}:prefs;
 const active=reports.filter(r=>!r.demo&&!r.source&&isObstacle(r.kind));const nearby=reportIndex(active);
 const seenWays=new Set<number>();
 for(const way of network.elements){
  if(way.type!=="way"||!way.nodes||seenWays.has(way.id))continue;seenWays.add(way.id);
  const t=way.tags||{};if(!t.highway||forbidden(t,profile,constraints))continue;
  if(!bike&&t.highway==="cycleway"&&!yes(t.foot))continue;
  const dismount=bike&&(t.bicycle==="dismount"||/^(footway|pedestrian)$/.test(t.highway)&&!yes(t.bicycle));
  if(dismount&&(constraints.allowDismount===false||forbidden(t,"walking",constraints)))continue;
  let factor=dismount?4.7:1;const warnings:string[]=[];if(dismount)warnings.push("Ведіть велосипед пішки");
  const cycle=t.highway==="cycleway"||[t.cycleway,t["cycleway:left"],t["cycleway:right"],t["cycleway:both"]].some(v=>v&&/^(track|lane|shared_lane|opposite_lane|opposite_track)$/.test(v));
  const road=/^(primary|secondary|tertiary|unclassified|residential|service)/.test(t.highway);
  if(mode==="adapted"){
   if(constraints.gentleSlopes){if(incline(t.incline)>4)factor+=3;if(t.incline==="up"||t.incline==="down")factor+=2;}
   if(constraints.smoothSurface&&(/^(cobblestone|sett|unpaved|gravel|ground|dirt|grass|sand|mud)$/.test(t.surface||"")||t.smoothness==="bad"))factor+=3;
   if(profile==="wheelchair"&&t.wheelchair==="limited")factor+=2;
   if(!t.surface)factor+=.05;
   if(bike&&constraints.quietWays!==false){if(cycle)factor*=.65;else if(/^(primary|secondary)/.test(t.highway))factor+=4;else if(road)factor+=.6;}
   if(dog&&constraints.quietWays!==false&&road)factor+=/^(primary|secondary|tertiary)/.test(t.highway)?4:1.2;
  }
  if(road&&!bike){factor+=t.sidewalk==="no"?4:.35;warnings.push("Шлях уздовж проїзду: тротуар і переходи потребують перевірки");}
  if(bike&&road&&!cycle)warnings.push("Спільний рух з автомобілями; окрема велодоріжка не позначена");
  if(bike&&/^(footway|pedestrian)$/.test(t.highway))warnings.push("Спільний простір: пропускайте пішоходів");
  if(dog&&(t.dog==="leashed"||t.leash==="yes"))warnings.push("Позначено вигул лише на повідку");
  if(t.highway==="steps")warnings.push("На ділянці є сходи");
  if(t.tunnel==="yes")warnings.push("Підземна ділянка");
  if(incline(t.incline)>4)warnings.push("Є позначений ухил");
  const warning=warnings.length?warnings.join(" · "):undefined;
  const unknown=bike?!cycle:dog?!/^(yes|leashed|unleashed)$/.test(t.dog||""):t.wheelchair!=="yes";
  const name=t["name:uk"]||t.name||(t.footway==="crossing"?"Пішохідний перехід":t.footway==="sidewalk"?"Тротуар":HIGHWAY_NAMES[t.highway])||"Ділянка шляху";
  let direction=t["oneway:foot"];
  if(bike&&!dismount){direction=t["oneway:bicycle"]??t.oneway??(t.junction==="roundabout"?"yes":"no");if(t["oneway:bicycle"]===undefined&&[t.cycleway,t["cycleway:left"],t["cycleway:right"]].some(v=>v?.startsWith("opposite")))direction="no";}
  for(let i=1;i<way.nodes.length;i++){
   const ai=way.nodes[i-1],bi=way.nodes[i],a=nodes.get(ai),b=nodes.get(bi);
   if(!a||!b||a.in_region===false||b.in_region===false||a.lat===undefined||a.lon===undefined||b.lat===undefined||b.lon===undefined)continue;
   if(forbidden(a.tags||{},profile,constraints)||forbidden(b.tags||{},profile,constraints)||dismount&&(forbidden(a.tags||{},"walking",constraints)||forbidden(b.tags||{},"walking",constraints)))continue;
   const pa={lat:a.lat,lng:a.lon},pb={lat:b.lat,lng:b.lon},len=distance(pa,pb);if(len<=0)continue;
   if(nearby(pa,pb).some(r=>segmentDistance(r,pa,pb)<14&&(r.kind==="temporary"||r.kind==="lift"||r.kind==="steps"&&(profile==="wheelchair"||bike||constraints.noSteps)||r.kind==="kerb"&&(profile==="wheelchair"||profile==="stroller"||bike)||r.kind==="underpass"&&constraints.noUnderpasses||r.kind==="surface"&&constraints.smoothSurface)))continue;
   const add=(from:number,to:number)=>{const es=graph.get(from)||[];es.push({to,length:len,weight:len*factor,name,unknown,warning,group:way.id,dismount});graph.set(from,es);};
   if(direction!=="-1"&&!(bike&&no(t["bicycle:forward"])))add(ai,bi);
   if(!one(direction)&&!(bike&&no(t["bicycle:backward"])))add(bi,ai);
  }
 }
 // Split the closest eligible edge; never jump directly across a missing connection.
 function snap(point:Point,id:number){
  let chosen:{from:number;edge:Edge;t:number;lat:number;lng:number;gap:number}|null=null;
  for(const[from,edges]of graph){const a=nodes.get(from)!;for(const edge of edges){const b=nodes.get(edge.to)!;const p=project(point,{lat:a.lat!,lng:a.lon!},{lat:b.lat!,lng:b.lon!});if(!chosen||p.gap<chosen.gap)chosen={from,edge,...p};}}
  if(!chosen||chosen.gap>100)throw new Error(`Поруч із точкою немає доступного для цього профілю шляху в межах 100 м. Перемістіть точку до входу${bike?" або велодоріжки":" чи тротуару"}.`);
  const c=chosen;
  if(c.t<.000001)return {id:c.from,gap:c.gap};
  if(c.t>.999999)return {id:c.edge.to,gap:c.gap};
  nodes.set(id,{type:"node",id,lat:c.lat,lon:c.lng});graph.set(id,[]);
  const split=(from:number,to:number,fraction:number)=>{
   const originals=(graph.get(from)||[]).filter(e=>e.to===to);graph.set(from,(graph.get(from)||[]).filter(e=>e.to!==to));
   for(const e of originals){graph.get(from)!.push({...e,to:id,length:e.length*fraction,weight:e.weight*fraction});graph.get(id)!.push({...e,length:e.length*(1-fraction),weight:e.weight*(1-fraction)});}
  };
  split(c.from,c.edge.to,c.t);split(c.edge.to,c.from,1-c.t);
  return {id,gap:c.gap};
 }
 const a=snap(start,-1),b=snap(end,-2);
 const costs=new Map<number,number>([[a.id,0]]),previous=new Map<number,{from:number;edge:Edge}>(),heap=new Heap();heap.push({id:a.id,cost:0});
 while(heap.q.length){const n=heap.pop();if(n.cost!==(costs.get(n.id)??Infinity))continue;if(n.id===b.id)break;for(const e of graph.get(n.id)||[]){const next=n.cost+e.weight;if(next<(costs.get(e.to)??Infinity)){costs.set(e.to,next);previous.set(e.to,{from:n.id,edge:e});heap.push({id:e.to,cost:next});}}}
 if(!costs.has(b.id)||a.id===b.id)throw new Error("Не вдалося знайти зв’язний маршрут з цими обмеженнями. Спробуйте інший вхід або послабте додаткові побажання. Прохід не підтверджено.");
 const chain:{id:number;edge:Edge}[]=[];let cur=b.id;while(cur!==a.id){const v=previous.get(cur)!;chain.push({id:cur,edge:v.edge});cur=v.from;}chain.reverse();
 const first=nodes.get(a.id)!,coords:[number,number][]=[[first.lat!,first.lon!]],steps:RouteStep[]=[];let total=0,unknown=0,walkDistance=0;const warnings=new Set<string>();
 for(const entry of chain){const n=nodes.get(entry.id)!,last=coords[coords.length-1],c:[number,number]=[n.lat!,n.lon!];coords.push(c);total+=entry.edge.length;if(entry.edge.dismount)walkDistance+=entry.edge.length;if(entry.edge.unknown)unknown+=entry.edge.length;if(entry.edge.warning)warnings.add(entry.edge.warning);const prev=steps[steps.length-1];if(prev&&prev.name===entry.edge.name&&prev.warning===entry.edge.warning&&prev.group===entry.edge.group){prev.distance+=entry.edge.length;prev.coords.push(c);prev.unknown ||=entry.edge.unknown;}else steps.push({name:entry.edge.name,distance:entry.edge.length,coords:[last,c],unknown:entry.edge.unknown,warning:entry.edge.warning,group:entry.edge.group,dismount:entry.edge.dismount});}
 if(a.gap>10||b.gap>10)warnings.add("Підхід від позначок до шляху не перевірено; на карті він пунктирний");
 if(active.length)warnings.add("Враховано повідомлення спільноти; їх ще не перевірено незалежно");
 if(dog)warnings.add("Відсутність заборони в OSM не підтверджує дозвіл на вигул. Перевіряйте місцеві позначки та правила повідка");
 if(bike)warnings.add("Сходи виключено. За потреби пішохідні відрізки позначені «Ведіть велосипед пішки»; перевіряйте знаки на місці");
 const speed=bike?14:dog?3.5:profile==="walking"?2.7:profile==="wheelchair"?3:3.5;
 return {coords,distance:total+a.gap+b.gap,minutes:Math.max(1,Math.ceil((total-walkDistance)/1000/speed*60+(walkDistance+a.gap+b.gap)/1000/3*60)),unknownPercent:Math.round(unknown/total*100),walkDistance,steps,startGap:a.gap,endGap:b.gap,warnings:[...warnings],mode,profile};
}
export function featuresFromNetwork(network:Network):Report[]{
 const result:Report[]=[],seen=new Set<string>(),nodes=new Map(network.elements.filter(e=>e.type==="node").map(e=>[e.id,e]));
 for(const e of network.elements){
  const t=e.tags||{};let kind:ReportKind|undefined;
  const amenities:Record<string,ReportKind>={toilets:"toilet",bench:"bench",bicycle_parking:"bike_parking",bicycle_repair_station:"bike_repair",drinking_water:"water"};
  kind=amenities[t.amenity];
  if(!kind){if(t.leisure==="dog_park")kind="dog_park";else if(t.leisure==="park")kind="park";else if(t.highway==="steps")kind="steps";else if(t.kerb==="raised")kind="kerb";else if(t.highway==="elevator")kind="lift";else if(t.tunnel==="yes"&&t.highway)kind="underpass";}
  if(!kind)continue;
  let n=e;if(e.type==="way"&&e.nodes)n=nodes.get(e.nodes[Math.floor(e.nodes.length/2)])||e;
  if(n.lat===undefined||n.lon===undefined||n.in_region===false)continue;
  const cell=`${kind}-${n.lat.toFixed(4)}-${n.lon.toFixed(4)}`;if(seen.has(cell))continue;seen.add(cell);
  let description="Об’єкт нанесено в OpenStreetMap. Поточний стан і доступність не перевірено.";
  if(kind==="toilet")description=t["toilets:wheelchair"]==="yes"||t.wheelchair==="yes"?"OSM позначає доступність для крісла колісного. Фактичний стан і години роботи не перевірено.":"Доступність для крісла колісного не підтверджена. Перевірте вхід і стан на місці.";
  if(kind==="lift")description="Ліфт нанесено в OpenStreetMap. Працездатність невідома; маршрути для крісла колісного не покладаються на нього.";
  if(kind==="dog_park"||kind==="park")description+=` ${t.dog==="no"?"В OSM позначена заборона з собаками.":t.dog==="leashed"?"В OSM позначено вигул на повідку.":"Правила вигулу перевірте на місці."}`;
  if(t.opening_hours)description+=` Години за джерелом: ${t.opening_hours}.`;
  result.push({id:`osm-${e.type}-${e.id}`,kind,title:t["name:uk"]||t.name||(kind==="lift"?"Ліфт · стан невідомий":KIND_LABELS[kind]),description,lat:n.lat,lng:n.lon,created_at:network.osm3s?.timestamp_osm_base||network.prototype_meta?.retrieved_at||"",role:"OpenStreetMap",confirmations:0,resolved:0,source:`https://www.openstreetmap.org/${e.type}/${e.id}`});
 }
 return result;
}
