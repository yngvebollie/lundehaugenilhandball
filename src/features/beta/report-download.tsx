import {useState} from "react";
import {Download} from "lucide-react";

export function ReportDownload({label,create,primary=false}:{label:string;create:()=>Promise<void>;primary?:boolean}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return <div className="day-strip">
    <button type="button" className={"btn"+(primary?" primary":"")} disabled={busy} onClick={async()=>{
      setBusy(true);setError("");
      try{await create();}
      catch(error){setError((error as {message?:string})?.message||"Kunne ikke lage PDF. Prøv på nytt.");}
      finally{setBusy(false);}
    }}><Download size={16} aria-hidden="true"/>{busy?"Genererer PDF …":label}</button>
    {error&&<small role="alert">{error}</small>}
  </div>;
}
