// Cross-platform local setup. Uses the same D1/R2 state as the Vite Cloudflare plugin.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync,spawn} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");process.chdir(root);
const [major,minor]=process.versions.node.split(".").map(Number);
if(major<22||major===22&&minor<13){console.error("Потрібен Node.js 22.13 або новіший. Рекомендовано Node.js 24 LTS.");process.exit(1);}
const bin=name=>resolve("node_modules",name,JSON.parse(readFileSync(`node_modules/${name}/package.json`,"utf8")).bin[name]);
function run(name,args,capture=false){
 const r=spawnSync(process.execPath,[bin(name),...args],{cwd:root,stdio:capture?["ignore","pipe","inherit"]:"inherit",encoding:"utf8",env:{...process.env,CI:"true",WRANGLER_SEND_METRICS:"false"}});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(`${name}: команда завершилась з кодом ${r.status}`);return r.stdout;
}
try{
 if(process.argv[2]==="dev"){
  const child=spawn(process.execPath,[bin("vite"),"--host","127.0.0.1","--port","5173","--strictPort"],{cwd:root,stdio:"inherit"});
  child.on("error",e=>{console.error(e.message);process.exitCode=1;});child.on("exit",code=>{process.exitCode=code??0;});
 }else if(process.argv[2]==="setup"){
  mkdirSync(".wrangler",{recursive:true});
  const bindings=JSON.parse(readFileSync(".openai/hosting.json","utf8"));
  const config={name:"dostupnyi-marshrut-local",compatibility_date:"2026-05-15",d1_databases:[{binding:bindings.d1,database_name:"site-creator-d1",database_id:"00000000-0000-4000-8000-000000000000",migrations_dir:resolve("drizzle")}]};
  const configFile=resolve(".wrangler/local-cli.json");writeFileSync(configFile,JSON.stringify(config));
  // Optional override is for isolated maintenance/verification; regular use stays in .wrangler/state.
  const state=resolve(process.env.KYIV_LOCAL_STATE||".wrangler/state");
  const flags=["--local","--config",configFile,"--persist-to",state];
  const sql=command=>JSON.parse(run("wrangler",["d1","execute",bindings.d1,...flags,"--command",command,"--json"],true));
  const tables=sql("SELECT name FROM sqlite_master WHERE type='table'")[0].results.map(r=>r.name);
  const hasReports=tables.includes("reports"),hasVotes=tables.includes("votes");
  if(hasReports!==hasVotes)throw new Error("База має неповну схему. Збережіть .wrangler/state і перевірте попереднє встановлення.");
  if(hasReports){
   for(const[table,required]of [["reports",["id","kind","title","description","lat","lng","role","actor","photo_key","created_at"]],["votes",["report_id","actor","vote","created_at"]]]){
    const columns=sql(`PRAGMA table_info(${table})`)[0].results.map(r=>r.name);if(required.some(c=>!columns.includes(c)))throw new Error(`Невідома схема таблиці ${table}; дані залишено без змін.`);
   }
   // Version 1 instructions applied the initial SQL directly. Record that baseline without recreating tables.
   sql("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL); INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0000_clumsy_manta.sql'); CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at); CREATE INDEX IF NOT EXISTS idx_reports_actor_created ON reports(actor,created_at);");
  }
  run("wrangler",["d1","migrations","apply",bindings.d1,...flags]);
  console.log("Локальна база готова. Наявні повідомлення й фото залишаються у .wrangler/state.");
  console.log("Запуск: npm run local:dev  →  http://127.0.0.1:5173");
 }else throw new Error("Використайте npm run local:setup або npm run local:dev");
}catch(e){console.error(e.message);process.exitCode=1;}
