import {eventNames,formatMatchTime,liveScore,matchPlayers,matchProtocol,matchTimeline,penaltyNames,type LiveMatch} from "./live-match";
import type {Report} from "./report-text";

type Cell=string|number|boolean|null|undefined;
type Table={title:string;columns:{label:string;width:number}[];rows:Cell[][]};
type PageData={title:string;subtitle:string;details:string[];tables:Table[]};
export type MatchPDF={report?:Report;revision?:number;log?:LiveMatch;label:string;details?:string[]};
const sideColumns=(labels:string[],widths:number[])=>labels.map((label,i)=>({label,width:widths[i]}));

function matchPages({report,revision,log,label,details=[]}:MatchPDF):PageData {
  const m=report?.match;
  const tables:Table[]=[];
  const score=m?.home_score!=null&&m.away_score!=null?m.home_score+"–"+m.away_score:null;
  const half=m?.half_home!=null&&m.half_away!=null?m.half_home+"–"+m.half_away:null;
  const logComplete=log?.finalized||log?.clock.status==="finished";
  const timeline=log?matchTimeline(log.events):[];
  const pause=timeline.filter(({event})=>event.half===1).at(-1);
  const logScore=log?liveScore(log.events):null;
  const summary=score||logScore;
  const fromLog=!!log&&(logComplete||log.clock.half===2||log.clock.status==="halftime");
  for(const side of ["home","away"] as const){
    const rows=report?.players.filter(p=>p.side===(side==="home"?"A":"B"))??[];
    if(rows.length){
      tables.push({title:(side==="home"?m?.home:m?.away)||side,columns:sideColumns(["Nr.","Spiller","Spilt","Mål","7 m","Tot.","Gult","2 min","Rødt"],[32,190,46,40,42,42,42,45,44]),
        rows:rows.map(p=>[p.shirt,p.name,p.played,p.goals,p.penalty,p.total,p.warning==null?null:Number(p.warning),p.suspensions,p.disqualification])});
    }else if(log){
      tables.push({title:"Målprotokoll · "+log[side].name,columns:sideColumns(["Nr.","Spiller","Mål","7 m","Totalt","Gult","2 min"],[40,213,52,52,56,54,46]),
        rows:matchProtocol(log,side).map(p=>[p.number,p.name,p.goals,p.penalties,p.total,p.warnings,p.suspensions])});
    }
  }
  if(log&&timeline.length)tables.push({title:"Hendelseslogg"+(log.eventOrigin==="manual"?" · Manuell logg":log.eventOrigin==="api"?" · NHF":""),
    columns:sideColumns(["Kamptid","Hendelse","Lag / spiller","Stilling"],[88,146,222,67]),
    rows:timeline.map(({event,home,away})=>{
      const roster=event.side?matchPlayers(log,event.side):[];
      const player=roster.find(p=>p.id===event.playerId)??roster.find(p=>p.number===event.number);
      return [event.half+". · "+formatMatchTime(event.seconds),event.type==="clock"?event.label||"Kampklokke":
        eventNames[event.type]+(event.outcome?" · "+penaltyNames[event.outcome]:""),
        [event.side&&log[event.side].name,event.number!==undefined&&"#"+event.number,player?.name||event.playerName].filter(Boolean).join(" · "),home+"–"+away];
    })});
  return {title:label,subtitle:summary?((score||logComplete?"Sluttresultat ":"Stilling i loggen ")+summary):"Kamprapport",
    details:[...new Set([...details, [m?.day||log?.date,m?.time,m?.venue].filter(Boolean).join(" · "),m?.competition||log?.title||"",
      half?"Pause "+half:fromLog?"Pause "+(pause?.home??0)+"–"+(pause?.away??0):"",
      m?.nif_id?"NHF-kamp "+m.nif_id:"",revision?"Lagret rapport · revisjon "+revision:"",
      !report&&log&&!logComplete?"Kampen er underveis.":"",score&&logScore&&score!==logScore?"Stilling i hendelsesloggen "+logScore:""].filter(Boolean))],tables};
}

function clean(text:string){
  return text.replace(/[\r\n\t]/g," ");
}

