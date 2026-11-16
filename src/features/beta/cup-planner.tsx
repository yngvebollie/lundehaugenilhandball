import {useEffect,useState, type FormEvent} from "react";
import {db,demo,today,type Snapshot} from "@/lib/beta";

const stages=["Gruppespill","1/16-finale","1/8-finale","Kvartfinale","Semifinale","Finale"];
type Cup={id:string;name:string};
type Game={id:string;cup:string;opponent:string;day:string;stage:string;bracket:string;lineup:string[];declined:string[];played:string[];scored:number|null;conceded:number|null};
type Packet={cups:Cup[];games:Game[]};
const blank=(cup:string):Game=>({id:"",cup,opponent:"",day:today(),stage:stages[0],bracket:"",lineup:[],declined:[],played:[],scored:null,conceded:null});
export function CupPlanner({data,reg}:{data:Snapshot;reg:string}){
 const team=data.me.squad,key="club-cups:"+team+":"+reg;
 const [packet,P]=useState<Packet>(),[cup,C]=useState(""),[name,N]=useState(""),[draft,D]=useState<Game>(),[busy,B]=useState(false),[note,M]=useState("");
 async function read():Promise<Packet>{
  if(demo)return JSON.parse(localStorage.getItem(key)||'{"cups":[],"games":[]}');
  const cups=(await db!.from("beta_cups").select("id,name").eq("team",team).eq("registration",reg).order("name").throwOnError()).data||[];
  const games=cups.length?(await db!.from("beta_cup_games").select("id,cup,day,opponent,stage,bracket,lineup,declined,played,scored,conceded").eq("team",team).in("cup",cups.map(c=>c.id)).order("day").throwOnError()).data||[]:[];
  return {cups,games};
 }
 useEffect(()=>{let live=true;read().then(p=>{if(live){P(p);const target=p.games.find(g=>g.id===new URLSearchParams(location.search).get("cupGame"));C(target?.cup||p.cups[0]?.id||"");if(target)D({...target,played:target.played||[],declined:target.declined||[]});}}).catch(e=>{if(live)M(e.message)});return()=>{live=false};},[reg,team]);
 async function save(e:FormEvent,game?:Game){
  e.preventDefault();if(!packet||busy)return;B(true);M("");
  try{let next=await read();
   if(game){if((game.scored==null)!==(game.conceded==null))throw Error("Fyll ut begge måltall, eller la begge stå tomme.");
    const {id,cup:cid,...values}=game;
    if(demo){const g={...game,id:id||crypto.randomUUID()};next.games=[...next.games.filter(x=>x.id!==g.id),g];}
    else if(id)await db!.from("beta_cup_games").update(values).eq("id",id).eq("team",team).eq("cup",cid).select("id").single().throwOnError();
    else await db!.from("beta_cup_games").insert({...values,team,cup:cid}).throwOnError();
   }else{const v=demo?{id:crypto.randomUUID(),name:name.trim()}:(await db!.from("beta_cups").insert({team,registration:reg,name:name.trim()}).select("id,name").single().throwOnError()).data!;
    if(demo)next.cups.push(v);C(v.id);N("");}
   if(demo)localStorage.setItem(key,JSON.stringify(next));else next=await read();P(next);D(undefined);M(game?"Kamp og tropp lagret.":"Turnering opprettet.");
  }catch(e){M((e as Error).message);}finally{B(false);}
 }
 const roster=data.roster.filter(p=>p.role==="athlete"&&p.squad===team).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 return <section className="grid"><h2>Turneringer</h2><form className="day-strip" onSubmit={e=>save(e)}><label>Turneringsnavn<input value={name} maxLength={100} required onChange={e=>N(e.target.value)}/></label><button className="btn" disabled={busy||!packet||!name.trim()}>Opprett turnering</button></form>
 {packet?.cups.length?<><label>Turnering<select value={cup} onChange={e=>{C(e.target.value);D(undefined);}}>{packet.cups.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
 {packet.games.filter(g=>g.cup===cup).sort((a,b)=>a.day.localeCompare(b.day)).map(g=><button type="button" className="btn" key={g.id} onClick={()=>D({...g,played:g.played||[],declined:g.declined||[]})}>{g.day} · {g.opponent} · {g.bracket&&g.bracket+"-sluttspill · "}{g.stage} · {g.scored!==null?g.scored+"–"+g.conceded:"Planlagt"} · {g.lineup.length} spillere</button>)}
 <button className="btn" onClick={()=>D(blank(cup))}>Legg til turneringskamp</button></>:packet?<p>Ingen turneringer for dette laget.</p>:null}
 {draft&&<form className="grid" onSubmit={e=>save(e,draft)}><div className="km-fields"><label>Motstander<input required maxLength={100} value={draft.opponent} onChange={e=>D({...draft,opponent:e.target.value})}/></label><label>Kampdato<input required type="date" value={draft.day} onChange={e=>D({...draft,day:e.target.value})}/></label><label>Fase<select value={draft.stage} onChange={e=>D({...draft,stage:e.target.value,bracket:e.target.value===stages[0]?"":draft.bracket})}>{stages.map(s=><option key={s}>{s}</option>)}</select></label>{draft.stage!==stages[0]&&<label>Sluttspill<select value={draft.bracket} onChange={e=>D({...draft,bracket:e.target.value})}><option value="">Felles sluttspill</option><option value="A">A-sluttspill</option><option value="B">B-sluttspill</option></select></label>}
 {(["scored","conceded"] as const).map(k=><label key={k}>{k==="scored"?"Våre mål":"Motstanders mål"}<input type="number" min={0} max={999} value={draft[k]??""} onChange={e=>D({...draft,[k]:e.target.value===""?null:Number(e.target.value)})}/></label>)}</div>
 <fieldset><legend>Kamptropp · {draft.lineup.length} valgt</legend>{roster.map(p=><div className="day-strip" key={p.id}><span>{p.shirt_number&&"#"+p.shirt_number+" "}{p.name}</span><select aria-label={"Kampstatus for "+p.name} value={draft.declined.includes(p.id)?"declined":draft.played.includes(p.id)?"played":draft.lineup.includes(p.id)?"invited":""} onChange={e=>{const status=e.target.value;D({...draft,lineup:[...draft.lineup.filter(id=>id!==p.id),...status==="invited"||status==="played"?[p.id]:[]],declined:[...draft.declined.filter(id=>id!==p.id),...status==="declined"?[p.id]:[]],played:[...draft.played.filter(id=>id!==p.id),...status==="played"?[p.id]:[]]});}}><option value="">Ikke tatt ut</option><option value="invited">Invitert</option><option value="played">Spilte</option><option value="declined">Takket nei</option></select></div>)}{!roster.length&&<small>Ingen registrerte utøvere i troppen.</small>}</fieldset><div className="day-strip"><button className="btn primary" disabled={busy}>Lagre kamp og tropp</button><button type="button" className="btn" onClick={()=>D(undefined)}>Avbryt</button></div></form>}
 {note&&<p role="status">{note}</p>}</section>;
}
