import {phoneLogin,playerAlias} from "../../supabase/functions/_shared/player-identity";
import {db} from "./beta";
type Signup={email:string;password:string;name:string;phone:string;given:string;family:string;shirt:string;kind:"none"|"athlete_code"|"link"|"email";token:string};
async function call(body:object){
 const {data,error}=await db!.functions.invoke("player-access",{body});
 if(error){let msg="Kunne ikke kontakte innloggingstjenesten. Prøv igjen.";try{msg=(await error.context.json()).error||msg;}catch{}throw Error(msg);}
 return data;
}
export async function registerPlayer(v:Signup){
 const r=await call({action:"register",...v});if(r.coach)return false;
 const {error}=await db!.auth.signInWithPassword({email:r.login,password:v.password});
 if(error)throw Error(`Kontoen ble opprettet. Logg inn med ${v.email?"e-post":"telefonnummer"} og passord.`);return true;
}
export async function passwordLogin(email:string,password:string,allowPlayer:boolean){
 const addr=email.trim().toLowerCase();
 if(allowPlayer&&!addr.includes("@")){
  const number=phoneLogin(addr);if(!number)throw Error("Oppgi telefonnummeret eller e-postadressen du registrerte deg med.");
  const {error}=await db!.auth.signInWithPassword({email:await playerAlias("tel:"+number),password});
  if(error)throw Error("Kunne ikke logge inn. Kontroller telefonnummer og passord.");return;
 }
 const normal=await db!.auth.signInWithPassword({email:addr,password});
 if(!normal.error)return;
 if(allowPlayer&&(normal.error.code==="invalid_credentials"||normal.error.code==="email_not_confirmed")){
  const alias=await playerAlias(addr);
  const player=await db!.auth.signInWithPassword({email:alias,password});if(!player.error)return;
 }
 throw normal.error;
}
export const contactAddress=(u:{email?:string;app_metadata?:Record<string,unknown>})=>u.app_metadata?.club_login==="athlete"?String(u.app_metadata.login_phone||u.app_metadata.contact_email||""):u.email||"";
export async function setPlayerPassword(code:string,password:string){await call({action:"reset",code,password});}
