import type {Fixture,ReportStatus} from "@/lib/match-journal";
import {ReportDownload} from "./report-download";

export function TeamReportDownload({name,season,team,user,matches,reports}:{name:string;season:string;team:string;user:string;matches:Fixture[];reports:Record<string,ReportStatus>}){
  const played=matches.filter(game=>game.completed);
  if(!played.length)return null;
  return <ReportDownload label="Last ned lagets kamprapporter (PDF)" create={async()=>{
    const [{readReportLogs,readSavedReport,reportPDFItem},{downloadMatchPDF}]=await Promise.all([
      import("@/lib/match-report-data"),import("@/lib/report-export"),
    ]);
    const logs=await readReportLogs(team,played.map(game=>game.id),user);
    const ordered=[...played].sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||""));
    const items=[];
    for(let offset=0;offset<ordered.length;offset+=5){
      const batch=await Promise.all(ordered.slice(offset,offset+5).map(async game=>{
        const report=reports[game.id]?.revision?await readSavedReport(game):null;
        const log=logs.get(game.id);
        return report||log?.events.length?reportPDFItem(game,report,log):null;
      }));
      items.push(...batch.filter(item=>item!==null));
    }
    if(!items.length)throw Error("Laget har ingen lagrede kamprapporter eller hendelseslogger i denne sesongen.");
    const title=["Kamprapporter",name,season].filter(Boolean).join(" · ");
    await downloadMatchPDF(title,items);
  }}/>;
}
