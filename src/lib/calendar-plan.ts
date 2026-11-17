import type {Assignment,Snapshot} from "./beta";
import type {Rule} from "./regular";
export const calendarFields=(a:Assignment)=>({title:a.title,day:a.day,kind:a.kind||"Session",minutes:a.minutes??null,start_time:a.start_time?.slice(0,5)||null,exercises:a.exercises});
export type CalendarFields=ReturnType<typeof calendarFields>;
export const regularFields=(r:Rule)=>({title:r.title,days:r.days,clock:r.clock.slice(0,5),minutes:r.minutes,weight:r.weight,starts:r.starts,ends:r.ends??null});
export function canEditCalendar(data:Snapshot,a:Assignment,day:string){return data.me.role==="coach"&&a.squad===data.me.squad&&!a.personal&&a.day>=day&&!data.checks.some(c=>c.assignment===a.id)&&!data.feedback.some(c=>c.assignment===a.id)&&!data.reviews.some(c=>c.assignment===a.id);}
export function groupCalendar(plans:Assignment[]){
 const groups=new Map<string,Assignment[]>();
 for(const a of plans){const k=JSON.stringify([calendarFields(a),a.personal?a.id:null]);groups.set(k,[...(groups.get(k)||[]),a]);}
 return [...groups.values()].sort((a,b)=>(a[0].start_time||"99").localeCompare(b[0].start_time||"99")||a[0].title.localeCompare(b[0].title,"nb"));
}
