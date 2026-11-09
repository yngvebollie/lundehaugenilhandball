import {useEffect,useRef,useState} from "react";
import {demoRatingKey} from "@/lib/coach-feedback";
import {Star} from "lucide-react";
import {db,demo,type Snapshot} from "@/lib/beta";

type Context={kind:"assignment"|"manual"|"challenge";activity:string;item:string;caption:string};
async function rating(data:Snapshot,id:string,score:number|null,context?:Context){
 if(data.me.role!=="athlete")throw Error("Bare utøvere kan vurdere øvelser.");
 const preview=data.me.squad==="development-preview";
 if(!demo&&!preview&&score!==null)return (await db!.rpc("beta_share_rating",{t:data.me.squad,k:id,kind:context?.kind||"catalog",activity:context?.activity||null,item:context?.item||null,caption:context?.caption||null,score}).throwOnError()).data as number;
 if(!demo&&!preview)return (await (context?db!.rpc("beta_assigned_rating",{t:data.me.squad,...context,score}):db!.rpc("beta_court_rating",{t:data.me.squad,k:id,score})).throwOnError()).data as number|null;
 const storage=preview?sessionStorage:localStorage;
 const key=JSON.stringify(["court-rating",data.me.squad,data.me.id,id,...(context?[context.kind,context.activity,context.item,context.caption]:[])]);
 if(score!==null){storage.setItem(key,String(score));if(!preview)storage.setItem(demoRatingKey(data.me.squad,data.me.id,key),JSON.stringify({athlete:data.me.id,exercise:id,label:context?.caption||null,origin:context?.kind||"catalog",activity:context?.activity||null,item:context?.item||null,stars:score,updated:new Date().toISOString()}));}
 const value=storage.getItem(key);if(value===null&&context?.kind==="assignment")return data.reviews.find(r=>r.assignment===context.activity)?.exercise_stars[Number(context.item)]||null;return value===null?null:Number(value);
}
export function CourtRating({data,id,context}:{data:Snapshot;id:string;context?:Context}){
 const [value,V]=useState<number|null>(null),[ready,R]=useState(false),[busy,B]=useState(false),[msg,M]=useState(""),[retry,T]=useState(0),lock=useRef(false),live=useRef(false);
 useEffect(()=>{let active=true;live.current=true;R(false);M("");V(null);rating(data,id,null,context).then(n=>{if(active){V(n);R(true);}}).catch(()=>{if(active)M("Kunne ikke hente vurderingen.");});
 return()=>{active=false;live.current=false;};},[data.me.id,data.me.squad,id,retry]);
 async function save(n:number){if(!ready||lock.current)return;lock.current=true;B(true);M("");try{const saved=await rating(data,id,n,context);if(live.current){V(saved);M("Vurdering lagret.");}}catch{if(live.current)M("Ikke lagret. Velg stjernene igjen.");}finally{lock.current=false;if(live.current)B(false);}}
 return <fieldset className="court-rating" aria-label={context?"Vurder "+context.caption:undefined}><legend>Min vurdering</legend><small>Når du velger stjerner, kan lagets trenere se vurderingen sammen med navnet ditt.</small><div>{[1,2,3,4,5].map(n=><button key={n} type="button" disabled={!ready||busy} aria-pressed={value===n} aria-label={n+" av 5 stjerner"} onClick={()=>save(n)}><Star fill={value!==null&&value>=n?"currentColor":"none"}/></button>)}</div><small>{ready?(value===null?"Ikke vurdert":value+" av 5 stjerner"):""}</small><small role="status">{msg}</small>{!ready&&msg&&<button onClick={()=>T(retry+1)}>Prøv igjen</button>}</fieldset>;
}
export function AssignedRating({data,kind,activity,item,caption}:{data:Snapshot}&Context){
 const [open,O]=useState(false);
 if(data.me.role!=="athlete")return null;
 return <details className="assigned-rating" onToggle={e=>O(e.currentTarget.open)}><summary>Vurder {caption}</summary>
 {open&&<CourtRating key={JSON.stringify([kind,activity,item,caption,data.me.id,data.me.squad])} data={data} id="" context={{kind,activity,item,caption}}/>}</details>;
}
