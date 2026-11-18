import {RefreshCw,WifiOff} from "lucide-react";
import "./connection-notice.css";

export function ConnectionNotice({offline,failed,busy,retry}:{offline:boolean;failed:boolean;busy:boolean;retry:()=>void}){
 if(!offline&&!failed)return null;
 return <section className="connection-notice" role="status" aria-label="Tilkoblingsstatus"><WifiOff size={19}/><div><strong>{offline?"Enheten melder at den er frakoblet":"Kunne ikke oppdatere innholdet"}</strong><p>Innholdet kan være utdatert. Lagring krever internett. Behold siden åpen hvis du har et ulagret utkast.</p></div><button type="button" className="btn" disabled={busy} onClick={retry}><RefreshCw size={16}/>{busy?"Henter …":"Prøv igjen"}</button></section>;
}
