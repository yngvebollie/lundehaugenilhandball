const int=(value)=>Number.isSafeInteger(value)&&value>0;
const name=(s)=>typeof s==="string"?s.trim().slice(0,150):"";
export function selectFixtures(doc,r){
  if(!Array.isArray(doc?.matches)||doc.matches.length>1000)throw Error("Ukjent format på NHFs terminliste.");
  const matches=new Map();
  for(const x of doc.matches){
    if(x.seasonId!==r.season||x.homeTeamId!==r.org_id&&x.awayTeamId!==r.org_id||r.leagues.length&&!r.leagues.includes(x.tournamentId))continue;
    const day=typeof x.matchDate==="string"?x.matchDate.slice(0,10):"",home=name(x.homeTeamDisplayName)||name(x.homeTeamName),away=name(x.awayTeamDisplayName)||name(x.awayTeamName);
    if(!int(x.matchId)||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!home||!away)throw Error("Ufullstendig kamp fra NHF.");
    const hhmm=x.matchStartTime==null?"":String(x.matchStartTime).padStart(4,"0"),time=/^([01]\d|2[0-3])[0-5]\d$/.test(hhmm)?hhmm.slice(0,2)+":"+hhmm.slice(2):null;
    const complete=!!x.isPast&&x.publicResult===true&&!x.postponed&&!x.cancelled&&[x.goalsHome,x.goalsAway].every(n=>Number.isInteger(n)&&n>=0);
    matches.set(x.matchId,{id:x.matchId,org:r.org_id,season:r.season,league:x.tournamentId,day,time,home,away,opponent:x.homeTeamId===r.org_id?away:home,
      venue:name(x.activityAreaName)||name(x.venueUnitName),competition:name(x.tournamentName),age:(name(x.tournamentName).match(/^(Jenter|Gutter)\s+(\d+)\b/)||[]).slice(1).map((v,i)=>i?v:v[0]).join(""),score:complete?x.goalsHome+"-"+x.goalsAway:null,
      status:x.cancelled?"Avlyst":x.postponed?"Utsatt":complete?"Ferdig":"Planlagt",completed:complete});
  }
  return [...matches.values()];
}
