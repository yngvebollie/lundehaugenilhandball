type Fixture={completed?:boolean;score?:string|null;home?:string|null;away?:string|null;opponent:string;status?:string};
export function matchResult(g:Fixture){
  const score=g.score?.trim().match(/^(\d+)\s*[-–:]\s*(\d+)$/);
  const name=(s:string|null|undefined)=>s?.trim().toLocaleLowerCase("nb");
  const opponent=name(g.opponent),home=name(g.home),away=name(g.away);
  if(!g.completed||!score||!opponent||home===away||opponent!==away&&opponent!==home)
    return {kind:"neutral",label:g.completed?"Ferdig":g.status==="Planlagt"?"Kommende":g.status||"Planlagt"};
  const diff=(Number(score[1])-Number(score[2]))*(opponent===away?1:-1);
  return diff>0?{kind:"win",label:"Seier"}:diff<0?{kind:"loss",label:"Tap"}:{kind:"draw",label:"Uavgjort"};
}
export type Wld="W"|"L"|"D";
export function fixtureOutcome(g:Fixture):Wld|null{
 const k=matchResult(g).kind;return k==="win"?"W":k==="loss"?"L":k==="draw"?"D":null;
}
export function cupOutcome(scored?:number|null,conceded?:number|null):Wld|null{
 return scored==null||conceded==null?null:scored===conceded?"D":scored>conceded?"W":"L";
}
