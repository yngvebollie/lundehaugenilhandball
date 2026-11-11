import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import type { Snapshot } from "@/lib/beta";
import { trainingDay } from "@/lib/programs";
import { monday, volume, weekLabel, weekPlans } from "@/lib/workload";

function metrics(data:Snapshot,week:string,target:string){
  const rows=weekPlans(data.plans,week,target),v=volume(data,rows);
  const sum=(key:"sets"|"doneSets")=>v.body.reduce((n,b)=>n+b[key],0);
  return [rows.length,sum("sets"),sum("doneSets"),v.court,v.attended,...v.body.map(b=>b.sets)];
}
export function WeekCompare({data,week,target}:{data:Snapshot;week:string;target:string}){
  const [chosen,setChosen]=useState("");
  const baseline=chosen||trainingDay(week,-7),a=metrics(data,baseline,target),b=metrics(data,week,target);
  const labels=["Assigned activities","Planned sets","Logged sets","Planned court minutes","Attended court minutes","Upper body sets","Core sets","Lower body sets","Full body sets","Conditioning sets","Mobility sets","Unclassified sets"];
  return <section className="grid calendar-compare"><FeatureInfo topic="compare"/><label>Comparison week<input type="date" value={baseline} onChange={e=>setChosen(e.target.value?monday(e.target.value):"")}/></label>
    <p className="muted">{target?"Individual totals":"Team totals across athlete assignments"}. Change = selected week minus comparison week.</p>
    <div className="monitor-table"><table className="table"><thead><tr><th>Measure</th><th>{weekLabel(baseline)}</th><th>{weekLabel(week)}</th><th>Change</th></tr></thead><tbody>{labels.map((l,i)=><tr key={l}><th>{l}</th><td>{a[i]}</td><td>{b[i]}</td><td>{b[i]>a[i]?"+":""}{b[i]-a[i]}</td></tr>)}</tbody></table></div>
  </section>;
}
