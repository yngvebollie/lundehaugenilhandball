import {Users} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
export function PublishingTeam({data}:{data:Snapshot}){
  const name=data.teams.find(t=>t.id===data.me.squad)?.name;
  const logo=data.teams.find(t=>t.id===data.me.squad)?.logo;
  return <div className="publish-target">{logo?<img alt="Team logo" src={logo} width={36} height={36}/>:<Users size={16}/>}<div><small>Publishing team</small><strong>{name}</strong></div><button type="button" className="btn" onClick={()=>{const selector=document.getElementById("active-team");selector?.scrollIntoView({block:"center"});selector?.focus({preventScroll:true});}}>Change team</button></div>;
}
