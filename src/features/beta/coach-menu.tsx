import {House,Activity,BookOpen,CalendarDays,ChartNoAxesColumnIncreasing,ChevronDown,ClipboardList,ContactRound,Dumbbell,Medal,ScanLine,Trophy,Users,Volleyball,type LucideIcon} from "lucide-react";
import {courtEnabled} from "@/lib/court/client";
import {developmentVisible} from "@/lib/development/flags";
export const playerMenu=[["oversikt","Oversikt"],["plan","Plan"],["rapportkoblinger","Koble spiller"],["statistikk","Statistikk"]] as const;
export const playerUrl=(key:string)=>key==="oversikt"?"/spillere":"/spillere?vis="+key;
type Item=[string,string,LucideIcon,boolean,boolean?];
export function CoachMenu({view,hash}:{view:string;hash:string}){
 const at=(v:string)=>view===v,isHash=(h:string)=>at("dashboard")&&hash==="#"+h;
 const items:Item[]=[
 ["Oversikt","/#overview",House,at("dashboard")&&(!hash||isHash("overview"))],["Spillere","/spillere",ContactRound,at("roster")||at("players")||isHash("spillerplan")],
 ["Workout builder","/#builder",Dumbbell,isHash("builder")],["Weekly planner","/#weekly",CalendarDays,isHash("weekly")],["Health monitor","/#monitor",Activity,isHash("monitor")],
 ["Øvelsesvurderinger","/#ratings",ClipboardList,isHash("ratings")],["Team management","/team",Users,at("team")],["Kamper","/match",Volleyball,at("match")],
 ["Liveanalyse","/liveanalyse",ScanLine,at("live")],["Utfordringer","/challenges",Trophy,at("challenges")],["Øktplanlegger","/okter",ClipboardList,at("court")&&new URLSearchParams(location.search).get("vis")!=="bank",courtEnabled],
 ["Øvelsesbank","/okter?vis=bank",BookOpen,at("court")&&new URLSearchParams(location.search).get("vis")==="bank",courtEnabled],["Min utvikling","/utvikling",ChartNoAxesColumnIncreasing,at("development"),developmentVisible],
 ["Merker","/merker",Medal,at("badges")],["Meldinger","/#messages",Users,isHash("messages")],["Brukeroversikt","/directory",ContactRound,at("directory")]];
 const adminUrl=(url:string)=>url==="/team"||url==="/directory";
 return <>{items.filter(i=>!adminUrl(i[1])).filter(i=>i[4]!==false).sort((a,b)=>Number(b[1]==="/#overview")-Number(a[1]==="/#overview")||a[0].localeCompare(b[0],"nb")).map(([name,url,Icon,current])=>name==="Spillere"?<details key={url} className="player-submenu" open={current||undefined}><summary className={"nav-item "+(current?"active":"")}><Icon/>{name}<ChevronDown size={14}/></summary><div>{playerMenu.map(([k,label])=><a key={k} href={playerUrl(k)}>{label}</a>)}</div></details>:<a key={url} href={url} className={"nav-item "+(current?"active":"")}><Icon/>{name}</a>)}<div className="coach-admin-nav" role="group" aria-label="Administrasjon"><small>Administrasjon</small>{items.filter(i=>adminUrl(i[1])).map(([name,url,Icon,current])=><a key={url} href={url} aria-current={current?"page":undefined} className={"nav-item "+(current?"active":"")}><Icon/>{name}</a>)}</div></>;
}
