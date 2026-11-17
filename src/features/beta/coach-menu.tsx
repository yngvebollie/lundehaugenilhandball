import {House,Activity,BookOpen,CalendarDays,ChartNoAxesColumnIncreasing,ChevronDown,ClipboardList,ContactRound,Dumbbell,Medal,ScanLine,Trophy,Users,Volleyball,type LucideIcon} from "lucide-react";
import {courtEnabled} from "@/lib/court/client";
import {developmentVisible} from "@/lib/development/flags";
import "./coach-experience.css";
export const playerMenu=[["oversikt","Oversikt"],["plan","Plan"],["rapportkoblinger","Koble spiller"],["statistikk","Statistikk"]] as const;
export const playerUrl=(key:string)=>key==="oversikt"?"/spillere":"/spillere?vis="+key;
export function coachPageTitle(view:string,hash:string,search=""){
 if(view==="court")return new URLSearchParams(search).get("vis")==="bank"?"Øvelsesbank":"Øktplanlegger";
 return ({roster:"Spillere",players:"Spillere",team:"Lagadministrasjon",match:"Kamper",challenges:"Utfordringer",directory:"Brukeroversikt",badges:"Merker",live:"Liveanalyse",development:"Min utvikling"} as Record<string,string>)[view]
  ||({"#builder":"Styrkeprogram","#weekly":"Kalender","#monitor":"Belastning","#ratings":"Øvelsesvurderinger","#messages":"Meldinger","#spillerplan":"Spillerplan"} as Record<string,string>)[hash]||"Oversikt";
}
type Item=[string,string,LucideIcon,boolean,boolean?];
export function CoachMenu({view,hash}:{view:string;hash:string}){
 const at=(v:string)=>view===v,isHash=(h:string)=>at("dashboard")&&hash==="#"+h,query=new URLSearchParams(location.search);
 const link=([name,url,Icon,current]:Item)=><a key={url} href={url} className={"nav-item "+(current?"active":"")} aria-current={current?"page":undefined}><Icon size={18}/>{name}</a>;
 const group=(name:string,Icon:LucideIcon,items:Item[])=>{
  const visible=items.filter(i=>i[4]!==false);if(!visible.length)return null;
  const current=visible.some(i=>i[3]);
  return <details key={name} className="player-submenu coach-menu-group" open={current||undefined}><summary className={"nav-item "+(current?"active":"")}><Icon size={18}/>{name}<ChevronDown size={14}/></summary><div>{visible.map(link)}</div></details>;
 };
 const players=at("roster")||at("players")||isHash("spillerplan"),playerTab=query.get("vis")||(at("players")?"statistikk":isHash("spillerplan")?"plan":"oversikt");
 return <>
 {link(["Oversikt","/#overview",House,at("dashboard")&&(!hash||isHash("overview"))])}
 {link(["Kalender","/#weekly",CalendarDays,isHash("weekly")])}
 {group("Kamper",Volleyball,[["Kampoversikt","/match",Volleyball,at("match")],["Liveanalyse","/liveanalyse",ScanLine,at("live")]])}
 {link(["Meldinger","/#messages",Users,isHash("messages")])}
 {group("Spillere",ContactRound,[...playerMenu.map(([k,label]):Item=>[label,playerUrl(k),ContactRound,players&&playerTab===k]),["Belastning","/#monitor",Activity,isHash("monitor")],["Øvelsesvurderinger","/#ratings",ClipboardList,isHash("ratings")]])}
 {group("Trening",Dumbbell,[["Styrkeprogram","/#builder",Dumbbell,isHash("builder")],["Øktplanlegger","/okter",ClipboardList,at("court")&&query.get("vis")!=="bank",courtEnabled],["Øvelsesbank","/okter?vis=bank",BookOpen,at("court")&&query.get("vis")==="bank",courtEnabled]])}
 {group("Utvikling",ChartNoAxesColumnIncreasing,[["Merker","/merker",Medal,at("badges")],["Min utvikling","/utvikling",ChartNoAxesColumnIncreasing,at("development"),developmentVisible],["Utfordringer","/challenges",Trophy,at("challenges")]])}
 <div className="coach-admin-nav" role="group" aria-label="Administrasjon"><small>Administrasjon</small>{link(["Brukeroversikt","/directory",ContactRound,at("directory")])}{link(["Lagadministrasjon","/team",Users,at("team")])}</div>
 </>;
}
