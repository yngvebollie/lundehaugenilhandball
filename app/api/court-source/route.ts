import {createClient} from "@supabase/supabase-js";
import {env} from "@/lib/env";
import {fetchNHF} from "@/lib/court/source";
export async function POST(req:Request){
 const fail=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
 if(process.env.COURT_NHF_IMPORT!=="true")return fail(503,"NHF-import er ikke aktivert.");const auth=req.headers.get("authorization");
 if(!auth?.startsWith("Bearer "))return fail(401,"Logg inn som klubbadministrator.");
 try{const {team,action,previewHash}=await req.json();if(!["preview","import"].includes(action))return fail(400,"Ukjent importhandling.");
 const db=createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
 const approved=(await db.rpc("beta_court_source",{t:team,action:"check"}).throwOnError()).data;if(!approved?.approved)return fail(403,"Godkjent rettighetsgrunnlag mangler.");
 const rows=await fetchNHF();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(rows))))).map(n=>n.toString(16).padStart(2,"0")).join("");
 if(action==="import"&&previewHash!==digest)return fail(409,"Kilden er endret. Kjør prøveimport på nytt.");
 const result=(await db.rpc("beta_court_source",{t:team,action,rows}).throwOnError()).data;return Response.json({...result,digest},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return fail(400,e&&typeof e==="object"&&"message" in e?String(e.message):"Import avbrutt.");}
}
