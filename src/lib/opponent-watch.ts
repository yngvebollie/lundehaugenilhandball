import type {Fixture,ReportStatus} from "./match-journal";
import type {SeasonLog} from "./season-match-statistics";

export type WatchedGame={game:Fixture;log?:SeasonLog;checked?:number};
export type OpponentWatch={team:string;season:number;org_id:number;name:string;leagues:number[];fixtures:WatchedGame[];synced_at:string};

export function opponentPacket(watch:OpponentWatch,own:Fixture[],reports:Record<string,ReportStatus>,
  ownLogs:Record<string,SeasonLog>,headToHead:boolean,historical=false){
  const owned=new Map(own.filter(game=>game.nif_id).map(game=>[game.nif_id,game]));
  const logs:Record<string,SeasonLog>={};
  const links:Record<string,string>={};
  const statsReports:Record<string,ReportStatus>={};
  const games=watch.fixtures.flatMap(({game,log})=>{
    const match=owned.get(game.nif_id);
    if(headToHead&&!match)return [];
    const ownLog=match&&ownLogs[match.id];
    const matchingScore=match?.score?.match(/\d+/g)?.join("-")===game.score?.match(/\d+/g)?.join("-");
    const manual=ownLog&&ownLog.eventOrigin!=="api";
    const preferred=manual?ownLog:log??(matchingScore?ownLog:undefined);
    if(preferred)logs[game.id]=preferred;
    if(match&&matchingScore&&reports[match.id])statsReports[game.id]=reports[match.id];
    links[game.id]=match?"/match?game="+encodeURIComponent(match.id)+"&section=events"+(historical?"&history="+watch.season:""):
      "https://www.handball.no/system/kamper/kamp/?matchid="+game.nif_id+"#tab=events";
    return [game];
  });
  return {games,logs,links,reports:statsReports};
}
