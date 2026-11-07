import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const runtime = "nodejs";
const usage = new Map<string, {until:number; count:number}>();
const fail = (status:number,error:string) => Response.json({error},{status,headers:{"Cache-Control":"no-store"}});

export async function POST(req:Request) {
  const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return fail(401,"Sign in as a coach.");
  const key=process.env.RESEND_API_KEY, from=process.env.INVITE_FROM;
  let origin:URL;
  try {origin=new URL(process.env.APP_ORIGIN||""); if(origin.protocol!=="https:"||origin.origin!==origin.href.replace(/\/$/,""))throw Error();}
  catch {return fail(503,"Public invitation URL is not configured. No emails sent.");}
  if(!key||!from||!env.supabaseUrl||!env.supabaseAnonKey) return fail(503,"Invitation email is not configured. Use Create links only.");
  const db=createClient(env.supabaseUrl,env.supabaseAnonKey,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user)return fail(401,"Your session has expired.");
  let body;
  try {const raw=await req.text();if(raw.length>30000)return fail(413,"Too many addresses.");body=JSON.parse(raw);}catch{return fail(400,"Invalid invitation request.");}
  if(!body||!Array.isArray(body.addresses)||!body.addresses.length||body.addresses.length>100||
    !["athlete","coach"].includes(body.role)||typeof body.team!=="string"||
    body.addresses.some((e:unknown)=>typeof e!=="string"||e.length>254||!/^\S+@[^@\s]+\.[^@\s]+$/.test(e)))return fail(400,"Enter up to 100 valid addresses and select a team role.");
  const addresses=[...new Set<string>(body.addresses.map((e:string)=>e.trim().toLowerCase()))];
  const now=Date.now();
  for(const [id,b] of usage)if(b.until<=now)usage.delete(id);
  const bucket=usage.get(user.id)||{until:now+3600000,count:0};
  if(bucket.count+addresses.length>200)return fail(429,"Hourly invitation limit reached.");
  bucket.count+=addresses.length;usage.set(user.id,bucket);
  // This RPC authorizes the caller for the selected team and binds each token to its recipient.
  const batch=await db.rpc("beta_bulk_invite",{team_id:body.team,addresses,member_role:body.role});
  if(batch.error)return fail(403,"Invitations could not be created. Check coach access to the selected team.");
  const links=(batch.data as {email:string;token:string}[]).map(r=>({email:r.email,url:origin.origin+"/login?new=1&invite="+encodeURIComponent(r.token)}));
  let accepted=false;
  try {
    const result=await fetch("https://api.resend.com/emails/batch",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},signal:AbortSignal.timeout(15000),
      body:JSON.stringify(links.map(r=>({from,to:[r.email],subject:"Your handball team invitation",text:"Your coach has invited you to join as "+body.role+". Open this private link within seven days and use this email address:\n\n"+r.url})))});
    accepted=result.ok;
  }catch { /* A timeout cannot confirm provider acceptance. Keep the original links available. */ }
  return Response.json({links,accepted},{headers:{"Cache-Control":"no-store"}});
}
