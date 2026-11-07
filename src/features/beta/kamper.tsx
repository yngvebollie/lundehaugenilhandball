import {useCallback,useEffect,useState} from "react";
import {ArrowLeft,CalendarDays,ChevronRight,ClipboardList,ExternalLink,Minus,Plus,RefreshCw,Save,Settings,Star,Trophy} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {matches} from "@/lib/matches";
import {blank,confirmed,editProfile,matchAction,metrics,refreshSeason,register,registrations,shooting,toggleRegistration,type Details,type Fixture,type Player,type Stats} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";
import {ReportEditor} from "./report-editor";
import "./kamper.css";

export function Kamper({data}:{data:Snapshot}){
  const [view,setView]=useState(""),[id,setId]=useState(""),[all,setAll]=useState<Fixture[]>([]),[regs,setRegs]=useState<Registration[]>([]),[counts,setCounts]=useState<Record<string,number>>({});
  const [when,setWhen]=useState("Alle"),[league,setLeague]=useState(""),[busy,setBusy]=useState(false),[note,setNote]=useState("");
  const [org,setOrg]=useState(""),[sid,setSid]=useState(""),[cup,setCup]=useState(""),[adding,setAdding]=useState(false);
  const squad=data.me.squad,localTeam=data.teams.find(t=>t.id===squad)?.name,admin=data.admins.includes(data.me.id);
  const [profile,setProfile]=useState("");
  const game=all.find(x=>x.id===id),active=regs.find(r=>r.id===(game?.registration||profile))||regs[0];
  const load=useCallback(async()=>{setRegs(await registrations(squad));setAll(await matches(squad));setCounts(await matchAction(data,"counts"));},[squad]);
  useEffect(()=>{void load().catch(e=>setNote(e.message));setProfile(sessionStorage.getItem("kamper-profile:"+data.me.id+":"+squad)||"");const url=new URLSearchParams(location.search);setView(url.get("view")||"");setId(url.get("game")||"");},[load]);
  function choose(value:string){setProfile(value);sessionStorage.setItem("kamper-profile:"+data.me.id+":"+squad,value);setLeague("");setWhen("Alle");setId("");setNote("");setAdding(false);history.replaceState(null,"",view?"/match?view="+view:"/match");}
  async function run(fn:()=>Promise<void>){setNote("");setBusy(true);try{await fn();await load();}catch(e){setNote((e as Error).message);}finally{setBusy(false);}}
  async function sync(r:Registration){try{setNote(r.org_id+": "+await refreshSeason(r));}catch(e){setNote(r.org_id+": "+(e as Error).message);}}
  const scoped=all.filter(m=>active?m.registration===active.id:!m.registration);
  const label=(r:Registration)=>{const m=all.find(m=>m.registration===r.id&&m.home&&m.away);return (r.org_id===226751?"Hundvåg J13":m?(m.away===m.opponent?m.home:m.away):null)||"Lag "+r.org_id;};
  const title=active?label(active):"Kampoversikt";
  const filter=scoped.filter(m=>(!league||m.competition===league)&&(when==="Alle"||(when==="Ferdige"?m.completed:!m.completed&&m.day>=today()))).sort((a,b)=>Number(!!a.completed)-Number(!!b.completed)||(a.completed?b.day.localeCompare(a.day):a.day.localeCompare(b.day)));
  const latest=filter.find(m=>m.completed)||filter[0];
  const leagues=[...new Set(scoped.map(m=>m.competition).filter((c):c is string=>!!c))];
  function add(){setAdding(true);setView("teams");setId("");history.replaceState(null,"","/match?view=teams");}
  return <div className={"squad-space"+(id?" detail-mode":"")}>
    {!id&&<aside className="squad-rail"><h2>{localTeam}</h2><small>Treningsgruppe</small><h3>Spillelag</h3>
      {regs.map(r=><button className={active?.id===r.id?"current":""} key={r.id} aria-pressed={active?.id===r.id} onClick={()=>choose(r.id)}><span><strong>{label(r)}</strong><small>NIF {r.org_id}</small></span><ChevronRight size={16}/></button>)}
      {admin&&<button className="rail-add" onClick={add}><Plus size={16}/>Legg til spillelag</button>}</aside>}
    <section className="grid kamper">
    {!id&&regs.length>0&&<label className="squad-compact">Aktiv NIF-lagprofil<select value={active?.id||""} onChange={e=>choose(e.target.value)}>{regs.map(r=><option key={r.id} value={r.id}>{label(r)} · {r.org_id}</option>)}</select></label>}
    {note&&<p role="status" className="km-status">{note}</p>}
    {id?game?<MatchDetail key={game.id} data={data} game={game} reload={load}/>:<p>Kampen er ikke tilgjengelig. <a href="/match">Til oversikten</a></p>:<>
      <header className="squad-title"><div><h1>{title}</h1>{active&&<small className="id-tag">NIF {active.org_id}</small>}</div>
        <button disabled={busy||!active?.active} className="btn primary" onClick={()=>active&&run(()=>sync(active))}><RefreshCw size={16}/>Hent kamper nå</button></header>
      <nav className="workspace-tabs" aria-label="Kampmeny">{[["","Kamper"],["teams","Lagprofil"],["notes","Trenernotater"]].map(([v,n])=><a className={view===v?"current":""} href={v?"/match?view="+v:"/match"} key={v}>{n}</a>)}</nav>
      {view==="teams"||view==="notes"?<>
        {view==="teams"&&admin&&<details className="library-tools" open={adding}><summary onClick={e=>{e.preventDefault();setAdding(!adding);}}>Legg til spillelag</summary><form className="km-fields" onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await register(squad,+org,+sid,cup.trim()?cup.trim().split(/[,;\s]+/).map(Number):[]);choose(r.id);await sync(r);setOrg("");setCup("");});}}>
        <label>NIF lag-ID<input required type="number" min="1" value={org} onChange={e=>setOrg(e.target.value)}/></label><label>NIF sesong-ID (valgfri)<input type="number" min="1" value={sid} onChange={e=>setSid(e.target.value)}/></label><label>Liga-ID-er (valgfritt)<input value={cup} onChange={e=>setCup(e.target.value)}/></label><button disabled={busy} className="btn primary">Legg til lag og hent kamper</button></form></details>}
        {active&&<>{view==="teams"&&<div className="km-row"><div><strong>Synkronisering</strong><p>{active.sync_result||"Ikke synkronisert"}{active.synced_at&&" · "+new Date(active.synced_at).toLocaleString("nb-NO")}</p></div>{admin&&<button disabled={busy} className="btn" onClick={()=>run(()=>toggleRegistration(active))}>{active.active?"Sett på pause":"Aktiver"}</button>}</div>}
        <ProfileInfo key={active.id+view} r={active} admin={admin} busy={busy} run={run} notesOnly={view==="notes"}/></>}
      </>:<>
        <header className="competition-heading"><div><h2>{league||leagues[0]||"Kamper"}</h2><small>{active?.tournament?"Liga "+(active.leagues?.join(", ")||active.tournament):"Terminliste"}</small></div>
        <div className="day-strip">{leagues.length>1&&<select aria-label="Turnering" value={league} onChange={e=>setLeague(e.target.value)}><option value="">Alle turneringer</option>{leagues.map(l=><option key={l}>{l}</option>)}</select>}<select aria-label="Kampstatus" value={when} onChange={e=>setWhen(e.target.value)}>{["Alle","Kommende","Ferdige"].map(o=><option key={o}>{o}</option>)}</select></div></header>
        <div className="fixture-list">{filter.map(m=><a className={"fixture-line "+(m.id===latest?.id?"spotlight":"")} href={"/match?game="+m.id} key={m.id}><time dateTime={m.day}>{new Date(m.day+"T12:00:00").toLocaleDateString("nb-NO",{weekday:"short",day:"numeric",month:"short"})}</time><small>{m.start_time?.slice(0,5)||"–"}</small><strong>{m.home||localTeam} – {m.away||m.opponent}</strong><b>{m.score}</b><small>{m.venue}</small><span className={"badge "+(m.completed?"green":"blue")}>{m.completed?"Ferdig":m.status==="Planlagt"?"Kommende":m.status||"Planlagt"}</span><ChevronRight size={17}/></a>)}</div>
        {!filter.length&&<p>Ingen kamper i dette utvalget.</p>}
        {latest&&<div className="match-summary"><strong>Kampdetaljer</strong><span>ResPIN {latest.nif_id||"–"}</span><small>{counts[latest.id]||0} spillervurderinger</small><a className="btn primary" href={"/match?game="+latest.id}>Åpne kamprapport <ChevronRight size={16}/></a></div>}
        {!active&&admin&&<button className="btn" onClick={add}><Plus size={16}/>Legg til første spillelag</button>}
      </>}
    </>}</section></div>;
}
function ProfileInfo({r,admin,busy,run,notesOnly}:{notesOnly:boolean;r:Registration;admin:boolean;busy:boolean;run:(fn:()=>Promise<void>)=>Promise<void>}){
  const [note,setNote]=useState(r.profile_note||""),[ids,setIds]=useState((r.leagues?.length?r.leagues:r.tournament?[r.tournament]:[]).join(", ")),[saved,setSaved]=useState("");
  return <form className="grid" onSubmit={e=>{e.preventDefault();void run(async()=>{await editProfile(r,ids.trim()?ids.trim().split(/[,;\s]+/).map(Number):[],note);setSaved("Lagprofil lagret.");});}}>
    {!notesOnly&&<label>Profilens liga-ID-er<input readOnly={!admin} value={ids} onChange={e=>setIds(e.target.value)}/></label>}<label>Lagnotat<textarea readOnly={!admin} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
    {admin&&<button className="btn" disabled={busy}><Save size={16}/>Lagre lagprofil</button>}{saved&&<p role="status">{saved}</p>}</form>;
}
function MatchDetail({data,game:g,reload}:{data:Snapshot;game:Fixture;reload:()=>Promise<void>}){
  const [section,setSection]=useState("Kamprapport");
  const [d,setD]=useState<Details>(),[selected,pick]=useState(""),[source,setSource]=useState(""),[name,setName]=useState(""),[num,setNum]=useState(""),[score,setScore]=useState(g.score||"");
  const [busy,setBusy]=useState(false),[note,setNote]=useState("");
  const read=async()=>setD(await matchAction(data,"details",g.id));
  useEffect(()=>{void read().catch(e=>setNote(e.message));},[g.id]);
  async function mutate(action:string,p:string|null,v:Record<string,unknown>,message:string){
    setBusy(true);setNote("");try{await matchAction(data,action,g.id,p,v);await read();await reload();setNote(message);return true;}catch(e){setNote((e as Error).message);return false;}finally{setBusy(false);}
  }
  const opts=new Map([...(d?.catalog||[]),...data.roster.filter(m=>m.role==="athlete")].map(p=>[p.id,p.name]));
  const sel=d?.rows.find(p=>p.player_id===selected);
  return <section className="grid"><a href="/match"><ArrowLeft size={15}/> Kampoversikt</a><header><small>{g.day} {g.start_time?.slice(0,5)} · {g.status||"Planlagt"}</small><h2>{g.home||data.teams.find(x=>x.id===g.team)?.name} – {g.away||g.opponent} {g.score}</h2><p>{[g.venue,g.competition,g.age_class].filter(Boolean).join(" · ")}</p>
    {g.nif_id&&<a href={"https://www.handball.no/system/kamper/kamp/?matchid="+g.nif_id} target="_blank" rel="noreferrer">Kamp på handball.no <ExternalLink size={14}/></a>}</header>
    <nav className="workspace-tabs" aria-label="Kampdetaljer">{["Kampinformasjon","Spillere","Kamprapport"].map(v=><button key={v} className={v===section?"current":""} onClick={()=>setSection(v)}>{v}</button>)}<small className="private-mark">Kun trenere</small></nav>
    {section==="Kampinformasjon"&&<div className="match-summary"><strong>ResPIN {g.nif_id||"–"}</strong><span>{g.day} · {g.start_time?.slice(0,5)||"–"}</span><span>{g.venue||"Ukjent hall"}</span></div>}
    {!g.registration&&!g.completed&&g.day<=today()&&<form className="day-strip" onSubmit={e=>{e.preventDefault();void mutate("finished",null,{score},"Sluttresultat lagret.");}}><label>Sluttresultat<input required pattern="[0-9]+ *[-:] *[0-9]+" maxLength={20} placeholder="24-21" value={score} onChange={e=>setScore(e.target.value)}/></label><button disabled={busy} className="btn">Marker ferdig</button></form>}
    <div hidden={section!=="Kamprapport"}><ReportEditor game={g} data={data} onSaved={read}/></div><div hidden={section!=="Spillere"}><div className="grid">
    <h3>Spillerstatistikk</h3>
    <div className="km-players">{d?.rows.filter(p=>confirmed(p)||p.stats||p.discrepancy).map(p=><button className={"km-player "+(selected===p.player_id?"active":"")} key={p.player_id} onClick={()=>pick(p.player_id)}>
      <strong>{p.shirt_number&&"#"+p.shirt_number+" "}{p.name}</strong><span>{p.stats?p.stats.shots_hit+" mål · "+p.stats.shots_missed+" bom · "+p.stats.technical_errors+" feil · "+p.stats.goalkeeper_saves+" redninger":"Ingen tall registrert"}</span>
      <small>{p.discrepancy?"Kontroller NIF-endring":p.local_played!=null?"Manuelt bekreftet":"NIF"} {p.stats?.rating?" · "+p.stats.rating+"/5":""} {p.stats?.is_best_player?" · Banens beste":""}</small></button>)}</div>
    {d&&!d.rows.some(confirmed)&&<p>Ingen bekreftede deltakere.</p>}
    <details className="library-tools"><summary>Deltakelse og spillerutvalg</summary><div className="grid">
      {d?.rows.map(p=><label key={p.player_id} className="exercise-row"><input type="checkbox" disabled={busy} checked={confirmed(p)} onChange={e=>void mutate("participant",p.player_id,{played:e.target.checked},"Deltakelse lagret.")}/>{p.name} · {p.local_played!=null?"Manuell":p.nif_played===true?"NIF: spilte":p.nif_played===false?"NIF: spilte ikke":"Ikke bekreftet"}{p.discrepancy?" · Kontroller avvik":""}</label>)}
      <form className="km-fields" onSubmit={e=>{e.preventDefault();void mutate("participant",source||null,{name,number:num,played:true},"Spiller lagt til.").then(ok=>{if(ok){setName("");setNum("");setSource("");}});}}>
        <label>Velg spiller<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Ny spiller</option>{[...opts].filter(([id])=>!d?.rows.some(p=>p.player_id===id)).map(([id,n])=><option value={id} key={id}>{n}</option>)}</select></label>
        {!source&&<label>Spillernavn<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Draktnummer<input maxLength={8} value={num} onChange={e=>setNum(e.target.value)}/></label><button className="btn" disabled={busy}><Plus size={16}/>Bekreft spiller</button></form>
    </div></details>
    {sel&&confirmed(sel)&&<StatEditor key={sel.player_id} p={sel} busy={busy} save={s=>mutate("stats",sel.player_id,s,"Statistikk lagret.")} erase={data.admins.includes(data.me.id)&&sel.stats?async()=>{if(window.confirm("Slette vurderingen og notatet permanent?")){await mutate("erase",sel.player_id,{},"Vurdering slettet.");pick("");}}:undefined}/>}
    {note&&<p role="status" className="km-status">{note}</p>}</div></div></section>;
}
function StatEditor({p,busy,save,erase}:{p:Player;busy:boolean;save:(s:Stats)=>Promise<boolean>;erase?:()=>Promise<void>}){
  const [s,set]=useState<Stats>({...blank,...p.stats}),shot=shooting(s);
  return <form className="km-editor grid" onSubmit={e=>{e.preventDefault();void save(s);}}><h3>{p.shirt_number&&"#"+p.shirt_number+" "}{p.name}</h3><div className="km-fields">
{(Object.keys(metrics) as (keyof typeof metrics)[]).map(k=><div key={k}><span>{metrics[k]}</span><span className="km-step"><button type="button" title={"Reduser "+metrics[k]} disabled={!s[k]} onClick={()=>set({...s,[k]:s[k]-1})}><Minus size={15}/></button><input aria-label={metrics[k]} required type="number" min={0} max={2147483647} step={1} value={s[k]} onChange={e=>set({...s,[k]:Math.max(0,Number(e.target.value))})}/><button type="button" title={"Øk "+metrics[k]} onClick={()=>set({...s,[k]:s[k]+1})}><Plus size={15}/></button></span></div>)}</div>
    <p>{shot.total} skudd · Treffprosent: {shot.percent===null?"–":shot.percent+" %"}</p>
    <div className="day-strip" aria-label="Spillervurdering">{[1,2,3,4,5].map(n=><button key={n} type="button" className="km-star" aria-label={n+" stjerner"} aria-pressed={s.rating===n} onClick={()=>set({...s,rating:n})}><Star size={22} fill={(s.rating||0)>=n?"currentColor":"none"}/></button>)}<button className="btn" type="button" disabled={!s.rating} onClick={()=>set({...s,rating:null})}>Fjern stjerner</button></div>
    <label className="exercise-row"><input type="checkbox" checked={s.is_best_player} onChange={e=>set({...s,is_best_player:e.target.checked})}/><Trophy size={16}/> Banens beste</label>{p.nif_best_player&&<small>Offisielt valgt av NIF</small>}
    <label>Privat trenernotat<textarea maxLength={500} value={s.notes||""} onChange={e=>set({...s,notes:e.target.value})}/><small>{s.notes?.length||0}/500</small></label>
    <div className="day-strip"><button className="btn primary" disabled={busy}><Save size={16}/>Lagre statistikk</button>{erase&&<button className="btn" disabled={busy} type="button" onClick={erase}>Slett vurdering</button>}</div></form>;
}
