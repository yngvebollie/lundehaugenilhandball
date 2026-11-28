import {db,demo,pages} from "./beta";
import {playerNameKey} from "./spond-roster";

export type MatchPlayerProfile={id:string;name:string;number:number|null;athlete:string|null};
const key=(team:string)=>"nhf-match-player-profiles:"+team;
const columns="id,name,number,athlete";

export async function matchPlayerProfiles(team:string):Promise<MatchPlayerProfile[]>{
 if(demo)return JSON.parse(localStorage.getItem(key(team))||"[]");
 return pages<MatchPlayerProfile>((start,end)=>db!.from("beta_match_player_profiles").select(columns).eq("team",team).order("id").range(start,end).throwOnError());
}

export async function importMatchPlayers(team:string,names:string[]){
 if(names.length){
  if(demo){
   const rows=await matchPlayerProfiles(team),known=new Set(rows.map(row=>playerNameKey(row.name)));
   for(const name of names)if(!known.has(playerNameKey(name))){
    known.add(playerNameKey(name));rows.push({id:crypto.randomUUID(),name,number:null,athlete:null});
   }
   localStorage.setItem(key(team),JSON.stringify(rows));
  }else{
   await db!.from("beta_match_player_profiles").upsert(names.map(name=>({team,name})),{onConflict:"team,name_key",ignoreDuplicates:true}).throwOnError();
  }
 }
 return matchPlayerProfiles(team);
}

export async function updateMatchPlayer(team:string,id:string,changes:{athlete:string}|{number:number|null}){
 if(!demo)return (await db!.from("beta_match_player_profiles").update(changes).eq("team",team).eq("id",id).is("athlete",null).select(columns).single().throwOnError()).data as MatchPlayerProfile;
 const profiles=await matchPlayerProfiles(team),profile=profiles.find(row=>row.id===id&&!row.athlete);
 if(!profile)throw Error("Spillerprofilen er allerede koblet.");
 Object.assign(profile,changes);
 localStorage.setItem(key(team),JSON.stringify(profiles));
 return profile;
}
