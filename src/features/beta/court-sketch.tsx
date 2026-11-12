import {useId} from "react";

const moves:Record<string,{caption:string;run:string;pass:string;cones:boolean;hint:string}>={
 "club:passing":{caption:"To spillere løper parallelt. Spill ballen foran medspilleren.",run:"M58 89L227 89 M58 36L227 36",pass:"M58 84L130 39",cones:false,hint:"Se om mottakeren kan fortsette i samme fart etter pasningen."},
 "club:turn":{caption:"Møt pasningen, ta imot og skift retning gjennom porten.",run:"M58 89L127 71L213 35",pass:"M58 36L127 71",cones:true,hint:"Prøv samme mottak til begge sider, og bytt hvem som server."},
 "club:feint":{caption:"Vis en bevegelse til én side, skift retning og gå gjennom porten.",run:"M58 89L128 89L112 65L213 35",pass:"",cones:true,hint:"La spilleren prøve i rolig fart før en forsvarer gir motstand."}
};
export function CourtSketch({id}:{id:string}){
 const marker=useId().replace(/[^a-zA-Z0-9_-]/g,""),m=moves[id];if(!m)return null;
 return <figure className="court-sketch"><svg viewBox="0 0 272 120" role="img" aria-label={m.caption}>
 <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#182647"/></marker></defs>
 <rect x="2" y="2" width="268" height="116" rx="4" fill="#f5f7fb" stroke="#c7cfdd"/>
 <path d={m.run} stroke="#182647" strokeWidth="3" fill="none" markerEnd={'url(#'+marker+')'}/>
 {m.pass&&<path d={m.pass} stroke="#be175b" strokeWidth="3" strokeDasharray="5 4" fill="none"/>}
 {m.cones&&<g fill="#eaa119"><path d="M172 30l6 10h-12z"/><path d="M192 55l6 10h-12z"/></g>}
 <circle cx="58" cy="89" r="8" fill="#c60059"/>{m.pass&&<circle cx="58" cy="36" r="8" fill="#182647"/>}</svg>
 <figcaption><b>Baneskisse</b> · {m.caption}{m.pass&&" Stiplet linje viser pasningen."}</figcaption><p><b>Se etter:</b> {m.hint}</p></figure>;
}
