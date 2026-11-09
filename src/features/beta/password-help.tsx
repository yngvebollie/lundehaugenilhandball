import {useState} from "react";
import {KeyRound} from "lucide-react";
import {db,demo,type Member} from "@/lib/beta";
import {clubLink} from "@/lib/club-url";
import {env} from "@/lib/env";
export function PasswordHelp({team,player}:{team:string;player:Member}){
 const [busy,B]=useState(false),[url,U]=useState(""),[msg,M]=useState("");
 async function issue(){if(!confirm("Hjelpe "+player.name+" med nytt passord? Del bare lenken med denne spilleren."))return;
  B(true);M("");U("");try{
   if(demo)throw Error("Passordhjelp er tilgjengelig for ekte klubbkontoer.");
   const {data}=await db!.rpc("beta_player_reset",{t:team,p:player.id}).throwOnError();
   if(data.code){U(clubLink("/player-reset")+"#club="+data.code);M("Del privat med spilleren. Lenken gjelder én gang i 20 minutter. En ny lenke erstatter den gamle.");}
   else{
    // No PKCE challenge tied to the coach's browser: the athlete opens the email on their own device.
    const r=await fetch(env.supabaseUrl+"/auth/v1/recover?redirect_to="+encodeURIComponent(clubLink("/player-reset")),{method:"POST",headers:{apikey:env.supabaseAnonKey!,"Content-Type":"application/json"},body:JSON.stringify({email:data.email})});if(!r.ok)throw Error("Kunne ikke sende tilbakestillingen. Prøv igjen senere.");
    M("Passordlenke sendt til spillerens bekreftede e-postadresse.");
   }
  }catch(e){M((e as Error).message);}finally{B(false);}}
 return <div className="grid"><button className="btn" disabled={busy} aria-label={"Passordhjelp for "+player.name} onClick={issue}><KeyRound size={16}/>Passordhjelp</button>{msg&&<small role="status">{msg}</small>}{url&&<><label>Privat passordlenke<input readOnly value={url} onFocus={e=>e.target.select()}/></label><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(url);M("Kopiert. Del kun med spilleren.");}catch{M("Marker lenken for å kopiere.");}}}>Kopier lenke</button></>}</div>;
}
