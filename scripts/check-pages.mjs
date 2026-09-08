// Integration check of the static artifact, URL base, tile loader and built worker.
// No browser or running development server is needed.
import assert from "node:assert/strict";
import {readFile,stat,readdir,mkdtemp,rm} from "node:fs/promises";
import {resolve,join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";

const base = process.argv.find(a=>a.startsWith("--base="))?.slice(7) || "/";
assert.ok(base.startsWith("/") && base.endsWith("/"), "Use --base=/REPOSITORY/ or --base=/");
const output = resolve("dist-pages");
const origin = "https://pages-check.invalid";
let checked = 0;

async function localFile(url) {
  const address = new URL(url, origin + base);
  assert.equal(address.origin, origin, `Unexpected external asset: ${url}`);
  assert.ok(address.pathname.startsWith(base), `Asset escapes the Pages base: ${url}`);
  const path = join(output, decodeURIComponent(address.pathname.slice(base.length)));
  assert.ok((await stat(path)).isFile(), `Missing file: ${url}`);
  checked++;
  return path;
}

const html = await readFile(join(output, "index.html"), "utf8");
assert.match(html, /<div id="root"><\/div>/);
assert.ok(!html.includes("%BASE_URL%"), "Unexpanded HTML base");
const styles = [];
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const path = await localFile(match[1]);
  if (path.endsWith(".css")) styles.push([path, new URL(match[1], origin + base).href]);
}
for (const [path, cssUrl] of styles) {
  const css = await readFile(path, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
    if (/^(data:|https?:|#)/.test(match[1])) continue;
    await localFile(new URL(match[1], cssUrl).href);
  }
}
await localFile(base + "vendor/leaflet.js");
await localFile(base + "data/kyiv-pois.json");
const index = JSON.parse(await readFile(await localFile(base + "data/network-index.json"), "utf8"));
assert.equal(index.districts.length, 7);
for (const tile of index.tiles) await localFile(base + tile.url.replace(/^\/+/, ""));
for (const id of ["bicycle", "dogs", "toilets"]) {
  const data = JSON.parse(await readFile(await localFile(`${base}data/city-${id}.json`), "utf8"));
  assert.equal(data.id, id);
  assert.ok(data.features.length > 0 && Date.parse(data.fetched_at));
}

const assets = await readdir(join(output, "assets"));
const appName = assets.find(name=>/^index-.*\.js$/.test(name));
assert.ok(appName, "Missing client bundle");
const app = await readFile(join(output, "assets", appName), "utf8");
for (const api of ["/api/reports", "/api/vote", "/api/sources"]) {
  assert.ok(!app.includes(api), `Static bundle still depends on ${api}`);
}
const workerUrl = app.match(/["'`]([^"'`]*\/assets\/routing-worker-[^"'`]+\.js)["'`]/)?.[1];
assert.ok(workerUrl, "Missing compiled routing worker reference");
const workerSource = await readFile(await localFile(workerUrl), "utf8");

// Exercise the real tile loader against the published files. Every fetch must
// remain beneath the configured project path, even URLs read from the OSM index.
const temp = await mkdtemp(join(tmpdir(), "kyiv-pages-check-"));
const originalFetch = globalThis.fetch;
try {
  const clientPath = join(temp, "network-client.mjs");
  await build({entryPoints:["lib/network-client.ts"],outfile:clientPath,bundle:true,platform:"node",format:"esm",define:{"import.meta.env.BASE_URL":JSON.stringify(base),"import.meta.env.VITE_STATIC_PAGES":JSON.stringify("true")}});
  globalThis.fetch = async url=>new Response(await readFile(await localFile(String(url))), {headers:{"Content-Type":"application/json"}});
  const {loadNetwork} = await import(pathToFileURL(clientPath).href);
  const start = {label:"Золоті ворота",lat:50.44899,lng:30.51336};
  const end = {label:"Парк Шевченка",lat:50.44149,lng:30.51354};
  const network = await loadNetwork(start, end);
  assert.ok(network.elements.length > 1000);
  let reply;
  const worker = {postMessage:value=>{reply=value;}};
  runInNewContext(workerSource, {self:worker}, {timeout:5000});
  worker.onmessage({data:{network,start,end,profile:"wheelchair",prefs:{noSteps:true,gentleSlopes:true,noUnderpasses:true,smoothSurface:true},reports:[]}});
  assert.ok(!reply?.error, reply?.error);
  assert.ok(reply.routes[0].coords.length > 2 && reply.routes[0].distance > 800);
  console.log(`Pages ${base}: ${checked} asset/data checks; ${index.tiles.length} tiles; built worker route ${Math.round(reply.routes[0].distance)} m.`);
} finally {
  globalThis.fetch = originalFetch;
  await rm(temp, {recursive:true,force:true});
}
