import {createClient} from "@supabase/supabase-js";
import {env} from "@/lib/env";
import {discover,type Registration} from "@/lib/nif";

export const maxDuration=300;
const reply=(status:number,message:string)=>Response.json({message},{status,headers:{"Cache-Control":"no-store"}});
async function getNif(){
  const url="https://id.nif.no/connect/token",id=process.env.NIF_CLIENT_ID,secret=process.env.NIF_CLIENT_SECRET;
  if(!id||!secret)throw Error("NIF er ikke tilkoblet. Lagrede kamper og rapportimport er tilgjengelige.");
  const auth=await fetch(url,{method:"POST",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000),headers:{"Content-Type":"application/x-www-form-urlencoded",Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64")},
    body:new URLSearchParams({grant_type:"client_credentials",scope:process.env.NIF_SCOPES||"data_ta_read"})});
  if(!auth.ok)throw Error("NIF avviste autentiseringen.");const token=(await auth.json()).access_token;
  if(typeof token!=="string")throw Error("NIF-token mangler.");
  return async(path:string)=>{const r=await fetch("https://data.nif.no/api/v1/ta/"+path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000),headers:{Authorization:"Bearer "+token}});
    if(!r.ok||r.status===204)throw Error("NIF "+r.status);return r.json();};
}
export async function POST(req:Request){
  const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)return reply(401,"Logg inn som trener.");
  const cron=!!process.env.MATCH_CRON_SECRET&&token===process.env.MATCH_CRON_SECRET;
  const opts={auth:{persistSession:false,autoRefreshToken:false}};
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serviceKey||!env.supabaseUrl)return reply(503,"NIF er ikke tilkoblet. Manuell registrering er tilgjengelig.");
  const service=createClient(env.supabaseUrl,serviceKey,opts);
  const userDb=cron?service:createClient(env.supabaseUrl,env.supabaseAnonKey,{...opts,global:{headers:{Authorization:"Bearer "+token}}});
  if(!cron&&(await userDb.auth.getUser(token)).error)return reply(401,"Logg inn på nytt.");
  let input;try{input=await req.json();}catch{return reply(400,"Ugyldig forespørsel.");}
  const {data:targets,error:targetError}=await service.rpc("beta_sync_targets");
  if(targetError)return reply(500,"Kan ikke hente aktive sesonger.");
  if(cron&&input?.list)return Response.json({ids:targets});
  if(!/^[a-f0-9-]{36}$/i.test(input?.id||""))return reply(400,"Velg et registrert lag.");
  const {data:r}=await userDb.from("beta_team_seasons").select("*").eq("active",true).eq("id",input.id).maybeSingle();
  if(!r||!Array.isArray(targets)||!targets.includes(r.id))return reply(403,"Velg et lag i den lagrede sesongen.");
  try{
    const allowed=JSON.parse(process.env.NIF_ALLOWED_TEAMS||"{}");
    const includePlayers=Array.isArray(allowed[r.team])&&allowed[r.team].includes(r.org_id)&&(process.env.NIF_SCOPES||"").split(/\s+/).includes("data_ta_person_read");
    const get=await getNif();
    const {data:known}=await service.from("beta_matches").select("nif_id").eq("registration",r.id).throwOnError();
    const message=await discover(r as Registration,known.map(x=>x.nif_id),get,async(f,people,authoritative)=>{
      await service.rpc("beta_import_fixture",{rid:r.id,f,people,authoritative}).throwOnError();
    },includePlayers);
    await service.from("beta_team_seasons").update({synced_at:new Date().toISOString(),sync_result:message}).eq("id",r.id).throwOnError();
    return reply(200,message);
  }catch(e){
    const msg=e instanceof Error&&/^(NIF|Ufullstendig|Uventet)/.test(e.message)?e.message:"Synkronisering mislyktes. Prøv igjen.";
    await service.from("beta_team_seasons").update({sync_result:msg}).eq("id",r.id);
    return reply(503,msg);
  }
}
