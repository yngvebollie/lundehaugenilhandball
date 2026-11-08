import {useState} from "react";
import {ChartNoAxesColumnIncreasing} from "lucide-react";
import {profiles,axisObservation,comparable,levels,localDay,label,type Plan,type Profile} from "@/lib/development/model";
export const dateText=(t:string)=>new Intl.DateTimeFormat("nb-NO",{timeZone:"Europe/Oslo",day:"numeric",month:"short",year:"numeric"}).format(new Date(t.length===10?t+"T12:00:00Z":t));
const point=(i:number,l:number,n:number)=>{const a=(i*2*Math.PI/n)-Math.PI/2;return [190+111*l/5*Math.cos(a),153+111*l/5*Math.sin(a)];};
export function Radar({plan,profile,keeperAxes,onSkill}:{plan:Plan;profile:Profile;keeperAxes:string[];onSkill:(s:string)=>void}){
 const [day,D]=useState(()=>localDay(new Date().toISOString())),[prior,P]=useState(()=>localDay(new Date(Date.now()-30*86400000).toISOString()));
 const axes=Object.keys(profiles[profile]).filter(k=>profile!=="keeper"||keeperAxes.includes(k)),pt=(i:number,l:number)=>point(i,l,axes.length),rows=axes.map((k,i)=>{const a=axisObservation(plan,profile,k,day),b=axisObservation(plan,profile,k,prior);return {k,i,a,b,compatible:comparable(a,b)};});
 const series=(prev:boolean)=>{const coords=rows.map(r=>{const n=prev?r.compatible?r.b?.level:null:r.a?.level;return n?pt(r.i,n):null;});
 return <g className={prev?"dev-prev":"dev-now"}>{coords.every(Boolean)&&<polygon points={coords.map(p=>p!.join(",")).join(" ")}/>}
 {coords.map((p,i)=>{const next=coords[(i+1)%axes.length];return p&&<g key={i}>{next&&<line x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}/>}<circle cx={p[0]} cy={p[1]} r="3.5"/></g>;})}</g>;};
 return <section className="dev-panel dev-radar"><h3><ChartNoAxesColumnIncreasing/> Ferdighetsprofil</h3>
 <svg viewBox="0 0 380 306" role="img" aria-label="Trenerbekreftede ferdigheter på skala 1 til 5. Tall og datoer står i tabellen.">
 {[1,2,3,4,5].map(l=><polygon className="dev-ring" key={l} points={axes.map((_,i)=>pt(i,l).join(",")).join(" ")}/>)}{axes.map((k,i)=>{const [x,y]=pt(i,5),left=x<189,right=x>191;return <g key={k}><line className="dev-radius" x1="190" y1="153" x2={x} y2={y}/><text x={x+(left?-6:right?6:0)} y={y+(i===0?-9:i===4?19:4)} textAnchor={left?"end":right?"start":"middle"}>{label(k)}</text></g>;})}{series(true)}{series(false)}</svg>
 <div className="dev-legend"><span>Nå</span><span>Tidligere</span><small>Nivå 1–5</small></div>
 {!rows.some(r=>r.a)&&<p>Ingen publiserte vurderinger ennå.</p>}
 <details><summary>Verdier og sammenligning</summary><div className="dev-pair"><label>Vis per dato<input type="date" value={day} min={prior} onChange={e=>e.target.value&&D(e.target.value)}/></label><label>Sammenlign med<input type="date" value={prior} max={day} onChange={e=>e.target.value&&P(e.target.value)}/></label></div>
 <div className="dev-scroll"><table><caption>{profile==="field"?"Utespiller":"Keeper"} · Vurderinger per {dateText(day)}</caption><thead><tr><th>Område</th><th>Nå</th><th>Tidligere</th><th>Observasjon og tilbakemelding</th></tr></thead><tbody>{rows.map(r=><tr key={r.k}><th><button onClick={()=>onSkill(r.k)}>{label(r.k)}</button></th><td>{r.a?r.a.level+" · "+levels[r.a.level-1]:"Ikke vurdert"}</td><td>{r.compatible?r.b!.level+" · "+dateText(r.b!.observed):r.b?"Ikke sammenlignbar":"Ikke vurdert"}</td><td>{r.a?dateText(r.a.observed)+" · "+r.a.feedback:"–"}</td></tr>)}</tbody></table></div></details></section>;
}
