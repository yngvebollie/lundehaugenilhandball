"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,Download,Plus,Share,Smartphone} from "lucide-react";
import "./install.css";
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function InstallPage(){
 const [prompt,P]=useState<InstallEvent>(),[installed,I]=useState(false),[platform,S]=useState("iPhone"),[busy,B]=useState(false),[message,M]=useState("");
 useEffect(()=>{const standalone=matchMedia("(display-mode: standalone)");I(standalone.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);S(/android/i.test(navigator.userAgent)?"Android":"iPhone");
  const capture=(event:Event)=>{event.preventDefault();P(event as InstallEvent);};const done=()=>{I(true);P(undefined);M("");};const mode=()=>I(standalone.matches);
  window.addEventListener("beforeinstallprompt",capture);window.addEventListener("appinstalled",done);standalone.addEventListener("change",mode);
  return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",done);standalone.removeEventListener("change",mode);};},[]);
 async function install(){if(!prompt)return;B(true);M("");try{await prompt.prompt();const result=await prompt.userChoice;M(result.outcome==="accepted"?"Installasjon godkjent. Se etter klubbikonet på hjemskjermen.":"Ingen endring. Du kan installere senere fra nettlesermenyen.");P(undefined);}catch{M("Bruk nettlesermenyen og velg Legg til på hjemskjermen.");}finally{B(false);}}
 return <main className="install-page"><a href="/" className="install-back"><ArrowLeft size={17}/>Tilbake til appen</a><header><img src="/app-icon/192" alt="Lundehaugen IL" width={80} height={80}/><div><h1>Lundehaugen IL</h1><p>Rett fra hjemskjermen</p></div></header>
 {installed?<p role="status">Du bruker allerede appvisningen.</p>:<>{prompt&&<button className="btn primary" disabled={busy} onClick={()=>void install()}><Download size={18}/>Installer appen</button>}
 <nav className="install-tabs" aria-label="Velg telefon">{["iPhone","Android"].map(s=><button key={s} aria-pressed={platform===s} onClick={()=>S(s)}><Smartphone size={16}/>{s}</button>)}</nav>
 {platform==="iPhone"?<ol><li>Åpne <strong>app.lundehaugenil.no</strong> i Safari.</li><li>Trykk <Share size={17}/> <strong>Del</strong> i nettleseren.</li><li>Velg <Plus size={17}/> <strong>Legg til på Hjem-skjerm</strong>.</li><li>Velg <strong>Åpne som nettapp</strong> hvis valget vises, og trykk <strong>Legg til</strong>.</li></ol>:<ol><li>Åpne <strong>app.lundehaugenil.no</strong> i Chrome.</li><li>Åpne nettlesermenyen øverst til høyre.</li><li>Velg <strong>Installer app</strong> eller <strong>Legg til på startskjermen</strong>.</li><li>Bekreft. Åpne deretter klubbikonet.</li></ol>}</>}
 {message&&<p role="status">{message}</p>}<p>Samme konto, samme lag og alltid siste versjon. Første gang kan du bli bedt om å logge inn igjen. Appen trenger internett.</p><footer><a href="https://support.apple.com/guide/iphone/iphea86e5236/ios" target="_blank" rel="noreferrer">Apples veiledning</a><a href="https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid" target="_blank" rel="noreferrer">Chromes veiledning</a></footer></main>;
}
