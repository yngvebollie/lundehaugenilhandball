import { createClient } from "@supabase/supabase-js";
import { instructions, parseDraft, schemas, type Mode } from "@/lib/coach-ai";
import { env } from "@/lib/env";

export const runtime="nodejs";
const usage=new Map<string,{until:number;count:number}>();
function allow(user:string){
  const now=Date.now();
  for(const [id,b] of usage)if(b.until<=now)usage.delete(id);
  const bucket=usage.get(user)||{until:now+3600000,count:0};
  if(bucket.count>=20)return false;
  bucket.count++;usage.set(user,bucket);return true;
}
const fail=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
  const key=process.env.OPENAI_API_KEY;
  if(!key)return fail(503,"Set OPENAI_API_KEY on the server to enable live generation, or import a ChatGPT draft below.");
  if(!env.supabaseUrl||!env.supabaseAnonKey)return fail(503,"Live generation requires a signed-in coach. In the local demo, use the ChatGPT import.");
  const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return fail(401,"Sign in as a coach to generate a draft.");
  const client=createClient(env.supabaseUrl,env.supabaseAnonKey,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user)return fail(401,"Your session has expired. Sign in again.");
  const member=await client.from("beta_members").select("role").eq("id",user.id).maybeSingle();
  if(member.error)return fail(503,"Coach access could not be verified.");
  if(member.data?.role!=="coach")return fail(403,"Coach access required.");
  if(Number(req.headers.get("content-length"))>48000)return fail(413,"Shorten the request.");
  let body;
  try{const raw=await req.text();if(raw.length>16000)return fail(413,"Shorten the request.");body=JSON.parse(raw);}catch{return fail(400,"Invalid request.");}
  if(!body||!["rewrite","program","exercise"].includes(body.mode)||typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.length>8000)return fail(400,"Provide a training brief under 8000 characters.");
  const mode:Mode=body.mode;
  if(!allow(user.id))return fail(429,"Hourly draft limit reached. Try again later.");
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},signal:AbortSignal.timeout(60000),cache:"no-store",
      body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5-mini",store:false,max_output_tokens:5000,instructions:instructions(mode),input:body.prompt,
        text:{format:{type:"json_schema",name:"coach_"+mode,strict:true,schema:schemas[mode]}}})
    });
    if(!response.ok)return fail(response.status===429?429:502,response.status===429?"OpenAI usage or billing limit reached.":"OpenAI could not generate this draft. Check the server key and model access.");
    const result=await response.json();
    if(result.status!=="completed")return fail(422,"Incomplete draft. Try requesting fewer sessions.");
    for(const item of result.output||[]){
      if(item.type!=="message")continue;
      for(const part of item.content||[]){
        if(part.type==="refusal")return fail(422,"The model declined this request. Revise your brief.");
        if(part.type==="output_text")return Response.json(parseDraft(mode,part.text),{headers:{"Cache-Control":"no-store"}});
      }
    }
    return fail(422,"No draft returned. Try a different brief.");
  }catch{return fail(502,"The AI request timed out or returned an unusable draft. Try again.");}
}
