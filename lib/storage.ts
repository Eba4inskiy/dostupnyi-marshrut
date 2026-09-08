import { env } from "cloudflare:workers";
export function database(){if(!env.DB)throw new Error("Reports database unavailable");return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error("Photo storage unavailable");return env.BUCKET;}
export async function actorId(request:Request){
 const account=request.headers.get("oai-authenticated-user-email");
 if(account){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(account.toLowerCase()));return{id:Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join(""),cookie:null};}
 const existing=request.headers.get("cookie")?.match(/(?:^|;\s*)route_actor=([a-f0-9-]{36})(?:;|$)/)?.[1];const id=existing||crypto.randomUUID();
 return{id,cookie:existing?null:`route_actor=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`};
}
export function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin;}
export function apiError(error:unknown){console.error("Dostupnyi route API",error instanceof Error?error.message:"unknown error");return Response.json({error:"Не вдалося з’єднатися зі сховищем. Ваші дані залишилися у формі. Спробуйте ще раз."},{status:503});}
