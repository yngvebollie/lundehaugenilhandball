import {createClient} from "@supabase/supabase-js";
import {env} from "@/lib/env";
import {parsePublicMatchEvents} from "@/lib/nhf-public-events";
import type {OpponentWatch,WatchedGame} from "@/lib/opponent-watch";
import {selectFixtures} from "../../../../supabase/functions/nhf-public-schedule/fixtures.mjs";

export const maxDuration=90;
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validId=(value:unknown):value is number=>typeof value==="number"&&Number.isInteger(value)&&value>0&&value<=2147483647;
const reply=(status:number,message:string)=>Response.json({message},{status,headers:{"Cache-Control":"no-store"}});

export async function POST(req:Request){
  const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)return reply(401,"Logg inn som trener.");
  let input;try{input=await req.json();}catch{return reply(400,"Ugyldig registrering.");}
  const {team,season,org,leagues,action}=input??{};
  if(typeof team!=="string"||!uuid.test(team)||!validId(season)||!validId(org)||
    !Array.isArray(leagues)||leagues.length>20||!leagues.every(validId)||!["preview","save","sync"].includes(action))
    return reply(400,"Velg treningsgruppe, sesong og gyldige NHF-ID-er.");
  const db=createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:"Bearer "+token}}});
  const {data:settings,error:accessError}=await db.rpc("beta_season_settings",{action:"read",t:team});
  if(accessError)return reply(403,"Trenertilgang kreves for denne gruppen.");
  if(settings?.active!==season&&!settings?.options?.some((option:{id:number})=>option.id===season))
    return reply(400,"Velg en sesong som er registrert for treningsgruppen.");
  try{
    const key={team,season,org_id:org};
    const {data:existing}=await db.from("beta_opponent_watches").select("*").match(key).maybeSingle().throwOnError();
    const old=existing as OpponentWatch|null;
    if(old&&action==="save")return Response.json(old,{headers:{"Cache-Control":"no-store"}});
    if(action==="sync"&&!old)return reply(404,"Motstanderen er ikke registrert.");
    if(old&&action==="sync"&&Date.now()-Date.parse(old.synced_at)<60000)
      return Response.json(old,{headers:{"Cache-Control":"no-store"}});
    const ids=action==="sync"?old!.leagues:[...new Set<number>(leagues)];
    const url=new URL("https://www.handball.no/api/AjaxData/TerminListeForTeam");
    url.search=new URLSearchParams({id:String(org),seasonId:String(season),width:"1280"}).toString();
    const upstream=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(14000),
      headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}});
    if(!upstream.ok)return reply(502,"NHFs terminliste er utilgjengelig. Lagrede kamper er beholdt.");
    const raw=await upstream.text();
    if(raw.length>4000000)return reply(502,"NHFs terminliste er for stor.");
    const rows=selectFixtures(JSON.parse(raw),{season,org_id:org,leagues:ids});
    const first=rows[0];
    if(!first)return reply(404,"Ingen kamper funnet for denne kombinasjonen av lag, sesong og turnering.");
    const name=first.opponent===first.away?first.home:first.away;
    if(action==="preview")return Response.json({name,existing:!!old,total:rows.length,
      competitions:[...new Set(rows.map(row=>row.competition).filter(Boolean))]},{headers:{"Cache-Control":"no-store"}});
    const previous=new Map(old?.fixtures.map(item=>[item.game.nif_id,item]));
    const fixtures:WatchedGame[]=rows.map(row=>{
      const game={id:"nhf-"+row.id,team,lineup:[],nif_id:row.id,day:row.day,start_time:row.time??undefined,
        home:row.home,away:row.away,opponent:row.opponent,competition:row.competition,age_class:row.age,
        venue:row.venue,score:row.score??undefined,status:row.status,completed:row.completed};
      const saved=previous.get(row.id);
      return {game,...(saved?.game.score===game.score?{log:saved?.log,checked:saved?.checked}:{})};
    });
    const queue=fixtures.filter(item=>item.game.completed&&!item.log)
      .sort((a,b)=>(a.checked??0)-(b.checked??0)||b.game.day.localeCompare(a.game.day));
    const deadline=Date.now()+50000;
    const scan=async()=>{
      while(queue.length&&Date.now()<deadline){
        const item=queue.shift()!;
        item.checked=Date.now();
        try{
          const match=new URL("https://www.handball.no/system/kamper/kamp/");
          match.searchParams.set("matchid",String(item.game.nif_id));
          const response=await fetch(match,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(9000),headers:{Accept:"text/html"}});
          const parsed=response.ok?parsePublicMatchEvents(await response.text(),item.game):null;
          if(parsed)item.log=parsed;
        }catch{/* A later sync retries fixtures without a verified log. */}
      }
    };
    await Promise.all(Array.from({length:3},scan));
    const payload={...key,name,leagues:ids,fixtures,synced_at:new Date().toISOString()};
    if(old){
      const {data}=await db.from("beta_opponent_watches").update(payload).match(key).eq("synced_at",old.synced_at).select("*").maybeSingle().throwOnError();
      if(data)return Response.json(data,{headers:{"Cache-Control":"no-store"}});
    }else{
      const {data}=await db.from("beta_opponent_watches").upsert(payload,{onConflict:"team,season,org_id",ignoreDuplicates:true}).select("*").maybeSingle().throwOnError();
      if(data)return Response.json(data,{headers:{"Cache-Control":"no-store"}});
    }
    const winner=await db.from("beta_opponent_watches").select("*").match(key).single().throwOnError();
    return Response.json(winner.data,{headers:{"Cache-Control":"no-store"}});
  }catch{return reply(502,"Kunne ikke fullføre NHF-synk. Lagrede kamper er beholdt.");}
}
