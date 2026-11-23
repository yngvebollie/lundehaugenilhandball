import {useEffect,useState} from "react";
import {Bell} from "lucide-react";
import {clubRole,db} from "@/lib/beta";

export const clubRequestsChanged="club-requests-changed";

export function ClubRequestNotice({active}:{active:boolean}){
  const [overview,setOverview]=useState<{pending:number;accounts:number}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let mounted=true;
    const refresh=()=>{
      if(document.visibilityState==="hidden")return;
      void db?.rpc("beta_club_request_count").then(({data,error})=>{
        if(mounted&&!error)setOverview(data);
      });
    };
    refresh();
    const timer=window.setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    window.addEventListener(clubRequestsChanged,refresh);
    return ()=>{mounted=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);window.removeEventListener(clubRequestsChanged,refresh);};
  },[]);
  if(!overview)return null;
  return <section className="club-inbox" aria-label="Klubbadministrasjon">
    <div><strong role="status">{overview.pending===1?"1 åpen klubbsøknad":overview.pending+" åpne klubbsøknader"}</strong>
      <small>{overview.accounts} {overview.accounts===1?"ny bruker":"nye brukere"} med lagtilgang siste 7 dager</small></div>
    <button type="button" className={"btn"+(overview.pending?" primary":"")} disabled={busy} onClick={async()=>{
      setBusy(true);setError("");
      try{
        if(!active)await clubRole("club");
        const target="/directory?section=club-requests";
        if(location.pathname+location.search===target)location.reload();
        else location.assign(target);
      }
      catch(error){setError((error as {message?:string})?.message||"Kunne ikke åpne klubboversikten.");setBusy(false);}
    }}><Bell size={16} aria-hidden="true"/>{busy?"Åpner …":"Klubbsøknader og aktivitet"}</button>
    {error&&<small role="alert">{error}</small>}
  </section>;
}
