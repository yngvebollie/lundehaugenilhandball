"use client";
import {useEffect,useState} from "react";
import {hasSupabaseEnv} from "@/lib/env";
import type {Snapshot,Member} from "@/lib/beta";
import {Development} from "@/features/beta/development";
import {FeatureInfo} from "@/features/beta/feature-info";
import {PreviewMerits} from "@/features/beta/preview-merits";
const squad="development-preview";
const coach:Member={id:"test-coach",squad,role:"coach",name:"Eksempeltrener"};
const players:Member[]=[{id:"liv",name:"Ada Eksempel"},{id:"demo-b",name:"Bo Eksempel"},{id:"demo-c",name:"Mika Eksempel"}].map(p=>({...p,squad,role:"athlete"}));
// This standalone rehearsal never selects a live workspace or changes an Auth session.
export default function DevelopmentPreview(){
 const [role,R]=useState<"coach"|"athlete">(),[selected,S]=useState("liv");
 const player=players.find(p=>p.id===selected)||players[0];
 useEffect(()=>{const athlete=new URLSearchParams(location.search).get("rolle")==="utover";
  if(!hasSupabaseEnv()&&!new URLSearchParams(location.search).has("eksempel")){sessionStorage.setItem("nhf-persona",athlete?"liv":"coach");location.replace("/utvikling");return;}R(athlete?"athlete":"coach");
 },[]);
 if(!role)return <main><p>Åpner Min utvikling …</p></main>;
 const data:Snapshot={me:role==="coach"?coach:player,teams:[{id:squad,name:"Eksempellag J2013"}],roster:role==="coach"?players:[player],plans:[],checks:[],programs:[],feedback:[],library:[],usage:[],focusMembers:[],reviews:[],notices:[],admins:[]};
 return <main className="dev-rehearsal"><header><FeatureInfo topic="demo"><strong>Lundehaugen IL · Interaktiv demo</strong></FeatureInfo><a href="/utvikling">Til klubben</a></header><aside>Kun eksempeldata. Endringer lagres i denne fanen. Ikke legg inn ekte spilleropplysninger.</aside>
 <nav className="dev-tabs" aria-label="Testrolle">{(["coach","athlete"] as const).map(r=><button key={r} aria-pressed={role===r} onClick={()=>{R(r);history.replaceState(null,"","/utvikling/demo?eksempel=1&rolle="+(r==="coach"?"trener":"utover"));}}>{r==="coach"?"Test som trener":"Test som utøver"}</button>)}</nav>
 {role==="athlete"&&<label>Eksempelspiller<select value={selected} onChange={e=>S(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
 <Development key={role+player.id} data={data} highlights={id=><PreviewMerits person={id}/>}/></main>;
}
