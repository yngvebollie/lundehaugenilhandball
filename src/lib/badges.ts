import catalog from "./badge-catalog.json";
import {db,demo,today,type Snapshot} from "./beta";
export const badges=catalog;
export async function catalogTargets(team:string):Promise<Record<string,number[]>>{
  if(demo)return JSON.parse(localStorage.getItem("nhf-demo-targets:"+team)||"{}");
  return (await db!.rpc("beta_catalog_targets",{t:team}).throwOnError()).data;
}
export const badgeUnit:Record<string,string>={
 on_fire:"treninger på rad",iron_will:"økter",early_bird:"oppmøter",goal_getter:"mål oppnådd",extra_mile:"ekstraøkter",engine_builder:"kondisjonsøkter",consistency_king_queen:"hele treningsuker",
 hard_worker:"økter",never_give_up:"øvelser",precision_builder:"utfordringer",one_more_rep:"utfordringer",student_of_game:"læringsaktiviteter",footwork_wizard:"utfordringer",
 mission_complete:"oppdrag",better_every_week:"uker",body_guardian:"økter",goal_machine:"mål denne sesongen",sharpshooter:"kamper med minst 70 % treff på minst 5 skudd",the_wall:"redninger",mvp:"utmerkelser",game_warrior:"kamper",hat_trick_hero:"kamper med minst 3 mål",defensive_guardian:"kamper",playmaker:"målgivende pasninger",
 level_up:"rekordforbedringer",game_iq:"utfordringer",versatility_master:"ulike posisjoner",speed_demon:"milepæler",skill_collector:"ferdigheter",comeback_kid:"utviklingsperioder",
 team_player:"lagbidrag",positive_energy:"oppmuntringer",helping_hand:"bidrag",rising_star:"milepæler",fair_play_champion:"sportslige handlinger",beep:"nivå",kmt:"km/t"
};
export type Badge=(typeof catalog)[number];
export type BadgeState={counts:Record<string,number>;goal_season?:string|null;targets?:Record<string,number[]>;seen?:string|null;attribution?:boolean;notifications?:boolean;earned:{key:string;level:number;at:string}[];receive:boolean;
 eligible:{match:string;day:string;athlete:string;name:string;given:string|null;revoked:boolean|null;opponent?:string}[];
 inbox:{key:string;day:string;at?:string;from?:string|null}[];moderate:{match:string;giver:string;day:string;key:string}[]};
export const automatic=new Set(["on_fire","iron_will","consistency_king_queen","goal_machine","sharpshooter","the_wall","mvp","game_warrior","hat_trick_hero","versatility_master"]);
export const coachBadges=badges.filter(b=>b.category!=="Anerkjennelse"&&!automatic.has(b.key));
export const reach=(b:Badge,count:number)=>b.levels.filter(n=>count>=n).length;
export const tier=(b:Badge,level:number)=>level===0?"Låst":b.category==="Tester"?(b.key==="beep"?"Nivå "+b.levels[level-1]:b.levels[level-1]+" km/t"):["Bronse","Sølv","Gull"][level-1];
export const blankBadges=():BadgeState=>({counts:{},earned:[],receive:true,eligible:[],inbox:[],moderate:[]});
export async function badgeAction(data:Snapshot,athlete:string,action="read",v:Record<string,unknown>={}):Promise<BadgeState>{
 if(!demo)return (await db!.rpc("beta_badges",{action,t:data.me.squad,a:athlete,v}).throwOnError()).data;
 if(data.me.role!=="coach"&&data.me.id!==athlete)throw Error("Ingen tilgang");
 const storage="nhf-merker:"+athlete,state:BadgeState=JSON.parse(localStorage.getItem(storage)||"null")||blankBadges();
 state.targets=await catalogTargets(data.me.squad);
 const events:Record<string,Record<string,number>>=JSON.parse(localStorage.getItem(storage+":events")||"{}");
 if(action==="event"&&data.me.role==="coach"){const k=String(v.key),day=String(v.day),qty=Number(v.quantity);if(!coachBadges.some(b=>b.key===k)||!Number.isInteger(qty)||qty<0||qty>999||day>today())throw Error("Ugyldig registrering.");
   (events[k]??={})[day]=qty;localStorage.setItem(storage+":events",JSON.stringify(events));}
 else if(action==="privacy"&&athlete===data.me.id){state.receive=!!v.receive;if(v.attribution!==undefined)state.attribution=!!v.attribution;if(v.notifications!==undefined)state.notifications=!!v.notifications;}
 else if(action==="seen"&&athlete===data.me.id)state.seen=new Date().toISOString();
 else if(action==="targets"&&data.admins.includes(data.me.id)){const l=v.levels as number[];if(l.length!==3||l.some((n,i)=>!Number.isInteger(n)||n<=0||(i&&n<=l[i-1])))throw Error("Oppgi tre stigende mål.");state.targets={...state.targets,[String(v.key)]:l};localStorage.setItem("nhf-demo-targets:"+data.me.squad,JSON.stringify(state.targets));}
 else if(action!=="read")throw Error("Dette krever en tilkoblet konto.");
 for(const [key,values] of Object.entries(events))state.counts[key]=["beep","kmt"].includes(key)?Math.max(...Object.values(values)):Object.values(values).reduce((a,b)=>a+b,0);
 state.counts.iron_will=data.plans.filter(p=>p.athlete===athlete&&p.kind!=="Game"&&p.day<=today()&&data.checks.filter(c=>c.assignment===p.id).length===p.exercises.length).length;
 for(const b of badges)for(let level=1;level<=reach(b,state.counts[b.key]||0);level++)if(!state.earned.some(e=>e.key===b.key&&e.level===level))state.earned.push({key:b.key,level,at:new Date().toISOString()});
 localStorage.setItem(storage,JSON.stringify(state));return state;
}
