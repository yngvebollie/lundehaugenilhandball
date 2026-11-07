import {CheckCircle2,MailCheck,ArrowRight} from "lucide-react";
export function SignupSuccess({name,email,team,role,joined=false,known=false,onOpen}:{name?:string;email:string;team?:string;role?:string;joined?:boolean;known?:boolean;onOpen?:()=>void}){
  return <section className="signup-success grid" aria-live="polite"><span className="success-symbol">{joined?<CheckCircle2 size={34}/>:<MailCheck size={34}/>}</span>
    <small>LUNDEHAUGEN IL · MEDLEMSKONTO</small>
    <h1>{joined?"Du er med på laget!":known?"Konto opprettet!":"Sjekk e-posten din"}</h1>
    <p>{joined?([name?.split(" ")[0],"velkommen til "+team+"."].filter(Boolean).join(", ")):<>Åpne lenken sendt til <strong>{email}</strong> for å bekrefte adressen og fortsette.</>}</p>
    {team&&<div className="success-team"><strong>{team}</strong><span>{role==="coach"?"Trener":"Utøver"}</span></div>}
    {!joined&&<small>Finner du ikke meldingen? Sjekk søppelpost. Har du allerede en konto, kan du logge inn med den.</small>}
    {onOpen&&<button className="btn primary" onClick={onOpen}>Åpne laget <ArrowRight size={16}/></button>}</section>;
}
