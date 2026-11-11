import {AudioLines,Gauge,Goal,Medal} from "lucide-react";
import {badges,badgeUnit,reach,tier} from "@/lib/badges";
const marks=[
 {key:"goal_machine",icon:Goal,counts:[18,54,3]},
 {key:"beep",icon:AudioLines,counts:[8,9,5]},
 {key:"kmt",icon:Gauge,counts:[65,75,55]},
];
export function PreviewMerits({person}:{person:string}){
 const i=["liv","demo-b","demo-c"].indexOf(person);
 if(i<0)return null;
 return <details className="dev-panel"><summary><Medal size={18}/> Merker og neste mål</summary>
 <div className="grid">{marks.map(({key,icon:Icon,counts})=>{
  const b=badges.find(x=>x.key===key)!;const n=counts[i],level=reach(b,n),next=b.levels[level];
  return <div className="result" key={key}><Icon size={20} aria-hidden="true"/><div><strong>{b.title} · {tier(b,level)}</strong><p>{n} {badgeUnit[key]}{next!=null?" · Neste merke ved "+next:" · Høyeste nivå"}</p></div></div>;
 })}</div></details>;
}
