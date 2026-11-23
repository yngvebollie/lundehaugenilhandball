import {db,demo} from "./beta";
import type {LiveMatch} from "./live-match";
import type {Fixture} from "./match-journal";
import type {MatchPDF} from "./report-export";
import type {Report} from "./report-text";

export type SavedReport={digest:string;original:Report;reviewed:Report;revision:number};

export async function readSavedReport(game:Fixture):Promise<SavedReport|null>{
  if(demo)return JSON.parse(sessionStorage.getItem("kamper-private-report:"+game.team+":"+game.id)||"null");
  return (await db!.rpc("beta_report",{action:"read",t:game.team,m:game.id}).throwOnError()).data;
}

export async function readReportLogs(team:string,ids:string[],user:string){
  const logs=new Map<string,LiveMatch>();
  if(demo){
    const prefix="live-matches:"+team+":"+user+":";
    for(const id of ids){
      const raw=localStorage.getItem(prefix+id);
      if(raw)logs.set(id,JSON.parse(raw).document);
    }
  }else{
    for(let offset=0;offset<ids.length;offset+=60){
      const {data}=await db!.from("beta_live_match_logs").select("id,document").eq("team",team).in("id",ids.slice(offset,offset+60)).throwOnError();
      for(const row of data)logs.set(row.id,row.document as LiveMatch);
    }
  }
  return logs;
}

export function reportPDFItem(game:Fixture,saved?:SavedReport|null,log?:LiveMatch):MatchPDF{
  return {label:(saved?.reviewed.match.home||log?.home.name||game.home||"Hjemmelag")+" – "+
    (saved?.reviewed.match.away||log?.away.name||game.away||game.opponent),report:saved?.reviewed,revision:saved?.revision,log,
    details:[[game.day,game.start_time?.slice(0,5),game.venue].filter(Boolean).join(" · "),game.competition||""]};
}
