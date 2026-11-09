import {useEffect,useRef,useState} from "react";
import {Star} from "lucide-react";
import {db,demo,type Snapshot} from "@/lib/beta";

async function rating(data:Snapshot,id:string,score:number|null){
 if(data.me.role!=="athlete")throw Error("Bare utøvere kan vurdere øvelser.");
 if(!demo)return (await db!.rpc("beta_court_rating",{t:data.me.squad,k:id,score}).throwOnError()).data as number|null;
 const key=JSON.stringify(["court-rating",data.me.squad,data.me.id,id]);
 if(score!==null)localStorage.setItem(key,String(score));
 const value=localStorage.getItem(key);return value===null?null:Number(value);
}
export function CourtRating({data,id}:{data:Snapshot;id:string}){
 const [value,V]=useState<number|null>(null),[ready,R]=useState(false),[busy,B]=useState(false),[msg,M]=useState(""),[retry,T]=useState(0),lock=useRef(false),live=useRef(false);
 useEffect(()=>{let active=true;live.current=true;R(false);M("");V(null);rating(data,id,null).then(n=>{if(active){V(n);R(true);}}).catch(()=>{if(active)M("Kunne ikke hente vurderingen.");});
 return()=>{active=false;live.current=false;};},[data.me.id,data.me.squad,id,retry]);
 async function save(n:number){if(!ready||lock.current)return;lock.current=true;B(true);M("");try{const saved=await rating(data,id,n);if(live.current){V(saved);M("Vurdering lagret.");}}catch{if(live.current)M("Ikke lagret. Velg stjernene igjen.");}finally{lock.current=false;if(live.current)B(false);}}
 return <fieldset className="court-rating"><legend>Min vurdering</legend><div>{[1,2,3,4,5].map(n=><button key={n} type="button" disabled={!ready||busy} aria-pressed={value===n} aria-label={n+" av 5 stjerner"} onClick={()=>save(n)}><Star fill={value!==null&&value>=n?"currentColor":"none"}/></button>)}</div><small>{ready?(value===null?"Ikke vurdert":value+" av 5 stjerner"):""}</small><small role="status">{msg}</small>{!ready&&msg&&<button onClick={()=>T(retry+1)}>Prøv igjen</button>}</fieldset>;
}
