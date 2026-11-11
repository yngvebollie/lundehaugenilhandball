import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {db,demo} from "@/lib/beta";
export function CourtSource({team,changed}:{team:string;changed:()=>void}){
 const [ref,R]=useState(""),[video,V]=useState(false),[approve,A]=useState(false),[history,H]=useState<object[]>([]),[preview,P]=useState<Record<string,number|boolean|string>>(),[msg,M]=useState(""),[busy,B]=useState(false);
 async function rights(action:string){if(demo){M("Kildeimport er av i lokal demo.");return;}
  const r=(await db!.rpc("beta_court_rights",{t:team,action,reference_text:ref,allow_video:video}).throwOnError()).data;A(r.approved);H(r.history);P(undefined);}
 useEffect(()=>{void rights("read").catch(e=>M(e.message))},[team]);
 async function act(cmd:string){B(true);M("");try{if(cmd==="approve"||cmd==="revoke"){await rights(cmd);changed();}else if(!demo){const token=(await db!.auth.getSession()).data.session?.access_token;const res=await fetch("/api/court-source",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({team,action:cmd,previewHash:preview?.digest})});
 const result=await res.json();if(!res.ok)throw Error(result.error);if(cmd==="preview")P(result);else{await rights("read");changed();M("Import lagret.");}}
 }catch(e){M((e as Error).message||"Kunne ikke fullføre.");}finally{B(false);}}
 return <details className="dev-panel court-form"><summary>NHF · kilde og import</summary><FeatureInfo topic="bank"/><strong>{approve?"Godkjent for laget":"Avventer rettighetsavklaring"}</strong>
 {!approve?<><label>Referanse til tillatelse for metadata og tekst for dette laget<input value={ref} onChange={e=>R(e.target.value)} maxLength={600}/></label><label className="dev-check"><input type="checkbox" checked={video} onChange={e=>V(e.target.checked)}/>Tillatelsen omfatter Vimeo-innbygging</label><button disabled={busy||demo||ref.trim().length<8} onClick={()=>act("approve")}>Registrer dokumentert tillatelse</button></>:<><button disabled={busy} onClick={()=>act("preview")}>Prøveimport</button><button disabled={busy||!preview||!!preview.major_drop} onClick={()=>act("import")}>Importer kontrollert katalog</button><button disabled={busy} onClick={()=>act("revoke")}>Trekk tilbake visning</button></>}
 {preview&&<p>Nye: {preview.inserted} · Endrede: {preview.updated} · Uendrede: {preview.unchanged} · Mangler: {preview.missing}</p>}
 <small>{history.length} nylige importer.</small>{msg&&<p role="status">{msg}</p>}</details>;
}
