import type {SupabaseClient} from "@supabase/supabase-js";
import type {Fixture} from "./match-journal";
import {parsePublicMatchEvents} from "./nhf-public-events";

export async function syncNhfPublicEvents(db:SupabaseClient, registration:string) {
  const {data:reg}=await db.from("beta_team_seasons").select("id,team").eq("id",registration).maybeSingle().throwOnError();
  if(!reg) return "Hendelser: laget er ikke tilgjengelig.";
  const fixtures:Fixture[]=[];
  for(let offset=0;;offset+=100){
    const {data}=await db.from("beta_matches").select("id,team,nif_id,home,away,score,opponent,age_class,competition,day,completed")
      .eq("team",reg.team).eq("registration",reg.id).eq("completed",true).not("nif_id","is",null)
      .order("day",{ascending:false}).order("id").range(offset,offset+99).throwOnError();
    fixtures.push(...data as Fixture[]);
    if(data.length<100)break;
  }
  const queue:Fixture[]=[];
  for(let offset=0;offset<fixtures.length;offset+=100){
    const chunk=fixtures.slice(offset,offset+100);
    const {data}=await db.from("beta_live_match_logs").select("id").eq("team",reg.team).in("id",chunk.map(game=>game.id)).throwOnError();
    const existing=new Set(data.map(row=>row.id));
    queue.push(...chunk.filter(game=>!existing.has(game.id)));
  }
  let inserted=0,skipped=0;
  const deadline=Date.now()+85_000;
  const scan=async()=>{
    while(queue.length&&Date.now()<deadline){
      const game=queue.shift()!;
      try{
        const url=new URL("https://www.handball.no/system/kamper/kamp/");
        url.searchParams.set("matchid",String(game.nif_id));
        const response=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000),headers:{Accept:"text/html"}});
        const document=response.ok?parsePublicMatchEvents(await response.text(),game):null;
        if(!document){skipped++;continue;}
        const {data}=await db.from("beta_live_match_logs").upsert({id:game.id,team:reg.team,revision:1,write_id:crypto.randomUUID(),document},
          {onConflict:"id",ignoreDuplicates:true}).select("id").throwOnError();
        inserted+=data.length;
      }catch{skipped++;}
    }
  };
  await Promise.all(Array.from({length:3},scan));
  const unavailable=skipped+queue.length;
  return "Hendelser: "+inserted+" nye logger"+(unavailable?", "+unavailable+" uten verifisert logg eller kunne ikke hentes":"")+".";
}
