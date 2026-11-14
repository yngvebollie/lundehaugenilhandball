import type {Member} from "./beta";
import type {StatLine} from "./match-journal";
export type ClubLine=StatLine&{reg:string;fixtureKey:string;level:string};
export type LinkId={reg:string;player:string;athlete:string};
type Group={key:string;name:string;athlete?:string;shirt?:string|null;rows:ClubLine[]};
const normalized=(s:string)=>s.trim().replace(/\s+/g," ").toLocaleLowerCase("nb");
const eventKey=(row:ClubLine)=>row.reg+":"+row.player;
export function groupPlayers(lines:ClubLine[],roster:Member[],links:LinkId[]){
 const athletes=roster.filter(u=>u.role==="athlete"),group=new Map<string,Group>(),byName=new Map<string,Set<string>>(),bySquad=new Map<string,Set<string>>(),known=new Map<string,string>();
 const add=(map:Map<string,Set<string>>,key:string,val:string)=>{if(!map.has(key))map.set(key,new Set());map.get(key)!.add(val);};
 for(const u of athletes){group.set(u.id,{key:u.id,athlete:u.id,name:u.name,shirt:u.shirt_number,rows:[]});add(byName,normalized(u.name),u.id);}
 for(const l of links)known.set(l.reg+":"+l.player,l.athlete);
 const accountIds=new Set(athletes.map(p=>p.id));
 const ambiguous=new Set<string>();
 for(const row of lines){const name=normalized(row.name),key=row.reg+":"+name;add(bySquad,key,row.player);if(bySquad.get(key)!.size>1)ambiguous.add(name);
   const id=known.get(eventKey(row));if(id)add(byName,name,id);}
 for(const row of lines){const name=normalized(row.name),candidates=byName.get(name),resolved=known.get(eventKey(row))||(accountIds.has(row.player)?row.player:undefined);
   // Name grouping here is a coach-only comparison, never proof of account ownership.
   const safe=!ambiguous.has(name)&&name.includes(" ")&&(!candidates||candidates.size===1);
   const key=resolved||(safe?"name:"+name:"player:"+eventKey(row));
   const g=group.get(key)||{key,name:row.name,rows:[]};g.rows.push(row);group.set(key,g);
 }
 return [...group.values()].map(g=>({...g,shirt:g.shirt||[...g.rows].sort((a,b)=>b.day.localeCompare(a.day))[0]?.shirt||null}));
}
const counts=["goals","field_goals","penalty","warnings","suspensions","disqualifications","missed","errors","saves","rating","awards"] as const;
export function uniqueGames(rows:ClubLine[]){
 const perGame=new Map<string,ClubLine[]>();for(const row of rows){if(!perGame.has(row.fixtureKey))perGame.set(row.fixtureKey,[]);perGame.get(row.fixtureKey)!.push(row);}
 let conflicts=0;
 const merged=[...perGame.values()].map(all=>{const played=all.filter(r=>r.played),source=played.length?played:all,row={...source[0]},venues=new Set(source.map(x=>x.home));let bad=false;
   row.home=venues.size===1?row.home:null;for(const c of counts){const v=[...new Set(source.flatMap(x=>x[c]==null?[]:[x[c]!]))];row[c]=v.length===1?v[0]:null;if(v.length>1)bad=true;}if(bad)conflicts++;return row;});
 return {rows:merged,conflicts};
}
