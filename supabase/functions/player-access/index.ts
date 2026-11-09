// Only this function has the admin credential. Never accept a target account ID or a role from the caller.
const base=Deno.env.get("SUPABASE_URL")!, secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Cache-Control":"no-store"};
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:cors});
async function admin(path:string,body:unknown,method="POST"){
 return fetch(base+path,{method,headers:{apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
async function hash(value:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return reply(405,{error:"Ugyldig forespørsel."});
 try{
  const raw=await req.text();if(raw.length>4000)return reply(400,{error:"Ugyldig forespørsel."});
  const b=JSON.parse(raw);if(typeof b.password!=="string"||b.password.length<8||new TextEncoder().encode(b.password).length>72)return reply(400,{error:"Bruk et passord på minst 8 tegn og maksimalt 72 byte."});
  if(b.action==="reset"){
   if(typeof b.code!=="string"||!/^([a-f0-9-]{36}){2}$/.test(b.code))return reply(400,{error:"Ugyldig tilbakestillingslenke."});
   const result=await admin("/rest/v1/rpc/beta_use_player_reset",{code:b.code}),id=result.ok?await result.json():null;
   if(!id)return reply(400,{error:"Lenken er utløpt, erstattet eller allerede brukt."});
   const changed=await admin("/auth/v1/admin/users/"+encodeURIComponent(id),{password:b.password},"PUT");
   return changed.ok?reply(200,{ok:true}):reply(400,{error:"Kunne ikke oppdatere passordet. Be treneren om en ny lenke."});
  }
  const email=String(b.email||"").trim().toLowerCase(),name=String(b.name||"").trim(),phone=String(b.phone||"").trim(),kind=String(b.kind||"none"),cred=String(b.token||"");
  if(b.action!=="register"||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254||email.endsWith(".invalid")||name.length<1||name.length>100||!/^\+?[0-9 ().-]{7,30}$/.test(phone)||!/^\d{7,15}$/.test(phone.replace(/\D/g,""))||!["link","email","athlete_code","none"].includes(kind)||cred.length>64)return reply(400,{error:"Kontroller navn, telefon, e-post og invitasjon."});
  const check=await admin("/rest/v1/rpc/beta_player_enroll_check",{addr:email,k:kind,cred,ip_hash:await hash(req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown")});
  if(!check.ok)return reply(503,{error:"Innmelding er midlertidig utilgjengelig."});
  const mode=await check.json();if(mode==="coach")return reply(200,{coach:true});
  if(mode==="limit")return reply(429,{error:"For mange forsøk. Prøv igjen senere."});
  if(mode!=="athlete")return reply(400,{error:"Kan ikke opprette konto. Logg inn hvis du har en konto, eller kontroller laginvitasjonen."});
  const login="p."+(await hash(email)).slice(0,60)+"@players.lundehaugenil.invalid";
  const user_metadata={full_name:name,given_name:String(b.given||"").slice(0,100),family_name:String(b.family||"").slice(0,100),shirt_number:/^[1-9][0-9]{0,2}$/.test(b.shirt)?b.shirt:null,contact_phone:phone,...(kind==="none"?{}:{club_invite_kind:kind,club_invite_token:cred})};
  const created=await admin("/auth/v1/admin/users",{email:login,password:b.password,email_confirm:true,app_metadata:{club_login:"athlete",contact_email:email},user_metadata});
  if(!created.ok)return reply(400,{error:"Kunne ikke opprette konto. Kontroller passordet eller logg inn med eksisterende konto."});
  return reply(200,{login});
 }catch{return reply(400,{error:"Kunne ikke behandle forespørselen."});}
});
