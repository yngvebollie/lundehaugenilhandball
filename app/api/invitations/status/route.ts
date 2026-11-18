import {invitationUser,deliveryStore,reply} from '@/lib/invitation-server';
import {providerStatus,type InvitationDelivery} from '@/lib/invitation-delivery';

export const runtime='nodejs';
export const maxDuration=60;
const fields='id,recipient,member_role,sender,provider_id,status,error_code,created_at,checked_at,check_error';
const mailbox=(s:string)=>s.match(/<([^>]+)>/)?.[1]?.toLowerCase()||s.trim().toLowerCase();
export async function GET(req:Request){
 const actor=await invitationUser(req);
 if(!actor)return reply({error:'Logg inn som trener.'},401);
 const team=new URL(req.url).searchParams.get('team');
 if(!team||!/^[a-f0-9-]{36}$/i.test(team))return reply({error:'Velg et lag.'},400);
 // Authorize before any privileged write or Resend lookup. An athlete gets no rows.
 const result=await actor.db.from('beta_invitation_deliveries').select(fields).eq('team',team).order('created_at',{ascending:false}).limit(100);
 if(result.error)return reply({error:'Leveringsloggen kunne ikke lastes. Prøv igjen eller kontakt administrator.'},503);
 const rows=(result.data||[]) as InvitationDelivery[];
 const service=deliveryStore(),key=process.env.RESEND_READ_API_KEY||process.env.RESEND_API_KEY;
 let warning:string|undefined;
 if(rows.length&&(!service||!key))warning='Leveringskontroll er ikke konfigurert. Viser sist lagrede status.';
 if(service&&key){
  // Limit work and rotate by oldest check; shared timestamps also throttle multiple tabs.
  const due=rows.filter(r=>r.provider_id&&Date.now()-Date.parse(r.created_at)<30*86400000&&(!r.checked_at||Date.now()-Date.parse(r.checked_at)>60000))
   .sort((a,b)=>(a.checked_at?Date.parse(a.checked_at):0)-(b.checked_at?Date.parse(b.checked_at):0)).slice(0,10);
  for(const [index,row] of due.entries()){
   if(index)await new Promise(r=>setTimeout(r,650));
   let status=row.status,checkError:string|null=null;
   try{
    const res=await fetch('https://api.resend.com/emails/'+encodeURIComponent(row.provider_id!),{headers:{Authorization:'Bearer '+key},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
    const receipt=await res.json().catch(()=>null);
    if(!res.ok)checkError=res.status===401||res.status===403?'read_permission':'lookup_failed';
    else if(receipt?.id!==row.provider_id||!Array.isArray(receipt?.to)||receipt.to.length!==1||String(receipt.to[0]).toLowerCase()!==row.recipient.toLowerCase()||typeof receipt.from!=='string'||mailbox(receipt.from)!==mailbox(row.sender))checkError='receipt_mismatch';
    else status=providerStatus(receipt.last_event);
   }catch{checkError='lookup_failed';}
   const patch={status,check_error:checkError,checked_at:new Date().toISOString()};
   let write=service.from('beta_invitation_deliveries').update(patch).eq('id',row.id).eq('status',row.status);
   write=row.checked_at?write.eq('checked_at',row.checked_at):write.is('checked_at',null);
   const updated=await write.select('id');
   if(updated.error)warning='Statuskontrollen kunne ikke lagres. Viser sist lagrede status.';
   else if(updated.data?.length)Object.assign(row,patch);
   if(checkError){warning=checkError==='read_permission'?'Resend tillater ikke lesing av leveringsstatus. Administrator må konfigurere RESEND_READ_API_KEY med Full access.':'En eller flere statuser kunne ikke kontrolleres. Se detaljene ved mottakeren.';break;}
  }
 }
 return reply({deliveries:rows,warning});
}
