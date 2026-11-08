import {strength} from "../strength";
import {originals,type CatalogItem} from "./model";
export type SessionRef={id:string;title:string;day:string};
export function catalog(team:{id:string;title:string;instructions:string}[]):CatalogItem[]{
 const manual=(id:string,title:string,instructions:string):CatalogItem=>({id,title,instructions,tags:[],equipment:"Ikke angitt",format:"Etter avtale",space:"Etter avtale",min:1,max:5});
 return [...originals,...team.map(e=>manual(e.id,e.title,e.instructions)),...strength.map(e=>manual(e.id,e.name,e.dose))];
}
export type Conditions={people?:number;equipment?:string;space?:string;format?:string};
export function suggestions(items:CatalogItem[],skill:string,level:number|null,c:Conditions={}){
 return items.filter(e=>e.tags.includes(skill)&&(!level||level>=e.min&&level<=e.max)&&(!c.people||e.format!=="Par"||c.people>=2)&&(!c.format||e.format===c.format)&&(!c.space||e.space===c.space)&&(!c.equipment||e.equipment.toLowerCase().split(" og ").every(part=>c.equipment!.toLowerCase().includes(part))));
}
