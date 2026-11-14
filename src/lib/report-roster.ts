import {db,demo,type Member,type Snapshot} from "./beta";
import {registrations,seasonMatches,squadStatLines} from "./match-journal";
import type {LinkId} from "./club-player-stats";
import type {Report} from "./report-text";

export type QueueRow={reg:string;squad:string;player:string;name:string;shirts:string[];games:number};
export type QueuePacket={rows:QueueRow[];links:LinkId[]};
const first=(s:string)=>s.trim().normalize("NFC").toLocaleLowerCase("nb").split(/\s+/)[0];
const shirt=(s:string)=>/^\d{1,3}$/.test(s.trim())&&Number(s)>0?String(Number(s)):"";
export function suggestions(row:QueueRow,people:Member[]){
 return people.filter(p=>first(p.name)===first(row.name)&&p.shirt_number&&row.shirts.some(n=>shirt(n)!==""&&shirt(n)===shirt(p.shirt_number!)));
}
export const demoLinks=(team:string):LinkId[]=>JSON.parse(sessionStorage.getItem("report-roster:"+team)||"[]");
export async function reportQueue(data:Snapshot,link?:LinkId):Promise<QueuePacket>{
 const t=data.me.squad;
 if(!demo)return (await db!.rpc("beta_report_roster",{t,...(link?{r:link.reg,p:link.player,a:link.athlete}:{})}).throwOnError()).data;
 const regs=await registrations(t),games=await seasonMatches(t,regs),links=demoLinks(t),rows=new Map<string,QueueRow>();
 for(const reg of regs){
  const lines=await squadStatLines(reg.id,games);
  for(const g of games.filter(g=>g.registration===reg.id)){
   const doc:Report|undefined=JSON.parse(sessionStorage.getItem("kamper-private-report:"+t+":"+g.id)||"null")?.reviewed;
   const side=g.opponent===g.away?"A":g.opponent===g.home?"B":null;
   for(const x of doc?.players.filter(x=>x.side===side)||[]){
    const id=lines.find(l=>l.match_id===g.id&&l.name===x.name&&l.shirt===x.shirt)?.player;if(!id)continue;
    const key=reg.id+":"+id,row=rows.get(key)||{reg:reg.id,squad:reg.display_name||String(reg.org_id),player:id,name:x.name,shirts:[],games:0};
    if(x.shirt&&!row.shirts.includes(x.shirt))row.shirts.push(x.shirt);row.games++;rows.set(key,row);
   }
  }
 }
 if(link){if(!rows.has(link.reg+":"+link.player)||links.some(l=>l.reg===link.reg&&(l.player===link.player||l.athlete===link.athlete))||!data.roster.some(m=>m.id===link.athlete&&m.role==="athlete"&&m.squad===t))throw Error("Koblingen er ikke tilgjengelig.");
 links.push(link);sessionStorage.setItem("report-roster:"+t,JSON.stringify(links));}
 return {links,rows:[...rows.values()].filter(row=>!links.some(l=>l.reg===row.reg&&l.player===row.player))};
}
