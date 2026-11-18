import {randomUUID} from 'node:crypto';
import {invitationUser,deliveryStore,reply} from '@/lib/invitation-server';
import {providerFailure,deliveryProblem,type DeliveryStatus} from '@/lib/invitation-delivery';

export const runtime='nodejs';
const usage=new Map<string,{until:number;count:number}>();
export async function POST(req:Request){
 const actor=await invitationUser(req);
 if(!actor)return reply({error:'Logg inn som trener for å sende invitasjoner.'},401);
 const key=process.env.RESEND_API_KEY,from=process.env.INVITE_FROM||'noreply@lundehaugenil.no';
 const service=deliveryStore();
 if(!key)return reply({error:'E-postutsending er ikke konfigurert: RESEND_API_KEY mangler på serveren. Ingen e-post er sendt. Du kan fortsatt opprette og dele lenker.'},503);
 let origin:URL;
 try{origin=new URL(process.env.APP_ORIGIN||'https://app.lundehaugenil.no');if(origin.protocol!=='https:'||origin.origin!==origin.href.replace(/\/$/,''))throw Error();}
 catch{return reply({error:'Registreringsadressen er feil konfigurert. Ingen e-post er sendt.'},503);}
 let body;
 try{const raw=await req.text();if(raw.length>30000)return reply({error:'For mange adresser.'},413);body=JSON.parse(raw);}catch{return reply({error:'Ugyldig invitasjon.'},400);}
 if(!body||!Array.isArray(body.addresses)||!body.addresses.length||body.addresses.length>100||!['athlete','coach'].includes(body.role)||typeof body.team!=='string'||
 body.addresses.some((e:unknown)=>typeof e!=='string'||e.length>254||!/^\S+@[^@\s]+\.[^@\s]+$/.test(e)))return reply({error:'Velg et lag, en rolle og opptil 100 gyldige e-postadresser.'},400);
 const addresses=[...new Set<string>(body.addresses.map((e:string)=>e.trim().toLowerCase()))];
 const now=Date.now();for(const [id,b] of usage)if(b.until<=now)usage.delete(id);
 const bucket=usage.get(actor.user.id)||{until:now+3600000,count:0};
 if(bucket.count+addresses.length>200)return reply({error:'Timegrensen for invitasjoner er nådd.'},429);
 bucket.count+=addresses.length;usage.set(actor.user.id,bucket);
 const batch=await actor.db.rpc('beta_bulk_invite',{team_id:body.team,addresses,member_role:body.role});
 if(batch.error)return reply({error:'Invitasjonene kunne ikke opprettes. Kontroller trenertilgangen til laget.'},403);
 const links=(batch.data as {email:string;token:string}[]).map(r=>({email:r.email,url:origin.origin+'/login?new=1&role='+body.role+'&invite='+encodeURIComponent(r.token)}));
 const rows=links.map(l=>({id:randomUUID(),team:body.team,recipient:l.email,member_role:body.role,sender:from,created_by:actor.user.id,status:'pending' as DeliveryStatus,provider_id:null as string|null,error_code:null as string|null}));
 if(service){
  const saved=await service.from('beta_invitation_deliveries').insert(rows);
  if(saved.error)return reply({links,accepted:false,reason:'Leveringsloggen kunne ikke lagres. Ingen e-post er sendt. Del lenkene eller kontakt administrator.'});
 }
 let reason:string|undefined;
 try{
  const result=await fetch('https://api.resend.com/emails/batch',{method:'POST',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'invitations/'+rows[0].id},signal:AbortSignal.timeout(15000),
   body:JSON.stringify(links.map(r=>({from,to:[r.email],subject:'Lundehaugen IL: Invitasjon til laget',text:'Hei! Du er invitert som '+(body.role==='athlete'?'utøver':'trener')+'. Åpne den personlige lenken innen sju dager:\n\n'+r.url+'\n\n'+(body.role==='athlete'?'Velg passord eller bruk eksisterende konto. E-postfeltet er valgfritt ved ny utøverregistrering.':'Bruk e-postadressen invitasjonen ble sendt til.')})))});
  const payload=await result.json().catch(()=>null);
  if(!result.ok){for(const row of rows){row.status=result.status>=500?'unknown':'failed';row.error_code=providerFailure(result.status,payload?.name);}}
  else{
   const ids=Array.isArray(payload?.data)?payload.data.map((r:{id?:unknown})=>r?.id):[];
   const valid=ids.length===rows.length&&new Set(ids).size===ids.length&&ids.every((id:unknown)=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id));
   rows.forEach((row,i)=>{row.status=valid?'queued':'unknown';row.provider_id=valid?ids[i]:null;row.error_code=valid?null:'missing_receipt';});
  }
 }catch{for(const row of rows){row.status='unknown';row.error_code='timeout';}}
 // Persist the provider ID before claiming that subsequent delivery can be checked.
 if(service){
  const update=await service.from('beta_invitation_deliveries').upsert(rows,{onConflict:'id'});
  if(update.error)reason='Utsendingen er forsøkt, men kvitteringen kunne ikke lagres. Levering er ukjent. Ikke send på nytt før Resend-loggen er kontrollert.';
 }else{
  const errors=[...new Set(rows.map(r=>r.error_code).filter(Boolean))].map(code=>deliveryProblem(code)).join(' ');
  reason=(errors||'E-posten er satt i sendekø hos Resend; levering er ikke bekreftet.')+' Leveringsloggen er utilgjengelig fordi SUPABASE_SERVICE_ROLE_KEY mangler på serveren. Administrator må fullføre oppsettet før status kan spores. Ikke send en ny kopi bare fordi loggen er tom.';
 }
 return reply({links,accepted:rows.every(r=>r.status==='queued'),reason:reason||'Se leveringsstatus per mottaker nedenfor. Sending er ikke det samme som levering.'});
}
