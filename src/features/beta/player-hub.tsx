import {useEffect,useState} from "react";
import type {Snapshot} from "@/lib/beta";
import type {Run} from "./program-builder";
import {PlayerDesk} from "./player-desk";
import {PlayerStatistics} from "./player-statistics";
import {AthleteProfileView} from "./athlete-profile-view";

export function PlayerHub({data,busy,run,legacy=false}:{data:Snapshot;busy:boolean;run:Run;legacy?:boolean}){
 const [params,P]=useState<URLSearchParams>();
 useEffect(()=>P(new URLSearchParams(location.search)),[]);
 if(!params)return <p>Henter spillere …</p>;
 const id=params.get("athlete"),tab=params.get("vis")||(legacy?"statistikk":"oversikt");
 const player=data.roster.find(m=>m.role==="athlete"&&m.squad===data.me.squad&&m.id===id);
 return <><nav aria-label="Spillermeny" className="workspace-tabs">{[["oversikt","Oversikt"],["plan","Plan"],["statistikk","Statistikk"]].map(([k,label])=><a key={k} className={!id&&tab===k?"current":""} aria-current={!id&&tab===k?"page":undefined} href={k==="oversikt"?"/spillere":"/spillere?vis="+k}>{label}</a>)}</nav>
 {id?(player?<AthleteProfileView key={id} player={player} data={data}/>:<p>Spilleren er ikke registrert på valgt lag.</p>):tab==="plan"?<PlayerDesk data={data} run={run} busy={busy}/>:<PlayerStatistics key={tab} data={data} overview={tab!=="statistikk"}/>}</>;
}
