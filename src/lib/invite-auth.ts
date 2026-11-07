import {clubLink} from "./club-url";
import {db} from "./beta";

export const validTeamCode=(value:string)=>/^[A-Z0-9]{6}$/.test(value);
export const validPhone=(value:string)=>/^\+?[\d ().-]+$/.test(value)&&/^\d{7,15}$/.test(value.replace(/\D/g,""));

// Keep admission separate from authentication. Only the team RPC grants membership.
export async function emailSignIn(email:string,returnPath:string,create:boolean,name="",phone=""){
  if(!db)throw Error("Passwordless email requires the connected app.");
  const target=clubLink(returnPath);
  const {error}=await db.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:target,shouldCreateUser:create,
    ...(create?{data:{full_name:name.trim(),contact_phone:phone.trim()}}:{})}});
  if(error)throw error;
}
