import {useEffect,useState} from "react";
import {Award} from "lucide-react";
import {badges,badgeAction,tier,type BadgeState} from "@/lib/badges";
import type {Snapshot} from "@/lib/beta";
import "./workout-finish.css";
export function MeritFeed({data}:{data:Snapshot}){
 const [items,setItems]=useState<BadgeState["earned"]>([]),[celebrate,C]=useState(""),[error,E]=useState(false);
 useEffect(()=>{let live=true,inflight=false;const storage="merit-celebrated:"+data.me.squad+":"+data.me.id;
 const read=async()=>{if(inflight||document.hidden)return;inflight=true;try{const v=await badgeAction(data,data.me.id);if(!live)return;
 const seen=new Set<string>(),list=[...v.earned].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||b.level-a.level).filter(e=>{const key=e.fixture?e.key+e.fixture:e.key+e.level+e.at;if(seen.has(key))return false;seen.add(key);return true;});setItems(list);E(false);
 const first=list[0];if(first&&v.notifications!==false){const id=[first.key,first.fixture||first.at,first.level].join(":");if(localStorage.getItem(storage)!==id){localStorage.setItem(storage,id);C(id);}}
 }catch{if(live)E(true);}finally{inflight=false;}};void read();const timer=window.setInterval(read,60000);window.addEventListener("focus",read);return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",read);};},[data]);
 useEffect(()=>{if(celebrate){const t=setTimeout(()=>C(""),2300);return()=>clearTimeout(t);}},[celebrate]);
 return <section className="panel panel-pad grid merit-feed"><header><h2><Award size={20}/> Mine høydepunkter</h2></header>
 {celebrate&&<div className="confetti" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{left:(i*37%100)+"%",backgroundColor:["#d80063","#102047","#ef94c4"][i%3],animationDelay:(i%5)*.06+"s"}}/>)}</div>}
 {error&&<small role="status">Kunne ikke oppdatere høydepunktene.</small>}{items.slice(0,5).map(e=>{const b=badges.find(b=>b.key===e.key);return b?<article key={[e.key,e.fixture||e.at,e.level].join(":")}><div><small>{new Date(e.at).toLocaleDateString("nb-NO")}</small><h3>Gratulerer med {tier(b,e.level).toLowerCase()} i {b.title}!</h3><p>{e.fixture?e.goals+" mål mot "+e.opponent+". Flott innsats for laget!":"Et nytt steg i utviklingen din. Godt jobbet!"}</p><footer><a href={"/merker?badge="+e.key}>Se merket</a>{e.match&&<a href={"/athlete?fixture="+e.match}>Se kampen</a>}</footer></div></article>:null;})}
 {!items.length&&!error&&<small>Her samles merkene du oppnår.</small>}<a href="/merker">Alle mine merker</a></section>;
}
