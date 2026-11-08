import type {Drill} from "./model";

export function nhfExerciseLink(value:string|undefined){
 if(!value)return "";
 try{const url=new URL(value);return url.protocol==="https:"&&["www.ovelsesbanken.no","ovelsesbanken.no"].includes(url.hostname)&&!url.username&&!url.password&&!url.port&&/^\/ovelser\/.+/.test(url.pathname)?url.href:"";}catch{return "";}
}
export type GroupKey="none"|"theme"|"age"|"technique"|"source"|"category";
export function groupName(d:Drill,key:GroupKey){
 return key==="none"?"":key==="category"?d.sourceMeta?.category||"Uten kategori":d[key]||"Ikke angitt";
}
const compare=new Intl.Collator("nb",{numeric:true,sensitivity:"base"}).compare;
export function ordered(rows:Drill[],sort:string,favorites:string[],group:GroupKey){
 const fav=new Set(favorites);
 return [...rows].sort((a,b)=>compare(groupName(a,group),groupName(b,group))||
  (sort==="favoritter"?Number(fav.has(b.id))-Number(fav.has(a.id)):sort==="kortest"?(a.training??Infinity)-(b.training??Infinity):0)||
  (sort==="za"?compare(b.title,a.title):compare(a.title,b.title))||compare(a.id,b.id));
}
