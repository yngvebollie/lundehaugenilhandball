"use client";
import {useEffect,useRef,useState} from "react";
import {PublicShell} from "@/features/beta/public-shell";
import {db} from "@/lib/beta";

export default function ConfirmEmail(){
  const [error,setError]=useState(""),started=useRef(false);
  useEffect(()=>{if(started.current)return;started.current=true;
    void (async()=>{try{
      const params=new URLSearchParams(location.hash.slice(1)),token=params.get("token_hash"),type=params.get("type");
      history.replaceState(null,"","/auth/confirm");
      if(!token||!db||!(type==="signup"||type==="magiclink"))throw Error("Ugyldig bekreftelseslenke.");
      const dest=new URL(params.get("next")||"/login",location.origin);
      const allowed=dest.origin===location.origin&&["/apply","/login","/join","/"].includes(dest.pathname);
      const {error}=await db.auth.verifyOtp({type,token_hash:token});if(error)throw error;
      location.replace(allowed?dest.pathname+dest.search:"/login");
    }catch(e){setError((e as Error).message);}})();
  },[]);
  return <PublicShell><section className="entry-content grid"><h1>{error?"Lenken kunne ikke brukes":"Bekrefter e-posten din …"}</h1>
    {error&&<><p role="alert">{error}</p><a className="btn primary" href="/login">Gå til innlogging</a></>}</section></PublicShell>;
}
