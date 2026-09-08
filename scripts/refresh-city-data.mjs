// Refresh the three official municipal snapshots, keeping the last good copy on errors.
import {build} from "esbuild";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
const temp=await mkdtemp(join(tmpdir(),"kyiv-city-import-"));
try{
 const modulePath=join(temp,"city-data.mjs");
 await build({entryPoints:["lib/city-data.ts"],outfile:modulePath,bundle:true,platform:"node",format:"esm"});
 const {fetchCitySource}=await import(pathToFileURL(modulePath).href);
 const results=await Promise.allSettled(["bicycle","dogs","toilets"].map(async id=>{
  const data=await fetchCitySource(id);
  await writeFile(resolve(`public/data/city-${id}.json`),JSON.stringify(data));
  console.log(`${data.name}: ${data.features.length} об’єктів; завантажено ${data.fetched_at}`);
 }));
 for(const r of results)if(r.status==="rejected"){console.error(r.reason.message);process.exitCode=1;}
}finally{await rm(temp,{recursive:true,force:true});}
