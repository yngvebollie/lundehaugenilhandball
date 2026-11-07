import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
import {env} from "@/lib/env";
import {parseReport} from "@/lib/nhf-report.mjs";
export const runtime="nodejs";
export const maxDuration=120;
const max=4_000_000;
const reply=(status:number,data:unknown)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
  const id=new URL(req.url).searchParams.get("match");
  const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!id)return reply(400,{error:"Velg kamp først."});
  if(env.supabaseUrl){
    if(!token)return reply(401,{error:"Logg inn som trener."});
    const client=createClient(env.supabaseUrl,env.supabaseAnonKey,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
    if((await client.auth.getUser(token)).error)return reply(401,{error:"Logg inn på nytt."});
    const q=await client.from("beta_matches").select("id").eq("id",id).maybeSingle();
    if(!q.data)return reply(403,{error:"Ingen tilgang til kampen."});
  }else if(process.env.NHF_LOCAL_REPORTS!=="1")return reply(403,{error:"PDF krever trenerinnlogging. Innlimt tekst fungerer i demo."});
  if(req.headers.get("content-type")!=="application/pdf"||Number(req.headers.get("content-length"))>max)return reply(413,{error:"Velg en PDF under 4 MB."});
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:"Tom fil."});
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();return reply(413,{error:"Maksimalt 4 MB."});}chunks.push(value);}
  const bytes=Buffer.concat(chunks);
  if(bytes.subarray(0,5).toString()!=="%PDF-")return reply(400,{error:"Ugyldig PDF."});
  try{const report=await parseReport(bytes);return reply(200,{report,digest:createHash("sha256").update(bytes).digest("hex")});}
  catch{return reply(422,{error:"PDF-en kunne ikke leses. Lim inn tabellen eller prøv en annen rapport."});}
}
