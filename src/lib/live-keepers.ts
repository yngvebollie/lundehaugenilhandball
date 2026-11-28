import {db,demo,type Member} from "./beta";

export type KeeperProfile={id:string;name:string;athlete:string|null};
type KeeperOption={id:string;name:string};
const storageKey=(team:string)=>"nhf-live-keepers:"+team;
const roster=(team:string,members:Member[])=>members.filter(member=>member.role==="athlete"&&member.squad===team);

export async function keeperProfiles(team:string):Promise<KeeperProfile[]>{
 if(demo)return JSON.parse(localStorage.getItem(storageKey(team))||"[]");
 return (await db!.from("beta_live_keeper_profiles").select("id,name,athlete").eq("team",team).order("name").throwOnError()).data??[];
}

export async function createKeeper(team:string,value:string):Promise<KeeperProfile>{
 const name=value.trim();
 if(!name||name.length>100)throw Error("Skriv inn et navn på opptil 100 tegn.");
 if(!demo)return (await db!.from("beta_live_keeper_profiles").insert({team,name}).select("id,name,athlete").single().throwOnError()).data!;
 const profile={id:crypto.randomUUID(),name,athlete:null};
 const profiles=await keeperProfiles(team);
 localStorage.setItem(storageKey(team),JSON.stringify([...profiles,profile]));
 return profile;
}

export async function linkKeeper(team:string,id:string,athlete:string,members:Member[]):Promise<KeeperProfile>{
 if(!roster(team,members).some(member=>member.id===athlete))throw Error("Velg en spiller i stallen.");
 if(!demo)return (await db!.from("beta_live_keeper_profiles").update({athlete}).eq("team",team).eq("id",id).is("athlete",null).select("id,name,athlete").single().throwOnError()).data!;
 const profiles=await keeperProfiles(team);
 const profile=profiles.find(item=>item.id===id&&!item.athlete);
 if(!profile)throw Error("Keeperprofilen er allerede koblet.");
 profile.athlete=athlete;
 localStorage.setItem(storageKey(team),JSON.stringify(profiles));
 return profile;
}

export function keeperDirectory(team:string,members:Member[],profiles:KeeperProfile[]){
 const players=roster(team,members).map(player=>({id:"athlete:"+player.id,name:player.name}));
 const guests=profiles.filter(profile=>!profile.athlete).map(profile=>({id:"guest:"+profile.id,name:profile.name}));
 const entries=new Map<string,KeeperOption>([...players,...guests].map(item=>[item.id,item]));
 const links=new Map(profiles.filter(profile=>profile.athlete).map(profile=>["guest:"+profile.id,profile]));
 function identify(value:string):KeeperOption{
  const reference=value.match(/^((?:guest|athlete):[^|]+)\|(.*)$/s);
  if(!reference)return {id:value,name:value};
  const [,id,snapshot]=reference;
  const linked=links.get(id);
  if(linked?.athlete){
   const target="athlete:"+linked.athlete;
   return entries.get(target)??{id:target,name:linked.name};
  }
  return entries.get(id)??{id,name:snapshot};
 }
 return {players,guests,entries,identify};
}

export function keeperValue({id,name}:KeeperOption){
 return (id+"|"+name).slice(0,100);
}
