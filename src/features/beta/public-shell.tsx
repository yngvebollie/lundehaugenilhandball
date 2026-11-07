import type { ReactNode } from "react";
import "./public-shell.css";

export function PublicShell({children}:{children:ReactNode}){
  return <main className="public-shell"><div className="public-inner">
    <header className="public-header">
      <a className="public-brand" href="/login"><span className="brand-mark">NHF</span><span>Performance Platform<small>Lundehaugen IL</small></span></a>
      <svg className="court-mark" viewBox="0 0 150 76" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2" width="146" height="72"/><path d="M75 2v72M2 14q38 0 38 24T2 62m146-48q-38 0-38 24t38 24"/><path strokeDasharray="3 4" d="M2 6q51 0 51 32T2 70m146-64q-51 0-51 32t51 32"/><path strokeWidth="3" d="M1 32v12m148-12v12"/>
      </svg>
    </header>{children}
  </div></main>;
}
