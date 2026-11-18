import {createHash} from 'node:crypto';
import {deliveryStore,reply} from '@/lib/invitation-server';
export const runtime='nodejs';
export async function POST(req:Request){
 const server=deliveryStore();if(!server)return reply({error:'Registrering er ikke konfigurert.'},503);
 let body;try{const raw=await req.text();if(raw.length>4000)return reply({error:'For stor forespørsel.'},413);body=JSON.parse(raw);}catch{return reply({error:'Ugyldig registrering.'},400);}
 if(typeof body?.code!=='string'||body.code.length!==72||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>100||typeof body.password!=='string'||body.password.length<10||body.password.length>128||typeof body.email!=='string')return reply({error:'Oppgi navn, invitert e-post og passord på minst 10 tegn.'},400);
 const ip=req.headers.get('x-vercel-forwarded-for')||req.headers.get('x-forwarded-for')||'unknown';
 const {data:address,error}=await server.rpc('beta_guardian_registration',{code:body.code,bucket:createHash('sha256').update(ip).digest('hex')});
 if(error||!address||address!==body.email.trim().toLowerCase())return reply({error:'Invitasjonen er utløpt, brukt eller tilhører en annen adresse. Prøv innlogging hvis du allerede har konto.'},400);
 const result=await server.auth.admin.createUser({email:address,password:body.password,email_confirm:true,user_metadata:{full_name:body.name.trim()},app_metadata:{club_login:'guardian'}});
 if(result.error)return reply({error:'Kontoen kunne ikke opprettes. Har du allerede konto, velg Logg inn. Ingen eksisterende konto er endret.'},400);
 return reply({created:true});
}
