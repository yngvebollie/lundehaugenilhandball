export type ReportMatch={nif_id:number|null;number:string|null;competition:string|null;day:string|null;time:string|null;venue:string|null;home:string|null;away:string|null;home_score:number|null;away_score:number|null;half_home:number|null;half_away:number|null};
export type ReportPlayer={side:"A"|"B";shirt:string;name:string;played:boolean|null;participation_blank?:boolean;goals:number|null;penalty:number|null;total:number|null;warning:number|boolean|null;suspensions:number|null;disqualification:boolean|null};
export type Report={match:ReportMatch;players:ReportPlayer[];issues:string[];method:string;version:string};
const num=(s:string|undefined)=>s&&/^\d+$/.test(s.trim())?Number(s):null;
const mark=(s:string|undefined)=>s===undefined?null:!s.trim()?false:/^x$/i.test(s.trim())?true:null;
export const warningCount=(v:ReportPlayer["warning"])=>v==null?null:Number(v);
const parseWarnings=(s:string|undefined)=>s===undefined?null:s===""?0:/^[0-3]$/.test(s)?Number(s):/^[xX]{1,3}$/.test(s)?s.length:null;
export function importDraft(raw:Report):Report{
  return {...structuredClone(raw),players:raw.players.map(p=>({...p,played:p.participation_blank?true:p.played}))};
}
export function parsePaste(input:string):Report{
  if(input.length>120000)throw Error("Rapporten er for lang.");
  const t=input.replace(/\r/g,""),grab=(re:RegExp)=>t.match(re)?.[1]?.trim()||null;
  const dt=t.match(/^\s*([^\t\n]+)\t\s*(\d\d)\.(\d\d)\.(\d{4})\s*-\s*(\d\d:\d\d)/m);
  const score=t.match(/Sluttresultat\s+A\s+(\d+)\s+B\s+(\d+)/i),half=t.match(/Halv tid\s+A\s+(\d+)\s+B\s+(\d+)/i);
  const match={nif_id:num(grab(/ResPIN\s+(\d+)/i)||""),number:grab(/Kamp Nr\s+(\d+)/i),competition:grab(/Turnering:\s*([^\t\n]+)/i),
    venue:dt?.[1]?.trim()||null,day:dt?dt[4]+"-"+dt[3]+"-"+dt[2]:null,time:dt?.[5]||null,
    home:grab(/Hjemmelag\s*\n([^\n]+)/i),away:grab(/Bortelag\s*\n([^\n]+)/i),
    home_score:num(score?.[1]),away_score:num(score?.[2]),half_home:num(half?.[1]),half_away:num(half?.[2])};
  const players:ReportPlayer[]=[],issues:string[]=[];let side:"A"|"B"|null=null;
  for(const line of t.split("\n")){
    const section=line.match(/^\s*Lag ([AB])\s+Deltatt/i);
    if(section){side=section[1] as "A"|"B";continue;}
    if(/^\s*Leder\s+[A-E]:/i.test(line)){side=null;continue;}
    if(!side)continue;
    const cols=line.split("\t").map(c=>c.trim()),dob=cols.findIndex(c=>/^\d\d\.\d\d\.\d{4}$/.test(c));
    if(dob<0)continue;
    const nr=cols.slice(0,dob-2).reverse().find(c=>/^\d{1,3}$/.test(c)),name=cols[dob-2];
    if(!nr||!name){issues.push("Uleselig spillerrad, lag "+side);continue;}
    const cells=cols.slice(dob+1),aligned=cells.length>=10;
    if(!aligned)issues.push("Manglende tabellkolonner, lag "+side+" nr. "+nr);
    const n=(i:number)=>!aligned||cells[i]===undefined?null:!cells[i]?0:num(cells[i]);
    const susp=[1,2,3].map(i=>mark(cells[i]));
    const attendance=cols[dob-1];
    players.push({side,shirt:nr,name,played:/^(nei|no|0|-)$/i.test(attendance)?false:mark(attendance),participation_blank:attendance==="",warning:aligned?parseWarnings(cells[0]):null,
      suspensions:aligned&&!susp.includes(null)?susp.filter(Boolean).length:null,disqualification:aligned?mark(cells[4]):null,
      goals:n(7),penalty:n(8),total:n(9)});
  }
  if(!players.length)issues.push("Fant ingen spillerrader. Kopier tabellen med tabulatorene, eller bruk PDF.");
  return {match,players,issues,method:"paste",version:"nhf-tabs-1"};
}
export function validateReport(r:Report,nif:number|undefined){
  const issues:string[]=[];
  if(!r.match.nif_id||nif&&r.match.nif_id!==nif)issues.push("ResPIN stemmer ikke med valgt kamp.");
  if(r.players.some(p=>p.warning!=null&&(!Number.isInteger(Number(p.warning))||Number(p.warning)<0||Number(p.warning)>3)))issues.push("Advarsler må være et heltall mellom 0 og 3.");
  for(const side of ["A","B"] as const){
    const rows=r.players.filter(x=>x.side===side);
    if(!rows.length)issues.push("Ingen spillere for lag "+side);
    if(new Set(rows.map(x=>x.shirt)).size!==rows.length)issues.push("Duplikat draktnummer for lag "+side);
    if(rows.some(p=>!p.name.trim()||!/^\d{1,3}$/.test(p.shirt)||p.total===null||p.total!==(p.goals??0)+(p.penalty??0)))issues.push("Kontroller navn, nummer og mål for lag "+side);
    if(rows.reduce((sum,p)=>sum+(p.total??0),0)!==(side==="A"?r.match.home_score:r.match.away_score))issues.push("Spillermål avviker fra sluttresultatet for lag "+side);
  }
  return issues;
}