async function createPDF(title:string,sections:PageData[]){
  if(!sections.length)throw Error("Ingen kamper å eksportere.");
  const {PDFDocument,StandardFonts,rgb}=await import("pdf-lib");
  const doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica);
  const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const navy=rgb(.07,.11,.21),muted=rgb(.31,.35,.43),line=rgb(.86,.88,.92),band=rgb(.94,.95,.97),white=rgb(1,1,1);
  doc.setTitle(title);
  const styled=(value:Cell)=>Array.from(clean(value==null?"–":typeof value==="boolean"?value?"Ja":"Nei":String(value)))
    .map(char=>{try{font.encodeText(char);return char;}catch{return "?";}}).join("");
  for(const section of sections){
    let page=doc.addPage([595,842]),y=0;
    const fit=(value:Cell,width:number,size:number,weight=font)=>{
      const text=styled(value);
      if(weight.widthOfTextAtSize(text,size)<=width)return text;
      let end=text.length;
      while(end>0&&weight.widthOfTextAtSize(text.slice(0,end)+"…",size)>width)end--;
      return text.slice(0,end)+"…";
    };
    const draw=(value:Cell,x:number,width:number,size=10,weight=font,color=navy)=>
      page.drawText(fit(value,width,size,weight),{x,y,size,font:weight,color});
    const header=(compact=false)=>{
      page.drawRectangle({x:36,y:compact?747:723,width:523,height:compact?61:85,color:navy});
      y=compact?779:778;
      draw(section.title,49,495,compact?14:20,bold,white);
      y-=compact?18:26;
      draw(section.subtitle+(compact?" · Fortsettelse":""),49,495,12,bold,white);
      y=compact?723:699;
      if(!compact)for(const detail of section.details){draw(detail,36,523,10,font,muted);y-=16;}
      y-=9;
    };
    header();
    for(const table of section.tables){
      const start=()=>{
        draw(table.title,36,523,13,bold);y-=26;
        page.drawRectangle({x:36,y:y-5,width:523,height:20,color:band});
        let x=36;
        for(const col of table.columns){draw(col.label,x+5,col.width-10,9,bold);x+=col.width;}
        y-=19;
      };
      const next=()=>{page=doc.addPage([595,842]);header(true);};
      if(y<120)next();
      start();
      if(!table.rows.length){draw("Ingen spillerlinjer registrert.",40,515,10,font,muted);y-=19;}
      for(const row of table.rows){
        if(y<58){next();start();}
        let x=36;
        for(let i=0;i<table.columns.length;i++){const {width}=table.columns[i];draw(row[i],x+5,width-10,9);x+=width;}
        page.drawLine({start:{x:36,y:y-6},end:{x:559,y:y-6},thickness:.4,color:line});y-=19;
      }
      y-=13;
    }
  }
  doc.getPages().forEach((page,i)=>page.drawText((i+1)+" / "+doc.getPageCount(),{x:36,y:30,font,size:9,color:muted}));
  return doc.save();
}

const filePart=(text:string)=>text.trim().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,75)||"kamper";
async function download(bytes:Uint8Array,name:string){
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/pdf"}));
  const link=document.createElement("a");link.href=url;link.download=name+".pdf";document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export const createMatchPDF=(title:string,items:MatchPDF[])=>createPDF(title,items.map(matchPages));
export async function downloadMatchPDF(title:string,items:MatchPDF[],filename=title){
  await download(await createMatchPDF(title,items),filePart(filename));
}
export async function downloadPersonalMatchPDF(name:string,games:{title:string;team_name:string;day:string;time:string|null;venue:string|null;score:string|null;goals:number|null;penalty?:number|null;warnings:number|null;suspensions?:number|null;disqualifications?:number|null;saves:number|null}[]){
  const title=games.length===1?"Min kamprapport":"Mine kamper";
  await download(await createPDF(title,games.map(g=>({
    title:g.title,subtitle:g.score?"Sluttresultat "+g.score:"Kampresultat mangler",
    details:[name,g.team_name,[g.day,g.time?.slice(0,5),g.venue].filter(Boolean).join(" · ")],
    tables:[{title:"Min kampstatistikk",columns:sideColumns(["Registrering","Antall"],[383,140]),
      rows:[["Mål",g.goals],["7 m-mål (inkludert i mål)",g.penalty],["Gule kort",g.warnings],
        ["2 min utvisninger",g.suspensions],["Røde kort",g.disqualifications],["Redninger",g.saves]]}],
  }))),filePart(title+" "+(games.length===1?games[0].day+" "+games[0].title:name)));
}
