"use client";
import {useEffect,useState} from "react";
import {hasSupabaseEnv} from "@/lib/env";
import type {Snapshot,Member} from "@/lib/beta";
import {Development} from "@/features/beta/development";
const squad="development-preview";
const coach:Member={id:"test-coach",squad,role:"coach",name:"Eksempeltrener"};
const player:Member={id:"liv",squad,role:"athlete",name:"Spiller A"};
// This standalone rehearsal never selects a live workspace or changes an Auth session.
export default function DevelopmentPreview(){
 const [role,R]=useState<"coach"|"athlete">();
 useEffect(()=>{const athlete=new URLSearchParams(location.search).get("rolle")==="utover";
  if(!hasSupabaseEnv()&&!new URLSearchParams(location.search).has("eksempel")){sessionStorage.setItem("nhf-persona",athlete?"liv":"coach");location.replace("/utvikling");return;}R(athlete?"athlete":"coach");
 },[]);
 if(!role)return <main><p>Åpner Min utvikling …</p></main>;
 const data:Snapshot={me:role==="coach"?coach:player,teams:[{id:squad,name:"Eksempellag J2013"}],roster:[player],plans:[],checks:[],programs:[],feedback:[],library:[],usage:[],focusMembers:[],reviews:[],notices:[],admins:[]};
 return <main className="dev-rehearsal"><header><strong>Lundehaugen IL · Mobiltest</strong><a href="/utvikling">Til klubben</a></header><aside>Kun eksempeldata. Endringer lagres i denne fanen. Ikke legg inn ekte spilleropplysninger.</aside>
 <nav className="dev-tabs" aria-label="Testrolle">{(["coach","athlete"] as const).map(r=><button key={r} aria-pressed={role===r} onClick={()=>{R(r);history.replaceState(null,"","/utvikling/demo?eksempel=1&rolle="+(r==="coach"?"trener":"utover"));}}>{r==="coach"?"Test som trener":"Test som utøver"}</button>)}</nav>
 <Development key={role} data={data}/></main>;
}
