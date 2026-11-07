type Scorer={match_id:string;player:string;played:boolean;goals:number|null;field_goals:number|null};
export function seasonGoldBalls(lines:Scorer[]){
  const leaders=new Map<string,{goals:number;players:Set<string>}>();
  for(const row of lines){
    if(!row.played||row.goals==null||row.goals<=0||row.field_goals==null)continue;
    const top=leaders.get(row.match_id);
    if(!top||row.goals>top.goals)leaders.set(row.match_id,{goals:row.goals,players:new Set([row.player])});
    else if(row.goals===top.goals)top.players.add(row.player);
  }
  const wins=new Map<string,string[]>();for(const [match,top] of leaders)for(const id of top.players)wins.set(id,[...(wins.get(id)||[]),match]);
  return wins;
}
export type OpponentLine={match_id:string;day:string;opponent:string;name:string;shirt:string;played:boolean|null;goals:number|null;penalty:number|null};
export const normalizeName=(name:string)=>name.trim().replace(/\s+/g," ").toLocaleLowerCase("nb");
export function oppositionScorers(lines:OpponentLine[]){
  const seen=new Set<string>(),ambiguous=new Set<string>();
  for(const x of lines){const name=normalizeName(x.name),key=x.match_id+":"+name;if(seen.has(key))ambiguous.add(name);seen.add(key);}
  const groups=new Map<string,OpponentLine[]>();
  for(const x of lines){const name=normalizeName(x.name),key=normalizeName(x.opponent)+":"+name+(ambiguous.has(name)?":"+x.shirt:"");groups.set(key,[...(groups.get(key)||[]),x]);}
  return [...groups.entries()].map(([key,all])=>{const played=all.filter(x=>x.played),known=played.filter(x=>x.goals!=null),p7=played.filter(x=>x.penalty!=null);
    const latest=all.reduce((a,b)=>b.day>a.day?b:a);
    const goals=known.length?known.reduce((n,x)=>n+x.goals!,0):null;
    return {key,name:latest.name,shirt:latest.shirt,games:played.length,goals,penalty:p7.length?p7.reduce((n,x)=>n+x.penalty!,0):null,avg:goals!=null?goals/known.length:null};
  }).sort((a,b)=>(b.goals??-1)-(a.goals??-1)||a.name.localeCompare(b.name,"nb"));
}
