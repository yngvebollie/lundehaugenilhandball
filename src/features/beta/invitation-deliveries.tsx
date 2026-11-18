import {useCallback,useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,Clock,RefreshCw} from 'lucide-react';
import {db,demo} from '@/lib/beta';
import {deliveryLabels,deliveryDetail,deliveryProblem,type InvitationDelivery} from '@/lib/invitation-delivery';
import './invitation-deliveries.css';

export function InvitationDeliveries({team,revision}:{team:string;revision:number}){
 const [rows,setRows]=useState<InvitationDelivery[]>([]),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const request=useRef(false),generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(request.current||demo)return;
  request.current=true;setBusy(true);const version=generation.current;
  try{
   const token=(await db!.auth.getSession()).data.session?.access_token;
   if(!token)throw Error('Logg inn på nytt for å se leveringsstatus.');
   const response=await fetch('/api/invitations/status?team='+encodeURIComponent(team),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(65000)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Kunne ikke hente leveringsstatus.');
   if(version!==generation.current)return;
   setRows(result.deliveries);setError(result.warning||'');setLoaded(true);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Kunne ikke hente leveringsstatus.');}
  finally{request.current=false;if(version===generation.current)setBusy(false);}
 },[team]);
 useEffect(()=>()=>{generation.current++;},[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},65000);return()=>clearInterval(timer);},[refresh,revision]);
 if(demo)return null;
 return <section className="delivery-log" aria-label="Leveringsstatus for e-postinvitasjoner">
  <div className="delivery-heading"><h3>Leveringsstatus</h3><button className="btn" type="button" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{busy?'Kontrollerer':'Oppdater status'}</button></div>
  {error&&<p role="alert" className="delivery-warning"><AlertCircle size={17}/>{error}</p>}
  {!loaded&&!error&&<p role="status">Henter leveringslogg…</p>}
  {loaded&&!rows.length&&<p>Ingen sporbare utsendinger ennå. Eldre invitasjoner uten meldings-ID har ukjent leveringsstatus.</p>}
  {rows.length>0&&<><p className="muted">Siste {rows.length} utsendinger. Status kontrolleres mens siden er åpen. Eldre utsendinger uten meldings-ID vises ikke her.</p>
   <ul className="delivery-list">{rows.map(row=>{
    const failed=['bounced','failed','suppressed','complained','canceled'].includes(row.status);
    const Icon=failed?AlertCircle:row.status==='delivered'?CheckCircle2:Clock;
    return <li key={row.id} className={failed?'delivery-failed':''}>
     <div className="delivery-recipient"><strong>{row.recipient}</strong><small>{row.member_role==='guardian'?'Foresatt':row.member_role==='athlete'?'Utøver':'Trener'} · {new Date(row.created_at).toLocaleString('nb-NO')}</small><small>Fra: {row.sender}</small></div>
     <div className="delivery-state"><strong className={failed?'delivery-danger':row.status==='delivered'?'delivery-success':''}><Icon size={16}/>{deliveryLabels[row.status]||deliveryLabels.unknown}</strong>
      <p>{deliveryDetail(row)}</p>{row.check_error&&<p className="delivery-warning">{deliveryProblem(row.check_error)}</p>}
      <small>{row.checked_at?'Sist kontrollert: '+new Date(row.checked_at).toLocaleString('nb-NO'):'Levering er ikke kontrollert ennå.'}</small>
      {row.provider_id&&<details><summary>Meldingsreferanse</summary><code>{row.provider_id}</code></details>}
     </div>
    </li>;
   })}</ul></>}
 </section>;
}
