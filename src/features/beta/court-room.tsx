import {FeatureInfo} from "./feature-info";
import {useCallback,useEffect,useState} from "react";
import {BookOpen,ChevronRight,ClipboardList,Copy,Eye,Play,Plus,WandSparkles} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {court,courtEnabled,courtHistory,type PlayedSession,type Doc,type Packet} from "@/lib/court/client";
import {blank,copyPlan,item,mins,total,sessionDate,type Drill,type Plan} from "@/lib/court/model";
import {CourtSource} from "./court-source";
import {CourtBank} from "./court-bank";
import {CourtBuilder} from "./court-builder";
import {CourtRun,CourtSummary} from "./court-view";
import "./development.css";
import "./court.css";
export function CourtRoom({data}:{data:Snapshot}){
 const coach=data.me.role==="coach",team=data.me.squad;
 const [family,Family]=useState("");
 const [packet,Q]=useState<Packet>(),[err,E]=useState(""),[note,N]=useState(""),[tab,T]=useState("Mine økter"),[view,V]=useState("list"),[id,I]=useState(""),[draft,D]=useState<Plan>(),[automatic,Gen]=useState(false),[dest,F]=useState<Drill[]>(),[target,Y]=useState(""),[query,S]=useState(""),[kind,K]=useState("Alle"),[status,U]=useState("Alle");
 const load=useCallback(async()=>{try{Q(await court(data));E("");}catch(e){Q(undefined);E((e as Error).message)}},[data.me.id,team,data]);
 useEffect(()=>{if(!courtEnabled)return;void load();const fn=()=>void load();window.addEventListener("focus",fn);return()=>window.removeEventListener("focus",fn);},[load]);
 useEffect(()=>{const params=new URLSearchParams(location.search);if(params.get("vis")==="bank")T("Øvelsesbank");const run=coach&&params.get("run"),selected=run||params.get("session");if(selected){I(selected);V(run?"run":"show");}},[team,coach]);
 async function doIt(f:()=>Promise<unknown>,msg=""){try{await f();await load();N(msg);return true}catch(e){E((e as Error).message||"Ikke lagret.");return false}}
 function open(mode:string,doc?:Doc,p?:Plan,auto=false,parent=""){Family(parent||doc?.notes?.family||doc?.id||p?.id||"");Gen(auto||doc?.plan.origin==="generated");const next=p||doc?.plan;I(next?.id||"");V(mode);D(mode==="edit"?next:undefined);E("");N("");if(next)history.replaceState(null,"","/okter?"+(mode==="edit"?"edit":mode==="run"?"run":"session")+"="+next.id);}
 function list(){I("");D(undefined);V("list");history.replaceState(null,"","/okter");void load();}
 useEffect(()=>{if(dest)document.getElementById("bank-destination")?.focus();},[dest]);
 const doc=packet?.sessions.find(x=>x.id===id);
 useEffect(()=>{if(!packet||!coach||view!=="list")return;const editId=new URLSearchParams(location.search).get("edit");if(!editId||!/^[0-9a-f-]{36}$/.test(editId))return;
  const row=packet.sessions.find(x=>x.id===editId),stored=sessionStorage.getItem("court-draft:"+team+":"+data.me.id+":"+editId);
  if(row||stored){const p=row?.plan||JSON.parse(stored!).p;open("edit",row,p);}
 },[packet,coach,view,team,data.me.id]);
 if(!courtEnabled)return <p>Økter er ikke aktivert for dette laget.</p>;
 if(!packet)return <p role={err?"alert":"status"}>{err||"Henter økter …"}{err&&<button onClick={load}>Prøv igjen</button>}</p>;
 const visible=packet.sessions.filter(d=>!d.archived&&(tab==="Maler"?d.plan.origin==="template":tab==="Lagrede forslag"?d.plan.origin==="generated"&&!d.published:d.plan.origin!=="template")&&(status==="Alle"||(status==="Delt"?d.published:!d.published))&&(kind==="Alle"||(kind==="Lagtrening"?d.plan.purpose==="team":d.plan.purpose==="individual"))&&(d.plan.title+" "+d.plan.goal).toLowerCase().includes(query.toLowerCase().trim()));
 return <section className="dev-room court-room"><FeatureInfo topic="court"/>{err&&<p role="alert" className="dev-error">{err}</p>}{note&&<p role="status" className="dev-saved">{note}</p>}
 {view==="edit"&&coach&&draft?<CourtBuilder key={draft.id} family={family} data={data} packet={packet} initial={draft} automatic={automatic} existing={doc} close={list} showTemplates={()=>{T("Maler");S("");K("Alle");U("Alle");list();}} changed={load}/>:view==="show"||view==="run"?<><button className="dev-back" onClick={list}><ChevronRight size={15}/> Mine økter</button>{!doc?<p>Økten er ikke tilgjengelig.</p>:view==="run"&&coach?<CourtRun data={data} sid={id} bank={packet.catalog}/>:<CourtSummary viewer={data} key={doc.id} plan={doc.sharedPlan||doc.plan} bank={packet.catalog} seen={doc.seen} onSeen={coach?undefined:i=>void doIt(()=>court(data,"seen",doc.id,doc.rev,{item:i}))}/>}</>:
 <><nav className="dev-tabs" aria-label="Øktvisning">{(coach?["Mine økter","Lagrede forslag","Maler","Øvelsesbank"]:["Mine økter","Øvelsesbank"]).map(v=><button aria-pressed={tab===v} key={v} onClick={()=>{T(v);N("");F(undefined);}}>{coach&&v==="Mine økter"?"Lagets økter":v}</button>)}</nav>
 {tab==="Øvelsesbank"?<> {dest&&<section className="dev-panel court-form"><h3 tabIndex={-1} id="bank-destination">Legg {dest.length===1?"«"+dest[0].title+"»":dest.length+" øvelser"} i økt</h3><ol>{dest.map(x=><li key={x.id}>{x.title}</li>)}</ol><label>Velg økt<select value={target} onChange={e=>Y(e.target.value)}><option value="">Ny økt</option>{packet.sessions.filter(s=>!s.archived&&s.plan.origin!=="template").map(s=><option key={s.id} value={s.id}>{s.plan.title}</option>)}</select></label><button className="dev-primary" onClick={async()=>{const existing=packet.sessions.find(x=>x.id===target),p=structuredClone(existing?.plan||blank());p.items.push(...dest.map(x=>item(x.id,"",x.block||"Teknikk",x.training||600)));if(await doIt(()=>court(data,"save",p.id,existing?.rev||0,{plan:p,notes:existing?.notes||{}}),"Øvelse lagt til.")){F(undefined);open("edit",undefined,p);}}}>Bekreft og åpne økten</button></section>}<CourtBank viewer={data} bank={packet.catalog} favorites={packet.favorites} mark={id=>doIt(()=>court(data,"favorite",null,0,{exercise:id,on:!packet.favorites.includes(id)}))} create={coach?d=>doIt(()=>court(data,"exercise",null,0,{...d}),"Klubbøvelse lagret."):undefined} add={coach?d=>{F([d]);Y("");}:undefined} addMany={coach?rows=>{F(rows);Y("");}:undefined}/>
 {data.club?.active&&<CourtSource team={team} changed={load}/>}</>:
 <><div className="dev-actions"><h2>{tab}</h2>{coach&&<><button className="dev-primary" onClick={()=>open("edit",undefined,blank(),true)}><WandSparkles size={17}/>Lag økt automatisk</button><button onClick={()=>open("edit",undefined,blank())}><Plus size={16}/>Ny økt</button></>}</div>
 <div className="court-fields"><label>Søk etter økt<input type="search" value={query} onChange={e=>S(e.target.value)} placeholder="Navn eller tema"/></label><label>Økttype<select value={kind} onChange={e=>K(e.target.value)}>{["Alle","Lagtrening","Egentrening"].map(x=><option key={x}>{x}</option>)}</select></label>{coach&&<label>Status<select value={status} onChange={e=>U(e.target.value)}>{["Alle","Delt","Utkast"].map(x=><option key={x}>{x}</option>)}</select></label>}</div>
 {visible.map(d=><article className="court-list-item" key={d.id}><div className="court-thumb"><ClipboardList/></div><div><strong>{d.plan.title}</strong><p>{mins(total(d.plan))} min · {d.plan.purpose==="individual"?"Egentrening":"Fra treneren"}{" · "+sessionDate(d.plan.start)}</p><small>{d.plan.origin==="template"?"Mal":d.published?"Publisert":d.plan.origin==="generated"?"Lagret forslag":"Utkast"}</small>{coach&&<SessionHistory data={data} family={d.notes?.family||d.id}/>}</div><div className="dev-actions">{coach?<><button onClick={()=>open("edit",d)}>Rediger / del</button><button title="Bruk som utgangspunkt" onClick={()=>{const p=copyPlan(d.plan);open("edit",undefined,p,false,d.notes?.family||d.id);}}><Copy size={16}/></button>{d.published&&<><button onClick={()=>open("run",d)}><Play size={15}/>På banen</button><button onClick={()=>doIt(()=>court(data,"unpublish",d.id,d.rev),"Økten er avpublisert.")}>Avpubliser</button></>}<button title="Arkiver økt" onClick={()=>{if(confirm("Arkivere økten og fjerne spillertilgang?"))void doIt(()=>court(data,"archive",d.id,d.rev));}}>Arkiver</button></>:<button className="dev-primary" onClick={()=>open("show",d)}><Eye size={16}/>Se økten</button>}</div></article>)}
 {!visible.length&&<p>{coach?"Ingen økter i dette utvalget.":"Treneren har ikke delt noen økter i dette utvalget."} <button onClick={()=>T("Øvelsesbank")}><BookOpen size={15}/>Utforsk øvelser</button></p>}</>}</>}</section>;
}
function SessionHistory({data,family}:{data:Snapshot;family:string}){
 const [open,O]=useState(false),[rows,R]=useState<PlayedSession[]>(),[error,E]=useState("");
 useEffect(()=>{let active=true;if(open){R(undefined);E("");courtHistory(data,family).then(r=>{if(active)R(r);}).catch(e=>{if(active)E(e.message);});}return()=>{active=false;};},[data,family,open]);
 return <details onToggle={e=>O(e.currentTarget.open)}><summary>Gjennomføringshistorikk</summary>{error?<p role="alert">{error}</p>:!rows?<small>Henter historikk …</small>:<><strong>Gjennomført {rows.length} {rows.length===1?"gang":"ganger"}</strong>{rows.length>0&&<ul>{rows.map(r=><li key={r.id}>{r.finished?sessionDate(r.finished):r.planned?"Planlagt "+sessionDate(r.planned)+" (gjennomføringstid ukjent)":"Gjennomføringstid ukjent"} · {r.title}</li>)}</ul>}</>}</details>;
}
