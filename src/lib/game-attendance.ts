import {db,demo} from "./beta";
export type Decline={match_id:string;athlete:string};
const key=(team:string)=>"game-declines:"+team;
export async function declines(team:string):Promise<Decline[]>{
 if(demo)return JSON.parse(localStorage.getItem(key(team))||"[]");
 const records:Decline[]=[];for(let offset=0;;offset+=500){
 const rows=(await db!.from("beta_game_declines").select("match_id,athlete").eq("team",team).order("match_id").order("athlete").range(offset,offset+499).throwOnError()).data||[];
 records.push(...rows);if(rows.length<500)return records;}
}
export async function recordDecline(team:string,match_id:string,athlete:string,add:boolean){
 if(demo){const rows=(await declines(team)).filter(x=>x.match_id!==match_id||x.athlete!==athlete);if(add)rows.push({match_id,athlete});localStorage.setItem(key(team),JSON.stringify(rows));}
 else if(add)await db!.from("beta_game_declines").insert({team,match_id,athlete}).throwOnError();
 else await db!.from("beta_game_declines").delete().match({team,match_id,athlete}).throwOnError();
}
export async function cupAttendance(team:string,regs:string[]){
 type G={id:string;day:string;cup:string;played?:string[];declined?:string[]};
 const list:{reg:string;game:G}[]=[];
 if(demo){for(const reg of regs){const p=JSON.parse(localStorage.getItem("club-cups:"+team+":"+reg)||"{}");for(const game of p.games||[])list.push({reg,game});}}
 else if(regs.length){const cups=(await db!.from("beta_cups").select("id,registration").eq("team",team).in("registration",regs).throwOnError()).data||[];
 const ids=new Map(cups.map(c=>[c.id,c.registration]));if(ids.size){for(let i=0;;i+=500){const rows=(await db!.from("beta_cup_games").select("id,day,cup,played,declined").eq("team",team).in("cup",[...ids.keys()]).order("id").range(i,i+499).throwOnError()).data||[];for(const game of rows)list.push({reg:ids.get(game.cup)!,game});if(rows.length<500)break;}}}
 return list;
}
