"""Maintenance: import all ten Kyiv districts from a full Ukraine PBF.
pip install osmium shapely; python scripts/import-kyiv.py /path/ukraine-latest.osm.pbf
Source: https://download.geofabrik.de/europe/ukraine.html (ODbL).
No raster tiles or contributor identities. The BBBike Kyiv extract omits city outskirts.
"""
import datetime
import json
import math
import sys
from pathlib import Path
import osmium
from shapely.geometry import LineString, MultiPolygon, Point, mapping
from shapely.ops import polygonize, unary_union
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parents[1]
DISTRICTS = {1754513, 1754514, 1754751, 1754928, 1754975, 1755013, 1755014, 1754757, 1754781, 1754820}
KEYS = set(('name name:uk highway footway access foot stroller wheelchair sidewalk '
    'surface smoothness incline width kerb kerb:height tunnel barrier conveying '
    'oneway oneway:foot oneway:bicycle junction bicycle bicycle:forward bicycle:backward '
    'cycleway cycleway:left cycleway:right cycleway:both cycleway:left:oneway cycleway:right:oneway '
    'dog leash leisure amenity crossing lit bridge ramp ramp:wheelchair '
    'toilets:wheelchair drinking_water opening_hours fee access:conditional foot:conditional '
    'bicycle:conditional dog:conditional vehicle vehicle:conditional motorroad').split())
LEFT_STATIONS = {'Позняки', 'Осокорки', 'Харківська', 'Славутич', 'Лівобережна', 'Дарниця', 'Чернігівська', 'Лісова', 'Вирлиця', 'Бориспільська', 'Червоний хутір'}
AMENITIES = {'bench', 'toilets', 'bicycle_parking', 'bicycle_repair_station', 'drinking_water'}

def tags(t): return {v.k: v.v for v in t if v.k in KEYS}
def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

