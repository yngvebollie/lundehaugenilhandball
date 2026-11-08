import {env} from "@/lib/env";
const reply=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(req:Request){
 const authorization=req.headers.get("authorization");
 if(!authorization||!/^Bearer \S+$/.test(authorization))return reply(401,"Logg inn for å se utviklingsplanen.");
 if(process.env.DEVELOPMENT_ENABLED!=="true"||!env.supabaseUrl||!env.supabaseAnonKey)return reply(503,"Min utvikling er ikke aktivert.");
 if(Number(req.headers.get("content-length")||0)>14000)return reply(413,"For stor forespørsel.");
 try{
  const body=await req.text();if(body.length>14000)return reply(413,"For stor forespørsel.");
  const res=await fetch(env.supabaseUrl+"/functions/v1/club-development",{method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20000),
   headers:{apikey:env.supabaseAnonKey,Authorization:authorization,"Content-Type":"application/json"},body});
  if(res.status===401)return reply(401,"Logg inn på nytt.");
  if(!res.headers.get("content-type")?.includes("application/json"))return reply(502,"Utviklingstjenesten svarte ikke.");
  return Response.json(await res.json(),{status:res.status,headers:{"Cache-Control":"private, no-store"}});
 }catch{return reply(503,"Ingen forbindelse til utviklingstjenesten. Prøv igjen.");}
}
