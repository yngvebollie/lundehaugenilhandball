import {useId} from "react";
import type {Logged} from "@/lib/live-analysis";
const zones=["Oppe venstre","Oppe midt","Oppe høyre","Midt venstre","Midt i mål","Midt høyre","Nede venstre","Nede midt","Nede høyre"];
export function LiveGoal({shots,onPick,disabled}:{shots:Logged[];onPick:(x:number,y:number)=>void;disabled:boolean}){
 const id=useId().replace(/:/g,"");
 return <div className="live-goal"><svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
 <defs><pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H8V8" fill="none" stroke="#b0ccc4" strokeWidth=".55"/></pattern></defs>
 <rect width="300" height="200" fill="#eaf2ee"/><path d="M0 0L19 16H281L300 0M0 200L19 184V16M300 200L281 184V16M19 184H281" stroke="#719488" strokeWidth="1.2" fill="none"/><rect width="300" height="200" fill={"url(#"+id+")"}/>
 <path d="M2 198V2H298V198" fill="none" stroke="#fff" strokeWidth="5"/><path d="M2 198V2H298V198" fill="none" stroke="#ba3437" strokeWidth="5" strokeDasharray="15 15"/>
 {shots.filter(e=>e.x!=null&&e.y!=null).map((e,i)=><g key={i} transform={"translate("+Math.min(296,Math.max(4,e.x!*3))+" "+Math.min(196,Math.max(4,e.y!*2))+")"}><circle r="4" fill={e.kind==="save"?"#16735a":"#bc3442"} stroke="white" strokeWidth="1.2"/>{e.kind==="save"&&<path d="m-2 0 1 1 3-3" fill="none" stroke="white"/>}</g>)}</svg>
 <div className="live-zones">{zones.map((z,i)=><button key={z} type="button" disabled={disabled} aria-label={"Treffpunkt: "+z} onClick={e=>{const r=e.currentTarget.getBoundingClientRect(),kx=e.detail?(e.clientX-r.left)/r.width:.5,ky=e.detail?(e.clientY-r.top)/r.height:.5;onPick(Math.round(((i%3)+Math.max(0,Math.min(1,kx)))*100/3),Math.round((Math.floor(i/3)+Math.max(0,Math.min(1,ky)))*100/3));}}/>)}</div></div>;
}
