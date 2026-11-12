import {originals} from "../development/model";
export const themes=["Kast og mottak","Skudd","Finter","Forsvar","Samspill","Keeper","Fysisk"];
export const blocks=["Oppvarming","Teknikk","Spill","Avslutning"] as const;
export type Drill={filmUrl?:string;embedFilm?:boolean;filmLabel?:string;nhfLink?:string;sourceMeta?:{category:string};id:string;title:string;instructions:string;theme:string;technique:string;age:string;equipment:string[];space:string;minPlayers:number|null;maxPlayers:number|null;minKeepers:number|null;challenge:string;training:number|null;source:"Klubb"|"NHF"|"NHF-lenke";vimeo:string;original:string;tip:string;block:string};
function drill(id:string,title:string,instructions:string,theme:string,block:string,minPlayers:number,equipment:string[]=["Baller"],space="Korridor",minKeepers=0):Drill{return {id,title,instructions,theme,technique:theme,age:"Alle",equipment,space,minPlayers,maxPlayers:null,minKeepers,challenge:"Tilpasset",training:600,source:"Klubb",vimeo:"",original:"",tip:"Avtal tempo og avstand med treneren.",block};}
export const baseDrills:Drill[]=[
 {...drill("club:warm","Bevegelse med ball","Marker et spillefelt med kjegler. Halvparten av spillerne starter med ball. Alle beveger seg i feltet og søker blikkontakt med en ledig mottaker før de sentrer. Etter pasningen finner spilleren nytt rom. På signal bytter alle retning.","Kast og mottak","Oppvarming",2),filmUrl:"https://vimeo.com/171375042",filmLabel:"Beslektet film: Lek med ball (NHF)",equipment:["Baller","Kjegler"],tip:"Se etter om mottakeren orienterer seg før ballen kommer. Start i gangtempo. Øk farten først når spillerne klarer å ta imot i bevegelse."},
 drill("club:balance","Speil føttene","Stå parvis ansikt til ansikt med litt avstand. Den ene leder med korte steg til siden og retningsskifter. Partneren speiler bevegelsene og prøver å holde samme avstand. Bytt leder etter hver korte runde.","Fysisk","Oppvarming",2,[]),
 ...originals.map((x,i)=>drill(x.id,x.title,x.instructions,i===2?"Finter":"Kast og mottak","Teknikk",2,i===0?["Baller"]:["Baller","Kjegler"])),
 drill("club:defend","Én mot én gjennom port","Lag en port med to kjegler. Angriperen starter med ball og prøver å passere porten med kontroll. Forsvareren flytter føttene for å holde seg mellom angriperen og porten. Bytt roller etter hvert forsøk. Juster bredden på porten dersom én rolle alltid lykkes.","Forsvar","Teknikk",2,["Kjegler"]),
 drill("club:keep","Keeper og skuddvinkel","Avtal skuddside og intensitet. Keeper flytter seg med ballen før skytteren avslutter.","Keeper","Teknikk",3,["Baller"],"Halvbane",1),
 drill("club:shoot","Skudd etter pasning","Ta imot i fart og velg en avtalt skuddsone. Hent ballene samlet.","Skudd","Teknikk",2,["Baller"],"Halvbane"),
 drill("club:small","Småspill med pasningsvalg","Spill på avgrenset flate. Ballfører søker en ledig medspiller før avslutning.","Samspill","Spill",4,["Baller"],"Halvbane"),
 drill("club:zones","Forsvar to soner","To små lag forsvarer hver sin sone. Bytt roller etter ballvinning.","Forsvar","Spill",4,["Baller"],"Halvbane"),
 drill("club:keeper-game","Småspill med keeperstart","Keeper setter ballen i spill. Laget finner bredde før avslutning.","Keeper","Spill",5,["Baller"],"Halvbane",1),
 drill("club:pairgame","Pasningsduell i korridor","Jobb parvis for å spille gjennom porten. Bytt side og rolle.","Kast og mottak","Spill",2,["Baller"]),
 drill("club:close","Oppsummering i par","Fortell partneren om et valg som fungerte, og ett dere vil prøve neste gang.","Samspill","Avslutning",2,[])
];
export type Item={prepareVideo?:boolean;snapshot?:Drill|null;id:string;ex:string;manual:string;block:string;work:number;setup:number;locked:boolean;instructions:string;points:string;group:string};
export type Plan={id:string;title:string;goal:string;venue:string;start:string;target:number;purpose:"team"|"individual";origin:"manual"|"generated"|"template";items:Item[];kit:string;expected:number};
export type Rules={age:string;minutes:number;players:number;keepers:number;focus:string[];equipment:string[];space:string;challenge:string};
export const initialRules:Rules={age:"13–15",minutes:90,players:14,keepers:1,focus:["Kast og mottak","Forsvar"],equipment:["Baller","Kjegler","Vester"],space:"Halvbane",challenge:"Tilpasset"};
export const blank=():Plan=>({id:crypto.randomUUID(),title:"Ny håndballøkt",goal:"",venue:"",start:"",target:5400,purpose:"team",origin:"manual",items:[],kit:"",expected:14});
export const gridTime=(seconds:number,min=0)=>Math.max(min,Math.round(seconds/300)*300);
export const item=(ex="",manual="",block="Teknikk",work=600):Item=>({id:crypto.randomUUID(),ex,manual,block,work:gridTime(work,300),setup:0,locked:false,instructions:"",points:"",group:""});
export const total=(p:Plan)=>p.items.reduce((sum,i)=>sum+i.work+i.setup,0);
export const mins=(seconds:number)=>Math.round(seconds/60);
export function alignPlanTimes(p:Plan):Plan{
 // Allocate against cumulative finish times so rounding does not inflate every activity.
 const units=Math.max(p.items.length,Math.round(total(p)/300));let elapsed=0,used=0;
 const items=p.items.map((it,n)=>{elapsed+=it.work+it.setup;
  const end=Math.min(units-(p.items.length-n-1),Math.max(used+1,Math.round(elapsed/300)));
  const duration=(end-used)*300,setup=Math.min(duration-300,gridTime(it.setup));used=end;
  return {...it,work:duration-setup,setup};
 });
 return {...p,target:gridTime(p.target,600),items};
}
export const nextLine=(p:Plan)=>{let t=0;return p.items.map(i=>{const start=t;t+=i.work+i.setup;return {...i,offset:start,end:t};});};
export function wallTime(instant:string){return instant?new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(instant)).replace(" ","T"):"";}
export function osloInstant(local:string){
 if(!local)return "";const trial=Date.parse(local+"Z");if(!Number.isFinite(trial))throw Error("Ugyldig lokal tid.");
 const found=[1,2].map(h=>new Date(trial-h*3600000).toISOString()).filter(t=>wallTime(t)===local);
 if(found.length!==1)throw Error("Denne tiden er tvetydig eller finnes ikke ved klokkeendring. Velg et annet tidspunkt.");return found[0];
}
export const eligible=(d:Drill,r:Rules)=>!!d.block&&d.minPlayers!=null&&d.minKeepers!=null&&(d.age==="Alle"||d.age===r.age)&&d.minPlayers<=r.players&&(!d.maxPlayers||r.players<=d.maxPlayers)&&d.minKeepers<=r.keepers&&d.equipment.every(e=>r.equipment.includes(e))&&["Korridor","Halvbane","Helbane"].indexOf(d.space)<=["Korridor","Halvbane","Helbane"].indexOf(r.space)&&(d.challenge==="Tilpasset"||d.challenge===r.challenge);
export function generate(bank:Drill[],r:Rules,old?:Plan,seed=0){
 if(!Number.isInteger(r.minutes)||r.minutes%5||r.minutes<10||r.minutes>240||!Number.isInteger(r.players)||r.players<1||!Number.isInteger(r.keepers)||r.keepers<0||r.keepers>r.players)throw Error("Velg varighet i femminuttersintervaller, og kontroller antall spillere og keepere.");
 const slots=r.minutes/5,indices=[0,1,4,6,3,2,5].slice(0,slots).sort((a,b)=>a-b);
 const layout=indices.map(n=>["Oppvarming","Teknikk","Teknikk","Pause","Spill","Spill","Avslutning"][n]),weights=indices.map(n=>[10,15,20,5,20,15,5][n]);
 const allowed=bank.filter(d=>eligible(d,r)),used=new Set<string>();
 for(const [n,i] of (old?.items||[]).entries())if(i.locked&&(n>=layout.length||i.ex&&!allowed.some(d=>d.id===i.ex)))throw Error("En låst aktivitet passer ikke med de nye rammene. Lås den opp eller endre rammene.");
 const items=layout.map((b,n)=>{const before=old?.items[n];if(before?.locked){used.add(before.ex);return {...before};}
  if(b==="Pause")return before?.block===b&&!before.ex?{...before}:item("","Vannpause",b);
  const options=allowed.filter(d=>d.block===b);if(!options.length)throw Error("Ingen godkjent øvelse passer i "+b+". Endre utstyr, baneplass eller spillerantall.");
  const ranked=options.map((d,i)=>({d,score:(r.focus.includes(d.theme)?8:0)+(r.keepers&&d.minKeepers?5:0)-(used.has(d.id)?40:0)-(seed>0&&before?.ex===d.id?16:0),rotate:(i+seed)%options.length})).sort((a,b)=>b.score-a.score||a.rotate-b.rotate);
  const d=ranked[0].d;used.add(d.id);return before?.ex===d.id?{...before}:item(d.id,"",b);
 });
 const locked=items.reduce((n,i)=>n+(i.locked?i.work+i.setup:0),0),remaining=r.minutes*60-locked,free=items.filter(i=>!i.locked);
 if(items.some(i=>i.locked&&(i.work%300||i.setup%300))||remaining<300*free.length||!free.length&&remaining!==0)throw Error("Låst tid passer ikke med øktmålet. Velg femminuttersintervaller eller lås opp en aktivitet.");
 const weight=items.reduce((n,i,k)=>n+(i.locked?0:weights[k]),0);
 const units=items.map(i=>i.locked?0:1);
 // Assign each remaining five-minute block to the largest gap from its ideal share.
 for(let left=remaining/300-free.length;left>0;left--){
  let best=-1,gap=-Infinity;items.forEach((it,k)=>{const missing=remaining/300*weights[k]/weight-units[k];if(!it.locked&&missing>gap){best=k;gap=missing;}});
  units[best]++;
 }
 items.forEach((it,k)=>{if(!it.locked){it.work=units[k]*300;it.setup=0;}});
 return {...(old||blank()),title:old?.title&&old.title!=="Ny håndballøkt"?old.title:r.focus.join(" og ")||"Håndballtrening",target:r.minutes*60,origin:"generated" as const,expected:r.players,items,kit:r.equipment.join(", ")};
}
export function copyPlan(p:Plan,template=false){return {...structuredClone(p),id:crypto.randomUUID(),title:p.title+(template?" · mal":" · kopi"),start:"",origin:template?"template" as const:p.origin==="template"?"manual" as const:p.origin,items:p.items.map(i=>({...i,id:crypto.randomUUID()}))};}
export function validatePlan(p:Plan,publishing=false){
 if(!p.title.trim()||p.title.length>120||p.items.length>80||!Number.isInteger(p.target)||p.target<60||p.target>86400||(!p.items.length&&publishing))throw Error("Oppgi øktnavn, målvarighet og minst én aktivitet før deling.");
 const ids=new Set();for(const i of p.items){if(ids.has(i.id)||!i.block.trim()||!i.ex&&!i.manual.trim()||!Number.isInteger(i.work)||!Number.isInteger(i.setup)||i.work<(publishing?1:0)||i.setup<0||i.work+i.setup>86400)throw Error("Kontroller blokk, aktivitet og tid.");ids.add(i.id);}
}
