export type Rule={id:string;team:string;athlete:string;kind:"gym"|"other";title:string;days:number[];clock:string;minutes:number;weight:number;starts:string;ends:string|null};
export const weekdays=["Man","Tir","Ons","Tor","Fre","Lør","Søn"];
export const intensity=["","Lett","Moderat","Moderat+","Hard","Svært hard"];
export function onDate(rules:Rule[],day:string,target=""){
 const w=(new Date(day+"T12:00:00Z").getUTCDay()+6)%7+1;
 return rules.filter(r=>(!target||r.athlete===target)&&r.starts<=day&&(!r.ends||r.ends>=day)&&r.days.includes(w));
}
export function plusDay(day:string,n:number){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function regularLoad(rules:Rule[],from:string,until:string,target=""){
 let minutes=0,points=0,sessions=0;
 for(let day=from;day<until;day=plusDay(day,1))for(const r of onDate(rules,day,target)){minutes+=r.minutes;points+=r.minutes*r.weight;sessions++;}
 return {minutes,points,sessions};
}
export function monthBounds(day:string){const start=day.slice(0,7)+"-01";return [start,plusDay(start,32).slice(0,7)+"-01"] as const;}