class Boundaries(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.relations = {}; self.way_ids = set()
    def relation(self, r):
        if r.id in DISTRICTS:
            members = [(m.ref, m.role) for m in r.members if m.type == 'w']
            self.relations[r.id] = {'name': r.tags.get('name:uk', r.tags.get('name')), 'members': members}
            self.way_ids.update(i for i, _ in members)

class Extract(osmium.SimpleHandler):
    def __init__(self, borders):
        super().__init__(); self.nodes = {}; self.ways = {}; self.boundaries = {}; self.border_ids = borders.way_ids; self.landmarks = {}
    def node(self, n):
        if 50.17 <= n.lat <= 50.67 and 30.17 <= n.lon <= 30.88:
            e = {'type': 'node', 'id': n.id, 'lat': round(n.lat, 7), 'lon': round(n.lon, 7)}
            t = tags(n.tags)
            if t: e['tags'] = t
            self.nodes[n.id] = e
            name = n.tags.get('name:uk', n.tags.get('name'))
            if name in LEFT_STATIONS and n.tags.get('railway') == 'station' and n.tags.get('station') == 'subway':
                self.landmarks[name] = {'label': f'Метро «{name}»', 'lat': e['lat'], 'lng': e['lon'],
                    'source': f'https://www.openstreetmap.org/node/{n.id}'}
    def way(self, w):
        if w.id in self.border_ids: self.boundaries[w.id] = [n.ref for n in w.nodes]
        h = w.tags.get('highway')
        if (h and h not in {'construction', 'proposed', 'motorway', 'motorway_link', 'trunk', 'trunk_link'}
            or w.tags.get('amenity') in AMENITIES or w.tags.get('leisure') in {'dog_park', 'park'}):
            ids = [n.ref for n in w.nodes]
            if any(i in self.nodes for i in ids): self.ways[w.id] = {'type': 'way', 'id': w.id, 'nodes': ids, 'tags': tags(w.tags)}

def main():
    pbf = sys.argv[1]
    reader = osmium.io.Reader(pbf); timestamp = reader.header().get('osmosis_replication_timestamp'); reader.close()
    if not timestamp: raise RuntimeError('PBF must declare its OSM replication timestamp')
    borders = Boundaries(); borders.apply_file(pbf)
    if len(borders.relations) != len(DISTRICTS): raise RuntimeError('All ten Kyiv district relations are required')
    print('District boundaries found; reading region nodes and ways…', flush=True)
    extract = Extract(borders); extract.apply_file(pbf)
    print(f"Read {len(extract.nodes)} regional nodes and {len(extract.ways)} candidate ways; clipping to Kyiv…", flush=True)
    regions, polygons = [], []
    for rid, relation in sorted(borders.relations.items()):
        lines = {'outer': [], 'inner': []}
        for wid, role in relation['members']:
            ids = extract.boundaries.get(wid)
            if not ids or any(i not in extract.nodes for i in ids):
                raise RuntimeError(f'Incomplete district {rid}: boundary way {wid}; use the full Ukraine PBF')
            coords = [(extract.nodes[i]['lon'], extract.nodes[i]['lat']) for i in ids]
            lines['inner' if role == 'inner' else 'outer'].append(LineString(coords))
        geom = unary_union(list(polygonize(lines['outer'])))
        if lines['inner']: geom = geom.difference(unary_union(list(polygonize(lines['inner']))))
        if geom.is_empty or not geom.is_valid: raise RuntimeError(f'Invalid district {rid}')
        if geom.geom_type == 'Polygon': geom = MultiPolygon([geom])
        polygons.append(geom)
        simplified = geom.simplify(.000025, preserve_topology=True)
        if simplified.geom_type == "Polygon": simplified = MultiPolygon([simplified])
        regions.append({'type': 'Feature', 'properties': {'id': rid, 'name': relation['name'],
            'source': f'https://www.openstreetmap.org/relation/{rid}'}, 'geometry': mapping(simplified)})
    region = unary_union(polygons); inside = prep(region)
    valid_ids = {i for i, n in extract.nodes.items() if inside.covers(Point(n['lon'], n['lat']))}
    ways = [w for w in extract.ways.values() if any(i in valid_ids for i in w['nodes'])]
    needed = {i for w in ways for i in w['nodes']}
    pois = [n for i, n in extract.nodes.items() if i in valid_ids and
        (n.get('tags', {}).get('amenity') in AMENITIES or n.get('tags', {}).get('leisure') == 'dog_park'
         or n.get('tags', {}).get('highway') == 'elevator' or n.get('tags', {}).get('kerb') == 'raised')]
    nodes = {i: n for i, n in extract.nodes.items() if i in needed}
    for i, n in nodes.items():
        if i not in valid_ids: n['in_region'] = False
    # Duplicate intersecting ways with all referenced nodes at tile seams.
    cells = {}
    for way in ways:
        coords = [nodes[i] for i in way['nodes'] if i in nodes]
        if len(coords) != len(way['nodes']): raise RuntimeError(f'Incomplete way {way["id"]}; increase the import bounding box')
        s, n = min(p['lat'] for p in coords), max(p['lat'] for p in coords)
        w, e = min(p['lon'] for p in coords), max(p['lon'] for p in coords)
        for row in range(math.floor(s/.04), math.floor(n/.04)+1):
            for col in range(math.floor(w/.06), math.floor(e/.06)+1): cells.setdefault((row, col), []).append(way)
    out = ROOT/'public/data/network'; out.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat(); index = []
    for (row, col), tile_ways in sorted(cells.items()):
        ids = {i for way in tile_ways for i in way['nodes']}
        box = [round(row*.04, 6), round(col*.06, 6), round((row+1)*.04, 6), round((col+1)*.06, 6)]
        filename = f'{row}-{col}.json'
        data = {'elements': tile_ways + [nodes[i] for i in sorted(ids)], 'osm3s': {'timestamp_osm_base': timestamp},
                'prototype_meta': {'bounds': box, 'retrieved_at': retrieved, 'scope': 'kyiv-city'}}
        write(out/filename, data)
        index.append({'url': f'/data/network/{filename}', 'bounds': box, 'bytes': (out/filename).stat().st_size})
    write(ROOT/'lib/kyiv-boundary.json', {'type': 'FeatureCollection', 'features': regions})
    write(ROOT/'lib/left-bank-places.json', [extract.landmarks[name] for name in sorted(extract.landmarks)])
    poi_ways = [w for w in ways if w['tags'].get('amenity') in AMENITIES or w['tags'].get('leisure') in {'dog_park', 'park'}
                or w['tags'].get('highway') in {'steps', 'elevator'} or w['tags'].get('tunnel') == 'yes']
    poi_ids = {i for w in poi_ways for i in w['nodes']}; poi_nodes = {n['id']: n for n in pois}
    poi_nodes.update({i: nodes[i] for i in poi_ids if i in nodes})
    bounds = [region.bounds[1], region.bounds[0], region.bounds[3], region.bounds[2]]
    meta = {'bounds': bounds, 'retrieved_at': retrieved, 'scope': 'kyiv-city'}
    write(ROOT/'public/data/kyiv-pois.json', {'elements': poi_ways+list(poi_nodes.values()), 'osm3s': {'timestamp_osm_base': timestamp}, 'prototype_meta': meta})
    write(ROOT/'public/data/network-index.json', {**meta, 'osm_timestamp': timestamp,
        'source': 'https://download.geofabrik.de/europe/ukraine.html', 'license': 'ODbL-1.0',
        'districts': [r['properties']['name'] for r in regions], 'ways': len(ways), 'nodes': len(nodes), 'tiles': index})
    # Remove only obsolete generated tiles after a complete successful import.
    expected = {Path(t['url']).name for t in index}
    for old in out.glob('*.json'):
        if old.name not in expected: old.unlink()
    print(json.dumps({'districts': len(regions), 'ways': len(ways), 'nodes': len(nodes), 'tiles': len(index),
        'bytes': sum(t['bytes'] for t in index), 'bounds': bounds, 'osm_timestamp': timestamp}, ensure_ascii=False), flush=True)

if __name__ == '__main__': main()
