"use client";
import {FeatureInfo} from "@/features/beta/feature-info";
import {useEffect,useState} from "react";
import {PublicShell} from "@/features/beta/public-shell";
import {setPlayerPassword} from "@/lib/player-access";
import {env} from "@/lib/env";
export default function PlayerReset(){
 const [mode,A]=useState<"wait"|"invalid"|"recovery"|"club">("wait"),[token,T]=useState(""),[message,M]=useState(""),[busy,B]=useState(false),[saved,S]=useState(false);
 useEffect(()=>{const f=new URLSearchParams(location.hash.slice(1)),club=f.get("club");
  if(club&&/^([a-f0-9-]{36}){2}$/.test(club)){T(club);A("club");}
  else if(f.get("type")==="recovery"&&f.get("access_token")){T(f.get("access_token")!);A("recovery");}
  else A("invalid");
 },[]);
 return <PublicShell><section className="entry-content grid"><FeatureInfo topic="reset"><h1>{saved?"Passordet er endret":"Velg nytt passord"}</h1></FeatureInfo>{saved?<a className="btn primary" href="/login?role=athlete">Til utøverinnlogging</a>:mode==="wait"?<p>Kontrollerer lenken …</p>:mode==="invalid"?<p role="alert">Ugyldig lenke. Be treneren om en ny passordlenke.</p>:<form className="grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=String(f.get("password"));if(p!==f.get("repeat")){M("Passordene er ikke like.");return;}B(true);M("");try{if(mode==="club")await setPlayerPassword(token,p);else{const r=await fetch(env.supabaseUrl+"/auth/v1/user",{method:"PUT",headers:{apikey:env.supabaseAnonKey!,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({password:p})});if(!r.ok)throw Error("Kunne ikke endre passordet. Be om en ny lenke.");}T("");history.replaceState(null,"",location.pathname);S(true);}catch(x){M((x as Error).message);}finally{B(false);}}}><label>Nytt passord<input required autoComplete="new-password" type="password" name="password" minLength={8}/></label><label>Gjenta passord<input required autoComplete="new-password" type="password" name="repeat" minLength={8}/></label><button className="btn primary" disabled={busy}>Lagre passord</button></form>}{message&&<p role="alert">{message}</p>}</section></PublicShell>;
}
