import boundary from "./kyiv-boundary.json";
export const KYIV_DISTRICTS = boundary;
type Position = {lat: number; lng: number};
const districts = boundary.features.map(f => {
  const coords = f.geometry.coordinates.flat(2);
  return {name: f.properties.name, polygons: f.geometry.coordinates,
    s: Math.min(...coords.map(p => p[1])), n: Math.max(...coords.map(p => p[1])),
    w: Math.min(...coords.map(p => p[0])), e: Math.max(...coords.map(p => p[0]))};
});
function ringContains(p: Position, ring: number[][]) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if ((yi>p.lat)!==(yj>p.lat) && p.lng<(xj-xi)*(p.lat-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
export function districtAt(p: Position) {
  if (!Number.isFinite(p.lat)||!Number.isFinite(p.lng)) return null;
  return districts.find(d=>p.lat>=d.s && p.lat<=d.n && p.lng>=d.w && p.lng<=d.e &&
    d.polygons.some(rings=>ringContains(p,rings[0])&&!rings.slice(1).some(r=>ringContains(p,r))))?.name ?? null;
}
export function inCoverage(p: Position) { return districtAt(p)!==null; }
export const COVERAGE_BOUNDS = {
  south: Math.min(...districts.map(d=>d.s)), north: Math.max(...districts.map(d=>d.n)),
  west: Math.min(...districts.map(d=>d.w)), east: Math.max(...districts.map(d=>d.e))
};
