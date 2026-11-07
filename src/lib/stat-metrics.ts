import type {StatLine} from "./match-journal";
export const tabs={
  Oversikt:["games","goals","average","homeGoals","awayGoals","warnings","suspensions"],
  Angrep:["goals","field_goals","penalty","homeGoals","awayGoals","average","missed","accuracy"],
  Disiplin:["games","warnings","suspensions","minutes","disqualifications"],
  Trenerdata:["games","errors","saves","rating","awards"]
} as const;
export type Tab=keyof typeof tabs;
export type Column=(typeof tabs)[Tab][number];
export const labels:Record<Column,string>={games:"Kamper",goals:"Mål",average:"Målsnitt",homeGoals:"Mål hjemme",awayGoals:"Mål borte",warnings:"Gule kort",
  suspensions:"2-min.",minutes:"Utvisningsmin.",disqualifications:"Diskval.",field_goals:"Spillemål",penalty:"7 m-mål",missed:"Bomskudd",accuracy:"Treff %",errors:"Tekniske feil",saves:"Redninger",rating:"Vurdering",awards:"Banens beste"};
function sum(xs:(number|null)[]){const nums=xs.filter((x):x is number=>x!=null);return nums.length?nums.reduce((a,b)=>a+b,0):null;}
export function metrics(rows:StatLine[]):Record<Column,number|null>{
  const played=rows.filter(x=>x.played),known=played.filter(x=>x.goals!=null),shots=played.filter(x=>x.missed!=null&&x.goals!=null);
  const goals=sum(known.map(x=>x.goals)),g=sum(shots.map(x=>x.goals)),miss=sum(shots.map(x=>x.missed));
  const sus=sum(rows.map(x=>x.suspensions)),ratings=played.flatMap(x=>x.rating==null?[]:[x.rating]);
  return {games:played.length,goals,average:goals==null?null:goals/known.length,homeGoals:sum(played.filter(x=>x.home===true).map(x=>x.goals)),
    awayGoals:sum(played.filter(x=>x.home===false).map(x=>x.goals)),field_goals:sum(played.map(x=>x.field_goals)),penalty:sum(played.map(x=>x.penalty)),
    warnings:sum(rows.map(x=>x.warnings)),suspensions:sus,minutes:sus==null?null:sus*2,disqualifications:sum(rows.map(x=>x.disqualifications)),
    missed:sum(played.map(x=>x.missed)),accuracy:g!=null&&miss!=null&&g+miss>0?100*g/(g+miss):null,errors:sum(played.map(x=>x.errors)),
    saves:sum(played.map(x=>x.saves)),rating:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,awards:sum(played.map(x=>x.awards))};
}
