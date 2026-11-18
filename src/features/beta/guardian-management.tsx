import {useEffect,useState,useRef} from 'react';
import {Copy,Mail,Link,ShieldCheck,UserRoundPlus} from 'lucide-react';
import {type Snapshot} from '@/lib/beta';
import {familyRpc,inviteGuardian,type GuardianRoster} from '@/lib/guardians';
import {InvitationDeliveries} from './invitation-deliveries';
import './guardian.css';
export function GuardianManagement({data}:{data:Snapshot}){
 const [roster,R]=useState<GuardianRoster>(),[person,P]=useState(''),[name,N]=useState(''),[email,E]=useState(''),[newChild,C]=useState(false),[busy,B]=useState(false),[error,X]=useState(''),[note,M]=useState(''),[link,L]=useState(''),[revision,V]=useState(0),[revoke,S]=useState<string>();
 const team=data.me.squad;
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(revoke)dialog.current?.showModal();},[revoke]);
 useEffect(()=>{let live=true;familyRpc<GuardianRoster>('beta_guardian_list',{t:team}).then(v=>{if(live)R(v);}).catch(e=>{if(live)X(e.message);});return()=>{live=false;};},[team,revision]);
 async function run(fn:()=>Promise<void>){B(true);X('');M('');try{await fn();V(v=>v+1);}catch(e){X((e as Error).message);}finally{B(false);}}
 return <section className="guardian-management grid"><header><h3><ShieldCheck size={20}/> Foresattilgang</h3></header>
 <details><summary>Hva får foresatte tilgang til?</summary><p>Foresatte får egen konto med leseoversikt for barnet. Ingen tilgang til andre spillere, interne trenernotater, private samtaler eller helseopplysninger. Koblingen aktiveres når den inviterte foresatte godtar invitasjonen. Trener kan avslutte tilgangen her.</p></details>
 <form className="grid" onSubmit={e=>{e.preventDefault();const send=(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')!=='link';void run(async()=>{L('');const r=await inviteGuardian(team,newChild?null:person,newChild?name:data.roster.find(p=>p.id===person)?.name||'',email.trim(),send);L(r.links[0]?.url||'');M(r.reason);});}}>
 <div className="stat-switch"><button type="button" aria-pressed={!newChild} onClick={()=>C(false)}>Eksisterende spiller</button><button type="button" aria-pressed={newChild} onClick={()=>C(true)}>Ny spiller med foresatt</button></div>
 {newChild?<label>Spillerens navn<input required maxLength={100} value={name} onChange={e=>N(e.target.value)}/></label>:<label>Spiller<select required aria-label="Spiller" value={person} onChange={e=>P(e.target.value)}><option value="">Velg spiller</option>{data.roster.filter(p=>p.role==='athlete').map(p=><option key={p.id} value={p.id}>{p.shirt_number?'#'+p.shirt_number+' ':''}{p.name}</option>)}</select></label>}
 <label>Foresattes e-post<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>E(e.target.value)}/></label>
 <div className="guardian-actions"><button className="btn primary" disabled={busy}><Mail size={16}/>Inviter foresatt</button><button value="link" className="btn" disabled={busy}><Link size={16}/>Opprett kun lenke</button></div></form>
 {link&&<div className="grid"><label>Personlig invitasjonslenke<input readOnly value={link} onFocus={e=>e.target.select()}/></label><button className="btn" onClick={()=>navigator.clipboard.writeText(link).then(()=>M('Lenken er kopiert.')).catch(()=>X('Marker lenken og kopier manuelt.'))}><Copy size={16}/>Kopier</button></div>}
 {error&&<p role="alert">{error}</p>}{note&&<p role="status">{note}</p>}
 <h3><UserRoundPlus size={18}/>Inviterte og tilkoblede foresatte</h3>{!roster&&!error&&<p role="status">Henter foresatte …</p>}{roster&&!roster.invitations.length&&<p>Ingen foresatte er invitert ennå.</p>}
 <ul className="guardian-roster">{roster?.invitations.map(i=><li key={i.id}><div><strong>{i.child}</strong><span>{i.email}</span><small>{i.revoked?'Tilgang avsluttet':i.accepted?(i.athlete?'Tilkoblet':'Venter på spillerregistrering'):Date.parse(i.expires)<Date.now()?'Invitasjonen er utløpt':'Invitert'}</small></div>{!i.revoked&&<button className="btn" disabled={busy} onClick={()=>S(i.id)}>Avslutt tilgang</button>}</li>)}</ul>
 {revoke&&<dialog ref={dialog} onCancel={()=>S(undefined)} aria-labelledby="revoke-family" className="family-confirm"><h3 id="revoke-family">Avslutte foresattilgangen?</h3><p>Foresatt mister tilgangen. Spillerens konto og historikk beholdes.</p><div className="guardian-actions"><button autoFocus className="btn" disabled={busy} onClick={()=>S(undefined)}>Avbryt</button><button className="btn primary" disabled={busy} onClick={()=>run(async()=>{await familyRpc('beta_guardian_revoke',{wanted:revoke});S(undefined);M('Tilgangen er avsluttet.');})}>Avslutt tilgang</button></div>{error&&<p role="alert">{error}</p>}</dialog>}
 <details><summary>Tilgangshistorikk</summary><ul className="guardian-roster">{roster?.audit.map((a,i)=><li key={i}><div><strong>{a.child}</strong><span>{{invited:'Invitert',accepted:'Godtatt',revoked:'Tilgang avsluttet',child_joined:'Spiller registrert'}[a.action]||a.action} · {a.actor}</span><small>{new Date(a.at_time).toLocaleString('nb-NO')}</small></div></li>)}</ul></details>
 <InvitationDeliveries team={team} revision={revision}/></section>;
}
