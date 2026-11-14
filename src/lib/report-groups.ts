import type {QueueRow} from "./report-roster";
export const reportKey=(r:QueueRow)=>JSON.stringify([r.reg,r.player]);
const fullName=(s:string)=>s.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("nb");
export function reportGroups(rows:QueueRow[]){
 const groups=new Map<string,QueueRow[]>();
 for(const row of rows){const key=fullName(row.name);const list=groups.get(key)||[];list.push(row);groups.set(key,list);}
 // Two identities under the same name in one squad cannot safely be assumed to be one person.
 return [...groups.entries()].flatMap(([key,items])=>!key.includes(" ")||new Set(items.map(r=>r.reg)).size!==items.length?
 items.map(r=>({key:reportKey(r),rows:[r],name:r.name})):
 [{key,rows:items.slice().sort((a,b)=>a.squad.localeCompare(b.squad,"nb")),name:items[0].name}])
 .sort((a,b)=>a.name.localeCompare(b.name,"nb"));
}
