import {test} from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {mkdtemp,readFile} from "node:fs/promises";
import {rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
const temp=await mkdtemp(join(tmpdir(),"kyiv-routing-check-"));
await build({entryPoints:["lib/routing.ts","lib/region.ts","lib/city-data.ts"],outdir:temp,outExtension:{".js":".mjs"},bundle:true,platform:"node",format:"esm"});
const {calculateRoute,distance,PLACES}=await import(pathToFileURL(join(temp,"routing.mjs")).href);
const {inCoverage,districtAt}=await import(pathToFileURL(join(temp,"region.mjs")).href);
const {parseCSV}=await import(pathToFileURL(join(temp,"city-data.mjs")).href);
const prefs={noSteps:true,gentleSlopes:true,noUnderpasses:true,smoothSurface:true,quietWays:true,allowDismount:true};
const n=(id,lat,lng,tags={})=>({type:"node",id,lat,lon:lng,tags});
const w=(id,nodes,tags={})=>({type:"way",id,nodes,tags:{highway:"footway",...tags}});
const A={lat:50.45,lng:30.5,label:"A"},B={lat:50.45,lng:30.51,label:"B"};
const nodes=[n(1,A.lat,A.lng),n(2,50.45,30.505),n(3,B.lat,B.lng)];
const net=(tags,nodeExtras=[])=>({elements:[...nodes,w(100,[1,2,3],tags),...nodeExtras]});
const route=(network,profile="wheelchair",p=prefs,reports=[],a=A,b=B)=>calculateRoute(network,a,b,profile,p,reports);

test("stairs, raised kerbs and unknown elevators remain wheelchair exclusions",()=>{
 for(const tags of [{highway:"steps"},{wheelchair:"no"},{incline:"12%"},{highway:"elevator"}])assert.throws(()=>route(net(tags)));
 assert.throws(()=>route(net({},[n(2,50.45,30.505,{kerb:"raised"}),n(2,50.45,30.505)])));
 assert.ok(route(net({highway:"steps"}),"walking",{...prefs,noSteps:false}).distance>500);
});
test("bicycle access is independent of foot access and honors one-way exceptions",()=>{
 assert.ok(route(net({highway:"cycleway",foot:"no"}),"bicycle").distance>500);
 assert.throws(()=>route(net({highway:"residential",bicycle:"no",foot:"yes"}),"bicycle"));
 const one=net({highway:"residential",oneway:"yes"});
 assert.ok(route(one,"bicycle").distance>500);assert.throws(()=>route(one,"bicycle",prefs,[],B,A));
 assert.ok(route(net({highway:"residential",oneway:"yes","oneway:bicycle":"no"}),"bicycle",prefs,[],B,A).distance>500);
 assert.ok(route(one,"walking",prefs,[],B,A).distance>500);
});
test("pushing a bicycle is explicit, slower, optional, and obeys pedestrian restrictions",()=>{
 const walking=route(net({bicycle:"dismount"}),"bicycle"),cycling=route(net({highway:"cycleway"}),"bicycle");
 assert.ok(walking.walkDistance>500);assert.ok(walking.minutes>cycling.minutes);assert.ok(walking.steps.every(s=>s.dismount));
 assert.throws(()=>route(net({bicycle:"dismount"}),"bicycle",{...prefs,allowDismount:false}));
 assert.throws(()=>route(net({bicycle:"dismount",foot:"no"}),"bicycle"));
 assert.throws(()=>route(net({highway:"steps",bicycle:"yes"}),"bicycle",{...prefs,noSteps:false}));
});
test("dog restrictions and leash warnings are separate from wheelchair metadata",()=>{
 assert.throws(()=>route(net({dog:"no"}),"dog"));
 const r=route(net({dog:"leashed"}),"dog");assert.equal(r.unknownPercent,0);assert.ok(r.warnings.some(s=>s.includes("повідку")));
 assert.equal(route(net({wheelchair:"yes"}),"dog").unknownPercent,100);
});
test("community barriers block their segments; utility/source points do not",()=>{
 const r={id:"1",kind:"temporary",title:"",description:"",lat:50.45,lng:30.505,created_at:"",role:"Мешканець",confirmations:0,resolved:0};
 assert.throws(()=>route(net({}),"wheelchair",prefs,[r]));
 assert.ok(route(net({}),"wheelchair",prefs,[{...r,kind:"dog_park"}]).distance>500);
 assert.ok(route(net({}),"wheelchair",prefs,[{...r,source:"https://www.openstreetmap.org/"}]).distance>500);
});
test("points snap to the middle of a directed edge without reversing its direction",()=>{
 const network={elements:[nodes[0],nodes[2],w(100,[1,3],{highway:"cycleway",oneway:"yes"})]};
 const a={...A,lng:30.502},b={...B,lng:30.508};const r=route(network,"bicycle",prefs,[],a,b);
 assert.ok(Math.abs(r.distance-distance(a,b))<1);assert.ok(r.startGap<1&&r.endGap<1);
 assert.throws(()=>route(network,"bicycle",prefs,[],b,a));
});
test("CSV handles quoted commas, escaped quotes and multiline cells",()=>{
 const rows=parseCSV('uid,label,lat,lon\r\n1,"Парк, \\"А\\"",50.4,30.5\r\n'.replaceAll('\\"','""'));
 assert.equal(rows[0].label,'Парк, "А"');
 const multi=parseCSV('lat,lon,label\n50.4,30.5,"рядок 1\nрядок 2"');assert.equal(multi[0].label,"рядок 1\nрядок 2");
 assert.throws(()=>parseCSV('lat,lon,label\n50.4,30.5,"broken'));
});
test("coverage includes all ten Kyiv districts and excludes suburbs",()=>{
 const districts=new Set(PLACES.map(p=>districtAt(p)).filter(Boolean));assert.equal(districts.size,10);
 for(const p of PLACES)assert.ok(inCoverage(p),p.label);
 assert.equal(districtAt({lat:50.39766,lng:30.63315}),"Дарницький район");
 assert.equal(inCoverage({lat:50.51,lng:30.79}),false);
 assert.equal(inCoverage({lat:50.5,lng:30.2}),false);
 assert.equal(inCoverage({lat:NaN,lng:30.5}),false);
});
test("bundled municipal snapshots retain source identity, dates, and geometry on both banks",async()=>{
 for(const id of ["bicycle","dogs","toilets"]){
  const d=JSON.parse(await readFile(`public/data/city-${id}.json`,"utf8"));assert.ok(d.features.length>0);assert.equal(d.id,id);assert.ok(Date.parse(d.fetched_at));
  assert.equal(new Set(d.features.map(f=>f.id)).size,d.features.length);
  assert.ok(d.features.some(f=>["Дарницький район","Дніпровський район","Деснянський район"].includes(districtAt(f))),`${id} has left-bank features`);
  for(const f of d.features){assert.ok(f.source);assert.ok(inCoverage(f));assert.equal(f.confirmations,0);for(const line of f.lines||[])for(const[lat,lng]of line)assert.ok(inCoverage({lat,lng}));}
 }
});
test("complete extract has no missing way nodes or seams and routes beyond the centre",async()=>{
 const index=JSON.parse(await readFile("public/data/network-index.json","utf8")),elements=new Map();assert.equal(index.districts.length,10);
 for(const tile of index.tiles){assert.ok(tile.bytes<25_000_000);const data=JSON.parse(await readFile(`public${tile.url}`,"utf8"));for(const e of data.elements)elements.set(`${e.type}-${e.id}`,e);}
 const ways=[...elements.values()].filter(e=>e.type==="way");assert.equal(ways.length,index.ways);
 for(const w of ways)for(const id of w.nodes)assert.ok(elements.has(`node-${id}`),`missing node ${id}`);
 const network={elements:[...elements.values()]};
 const place=name=>{const p=PLACES.find(p=>p.label.includes(name));assert.ok(p,name);return p;};
 for(const[i,j,profile]of [[0,1,"wheelchair"],[5,14,"bicycle"],[10,24,"dog"],[18,19,"stroller"],[15,28,"bicycle"]]){
  const r=route(network,profile,prefs,[],PLACES[i],PLACES[j]);assert.ok(r.coords.length>2);assert.ok(r.distance>=distance(PLACES[i],PLACES[j])*.99);assert.ok(r.startGap<=100&&r.endGap<=100);
 }
 // Cross-river routes must follow actual connected OSM bridge ways.
 const bridgeIds=new Set(ways.filter(w=>w.tags?.bridge&&w.tags.bridge!=="no").map(w=>w.id));
 const cases=[
  [place("Позняки"),place("Осокорки"),"stroller",false],
  [place("Лісова"),place("Чернігівська"),"dog",false],
  [place("Контрактова"),place("Лівобережна"),"bicycle",true],
  [place("Контрактова"),place("Лівобережна"),"wheelchair",true],
 ];
 for(const[a,b,profile,crosses]of cases){
  const r=route(network,profile,prefs,[],a,b);
  assert.ok(r.coords.length>2);assert.ok(r.startGap<=100&&r.endGap<=100);
  assert.ok(r.distance>=distance(a,b)*.99);
  if(crosses)assert.ok(r.steps.some(s=>bridgeIds.has(s.group)),"A connected bridge way is required");
  console.log(`${profile}: ${a.label} → ${b.label}: ${Math.round(r.distance)} m`);
 }
});
process.on("exit",()=>{rmSync(temp,{recursive:true,force:true});});
