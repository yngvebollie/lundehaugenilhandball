import {db} from '@/lib/beta';
import type {AthleteGame} from '@/features/beta/mobile-match-list';
import type {LoggedExercise} from './beta';
import type {Item} from './court/model';
export type GuardianChild={id:string;athlete:string|null;name:string;team:string;team_name:string;shirt:string|null;photo:string|null;position:string|null;registration:string|null;expired:boolean};
export type FamilySnapshot={plans:{id:string;title:string;day:string;time:string|null;minutes:number|null;kind:string;exercises:string[];sets:LoggedExercise[]|null;done:number}[];
 sessions:{id:string;title:string;start:string;venue:string;goal:string;items:Item[]}[];notices:{id:string;body:string;day:string}[];goals:{id:string;title:string;intention:string;criteria:string;stage:number;status:string}[];
 awards:{key:string;level:number;at:string;match?:string;goals?:number;opponent?:string}[];games:AthleteGame[]};
export type GuardianRoster={invitations:{id:string;athlete:string|null;child:string;email:string;created:string;expires:string;accepted:string|null;revoked:string|null}[];audit:{action:string;at_time:string;actor:string;child:string}[]};
export async function familyRpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{if(!db)throw Error('Foresattilgang krever tilkoblet konto.');return (await db.rpc(name,args).throwOnError()).data as T;}
export async function inviteGuardian(team:string,athlete:string|null,child:string,email:string,send:boolean){
 if(!send){const r=await familyRpc<{email:string;token:string}>('beta_guardian_invite',{t:team,p:athlete,address:email,child});return {links:[{email:r.email,url:location.origin+'/foresatt?invite='+encodeURIComponent(r.token)}],reason:'Personlig lenke opprettet. Ingen e-post er sendt.'};}
 const token=(await db!.auth.getSession()).data.session?.access_token;if(!token)throw Error('Logg inn på nytt.');
 const r=await fetch('/api/invitations',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({team,role:'guardian',athlete,child,addresses:[email]})});const payload=await r.json();if(!r.ok)throw Error(payload.error);return payload as {links:{email:string;url:string}[];reason:string};
}
