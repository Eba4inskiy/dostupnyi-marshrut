import {database,bucket,actorId,sameOrigin,apiError} from "@/lib/storage";
import {KIND_LABELS} from "@/lib/routing";
import {inCoverage} from "@/lib/region";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const actor=await actorId(request);const rows=await database().prepare(`SELECT r.id,r.kind,r.title,r.description,r.lat,r.lng,r.role,r.photo_key,r.created_at,
 (SELECT COUNT(*) FROM votes v WHERE v.report_id=r.id AND v.vote='confirm') AS confirmations,
 (SELECT COUNT(*) FROM votes v WHERE v.report_id=r.id AND v.vote='resolved') AS resolved,
 (SELECT vote FROM votes v WHERE v.report_id=r.id AND v.actor=?) AS my_vote
 FROM reports r ORDER BY r.created_at DESC LIMIT 500`).bind(actor.id).all();return Response.json({reports:rows.results},{headers:{"Cache-Control":"no-store",...(actor.cookie?{"Set-Cookie":actor.cookie}:{})}});}catch(e){return apiError(e);}}
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:"Недозволене джерело запиту"},{status:403});
 if(Number(request.headers.get("content-length"))>6*1024*1024)return Response.json({error:"Фото має бути меншим за 5 МБ."},{status:413});
 try{const form=await request.formData();const id=String(form.get("id")||"");if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:"Некоректний ідентифікатор"},{status:400});
 const kind=String(form.get("kind")||"");const title=String(form.get("title")||"").trim();const description=String(form.get("description")||"").trim();const lat=Number(form.get("lat")),lng=Number(form.get("lng"));const role=String(form.get("role")||"");
 if(!Object.hasOwn(KIND_LABELS,kind)||!title||title.length>100||description.length>1200||!inCoverage({lat,lng})||!["Мешканець / мешканка","Бізнес","Громада"].includes(role))return Response.json({error:"Перевірте назву, координати в межах Києва та тип повідомлення."},{status:400});
 const actor=await actorId(request);const db=database();const existing=await db.prepare("SELECT id FROM reports WHERE id=? AND actor=?").bind(id,actor.id).first();if(existing)return Response.json({id});
 const since=new Date(Date.now()-3600000).toISOString();const count=await db.prepare("SELECT COUNT(*) AS total FROM reports WHERE actor=? AND created_at>?").bind(actor.id,since).first<{total:number}>();if((count?.total||0)>=10)return Response.json({error:"Ви додали 10 повідомлень за годину. Спробуйте пізніше."},{status:429});
 const photo=form.get("photo");let photoKey:string|null=null;
 if(photo instanceof File&&photo.size){if(photo.size>5*1024*1024)return Response.json({error:"Максимальний розмір фото — 5 МБ."},{status:400});const bytes=new Uint8Array(await photo.arrayBuffer());let type="";if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type="image/jpeg";else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)type="image/png";else if(new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP")type="image/webp";
 if(!type)return Response.json({error:"Додайте фото у форматі JPG, PNG або WebP."},{status:400});photoKey=`reports/${id}`;await bucket().put(photoKey,bytes,{httpMetadata:{contentType:type}});}
 try{await db.prepare("INSERT INTO reports (id,kind,title,description,lat,lng,role,actor,photo_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,kind,title,description,lat,lng,role,actor.id,photoKey,new Date().toISOString()).run();}catch(e){if(photoKey)await bucket().delete(photoKey);throw e;}
 return Response.json({id},{status:201,headers:actor.cookie?{"Set-Cookie":actor.cookie}:{}});
 }catch(e){return apiError(e);}}
