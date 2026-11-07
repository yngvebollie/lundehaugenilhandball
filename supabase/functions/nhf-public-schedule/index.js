import {selectFixtures} from "./fixtures.mjs";

const reply=(status,message)=>Response.json({message},{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
Deno.serve(async req=>{
  if(req.method!=="POST")return reply(405,"Bruk POST.");
  const token=req.headers.get("authorization");
  try{
    const root=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!root||!anon||!service)return reply(503,"Terminlisteleseren er ikke konfigurert.");
    const {id,job}=await req.json();if(!uuid.test(id))return reply(400,"Velg et spillelag.");
    const opts={redirect:"error",signal:AbortSignal.timeout(14000)},server={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
    let r,actor=null,sid=null;
    if(job){
      if(!uuid.test(job))return reply(403,"Ugyldig synkroniseringsjobb.");
      const authJob=await fetch(root+"/rest/v1/rpc/beta_claim_schedule_job",{...opts,headers:server,method:"POST",body:JSON.stringify({reg:id,job})});
      if(!authJob.ok)return reply(403,"Jobben er ugyldig, utløpt eller brukt.");r=await authJob.json();
    }else{
      if(!token||!/^Bearer [^ ]+$/i.test(token))return reply(401,"Logg inn som trener.");
      const headers={apikey:anon,Authorization:token};
      const user=await fetch(root+"/auth/v1/user",{...opts,headers});if(!user.ok)return reply(401,"Logg inn på nytt.");
      actor=(await user.json()).id;
      const payload=token.split(".")[1].replaceAll("-","+").replaceAll("_","/");sid=JSON.parse(atob(payload)).session_id;
      const res=await fetch(root+"/rest/v1/beta_team_seasons?select=id,team,org_id,season,leagues,active,synced_at,sync_result&active=eq.true&id=eq."+id,{...opts,headers});
      if(!res.ok)return reply(403,"Ingen tilgang til spillelaget.");[r]=await res.json();if(!r)return reply(403,"Ingen tilgang til spillelaget.");
      const season=await fetch(root+"/rest/v1/rpc/beta_season_settings",{...opts,method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({action:"read",t:r.team})});
      if(!season.ok||(await season.json()).active!==r.season)return reply(403,"Velg lagets lagrede sesong.");
    }
    if(Date.now()-Date.parse(r.synced_at)<60000)return reply(200,r.sync_result||"Nylig oppdatert.");
    if(!Number.isInteger(r.org_id)||r.org_id<1||!Number.isInteger(r.season)||r.season<1)return reply(400,"Ugyldige NIF-ID-er.");
    const u=new URL("https://www.handball.no/api/AjaxData/TerminListeForTeam");
    u.search=new URLSearchParams({id:String(r.org_id),seasonId:String(r.season),width:"1280"}).toString();
    const upstream=await fetch(u,{...opts,headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}});
    if(!upstream.ok)return reply(502,"NHFs offentlige terminliste er utilgjengelig. Lagrede kamper er beholdt.");
    const raw=await upstream.text();if(raw.length>4000000)return reply(502,"Terminlisten er for stor.");
    const fixtures=selectFixtures(JSON.parse(raw),r);
    const result=await fetch(root+"/rest/v1/rpc/beta_save_published_schedule",{method:"POST",redirect:"error",signal:AbortSignal.timeout(20000),
      headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({reg:r.id,actor,sid:uuid.test(sid)?sid:null,items:fixtures,job:job||null})});
    if(!result.ok)return reply(502,"Terminlisten kunne ikke lagres. Kontroller lag, serie og aktiv sesong.");
    return reply(200,await result.json());
  }catch{return reply(502,"Kunne ikke hente en verifisert terminliste fra NHF. Lagrede kamper er beholdt.");}
});
